import { useState } from "react";
import { useApp } from "../store/AppContext";
import { KID_EMOJIS, KID_PALETTE } from "../data/kids";
import { CHORES, ACTIVITY_BY_ID } from "../data/activities";
import { APP_CATALOG } from "../data/applications";
import { RESOURCES, RESOURCE_CATEGORIES } from "../data/resources";
import {
  choreAssignmentsFor,
  getKid,
  kidList,
  parentUnreadCount,
  pendingSubmissions,
  taskStatus,
} from "../store/selectors";
import { MessageThread } from "../components/MessageThread";
import { MessageNotifier } from "../components/MessageNotifier";
import { FIREBASE_READY } from "../firebase";
import { readSyncCode, writeSyncCode } from "../sync";
import type { Kid, KidId, Submission } from "../types";

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
      "Send back to " + getKid(state, s.kidId).firstName + "? Optional note:",
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
      <MessageNotifier viewer="parent" />
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
            const kid = getKid(state, s.kidId);
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
              const kid = getKid(state, s.kidId);
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

      <ParentKids />

      <ParentApps />

      <ParentExplore />

      <ParentMessages />

      <CloudSync />

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

function ParentKids() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(KID_EMOJIS[0]);
  const [palette, setPalette] = useState(3);
  const [pin, setPin] = useState("");

  const canAdd = name.trim().length > 0 && pin.trim().length >= 3;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    dispatch({
      type: "ADD_KID",
      firstName: name.trim(),
      emoji,
      paletteIndex: palette,
      pin: pin.trim(),
    });
    setName("");
    setPin("");
    setEmoji(KID_EMOJIS[0]);
    setPalette((p) => (p + 1) % KID_PALETTE.length);
  };

  const remove = (kid: Kid) => {
    if (kids.length <= 1) return;
    if (
      window.confirm(
        `Remove ${kid.firstName}? Their progress, messages, and settings will be deleted. This can't be undone.`,
      )
    ) {
      dispatch({ type: "REMOVE_KID", kidId: kid.id });
    }
  };

  return (
    <>
      <h3 className="section-title">👧 Kids</h3>
      <div className="settings">
        <ul className="kidmanage">
          {kids.map((k) => (
            <li
              key={k.id}
              className="kidmanage__row"
              style={{ ["--this-kid" as string]: k.color }}
            >
              <span className="kidmanage__face">{k.emoji}</span>
              <span className="kidmanage__name">{k.firstName}</span>
              <button
                className="btn btn--reject btn--sm"
                disabled={kids.length <= 1}
                onClick={() => remove(k)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <form className="addkid" onSubmit={add}>
          <strong className="addkid__title">➕ Add a child</strong>
          <input
            className="settings__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            maxLength={24}
            aria-label="New child's name"
          />
          <div className="addkid__pick" aria-label="Pick an avatar">
            {KID_EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                className={`avatarpick ${emoji === em ? "is-active" : ""}`}
                onClick={() => setEmoji(em)}
              >
                {em}
              </button>
            ))}
          </div>
          <div className="addkid__pick" aria-label="Pick a color">
            {KID_PALETTE.map((p, i) => (
              <button
                type="button"
                key={i}
                className={`colorpick ${palette === i ? "is-active" : ""}`}
                style={{ background: p.color }}
                onClick={() => setPalette(i)}
                aria-label={`Color ${i + 1}`}
              />
            ))}
          </div>
          <div className="addkid__row">
            <input
              className="settings__input"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Login PIN (min 3 digits)"
              aria-label="New child's PIN"
            />
            <button className="btn btn--primary" type="submit" disabled={!canAdd}>
              Add child
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ParentApps() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const [selRaw, setSel] = useState<KidId>(() => kids[0]?.id ?? "");
  const sel = kids.some((k) => k.id === selRaw) ? selRaw : kids[0]?.id ?? "";
  const selKid = getKid(state, sel);
  const vis = state.appVisibility[sel] ?? [];

  return (
    <>
      <h3 className="section-title">🧭 Apps Each Kid Can See</h3>
      <div className="settings">
        <div className="msgtabs">
          {kids.map((k) => (
            <button
              key={k.id}
              className={`msgtab ${sel === k.id ? "is-active" : ""}`}
              style={{ ["--this-kid" as string]: k.color }}
              onClick={() => setSel(k.id)}
            >
              {k.emoji} {k.firstName}
            </button>
          ))}
        </div>
        <ul className="apptoggles">
          {APP_CATALOG.map((a) => {
            const on = vis.includes(a.id);
            return (
              <li key={a.id} className="apptoggle">
                <span className="apptoggle__icon">{a.emoji}</span>
                <span className="apptoggle__name">
                  {a.name}
                  {a.primary && <span className="apptoggle__badge">main</span>}
                </span>
                <button
                  className={`switch ${on ? "is-on" : ""}`}
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? "Hide" : "Show"} ${a.name} for ${selKid.firstName}`}
                  onClick={() =>
                    dispatch({
                      type: "SET_APP_VISIBILITY",
                      kidId: sel,
                      appId: a.id,
                      visible: !on,
                    })
                  }
                >
                  <span className="switch__dot" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="settings__hint">
          Controls what {selKid.firstName} sees on their Applications page.
        </p>
      </div>
    </>
  );
}

function ParentExplore() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const [selRaw, setSel] = useState<KidId>(() => kids[0]?.id ?? "");
  const sel = kids.some((k) => k.id === selRaw) ? selRaw : kids[0]?.id ?? "";
  const selKid = getKid(state, sel);
  const hidden = state.exploreHidden[sel] ?? [];

  const setAll = (visible: boolean) => {
    for (const r of RESOURCES) {
      dispatch({
        type: "SET_EXPLORE_VISIBILITY",
        kidId: sel,
        resourceId: r.id,
        visible,
      });
    }
  };

  return (
    <>
      <h3 className="section-title">🌟 Explore Sites Each Kid Can See</h3>
      <div className="settings">
        <div className="msgtabs">
          {kids.map((k) => (
            <button
              key={k.id}
              className={`msgtab ${sel === k.id ? "is-active" : ""}`}
              style={{ ["--this-kid" as string]: k.color }}
              onClick={() => setSel(k.id)}
            >
              {k.emoji} {k.firstName}
            </button>
          ))}
        </div>
        <div className="explore-bulk">
          <button className="btn btn--ghost btn--sm" onClick={() => setAll(true)}>
            Turn all on
          </button>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setAll(false)}
          >
            Turn all off
          </button>
        </div>
        {RESOURCE_CATEGORIES.map((c) => {
          const items = RESOURCES.filter((r) => r.category === c.id);
          if (!items.length) return null;
          return (
            <div key={c.id} className="explore-group">
              <span
                className="explore-group__label"
                style={{ ["--cat" as string]: c.color }}
              >
                {c.emoji} {c.label}
              </span>
              <ul className="apptoggles">
                {items.map((r) => {
                  const on = !hidden.includes(r.id);
                  return (
                    <li key={r.id} className="apptoggle">
                      <span className="apptoggle__icon">{r.emoji}</span>
                      <span className="apptoggle__name">{r.name}</span>
                      <button
                        className={`switch ${on ? "is-on" : ""}`}
                        role="switch"
                        aria-checked={on}
                        aria-label={`${on ? "Hide" : "Show"} ${r.name} for ${selKid.firstName}`}
                        onClick={() =>
                          dispatch({
                            type: "SET_EXPLORE_VISIBILITY",
                            kidId: sel,
                            resourceId: r.id,
                            visible: !on,
                          })
                        }
                      >
                        <span className="switch__dot" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        <p className="settings__hint">
          Controls what {selKid.firstName} sees on the Explore tab. (Everything
          is on by default.)
        </p>
      </div>
    </>
  );
}

function CloudSync() {
  const [code, setCode] = useState(() => readSyncCode());
  const [saved, setSaved] = useState(false);
  const active = readSyncCode();

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    writeSyncCode(code);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <>
      <h3 className="section-title">☁️ Cross-Device Sync</h3>
      <div className="settings">
        {!FIREBASE_READY ? (
          <p className="settings__hint">
            Cloud sync isn't set up yet, so messages stay on each device. Once a
            Firebase project is connected, a "family sync code" box will appear
            here to link your devices.
          </p>
        ) : (
          <>
            <form className="settings__row" onSubmit={save}>
              <label className="settings__label">
                Family sync code
                <input
                  className="settings__input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.trim())}
                  placeholder="A shared secret, e.g. moon-rocket-42"
                  aria-label="Family sync code"
                />
              </label>
              <button className="btn btn--primary" type="submit">
                {saved ? "✓ Saved" : "Save"}
              </button>
            </form>
            <p className="settings__hint">
              Enter the <strong>same code on every device</strong> (this
              computer and the kids') — messages then sync across all of them in
              real time. {active ? "Status: ✅ syncing on this device." : "Status: off."}
            </p>
          </>
        )}
      </div>
    </>
  );
}

function ParentMessages() {
  const { state } = useApp();
  const kids = kidList(state);
  const [selRaw, setSel] = useState<KidId>(() => kids[0]?.id ?? "");
  const sel = kids.some((k) => k.id === selRaw) ? selRaw : kids[0]?.id ?? "";
  return (
    <>
      <h3 className="section-title">💬 Messages</h3>
      <div className="msgtabs">
        {kids.map((k) => {
          const unread = parentUnreadCount(state, k.id);
          return (
            <button
              key={k.id}
              className={`msgtab ${sel === k.id ? "is-active" : ""}`}
              style={{ ["--this-kid" as string]: k.color }}
              onClick={() => setSel(k.id)}
            >
              {k.emoji} {k.firstName}
              {unread > 0 && <span className="msgtab__pip">{unread}</span>}
            </button>
          );
        })}
      </div>
      <MessageThread kidId={sel} viewer="parent" />
    </>
  );
}

function ChoreAssigner() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const [kidIdRaw, setKidId] = useState<KidId>(() => kids[0]?.id ?? "");
  const kidId = kids.some((k) => k.id === kidIdRaw) ? kidIdRaw : kids[0]?.id ?? "";
  const [refId, setRefId] = useState<string>(CHORES[0]?.id ?? "");

  const assign = (e: React.FormEvent) => {
    e.preventDefault();
    if (refId) dispatch({ type: "ASSIGN_CHORE", kidId, refId });
  };

  // Everyone's chores for today, in kid order.
  const todays = kids.flatMap((k) =>
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
            {kids.map((k) => (
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
        {kidList(state).map((k) => (
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
  const kid = getKid(state, kidId);
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
