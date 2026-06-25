import { useState } from "react";
import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import {
  DAILY_RULE,
  DAY_THEMES,
  KID_RULES,
  MANDATORY,
  SHARED_APPS,
  WEEKDAY_LABELS,
  assignmentFor,
  weeklyFor,
} from "../data/applications";
import { ProofButton } from "../components/ProofButton";
import { taskStatus } from "../store/selectors";
import { useClock } from "../hooks/useClock";
import type { AppLink } from "../types";

export function ApplicationsView() {
  const { state } = useApp();
  const now = useClock(60_000);
  const kid = KIDS[state.activeKid];
  const day = now.getDay(); // 0 Sun … 6 Sat
  const isWeekday = day >= 1 && day <= 5;
  const themeMeta = DAY_THEMES[day];
  const todays = isWeekday ? assignmentFor(kid.id, day) : null;
  const mandatory = MANDATORY[kid.id];
  const kidRule = KID_RULES[kid.id];
  const week = weeklyFor(kid.id);

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🧭 Applications</h2>
          <p className="view__sub">
            {kid.emoji} {kid.firstName}'s apps & today's assignment
          </p>
        </div>
      </div>

      <div className="rulebar">
        <span className="rulebar__icon">⚠️</span>
        <div>
          <strong>{DAILY_RULE}</strong>
          {kidRule && (
            <p className="rulebar__kid">
              {kid.emoji} {kid.firstName}'s rule: {kidRule}
            </p>
          )}
        </div>
      </div>

      <h3 className="section-title">📌 Today's Assignment</h3>
      {todays ? (
        <div className="assignment">
          <div className="assignment__top">
            <span className="assignment__theme">
              {themeMeta?.emoji} {WEEKDAY_LABELS[day]} · {todays.theme}
            </span>
            <h4 className="assignment__platform">
              {todays.emoji} {todays.platform}
            </h4>
            <p className="assignment__task">{todays.task}</p>
          </div>
          <div className="assignment__actions">
            <a
              className="btn btn--primary"
              href={todays.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              ↗ Open {todays.platform}
            </a>
          </div>
          <div className="assignment__proof">
            <ProofButton
              kidId={kid.id}
              kind="assignment"
              refId={todays.id}
              title={`${todays.platform}: ${todays.task}`}
              emoji={todays.emoji}
              xp={todays.xp}
              subtitle="Show your finished screen or result."
            />
          </div>
        </div>
      ) : (
        <div className="assignment assignment--rest">
          🌴 No assigned schoolwork today — enjoy the weekend! Your apps below are
          still here whenever you want them.
        </div>
      )}

      <h3 className="section-title">⭐ {kid.firstName}'s Required App</h3>
      <AppCard app={mandatory} required />

      <h3 className="section-title">🧰 Shared Tools</h3>
      <div className="applist">
        {SHARED_APPS.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>

      <h3 className="section-title">🗓️ {kid.firstName}'s Week</h3>
      <div className="weekgrid">
        {week.map((a) => {
          const isToday = a.day === day;
          const dm = DAY_THEMES[a.day];
          const status = taskStatus(state, kid.id, a.id).status;
          return (
            <div
              key={a.id}
              className={`weekcard ${isToday ? "is-today" : ""}`}
            >
              <span className="weekcard__day">
                {dm?.emoji} {WEEKDAY_LABELS[a.day]}
              </span>
              <span className="weekcard__theme">{a.theme}</span>
              <strong className="weekcard__platform">{a.platform}</strong>
              <span className="weekcard__task">{a.task}</span>
              {isToday && status === "approved" && (
                <span className="weekcard__badge">✓ Done</span>
              )}
              {isToday && status === "pending" && (
                <span className="weekcard__badge weekcard__badge--wait">
                  ⏳ Pending
                </span>
              )}
              {isToday && (status === "none" || status === "rejected") && (
                <span className="weekcard__badge weekcard__badge--todo">
                  Today
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AppCard({ app, required }: { app: AppLink; required?: boolean }) {
  return (
    <div className={`appcard ${required ? "appcard--required" : ""}`}>
      <span className="appcard__icon">{app.emoji}</span>
      <div className="appcard__body">
        <strong className="appcard__name">{app.name}</strong>
        {app.note && <span className="appcard__note">{app.note}</span>}
        {app.credential && (
          <div className="appcard__creds">
            <CopyField label="Username" value={app.credential.username} />
            <CopyField label="Password" value={app.credential.password} />
          </div>
        )}
      </div>
      <a
        className="btn btn--primary"
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        ↗ Open
      </a>
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — value is visible to type manually */
    }
  };
  return (
    <button className="copyfield" onClick={copy} title="Copy">
      <span className="copyfield__label">{label}</span>
      <code className="copyfield__value">{value}</code>
      <span className="copyfield__icon">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}
