import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid, kidList, unreadFor } from "../store/selectors";
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
          return (
            <button
              key={id}
              className={`convopick__btn ${sel === id ? "is-active" : ""}`}
              onClick={() => setSel(id)}
            >
              {label(id)}
              {unread > 0 && <span className="convopick__pip">{unread}</span>}
            </button>
          );
        })}
      </div>

      <MessageThread me={me} other={sel} />
    </div>
  );
}
