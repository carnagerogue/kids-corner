import { useCallback, useEffect, useState } from "react";
import { get, ref, set } from "firebase/database";
import { useApp } from "../store/AppContext";
import { useFamily } from "../store/FamilyContext";
import { getDb, FIREBASE_READY } from "../firebase";
import { getKid, kidList } from "../store/selectors";
import { APP_CATALOG_BY_ID } from "../data/applications";
import { RESOURCE_BY_ID } from "../data/resources";
import { GUARDIAN_INSTALL_URL, type GuardianDay } from "../lib/guardian";

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function mins(secs: number): string {
  const m = Math.round(secs / 60);
  return m < 1 ? "<1 min" : `${m} min`;
}
function appName(id: string): string {
  const a = APP_CATALOG_BY_ID[id];
  if (a) return `${a.emoji} ${a.name}`;
  const r = RESOURCE_BY_ID[id];
  if (r) return `${r.emoji} ${r.name}`;
  return id;
}

type ActivityMap = Record<string, Record<string, GuardianDay>>;
type AlertMap = Record<string, { at: number } | null>;

function clock(at: number): string {
  try {
    return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}
function whenStr(at: number): string {
  try {
    return new Date(at).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "recently";
  }
}

/**
 * Parent view of what the Guardian extension recorded on each child's device:
 * time on each allowed app today, which apps were opened, and sites that were
 * blocked — plus how to turn Safe Browsing on where it isn't yet.
 */
export function GuardianReport() {
  const { state } = useApp();
  const { basePath } = useFamily();
  const kids = kidList(state);
  const [activity, setActivity] = useState<ActivityMap>({});
  const [alerts, setAlerts] = useState<AlertMap>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!FIREBASE_READY || !basePath) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await get(ref(db, `${basePath}/activity`));
      setActivity((snap.val() as ActivityMap | null) ?? {});
    } catch {
      setActivity({});
    }
    try {
      const aSnap = await get(ref(db, `${basePath}/guardianAlerts`));
      setAlerts((aSnap.val() as AlertMap | null) ?? {});
    } catch {
      setAlerts({});
    }
    setLoading(false);
  }, [basePath]);

  const dismissAlert = useCallback(
    async (kidId: string) => {
      setAlerts((a) => ({ ...a, [kidId]: null }));
      const db = getDb();
      if (db && basePath) {
        try {
          await set(ref(db, `${basePath}/guardianAlerts/${kidId}`), null);
        } catch {
          /* ignore — best effort */
        }
      }
    },
    [basePath],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const day = today();

  return (
    <>
      <h3 className="section-title">🛡️ Safe Browsing</h3>
      <div className="settings">
        <p className="settings__hint">
          The Kids Corner Guardian keeps each child's browser on the apps you've
          allowed and logs their time on task. Install it on each child's device;
          it turns itself on automatically once they're signed in.
        </p>

        <div className="guardrep">
          {kids.map((k) => {
            const d = activity[k.id]?.[day];
            const apps = d ? Object.entries(d.apps ?? {}) : [];
            apps.sort((a, b) => b[1] - a[1]);
            const blocked = d ? Object.entries(d.blocked ?? {}) : [];
            blocked.sort((a, b) => b[1] - a[1]);
            const opens = d?.opens ?? [];
            const onSite = d?.onSite ?? 0;
            const lastSeen = d?.lastSeen ?? 0;
            const active = !!d;
            const kid = getKid(state, k.id);
            const alert = alerts[k.id];
            return (
              <div
                key={k.id}
                className="guardrep__kid"
                style={{ ["--this-kid" as string]: kid.color }}
              >
                {alert && (
                  <div className="guardrep__alert" role="alert">
                    <span>
                      ⚠️ Safe Browsing was <strong>removed</strong> from{" "}
                      {kid.firstName}'s device on {whenStr(alert.at)}. Reinstall
                      the Guardian to turn protection back on.
                    </span>
                    <button
                      className="guardrep__alertx"
                      onClick={() => void dismissAlert(k.id)}
                      aria-label="Dismiss alert"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <div className="guardrep__head">
                  <span className="guardrep__name">
                    {kid.emoji} {kid.firstName}
                  </span>
                  <span
                    className={`guardrep__status ${active && !alert ? "is-on" : "is-off"}`}
                  >
                    {alert ? "⚠️ Removed" : active ? "🛡️ Protected" : "Not set up"}
                  </span>
                </div>

                {active ? (
                  <>
                    {onSite > 0 && (
                      <p className="guardrep__opens">
                        🏠 On Kids Corner: <strong>{mins(onSite)}</strong>
                      </p>
                    )}
                    {apps.length > 0 ? (
                      <ul className="guardrep__apps">
                        {apps.map(([id, secs]) => (
                          <li key={id}>
                            <span>{appName(id)}</span>
                            <strong>{mins(secs)}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="settings__hint">
                        No learning-app time yet — it appears here once they open
                        an app.
                      </p>
                    )}
                    {opens.length > 0 && (
                      <p className="guardrep__opens">
                        Opened:{" "}
                        {opens
                          .slice(-8)
                          .map((o) => `${appName(o.a).split(" ")[0]} ${o.t}`)
                          .join(" · ")}
                      </p>
                    )}
                    {blocked.length > 0 && (
                      <p className="guardrep__blocked">
                        🚫 Blocked:{" "}
                        {blocked
                          .slice(0, 5)
                          .map(([host, n]) => `${host}${n > 1 ? ` ×${n}` : ""}`)
                          .join(", ")}
                      </p>
                    )}
                    {lastSeen > 0 && (
                      <p className="guardrep__opens">
                        Last check-in {clock(lastSeen)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="settings__hint">
                    No activity today — install the Guardian on {kid.firstName}'s
                    device (they'll see a one-tap prompt when they sign in).
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button className="btn btn--ghost btn--sm" onClick={() => void load()}>
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>

        <details className="guardrep__setup">
          <summary>How to set up each device</summary>
          <ul className="guardrep__how">
            <li>
              <strong>Windows / Mac computer:</strong>{" "}
              <a href={GUARDIAN_INSTALL_URL} target="_blank" rel="noreferrer">
                open the one-click installer
              </a>{" "}
              and run it once — your child doesn't install anything and can't
              remove it. (Chromebook: personal ones use the Chrome Web Store once
              it's approved; managed ones install from Google Admin.)
            </li>
            <li>
              <strong>iPad / iPhone:</strong> extensions can't do this on iOS —
              use <strong>Settings → Screen Time → Content &amp; Privacy → Web
              Content → Allowed Websites</strong>, plus Guided Access to lock the
              tablet to one app.
            </li>
          </ul>
        </details>
      </div>
    </>
  );
}
