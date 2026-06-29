// ---------------------------------------------------------------------------
// Avatar3DThumb — the kid's 3D avatar as a small thumbnail (top bar, home cards,
// parent zone). It shows a cached PNG headshot rendered from the dressed VRM;
// until that exists it shows the kid's emoji chip, so the UI is instant and
// works with no WebGL. The heavy Three.js renderer is dynamically imported only
// on a cache miss, so the app chrome never pulls it in at startup.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { useApp } from "../../store/AppContext";
import { getKid } from "../../store/selectors";
import { webglAvailable } from "./webgl";
import { currentLoadout } from "./AvatarEconomy";
import type { KidId, Loadout3D } from "../../types";

// Cache: kid+loadout signature → PNG data URL. `null` means "rendered, but the
// kid has no model" (so we keep the emoji and never retry). In memory for the
// session + localStorage so a returning visitor sees the avatar instantly.
const mem = new Map<string, string | null>();
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

/** undefined = never rendered; string = image; null = no model (use fallback). */
function readCache(key: string): string | null | undefined {
  if (mem.has(key)) return mem.get(key);
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    if (v) {
      mem.set(key, v);
      return v;
    }
  } catch {
    /* private mode — fall through to a render */
  }
  return undefined;
}

function writeCache(key: string, data: string | null) {
  mem.set(key, data);
  if (data) {
    try {
      localStorage.setItem(LS_PREFIX + key, data);
    } catch {
      /* storage full — the in-memory cache still serves this session */
    }
  }
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
  const key = kidId + ":" + sig(loadout);

  const [src, setSrc] = useState<string | null | undefined>(() => readCache(key));

  useEffect(() => {
    const cached = readCache(key);
    if (cached !== undefined) {
      setSrc(cached);
      return;
    }
    if (!webglAvailable()) {
      setSrc(null);
      return;
    }
    let alive = true;
    setSrc(undefined); // show the emoji chip while the headshot renders
    import("../../world/avatarThumbnail")
      .then((m) => m.renderAvatarThumbnail(kidId, loadout))
      .then((data) => {
        writeCache(key, data);
        if (alive) setSrc(data);
      })
      .catch(() => {
        writeCache(key, null);
        if (alive) setSrc(null);
      });
    return () => {
      alive = false;
    };
    // loadout is captured via `key` (its stable signature); see sig().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, kidId]);

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
      className={`av3thumb av3thumb--emoji ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        background: kid?.colorSoft ?? "#eef2fb",
        borderColor: kid?.color,
      }}
      aria-hidden="true"
    >
      {kid?.emoji ?? "🙂"}
    </span>
  );
}
