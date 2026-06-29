import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import {
  canMessageParticipant,
  getKid,
  messagesBetween,
} from "../store/selectors";
import { CameraCapture } from "./CameraCapture";
import type { ParticipantId } from "../types";

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A direct-message thread between `me` and `other`, with photo attachments. */
export function MessageThread({
  me,
  other,
  readOnly,
}: {
  me: ParticipantId;
  other: ParticipantId;
  readOnly?: boolean;
}) {
  const { state, dispatch } = useApp();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const msgs = messagesBetween(state, me, other);
  const canSend = readOnly || canMessageParticipant(state, me, other);
  const scrollRef = useRef<HTMLDivElement>(null);

  const emojiOf = (id: ParticipantId) =>
    id === "parent" ? "🧑‍🍼" : getKid(state, id).emoji;

  // Opening the thread (or a new message arriving) clears unread for me.
  useEffect(() => {
    if (!readOnly) dispatch({ type: "MARK_MESSAGES_READ", me, other });
  }, [me, other, msgs.length, readOnly, dispatch]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if ((!t && !photo) || !canSend) return;
    dispatch({
      type: "SEND_MESSAGE",
      from: me,
      to: other,
      text: t,
      photo: photo ?? undefined,
    });
    setText("");
    setPhoto(null);
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
              className={`bubble ${m.from === me ? "is-mine" : "is-theirs"}`}
            >
              {readOnly && (
                <span className="bubble__from">{emojiOf(m.from)}</span>
              )}
              {m.photo && (
                <img className="bubble__photo" src={m.photo} alt="attachment" />
              )}
              {m.text && <span className="bubble__text">{m.text}</span>}
              <span className="bubble__time">{fmtTime(m.at)}</span>
              {!readOnly && m.from === me && (
                <button
                  className="bubble__del"
                  aria-label="Delete this message"
                  title="Delete message"
                  onClick={() => {
                    if (window.confirm("Delete this message for everyone?")) {
                      dispatch({ type: "DELETE_MESSAGE", id: m.id, by: me });
                    }
                  }}
                >
                  🗑
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {!readOnly && canSend && (
        <form className="thread__compose" onSubmit={send}>
          {photo && (
            <div className="thread__attach">
              <img src={photo} alt="attachment preview" />
              <button
                type="button"
                className="thread__attach-x"
                onClick={() => setPhoto(null)}
                aria-label="Remove photo"
              >
                ✕
              </button>
            </div>
          )}
          <div className="thread__composerow">
            <button
              type="button"
              className="thread__photo"
              onClick={() => setCamera(true)}
              aria-label="Attach a photo"
              title="Attach a photo"
            >
              📷
            </button>
            <input
              className="thread__input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              maxLength={500}
              aria-label="Message"
            />
            <button
              className="btn btn--primary"
              type="submit"
              disabled={!text.trim() && !photo}
            >
              Send
            </button>
          </div>
        </form>
      )}

      {!readOnly && !canSend && (
        <div className="thread__compose thread__compose--locked">
          You need to be friends before you can message.
        </div>
      )}

      {camera && (
        <CameraCapture
          title="Add a photo"
          subtitle="Snap or upload a photo to send."
          kidEmoji={emojiOf(me)}
          onCancel={() => setCamera(false)}
          onSubmit={(p) => {
            setPhoto(p);
            setCamera(false);
          }}
        />
      )}
    </div>
  );
}
