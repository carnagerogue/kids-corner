// ---------------------------------------------------------------------------
// AcademyChallenge — the in-world learning panel. Opens when a learner walks up
// to an Academy landmark and presses E. Runs ONE chapter of a quest: a short
// story intro, then its multiple-choice questions with gentle, no-fail feedback
// (wrong → hint + retry, right → explanation + advance). On the last question it
// shows a reward screen. All persistence is owned by WorldView via callbacks;
// this component is pure UI/flow.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { AcademyChapter, AcademyQuest } from "./academyQuests";
import { levelTitle } from "./academyQuests";

type Props = {
  quest: AcademyQuest;
  chapterIndex: number;
  level: number;
  /** Called once when a question is answered correctly (award XP). */
  onCorrect: () => void;
  /** Called once when the chapter's last question is solved (award tokens + advance). */
  onChapterComplete: (chapter: AcademyChapter) => void;
  onClose: () => void;
};

export function AcademyChallenge({
  quest,
  chapterIndex,
  level,
  onCorrect,
  onChapterComplete,
  onClose,
}: Props) {
  const totalChapters = quest.chapters.length;
  const questComplete = chapterIndex >= totalChapters;
  const chapter = questComplete ? null : quest.chapters[chapterIndex];

  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<Set<number>>(() => new Set());
  const [finished, setFinished] = useState(false);

  // Already finished the whole quest line — friendly "come back later" screen.
  if (questComplete || !chapter) {
    return (
      <Overlay title={`${quest.emoji} ${quest.giver}`} onClose={onClose}>
        <p className="academy__intro">
          You restored all of {quest.title}! Every challenge here is complete. 🎉
          Come back for new adventures, or visit another Academy.
        </p>
        <button className="academy__next" onClick={onClose}>
          Back to the World
        </button>
      </Overlay>
    );
  }

  const question = chapter.questions[qIndex];
  const isLastQuestion = qIndex === chapter.questions.length - 1;

  const pick = (i: number) => {
    if (solved) return;
    if (i === question.answer) {
      setPicked(i);
      setSolved(true);
      onCorrect();
    } else {
      setPicked(i);
      setWrong((prev) => new Set(prev).add(i));
    }
  };

  const next = () => {
    if (isLastQuestion) {
      setFinished(true);
      onChapterComplete(chapter);
      return;
    }
    setQIndex((n) => n + 1);
    setPicked(null);
    setSolved(false);
    setWrong(new Set());
  };

  // Reward screen after the chapter's last question.
  if (finished) {
    const nextChapter = quest.chapters[chapterIndex + 1];
    return (
      <Overlay title={`${quest.emoji} Chapter complete!`} onClose={onClose}>
        <p className="academy__reward">
          ⭐ You finished <strong>{chapter.title}</strong> and earned{" "}
          <strong>🪙 {chapter.rewardTokens} tokens</strong>!
        </p>
        <p className="academy__intro">
          {nextChapter
            ? `Next up: ${nextChapter.title}. Come back to ${quest.giver} when you're ready!`
            : `You've completed all of ${quest.title}. Amazing work — its festival light is shining!`}
        </p>
        <button className="academy__next" onClick={onClose}>
          {nextChapter ? "Keep exploring" : "Celebrate! 🎉"}
        </button>
      </Overlay>
    );
  }

  return (
    <Overlay
      title={`${quest.emoji} ${quest.giver}`}
      subtitle={`Lv ${level} · ${levelTitle(level)}`}
      onClose={onClose}
    >
      <div className="academy__chapterbar">
        <span className="academy__chaptertitle">{chapter.title}</span>
        <span className="academy__progress" aria-label={`Question ${qIndex + 1} of ${chapter.questions.length}`}>
          {chapter.questions.map((q, i) => (
            <span
              key={q.id}
              className={`academy__dot${i < qIndex || (i === qIndex && solved) ? " is-done" : ""}${i === qIndex ? " is-current" : ""}`}
            />
          ))}
        </span>
      </div>

      {qIndex === 0 && <p className="academy__intro">{chapter.intro}</p>}

      <p className="academy__q">{question.prompt}</p>

      <div className="academy__choices">
        {question.choices.map((choice, i) => {
          const isAnswer = i === question.answer;
          const cls =
            solved && isAnswer
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
          ✅ {question.explain}
        </div>
      ) : picked !== null ? (
        <div className="academy__feedback is-hint" role="status">
          💡 {question.hint} Try again!
        </div>
      ) : (
        <div className="academy__feedback academy__feedback--placeholder" aria-hidden="true" />
      )}

      <button className="academy__next" onClick={next} disabled={!solved}>
        {isLastQuestion ? "Finish chapter ⭐" : "Next question →"}
      </button>
    </Overlay>
  );
}

function Overlay({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="academy" role="dialog" aria-modal="true" aria-labelledby="academy-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Close lesson">
          ×
        </button>
        <div className="academy__head">
          <h3 id="academy-title">{title}</h3>
          {subtitle && <span className="academy__lv">{subtitle}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}
