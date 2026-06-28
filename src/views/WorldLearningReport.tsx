// ---------------------------------------------------------------------------
// WorldLearningReport — a grown-ups view that turns each child's 3D-World play
// into learning insight: per-subject accuracy, quests finished, badges, streak.
// Reads each kid's own localStorage progress (the World stores per-kid), so it
// works for every child from the parent dashboard without any extra plumbing.
// ---------------------------------------------------------------------------
import { useApp } from "../store/AppContext";
import { kidList } from "../store/selectors";
import {
  ACADEMY_QUESTS,
  currentStreak,
  levelForXp,
  levelTitle,
  loadAcademy,
  todayStr,
} from "../world/academyQuests";
import { ACHIEVEMENTS, earnedAchievements } from "../world/achievements";
import { CREATURES } from "../world/worldBattles";
import { loadWorldSave } from "../world/worldGame";

const SUBJECTS = [
  { key: "reading", label: "Reading", emoji: "📚" },
  { key: "math", label: "Math", emoji: "🛠️" },
  { key: "science", label: "Science", emoji: "🔭" },
] as const;

export function WorldLearningReport() {
  const { state } = useApp();
  const kids = kidList(state);
  const today = todayStr();
  const buddyCount = CREATURES.filter((c) => !c.boss).length;

  return (
    <div className="wreport">
      <h3 className="section-title">🌍 World Learning Report</h3>
      <p className="wreport__intro">
        How each child is doing in the 3D World — accuracy by subject, quests
        finished, and badges earned. A bar turns red when accuracy dips below 70%.
      </p>

      {kids.map((kid) => {
        const academy = loadAcademy(kid.id);
        const world = loadWorldSave(kid.id);
        const level = levelForXp(academy.xp);
        const badges = earnedAchievements(academy, world).length;
        const tries = SUBJECTS.reduce(
          (n, s) => n + (academy.subjects[s.key]?.tries ?? 0),
          0,
        );
        const correct = SUBJECTS.reduce(
          (n, s) => n + (academy.subjects[s.key]?.correct ?? 0),
          0,
        );
        const overall = tries ? Math.round((correct / tries) * 100) : null;
        const questsDone = ACADEMY_QUESTS.filter(
          (q) => (academy.chaptersDone[q.questId] ?? 0) >= q.chapters.length,
        ).length;
        const streak = currentStreak(academy, today);

        return (
          <div
            key={kid.id}
            className="wreport__kid"
            style={{ ["--this-kid" as string]: kid.color }}
          >
            <div className="wreport__head">
              <span className="wreport__emoji">{kid.emoji}</span>
              <div className="wreport__id">
                <strong>{kid.firstName}</strong>
                <span>
                  🎓 Lv {level} · {levelTitle(level)}
                  {overall !== null && ` · ${overall}% accurate`}
                </span>
              </div>
              <span className="wreport__xp">{academy.xp} XP</span>
            </div>

            {tries === 0 ? (
              <p className="wreport__empty">Hasn&apos;t played the World yet.</p>
            ) : (
              <div className="wreport__subjects">
                {SUBJECTS.map((s) => {
                  const st = academy.subjects[s.key];
                  const t = st?.tries ?? 0;
                  const pct = t ? Math.round(((st?.correct ?? 0) / t) * 100) : 0;
                  const low = t >= 4 && pct < 70;
                  return (
                    <div key={s.key} className="wreport__subject">
                      <span className="wreport__slabel">
                        {s.emoji} {s.label}
                      </span>
                      <div className="wreport__bar">
                        <span
                          className={low ? "is-low" : ""}
                          style={{ width: `${t ? pct : 0}%` }}
                        />
                      </div>
                      <span className="wreport__pct">
                        {t ? `${pct}%` : "—"}
                        <small>
                          {" "}
                          ({st?.correct ?? 0}/{t})
                        </small>
                        {low && <em className="wreport__flag"> needs practice</em>}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wreport__stats">
              <span>
                🏅 {badges}/{ACHIEVEMENTS.length} badges
              </span>
              <span>
                📜 {questsDone}/{ACADEMY_QUESTS.length} quests
              </span>
              <span>
                💚 {Math.min(academy.befriended.length, buddyCount)}/{buddyCount}{" "}
                buddies
              </span>
              <span>🔥 {streak} day streak</span>
              <span>🌈 {academy.bossWins} raids</span>
              <span>✅ {academy.correct} answered</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
