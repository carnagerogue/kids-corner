import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { SCHEDULE, SCHEDULE_TOTAL_XP } from "../data/schedule";
import { getDay } from "../store/selectors";
import { useClock, minutesSinceMidnight } from "../hooks/useClock";
import type { TabId } from "../App";

export function ScheduleView({ onTab }: { onTab: (t: TabId) => void }) {
  const { state, dispatch } = useApp();
  const now = useClock();
  const nowMin = minutesSinceMidnight(now);
  const kid = KIDS[state.activeKid];
  const today = getDay(state, kid.id);
  const doneSet = new Set(today.scheduleDone);
  const doneCount = today.scheduleDone.length;
  const earned = SCHEDULE.filter((b) => doneSet.has(b.id)).reduce(
    (s, b) => s + b.xp,
    0,
  );
  const pct = Math.round((doneCount / SCHEDULE.length) * 100);

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🗓️ Today's Schedule</h2>
          <p className="view__sub">
            {kid.emoji} {kid.firstName} ·{" "}
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="schedule-progress">
          <div className="schedule-progress__bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="schedule-progress__label">
            {doneCount}/{SCHEDULE.length} done · {earned}/{SCHEDULE_TOTAL_XP} XP
          </span>
        </div>
      </div>

      <ul className="timeline">
        {SCHEDULE.map((block) => {
          const done = doneSet.has(block.id);
          const isNow = nowMin >= block.startMinutes && nowMin < block.endMinutes;
          const isPast = nowMin >= block.endMinutes;
          return (
            <li
              key={block.id}
              className={`tblock ${done ? "is-done" : ""} ${
                isNow ? "is-now" : ""
              } ${isPast && !done ? "is-past" : ""}`}
              style={{ ["--accent" as string]: block.accent }}
            >
              <div className="tblock__rail">
                <span className="tblock__dot">{block.emoji}</span>
              </div>
              <div className="tblock__body">
                <div className="tblock__top">
                  <strong className="tblock__title">{block.title}</strong>
                  {isNow && <span className="tblock__live">● NOW</span>}
                  <span className="tblock__xp">⚡ {block.xp}</span>
                </div>
                <span className="tblock__time">{block.time}</span>
                {block.note && <p className="tblock__note">{block.note}</p>}
                {block.opensApplications && (
                  <button
                    className="tblock__applink"
                    onClick={() => onTab("applications")}
                  >
                    🧭 Open Applications page →
                  </button>
                )}
              </div>
              <button
                className={`check ${done ? "is-checked" : ""}`}
                aria-pressed={done}
                aria-label={done ? "Mark not done" : "Mark done"}
                onClick={() =>
                  dispatch({
                    type: "TOGGLE_SCHEDULE",
                    kidId: kid.id,
                    blockId: block.id,
                  })
                }
              >
                {done ? "✓" : ""}
              </button>
            </li>
          );
        })}
      </ul>

      {doneCount === SCHEDULE.length && (
        <div className="celebrate">
          🎉 Perfect day, {kid.firstName}! Every block complete. +
          {SCHEDULE_TOTAL_XP} XP earned today!
        </div>
      )}
    </div>
  );
}
