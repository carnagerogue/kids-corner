import { useClock } from "../hooks/useClock";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * A compact current-month calendar with the weekday headers and today
 * highlighted, plus the full day + date in words. Read-only (no month nav).
 */
export function MiniCalendar() {
  const now = useClock(60_000);
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
  const dateLine = now.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="cal">
      <div className="cal__today">
        <span className="cal__weekday">{weekday}</span>
        <span className="cal__date">{dateLine}</span>
      </div>
      <div className="cal__grid cal__grid--head">
        {WEEKDAYS.map((w) => (
          <span key={w} className="cal__wd">
            {w}
          </span>
        ))}
      </div>
      <div className="cal__grid">
        {cells.map((d, i) => (
          <span
            key={i}
            className={`cal__day ${d === today ? "is-today" : ""} ${
              d === null ? "is-empty" : ""
            }`}
          >
            {d ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
