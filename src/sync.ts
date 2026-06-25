// The "family sync code" is a shared secret that links a family's devices to
// the same cloud message room. Kept in localStorage (per device, never
// committed) so the public site can't read a family's messages without it.

const SYNC_KEY = "kids-corner:syncCode";
export const SYNC_EVENT = "kids-corner:synccode";

export function readSyncCode(): string {
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
