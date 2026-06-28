export type QualityChoice = "auto" | "high" | "balanced" | "low";

export type RuntimeQuality = {
  choice: QualityChoice;
  resolved: Exclude<QualityChoice, "auto">;
  dpr: [number, number];
  antialias: boolean;
  shadows: boolean;
  particles: number;
  birds: number;
};

const KEY = "kids-corner:world-quality";

export function loadQualityChoice(): QualityChoice {
  const fromQuery = new URLSearchParams(window.location.search).get("quality");
  if (["auto", "high", "balanced", "low"].includes(fromQuery ?? "")) {
    return fromQuery as QualityChoice;
  }
  try {
    const value = localStorage.getItem(KEY);
    return ["auto", "high", "balanced", "low"].includes(value ?? "")
      ? (value as QualityChoice)
      : "auto";
  } catch {
    return "auto";
  }
}

export function saveQualityChoice(choice: QualityChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Preference is optional.
  }
}

function autoTier(): RuntimeQuality["resolved"] {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const iPadLike =
    /iPad/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (memory <= 2 || cores <= 2) return "low";
  if (iPadLike || coarse || memory <= 4 || cores <= 4) return "balanced";
  return "high";
}

export function resolveQuality(choice: QualityChoice): RuntimeQuality {
  const resolved = choice === "auto" ? autoTier() : choice;
  if (resolved === "low") {
    return {
      choice,
      resolved,
      dpr: [0.75, 1],
      antialias: false,
      shadows: false,
      particles: 24,
      birds: 3,
    };
  }
  if (resolved === "balanced") {
    return {
      choice,
      resolved,
      dpr: [1, 1.25],
      antialias: true,
      shadows: false,
      particles: 55,
      birds: 5,
    };
  }
  return {
    choice,
    resolved,
    dpr: [1, 1.6],
    antialias: true,
    shadows: true,
    particles: 90,
    birds: 8,
  };
}
