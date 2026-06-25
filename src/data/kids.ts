import type { Kid, KidId } from "../types";

// Colors mirror the family calendar: Claire = crimson, Coby = berry, Hailee = orange.
export const KIDS: Record<KidId, Kid> = {
  claire: {
    id: "claire",
    name: "Claire Moon",
    firstName: "Claire",
    emoji: "🌙",
    color: "#e21b3c",
    colorDark: "#a3122a",
    colorSoft: "#fde7ea",
    motto: "Dream big, shine bright.",
  },
  coby: {
    id: "coby",
    name: "Coby Lee",
    firstName: "Coby",
    emoji: "🚀",
    color: "#a8174f",
    colorDark: "#7a1039",
    colorSoft: "#fbe4ee",
    motto: "Build it, blast off!",
  },
  hailee: {
    id: "hailee",
    name: "Hailee Lee",
    firstName: "Hailee",
    emoji: "☀️",
    color: "#ff5a1f",
    colorDark: "#c63d0d",
    colorSoft: "#ffe9df",
    motto: "Make today sunny.",
  },
};

export const KID_ORDER: KidId[] = ["claire", "coby", "hailee"];

export const KID_LIST: Kid[] = KID_ORDER.map((id) => KIDS[id]);
