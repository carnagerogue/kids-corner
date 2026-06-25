import { useMemo, useState } from "react";
import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  NON_CHORE_ACTIVITIES,
} from "../data/activities";
import { taskStatus } from "../store/selectors";
import { ProofButton } from "../components/ProofButton";
import type { ActivityCategory, ActivityIdea } from "../types";

type CatFilter = ActivityCategory | "all";
type PlaceFilter = "all" | "indoor" | "outdoor";
type DiffFilter = "all" | "easy" | "medium" | "challenge";

const DIFF_META: Record<
  ActivityIdea["difficulty"],
  { label: string; emoji: string }
> = {
  easy: { label: "Easy", emoji: "🟢" },
  medium: { label: "Medium", emoji: "🟡" },
  challenge: { label: "Challenge", emoji: "🔴" },
};

// Chores aren't free-picked here — a grown-up assigns those.
const BOARD_CATEGORIES = CATEGORY_ORDER.filter((c) => c !== "chores");

export function MissionBoard() {
  const { state } = useApp();
  const kid = KIDS[state.activeKid];

  const [cat, setCat] = useState<CatFilter>("all");
  const [place, setPlace] = useState<PlaceFilter>("all");
  const [diff, setDiff] = useState<DiffFilter>("all");
  const [forMe, setForMe] = useState(false);

  const filtered = useMemo(() => {
    return NON_CHORE_ACTIVITIES.filter((a) => {
      if (cat !== "all" && a.category !== cat) return false;
      if (place !== "all") {
        if (a.indoorOutdoor !== place && a.indoorOutdoor !== "either")
          return false;
      }
      if (diff !== "all" && a.difficulty !== diff) return false;
      if (forMe) {
        if (!a.bestFor.includes(kid.id) && !a.bestFor.includes("everyone"))
          return false;
      }
      return true;
    });
  }, [cat, place, diff, forMe, kid.id]);

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🎯 Mission Board</h2>
          <p className="view__sub">
            Pick a mission, earn XP. Choosing for {kid.emoji} {kid.firstName}.
          </p>
        </div>
      </div>

      <div className="filters">
        <div className="chips" role="group" aria-label="Category">
          <button
            className={`chip ${cat === "all" ? "is-active" : ""}`}
            onClick={() => setCat("all")}
          >
            ✨ All ({NON_CHORE_ACTIVITIES.length})
          </button>
          {BOARD_CATEGORIES.map((c) => {
            const meta = CATEGORY_META[c];
            const count = NON_CHORE_ACTIVITIES.filter(
              (a) => a.category === c,
            ).length;
            return (
              <button
                key={c}
                className={`chip ${cat === c ? "is-active" : ""}`}
                style={{ ["--chip" as string]: meta.color }}
                onClick={() => setCat(c)}
              >
                {meta.emoji} {meta.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="filters__row">
          <Segmented
            label="Where"
            value={place}
            onChange={(v) => setPlace(v as PlaceFilter)}
            options={[
              { value: "all", label: "Anywhere" },
              { value: "indoor", label: "🏠 Indoor" },
              { value: "outdoor", label: "🌳 Outdoor" },
            ]}
          />
          <Segmented
            label="Level"
            value={diff}
            onChange={(v) => setDiff(v as DiffFilter)}
            options={[
              { value: "all", label: "Any" },
              { value: "easy", label: "🟢 Easy" },
              { value: "medium", label: "🟡 Medium" },
              { value: "challenge", label: "🔴 Challenge" },
            ]}
          />
          <button
            className={`toggle ${forMe ? "is-on" : ""}`}
            onClick={() => setForMe((v) => !v)}
          >
            {forMe ? "★" : "☆"} Best for {kid.firstName}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="empty">No missions match those filters — try clearing one!</p>
      ) : (
        <div className="missions">
          {filtered.map((a) => (
            <MissionCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="segmented">
      <span className="segmented__label">{label}</span>
      <div className="segmented__group">
        {options.map((o) => (
          <button
            key={o.value}
            className={`segmented__btn ${value === o.value ? "is-active" : ""}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MissionCard({ activity }: { activity: ActivityIdea }) {
  const { state } = useApp();
  const kid = KIDS[state.activeKid];
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[activity.category];
  const diff = DIFF_META[activity.difficulty];
  const done = taskStatus(state, kid.id, activity.id).status === "approved";

  return (
    <article
      className={`mission ${done ? "is-done" : ""}`}
      style={{ ["--cat" as string]: meta.color }}
    >
      <div className="mission__head">
        <span className="mission__cat-icon">{meta.emoji}</span>
        <div className="mission__headtext">
          <span className="mission__cat">{meta.label}</span>
          <h3 className="mission__title">{activity.title}</h3>
        </div>
        {done && <span className="mission__ribbon">✓</span>}
      </div>

      <div className="mission__tags">
        <span className="tag">⏱️ {activity.estimatedMinutes} min</span>
        <span className="tag">⚡ {activity.xp} XP</span>
        <span className="tag">
          {diff.emoji} {diff.label}
        </span>
        <span className="tag">
          {activity.indoorOutdoor === "outdoor"
            ? "🌳 Outdoor"
            : activity.indoorOutdoor === "indoor"
              ? "🏠 Indoor"
              : "🔁 Anywhere"}
        </span>
        {activity.parentHelp && <span className="tag tag--help">🧑‍🍼 Grown-up</span>}
      </div>

      <button className="mission__expand" onClick={() => setOpen((v) => !v)}>
        {open ? "▲ Hide steps" : "▼ How to do it"}
      </button>

      {open && (
        <div className="mission__details">
          <div className="mission__supplies">
            <strong>You'll need:</strong>
            <ul>
              {activity.supplies.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <ol className="mission__steps">
            {activity.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mission__action">
        <ProofButton
          kidId={kid.id}
          kind="mission"
          refId={activity.id}
          title={activity.title}
          emoji={meta.emoji}
          xp={activity.xp}
          subtitle="Snap a photo of your finished mission."
        />
      </div>
    </article>
  );
}
