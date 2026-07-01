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

// First-run setup markers, keyed per family id (device-local). `setup` means
// THIS device created the family and is still walking the setup wizard;
// `onboarded` means it finished. Gating the wizard on `setup` (not on a
// momentarily-empty roster) is what stops a returning parent on a second device
// — whose roster hasn't synced down yet — from being shown first-run setup.
const onboardKey = (fid: string | null) => `kids-corner:onboarded:${fid ?? "none"}`;
const setupKey = (fid: string | null) => `kids-corner:setup:${fid ?? "none"}`;

export function isOnboarded(fid: string | null): boolean {
  try {
    return !!fid && localStorage.getItem(onboardKey(fid)) === "1";
  } catch {
    return false;
  }
}
export function setOnboarded(fid: string | null): void {
  try {
    if (fid) {
      localStorage.setItem(onboardKey(fid), "1");
      localStorage.removeItem(setupKey(fid));
    }
  } catch {
    /* ignore */
  }
}
/** This device is mid-setup for a family it just created (survives the reload). */
export function isSettingUp(fid: string | null): boolean {
  try {
    return !!fid && localStorage.getItem(setupKey(fid)) === "1";
  } catch {
    return false;
  }
}
export function markSetupStarted(fid: string | null): void {
  try {
    if (fid) localStorage.setItem(setupKey(fid), "1");
  } catch {
    /* ignore */
  }
}
