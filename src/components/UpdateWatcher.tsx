import { useEffect, useState } from "react";
import { readSession } from "../store/storage";

// ---------------------------------------------------------------------------
// UpdateWatcher — self-healing for stale cached builds on GitHub Pages.
//
// The problem this prevents: a device keeps running an OLD cached bundle after
// a new version deploys (browsers cache index.html), which can break things
// like login when the data format changes underneath it. This periodically
// re-fetches index.html and compares the content-hashed entry chunk it points
// at against the one THIS app actually loaded. If they differ, a newer build
// is live:
//   • nobody logged in (login screen)  -> reload immediately (nothing to lose,
//     and it auto-fixes "stale app can't log in")
//   • a kid is mid-session             -> show a gentle "Refresh" banner instead
//     of yanking them out of what they're doing.
//
// Only active in a production build; dev serves un-hashed module URLs.
// ---------------------------------------------------------------------------

const ENTRY_RE = /src="([^"]*\/assets\/index-[^"]+\.js)"/;

/** The entry-chunk URL this running app loaded from (content-hashed in prod). */
const CURRENT_ENTRY =
  (
    document.querySelector(
      'script[type="module"][src*="/assets/index-"]',
    ) as HTMLScriptElement | null
  )?.src ?? "";

async function fetchLatestEntry(): Promise<string | null> {
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}index.html?ts=${Date.now()}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(ENTRY_RE);
    return m ? new URL(m[1], location.href).href : null;
  } catch {
    return null; // offline / transient — try again next tick
  }
}

export function UpdateWatcher() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD || !CURRENT_ENTRY) return;
    let stopped = false;

    const check = async () => {
      const latest = await fetchLatestEntry();
      if (stopped || !latest || latest === CURRENT_ENTRY) return;
      if (readSession() === null) location.reload();
      else setUpdateReady(true);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const initial = window.setTimeout(() => void check(), 4000);
    const interval = window.setInterval(() => void check(), 20 * 60 * 1000);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  if (!updateReady) return null;
  return (
    <div className="update-banner" role="status">
      <span>🆕 A new version of Kids Corner is ready.</span>
      <button className="update-banner__btn" onClick={() => location.reload()}>
        Refresh now
      </button>
    </div>
  );
}
