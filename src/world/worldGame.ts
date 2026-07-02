import type { KidId } from "../types";

export type Vec3 = readonly [number, number, number];
export type QuestPhase = "available" | "collecting" | "return" | "complete";
export type LandmarkId = "story-grove" | "maker-yard" | "sky-lab";
export type DecorationId =
  | "starter-garden"
  | "star-fountain"
  | "seasonal-banner";

export type LandmarkDef = {
  id: LandmarkId;
  name: string;
  emoji: string;
  position: Vec3;
  color: string;
  description: string;
};

export type StarDef = {
  id: string;
  position: Vec3;
  clue: string;
};

export const LANDMARKS: LandmarkDef[] = [
  {
    id: "story-grove",
    name: "Story Grove",
    emoji: "📚",
    position: [-52, 0, 0],
    color: "#49a86f",
    description: "A shady reading tree where every book opens a tiny adventure.",
    // Relocated into the Woods district (west) so reaching it is a real journey.
  },
  {
    id: "maker-yard",
    name: "Maker Yard",
    emoji: "🛠️",
    position: [52, 0, -2],
    color: "#ff9a4a",
    description: "A cheerful workshop for building, painting, and inventing.",
  },
  {
    id: "sky-lab",
    name: "Sky Lab",
    emoji: "🔭",
    position: [10, 0, 49],
    color: "#7667e8",
    description: "A backyard observatory tuned to stars, planets, and big questions.",
  },
];

export const STAR_COLLECTIBLES: StarDef[] = [
  { id: "star-grove", position: [-50, 0.8, 2], clue: "under the Story Grove" },
  { id: "star-maker", position: [55, 0.8, -3], clue: "beside the Maker Yard" },
  { id: "star-lab", position: [13, 1.05, 50], clue: "near the Sky Lab" },
  { id: "star-square", position: [1.8, 0.75, 0.4], clue: "in the town square" },
  { id: "star-yard", position: [-9.6, 0.75, 9.4], clue: "by your home yard" },
];

export type SeasonalEvent = {
  id: "spring" | "summer" | "autumn" | "winter";
  name: string;
  emoji: string;
  accent: string;
  particle: string;
  message: string;
};

export function currentSeasonalEvent(date = new Date()): SeasonalEvent {
  const month = date.getMonth();
  if (month >= 2 && month <= 4)
    return {
      id: "spring",
      name: "Bloom Festival",
      emoji: "🌸",
      accent: "#ff79b0",
      particle: "#ffd2e5",
      message: "Power all three landmarks to raise the flower banner!",
    };
  if (month >= 5 && month <= 7)
    return {
      id: "summer",
      name: "Firefly Festival",
      emoji: "✨",
      accent: "#ffc94a",
      particle: "#fff0a0",
      message: "Power all three landmarks to light the summer banner!",
    };
  if (month >= 8 && month <= 10)
    return {
      id: "autumn",
      name: "Leaflight Festival",
      emoji: "🍂",
      accent: "#e97a36",
      particle: "#ffc36e",
      message: "Power all three landmarks to hang the harvest banner!",
    };
  return {
    id: "winter",
    name: "Starlight Festival",
    emoji: "❄️",
    accent: "#70c9ff",
    particle: "#e4f7ff",
    message: "Power all three landmarks to hang the starlight banner!",
  };
}

/**
 * Season of Wonders arc (World 2.0). The town starts each season grey/asleep;
 * a landmark "awakens" (blooms grey -> color) only once the kid has enough NEW
 * parent-approved work since that landmark's chapter began. The baseline is the
 * SET OF APPROVED SUBMISSION IDS already counted — not a timestamp — so logging
 * in on a second device can't double-count, and pre-season backlog never counts.
 */
export type SeasonArc = {
  seasonId: string; // e.g. "summer-2026" (from currentSeasonalEvent + year)
  awakened: LandmarkId[]; // Wonders bloomed THIS season
  chapterProgress: Record<LandmarkId, number>; // chapters completed per landmark
  baseline: Record<LandmarkId, string[]>; // approved ids counted at each chapter's start
};

export type WorldSave = {
  version: 1;
  quest: {
    phase: QuestPhase;
    collected: string[];
    completedAt?: number;
  };
  townTokens: number;
  activatedLandmarks: LandmarkId[];
  unlockedDecorations: DecorationId[];
  selectedDecoration: DecorationId;
  seasonalRewardId?: string;
  seasonArc?: SeasonArc;
};

const DEFAULT_SAVE: WorldSave = {
  version: 1,
  quest: { phase: "available", collected: [] },
  townTokens: 0,
  activatedLandmarks: [],
  unlockedDecorations: ["starter-garden"],
  selectedDecoration: "starter-garden",
};

const saveKey = (kidId: KidId) => `kids-corner:world:${kidId}:v1`;

export function loadWorldSave(kidId: KidId): WorldSave {
  try {
    const raw = localStorage.getItem(saveKey(kidId));
    if (!raw) return structuredClone(DEFAULT_SAVE);
    const value = JSON.parse(raw) as Partial<WorldSave>;
    const unlocked = Array.from(
      new Set<DecorationId>([
        "starter-garden",
        ...(value.unlockedDecorations ?? []),
      ]),
    );
    return {
      ...structuredClone(DEFAULT_SAVE),
      ...value,
      quest: { ...DEFAULT_SAVE.quest, ...(value.quest ?? {}) },
      activatedLandmarks: value.activatedLandmarks ?? [],
      unlockedDecorations: unlocked,
      selectedDecoration: unlocked.includes(value.selectedDecoration as DecorationId)
        ? (value.selectedDecoration as DecorationId)
        : "starter-garden",
    };
  } catch {
    return structuredClone(DEFAULT_SAVE);
  }
}

export function saveWorldSave(kidId: KidId, save: WorldSave): void {
  try {
    localStorage.setItem(saveKey(kidId), JSON.stringify(save));
  } catch {
    // Private mode/full storage: the current session still works.
  }
}

export function startStarQuest(save: WorldSave): WorldSave {
  if (save.quest.phase !== "available") return save;
  return { ...save, quest: { ...save.quest, phase: "collecting" } };
}

export function mergeCollectedStars(save: WorldSave, ids: string[]): WorldSave {
  const valid = new Set(STAR_COLLECTIBLES.map((star) => star.id));
  const collected = Array.from(
    new Set([...save.quest.collected, ...ids.filter((id) => valid.has(id))]),
  );
  let phase = save.quest.phase;
  if (collected.length === STAR_COLLECTIBLES.length && phase !== "complete") {
    phase = "return";
  } else if (collected.length && phase === "available") {
    // Joining a sibling's active quest should immediately make it playable.
    phase = "collecting";
  }
  return { ...save, quest: { ...save.quest, collected, phase } };
}

export function collectStar(save: WorldSave, id: string): WorldSave {
  if (save.quest.phase !== "collecting") return save;
  return mergeCollectedStars(save, [id]);
}

export function completeStarQuest(save: WorldSave): WorldSave {
  if (save.quest.phase !== "return") return save;
  return {
    ...save,
    townTokens: save.townTokens + 25,
    quest: { ...save.quest, phase: "complete", completedAt: Date.now() },
    unlockedDecorations: Array.from(
      new Set<DecorationId>([...save.unlockedDecorations, "star-fountain"]),
    ),
  };
}

export function activateLandmarks(
  save: WorldSave,
  ids: LandmarkId[],
  event = currentSeasonalEvent(),
): { save: WorldSave; festivalCompleted: boolean } {
  // Only count real landmark ids (mirrors mergeCollectedStars' valid.has filter)
  // so a stray id can never inflate the activated count to "complete".
  const valid = new Set<LandmarkId>(LANDMARKS.map((landmark) => landmark.id));
  const activatedLandmarks = Array.from(
    new Set<LandmarkId>([
      ...save.activatedLandmarks,
      ...ids.filter((id) => valid.has(id)),
    ]),
  );
  const rewardId = `${event.id}-${new Date().getFullYear()}`;
  const completed = activatedLandmarks.length === LANDMARKS.length;
  // Award (and celebrate) once per season: the rewardId carries the season+year,
  // so each new season re-earns the banner even though landmarks stay powered.
  const award = completed && save.seasonalRewardId !== rewardId;
  return {
    festivalCompleted: award,
    save: {
      ...save,
      activatedLandmarks,
      townTokens: save.townTokens + (award ? 10 : 0),
      seasonalRewardId: award ? rewardId : save.seasonalRewardId,
      unlockedDecorations: award
        ? Array.from(
            new Set<DecorationId>([
              ...save.unlockedDecorations,
              "seasonal-banner",
            ]),
          )
        : save.unlockedDecorations,
    },
  };
}

// --- Season of Wonders arc ------------------------------------------------

/** How many NEW approved tasks a landmark's Nth chapter needs to awaken.
 *  Gentle first chapter (reachable for the youngest kid), escalating after. */
const CHAPTER_REQUIREMENTS = [1, 2, 3] as const;
export function chapterRequirement(chapterIndex: number): number {
  return CHAPTER_REQUIREMENTS[
    Math.min(Math.max(0, chapterIndex), CHAPTER_REQUIREMENTS.length - 1)
  ];
}

/** Stable season id used to reseed the arc: matches activateLandmarks' rewardId. */
export function seasonIdFor(date = new Date()): string {
  return `${currentSeasonalEvent(date).id}-${date.getFullYear()}`;
}

function landmarkRecord<T>(fn: (id: LandmarkId) => T): Record<LandmarkId, T> {
  const out = {} as Record<LandmarkId, T>;
  for (const l of LANDMARKS) out[l.id] = fn(l.id);
  return out;
}

/** Count approved submission ids not yet credited to this landmark's chapter. */
export function newApprovalsFor(
  arc: SeasonArc,
  id: LandmarkId,
  approvedIds: readonly string[],
): number {
  const counted = new Set(arc.baseline[id] ?? []);
  let n = 0;
  for (const sid of approvedIds) if (!counted.has(sid)) n++;
  return n;
}

/**
 * Make sure the save carries a fresh arc for `seasonId`. First-ever init carries
 * any already-powered landmarks into the season (no surprise reset for current
 * players); a genuine season change resets the town asleep and lets the festival
 * be re-earned. Only NEW approved work (after this point) counts, so the baseline
 * snapshots the current approved ids.
 */
export function ensureSeason(
  save: WorldSave,
  approvedIds: readonly string[],
  seasonId = seasonIdFor(),
): WorldSave {
  const prev = save.seasonArc;
  if (prev && prev.seasonId === seasonId) return save;
  const firstEver = !prev;
  const awakened = firstEver ? [...save.activatedLandmarks] : [];
  const arc: SeasonArc = {
    seasonId,
    awakened,
    chapterProgress: landmarkRecord((id) => (awakened.includes(id) ? 1 : 0)),
    baseline: landmarkRecord(() => [...approvedIds]),
  };
  const reset = !firstEver; // town sleeps again on a real season turnover
  return {
    ...save,
    seasonArc: arc,
    activatedLandmarks: reset ? [] : save.activatedLandmarks,
    seasonalRewardId: reset ? undefined : save.seasonalRewardId,
  };
}

/** Can this landmark's current chapter be awakened with the kid's approved work? */
export function canAwaken(
  save: WorldSave,
  id: LandmarkId,
  approvedIds: readonly string[],
): boolean {
  const arc = save.seasonArc;
  if (!arc) return false;
  const need = chapterRequirement(arc.chapterProgress[id] ?? 0);
  return newApprovalsFor(arc, id, approvedIds) >= need;
}

/**
 * Awaken a landmark: blooms it (reusing activateLandmarks for the emissive
 * toggle + festival award), advances its chapter, and resets its baseline so the
 * next chapter needs fresh work. No-op (awakened:false) if the gate isn't met.
 */
export function awakenLandmark(
  save: WorldSave,
  id: LandmarkId,
  approvedIds: readonly string[],
  event = currentSeasonalEvent(),
): { save: WorldSave; festivalCompleted: boolean; awakened: boolean } {
  const arc = save.seasonArc;
  if (!arc || !canAwaken(save, id, approvedIds)) {
    return { save, festivalCompleted: false, awakened: false };
  }
  const lit = activateLandmarks(save, [id], event);
  const nextArc: SeasonArc = {
    ...arc,
    awakened: Array.from(new Set<LandmarkId>([...arc.awakened, id])),
    chapterProgress: {
      ...arc.chapterProgress,
      [id]: (arc.chapterProgress[id] ?? 0) + 1,
    },
    baseline: { ...arc.baseline, [id]: [...approvedIds] },
  };
  return {
    save: { ...lit.save, seasonArc: nextArc },
    festivalCompleted: lit.festivalCompleted,
    awakened: true,
  };
}

export function selectDecoration(
  save: WorldSave,
  decoration: DecorationId,
): WorldSave {
  if (!save.unlockedDecorations.includes(decoration)) return save;
  return { ...save, selectedDecoration: decoration };
}

export type InteractionTarget =
  | { id: "mayor"; kind: "npc"; label: string; position: Vec3; radius: number }
  | {
      id: string;
      kind: "collectible";
      label: string;
      position: Vec3;
      radius: number;
    }
  | {
      id: LandmarkId;
      kind: "landmark";
      label: string;
      position: Vec3;
      radius: number;
    }
  | { id: string; kind: "door"; label: string; position: Vec3; radius: number }
  | { id: string; kind: "creature"; label: string; position: Vec3; radius: number }
  | { id: "home-yard"; kind: "yard"; label: string; position: Vec3; radius: number };

export function interactionsFor(save: WorldSave): InteractionTarget[] {
  const interactions: InteractionTarget[] = [
    {
      id: "mayor",
      kind: "npc",
      label: save.quest.phase === "return" ? "Return the stars" : "Talk to Mayor Nova",
      position: [0, 0, 2.2],
      radius: 2.5,
    },
    ...LANDMARKS.map((landmark) => ({
      id: landmark.id,
      kind: "landmark" as const,
      label: `Power ${landmark.name}`,
      position: landmark.position,
      radius: 3,
    })),
    {
      id: "home-yard",
      kind: "yard",
      label: "Decorate your yard",
      position: [-8, 0, 8],
      radius: 3,
    },
  ];
  if (save.quest.phase === "collecting") {
    for (const star of STAR_COLLECTIBLES) {
      if (!save.quest.collected.includes(star.id)) {
        interactions.push({
          id: star.id,
          kind: "collectible",
          label: "Collect lost star",
          position: star.position,
          radius: 2,
        });
      }
    }
  }
  return interactions;
}
