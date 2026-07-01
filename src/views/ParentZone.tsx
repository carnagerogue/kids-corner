import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import { ParentAvatarControls } from "../features/avatar/ParentAvatarControls";
import { WorldLearningReport } from "./WorldLearningReport";
import { KID_EMOJIS, KID_PALETTE } from "../data/kids";
import { APP_CATALOG } from "../data/applications";
import { RESOURCES, RESOURCE_CATEGORIES } from "../data/resources";
import {
  activeAnnouncements,
  activityById,
  activityImage,
  approvedSubmissions,
  choreAssignmentsFor,
  choreCatalog,
  customPlans,
  familyGoalProgress,
  familyPlan,
  getKid,
  getKidXp,
  kidList,
  kidSubmissions,
  parentUnreadCount,
  pendingSubmissions,
  planForKid,
  taskStatus,
} from "../store/selectors";
import { Avatar3DThumb } from "../features/avatar/Avatar3DThumb";
import { computeStats } from "../store/selectors";
import { getLevelInfo } from "../data/levels";
import { BADGES } from "../data/badges";
import { CATEGORY_META, NON_CHORE_ACTIVITIES } from "../data/activities";
import { MissionArt, hasMissionArt } from "../data/missionArt";
import { fileToDownscaledDataUrl } from "../lib/image";
import {
  BLOCK_ACCENTS,
  FAMILY_PLAN_ID,
  formatRange,
  hhmmToMinutes,
  minutesToHHMM,
} from "../data/schedule";
import { newId } from "../store/storage";
import { MessageThread } from "../components/MessageThread";
import { MessageNotifier } from "../components/MessageNotifier";
import { CopyField } from "../components/AppCard";
import { isAllowedParent } from "../data/accessAllowlist";
import { hashPin, pinMatches } from "../lib/hash";
import { FIREBASE_READY, signInWithGoogle, signOutUser } from "../firebase";
import { useFamily } from "../store/FamilyContext";
import {
  copyRoomToFamily,
  DEFAULT_SYNC_CODE,
  generatePrivateCode,
  migrateRoom,
  readSyncOverride,
  writeSyncCode,
} from "../sync";
import type {
  ActivityIdea,
  Audience,
  Kid,
  KidId,
  ScheduleBlock,
  SchedulePlan,
  Submission,
} from "../types";

export function ParentZone({ onExit }: { onExit: () => void }) {
  const fam = useFamily();
  const [pinOk, setPinOk] = useState(false);

  // A signed-in grown-up with no family yet must create/join one first.
  if (fam.isParent && fam.needsFamily) {
    return <CreateFamilyScreen onExit={onExit} />;
  }
  // The parent PIN still gates the dashboard (blocks a kid on a shared tablet),
  // even once a grown-up's Google session is active for family identity.
  if (!pinOk) {
    return <GrownUpGate onUnlock={() => setPinOk(true)} onExit={onExit} />;
  }
  return <ParentDashboard onLock={() => setPinOk(false)} />;
}

function CreateFamilyScreen({ onExit }: { onExit: () => void }) {
  const { user, createFamily } = useFamily();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Only approved grown-ups may create a family.
  if (!isAllowedParent(user?.email)) {
    return (
      <div className="view">
        <div className="pin">
          <span className="pin__lock">🚫</span>
          <h2 className="pin__title">Not on the access list</h2>
          <p className="pin__sub">
            {user?.email ?? "This account"} isn't approved yet. Ask the Kids
            Corner admin to add you, then sign in again.
          </p>
          <button className="btn btn--primary btn--big" onClick={() => signOutUser()}>
            Sign out
          </button>
          <button className="link-btn" onClick={onExit}>
            ← Back to Kids Corner
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await createFamily(name.trim()); // reloads into the new family
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Couldn't create the family.");
    }
  };

  return (
    <div className="view">
      <div className="pin">
        <span className="pin__lock">👋</span>
        <h2 className="pin__title">Welcome!</h2>
        <p className="pin__sub">
          Signed in as {user?.email ?? "your account"}. Name your family to get
          started — you'll add your kids next.
        </p>
        <form className="pin__form" onSubmit={submit}>
          <input
            className="pin__input pin__input--text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Moon-Lee Family"
            aria-label="Family name"
          />
          <button
            className="btn btn--primary btn--big"
            type="submit"
            disabled={busy || !name.trim()}
          >
            {busy ? "Creating…" : "Create family"}
          </button>
        </form>
        {error && <p className="pin__error">{error}</p>}
        <button className="link-btn" onClick={() => signOutUser()}>
          Sign out
        </button>
        <button className="link-btn" onClick={onExit}>
          ← Back to Kids Corner
        </button>
      </div>
    </div>
  );
}

function GrownUpGate({
  onUnlock,
  onExit,
}: {
  onUnlock: () => void;
  onExit: () => void;
}) {
  const { state } = useApp();
  const fam = useFamily();
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await pinMatches(entry, state.parentPin)) onUnlock();
    else {
      setError(true);
      setEntry("");
    }
  };

  const google = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      /* cancelled or blocked — surfaced in console; the user can retry */
    } finally {
      setSigningIn(false);
    }
  };

  const activeName = fam.families.find(
    (f) => f.id === fam.activeFamilyId,
  )?.name;

  return (
    <div className="view">
      <div className="pin">
        <span className="pin__lock">🔒</span>
        <h2 className="pin__title">Grown-Ups Only</h2>

        {FIREBASE_READY && (
          <div className="grownup-id">
            {fam.isParent ? (
              <>
                <p className="pin__sub">
                  Signed in as <strong>{fam.user?.email}</strong>
                  {activeName ? ` · ${activeName}` : ""}
                </p>
                {fam.families.length > 1 && (
                  <select
                    className="settings__input"
                    value={fam.activeFamilyId ?? ""}
                    onChange={(e) => fam.setActiveFamilyId(e.target.value)}
                    aria-label="Switch family"
                  >
                    {fam.families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
                <ImportLegacyData familyId={fam.activeFamilyId} />
                <button className="link-btn" onClick={() => signOutUser()}>
                  Sign out of Google
                </button>
              </>
            ) : (
              <>
                <button
                  className="btn btn--primary btn--full"
                  onClick={google}
                  disabled={signingIn}
                >
                  {signingIn ? "Opening Google…" : "🔐 Sign in with Google"}
                </button>
                <p className="settings__hint">
                  For multiple families. Or just enter the PIN below to use this
                  device's family.
                </p>
              </>
            )}
          </div>
        )}

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

/** One-time import of the legacy shared-room data into this family. */
function ImportLegacyData({ familyId }: { familyId: string | null }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  if (!familyId) return null;

  const run = async () => {
    if (
      !window.confirm(
        "Import your existing Kids Corner data (kids, photos, messages) into this family? It copies from the shared room and never deletes anything.",
      )
    )
      return;
    setBusy(true);
    setStatus("");
    const res = await copyRoomToFamily(DEFAULT_SYNC_CODE, familyId);
    setBusy(false);
    setStatus(
      res.ok
        ? `✓ Imported ${res.counts.kids} kids, ${res.counts.submissions} submissions, ${res.counts.messages} messages.`
        : `⚠️ ${res.error}`,
    );
  };

  return (
    <div className="grownup-import">
      <button className="btn btn--ghost" onClick={run} disabled={busy}>
        {busy ? "Importing…" : "⤵ Import existing Kids Corner data"}
      </button>
      {status && <p className="settings__hint">{status}</p>}
    </div>
  );
}

type GTab =
  | "review"
  | "progress"
  | "messages"
  | "kids"
  | "schedule"
  | "apps"
  | "chores"
  | "missions"
  | "avatar"
  | "settings";

const GTABS: { id: GTab; emoji: string; label: string }[] = [
  { id: "review", emoji: "📥", label: "Review" },
  { id: "progress", emoji: "📊", label: "Progress" },
  { id: "messages", emoji: "💬", label: "Messages" },
  { id: "kids", emoji: "👧", label: "Kids" },
  { id: "schedule", emoji: "🗓️", label: "Schedule" },
  { id: "apps", emoji: "🧭", label: "Apps" },
  { id: "chores", emoji: "🧹", label: "Chores" },
  { id: "missions", emoji: "🖼️", label: "Examples" },
  { id: "avatar", emoji: "🧢", label: "Avatar" },
  { id: "settings", emoji: "⚙️", label: "Settings" },
];

function ParentDashboard({ onLock }: { onLock: () => void }) {
  const { state } = useApp();
  const [tab, setTab] = useState<GTab>("review");
  const [zoom, setZoom] = useState<string>("");

  const pendingN = pendingSubmissions(state).length;
  const unreadN = kidList(state).reduce(
    (n, k) => n + parentUnreadCount(state, k.id),
    0,
  );

  const subtitle: Record<GTab, string> = {
    review: pendingN
      ? `${pendingN} item${pendingN === 1 ? "" : "s"} waiting for your review`
      : "All caught up — nothing waiting right now",
    progress: "Each child's level, badges, and finished-task photos",
    messages: "Chat with each child",
    kids: "Add or remove children and set their login PINs",
    schedule: "Build the daily schedule — for everyone, a group, or one child",
    apps: "Choose what each child sees in Apps and Explore",
    chores: "Assign chores for the kids to finish with photo proof",
    missions: "Add an example photo so kids can see the finished result",
    avatar: "Coins, rewards, unlocks, and avatar controls for each child",
    settings: "Cross-device sync, PINs, and resetting the summer",
  };

  return (
    <div className="view gzone">
      <MessageNotifier viewer="parent" />
      <div className="view__header">
        <div>
          <h2 className="view__title">🧑‍🍼 Grown-Ups Dashboard</h2>
          <p className="view__sub">{subtitle[tab]}</p>
        </div>
        <button className="btn btn--ghost" onClick={onLock}>
          🔒 Lock
        </button>
      </div>

      <nav className="gnav" aria-label="Grown-up sections">
        {GTABS.map((t) => {
          const badge =
            t.id === "review" ? pendingN : t.id === "messages" ? unreadN : 0;
          return (
            <button
              key={t.id}
              className={`gnav__btn ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="gnav__emoji">{t.emoji}</span>
              <span className="gnav__label">{t.label}</span>
              {badge > 0 && <span className="gnav__pip">{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="gpanel" key={tab}>
        {tab === "review" && <ParentReview onZoom={setZoom} />}
        {tab === "progress" && (
          <>
            <ParentProgress onZoom={setZoom} />
            <WorldLearningReport />
          </>
        )}
        {tab === "messages" && <ParentMessages />}
        {tab === "kids" && (
          <>
            <ParentKids />
            <ParentPins />
          </>
        )}
        {tab === "schedule" && <ScheduleEditor />}
        {tab === "apps" && (
          <>
            <ParentApps />
            <ParentExplore />
          </>
        )}
        {tab === "chores" && <ChoreAssigner />}
        {tab === "missions" && <MissionExamples />}
        {tab === "avatar" && <ParentAvatarControls />}
        {tab === "settings" && (
          <>
            <CloudSync />
            <ParentSettings />
          </>
        )}
      </div>

      {zoom &&
        createPortal(
          <div className="modal" onClick={() => setZoom("")}>
            <img className="zoom" src={zoom} alt="Proof enlarged" />
          </div>,
          document.body,
        )}
    </div>
  );
}

function ParentReview({ onZoom }: { onZoom: (src: string) => void }) {
  const { state, dispatch } = useApp();
  const pending = pendingSubmissions(state);

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
    <>
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
                    onClick={() => onZoom(s.photo)}
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
                  {s.partnerId && (
                    <span className="reviewcard__partner">
                      🤝 together with {getKid(state, s.partnerId).firstName}
                    </span>
                  )}
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
    </>
  );
}

function FamilyGoalEditor() {
  const { state, dispatch } = useApp();
  const g = state.familyGoal;
  // Free text so the field can be cleared + retyped; coerced on blur + submit.
  const [targetText, setTargetText] = useState(String(g?.target ?? 20));
  const [reward, setReward] = useState(g?.reward ?? "");
  const done = familyGoalProgress(state);

  const clampTarget = (text: string) =>
    Math.max(1, Math.min(200, parseInt(text, 10) || 20));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reward.trim()) return;
    dispatch({ type: "SET_FAMILY_GOAL", target: clampTarget(targetText), reward });
  };

  return (
    <>
      <h3 className="section-title">🏡 Family Goal</h3>
      <div className="settings">
        <p className="settings__hint">
          A shared goal every kid helps with. When the family finishes the
          target number of tasks <strong>together</strong>, they all win the
          reward — it shows on each kid's home screen.
        </p>
        {g && (
          <div className="famgoal famgoal--mini">
            <span className="famgoal__icon">🏡</span>
            <div className="famgoal__body">
              <strong className="famgoal__title">
                {done}/{g.target} → {g.reward}
              </strong>
              <div className="famgoal__bar">
                <span style={{ width: `${Math.min(100, (done / g.target) * 100)}%` }} />
              </div>
            </div>
            <button
              className="btn btn--reject btn--sm"
              onClick={() => dispatch({ type: "CLEAR_FAMILY_GOAL" })}
            >
              Clear
            </button>
          </div>
        )}
        <form className="addchore__row" onSubmit={save}>
          <label className="settings__label addchore__field">
            Reward
            <input
              className="settings__input"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="e.g. movie night, pizza, a trip to the park"
              maxLength={80}
            />
          </label>
          <label className="settings__label addchore__field" style={{ flex: "0 0 96px" }}>
            Tasks
            <input
              className="settings__input"
              type="number"
              min={1}
              max={200}
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              onBlur={() => setTargetText(String(clampTarget(targetText)))}
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={!reward.trim()}>
            {g ? "Update goal" : "Set goal"}
          </button>
        </form>
      </div>
    </>
  );
}

function ParentProgress({ onZoom }: { onZoom: (src: string) => void }) {
  const { state } = useApp();
  const kids = kidList(state);
  const [selRaw, setSel] = useState<KidId>(() => kids[0]?.id ?? "");
  const sel = kids.some((k) => k.id === selRaw) ? selRaw : kids[0]?.id ?? "";
  const kid = getKid(state, sel);
  const xp = getKidXp(state, sel);
  const level = getLevelInfo(xp);
  const stats = computeStats(state, sel);
  const earned = new Set(state.kids[sel]?.badges ?? []);

  // Approved, photo-bearing submissions newest first — the kid's photo history.
  const photos = approvedSubmissions(state, sel)
    .filter((s) => s.photo)
    .sort(
      (a, b) =>
        (b.reviewedAt ?? b.submittedAt) - (a.reviewedAt ?? a.submittedAt),
    );
  const totalDone = kidSubmissions(state, sel).filter(
    (s) => s.status === "approved",
  ).length;

  return (
    <>
      <FamilyGoalEditor />

      <h3 className="section-title">📊 Each Kid's Progress</h3>
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

      <div className="progcard" style={{ ["--this-kid" as string]: kid.color }}>
        <div className="progcard__head">
          <Avatar3DThumb kidId={sel} size={52} className="progcard__avatar" />
          <div className="progcard__id">
            <strong className="progcard__name">{kid.firstName}</strong>
            <span className="progcard__rank">
              {level.rank.emoji} {level.rank.title} · Level {level.rank.level}
            </span>
          </div>
          <span className="progcard__xp">{xp} XP</span>
        </div>
        <div className="progcard__bar">
          <span style={{ width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <span className="progcard__next">
          {level.next
            ? `${level.next.minXp - xp} XP to ${level.next.emoji} ${level.next.title}`
            : "Max level reached! 🎉"}
        </span>
        <div className="progstats">
          <div className="progstat">
            <span className="progstat__n">{stats.totalMissions}</span>
            <span className="progstat__l">missions</span>
          </div>
          <div className="progstat">
            <span className="progstat__n">{stats.totalAssignments}</span>
            <span className="progstat__l">assignments</span>
          </div>
          <div className="progstat">
            <span className="progstat__n">🔥 {stats.streak}</span>
            <span className="progstat__l">day streak</span>
          </div>
          <div className="progstat">
            <span className="progstat__n">🏅 {earned.size}</span>
            <span className="progstat__l">badges</span>
          </div>
        </div>
      </div>

      <h4 className="prog-subtitle">
        🏅 Badges ({earned.size}/{BADGES.length})
      </h4>
      <div className="badgegrid">
        {BADGES.map((b) => {
          const has = earned.has(b.id);
          return (
            <div
              key={b.id}
              className={`badgechip ${has ? "is-earned" : ""}`}
              title={b.description}
            >
              <span className="badgechip__emoji">{b.emoji}</span>
              <span className="badgechip__title">{b.title}</span>
            </div>
          );
        })}
      </div>

      <h4 className="prog-subtitle">📸 Finished-task photos ({photos.length})</h4>
      {photos.length === 0 ? (
        <p className="empty">
          {totalDone > 0
            ? "Older photos are cleared to save space — recent ones show here."
            : `No approved photos yet. They'll appear as ${kid.firstName} finishes tasks.`}
        </p>
      ) : (
        <div className="photogrid">
          {photos.map((s) => (
            <button
              key={s.id}
              className="photogrid__item"
              onClick={() => onZoom(s.photo)}
            >
              <img src={s.photo} alt={s.title} loading="lazy" />
              <span className="photogrid__cap">
                {s.emoji} {s.title}
                {s.partnerId && (
                  <span className="photogrid__with">
                    🤝 with {getKid(state, s.partnerId).firstName}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function MissionExamples() {
  const { state, dispatch } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const pick = async (id: string, file: File | undefined) => {
    if (!file) return;
    setErr("");
    setBusyId(id);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      dispatch({ type: "SET_ACTIVITY_IMAGE", activityId: id, image: dataUrl });
    } catch {
      setErr("Couldn't read that image — try another file.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h3 className="section-title">🖼️ Mission Example Photos</h3>
      <div className="settings">
        <p className="settings__hint">
          Attach a photo of a finished example so kids can picture the result.
          A built-in sketch shows until you add one.
        </p>
        {err && <p className="pin__error">{err}</p>}
        <ul className="exlist">
          {NON_CHORE_ACTIVITIES.map((a) => {
            const meta = CATEGORY_META[a.category];
            const img = activityImage(state, a.id);
            return (
              <li key={a.id} className="exrow">
                <div className="exrow__preview">
                  {img ? (
                    <img src={img} alt="" />
                  ) : hasMissionArt(a.id) ? (
                    <MissionArt id={a.id} className="exrow__art" />
                  ) : (
                    <span className="exrow__none">{meta.emoji}</span>
                  )}
                </div>
                <div className="exrow__body">
                  <strong className="exrow__title">{a.title}</strong>
                  <span className="exrow__cat">
                    {meta.emoji} {meta.label}
                  </span>
                </div>
                <div className="exrow__actions">
                  <label className="btn btn--ghost btn--sm">
                    {busyId === a.id ? "…" : img ? "Replace" : "Add photo"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => pick(a.id, e.target.files?.[0])}
                    />
                  </label>
                  {img && (
                    <button
                      className="btn btn--reject btn--sm"
                      onClick={() =>
                        dispatch({
                          type: "SET_ACTIVITY_IMAGE",
                          activityId: a.id,
                          image: null,
                        })
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function ScheduleEditor() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const plans = state.schedules;
  const family = familyPlan(state);
  const custom = customPlans(state);
  const [selId, setSelId] = useState<string>(FAMILY_PLAN_ID);
  const plan = plans.find((p) => p.id === selId) ?? family;
  const isFamily = plan.scope.kind === "family";

  const save = (next: SchedulePlan) =>
    dispatch({ type: "UPSERT_SCHEDULE_PLAN", plan: next });
  const setBlocks = (blocks: ScheduleBlock[]) => save({ ...plan, blocks });

  // Keep the human "time" label in sync with the start/end a grown-up picks.
  const recalc = (b: ScheduleBlock): ScheduleBlock => ({
    ...b,
    time: formatRange(b.startMinutes, b.endMinutes),
  });
  const updateBlock = (i: number, patch: Partial<ScheduleBlock>) =>
    setBlocks(
      plan.blocks.map((b, idx) => (idx === i ? recalc({ ...b, ...patch }) : b)),
    );
  const removeBlock = (i: number) =>
    setBlocks(plan.blocks.filter((_, idx) => idx !== i));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= plan.blocks.length) return;
    const next = [...plan.blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const addBlock = () => {
    const last = plan.blocks[plan.blocks.length - 1];
    const start = last ? last.endMinutes : 9 * 60;
    const end = Math.min(start + 60, 24 * 60 - 1);
    setBlocks([
      ...plan.blocks,
      recalc({
        id: newId(),
        title: "New activity",
        time: "",
        startMinutes: start,
        endMinutes: end,
        emoji: "🗓️",
        accent: BLOCK_ACCENTS[plan.blocks.length % BLOCK_ACCENTS.length],
        xp: 10,
      }),
    ]);
  };

  const newPlan = () => {
    const id = `plan-${newId().slice(0, 8)}`;
    save({
      id,
      name: "New schedule",
      scope: { kind: "kids", kidIds: [] },
      // Start from a copy of the family schedule so there's something to tweak.
      blocks: family.blocks.map((b) => ({ ...b, id: newId() })),
    });
    setSelId(id);
  };
  const toggleKid = (kidId: KidId) => {
    if (plan.scope.kind !== "kids") return;
    const has = plan.scope.kidIds.includes(kidId);
    const kidIds = has
      ? plan.scope.kidIds.filter((id) => id !== kidId)
      : [...plan.scope.kidIds, kidId];
    save({ ...plan, scope: { kind: "kids", kidIds } });
  };
  const deletePlan = () => {
    if (isFamily) return;
    if (
      window.confirm(
        `Delete the "${plan.name}" schedule? Kids on it go back to the family schedule.`,
      )
    ) {
      dispatch({ type: "DELETE_SCHEDULE_PLAN", planId: plan.id });
      setSelId(FAMILY_PLAN_ID);
    }
  };

  const onFamily = kids.filter(
    (k) => planForKid(state, k.id).id === FAMILY_PLAN_ID,
  );

  return (
    <>
      <h3 className="section-title">🗓️ Daily Schedule</h3>
      <div className="settings">
        <div className="msgtabs">
          <button
            className={`msgtab ${selId === family.id ? "is-active" : ""}`}
            onClick={() => setSelId(family.id)}
          >
            👪 Everyone
          </button>
          {custom.map((p) => (
            <button
              key={p.id}
              className={`msgtab ${selId === p.id ? "is-active" : ""}`}
              onClick={() => setSelId(p.id)}
            >
              {p.name || "Untitled"}
              {p.scope.kind === "kids" && p.scope.kidIds.length > 0 && (
                <span className="msgtab__pip">{p.scope.kidIds.length}</span>
              )}
            </button>
          ))}
          <button className="msgtab msgtab--add" onClick={newPlan}>
            ＋ New plan
          </button>
        </div>

        {isFamily ? (
          <p className="settings__hint">
            This is the default schedule everyone follows.
            {onFamily.length
              ? ` Right now: ${onFamily.map((k) => k.firstName).join(", ")}.`
              : " Every child currently has their own schedule."}
          </p>
        ) : (
          <div className="planmeta">
            <label className="settings__label">
              Schedule name
              <input
                className="settings__input"
                value={plan.name}
                maxLength={40}
                onChange={(e) => save({ ...plan, name: e.target.value })}
                placeholder="e.g. School days, Weekends, Coby's plan"
              />
            </label>
            <span className="settings__label">Who follows this schedule?</span>
            <div className="plankids">
              {kids.map((k) => {
                const on =
                  plan.scope.kind === "kids" &&
                  plan.scope.kidIds.includes(k.id);
                return (
                  <button
                    key={k.id}
                    className={`kidchip ${on ? "is-on" : ""}`}
                    style={{ ["--this-kid" as string]: k.color }}
                    onClick={() => toggleKid(k.id)}
                  >
                    {k.emoji} {k.firstName} {on ? "✓" : ""}
                  </button>
                );
              })}
            </div>
            <p className="settings__hint">
              Pick one child for a unique schedule, or several for a group. A
              child can only be on one custom schedule at a time.
            </p>
          </div>
        )}

        <div className="schededit">
          {plan.blocks.length === 0 && (
            <p className="empty">No blocks yet — add the first one below. 🗓️</p>
          )}
          {plan.blocks.map((b, i) => (
            <div
              key={b.id}
              className="schedrow"
              style={{ ["--accent" as string]: b.accent }}
            >
              <div className="schedrow__line">
                <input
                  className="schedrow__emoji"
                  value={b.emoji}
                  maxLength={3}
                  aria-label="Emoji"
                  onChange={(e) => updateBlock(i, { emoji: e.target.value })}
                />
                <input
                  className="schedrow__title"
                  value={b.title}
                  placeholder="Activity name"
                  aria-label="Activity name"
                  onChange={(e) => updateBlock(i, { title: e.target.value })}
                />
                <div className="schedrow__moves">
                  <button
                    className="iconbtn"
                    disabled={i === 0}
                    onClick={() => moveBlock(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="iconbtn"
                    disabled={i === plan.blocks.length - 1}
                    onClick={() => moveBlock(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="iconbtn iconbtn--del"
                    onClick={() => removeBlock(i)}
                    aria-label="Delete block"
                  >
                    🗑
                  </button>
                </div>
              </div>
              <div className="schedrow__line">
                <label className="schedrow__time">
                  From
                  <input
                    type="time"
                    value={minutesToHHMM(b.startMinutes)}
                    onChange={(e) =>
                      updateBlock(i, {
                        startMinutes: hhmmToMinutes(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="schedrow__time">
                  To
                  <input
                    type="time"
                    value={minutesToHHMM(b.endMinutes)}
                    onChange={(e) =>
                      updateBlock(i, {
                        endMinutes: hhmmToMinutes(e.target.value),
                      })
                    }
                  />
                </label>
                <span className="schedrow__when">{b.time}</span>
              </div>
              <input
                className="schedrow__note"
                value={b.note ?? ""}
                placeholder="Note (optional)"
                onChange={(e) =>
                  updateBlock(i, { note: e.target.value || undefined })
                }
              />
              <label className="schedrow__toggle">
                <input
                  type="checkbox"
                  checked={!!b.opensApplications}
                  onChange={(e) =>
                    updateBlock(i, {
                      opensApplications: e.target.checked || undefined,
                    })
                  }
                />
                Show an "Open Applications" button on this block
              </label>
            </div>
          ))}
          <button className="btn btn--ghost addblock" onClick={addBlock}>
            ＋ Add block
          </button>
        </div>

        {!isFamily && (
          <button className="btn btn--danger btn--sm" onClick={deletePlan}>
            Delete this schedule
          </button>
        )}
      </div>
    </>
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

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    dispatch({
      type: "ADD_KID",
      firstName: name.trim(),
      emoji,
      paletteIndex: palette,
      pin: await hashPin(pin.trim()),
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

type MigrateState =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "done"; code: string; counts: { kids: number; messages: number; submissions: number } }
  | { phase: "error"; message: string };

function CloudSync() {
  const [code, setCode] = useState(() => readSyncOverride());
  const [saved, setSaved] = useState(false);
  const override = readSyncOverride();
  const usingPrivate = override.length > 0;
  const currentCode = usingPrivate ? override : DEFAULT_SYNC_CODE;
  const [migrate, setMigrate] = useState<MigrateState>({ phase: "idle" });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    writeSyncCode(code);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const startMigration = async () => {
    setMigrate({ phase: "working" });
    const newCode = generatePrivateCode();
    const result = await migrateRoom(currentCode, newCode);
    if (result.ok) {
      setMigrate({ phase: "done", code: newCode, counts: result.counts });
    } else {
      setMigrate({ phase: "error", message: result.error });
    }
  };

  const switchNow = () => {
    if (migrate.phase !== "done") return;
    writeSyncCode(migrate.code);
    setCode(migrate.code);
  };

  return (
    <>
      <h3 className="section-title">☁️ Cross-Device Sync</h3>
      <div className="settings">
        {!FIREBASE_READY ? (
          <p className="settings__hint">
            Cloud sync isn't set up yet, so everything stays on this device.
          </p>
        ) : (
          <>
            <p className="settings__hint">
              ✅ <strong>Sync is on.</strong> Every computer that opens Kids
              Corner shares the same family automatically — kids, photos,
              messages, and progress show up everywhere, no setup needed.
            </p>

            {!usingPrivate && (
              <div className="cloudsync__warning">
                <strong>⚠️ You're using the shared default room.</strong>
                <p>
                  Every install of this app starts on the same public room
                  unless a private code is set. Your family's data is safe
                  only if your Firebase rules require one — moving to a
                  private code removes that risk entirely. This copies
                  everything (kids, messages, photos) to a new private room
                  first, so nothing is lost.
                </p>
                {migrate.phase === "idle" && (
                  <button className="btn btn--primary" onClick={startMigration}>
                    🔒 Create a private family code
                  </button>
                )}
                {migrate.phase === "working" && (
                  <button className="btn btn--primary" disabled>
                    Copying your data…
                  </button>
                )}
                {migrate.phase === "error" && (
                  <>
                    <p className="cloudsync__error">{migrate.message}</p>
                    <button className="btn btn--primary" onClick={startMigration}>
                      Try again
                    </button>
                  </>
                )}
                {migrate.phase === "done" && (
                  <div className="cloudsync__result">
                    <p>
                      ✓ Copied {migrate.counts.kids} kid
                      {migrate.counts.kids === 1 ? "" : "s"},{" "}
                      {migrate.counts.messages} message
                      {migrate.counts.messages === 1 ? "" : "s"}, and{" "}
                      {migrate.counts.submissions} submission
                      {migrate.counts.submissions === 1 ? "" : "s"} to a new
                      private room.
                    </p>
                    <CopyField label="New private code" value={migrate.code} />
                    <p className="cloudsync__hint">
                      Write this down. Switching this device now — you'll
                      need to enter the same code on every other family
                      device (below) before they can see the shared data
                      again.
                    </p>
                    <button className="btn btn--primary" onClick={switchNow}>
                      Switch this device to the new code
                    </button>
                  </div>
                )}
              </div>
            )}

            <details className="cloudsync__adv" open={usingPrivate}>
              <summary>
                {usingPrivate ? "Private room code" : "Advanced: use a private room"}
              </summary>
              <form className="settings__row" onSubmit={save}>
                <label className="settings__label">
                  Private room code
                  <input
                    className="settings__input"
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    placeholder="Leave blank to use the shared family room"
                    aria-label="Private room code"
                  />
                </label>
                <button className="btn btn--primary" type="submit">
                  {saved ? "✓ Saved" : "Save"}
                </button>
              </form>
              <p className="settings__hint">
                Set the <strong>same code on every device</strong> to keep your
                family in a separate room from anyone else. Leave blank to use
                the shared default — entering a code here does NOT copy any
                data; use "Create a private family code" above on the first
                device, then enter the code it gives you here on every other
                device.
              </p>
            </details>
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
      <MessageThread me="parent" other={sel} />

      <Announcer />
    </>
  );
}

function Announcer() {
  const { state, dispatch } = useApp();
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const list = activeAnnouncements(state);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) {
      // Always respond to a click: nudge the grown-up to type instead of
      // sitting there as a dead, disabled-looking button.
      inputRef.current?.focus();
      return;
    }
    dispatch({ type: "SEND_ANNOUNCEMENT", text: t });
    setText("");
  };

  return (
    <>
      <h3 className="section-title">📣 Announcements</h3>
      <div className="settings">
        <p className="settings__hint">
          Send a note that shows up for <strong>every kid</strong> on their home
          screen.
        </p>
        <form className="settings__row" onSubmit={send}>
          <input
            ref={inputRef}
            className="settings__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Grandma visits at 3pm — tidy up first!"
            maxLength={280}
            aria-label="Announcement text"
          />
          <button className="btn btn--primary" type="submit">
            📣 Announce
          </button>
        </form>
        {list.length > 0 && (
          <ul className="annlist">
            {list.map((a) => (
              <li key={a.id} className="annlist__row">
                <span className="annlist__text">{a.text}</span>
                <span className="annlist__time">
                  {new Date(a.at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <button
                  className="btn btn--reject btn--sm"
                  onClick={() =>
                    dispatch({ type: "DELETE_ANNOUNCEMENT", id: a.id })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

const AUDIENCE_META: Record<Audience, { label: string; tag: string }> = {
  all: { label: "All ages", tag: "All ages" },
  kids: { label: "Younger kids", tag: "Kids" },
  teens: { label: "Teens", tag: "Teen" },
};

function ChoreAssigner() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const catalog = choreCatalog(state);
  const [kidIdRaw, setKidId] = useState<KidId>(() => kids[0]?.id ?? "");
  const kidId = kids.some((k) => k.id === kidIdRaw) ? kidIdRaw : kids[0]?.id ?? "";
  const [refId, setRefId] = useState<string>(catalog[0]?.id ?? "");

  const assign = (e: React.FormEvent) => {
    e.preventDefault();
    if (refId) dispatch({ type: "ASSIGN_CHORE", kidId, refId });
  };

  // Group the picker by audience so teen chores are easy to find.
  const groups: { audience: Audience; items: ActivityIdea[] }[] = (
    ["all", "kids", "teens"] as Audience[]
  ).map((audience) => ({
    audience,
    items: catalog.filter((a) => !a.custom && (a.audience ?? "all") === audience),
  }));
  const custom = catalog.filter((a) => a.custom);

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
            {groups.map(
              (g) =>
                g.items.length > 0 && (
                  <optgroup key={g.audience} label={AUDIENCE_META[g.audience].label}>
                    {g.items.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title} (+{a.xp} XP)
                      </option>
                    ))}
                  </optgroup>
                ),
            )}
            {custom.length > 0 && (
              <optgroup label="Your custom chores">
                {custom.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} (+{a.xp} XP)
                  </option>
                ))}
              </optgroup>
            )}
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
              const activity = activityById(state, c.refId);
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

      <CustomChores onCreated={(id) => setRefId(id)} />
    </>
  );
}

function CustomChores({ onCreated }: { onCreated: (id: string) => void }) {
  const { state, dispatch } = useApp();
  const custom = state.customActivities.filter((a) => a.category === "chores");
  const [title, setTitle] = useState("");
  // XP is held as free text so it can be cleared + retyped; it's only coerced to
  // a sane number on blur and at submit (empty/garbage → 15, clamped to 5–60).
  const [xpText, setXpText] = useState("15");
  const [audience, setAudience] = useState<Audience>("all");
  const [steps, setSteps] = useState("");

  const clampXp = (text: string) =>
    Math.max(5, Math.min(60, parseInt(text, 10) || 15));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const xp = clampXp(xpText);
    const id = `custom-${newId().slice(0, 8)}`;
    const stepLines = steps
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const activity: ActivityIdea = {
      id,
      title: t.slice(0, 60),
      category: "chores",
      estimatedMinutes: 15,
      supplies: [],
      difficulty: xp >= 35 ? "challenge" : xp >= 25 ? "medium" : "easy",
      bestFor: ["everyone"],
      indoorOutdoor: "either",
      parentHelp: false,
      steps: stepLines.length
        ? stepLines
        : ["Do the chore.", "Snap a photo when it's done."],
      xp,
      audience,
      custom: true,
    };
    dispatch({ type: "ADD_CUSTOM_ACTIVITY", activity });
    setTitle("");
    setXpText("15");
    setAudience("all");
    setSteps("");
    onCreated(id);
  };

  const remove = (id: string, name: string) => {
    if (window.confirm(`Delete the custom chore "${name}"?`)) {
      dispatch({ type: "REMOVE_CUSTOM_ACTIVITY", activityId: id });
    }
  };

  return (
    <>
      <h3 className="section-title">✏️ Custom Chores</h3>
      <div className="settings">
        {custom.length > 0 && (
          <ul className="kidmanage">
            {custom.map((a) => (
              <li key={a.id} className="kidmanage__row">
                <span className="kidmanage__face">🧹</span>
                <span className="kidmanage__name">
                  {a.title}{" "}
                  <span className="addchore__xp">
                    +{a.xp} XP · {AUDIENCE_META[a.audience ?? "all"].tag}
                  </span>
                </span>
                <button
                  className="btn btn--reject btn--sm"
                  onClick={() => remove(a.id, a.title)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="addkid" onSubmit={create}>
          <strong className="addkid__title">➕ Create a chore</strong>
          <input
            className="settings__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chore name (e.g. Empty the dishwasher)"
            maxLength={60}
            aria-label="Chore name"
          />
          <textarea
            className="settings__input addchore__steps"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="Steps (optional, one per line)"
            rows={3}
            aria-label="Chore steps"
          />
          <div className="addchore__row">
            <label className="settings__label addchore__field">
              XP
              <input
                className="settings__input"
                type="number"
                min={5}
                max={60}
                step={5}
                value={xpText}
                onChange={(e) => setXpText(e.target.value)}
                onBlur={() => setXpText(String(clampXp(xpText)))}
              />
            </label>
            <label className="settings__label addchore__field">
              Best for
              <select
                className="settings__input"
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
              >
                <option value="all">All ages</option>
                <option value="kids">Younger kids</option>
                <option value="teens">Teens</option>
              </select>
            </label>
            <button
              className="btn btn--primary"
              type="submit"
              disabled={!title.trim()}
            >
              Add chore
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ParentSettings() {
  const { dispatch } = useApp();
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);

  const savePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length < 3) return;
    dispatch({ type: "SET_PARENT_PIN", pin: await hashPin(pin.trim()) });
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
          PINs are stored hashed, so there's nothing to show here — if you've
          forgotten it, just set a new one above. This is a light gate to keep
          kids out, not real security.
        </p>
      </div>
    </>
  );
}

function ParentPins() {
  const { state } = useApp();
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
    </>
  );
}

function KidPinRow({ kidId }: { kidId: KidId }) {
  const { state, dispatch } = useApp();
  const kid = getKid(state, kidId);
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);
  // PINs are stored hashed (never shown again once set), so there's nothing
  // to pre-fill — this is always "type a new one," not "edit the current one."
  const dirty = pin.trim().length >= 3;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirty) return;
    dispatch({ type: "SET_KID_PIN", kidId, pin: await hashPin(pin.trim()) });
    setPin("");
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
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
          placeholder="New PIN (min 3 digits)"
        />
      </label>
      <button className="btn btn--ghost" type="submit" disabled={!dirty}>
        {saved ? "✓ Saved" : "Save"}
      </button>
    </form>
  );
}
