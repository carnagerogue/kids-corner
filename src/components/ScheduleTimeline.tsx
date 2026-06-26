import { useApp } from "../store/AppContext";
import { effectiveSchedule, getDay, getKid } from "../store/selectors";
import { useClock, minutesSinceMidnight } from "../hooks/useClock";
import type { TabId } from "../App";

/**
 * The day's schedule as an auto-tracking timeline: blocks mark themselves done
 * as their time passes (see ScheduleNotifier), the current block shows NOW, and
 * the next one is flagged "Up next". Status only — no manual check-offs.
 * Shared by the Schedule tab and the Command Center dashboard.
 */
export function ScheduleTimeline({ onTab }: { onTab: (t: TabId) => void }) {
  const { state } = useApp();
  const now = useClock();
  const nowMin = minutesSinceMidnight(now);
  const kid = getKid(state, state.activeKid);
  const blocks = effectiveSchedule(state, kid.id);
  const today = getDay(state, kid.id);
  const doneSet = new Set(today.scheduleDone);

  const current = blocks.find(
    (b) => nowMin >= b.startMinutes && nowMin < b.endMinutes,
  );
  const next = blocks.find((b) => b.startMinutes > nowMin);

  if (blocks.length === 0) {
    return (
      <p className="empty">No schedule set for today. A grown-up can add one. 🗓️</p>
    );
  }

  return (
    <ul className="timeline">
      {blocks.map((block) => {
        const done = doneSet.has(block.id);
        const isNow = current?.id === block.id;
        const isNext = next?.id === block.id;
        return (
          <li
            key={block.id}
            className={`tblock ${done ? "is-done" : ""} ${
              isNow ? "is-now" : ""
            } ${isNext ? "is-next" : ""}`}
            style={{ ["--accent" as string]: block.accent }}
          >
            <div className="tblock__rail">
              <span className="tblock__dot">{block.emoji}</span>
            </div>
            <div className="tblock__body">
              <div className="tblock__top">
                <strong className="tblock__title">{block.title}</strong>
                {isNow && <span className="tblock__live">● NOW</span>}
                {isNext && <span className="tblock__next">▶ Up next</span>}
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
            <span
              className={`tcheck ${done ? "is-done" : isNow ? "is-now" : ""}`}
              aria-hidden="true"
            >
              {done ? "✓" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
