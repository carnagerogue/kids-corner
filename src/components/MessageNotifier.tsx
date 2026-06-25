import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { playChime } from "../chime";
import type { KidId, MessageFrom } from "../types";

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
 * incoming message arrives for the current viewer. Works even when the tab is
 * in the background (new messages reach this tab via cross-tab sync). Never
 * fires for messages that were already present when it mounted.
 */
export function MessageNotifier({
  viewer,
  kidId,
}: {
  viewer: MessageFrom;
  kidId?: KidId;
}) {
  const { state } = useApp();
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<{ who: string; text: string } | null>(
    null,
  );

  // Messages addressed to this viewer (sent by the other party).
  const incoming = state.messages.filter((m) =>
    viewer === "kid" ? m.kidId === kidId && m.from === "parent" : m.from === "kid",
  );
  const incomingKey = incoming.map((m) => m.id).join(",");

  useEffect(() => {
    if (seen.current === null) {
      // First render — remember what's already here, don't notify for history.
      seen.current = new Set(incoming.map((m) => m.id));
      return;
    }
    const fresh = incoming.filter((m) => !seen.current!.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => seen.current!.add(m.id));
    const last = fresh[fresh.length - 1];
    const who = viewer === "kid" ? "A grown-up" : KIDS[last.kidId].firstName;
    playChime();
    notify(`💬 ${who}`, last.text);
    setToast({ who, text: last.text });
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
