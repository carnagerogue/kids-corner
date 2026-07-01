// Tiny, React-free helpers shared by storage.ts and FamilyContext.tsx (kept
// separate to avoid a circular import between them).

export const PAIRED_KEY = "kids-corner:pairedFamily";
export const ACTIVE_KEY = "kids-corner:activeFamily";

/**
 * The family this device is currently scoped to (a parent's active family, or a
 * paired kids' device), resolvable synchronously. Null = legacy/unmigrated, in
 * which case we keep using the single shared local cache + room.
 */
export function scopedFamilyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY) || localStorage.getItem(PAIRED_KEY) || null;
  } catch {
    return null;
  }
}
