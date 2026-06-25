import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { SCHEDULE } from "../data/schedule";
import { getDay } from "../store/selectors";
import { useClock, minutesSinceMidnight } from "../hooks/useClock";
import type { TabId } from "../App";

/**
 * The day's schedule as a check-off timeline, highlighting whatever block is
 * happening now. Shared by the Schedule tab and the Command Center dashboard.
 */
export function ScheduleTimeline({ onTab }: { onTab: (t: TabId) => void }) {
  const { state, dispatch } = useApp();
  const now = useClock();
  const nowMin = minutesSinceMidnight(now);
  const kid = KIDS[state.activeKid];
  const today = getDay(state, kid.id);
  const doneSet = new Set(today.scheduleDone);

  return (
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
  );
}
