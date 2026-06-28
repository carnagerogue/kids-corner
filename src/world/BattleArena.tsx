// ---------------------------------------------------------------------------
// BattleArena — a friendly, turn-based "challenge battle" against a brain
// creature. You solve the creature's puzzles (subject questions) to fill a
// puzzle meter; wrong answers cost a heart (no harsh fail — out of hearts just
// offers a rematch). Filling the meter befriends the creature. Pure UI/flow;
// WorldView owns XP/token/collection persistence via callbacks.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { AcademyQuestion } from "./academyQuests";
import { levelTitle } from "./academyQuests";
import type { Creature } from "./worldBattles";

type Props = {
  creature: Creature;
  questions: AcademyQuestion[];
  level: number;
  alreadyFriend: boolean;
  /** Called on every answer attempt (true = correct). Awards XP + tracks accuracy. */
  onAnswer: (correct: boolean) => void;
  /** Befriend + award the win bonus + tokens. */
  onWin: () => void;
  onClose: () => void;
};

type Phase = "intro" | "battle" | "win" | "lose";

export function BattleArena({
  creature,
  questions,
  level,
  alreadyFriend,
  onAnswer,
  onWin,
  onClose,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [qIndex, setQIndex] = useState(0);
  const [hearts, setHearts] = useState(creature.hearts);
  const [picked, setPicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());

  const question = questions[Math.min(qIndex, questions.length - 1)];
  const isLast = qIndex === creature.puzzleLength - 1;

  const pick = (i: number) => {
    if (solved || phase !== "battle" || wrong.has(i)) return; // ignore re-taps on a wrong choice
    const correct = i === question.answer;
    onAnswer(correct);
    setPicked(i);
    if (correct) {
      setSolved(true);
    } else {
      setWrong((prev) => new Set(prev).add(i));
      const remaining = hearts - 1;
      setHearts(remaining);
      if (remaining <= 0) setPhase("lose");
    }
  };

  const next = () => {
    const advanced = qIndex + 1;
    if (advanced >= creature.puzzleLength) {
      setPhase("win");
      onWin();
      return;
    }
    setQIndex(advanced);
    setPicked(null);
    setSolved(false);
    setWrong(new Set());
  };

  const restart = () => {
    setPhase("battle");
    setQIndex(0);
    setHearts(creature.hearts);
    setPicked(null);
    setSolved(false);
    setWrong(new Set());
  };

  return (
    <div className="academy battle" role="dialog" aria-modal="true" aria-labelledby="battle-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Leave battle">
          ×
        </button>
        <div className="academy__head">
          <h3 id="battle-title">
            {creature.emoji} {creature.name}
          </h3>
          <span className="academy__lv">
            🎓 Lv {level} · {levelTitle(level)}
          </span>
        </div>

        {phase === "intro" && (
          <>
            <div className="battle__creature" style={{ background: creature.color }}>
              <span>{creature.emoji}</span>
            </div>
            <p className="academy__intro">{creature.intro}</p>
            <button className="academy__next" onClick={() => setPhase("battle")}>
              {alreadyFriend ? "Rematch! ⚔️" : "Begin the duel! ⚔️"}
            </button>
          </>
        )}

        {phase === "battle" && (
          <>
            <div className="battle__status">
              <span className="battle__meter" aria-label={`${qIndex} of ${creature.puzzleLength} puzzles solved`}>
                {Array.from({ length: creature.puzzleLength }, (_, i) => (
                  <span
                    key={i}
                    className={`battle__pip${i < qIndex || (i === qIndex && solved) ? " is-solved" : ""}`}
                  />
                ))}
              </span>
              <span className="battle__hearts" aria-label={`${hearts} hearts left`}>
                {Array.from({ length: creature.hearts }, (_, i) => (
                  <span key={i}>{i < hearts ? "❤️" : "🤍"}</span>
                ))}
              </span>
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
                ✨ {question.explain}
              </div>
            ) : picked !== null ? (
              <div className="academy__feedback is-hint" role="status">
                💡 {question.hint} Try again!
              </div>
            ) : (
              <div className="academy__feedback academy__feedback--placeholder" aria-hidden="true" />
            )}

            <button className="academy__next" onClick={next} disabled={!solved}>
              {isLast ? "Finish the duel! ⭐" : "Next puzzle →"}
            </button>
          </>
        )}

        {phase === "win" && (
          <>
            <div className="battle__creature is-friend" style={{ background: creature.color }}>
              <span>{creature.emoji}</span>
              <span className="battle__heart">💚</span>
            </div>
            <p className="academy__reward">
              🎉 You befriended <strong>{creature.name}</strong>!
            </p>
            <p className="academy__intro">{creature.winLine}</p>
            <button className="academy__next" onClick={onClose}>
              Add to Brain Buddies 💚
            </button>
          </>
        )}

        {phase === "lose" && (
          <>
            <div className="battle__creature" style={{ background: creature.color }}>
              <span>{creature.emoji}</span>
            </div>
            <p className="academy__intro">{creature.loseLine}</p>
            <div className="battle__actions">
              <button className="academy__next" onClick={restart}>
                Try again ⚔️
              </button>
              <button className="battle__leave" onClick={onClose}>
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
