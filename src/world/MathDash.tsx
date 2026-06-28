// ---------------------------------------------------------------------------
// MathDash — a 30-second rapid-fire arithmetic mini-game. Multiple choice,
// procedurally generated and scaled to the player's level. Pure DOM + a
// setInterval timer, so it runs fine even where the 3D loop is paused.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { genMathProblem, type MathProblem } from "./arcadeContent";

const DURATION = 30;

export function MathDash({
  level,
  onFinish,
}: {
  level: number;
  onFinish: (score: number) => void;
}) {
  const [problem, setProblem] = useState<MathProblem>(() => genMathProblem(level));
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [flash, setFlash] = useState<null | boolean>(null);
  const scoreRef = useRef(0);
  const finished = useRef(false);

  // Tick down once per second.
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timeLeft]);

  // Report the final score once when the clock runs out.
  useEffect(() => {
    if (timeLeft <= 0 && !finished.current) {
      finished.current = true;
      onFinish(scoreRef.current);
    }
  }, [timeLeft, onFinish]);

  const pick = (choice: number) => {
    if (timeLeft <= 0) return;
    const correct = choice === problem.answer;
    if (correct) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    setFlash(correct);
    setProblem(genMathProblem(level));
  };

  const pct = Math.max(0, (timeLeft / DURATION) * 100);

  return (
    <div className={`arcade__play dash${flash === false ? " is-wrong" : ""}`}>
      <div className="dash__hud">
        <span className="dash__score">⭐ {score}</span>
        <span className="dash__time">⏱️ {timeLeft}s</span>
      </div>
      <div className="dash__timebar">
        <span style={{ width: `${pct}%` }} />
      </div>

      <p className="dash__problem">{problem.prompt} = ?</p>

      <div className="dash__choices">
        {problem.choices.map((c) => (
          <button key={c} className="dash__choice" onClick={() => pick(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="dash__hint">Tap the right answer — go fast!</p>
    </div>
  );
}
