import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { getLevelInfo } from "../data/levels";
import {
  choreAssignmentsFor,
  computeStats,
  getDay,
  getKidXp,
} from "../store/selectors";
import { todayKey } from "../store/storage";
import { SCHEDULE } from "../data/schedule";
import {
  ACTIVITY_BY_ID,
  CATEGORY_META,
  NON_CHORE_ACTIVITIES,
} from "../data/activities";
import { ProgressRing } from "../components/ProgressRing";
import { ProofButton } from "../components/ProofButton";
import { useClock, minutesSinceMidnight } from "../hooks/useClock";
import type { TabId } from "../App";
import type { KidId } from "../types";

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function CommandCenter({ onTab }: { onTab: (t: TabId) => void }) {
  const { state } = useApp();
  const now = useClock();
  const kid = KIDS[state.activeKid];
  const nowMin = minutesSinceMidnight(now);

  const currentBlock = SCHEDULE.find(
    (b) => nowMin >= b.startMinutes && nowMin < b.endMinutes,
  );
  const upcomingBlock = SCHEDULE.find((b) => b.startMinutes > nowMin);

  // Featured mission is stable for the whole day (chores are excluded —
  // those are assigned by a grown-up, not auto-suggested).
  const featured =
    NON_CHORE_ACTIVITIES[dayOfYear(now) % NON_CHORE_ACTIVITIES.length];
  const featuredMeta = CATEGORY_META[featured.category];

  // Chores a grown-up assigned to this kid for today.
  const chores = choreAssignmentsFor(state, kid.id);
  const choreMeta = CATEGORY_META.chores;

  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="view">
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

      <h3 className="section-title">⭐ Featured Mission of the Day</h3>
      <div className="featured" style={{ ["--cat" as string]: featuredMeta.color }}>
        <div className="featured__icon">{featuredMeta.emoji}</div>
        <div className="featured__body">
          <span className="featured__cat">{featuredMeta.label}</span>
          <strong className="featured__title">{featured.title}</strong>
          <span className="featured__meta">
            ⏱️ {featured.estimatedMinutes} min · ⚡ {featured.xp} XP ·{" "}
            {featured.indoorOutdoor === "outdoor"
              ? "🌳 Outdoor"
              : featured.indoorOutdoor === "indoor"
                ? "🏠 Indoor"
                : "🔁 Anywhere"}
          </span>
        </div>
        <div className="featured__cta">
          <ProofButton
            kidId={kid.id}
            kind="mission"
            refId={featured.id}
            title={featured.title}
            emoji={featuredMeta.emoji}
            xp={featured.xp}
            subtitle="Snap a photo of your finished mission."
          />
        </div>
      </div>
    </div>
  );
}

function CrewCard({ kidId, active }: { kidId: KidId; active: boolean }) {
  const { state } = useApp();
  const kid = KIDS[kidId];
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
