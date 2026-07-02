// ---------------------------------------------------------------------------
// Avatar3DThumb — the kid's 3D avatar as a small thumbnail (top bar, home cards,
// parent zone). It shows a cached PNG headshot rendered from the dressed VRM;
// until that exists it shows the kid's initial, so the UI is instant and
// works with no WebGL. The heavy Three.js renderer is dynamically imported only
// on a cache miss, so the app chrome never pulls it in at startup.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useApp } from "../../store/AppContext";
import { getKid } from "../../store/selectors";
import { webglAvailable } from "./webgl";
import { currentLoadout } from "./AvatarEconomy";
import type { KidId, Loadout3D } from "../../types";

// Cache: ONE entry per kid, holding the current loadout's signature + its PNG
// (`null` data = "rendered, but the kid has no model" — keep the initial, no
// retry). Keyed by kidId only, so a kid trying many outfits OVERWRITES their one
// entry instead of minting a permanent PNG per combination — otherwise the cache
// would grow unbounded and exhaust the localStorage quota shared with the app's
// state save. Only the current look is ever displayed, so one entry is enough.
type Entry = { sig: string; data: string | null };
const mem = new Map<string, Entry>();
const LS_PREFIX = "kids-corner:av3thumb:";

/** Stable signature of the slots that change how the avatar looks. */
function sig(l: Loadout3D): string {
  return [
    l.base,
    l.outfit,
    l.hat,
    l.glasses,
    l.backpack,
    l.handheld,
    l.pet,
    l.aura,
    l.skinTone,
    l.hairColor,
    l.eyeColor,
  ].join("|");
}

/** undefined = no cached image for THIS look (render it); string = image;
 * null = rendered but the kid has no model (use the initial fallback). */
function readCache(kidId: string, s: string): string | null | undefined {
  let e = mem.get(kidId);
  if (!e) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + kidId);
      if (raw) {
        e = JSON.parse(raw) as Entry;
        mem.set(kidId, e);
      }
    } catch {
      /* private mode / bad JSON — fall through to a render */
    }
  }
  return e && e.sig === s ? e.data : undefined;
}

function writeCache(kidId: string, s: string, data: string | null) {
  const e: Entry = { sig: s, data };
  mem.set(kidId, e);
  try {
    localStorage.setItem(LS_PREFIX + kidId, JSON.stringify(e));
  } catch {
    /* storage full — the in-memory cache still serves this session */
  }
}

// In-flight renders, so a kid shown in several thumbnails at once (top bar +
// home card + …) loads + renders their VRM ONCE, not once per spot.
const inflight = new Map<string, Promise<string | null>>();

function getThumbnail(
  kidId: string,
  s: string,
  loadout: Loadout3D,
): Promise<string | null> {
  const cached = readCache(kidId, s);
  if (cached !== undefined) return Promise.resolve(cached);
  const flightKey = kidId + ":" + s;
  let p = inflight.get(flightKey);
  if (!p) {
    p = import("../../world/avatarThumbnail")
      .then((m) => m.renderAvatarThumbnail(kidId, loadout))
      .then((data) => {
        writeCache(kidId, s, data);
        return data;
      })
      .catch(() => {
        writeCache(kidId, s, null);
        return null;
      })
      .finally(() => inflight.delete(flightKey));
    inflight.set(flightKey, p);
  }
  return p;
}

export function Avatar3DThumb({
  kidId,
  size = 42,
  className = "",
}: {
  kidId: KidId;
  size?: number;
  className?: string;
}) {
  const { state } = useApp();
  const kid = getKid(state, kidId);
  const loadout = currentLoadout(state, kidId);
  const s = sig(loadout);

  const [src, setSrc] = useState<string | null | undefined>(() =>
    readCache(kidId, s),
  );

  useEffect(() => {
    const cached = readCache(kidId, s);
    if (cached !== undefined) {
      setSrc(cached);
      return;
    }
    if (!webglAvailable()) {
      setSrc(null);
      return;
    }
    let alive = true;
    setSrc(undefined); // show the initial while the headshot renders
    // Debounce: trying on outfits in the Avatar Studio changes the loadout
    // rapidly; wait for it to settle so we render the final look once, not every
    // intermediate try-on.
    const timer = window.setTimeout(() => {
      getThumbnail(kidId, s, loadout).then((data) => {
        if (alive) setSrc(data);
      });
    }, 700);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // loadout is captured via `s` (its stable signature); see sig().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, s]);

  if (src) {
    return (
      <img
        className={`av3thumb ${className}`}
        src={src}
        width={size}
        height={size}
        alt=""
        style={{ borderColor: kid?.color, background: kid?.colorSoft ?? "#eef2fb" }}
      />
    );
  }
  return (
    <span
      className={`av3thumb av3thumb--initial ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        background: kid?.colorSoft ?? "#eef2fb",
        borderColor: kid?.color,
      }}
      aria-hidden="true"
    >
      {kid?.firstName?.slice(0, 1).toUpperCase() ?? "•"}
    </span>
  );
}
