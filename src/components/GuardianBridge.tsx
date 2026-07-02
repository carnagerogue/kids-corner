import { useEffect, useMemo, useRef, useState } from "react";
import { increment, ref, set, update } from "firebase/database";
import { useApp } from "../store/AppContext";
import { useFamily } from "../store/FamilyContext";
import { getDb, FIREBASE_READY } from "../firebase";
import {
  allowedDomainsForKid,
  appMapForKid,
  DEFAULT_NEW_KID_APPS,
} from "../data/applications";
import { RESOURCES } from "../data/resources";
import {
  detectGuardian,
  guardianSupported,
  GUARDIAN_INSTALL_URL,
  onGuardianPresent,
  requestActivity,
  sendAllowlist,
} from "../lib/guardian";
import type { KidId } from "../types";

const DISMISS_KEY = "kids-corner:guardian-dismissed";

function todayKey(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Runs on a logged-in child's screen. Hands the Guardian extension this child's
 * allow-list (their enabled apps' domains), reports the extension's time-on-task
 * back to the family's cloud, and — when the extension isn't installed on a
 * browser that could run it — shows a one-tap prompt to turn on Safe Browsing.
 */
export function GuardianBridge({ kidId }: { kidId: KidId }) {
  const { state } = useApp();
  const { basePath } = useFamily();
  const [present, setPresent] = useState<"unknown" | "yes" | "no">("unknown");
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const alertedRemoval = useRef(false);
  const absentStreak = useRef(0);

  const enabledApps = useMemo(
    () => state.appVisibility[kidId] ?? DEFAULT_NEW_KID_APPS,
    [state.appVisibility, kidId],
  );
  // Explore sites still visible to this kid (turned-off ones are excluded, so
  // the Guardian blocks them just like any other off-list site).
  const visibleResourceIds = useMemo(() => {
    const hidden = state.exploreHidden[kidId] ?? [];
    return RESOURCES.filter((r) => !hidden.includes(r.id)).map((r) => r.id);
  }, [state.exploreHidden, kidId]);
  const customSites = useMemo(
    () => state.customSites[kidId] ?? [],
    [state.customSites, kidId],
  );
  const domains = useMemo(
    () =>
      allowedDomainsForKid(
        enabledApps,
        visibleResourceIds,
        customSites.map((s) => s.url),
      ),
    [enabledApps, visibleResourceIds, customSites],
  );
  const appMap = useMemo(
    () => appMapForKid(enabledApps, visibleResourceIds, customSites),
    [enabledApps, visibleResourceIds, customSites],
  );

  const activeFamilyId = basePath?.split("/")[1] ?? null;
  // Keep the freshest allow-list for the presence poll, which shouldn't restart
  // every time a grown-up toggles an app.
  const allowRef = useRef({ domains, appMap });
  allowRef.current = { domains, appMap };

  // Push the allow-list immediately whenever it changes (no-op if not installed).
  useEffect(() => {
    sendAllowlist(domains, appMap, activeFamilyId, kidId);
  }, [domains, appMap, kidId, activeFamilyId]);

  // Watch for the extension AT ALL TIMES — not just on load. Poll every 20s so
  // we notice it being installed mid-session OR removed. On a removal we bring
  // the install prompt back (even if dismissed) and alert the grown-up.
  useEffect(() => {
    let stop = false;
    const INSTALLED_KEY = `kids-corner:guardian-installed:${kidId}`;
    const db = FIREBASE_READY && basePath ? getDb() : null;
    const alertRef = db && basePath ? ref(db, `${basePath}/guardianAlerts/${kidId}`) : null;

    const apply = (ok: boolean) => {
      if (stop) return;
      setPresent(ok ? "yes" : "no");
      if (ok) {
        absentStreak.current = 0;
        // (Re)configure a freshly-installed extension right away.
        sendAllowlist(allowRef.current.domains, allowRef.current.appMap, activeFamilyId, kidId);
        let wasInstalled = false;
        try {
          wasInstalled = localStorage.getItem(INSTALLED_KEY) === "1";
          localStorage.setItem(INSTALLED_KEY, "1");
        } catch {
          /* ignore */
        }
        alertedRemoval.current = false;
        // Not previously marked installed on this device -> a fresh install OR a
        // reinstall after removal (this flag survives reloads/new tabs, unlike an
        // in-memory ref): clear any standing removal alert. Harmless no-op if none.
        if (!wasInstalled && alertRef) set(alertRef, null).catch(() => {});
      } else {
        absentStreak.current += 1;
        let hadIt = false;
        try {
          hadIt = localStorage.getItem(INSTALLED_KEY) === "1";
        } catch {
          /* ignore */
        }
        // It was installed on this device and is now gone -> a removal. Require
        // two consecutive misses so one flaky check can't falsely accuse a kid.
        // Alert once and re-show the prompt even if the child dismissed it.
        if (hadIt && !alertedRemoval.current && absentStreak.current >= 2) {
          alertedRemoval.current = true;
          try {
            localStorage.removeItem(INSTALLED_KEY);
          } catch {
            /* ignore */
          }
          try {
            sessionStorage.removeItem(DISMISS_KEY);
          } catch {
            /* ignore */
          }
          setDismissed(false);
          if (alertRef) set(alertRef, { kidId, at: Date.now() }).catch(() => {});
        }
      }
    };

    const off = onGuardianPresent(() => apply(true));
    const tick = async () => apply(await detectGuardian());
    void tick();
    const id = window.setInterval(() => void tick(), 20_000);
    return () => {
      stop = true;
      off();
      window.clearInterval(id);
    };
  }, [kidId, basePath, activeFamilyId]);

  // While the extension is present, check in every minute: record active time
  // ON Kids Corner + whatever the extension logged (learning-app time, opens,
  // blocked attempts), and stamp lastSeen. This is what tells the grown-up
  // dashboard the child is protected and shows what they've been doing — even
  // before they open an app (the extension alone logs nothing on this page).
  useEffect(() => {
    if (present !== "yes" || !FIREBASE_READY || !basePath) return;
    let stop = false;
    const path = `${basePath}/activity/${kidId}`;

    // Merge the extension's latest totals — ONLY when it actually answers.
    // update() (not set()) touches just these fields, so a getActivity timeout
    // can never wipe the app time / opens / blocked already recorded today.
    const syncExtension = async () => {
      const act = await requestActivity();
      const db = getDb();
      if (stop || !db || !act?.day) return;
      const day = act.day;
      try {
        await update(ref(db, `${path}/${act.date}`), {
          apps: day.apps ?? {},
          opens: day.opens ?? [],
          blocked: day.blocked ?? {},
          updatedAt: day.updatedAt ?? 0,
          lastSeen: Date.now(),
        });
      } catch {
        /* best-effort — device may not be an enrolled member yet */
      }
    };

    // Presence heartbeat: stamp lastSeen, and add a minute of on-site time while
    // the child is actually looking at Kids Corner. increment() is atomic, so a
    // reload, a second tab, or a midnight rollover can't corrupt the tally (each
    // day is its own doc, so the new day starts fresh).
    const heartbeat = async (addMinute: boolean) => {
      const db = getDb();
      if (stop || !db) return;
      const patch: Record<string, unknown> = { lastSeen: Date.now() };
      if (
        addMinute &&
        (typeof document === "undefined" ||
          document.visibilityState === "visible")
      ) {
        patch.onSite = increment(60);
      }
      try {
        await update(ref(db, `${path}/${todayKey()}`), patch);
      } catch {
        /* best-effort */
      }
    };

    void heartbeat(false); // immediate check-in -> dashboard shows "protected" fast
    void syncExtension();
    const id = window.setInterval(() => {
      void heartbeat(true);
      void syncExtension();
    }, 60_000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [present, basePath, kidId]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // Only nudge on a browser that can actually run the extension, when it isn't
  // there yet and the child hasn't dismissed it this session.
  if (present !== "no" || dismissed || !guardianSupported()) return null;

  return (
    <div className="guardbar" role="status">
      <span className="guardbar__icon" aria-hidden="true">
        🛡️
      </span>
      <span className="guardbar__text">
        <strong>Turn on Safe Browsing</strong> — it keeps you on your learning
        apps. One tap to add it.
      </span>
      <a
        className="guardbar__go"
        href={GUARDIAN_INSTALL_URL}
        target="_blank"
        rel="noreferrer"
      >
        Add it →
      </a>
      <button className="guardbar__x" onClick={dismiss} aria-label="Not now">
        ×
      </button>
    </div>
  );
}
