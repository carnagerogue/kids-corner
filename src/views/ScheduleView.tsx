import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { SCHEDULE, SCHEDULE_TOTAL_XP } from "../data/schedule";
import { getDay } from "../store/selectors";
import { useClock } from "../hooks/useClock";
import { ScheduleTimeline } from "../components/ScheduleTimeline";
import type { TabId } from "../App";

export function ScheduleView({ onTab }: { onTab: (t: TabId) => void }) {
  const { state } = useApp();
  const now = useClock();
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

      <ScheduleTimeline onTab={onTab} />

      {doneCount === SCHEDULE.length && (
        <div className="celebrate">
          🎉 Perfect day, {kid.firstName}! Every block complete. +
          {SCHEDULE_TOTAL_XP} XP earned today!
        </div>
      )}
    </div>
  );
}
