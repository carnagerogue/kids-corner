// ---------------------------------------------------------------------------
// WorldArcade — the mini-game hub: pick Word Scramble or Math Dash, play, and
// earn tokens + XP scaled by your score. Pure UI; WorldView grants the reward.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { WordScramble } from "./WordScramble";
import { MathDash } from "./MathDash";

type Mode = "menu" | "scramble" | "mathdash" | "result";
type Result = { game: string; score: string; tokens: number; xp: number };

export function WorldArcade({
  level,
  tokens,
  onReward,
  onClose,
}: {
  level: number;
  tokens: number;
  onReward: (tokens: number, xp: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>("menu");
  const [result, setResult] = useState<Result | null>(null);

  const finishScramble = (solved: number, total: number) => {
    const t = solved * 5;
    const xp = solved * 6;
    onReward(t, xp);
    setResult({ game: "Word Scramble", score: `${solved}/${total} words`, tokens: t, xp });
    setMode("result");
  };
  const finishDash = (score: number) => {
    const t = score * 2;
    const xp = score * 3;
    onReward(t, xp);
    setResult({ game: "Math Dash", score: `${score} solved`, tokens: t, xp });
    setMode("result");
  };

  return (
    <div className="academy arcade" role="dialog" aria-modal="true" aria-labelledby="arcade-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Leave arcade">
          ×
        </button>
        <div className="academy__head">
          <h3 id="arcade-title">🎮 Arcade</h3>
          <span className="academy__lv">🪙 {tokens}</span>
        </div>

        {mode === "menu" && (
          <div className="arcade__menu">
            <p className="arcade__intro">
              Quick games for extra 🪙 tokens and ⭐ XP. Pick one!
            </p>
            <button className="arcade__game" onClick={() => setMode("scramble")}>
              <span className="arcade__gameicon">🔤</span>
              <span className="arcade__gametext">
                <strong>Word Scramble</strong>
                <small>Unscramble the letters to spell each word — 5 a round.</small>
              </span>
            </button>
            <button className="arcade__game" onClick={() => setMode("mathdash")}>
              <span className="arcade__gameicon">⚡</span>
              <span className="arcade__gametext">
                <strong>Math Dash</strong>
                <small>Solve as many problems as you can in 30 seconds!</small>
              </span>
            </button>
          </div>
        )}

        {mode === "scramble" && <WordScramble onFinish={finishScramble} />}
        {mode === "mathdash" && <MathDash level={level} onFinish={finishDash} />}

        {mode === "result" && result && (
          <div className="arcade__result">
            <span className="arcade__resulticon">🎉</span>
            <strong>{result.game} complete!</strong>
            <p className="arcade__score">
              You got <b>{result.score}</b>.
            </p>
            <p className="arcade__earned">
              Earned 🪙 {result.tokens} · ⭐ {result.xp} XP
            </p>
            <button className="academy__next" onClick={() => setMode("menu")}>
              Back to the Arcade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
