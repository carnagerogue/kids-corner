// Page side of the Kids Corner Guardian handshake. The extension's content
// script and the page exchange small window.postMessage envelopes tagged __kcg.
// The page (signed in) hands the extension the child's allow-list and reads
// back activity; the extension never holds Firebase credentials.

const TAG = "__kcg";

/**
 * Where a parent/child installs the extension. Replace REPLACE_WITH_ID with the
 * real Chrome Web Store id once the Guardian is published (see extension/README).
 */
export const GUARDIAN_STORE_URL =
  "https://chromewebstore.google.com/detail/REPLACE_WITH_ID";

export type GuardianDay = {
  apps: Record<string, number>; // appId -> active seconds
  opens: { a: string; t: string }[]; // recent app opens (appId, HH:MM)
  blocked: Record<string, number>; // host -> blocked count
  updatedAt: number;
};
export type GuardianActivity = { date: string; day: GuardianDay };

/** This browser can run the Guardian (desktop Chrome/Edge/Firefox, not iOS). */
export function guardianSupported(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  const ua = navigator.userAgent;
  const isiOS =
    /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
  if (isiOS) return false;
  if (/Mobile|Android/.test(ua)) return false;
  return /Chrome|Edg|Firefox/.test(ua);
}

function post(msg: Record<string, unknown>) {
  window.postMessage({ [TAG]: 1, dir: "p2c", ...msg }, window.location.origin);
}

function listen<T>(
  match: (d: Record<string, unknown>) => boolean,
  map: (d: Record<string, unknown>) => T,
  timeout: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: T) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMsg);
      resolve(v);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window) return;
      const d = e.data as Record<string, unknown>;
      if (d && d[TAG] === 1 && d.dir === "c2p" && match(d)) finish(map(d));
    };
    window.addEventListener("message", onMsg);
    setTimeout(() => finish(fallback), timeout);
  });
}

/** True if the Guardian announces itself within `timeout` ms. */
export function detectGuardian(timeout = 1500): Promise<boolean> {
  const p = listen((d) => d.type === "present", () => true, timeout, false);
  post({ type: "ping" });
  return p;
}

/** Fires whenever the extension announces presence (e.g. installed mid-session). */
export function onGuardianPresent(cb: () => void): () => void {
  const onMsg = (e: MessageEvent) => {
    if (e.source !== window) return;
    const d = e.data as Record<string, unknown>;
    if (d && d[TAG] === 1 && d.dir === "c2p" && d.type === "present") cb();
  };
  window.addEventListener("message", onMsg);
  return () => window.removeEventListener("message", onMsg);
}

export function sendAllowlist(
  domains: string[],
  appMap: Record<string, string>,
  familyId: string | null,
  kidId: string | null,
): void {
  post({ type: "allowlist", domains, appMap, familyId, kidId });
}

/** Ask the extension for today's activity (null on timeout / not installed). */
export function requestActivity(timeout = 1500): Promise<GuardianActivity | null> {
  const p = listen<GuardianActivity | null>(
    (d) => d.type === "activity",
    (d) => ({ date: d.date as string, day: d.day as GuardianDay }),
    timeout,
    null,
  );
  post({ type: "getActivity" });
  return p;
}
