import { useEffect, useMemo, useRef, useState } from "react";
import { ref, set } from "firebase/database";
import { useApp } from "../store/AppContext";
import { useFamily } from "../store/FamilyContext";
import { getDb, FIREBASE_READY } from "../firebase";
import {
  allowedDomainsForKid,
  appMapForKid,
  DEFAULT_NEW_KID_APPS,
} from "../data/applications";
import {
  detectGuardian,
  guardianSupported,
  GUARDIAN_STORE_URL,
  onGuardianPresent,
  requestActivity,
  sendAllowlist,
} from "../lib/guardian";
import type { KidId } from "../types";

const DISMISS_KEY = "kids-corner:guardian-dismissed";

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
  const lastPersisted = useRef(0);

  const enabledApps = useMemo(
    () => state.appVisibility[kidId] ?? DEFAULT_NEW_KID_APPS,
    [state.appVisibility, kidId],
  );
  const domains = useMemo(() => allowedDomainsForKid(enabledApps), [enabledApps]);
  const appMap = useMemo(() => appMapForKid(enabledApps), [enabledApps]);

  // Hand the extension this child's allow-list (a no-op if it isn't installed),
  // and detect whether it's actually there.
  useEffect(() => {
    const activeFamilyId = basePath?.split("/")[1] ?? null;
    sendAllowlist(domains, appMap, activeFamilyId, kidId);
    let cancelled = false;
    void detectGuardian().then((ok) => {
      if (cancelled) return;
      setPresent(ok ? "yes" : "no");
      if (ok) sendAllowlist(domains, appMap, activeFamilyId, kidId);
    });
    // If it's installed mid-session, flip to protected and re-send the list.
    const off = onGuardianPresent(() => {
      setPresent("yes");
      sendAllowlist(domains, appMap, activeFamilyId, kidId);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [domains, appMap, kidId, basePath]);

  // Pull the extension's activity every minute and store today's totals in the
  // family cloud (idempotent per day; only when it changed).
  useEffect(() => {
    if (present !== "yes" || !FIREBASE_READY || !basePath) return;
    let stop = false;
    const tick = async () => {
      const act = await requestActivity();
      if (stop || !act || !act.day || act.day.updatedAt <= lastPersisted.current) return;
      const db = getDb();
      if (!db) return;
      lastPersisted.current = act.day.updatedAt;
      try {
        await set(ref(db, `${basePath}/activity/${kidId}/${act.date}`), act.day);
      } catch {
        /* best-effort — device may not be an enrolled member yet */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 60_000);
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
        href={GUARDIAN_STORE_URL}
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
