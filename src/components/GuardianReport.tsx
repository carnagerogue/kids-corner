import { useCallback, useEffect, useState } from "react";
import { get, ref } from "firebase/database";
import { useApp } from "../store/AppContext";
import { useFamily } from "../store/FamilyContext";
import { getDb, FIREBASE_READY } from "../firebase";
import { getKid, kidList } from "../store/selectors";
import { APP_CATALOG_BY_ID } from "../data/applications";
import { GUARDIAN_STORE_URL, type GuardianDay } from "../lib/guardian";

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
  return a ? `${a.emoji} ${a.name}` : id;
}

type ActivityMap = Record<string, Record<string, GuardianDay>>;

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
    setLoading(false);
  }, [basePath]);

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
            const active = !!d;
            const kid = getKid(state, k.id);
            return (
              <div
                key={k.id}
                className="guardrep__kid"
                style={{ ["--this-kid" as string]: kid.color }}
              >
                <div className="guardrep__head">
                  <span className="guardrep__name">
                    {kid.emoji} {kid.firstName}
                  </span>
                  <span
                    className={`guardrep__status ${active ? "is-on" : "is-off"}`}
                  >
                    {active ? "🛡️ Protected" : "Not set up"}
                  </span>
                </div>

                {active ? (
                  <>
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
                      <p className="settings__hint">No app time yet today.</p>
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
              <strong>Chromebook / computer (Chrome, Edge, Firefox):</strong>{" "}
              install the{" "}
              <a href={GUARDIAN_STORE_URL} target="_blank" rel="noreferrer">
                Kids Corner Guardian
              </a>
              . On a managed Chromebook you can force-install it so it can't be
              removed.
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
