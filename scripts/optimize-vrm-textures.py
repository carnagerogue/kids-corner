#!/usr/bin/env python3
"""
VRM-safe texture optimizer for Kids Corner.

Resizes every embedded texture to <=1024px and re-encodes it to WebP, then
repacks the GLB buffer. It ONLY rewrites image bytes + bufferView offsets — the
glTF/VRM JSON (VRM meta, humanoid, blendShapeMaster, secondaryAnimation/spring
bones, materials, accessors) is preserved exactly. Typical result: ~75% smaller.

Why not `gltf-transform optimize`? It is not VRM-aware: it drops the VRM
extension and prunes "unused" textures/accessors that VRM actually references,
producing a broken model. Geometry compression also won't load in-app.

Requires Pillow:  pip3 install --user pillow
Usage:            python3 scripts/optimize-vrm-textures.py in.vrm out.vrm
                  (in-place is fine: ... in.vrm in.vrm)
"""

import struct, json, sys, io
from PIL import Image

MAXD = 1024
QUALITY = 80
GLB_MAGIC=0x46546C67; JSON=0x4E4F534A; BIN=0x004E4942

def read_glb(path):
    d=open(path,'rb').read()
    magic,ver,length=struct.unpack('<III', d[:12])
    assert magic==GLB_MAGIC, "not GLB"
    off=12; js=None; binc=b''
    while off < length:
        clen,ctype=struct.unpack('<II', d[off:off+8]); off+=8
        chunk=d[off:off+clen]; off+=clen
        if ctype==JSON: js=json.loads(chunk.decode('utf-8'))
        elif ctype==BIN: binc=chunk
    return js, binc

def write_glb(path, gltf, binc):
    js=json.dumps(gltf, separators=(',',':')).encode('utf-8')
    js+=b' '*((-len(js))%4)
    binp=binc+b'\x00'*((-len(binc))%4)
    total=12+8+len(js)+8+len(binp)
    with open(path,'wb') as f:
        f.write(struct.pack('<III', GLB_MAGIC,2,total))
        f.write(struct.pack('<II', len(js), JSON)); f.write(js)
        f.write(struct.pack('<II', len(binp), BIN)); f.write(binp)

def optimize(inp, outp):
    gltf, binc = read_glb(inp)
    bviews = gltf.get('bufferViews',[])
    images = gltf.get('images',[])
    # map bufferView index -> new bytes (for images)
    new_img = {}
    for im in images:
        bv_i = im.get('bufferView')
        if bv_i is None: continue
        bv = bviews[bv_i]
        start = bv.get('byteOffset',0); ln = bv['byteLength']
        raw = binc[start:start+ln]
        try:
            img = Image.open(io.BytesIO(raw))
            img.load()
        except Exception as e:
            print('  skip (decode fail):', im.get('name'), e); continue
        w,h = img.size
        scale = min(1.0, MAXD/max(w,h))
        if scale < 1.0:
            img = img.resize((max(1,round(w*scale)), max(1,round(h*scale))), Image.LANCZOS)
        buf = io.BytesIO()
        has_alpha = img.mode in ('RGBA','LA') or (img.mode=='P' and 'transparency' in img.info)
        img2 = img.convert('RGBA') if has_alpha else img.convert('RGB')
        img2.save(buf, format='WEBP', quality=QUALITY, method=6)
        nb = buf.getvalue()
        new_img[bv_i] = nb
        im['mimeType']='image/webp'
        print(f"  img {im.get('name','?')[:20]:20} {w}x{h} {ln//1024}KB -> {img2.size[0]}x{img2.size[1]} {len(nb)//1024}KB")
    # repack buffer
    parts=[]; offset=0
    order=sorted(range(len(bviews)), key=lambda i:(bviews[i].get('byteOffset') or 0))
    for i in order:
        bv=bviews[i]
        if i in new_img: data=new_img[i]
        else:
            s=bv.get('byteOffset',0); data=binc[s:s+bv['byteLength']]
        pad=(-offset)%4
        if pad: parts.append(b'\x00'*pad); offset+=pad
        bv['byteOffset']=offset; bv['byteLength']=len(data)
        parts.append(data); offset+=len(data)
    newbin=b''.join(parts)
    gltf['buffers'][0]['byteLength']=len(newbin)
    gltf['buffers'][0].pop('uri',None)
    write_glb(outp, gltf, newbin)
    import os
    print(f"  {os.path.getsize(inp)//1024}KB -> {os.path.getsize(outp)//1024}KB")

if __name__=='__main__':
    optimize(sys.argv[1], sys.argv[2])
