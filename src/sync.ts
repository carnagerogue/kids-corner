// Cross-device sync room. By DEFAULT every device joins one shared family room,
// so the app "just works" from any computer with zero setup. A grown-up can
// optionally set a private code (same on each device) to use a separate room.

const SYNC_KEY = "kids-corner:syncCode";
export const SYNC_EVENT = "kids-corner:synccode";

/** The shared room used when no private code is set. */
export const DEFAULT_SYNC_CODE = "kids-corner-family";

/** The room this device syncs to (the custom code, else the shared default). */
export function readSyncCode(): string {
  try {
    return localStorage.getItem(SYNC_KEY) || DEFAULT_SYNC_CODE;
  } catch {
    return DEFAULT_SYNC_CODE;
  }
}

/** The grown-up's custom code, or "" when using the shared default room. */
export function readSyncOverride(): string {
  try {
    return localStorage.getItem(SYNC_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeSyncCode(code: string): void {
  try {
    const c = code.trim();
    if (c) localStorage.setItem(SYNC_KEY, c);
    else localStorage.removeItem(SYNC_KEY);
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* ignore */
  }
}
