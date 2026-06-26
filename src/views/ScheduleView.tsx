import { useApp } from "../store/AppContext";
import { effectiveSchedule, getDay, getKid } from "../store/selectors";
import { useClock } from "../hooks/useClock";
import { ScheduleTimeline } from "../components/ScheduleTimeline";
import type { TabId } from "../App";

export function ScheduleView({ onTab }: { onTab: (t: TabId) => void }) {
  const { state } = useApp();
  const now = useClock();
  const kid = getKid(state, state.activeKid);
  const blocks = effectiveSchedule(state, kid.id);
  const today = getDay(state, kid.id);
  const doneCount = today.scheduleDone.length;
  const pct = blocks.length
    ? Math.round((doneCount / blocks.length) * 100)
    : 0;

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
            {doneCount}/{blocks.length} done so far today
          </span>
        </div>
      </div>

      <ScheduleTimeline onTab={onTab} />

      {blocks.length > 0 && doneCount === blocks.length && (
        <div className="celebrate">
          🎉 Full day complete, {kid.firstName}! You followed the whole schedule.
        </div>
      )}
    </div>
  );
}
