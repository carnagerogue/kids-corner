import { useApp } from "../store/AppContext";
import { KIDS, KID_LIST } from "../data/kids";
import { getLevelInfo } from "../data/levels";
import {
  computeStats,
  getDay,
  getKidXp,
} from "../store/selectors";
import { todayKey } from "../store/storage";
import { SCHEDULE } from "../data/schedule";
import { ACTIVITIES, CATEGORY_META } from "../data/activities";
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

  // Featured mission is stable for the whole day.
  const featured = ACTIVITIES[dayOfYear(now) % ACTIVITIES.length];
  const featuredMeta = CATEGORY_META[featured.category];

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

      <h3 className="section-title">The Crew</h3>
      <div className="crew">
        {KID_LIST.map((k) => (
          <CrewCard
            key={k.id}
            kidId={k.id}
            active={k.id === state.activeKid}
            onPick={() => onTab("home")}
          />
        ))}
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

function CrewCard({
  kidId,
  active,
  onPick,
}: {
  kidId: KidId;
  active: boolean;
  onPick: () => void;
}) {
  const { state, dispatch } = useApp();
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
    <button
      className={`crewcard ${active ? "is-active" : ""}`}
      style={{
        ["--this-kid" as string]: kid.color,
        ["--this-kid-dark" as string]: kid.colorDark,
        ["--this-kid-soft" as string]: kid.colorSoft,
      }}
      onClick={() => {
        dispatch({ type: "SET_ACTIVE_KID", kidId });
        onPick();
      }}
    >
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
    </button>
  );
}
