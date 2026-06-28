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
    position: [-8, 0, -8],
    color: "#49a86f",
    description: "A shady reading tree where every book opens a tiny adventure.",
  },
  {
    id: "maker-yard",
    name: "Maker Yard",
    emoji: "🛠️",
    position: [8, 0, -8],
    color: "#ff9a4a",
    description: "A cheerful workshop for building, painting, and inventing.",
  },
  {
    id: "sky-lab",
    name: "Sky Lab",
    emoji: "🔭",
    position: [8, 0, 8],
    color: "#7667e8",
    description: "A backyard observatory tuned to stars, planets, and big questions.",
  },
];

export const STAR_COLLECTIBLES: StarDef[] = [
  { id: "star-grove", position: [-10.1, 0.8, -7.2], clue: "under the Story Grove" },
  { id: "star-maker", position: [9.7, 0.8, -9.2], clue: "beside the Maker Yard" },
  { id: "star-lab", position: [9.4, 1.05, 9.5], clue: "near the Sky Lab" },
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
  const beforeComplete = save.activatedLandmarks.length === LANDMARKS.length;
  const activatedLandmarks = Array.from(
    new Set<LandmarkId>([...save.activatedLandmarks, ...ids]),
  );
  const rewardId = `${event.id}-${new Date().getFullYear()}`;
  const completed = activatedLandmarks.length === LANDMARKS.length;
  const award = completed && save.seasonalRewardId !== rewardId;
  return {
    festivalCompleted: award && !beforeComplete,
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
