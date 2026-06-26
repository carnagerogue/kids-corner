import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { activeAnnouncements } from "../store/selectors";
import { playChime } from "../chime";

function notify(body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification("📣 Announcement", { body, tag: "kids-corner-announce" });
  } catch {
    /* ignore */
  }
}

/**
 * Chimes and shows a toast when a new grown-up announcement arrives (synced in
 * from another device, or just sent). Never fires for announcements already
 * present when it mounted.
 */
export function AnnouncementNotifier() {
  const { state } = useApp();
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const list = activeAnnouncements(state); // newest first
  const key = list.map((a) => a.id).join(",");

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(list.map((a) => a.id));
      return;
    }
    const fresh = list.filter((a) => !seen.current!.has(a.id));
    if (!fresh.length) return;
    fresh.forEach((a) => seen.current!.add(a.id));
    playChime();
    notify(fresh[0].text);
    setToast(fresh[0].text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="toast toast--ann" role="status" aria-live="polite">
      <span className="toast__emoji">📣</span>
      <div className="toast__body">
        <strong className="toast__title">Announcement</strong>
        <span className="toast__time">{toast}</span>
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
