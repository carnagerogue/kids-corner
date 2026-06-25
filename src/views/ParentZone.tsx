import { useState } from "react";
import { useApp } from "../store/AppContext";
import { KIDS, KID_LIST } from "../data/kids";
import { CHORES, ACTIVITY_BY_ID } from "../data/activities";
import {
  choreAssignmentsFor,
  pendingSubmissions,
  taskStatus,
} from "../store/selectors";
import type { KidId, Submission } from "../types";

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

      <ChoreAssigner />

      <ParentSettings />

      {zoom && (
        <div className="modal" onClick={() => setZoom("")}>
          <img className="zoom" src={zoom} alt="Proof enlarged" />
        </div>
      )}
    </div>
  );
}

function ChoreAssigner() {
  const { state, dispatch } = useApp();
  const [kidId, setKidId] = useState<KidId>(KID_LIST[0].id);
  const [refId, setRefId] = useState<string>(CHORES[0]?.id ?? "");

  const assign = (e: React.FormEvent) => {
    e.preventDefault();
    if (refId) dispatch({ type: "ASSIGN_CHORE", kidId, refId });
  };

  // Everyone's chores for today, in kid order.
  const todays = KID_LIST.flatMap((k) =>
    choreAssignmentsFor(state, k.id).map((c) => ({ c, kid: k })),
  );

  const statusLabel: Record<string, string> = {
    approved: "✓ Done",
    pending: "⏳ Waiting",
    rejected: "↩︎ Sent back",
    none: "• To do",
  };

  return (
    <>
      <h3 className="section-title">🧹 Assign Chores</h3>
      <div className="settings">
        <form className="settings__row chore-assign" onSubmit={assign}>
          <select
            className="settings__input"
            value={kidId}
            onChange={(e) => setKidId(e.target.value as KidId)}
            aria-label="Choose a kid"
          >
            {KID_LIST.map((k) => (
              <option key={k.id} value={k.id}>
                {k.emoji} {k.firstName}
              </option>
            ))}
          </select>
          <select
            className="settings__input"
            value={refId}
            onChange={(e) => setRefId(e.target.value)}
            aria-label="Choose a chore"
          >
            {CHORES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} (+{a.xp} XP)
              </option>
            ))}
          </select>
          <button className="btn btn--primary" type="submit">
            + Assign
          </button>
        </form>

        {todays.length === 0 ? (
          <p className="settings__hint">
            No chores assigned for today. Pick a kid and a chore above — it'll
            appear in their Command Center to finish with photo proof.
          </p>
        ) : (
          <ul className="chore-list">
            {todays.map(({ c, kid }) => {
              const activity = ACTIVITY_BY_ID[c.refId];
              const status = taskStatus(state, kid.id, c.refId).status;
              return (
                <li key={c.id} className="chore-list__row">
                  <span className="chore-list__kid">
                    {kid.emoji} {kid.firstName}
                  </span>
                  <span className="chore-list__title">
                    🧹 {activity?.title ?? c.refId}
                  </span>
                  <span className={`chore-list__status is-${status}`}>
                    {statusLabel[status] ?? status}
                  </span>
                  <button
                    className="btn btn--reject btn--sm"
                    onClick={() =>
                      dispatch({ type: "UNASSIGN_CHORE", assignmentId: c.id })
                    }
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
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
      <h3 className="section-title">🔑 Kid Login PINs</h3>
      <div className="settings">
        {KID_LIST.map((k) => (
          <KidPinRow key={k.id} kidId={k.id} />
        ))}
        <p className="settings__hint">
          Each kid enters their PIN to log in. Give each child a PIN only they
          know so they can't log in as a sibling.
        </p>
      </div>

      <h3 className="section-title">⚙️ Settings</h3>
      <div className="settings">
        <form className="settings__row" onSubmit={savePin}>
          <label className="settings__label">
            Change grown-up PIN
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
          Current grown-up PIN is <code>{state.parentPin}</code>. This is a light
          gate to keep kids out — not real security.
        </p>
      </div>
    </>
  );
}

function KidPinRow({ kidId }: { kidId: KidId }) {
  const { state, dispatch } = useApp();
  const kid = KIDS[kidId];
  const [pin, setPin] = useState(state.kidPins[kidId]);
  const dirty = pin !== state.kidPins[kidId];

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length < 3) return;
    dispatch({ type: "SET_KID_PIN", kidId, pin: pin.trim() });
  };

  return (
    <form className="settings__row" onSubmit={save}>
      <label className="settings__label">
        {kid.emoji} {kid.firstName}'s PIN
        <input
          className="settings__input"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="PIN (min 3 digits)"
        />
      </label>
      <button className="btn btn--ghost" type="submit" disabled={!dirty}>
        {dirty ? "Save" : "✓ Saved"}
      </button>
    </form>
  );
}
