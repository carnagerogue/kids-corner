// ---------------------------------------------------------------------------
// WordScramble — tap the scrambled letter tiles, in order, to spell the hinted
// word. Five words per round; a Hint places the next correct letter and Skip
// moves on. Pure DOM, so it runs anywhere.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { SCRAMBLE_WORDS, scramble } from "./arcadeContent";

const ROUND = 5;

function pickWords(n: number) {
  const a = [...SCRAMBLE_WORDS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function WordScramble({
  onFinish,
}: {
  onFinish: (solved: number, total: number) => void;
}) {
  const words = useMemo(() => pickWords(ROUND), []);
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "right" | "wrong">("idle");
  const solvedRef = useRef(0);
  const word = words[idx];
  const tiles = useMemo(
    () => scramble(word.word).map((char, i) => ({ id: i, char })),
    [word],
  );

  const advance = () => {
    setStatus("idle");
    setPlaced([]);
    if (idx + 1 >= words.length) onFinish(solvedRef.current, words.length);
    else setIdx(idx + 1);
  };

  // Auto-check when the answer row fills up.
  useEffect(() => {
    if (status !== "idle" || placed.length !== word.word.length) return;
    const guess = placed
      .map((id) => tiles.find((t) => t.id === id)?.char)
      .join("");
    if (guess === word.word) {
      solvedRef.current += 1;
      setStatus("right");
      const id = window.setTimeout(advance, 950);
      return () => window.clearTimeout(id);
    }
    setStatus("wrong");
    const id = window.setTimeout(() => {
      setPlaced([]);
      setStatus("idle");
    }, 750);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);

  const tapTile = (id: number) => {
    if (status !== "idle" || placed.includes(id)) return;
    setPlaced((p) => [...p, id]);
  };
  const tapPlaced = (id: number) => {
    if (status !== "idle") return;
    setPlaced((p) => p.filter((x) => x !== id));
  };
  const hint = () => {
    if (status !== "idle") return;
    const next = word.word[placed.length];
    const tile = tiles.find((t) => t.char === next && !placed.includes(t.id));
    if (tile) setPlaced((p) => [...p, tile.id]);
  };
  const skip = () => {
    if (status === "idle") advance();
  };

  return (
    <div className={`arcade__play scram is-${status}`}>
      <div className="scram__top">
        <span>
          📖 Word {idx + 1}/{words.length}
        </span>
        <span>✅ {solvedRef.current}</span>
      </div>
      <p className="scram__clue">{word.hint}</p>

      <div className="scram__answer">
        {Array.from({ length: word.word.length }, (_, i) => {
          const id = placed[i];
          const tile = id !== undefined ? tiles.find((t) => t.id === id) : undefined;
          return (
            <button
              key={i}
              className={`scram__slot${tile ? " is-filled" : ""}`}
              onClick={() => tile && tapPlaced(tile.id)}
              disabled={!tile}
            >
              {tile ? tile.char.toUpperCase() : ""}
            </button>
          );
        })}
      </div>

      <div className="scram__tray">
        {tiles.map((t) => (
          <button
            key={t.id}
            className="scram__tile"
            onClick={() => tapTile(t.id)}
            disabled={placed.includes(t.id)}
          >
            {t.char.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="scram__actions">
        <button className="scram__btn" onClick={hint} disabled={status !== "idle"}>
          💡 Hint
        </button>
        <button className="scram__btn" onClick={skip} disabled={status !== "idle"}>
          Skip →
        </button>
      </div>
    </div>
  );
}
