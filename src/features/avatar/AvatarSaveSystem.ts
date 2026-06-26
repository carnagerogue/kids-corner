// ---------------------------------------------------------------------------
// AvatarSaveSystem — a swappable persistence seam.
//
// IMPORTANT: the app's CANONICAL avatar + economy state lives in the reducer
// (src/store) and already persists to localStorage AND syncs across devices via
// FamilySync (Firebase). Do not duplicate that here.
//
// This module is two things:
//   1. The documented abstraction to later swap in Firebase/Supabase for a
//      standalone deployment — implement the same function signatures against a
//      backend and the rest of the feature is unchanged.
//   2. The store for purely-LOCAL, per-device UI preferences that don't need to
//      sync: favorite items and "newly unlocked" (unseen) markers.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useState } from "react";
import type { KidId, Loadout3D } from "../../types";

const NS = "kids-corner:avatar";
const keyFor = (userId: KidId, bucket: string) => `${NS}:${userId}:${bucket}`;

function readJSON<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode / full — ignore */
  }
}

// --- Portability seam (spec API) -------------------------------------------
// These mirror the requested load*/save* API. In this app they are a local
// mirror; in a standalone build, point them at Firebase/Supabase instead.

export function loadLearnerAvatar(userId: KidId): Loadout3D | null {
  return readJSON<Loadout3D | null>(keyFor(userId, "avatar"), null);
}
export function saveLearnerAvatar(userId: KidId, avatar: Loadout3D): void {
  writeJSON(keyFor(userId, "avatar"), avatar);
}
export function loadInventory(userId: KidId): string[] {
  return readJSON<string[]>(keyFor(userId, "inventory"), []);
}
export function saveInventory(userId: KidId, inventory: string[]): void {
  writeJSON(keyFor(userId, "inventory"), inventory);
}
export function loadEconomy(userId: KidId): { coins: number } {
  return readJSON(keyFor(userId, "economy"), { coins: 0 });
}
export function saveEconomy(userId: KidId, economy: { coins: number }): void {
  writeJSON(keyFor(userId, "economy"), economy);
}

// --- Favorites (local UI pref) ---------------------------------------------

export function loadFavorites(userId: KidId): string[] {
  return readJSON<string[]>(keyFor(userId, "favorites"), []);
}
export function saveFavorites(userId: KidId, ids: string[]): void {
  writeJSON(keyFor(userId, "favorites"), ids);
}

/** Reactive favorites for a learner. */
export function useFavorites(userId: KidId) {
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(userId));
  useEffect(() => setFavorites(loadFavorites(userId)), [userId]);
  const toggleFavorite = useCallback(
    (id: string) =>
      setFavorites((prev) => {
        const next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
        saveFavorites(userId, next);
        return next;
      }),
    [userId],
  );
  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);
  return { favorites, toggleFavorite, isFavorite };
}

// --- "Newly unlocked" markers (local UI pref) ------------------------------
// We mark owned ids the learner hasn't acknowledged yet, to show a "NEW!" badge.

export function loadSeen(userId: KidId): string[] {
  return readJSON<string[]>(keyFor(userId, "seen"), []);
}
export function saveSeen(userId: KidId, ids: string[]): void {
  writeJSON(keyFor(userId, "seen"), ids);
}

/** Returns owned ids not yet acknowledged, plus an ack() to clear them. */
export function useNewlyUnlocked(userId: KidId, ownedIds: string[]) {
  const [seen, setSeen] = useState<string[]>(() => loadSeen(userId));
  useEffect(() => setSeen(loadSeen(userId)), [userId]);
  const seenSet = new Set(seen);
  const fresh = ownedIds.filter((id) => !seenSet.has(id));
  const acknowledge = useCallback(() => {
    const all = Array.from(new Set([...seen, ...ownedIds]));
    saveSeen(userId, all);
    setSeen(all);
  }, [seen, ownedIds, userId]);
  return { newlyUnlocked: fresh, acknowledge };
}
