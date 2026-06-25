import { useState } from "react";
import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { pendingSubmissions } from "../store/selectors";
import type { Submission } from "../types";

export function ParentZone({ onExit }: { onExit: () => void }) {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} onExit={onExit} />;
  }
  return <ParentDashboard onLock={() => setUnlocked(false)} />;
}

function PinGate({
  onUnlock,
  onExit,
}: {
  onUnlock: () => void;
  onExit: () => void;
}) {
  const { state } = useApp();
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entry === state.parentPin) {
      onUnlock();
    } else {
      setError(true);
      setEntry("");
    }
  };

  return (
    <div className="view">
      <div className="pin">
        <span className="pin__lock">🔒</span>
        <h2 className="pin__title">Grown-Ups Only</h2>
        <p className="pin__sub">Enter the PIN to review and approve work.</p>
        <form className="pin__form" onSubmit={submit}>
          <input
            className={`pin__input ${error ? "is-error" : ""}`}
            type="password"
            inputMode="numeric"
            autoFocus
            value={entry}
            onChange={(e) => {
              setEntry(e.target.value);
              setError(false);
            }}
            placeholder="••••"
            aria-label="Parent PIN"
          />
          <button className="btn btn--primary btn--big" type="submit">
            Unlock
          </button>
        </form>
        {error && <p className="pin__error">That PIN didn't match. Try again.</p>}
        <button className="link-btn" onClick={onExit}>
          ← Back to Kids Corner
        </button>
      </div>
    </div>
  );
}

function ParentDashboard({ onLock }: { onLock: () => void }) {
  const { state, dispatch } = useApp();
  const pending = pendingSubmissions(state);
  const [zoom, setZoom] = useState<string>("");

  const reviewedToday = state.submissions
    .filter((s) => s.status !== "pending" && s.reviewedAt)
    .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0))
    .slice(0, 8);

  const approve = (s: Submission) =>
    dispatch({ type: "REVIEW_SUBMISSION", submissionId: s.id, decision: "approved" });

  const reject = (s: Submission) => {
    const note = window.prompt(
      "Send back to " + KIDS[s.kidId].firstName + "? Optional note:",
      "",
    );
    if (note === null) return; // cancelled
    dispatch({
      type: "REVIEW_SUBMISSION",
      submissionId: s.id,
      decision: "rejected",
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🧑‍🍼 Grown-Ups Dashboard</h2>
          <p className="view__sub">
            {pending.length} item{pending.length === 1 ? "" : "s"} waiting for review
          </p>
        </div>
        <button className="btn btn--ghost" onClick={onLock}>
          🔒 Lock
        </button>
      </div>

      <h3 className="section-title">📥 Waiting for Approval</h3>
      {pending.length === 0 ? (
        <p className="empty">All caught up — nothing to review right now. 🎉</p>
      ) : (
        <div className="review">
          {pending.map((s) => {
            const kid = KIDS[s.kidId];
            return (
              <div
                key={s.id}
                className="reviewcard"
                style={{ ["--this-kid" as string]: kid.color }}
              >
                {s.photo ? (
                  <button
                    className="reviewcard__photo"
                    onClick={() => setZoom(s.photo)}
                    aria-label="Enlarge photo"
                  >
                    <img src={s.photo} alt="Proof" />
                  </button>
                ) : (
                  <div className="reviewcard__photo reviewcard__photo--none">
                    📷
                  </div>
                )}
                <div className="reviewcard__body">
                  <span className="reviewcard__kid">
                    {kid.emoji} {kid.firstName}
                  </span>
                  <span className={`reviewcard__kind reviewcard__kind--${s.kind}`}>
                    {s.kind === "mission" ? "🎯 Mission" : "📚 Assignment"} · +{s.xp} XP
                  </span>
                  <strong className="reviewcard__title">
                    {s.emoji} {s.title}
                  </strong>
                  <span className="reviewcard__time">
                    Submitted{" "}
                    {new Date(s.submittedAt).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="reviewcard__actions">
                  <button className="btn btn--approve" onClick={() => approve(s)}>
                    ✓ Approve
                  </button>
                  <button className="btn btn--reject" onClick={() => reject(s)}>
                    ↩︎ Send back
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewedToday.length > 0 && (
        <>
          <h3 className="section-title">🕘 Recently Reviewed</h3>
          <div className="reviewed">
            {reviewedToday.map((s) => {
              const kid = KIDS[s.kidId];
              return (
                <div key={s.id} className="reviewedrow">
                  <span>
                    {kid.emoji} {kid.firstName}
                  </span>
                  <span className="reviewedrow__title">
                    {s.emoji} {s.title}
                  </span>
                  <span
                    className={`reviewedrow__status reviewedrow__status--${s.status}`}
                  >
                    {s.status === "approved" ? "✓ Approved" : "↩︎ Sent back"}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <ParentSettings />

      {zoom && (
        <div className="modal" onClick={() => setZoom("")}>
          <img className="zoom" src={zoom} alt="Proof enlarged" />
        </div>
      )}
    </div>
  );
}

function ParentSettings() {
  const { state, dispatch } = useApp();
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);

  const savePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length < 3) return;
    dispatch({ type: "SET_PARENT_PIN", pin: pin.trim() });
    setPin("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    if (
      window.confirm(
        "Reset ALL progress for every kid? XP, badges, history, and submissions will be cleared. This can't be undone.",
      )
    ) {
      dispatch({ type: "RESET_ALL" });
    }
  };

  return (
    <>
      <h3 className="section-title">⚙️ Settings</h3>
      <div className="settings">
        <form className="settings__row" onSubmit={savePin}>
          <label className="settings__label">
            Change PIN
            <input
              className="settings__input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="New PIN (min 3 digits)"
            />
          </label>
          <button className="btn btn--ghost" type="submit">
            {saved ? "✓ Saved" : "Save PIN"}
          </button>
        </form>
        <div className="settings__row">
          <span className="settings__label">Start the summer over</span>
          <button className="btn btn--danger" onClick={reset}>
            Reset all progress
          </button>
        </div>
        <p className="settings__hint">
          Current default PIN is <code>{state.parentPin}</code>. This is a light
          gate to keep kids out — not real security.
        </p>
      </div>
    </>
  );
}
