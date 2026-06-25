import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid } from "../store/selectors";
import { playChime } from "../chime";
import type { ParticipantId } from "../types";

function notify(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, { body, tag: "kids-corner-message" });
  } catch {
    /* ignore */
  }
}

/**
 * Chimes, raises a system notification, and shows an in-app toast when a new
 * message arrives for `viewer` (a kid id, or "parent") — even if this tab is in
 * the background. Never fires for messages already present when it mounted.
 */
export function MessageNotifier({ viewer }: { viewer: ParticipantId }) {
  const { state } = useApp();
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<{ who: string; text: string } | null>(
    null,
  );

  const incoming = state.messages.filter((m) => m.to === viewer);
  const incomingKey = incoming.map((m) => m.id).join(",");

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(incoming.map((m) => m.id));
      return;
    }
    const fresh = incoming.filter((m) => !seen.current!.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => seen.current!.add(m.id));
    const last = fresh[fresh.length - 1];
    const who =
      last.from === "parent" ? "A grown-up" : getKid(state, last.from).firstName;
    const text = last.text || "📷 Photo";
    playChime();
    notify(`💬 ${who}`, text);
    setToast({ who, text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingKey, viewer]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 12_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="toast toast--msg" role="status" aria-live="polite">
      <span className="toast__emoji">💬</span>
      <div className="toast__body">
        <strong className="toast__title">{toast.who} messaged you</strong>
        <span className="toast__time">{toast.text}</span>
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
