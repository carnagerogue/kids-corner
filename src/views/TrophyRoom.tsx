import { useApp } from "../store/AppContext";
import { getLevelInfo, RANKS } from "../data/levels";
import { BADGES } from "../data/badges";
import { computeStats, getKid, getKidXp } from "../store/selectors";
import { ProgressRing } from "../components/ProgressRing";

export function TrophyRoom() {
  const { state } = useApp();
  const kid = getKid(state, state.activeKid);
  const kidState = state.kids[kid.id] ?? { badges: [], history: {} };
  const totalXp = getKidXp(state, kid.id);
  const level = getLevelInfo(totalXp);
  const stats = computeStats(state, kid.id);
  const earnedBadges = new Set(kidState.badges);

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🏆 Trophy Room</h2>
          <p className="view__sub">
            {kid.emoji} {kid.firstName}'s rewards & rank
          </p>
        </div>
      </div>

      <section className="rankcard">
        <ProgressRing progress={level.progress} size={120} stroke={11}>
          <div className="rankcard__ring">
            <span className="rankcard__ring-emoji">{level.rank.emoji}</span>
            <span className="rankcard__ring-lvl">Lv {level.rank.level}</span>
          </div>
        </ProgressRing>
        <div className="rankcard__body">
          <span className="rankcard__rank">{level.rank.title}</span>
          <span className="rankcard__xp">{totalXp} total XP</span>
          {level.next ? (
            <span className="rankcard__next">
              {level.xpForLevel - level.xpIntoLevel} XP to {level.next.emoji}{" "}
              {level.next.title}
            </span>
          ) : (
            <span className="rankcard__next">🌟 Max rank reached — legend!</span>
          )}
        </div>
        <div className="rankcard__quickstats">
          <div className="qs">
            <span className="qs__num">🔥 {stats.streak}</span>
            <span className="qs__lbl">day streak</span>
          </div>
          <div className="qs">
            <span className="qs__num">🎯 {stats.totalMissions}</span>
            <span className="qs__lbl">missions</span>
          </div>
          <div className="qs">
            <span className="qs__num">📚 {stats.totalAssignments}</span>
            <span className="qs__lbl">assignments</span>
          </div>
          <div className="qs">
            <span className="qs__num">
              🏅 {earnedBadges.size}/{BADGES.length}
            </span>
            <span className="qs__lbl">badges</span>
          </div>
        </div>
      </section>

      <h3 className="section-title">🏅 Badges</h3>
      <div className="badges">
        {BADGES.map((b) => {
          const earned = earnedBadges.has(b.id);
          return (
            <div key={b.id} className={`badge ${earned ? "is-earned" : ""}`}>
              <span className="badge__emoji">{earned ? b.emoji : "🔒"}</span>
              <strong className="badge__title">{b.title}</strong>
              <span className="badge__desc">{b.description}</span>
              {earned && <span className="badge__earned">Earned!</span>}
            </div>
          );
        })}
      </div>

      <h3 className="section-title">📈 Rank Ladder</h3>
      <div className="ladder">
        {RANKS.map((r) => {
          const reached = totalXp >= r.minXp;
          const current = r.level === level.rank.level;
          return (
            <div
              key={r.level}
              className={`ladder__step ${reached ? "is-reached" : ""} ${
                current ? "is-current" : ""
              }`}
            >
              <span className="ladder__emoji">{r.emoji}</span>
              <span className="ladder__title">{r.title}</span>
              <span className="ladder__xp">{r.minXp} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
