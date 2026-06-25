import { useApp } from "../store/AppContext";
import { getLevelInfo } from "../data/levels";
import {
  choreAssignmentsFor,
  computeStats,
  getDay,
  getKid,
  getKidXp,
  primaryAppFor,
} from "../store/selectors";
import { todayKey } from "../store/storage";
import { SCHEDULE } from "../data/schedule";
import {
  ACTIVITY_BY_ID,
  CATEGORY_META,
  NON_CHORE_ACTIVITIES,
} from "../data/activities";
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

  const currentBlock = SCHEDULE.find(
    (b) => nowMin >= b.startMinutes && nowMin < b.endMinutes,
  );
  const upcomingBlock = SCHEDULE.find((b) => b.startMinutes > nowMin);

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
              const activity = ACTIVITY_BY_ID[c.refId];
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
          <span className="crewcard__avatar">{kid.emoji}</span>
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
          <span className="stat__num">🏅 {state.kids[kidId].badges.length}</span>
          <span className="stat__lbl">badges</span>
        </div>
      </div>
      <div className="crewcard__today">
        <span>
          {scheduleDone}/{SCHEDULE.length} schedule · {approvedToday} done
        </span>
        {pendingToday > 0 && (
          <span className="crewcard__pending">⏳ {pendingToday} pending</span>
        )}
      </div>
    </div>
  );
}
