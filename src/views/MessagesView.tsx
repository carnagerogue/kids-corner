import { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  canMessageParticipant,
  friendStateFor,
  getKid,
  kidList,
  unreadFor,
} from "../store/selectors";
import { MessageThread } from "../components/MessageThread";
import type { ParticipantId } from "../types";

/** The kid's messages: pick the grown-ups or a sibling, then chat. */
export function MessagesView() {
  const { state } = useApp();
  const me = state.activeKid;
  const others: ParticipantId[] = [
    "parent",
    ...kidList(state)
      .filter((k) => k.id !== me)
      .map((k) => k.id),
  ];
  const [selRaw, setSel] = useState<ParticipantId>("parent");
  const sel = others.includes(selRaw) ? selRaw : "parent";

  const label = (id: ParticipantId) =>
    id === "parent"
      ? "🧑‍🍼 Grown-ups"
      : `${getKid(state, id).emoji} ${getKid(state, id).firstName}`;

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">💬 Messages</h2>
          <p className="view__sub">
            Chat with a grown-up or a brother or sister.
          </p>
        </div>
      </div>

      <div className="convopick">
        {others.map((id) => {
          const unread = unreadFor(state, me, id);
          const canMessage = canMessageParticipant(state, me, id);
          const friendState = id === "parent" ? "friends" : friendStateFor(state, me, id);
          return (
            <button
              key={id}
              className={`convopick__btn ${sel === id ? "is-active" : ""} ${
                !canMessage ? "is-locked" : ""
              }`}
              onClick={() => setSel(id)}
              title={
                canMessage
                  ? "Open chat"
                  : "You need to be friends before you can message."
              }
            >
              {label(id)}
              {!canMessage && (
                <span className="convopick__lock">
                  {friendState === "request-sent"
                    ? "pending"
                    : friendState === "request-received"
                      ? "accept first"
                      : "locked"}
                </span>
              )}
              {unread > 0 && <span className="convopick__pip">{unread}</span>}
            </button>
          );
        })}
      </div>

      {canMessageParticipant(state, me, sel) ? (
        <MessageThread me={me} other={sel} />
      ) : (
        <div className="thread thread--locked">
          <p className="thread__empty">
            You need to be friends before you can message. Visit the Family Wall
            to send or answer a friend request.
          </p>
        </div>
      )}
    </div>
  );
}
