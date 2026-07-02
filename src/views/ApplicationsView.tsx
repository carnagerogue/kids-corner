import { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  DAILY_RULE,
  DAY_THEMES,
  KID_RULES,
  WEEKDAY_LABELS,
  assignmentFor,
  weeklyFor,
} from "../data/applications";
import { ProofButton } from "../components/ProofButton";
import { AppCard } from "../components/AppCard";
import { ExploreSection } from "../components/ExploreSection";
import { getKid, taskStatus, visibleAppsFor } from "../store/selectors";
import { useClock } from "../hooks/useClock";

export function ApplicationsView() {
  const { state } = useApp();
  const now = useClock(60_000);
  const kid = getKid(state, state.activeKid);
  const day = now.getDay(); // 0 Sun … 6 Sat
  const isWeekday = day >= 1 && day <= 5;
  const themeMeta = DAY_THEMES[day];
  const todays = isWeekday ? assignmentFor(kid.id, day) : null;
  const apps = visibleAppsFor(state, kid.id);
  const kidRule = KID_RULES[kid.id];
  const week = weeklyFor(kid.id);

  // Focus loop: opening the assignment keeps Luminara as home base and
  // nudges the kid back to submit proof, instead of wandering off in a new tab.
  const [workingSince, setWorkingSince] = useState<number | null>(null);
  const status = todays ? taskStatus(state, kid.id, todays.id).status : "none";
  // Only "in focus" while there's still work to show (not once submitted/done).
  const inFocus =
    workingSince !== null && (status === "none" || status === "rejected");
  const workingMinutes = workingSince
    ? Math.max(0, Math.floor((now.getTime() - workingSince) / 60_000))
    : 0;
  const startFocus = () => setWorkingSince((s) => s ?? Date.now());
  const stopFocus = () => setWorkingSince(null);

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
        <div className={`assignment ${inFocus ? "assignment--focus" : ""}`}>
          <div className="assignment__top">
            <span className="assignment__theme">
              {themeMeta?.emoji} {WEEKDAY_LABELS[day]} · {todays.theme}
            </span>
            <h4 className="assignment__platform">
              {todays.emoji} {todays.platform}
            </h4>
            <p className="assignment__task">{todays.task}</p>
          </div>

          {inFocus && (
            <div className="focusbar">
              <span className="focusbar__tag">🎯 Working now</span>
              <span className="focusbar__msg">
                Come back here and tap{" "}
                <strong>📸 Take photo to finish</strong> when you're done.
              </span>
              <span className="focusbar__time">⏱️ {workingMinutes} min</span>
              {kid.id === "coby" && workingMinutes >= 25 && (
                <span className="focusbar__break">
                  🧃 25 minutes done — take a 5-minute break!
                </span>
              )}
            </div>
          )}

          <div className="assignment__actions">
            <a
              className="btn btn--primary"
              href={todays.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={startFocus}
            >
              ↗ {inFocus ? `Reopen ${todays.platform}` : `Open ${todays.platform}`}
            </a>
            {inFocus && (
              <button className="btn btn--ghost" onClick={stopFocus}>
                Not working on this
              </button>
            )}
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

      <h3 className="section-title">🧭 {kid.firstName}'s Apps</h3>
      {apps.length === 0 ? (
        <p className="empty">
          No apps yet — a grown-up can turn some on in the Grown-Ups area.
        </p>
      ) : (
        <div className="applist">
          {apps.map((a) => (
            <AppCard key={a.id} app={a} required={a.primary} />
          ))}
        </div>
      )}

      <h3 className="section-title">🌟 Explore</h3>
      <p className="section-hint">
        Safe, fun, and educational places to discover.
      </p>
      <ExploreSection />

      {week.length > 0 && (
        <>
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
        </>
      )}
    </div>
  );
}

