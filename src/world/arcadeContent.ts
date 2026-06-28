// ---------------------------------------------------------------------------
// arcadeContent — content + procedural generators for the World Arcade
// mini-games. Word-scramble pulls from a fact-checked word bank; Math Dash
// generates arithmetic on the fly, scaling with the player's level.
// ---------------------------------------------------------------------------
export type WordEntry = { word: string; hint: string };

// Generated + fact-checked, 8 categories (deduped). Ages 8-10, 4-7 letters.
export const SCRAMBLE_WORDS: WordEntry[] = [
  { word: "tiger", hint: "A big striped wild cat that roars" },
  { word: "zebra", hint: "A horse-like animal with black and white stripes" },
  { word: "rabbit", hint: "A hopping animal with long ears that loves carrots" },
  { word: "monkey", hint: "A playful animal that swings in trees" },
  { word: "turtle", hint: "A slow animal that carries a hard shell on its back" },
  { word: "river", hint: "Water that flows along and can lead to the sea" },
  { word: "cloud", hint: "Fluffy white shape floating up in the sky" },
  { word: "forest", hint: "A big place full of many tall trees" },
  { word: "flower", hint: "A pretty bloom that bees like to visit" },
  { word: "valley", hint: "A low area of land between two hills" },
  { word: "pencil", hint: "You write with this and erase its mistakes" },
  { word: "teacher", hint: "The grown-up who leads your class" },
  { word: "lesson", hint: "Something new you learn in class" },
  { word: "ruler", hint: "A straight tool for measuring lines" },
  { word: "recess", hint: "Break time to play outside" },
  { word: "bread", hint: "A soft loaf you slice for sandwiches" },
  { word: "apple", hint: "A crunchy red or green fruit that grows on trees" },
  { word: "cheese", hint: "A yummy dairy food often put on pizza" },
  { word: "carrot", hint: "A long orange veggie that bunnies love" },
  { word: "cookie", hint: "A sweet round treat, great with milk" },
  { word: "planet", hint: "A big round world that circles the sun" },
  { word: "comet", hint: "An icy ball that streaks by with a glowing tail" },
  { word: "orbit", hint: "The looping path one space object takes around another" },
  { word: "rocket", hint: "A tall ship that blasts off into the sky" },
  { word: "galaxy", hint: "A giant swirl of billions of stars" },
  { word: "soccer", hint: "A game where you kick a ball into a net" },
  { word: "tennis", hint: "You hit a fuzzy ball over a net with a racket" },
  { word: "hockey", hint: "Players slide a puck on ice with sticks" },
  { word: "boxing", hint: "Two people wear gloves and trade punches in a ring" },
  { word: "skating", hint: "Gliding along on wheels or ice blades" },
  { word: "couch", hint: "A soft seat where the whole family can sit together" },
  { word: "lamp", hint: "You turn it on to light up a dark room" },
  { word: "table", hint: "You eat your dinner on top of this" },
  { word: "kitchen", hint: "The room where food gets cooked" },
  { word: "window", hint: "Glass you look through to see outside" },
  { word: "storm", hint: "Wild weather with wind, rain, and loud booms" },
  { word: "sunny", hint: "A bright day with no clouds in the way" },
  { word: "windy", hint: "When the air blows hard and kites fly high" },
  { word: "foggy", hint: "When thick mist makes it hard to see far" },
];

export type MathProblem = { prompt: string; choices: number[]; answer: number };

function rnd(n: number): number {
  return Math.floor(Math.random() * n);
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A multiple-choice arithmetic problem that gets harder with the player level. */
export function genMathProblem(level: number): MathProblem {
  const tier = Math.min(3, Math.max(0, Math.floor((level - 1) / 2))); // 0..3
  const ops =
    tier === 0 ? ["+", "-"] : tier === 1 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
  const op = ops[rnd(ops.length)];
  let a: number;
  let b: number;
  let answer: number;
  if (op === "+") {
    const max = tier === 0 ? 12 : tier === 1 ? 40 : 90;
    a = rnd(max) + 1;
    b = rnd(max) + 1;
    answer = a + b;
  } else if (op === "-") {
    const max = tier === 0 ? 12 : tier === 1 ? 40 : 90;
    a = rnd(max) + 1;
    b = rnd(a) + 1; // 1..a, keeps the answer >= 0
    answer = a - b;
  } else if (op === "×") {
    const max = tier <= 1 ? 10 : 12;
    a = rnd(max) + 1;
    b = rnd(max) + 1;
    answer = a * b;
  } else {
    // exact division: build it from the quotient so it's always clean
    answer = rnd(9) + 1; // 1..9
    b = rnd(8) + 2; // 2..9
    a = answer * b;
  }
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const delta = (rnd(2) ? 1 : -1) * (rnd(5) + 1);
    const d = answer + delta;
    if (d >= 0) set.add(d);
  }
  return { prompt: `${a} ${op} ${b}`, choices: shuffle([...set]), answer };
}

/** A shuffled letter list for a word (re-shuffles until it isn't the word). */
export function scramble(word: string): string[] {
  const letters = word.split("");
  if (letters.length < 2) return letters;
  let out = shuffle(letters);
  let guard = 0;
  while (out.join("") === word && guard++ < 8) out = shuffle(letters);
  return out;
}
