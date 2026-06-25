import { useState } from "react";
import {
  RESOURCES,
  RESOURCE_CATEGORIES,
  RESOURCE_CAT_BY_ID,
  type ResourceCategory,
} from "../data/resources";

type CatFilter = ResourceCategory | "all";

/** A browsable library of safe, fun, and educational websites. */
export function ExploreView() {
  const [cat, setCat] = useState<CatFilter>("all");
  const list =
    cat === "all" ? RESOURCES : RESOURCES.filter((r) => r.category === cat);

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🌟 Explore</h2>
          <p className="view__sub">
            Safe, fun, and educational places to discover.
          </p>
        </div>
      </div>

      <div className="chips" role="group" aria-label="Category">
        <button
          className={`chip ${cat === "all" ? "is-active" : ""}`}
          onClick={() => setCat("all")}
        >
          ✨ All ({RESOURCES.length})
        </button>
        {RESOURCE_CATEGORIES.map((c) => {
          const count = RESOURCES.filter((r) => r.category === c.id).length;
          return (
            <button
              key={c.id}
              className={`chip ${cat === c.id ? "is-active" : ""}`}
              style={{ ["--chip" as string]: c.color }}
              onClick={() => setCat(c.id)}
            >
              {c.emoji} {c.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="reslist">
        {list.map((r) => {
          const meta = RESOURCE_CAT_BY_ID[r.category];
          return (
            <article
              key={r.id}
              className="rescard"
              style={{ ["--cat" as string]: meta.color }}
            >
              <div className="rescard__head">
                <span className="rescard__icon">{r.emoji}</span>
                <div>
                  <span className="rescard__cat">
                    {meta.emoji} {meta.label}
                  </span>
                  <strong className="rescard__name">{r.name}</strong>
                </div>
              </div>
              <p className="rescard__blurb">{r.blurb}</p>
              <a
                className="btn btn--primary btn--full"
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                ↗ Open {r.name}
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
