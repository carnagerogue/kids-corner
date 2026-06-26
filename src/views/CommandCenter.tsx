import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import { getLevelInfo } from "../data/levels";
import {
  activeAnnouncements,
  activityById,
  choreAssignmentsFor,
  coinBalance,
  computeStats,
  computeStreak,
  DAILY_GOAL,
  dailyGoalDone,
  effectiveSchedule,
  equippedAvatar,
  familyGoalProgress,
  getDay,
  getKid,
  getKidXp,
  primaryAppFor,
  reactionSummary,
  sharedPhotos,
} from "../store/selectors";
import { Avatar } from "../data/avatar";
import { todayKey } from "../store/storage";
import { CATEGORY_META, NON_CHORE_ACTIVITIES } from "../data/activities";
import { THEMES } from "../data/themes";
import { ProgressRing } from "../components/ProgressRing";
import { ProofButton } from "../components/ProofButton";
import { ScheduleTimeline } from "../components/ScheduleTimeline";
import { ReminderToggle } from "../components/ScheduleNotifier";
import { MiniCalendar } from "../components/MiniCalendar";
import { AppCard } from "../components/AppCard";
import { useClock, minutesSinceMidnight } from "../hooks/useClock";
import type { TabId } from "../App";
import type { ActivityIdea, KidId } from "../types";

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

/**
 * A few stable-per-day mission options, guaranteeing at least one indoor and
 * one outdoor pick so weather or supervision never leaves a kid stuck.
 */
function missionsOfTheDay(seed: number, count: number): ActivityIdea[] {
  const indoor = NON_CHORE_ACTIVITIES.filter(
    (a) => a.indoorOutdoor === "indoor" || a.indoorOutdoor === "either",
  );
  const outdoor = NON_CHORE_ACTIVITIES.filter(
    (a) => a.indoorOutdoor === "outdoor",
  );
  const chosen: ActivityIdea[] = [];
  const seen = new Set<string>();
  const add = (a: ActivityIdea | undefined) => {
    if (a && !seen.has(a.id)) {
      seen.add(a.id);
      chosen.push(a);
    }
  };
  const pick = (arr: ActivityIdea[]) =>
    arr.length ? arr[seed % arr.length] : undefined;

  add(pick(indoor)); // always something doable inside
  add(pick(outdoor)); // and something for nice weather
  for (let i = 0; chosen.length < count && i < NON_CHORE_ACTIVITIES.length; i++) {
    add(NON_CHORE_ACTIVITIES[(seed + i) % NON_CHORE_ACTIVITIES.length]);
  }
  return chosen.slice(0, count);
}

export function CommandCenter({ onTab }: { onTab: (t: TabId) => void }) {
  const { state, dispatch } = useApp();
  const now = useClock();
  const kid = getKid(state, state.activeKid);
  const activeTheme = state.themes[kid.id];
  const nowMin = minutesSinceMidnight(now);

  const scheduleBlocks = effectiveSchedule(state, kid.id);
  const currentBlock = scheduleBlocks.find(
    (b) => nowMin >= b.startMinutes && nowMin < b.endMinutes,
  );
  const upcomingBlock = scheduleBlocks.find((b) => b.startMinutes > nowMin);

  // A few mission options for today — stable per day, with indoor/outdoor
  // variety so weather or supervision never leaves a kid without a fit.
  // Chores are excluded (those are grown-up assigned).
  const missions = missionsOfTheDay(dayOfYear(now), 3);

  // Chores a grown-up assigned to this kid for today.
  const chores = choreAssignmentsFor(state, kid.id);
  const choreMeta = CATEGORY_META.chores;

  // The kid's main platform (their primary visible app) — kept front and center.
  const mandatory = primaryAppFor(state, kid.id);

  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="view">
      <AnnouncementBanner />
      <div className="dash">
        <aside className="dash__schedule">
          <MiniCalendar />
          <div className="section-row">
            <h3 className="section-title">🗓️ Today's Schedule</h3>
            <div className="section-row__actions">
              <ReminderToggle />
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => onTab("schedule")}
              >
                Full view →
              </button>
            </div>
          </div>
          <ScheduleTimeline onTab={onTab} />
        </aside>

        <div className="dash__main">
          <section className="hero">
        <div className="hero__text">
          <p className="hero__eyebrow">{greeting}, mission control 🛰️</p>
          <h2 className="hero__title">
            Welcome back, {kid.emoji} {kid.firstName}!
          </h2>
          <p className="hero__motto">"{kid.motto}"</p>
          <div className="hero__cta">
            <button className="btn btn--primary" onClick={() => onTab("schedule")}>
              🗓️ Today's plan
            </button>
            <button className="btn btn--ghost" onClick={() => onTab("applications")}>
              🧭 My apps
            </button>
            <button className="btn btn--ghost" onClick={() => onTab("missions")}>
              🎯 Missions
            </button>
          </div>
        </div>
        <div className="hero__now">
          {currentBlock ? (
            <>
              <span className="hero__now-tag">Happening now</span>
              <span className="hero__now-emoji">{currentBlock.emoji}</span>
              <strong className="hero__now-title">{currentBlock.title}</strong>
              <span className="hero__now-time">{currentBlock.time}</span>
            </>
          ) : upcomingBlock ? (
            <>
              <span className="hero__now-tag">Coming up</span>
              <span className="hero__now-emoji">{upcomingBlock.emoji}</span>
              <strong className="hero__now-title">{upcomingBlock.title}</strong>
              <span className="hero__now-time">{upcomingBlock.time}</span>
            </>
          ) : (
            <>
              <span className="hero__now-tag">All done for today</span>
              <span className="hero__now-emoji">🌙</span>
              <strong className="hero__now-title">Rest up, hero!</strong>
              <span className="hero__now-time">See you tomorrow</span>
            </>
          )}
        </div>
          </section>

          {(() => {
            const goalDone = dailyGoalDone(state, kid.id);
            const goalMet = goalDone >= DAILY_GOAL;
            const streak = computeStreak(state, kid.id);
            return (
              <section className={`goalcard ${goalMet ? "is-met" : ""}`}>
                <ProgressRing
                  progress={Math.min(1, goalDone / DAILY_GOAL)}
                  color={kid.color}
                  size={74}
                >
                  <span className="goalcard__count">
                    {goalMet ? "✓" : `${goalDone}/${DAILY_GOAL}`}
                  </span>
                </ProgressRing>
                <div className="goalcard__body">
                  <strong className="goalcard__title">
                    {goalMet ? "🎯 Daily goal complete!" : "🎯 Today's Goal"}
                  </strong>
                  <span className="goalcard__sub">
                    {goalMet
                      ? `Amazing — ${goalDone} tasks done today!`
                      : `Finish ${DAILY_GOAL - goalDone} more to hit your goal.`}
                  </span>
                  {streak > 0 && (
                    <span className="goalcard__streak">
                      🔥 {streak}-day streak
                    </span>
                  )}
                </div>
                {!goalMet && (
                  <button
                    className="btn btn--primary btn--sm"
                    onClick={() => onTab("missions")}
                  >
                    Pick a mission →
                  </button>
                )}
              </section>
            );
          })()}

          <FamilyGoalBar />

          {mandatory && (
            <>
              <div className="section-row">
                <h3 className="section-title">
                  ⭐ {kid.firstName}'s Main App
                </h3>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => onTab("applications")}
                >
                  All apps →
                </button>
              </div>
              <div className="reqapp">
                <AppCard app={mandatory} required />
              </div>
            </>
          )}

          {chores.length > 0 && (
        <>
          <h3 className="section-title">
            🧹 Today's Chores{" "}
            <span className="section-tag">from a grown-up</span>
          </h3>
          <div className="chores" style={{ ["--cat" as string]: choreMeta.color }}>
            {chores.map((c) => {
              const activity = activityById(state, c.refId);
              if (!activity) return null;
              return (
                <div key={c.id} className="chore">
                  <span className="chore__icon">{choreMeta.emoji}</span>
                  <div className="chore__body">
                    <strong className="chore__title">{activity.title}</strong>
                    <span className="chore__meta">
                      ⚡ {activity.xp} XP · ⏱️ {activity.estimatedMinutes} min
                    </span>
                  </div>
                  <div className="chore__action">
                    <ProofButton
                      kidId={kid.id}
                      kind="mission"
                      refId={activity.id}
                      title={activity.title}
                      emoji={choreMeta.emoji}
                      xp={activity.xp}
                      subtitle="Snap a photo of your finished chore."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <h3 className="section-title">Your Corner</h3>
      <div className="crew crew--solo">
        <CrewCard kidId={state.activeKid} active />
      </div>

      <FamilyWall />

      <div className="section-row">
        <h3 className="section-title">🎯 Missions of the Day</h3>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => onTab("missions")}
        >
          More ideas →
        </button>
      </div>
      <p className="section-hint">
        Pick whichever fits today — sunny outside, cozy indoors, or one to do
        with a grown-up.
      </p>
      <div className="missionsday">
        {missions.map((m) => (
          <DailyMissionCard key={m.id} activity={m} kidId={kid.id} />
        ))}
      </div>

      <h3 className="section-title">
        🎨 Pick Your Look{" "}
        <span className="section-tag">mouse &amp; background</span>
      </h3>
      <div className="themepick">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`themecard ${activeTheme === t.id ? "is-active" : ""}`}
            onClick={() =>
              dispatch({ type: "SET_THEME", kidId: kid.id, theme: t.id })
            }
          >
            {activeTheme === t.id && (
              <span className="themecard__check">✓</span>
            )}
            <span className="themecard__emoji">{t.emoji}</span>
            <span className="themecard__name">{t.label}</span>
            <span className="themecard__preview">
              {t.background.floats.slice(0, 4).join(" ")}
            </span>
          </button>
        ))}
      </div>
        </div>
      </div>
    </div>
  );
}

function DailyMissionCard({
  activity,
  kidId,
}: {
  activity: ActivityIdea;
  kidId: KidId;
}) {
  const meta = CATEGORY_META[activity.category];
  const place =
    activity.indoorOutdoor === "outdoor"
      ? "🌳 Outdoor"
      : activity.indoorOutdoor === "indoor"
        ? "🏠 Indoor"
        : "🔁 Anywhere";
  return (
    <article className="dmission" style={{ ["--cat" as string]: meta.color }}>
      <div className="dmission__head">
        <span className="dmission__icon">{meta.emoji}</span>
        <div>
          <span className="dmission__cat">{meta.label}</span>
          <strong className="dmission__title">{activity.title}</strong>
        </div>
      </div>
      <div className="dmission__tags">
        <span className="tag">{place}</span>
        <span className="tag">⏱️ {activity.estimatedMinutes}m</span>
        <span className="tag">⚡ {activity.xp}</span>
        {activity.parentHelp && (
          <span className="tag tag--help">🧑‍🍼 Grown-up</span>
        )}
      </div>
      <ProofButton
        kidId={kidId}
        kind="mission"
        refId={activity.id}
        title={activity.title}
        emoji={meta.emoji}
        xp={activity.xp}
        subtitle="Snap a photo of your finished mission."
      />
    </article>
  );
}

function CrewCard({ kidId, active }: { kidId: KidId; active: boolean }) {
  const { state } = useApp();
  const kid = getKid(state, kidId);
  const level = getLevelInfo(getKidXp(state, kidId));
  const stats = computeStats(state, kidId);
  const today = getDay(state, kidId);
  const scheduleDone = today.scheduleDone.length;
  const scheduleLen = effectiveSchedule(state, kidId).length;

  const todaysSubs = state.submissions.filter(
    (s) => s.kidId === kidId && s.date === todayKey(),
  );
  const approvedToday = todaysSubs.filter((s) => s.status === "approved").length;
  const pendingToday = todaysSubs.filter((s) => s.status === "pending").length;

  return (
    <div
      className={`crewcard ${active ? "is-active" : ""}`}
      style={{
        ["--this-kid" as string]: kid.color,
        ["--this-kid-dark" as string]: kid.colorDark,
        ["--this-kid-soft" as string]: kid.colorSoft,
      }}
    >
      {active && <span className="crewcard__you">You</span>}
      <div className="crewcard__head">
        <ProgressRing progress={level.progress} color={kid.color} size={66}>
          <Avatar
            config={equippedAvatar(state, kidId)}
            size={52}
            className="crewcard__avatar"
          />
        </ProgressRing>
        <div className="crewcard__id">
          <strong className="crewcard__name">{kid.firstName}</strong>
          <span className="crewcard__rank">
            {level.rank.emoji} {level.rank.title} · Lv {level.rank.level}
          </span>
        </div>
      </div>
      <div className="crewcard__stats">
        <div className="stat">
          <span className="stat__num">{stats.totalXp}</span>
          <span className="stat__lbl">XP</span>
        </div>
        <div className="stat">
          <span className="stat__num">🔥 {stats.streak}</span>
          <span className="stat__lbl">streak</span>
        </div>
        <div className="stat">
          <span className="stat__num">🪙 {coinBalance(state, kidId)}</span>
          <span className="stat__lbl">coins</span>
        </div>
      </div>
      <div className="crewcard__today">
        <span>
          {scheduleDone}/{scheduleLen} schedule · {approvedToday} done
        </span>
        {pendingToday > 0 && (
          <span className="crewcard__pending">⏳ {pendingToday} pending</span>
        )}
      </div>
    </div>
  );
}

const ANN_DISMISS_KEY = "kids-corner:annDismissed";
function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ANN_DISMISS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Grown-up broadcasts, shown to the kid until they dismiss each one. */
function AnnouncementBanner() {
  const { state } = useApp();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const visible = activeAnnouncements(state)
    .filter((a) => !dismissed.includes(a.id))
    .slice(0, 3);
  if (!visible.length) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(ANN_DISMISS_KEY, JSON.stringify(next.slice(-100)));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="announce">
      {visible.map((a) => (
        <div key={a.id} className="announce__item">
          <span className="announce__icon">📣</span>
          <span className="announce__text">{a.text}</span>
          <button
            className="announce__x"
            aria-label="Dismiss announcement"
            onClick={() => dismiss(a.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/** A shared progress bar toward the grown-up-set family goal. */
function FamilyGoalBar() {
  const { state } = useApp();
  const g = state.familyGoal;
  if (!g) return null;
  const done = familyGoalProgress(state);
  const pct = Math.min(1, done / g.target);
  const reached = done >= g.target;
  return (
    <section className={`famgoal ${reached ? "is-won" : ""}`}>
      <span className="famgoal__icon">🏡</span>
      <div className="famgoal__body">
        <strong className="famgoal__title">
          {reached ? "🎉 Family goal reached!" : "Family Goal — everyone helps!"}
        </strong>
        <span className="famgoal__sub">
          {reached
            ? `You all earned: ${g.reward}! 🎁`
            : `${done}/${g.target} tasks done together → ${g.reward}`}
        </span>
        <div className="famgoal__bar">
          <span style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

/** Recent finished-task photos from every kid, with sticker reactions. */
function FamilyWall() {
  const { state, dispatch } = useApp();
  const me = state.activeKid;
  const photos = sharedPhotos(state, 12);
  const [zoom, setZoom] = useState("");
  if (!photos.length) return null;
  return (
    <>
      <h3 className="section-title">
        📸 Family Wall <span className="section-tag">cheer each other on</span>
      </h3>
      <div className="wall">
        {photos.map((s) => {
          const kid = getKid(state, s.kidId);
          const summary = reactionSummary(state, s.id, me);
          return (
            <div
              key={s.id}
              className="wallcard"
              style={{ ["--this-kid" as string]: kid.color }}
            >
              <button
                className="wallcard__photo"
                onClick={() => setZoom(s.photo)}
                aria-label={`See ${kid.firstName}'s ${s.title} bigger`}
              >
                <img src={s.photo} alt={s.title} loading="lazy" />
              </button>
              <div className="wallcard__who">
                <Avatar
                  config={equippedAvatar(state, kid.id)}
                  size={24}
                  className="wallcard__av"
                />
                <span className="wallcard__name">{kid.firstName}</span>
                <span className="wallcard__task">
                  {s.emoji} {s.title}
                </span>
              </div>
              <div className="wallcard__reacts">
                {summary.map((r) => (
                  <button
                    key={r.emoji}
                    className={`react ${r.mine ? "is-mine" : ""} ${
                      r.count ? "has-count" : ""
                    }`}
                    onClick={() =>
                      dispatch({
                        type: "TOGGLE_REACTION",
                        submissionId: s.id,
                        by: me,
                        emoji: r.emoji,
                      })
                    }
                  >
                    <span className="react__emoji">{r.emoji}</span>
                    {r.count > 0 && <span className="react__n">{r.count}</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {zoom &&
        createPortal(
          <div className="modal" onClick={() => setZoom("")}>
            <img className="zoom" src={zoom} alt="Photo enlarged" />
          </div>,
          document.body,
        )}
    </>
  );
}
