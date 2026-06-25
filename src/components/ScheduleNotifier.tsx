import { useEffect, useRef, useState } from "react";
import { SCHEDULE } from "../data/schedule";
import { useClock, minutesSinceMidnight } from "../hooks/useClock";
import type { ScheduleBlock } from "../types";

function fireSystemNotification(block: ScheduleBlock) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(`🗓️ Time for ${block.title}`, {
      body: `${block.time}${block.note ? " · " + block.note : ""}`,
      tag: "kids-corner-schedule", // a new block replaces the previous one
    });
  } catch {
    /* some browsers throw if constructed directly — ignore */
  }
}

/**
 * Watches the clock and, when a new schedule block begins, raises a system
 * notification (if the kid turned reminders on) and an in-app toast. Mounted
 * while logged in so it fires no matter which in-app tab is open. Never notifies
 * for the block already in progress at load — only live transitions.
 */
export function ScheduleNotifier() {
  const now = useClock(20_000);
  const nowMin = minutesSinceMidnight(now);
  const current =
    SCHEDULE.find((b) => nowMin >= b.startMinutes && nowMin < b.endMinutes) ??
    null;

  const lastId = useRef<string | null>(current?.id ?? null);
  const [toast, setToast] = useState<ScheduleBlock | null>(null);

  useEffect(() => {
    if (current?.id === lastId.current) return;
    lastId.current = current?.id ?? null;
    if (current) {
      fireSystemNotification(current);
      setToast(current);
    }
  }, [current?.id]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <span className="toast__emoji">{toast.emoji}</span>
      <div className="toast__body">
        <strong className="toast__title">Time for {toast.title}!</strong>
        <span className="toast__time">{toast.time}</span>
      </div>
      <button
        className="toast__close"
        aria-label="Dismiss"
        onClick={() => setToast(null)}
      >
        ✕
      </button>
    </div>
  );
}

/** Button that asks the browser for notification permission (needs a click). */
export function ReminderToggle() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(() =>
    "Notification" in window ? Notification.permission : "unsupported",
  );
  if (perm === "unsupported") return null;

  const request = async () => {
    if (perm !== "default") return;
    try {
      setPerm(await Notification.requestPermission());
    } catch {
      /* ignore */
    }
  };

  const label =
    perm === "granted"
      ? "🔔 Reminders on"
      : perm === "denied"
        ? "🔕 Reminders blocked"
        : "🔔 Turn on reminders";

  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={request}
      disabled={perm !== "default"}
      title={
        perm === "denied"
          ? "Reminders are blocked — re-enable notifications in your browser settings."
          : "Get a pop-up when it's time for the next thing on the schedule."
      }
    >
      {label}
    </button>
  );
}
