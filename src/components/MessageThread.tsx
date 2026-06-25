import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { messagesForKid } from "../store/selectors";
import type { KidId, MessageFrom } from "../types";

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A chat thread between one kid and the grown-ups. `viewer` aligns bubbles. */
export function MessageThread({
  kidId,
  viewer,
}: {
  kidId: KidId;
  viewer: MessageFrom;
}) {
  const { state, dispatch } = useApp();
  const [text, setText] = useState("");
  const msgs = messagesForKid(state, kidId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Opening the thread (or a new message arriving) clears unread for this side.
  useEffect(() => {
    dispatch({ type: "MARK_MESSAGES_READ", kidId, reader: viewer });
  }, [kidId, viewer, msgs.length, dispatch]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    dispatch({ type: "SEND_MESSAGE", kidId, from: viewer, text: t });
    setText("");
  };

  return (
    <div className="thread">
      <div className="thread__scroll" ref={scrollRef}>
        {msgs.length === 0 ? (
          <p className="thread__empty">No messages yet — say hi! 👋</p>
        ) : (
          msgs.map((m) => (
            <div
              key={m.id}
              className={`bubble ${m.from === viewer ? "is-mine" : "is-theirs"}`}
            >
              <span className="bubble__text">{m.text}</span>
              <span className="bubble__time">{fmtTime(m.at)}</span>
            </div>
          ))
        )}
      </div>
      <form className="thread__compose" onSubmit={send}>
        <input
          className="thread__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={viewer === "kid" ? "Message a grown-up…" : "Reply…"}
          maxLength={500}
          aria-label="Message"
        />
        <button
          className="btn btn--primary"
          type="submit"
          disabled={!text.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
