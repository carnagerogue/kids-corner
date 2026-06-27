// ---------------------------------------------------------------------------
// WorldView — a shared little 3D plaza where each kid drives their own VRM
// avatar with WASD / arrow keys and chats with floating bubbles. Presence and
// movement sync in real time over `world/{roomCode}/players` (see worldSync).
//
// LAZY-LOADED from App so the heavy three/three-vrm bundle only loads here.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useApp } from "../store/AppContext";
import { getKid } from "../store/selectors";
import { currentLoadout } from "../features/avatar/AvatarEconomy";
import { itemById } from "../features/avatar/AvatarManifest";
import { webglAvailable } from "../features/avatar/webgl";
import { loadAvatar, resolveModelUrl, type LoadedAvatar } from "./vrmLoader";
import {
  joinWorld,
  leaveWorld,
  sendChat,
  subscribeWorld,
  updateSelf,
  type PlayerState,
} from "./worldSync";

const BOUND = 16; // play area half-extent
const SPEED = 3.6;

/** Live, mutable pose shared between the controller and the local avatar. */
type Pose = { x: number; z: number; heading: number; moving: boolean };

function keyToDir(k: string): "up" | "down" | "left" | "right" | null {
  switch (k) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

/** Deterministic spawn point on a ring so kids don't pile up. */
function spawnFor(kidId: string): { x: number; z: number } {
  let h = 0;
  for (let i = 0; i < kidId.length; i++) h = (h * 31 + kidId.charCodeAt(i)) | 0;
  const a = ((h % 360) * Math.PI) / 180;
  return { x: Math.cos(a) * 3.5, z: Math.sin(a) * 3.5 };
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

// --- Scenery -------------------------------------------------------------
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 7]} />
        <meshStandardMaterial color="#7a5230" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 1.3 + i * 0.4, 0]}>
          <icosahedronGeometry args={[0.7 - i * 0.15, 0]} />
          <meshStandardMaterial
            color={["#3f9b4f", "#54b85f", "#6cc96f"][i]}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function WorldScene() {
  const trees = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = 18 + ((i * 7) % 5);
        return [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number];
      }),
    [],
  );
  return (
    <>
      <color attach="background" args={["#bfe6ff"]} />
      <fog attach="fog" args={["#cfeefc", 26, 46]} />
      <hemisphereLight args={["#ffffff", "#9fd6a0", 1.0]} />
      <directionalLight position={[6, 10, 4]} intensity={1.3} color="#fff6e8" />
      <directionalLight position={[-5, 4, -3]} intensity={0.4} color="#bcd9ff" />
      {/* grassy ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[24, 64]} />
        <meshStandardMaterial color="#74bd62" roughness={1} />
      </mesh>
      {/* a soft plaza disc in the middle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshStandardMaterial color="#d8c79a" roughness={1} />
      </mesh>
      {trees.map((p, i) => (
        <Tree key={i} position={p} />
      ))}
    </>
  );
}

// --- One avatar (local or remote) ---------------------------------------
function WorldAvatar({
  url,
  getPose,
  name,
  color,
  chat,
}: {
  url: string;
  getPose: () => Pose;
  name: string;
  color: string;
  chat?: { text: string; ts: number } | null;
}) {
  const group = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState<LoadedAvatar | null>(null);
  const bob = useRef(0);

  useEffect(() => {
    let alive = true;
    let inst: LoadedAvatar | null = null;
    loadAvatar(url)
      .then((a) => {
        if (!alive) {
          a.dispose();
          return;
        }
        inst = a;
        setLoaded(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
      inst?.dispose();
    };
  }, [url]);

  // Chat bubble auto-hides ~6s after the message.
  const [bubble, setBubble] = useState<string | null>(null);
  useEffect(() => {
    if (!chat) return;
    setBubble(chat.text);
    const id = window.setTimeout(() => setBubble(null), 6000);
    return () => window.clearTimeout(id);
  }, [chat?.ts, chat?.text]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = getPose();
    const k = Math.min(1, dt * 12);
    g.position.x += (p.x - g.position.x) * k;
    g.position.z += (p.z - g.position.z) * k;
    let dh = p.heading - g.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.rotation.y += dh * k;
    if (p.moving) {
      bob.current += dt * 9;
      g.position.y = Math.abs(Math.sin(bob.current)) * 0.05;
    } else {
      g.position.y += (0 - g.position.y) * Math.min(1, dt * 8);
    }
    loaded?.update(dt, p.moving);
  });

  return (
    <group ref={group}>
      {loaded && <primitive object={loaded.object} />}
      {/* simple blob shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      <Html position={[0, 2.05, 0]} center distanceFactor={9} occlude={false}>
        <div className="wtag" style={{ borderColor: color }}>
          {name}
        </div>
        {bubble && <div className="wbubble">{bubble}</div>}
      </Html>
    </group>
  );
}

// --- Camera + local input -----------------------------------------------
function Rig({ self }: { self: React.MutableRefObject<Pose> }) {
  const keys = useRef<Set<string>>(new Set());
  const { camera } = useThree();

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const d = keyToDir(e.key);
      if (d) {
        keys.current.add(d);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = keyToDir(e.key);
      if (d) keys.current.delete(d);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    let dx = 0;
    let dz = 0;
    if (keys.current.has("up")) dz -= 1;
    if (keys.current.has("down")) dz += 1;
    if (keys.current.has("left")) dx -= 1;
    if (keys.current.has("right")) dx += 1;
    const moving = dx !== 0 || dz !== 0;
    const s = self.current;
    if (moving) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;
      s.x = clamp(s.x + dx * SPEED * dt, -BOUND, BOUND);
      s.z = clamp(s.z + dz * SPEED * dt, -BOUND, BOUND);
      s.heading = Math.atan2(-dx, -dz);
      updateSelf({ x: s.x, z: s.z, heading: s.heading, moving: true });
    } else if (s.moving) {
      updateSelf({ x: s.x, z: s.z, heading: s.heading, moving: false }, true);
    }
    s.moving = moving;

    // Fixed-angle third-person follow.
    const desired = new THREE.Vector3(s.x, 5.2, s.z + 8.5);
    camera.position.lerp(desired, Math.min(1, dt * 4));
    camera.lookAt(s.x, 1.1, s.z);
  });
  return null;
}

// --- Main view -----------------------------------------------------------
export default function WorldView() {
  const { state } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const loadout = currentLoadout(state, kidId);
  const canWebgl = useMemo(() => webglAvailable(), []);

  const self = useRef<Pose>({ ...spawnFor(kidId), heading: 0, moving: false });
  const [selfUrl, setSelfUrl] = useState<string | null | undefined>(undefined);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [chatText, setChatText] = useState("");
  // Local chat shows instantly (no Firebase round-trip / stale-filter delay).
  const [myChat, setMyChat] = useState<{ text: string; ts: number } | null>(
    null,
  );

  // Resolve this kid's model, then announce presence.
  useEffect(() => {
    if (!kid || !canWebgl) return;
    let alive = true;
    const outfit = itemById(loadout.outfit)?.value;
    const baseAsset = itemById(loadout.base)?.assetPath;
    resolveModelUrl(kidId, outfit, baseAsset).then((url) => {
      if (!alive) return;
      setSelfUrl(url);
      if (url) {
        const sp = self.current;
        joinWorld({
          kidId,
          name: kid.firstName || kid.name,
          color: kid.color || "#6a5cff",
          modelUrl: url,
          x: sp.x,
          z: sp.z,
          heading: 0,
        });
      }
    });
    return () => {
      alive = false;
      leaveWorld();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, canWebgl]);

  // Subscribe to everyone in the room.
  useEffect(() => subscribeWorld(setPlayers), []);

  // Heartbeat: refresh our timestamp so we don't get stale-filtered while idle.
  useEffect(() => {
    const id = window.setInterval(() => updateSelf({}, true), 4000);
    return () => window.clearInterval(id);
  }, []);

  const send = () => {
    const t = chatText.trim();
    if (t) {
      sendChat(t);
      setMyChat({ text: t, ts: Date.now() });
      setChatText("");
    }
  };

  if (!canWebgl)
    return (
      <div className="world world--msg">
        This device can&apos;t show the 3D World (no WebGL).
      </div>
    );
  if (selfUrl === null)
    return (
      <div className="world world--msg">
        🌍 Pick a character on the <strong>Avatar</strong> tab first — then come
        play in the World!
      </div>
    );

  const selfChat = players.find((p) => p.kidId === kidId)?.chat ?? null;
  const others = players.filter((p) => p.kidId !== kidId && p.modelUrl);

  return (
    <div className="world">
      <Canvas shadows={false} dpr={[1, 1.6]} camera={{ position: [0, 5.2, 9], fov: 45 }}>
        <WorldScene />
        <Rig self={self} />
        {selfUrl && (
          <WorldAvatar
            url={selfUrl}
            getPose={() => self.current}
            name={(kid?.firstName || kid?.name || "Me") + " (you)"}
            color={kid?.color || "#6a5cff"}
            chat={myChat ?? selfChat}
          />
        )}
        {others.map((p) => (
          <WorldAvatar
            key={p.kidId}
            url={p.modelUrl}
            getPose={() => ({
              x: p.x,
              z: p.z,
              heading: p.heading,
              moving: !!p.moving,
            })}
            name={p.name}
            color={p.color}
            chat={p.chat}
          />
        ))}
      </Canvas>

      <div className="world__hud">
        <div className="world__hint">
          <strong>Move:</strong> W A S D / arrows · {players.length} here
        </div>
        <div className="world__chat">
          <input
            className="world__chatinput"
            placeholder="Say something…"
            value={chatText}
            maxLength={120}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="world__send" onClick={send}>
            Say 💬
          </button>
        </div>
      </div>
    </div>
  );
}
