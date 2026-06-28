// ---------------------------------------------------------------------------
// worldShop — cosmetic auras the learner can buy with town tokens. Companions
// aren't here: any befriended creature can be equipped for free (befriending IS
// the unlock), so the shop's token sink is purely the auras. Purchases/equips
// live in AcademyProgress; tokens are spent from the world save by WorldView.
// ---------------------------------------------------------------------------
export type Aura = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  price: number;
  description: string;
};

export const AURAS: Aura[] = [
  { id: "spark", name: "Sparkle Trail", emoji: "✨", color: "#ffd76a", price: 30, description: "A cheerful golden shimmer." },
  { id: "leaf", name: "Nature Ring", emoji: "🍃", color: "#5fd08a", price: 45, description: "Fresh green leaves swirl around you." },
  { id: "bubble", name: "Bubble Pop", emoji: "🫧", color: "#7fc6ff", price: 55, description: "Floaty blue bubbles." },
  { id: "ember", name: "Ember Glow", emoji: "🔥", color: "#ff7a3d", price: 70, description: "A warm orange blaze." },
  { id: "frost", name: "Frost Aura", emoji: "❄️", color: "#6fd0ff", price: 70, description: "A cool, icy sparkle." },
  { id: "rainbow", name: "Rainbow Halo", emoji: "🌈", color: "#c264e0", price: 130, description: "The rarest, brightest glow of all." },
];

export function auraById(id: string | null | undefined): Aura | undefined {
  if (!id) return undefined;
  return AURAS.find((aura) => aura.id === id);
}
