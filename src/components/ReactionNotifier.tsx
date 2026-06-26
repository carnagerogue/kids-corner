import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid } from "../store/selectors";
import { playChime } from "../chime";
import type { KidId } from "../types";

/**
 * Chimes + toasts when another kid reacts to one of `user`'s finished-task
 * photos ("Coby reacted 🔥 to your Blanket Fort!"). Only fires for reactions
 * that arrive after mount.
 */
export function ReactionNotifier({ user }: { user: KidId }) {
  const { state } = useApp();
  const seen = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const mine = new Set(
    state.submissions.filter((s) => s.kidId === user).map((s) => s.id),
  );
  const relevant = state.reactions.filter(
    (r) => !r.deleted && r.by !== user && mine.has(r.submissionId),
  );
  const key = relevant.map((r) => r.id).join(",");

  useEffect(() => {
    if (seen.current === null) {
      seen.current = new Set(relevant.map((r) => r.id));
      return;
    }
    const fresh = relevant.filter((r) => !seen.current!.has(r.id));
    if (!fresh.length) return;
    fresh.forEach((r) => seen.current!.add(r.id));
    const r = fresh[fresh.length - 1];
    const who = getKid(state, r.by).firstName;
    const sub = state.submissions.find((s) => s.id === r.submissionId);
    const task = sub?.title ?? "your photo";
    playChime();
    setToast(`${who} reacted ${r.emoji} to your ${task}!`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="toast toast--react" role="status" aria-live="polite">
      <span className="toast__emoji">💖</span>
      <div className="toast__body">
        <strong className="toast__title">{toast}</strong>
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
