import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { SCHEDULE } from "../data/schedule";
import { getDay } from "../store/selectors";
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
  const kid = KIDS[state.activeKid];
  const today = getDay(state, kid.id);
  const doneSet = new Set(today.scheduleDone);

  const current = SCHEDULE.find(
    (b) => nowMin >= b.startMinutes && nowMin < b.endMinutes,
  );
  const next = SCHEDULE.find((b) => b.startMinutes > nowMin);

  return (
    <ul className="timeline">
      {SCHEDULE.map((block) => {
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
