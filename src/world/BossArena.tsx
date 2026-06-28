// ---------------------------------------------------------------------------
// BossArena — a co-op daily raid against Professor Prism. Every raider's correct
// answers chip the SAME shared puzzle-shield (a date-keyed Firebase counter, so
// siblings in the family room can drain it together). Works solo too — then the
// shield is just yours to crack. Defeat it before you run out of hearts.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import type { AcademyQuestion } from "./academyQuests";
import { levelTitle } from "./academyQuests";
import type { Creature } from "./worldBattles";
import { recordBossHit, subscribeBoss, type BossState } from "./worldSync";

type Props = {
  creature: Creature;
  questions: AcademyQuestion[];
  level: number;
  dateStr: string;
  kidId: string;
  onCorrect: () => void;
  onWin: () => void;
  onClose: () => void;
};

type Phase = "intro" | "raid" | "win" | "lose";

export function BossArena({
  creature,
  questions,
  level,
  dateStr,
  kidId,
  onCorrect,
  onWin,
  onClose,
}: Props) {
  const bossHp = creature.bossHp ?? 12;
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [hearts, setHearts] = useState(creature.hearts);
  const [picked, setPicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const [myHits, setMyHits] = useState(0);
  const [shared, setShared] = useState<BossState>({ hits: {}, total: 0 });
  const won = useRef(false);

  // Live shared shield (includes siblings' contributions when synced).
  useEffect(() => subscribeBoss(dateStr, setShared), [dateStr]);

  const progress = Math.min(bossHp, Math.max(myHits, shared.total));
  const raiders = Math.max(1, Object.keys(shared.hits).length);

  // Win the moment the shared shield is cracked (once).
  useEffect(() => {
    if (!won.current && phase === "raid" && progress >= bossHp) {
      won.current = true;
      setPhase("win");
      onWin();
    }
  }, [progress, bossHp, phase, onWin]);

  const question = questions[Math.min(qIndex, questions.length - 1)];

  const pick = (i: number) => {
    if (solved || phase !== "raid") return;
    if (i === question.answer) {
      setPicked(i);
      setSolved(true);
      onCorrect();
      const mine = myHits + 1;
      setMyHits(mine);
      recordBossHit(dateStr, kidId, mine);
    } else {
      setPicked(i);
      setWrong((prev) => new Set(prev).add(i));
      const remaining = hearts - 1;
      setHearts(remaining);
      if (remaining <= 0) setPhase("lose");
    }
  };

  const next = () => {
    setQIndex((n) => Math.min(n + 1, questions.length - 1));
    setPicked(null);
    setSolved(false);
    setWrong(new Set());
  };

  const restart = () => {
    setPhase("raid");
    setQIndex(0);
    setHearts(creature.hearts);
    setPicked(null);
    setSolved(false);
    setWrong(new Set());
  };

  const pct = Math.round((progress / bossHp) * 100);

  return (
    <div className="academy battle boss" role="dialog" aria-modal="true" aria-labelledby="boss-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Leave raid">
          ×
        </button>
        <div className="academy__head">
          <h3 id="boss-title">
            {creature.emoji} {creature.name}
          </h3>
          <span className="academy__lv">
            🎓 Lv {level} · {levelTitle(level)}
          </span>
        </div>

        {phase === "intro" && (
          <>
            <div className="battle__creature boss__creature" style={{ background: creature.color }}>
              <span>{creature.emoji}</span>
            </div>
            <p className="academy__intro">{creature.intro}</p>
            <button className="academy__next" onClick={() => setPhase("raid")}>
              Join the raid! 🛡️
            </button>
          </>
        )}

        {phase === "raid" && (
          <>
            <div className="boss__shield">
              <div className="boss__shieldhead">
                <span>🛡️ Puzzle-shield</span>
                <span>
                  {progress}/{bossHp}
                </span>
              </div>
              <div className="boss__shieldbar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="boss__raiders">
                {raiders > 1 ? `${raiders} explorers raiding together!` : "Raiding solo — every answer counts!"}
                {"  ·  "}
                <span className="boss__hearts">
                  {Array.from({ length: creature.hearts }, (_, i) => (
                    <span key={i}>{i < hearts ? "❤️" : "🤍"}</span>
                  ))}
                </span>
              </div>
            </div>

            <p className="academy__q">{question.prompt}</p>

            <div className="academy__choices">
              {question.choices.map((choice, i) => {
                const cls =
                  solved && i === question.answer
                    ? "is-correct"
                    : wrong.has(i)
                      ? "is-wrong"
                      : "";
                return (
                  <button
                    key={i}
                    className={`academy__choice ${cls}`.trim()}
                    onClick={() => pick(i)}
                    disabled={solved}
                  >
                    <span className="academy__choicekey">{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                );
              })}
            </div>

            {solved ? (
              <div className="academy__feedback is-right" role="status">
                💥 {question.explain}
              </div>
            ) : picked !== null ? (
              <div className="academy__feedback is-hint" role="status">
                💡 {question.hint} Try again!
              </div>
            ) : (
              <div className="academy__feedback academy__feedback--placeholder" aria-hidden="true" />
            )}

            <button className="academy__next" onClick={next} disabled={!solved}>
              Next strike →
            </button>
          </>
        )}

        {phase === "win" && (
          <>
            <div className="battle__creature is-friend boss__creature" style={{ background: creature.color }}>
              <span>{creature.emoji}</span>
              <span className="battle__heart">🏆</span>
            </div>
            <p className="academy__reward">
              🎉 The Ring is yours! <strong>{creature.name}</strong> is defeated!
            </p>
            <p className="academy__intro">{creature.winLine}</p>
            <button className="academy__next" onClick={onClose}>
              Claim your champion reward 🏆
            </button>
          </>
        )}

        {phase === "lose" && (
          <>
            <div className="battle__creature boss__creature" style={{ background: creature.color }}>
              <span>{creature.emoji}</span>
            </div>
            <p className="academy__intro">{creature.loseLine}</p>
            <div className="battle__actions">
              <button className="academy__next" onClick={restart}>
                Strike again ⚔️
              </button>
              <button className="battle__leave" onClick={onClose}>
                Retreat
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
