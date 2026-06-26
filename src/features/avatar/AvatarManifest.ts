// ---------------------------------------------------------------------------
// AvatarManifest — loads the data-driven cosmetic catalog.
//
// Source of truth is public/assets/avatar/avatar-manifest.json (editable to add
// items without a rebuild). A bundled copy ships in this folder so the catalog
// is available synchronously on first paint; at runtime we fetch the public copy
// and merge any new/changed items by id. If the fetch fails (offline / not yet
// deployed), the bundled copy is used — the app never breaks.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import builtinJson from "./avatar-manifest.json";
import type { AvatarItem, AvatarManifest, SlotDef } from "./avatarTypes";

const BUILTIN = builtinJson as unknown as AvatarManifest;

/** Resolve a manifest asset path against the app base (`/kids-corner/` in prod). */
export function resolveAssetUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base + (path.startsWith("/") ? path : "/" + path);
}

function buildIndex(m: AvatarManifest): Map<string, AvatarItem> {
  return new Map(m.items.map((i) => [i.id, i]));
}

function mergeManifests(
  base: AvatarManifest,
  pub: Partial<AvatarManifest>,
): AvatarManifest {
  const byId = new Map<string, AvatarItem>(base.items.map((i) => [i.id, i]));
  if (Array.isArray(pub.items)) {
    for (const it of pub.items) {
      if (it && typeof it.id === "string") byId.set(it.id, it);
    }
  }
  const slots: SlotDef[] =
    Array.isArray(pub.slots) && pub.slots.length ? pub.slots : base.slots;
  return {
    version: typeof pub.version === "number" ? pub.version : base.version,
    slots,
    items: [...byId.values()],
  };
}

let CACHE: AvatarManifest = BUILTIN;
let INDEX = buildIndex(CACHE);
let loadPromise: Promise<AvatarManifest> | null = null;

/** The current (possibly not-yet-fetched) catalog. Always returns something. */
export function getManifest(): AvatarManifest {
  return CACHE;
}

export function itemById(id: string | undefined | null): AvatarItem | undefined {
  return id ? INDEX.get(id) : undefined;
}

export function itemsForSlot(slot: string): AvatarItem[] {
  return CACHE.items.filter((i) => i.slot === slot);
}

export function slotDefs(): SlotDef[] {
  return CACHE.slots;
}

/** Fetch + merge the public manifest once; cached thereafter. */
export function loadManifest(): Promise<AvatarManifest> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const res = await fetch(
        resolveAssetUrl("/assets/avatar/avatar-manifest.json"),
        { cache: "no-cache" },
      );
      if (res.ok) {
        const pub = (await res.json()) as Partial<AvatarManifest>;
        CACHE = mergeManifests(BUILTIN, pub);
        INDEX = buildIndex(CACHE);
      }
    } catch {
      // Offline or not deployed yet — the bundled catalog is fine.
    }
    return CACHE;
  })();
  return loadPromise;
}

/**
 * React hook: returns the catalog, kicking off the public-manifest fetch on
 * mount. Starts with the bundled catalog so the UI renders immediately, then
 * re-renders if the fetched copy adds anything.
 */
export function useAvatarManifest(): AvatarManifest {
  const [manifest, setManifest] = useState<AvatarManifest>(CACHE);
  useEffect(() => {
    let alive = true;
    loadManifest().then((m) => {
      if (alive) setManifest(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return manifest;
}
