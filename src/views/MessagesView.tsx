import { useApp } from "../store/AppContext";
import { getKid } from "../store/selectors";
import { MessageThread } from "../components/MessageThread";

/** The kid-facing messages page: a single thread with the grown-ups. */
export function MessagesView() {
  const { state } = useApp();
  const kid = getKid(state, state.activeKid);
  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">💬 Messages</h2>
          <p className="view__sub">
            Send a note to a grown-up, {kid.emoji} {kid.firstName}.
          </p>
        </div>
      </div>
      <MessageThread kidId={kid.id} viewer="kid" />
    </div>
  );
}
