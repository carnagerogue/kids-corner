// ---------------------------------------------------------------------------
// PIN hashing — SHA-256 via the Web Crypto API (built into every modern
// browser, no dependency). PINs are low-entropy by design (3-8 digits), so
// hashing does NOT make them brute-force-proof against someone who already
// has read access to the room — the real protection is keeping that room
// private (see src/sync.ts). Hashing just means a PIN is never stored or
// synced as plain text, so a casual glance at the database doesn't hand
// someone a working login.
// ---------------------------------------------------------------------------

// App-specific, not secret — just avoids a generic SHA256(pin) lookup table.
const PIN_SALT = "kids-corner-pin-v1";

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`${PIN_SALT}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** A SHA-256 hex digest is exactly 64 lowercase hex chars — no PIN a kid
 * types (digits only, "min 3 digits") could ever look like this, so this
 * reliably tells a hashed value apart from a not-yet-migrated plaintext one. */
export function looksHashed(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/** True if `entered` matches `stored`, whether `stored` is already a hash (the
 * normal case) or still plain text (not yet migrated on this device/room). */
export async function pinMatches(entered: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (looksHashed(stored)) return (await hashPin(entered)) === stored;
  return entered === stored;
}
