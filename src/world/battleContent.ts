// ---------------------------------------------------------------------------
// battleContent — fresh question pools for the World's challenge battles.
//
// Separate from the Academy lesson content so a battle isn't a rerun of a lesson.
// Authored for ages 8-10 and adversarially fact-checked (every answer key
// re-verified, ambiguity removed, science facts confirmed). A battle shuffles a
// creature's subject pool and draws a handful per encounter.
// ---------------------------------------------------------------------------
import type { AcademyQuestion, Subject } from "./academyQuests";

const READING: AcademyQuestion[] = [
  { id: "syn-gigantic", prompt: `Whisp flutters and sings: "A word means BIG, oh yes indeed! Which means the same, please help me read!" Which word is a synonym for gigantic?`, choices: ["tiny", "enormous", "quiet", "sleepy"], answer: 1, hint: `Think of something REALLY big, like a whale or a mountain.`, explain: `Enormous means very big, just like gigantic!` },
  { id: "ant-ancient", prompt: `Whisp glows softly: "Find the OPPOSITE, swift and clever!" Which word is an antonym for ancient?`, choices: ["old", "dusty", "modern", "faded"], answer: 2, hint: `Ancient means very, very old. The opposite would be brand new.`, explain: `Modern means new or current, the opposite of ancient!` },
  { id: "vocab-context-stroll", prompt: `Read it: "After dinner, we took a slow stroll through the park to watch the sunset." What does stroll mean here?`, choices: ["a relaxed walk", "a fast run", "a loud shout", "a long nap"], answer: 0, hint: `It happened in the park, and it was slow.`, explain: `A stroll is a slow, relaxed walk!` },
  { id: "spell-friend", prompt: `Whisp's pages flap: "Spell the word for a pal you adore!" Which spelling is correct?`, choices: ["freind", "frend", "friend", "frind"], answer: 2, hint: `Remember the saying: a FRIEND is there to the END.`, explain: `The word is spelled friend, with 'fri' then 'end'!` },
  { id: "prefix-un", prompt: `Whisp twinkles: "Add a beginning to flip the meaning!" Which word means "not happy"?`, choices: ["happily", "happiness", "unhappy", "rehappy"], answer: 2, hint: `The prefix 'un-' means 'not'.`, explain: `The prefix 'un-' means 'not,' so unhappy means not happy!` },
  { id: "comp-cocoa", prompt: `Read it: "Mia stirred warm cocoa and pulled a blanket over her toes while snow tapped the window." How was the weather outside?`, choices: ["sunny and hot", "snowy and cold", "rainy and warm", "windy and dusty"], answer: 1, hint: `Look for the word that taps the window.`, explain: `Snow tapping the window tells us it was snowy and cold outside!` },
  { id: "plural-mouse", prompt: `Whisp giggles: "One little squeaker, now make it MANY!" What is the plural of mouse?`, choices: ["mouses", "mice", "mouse", "mouseys"], answer: 1, hint: `This one doesn't just add an 's' — it changes its whole shape.`, explain: `The plural of mouse is mice — a tricky irregular plural!` },
  { id: "contraction-theyare", prompt: `Whisp swirls: "Squish two words to one, with a tiny floating mark!" Which contraction means "they are"?`, choices: ["their", "they're", "there", "theyre"], answer: 1, hint: `The apostrophe takes the place of the letter 'a' in 'are'.`, explain: `They're is the contraction for 'they are,' with an apostrophe!` },
  { id: "idiom-piece-of-cake", prompt: `Whisp sing-songs: "The test was a PIECE OF CAKE!" What does that mean?`, choices: ["it was a tasty snack", "it was very easy", "it was very messy", "it was a birthday party"], answer: 1, hint: `It's not really about dessert — think about how hard or easy the test was.`, explain: `"A piece of cake" is an idiom meaning something is very easy!` },
  { id: "grammar-adjective", prompt: `Whisp hums: "In 'The shy turtle hid quickly,' which word DESCRIBES the turtle?" Pick the adjective.`, choices: ["turtle", "hid", "shy", "quickly"], answer: 2, hint: `An adjective describes a noun. What word tells us what the turtle is like?`, explain: `Shy is an adjective because it describes the turtle!` },
];

const MATH: AcademyQuestion[] = [
  { id: "gear-bolts-add", prompt: `Cog spins out a gear puzzle: a toolbox holds 348 bolts and a bin holds 275 more. How many bolts are there in all?`, choices: ["613", "623", "523", "627"], answer: 1, hint: `Add the hundreds, then the tens, then the ones. Watch for carrying!`, explain: `348 + 275 = 623, so the toolbox and bin hold 623 bolts together.` },
  { id: "spare-gears-subtract", prompt: `Cog had 504 spare gears and used 167 of them today. How many gears does Cog have left?`, choices: ["337", "347", "443", "327"], answer: 0, hint: `Subtract 167 from 504. You'll need to regroup across the zero.`, explain: `504 - 167 = 337 gears left in the pile.` },
  { id: "mult-springs", prompt: `Each gremlin gadget needs 7 springs. Cog is building 8 gadgets. How many springs does Cog need?`, choices: ["54", "15", "56", "63"], answer: 2, hint: `Think 7 times 8, or count by 7s eight times.`, explain: `7 x 8 = 56 springs for all eight gadgets.` },
  { id: "div-share-bolts", prompt: `Cog wants to share 48 shiny bolts equally into 6 little jars. How many bolts go in each jar?`, choices: ["6", "7", "8", "9"], answer: 2, hint: `Ask: 6 times what equals 48?`, explain: `48 / 6 = 8, so each jar gets 8 bolts.` },
  { id: "fraction-gear-paint", prompt: `Cog paints a gear that has 8 equal teeth and colors 4 of them gold. What fraction of the gear is gold?`, choices: ["One half", "One fourth", "One third", "Three fourths"], answer: 0, hint: `4 out of 8 is the same as how many out of 2?`, explain: `4 of 8 teeth is 4/8, which equals one half.` },
  { id: "number-pattern-gears", prompt: `Cog's gears click in a pattern: 3, 6, 12, 24, ... What number clicks next?`, choices: ["36", "48", "30", "27"], answer: 1, hint: `Look at how each number changes. Is it adding the same amount, or doubling?`, explain: `Each number doubles, so after 24 comes 48.` },
  { id: "place-value-cog", prompt: `In Cog's serial number 4,726, what is the value of the 7?`, choices: ["7", "70", "700", "7,000"], answer: 2, hint: `The 7 sits in the hundreds place. How much is that worth?`, explain: `The 7 is in the hundreds place, so it is worth 700.` },
  { id: "perimeter-workbench", prompt: `Cog's rectangular workbench is 9 feet long and 4 feet wide. What is the perimeter (the distance all the way around)?`, choices: ["13 feet", "26 feet", "36 feet", "22 feet"], answer: 1, hint: `Add up all four sides: two longs and two widths.`, explain: `9 + 4 + 9 + 4 = 26 feet around the workbench.` },
  { id: "money-word-problem", prompt: `Cog buys a wrench for $3.75 and pays with a $5 bill. How much change does Cog get back?`, choices: ["$1.25", "$2.25", "$1.75", "$2.35"], answer: 0, hint: `Subtract the cost from $5.00.`, explain: `$5.00 - $3.75 = $1.25 in change.` },
  { id: "area-tile-floor", prompt: `Cog tiles a rectangular floor that is 6 tiles wide and 7 tiles long. How many tiles cover the whole floor?`, choices: ["13 tiles", "42 tiles", "36 tiles", "48 tiles"], answer: 1, hint: `Area of a rectangle is width times length.`, explain: `6 x 7 = 42 tiles cover the whole floor.` },
  { id: "estimate-rounding", prompt: `Cog has 38 cogs and finds 41 more. About how many is that, rounded to the nearest ten?`, choices: ["About 70", "About 80", "About 90", "About 60"], answer: 1, hint: `Round 38 up and 41 down to the nearest ten, then add.`, explain: `38 rounds to 40 and 41 rounds to 40, so about 80 cogs.` },
];

const SCIENCE: AcademyQuestion[] = [
  { id: "moon-light-source", prompt: `Comet's tail twinkles and asks: Why can we see the Moon shining at night?`, choices: ["It makes its own light, like a tiny sun", "It reflects light from the Sun", "It is on fire", "It glows because it is very cold"], answer: 1, hint: `The Moon doesn't burn or make light by itself. Where does the light come from?`, explain: `The Moon has no light of its own. It reflects sunlight back to us.` },
  { id: "water-cycle-clouds", prompt: `Tiny water drops in the sky come together to form clouds. What is this part of the water cycle called?`, choices: ["Evaporation", "Condensation", "Erosion", "Photosynthesis"], answer: 1, hint: `It's the opposite of water turning into a gas. Drops are forming.`, explain: `Condensation is when water vapor cools and turns back into tiny drops that build clouds.` },
  { id: "states-matter-melt", prompt: `An ice cube sits in a warm room and turns into a puddle. The water went from a solid to a what?`, choices: ["Gas", "Liquid", "Plasma", "Powder"], answer: 1, hint: `A puddle can be poured and takes the shape of its container.`, explain: `Melting ice changes a solid into a liquid, which flows and takes any shape.` },
  { id: "magnet-attract", prompt: `Comet drops a paper clip, a penny, a rubber eraser, and a plastic spoon near a magnet. Which one will the magnet pull?`, choices: ["The plastic spoon", "The rubber eraser", "The paper clip", "The penny"], answer: 2, hint: `Magnets like things made of iron or steel.`, explain: `Paper clips are made of steel, so the magnet pulls them. The others aren't magnetic.` },
  { id: "food-chain-start", prompt: `In a meadow food chain, what almost always comes first as the maker of food?`, choices: ["A hungry fox", "A green plant", "A buzzing bee", "A field mouse"], answer: 1, hint: `Think about who can make food using sunlight.`, explain: `Plants make their own food from sunlight, so they start most food chains.` },
  { id: "seasons-tilt", prompt: `Why does Earth have seasons like summer and winter?`, choices: ["Earth moves closer to and farther from the Sun each day", "Earth is tilted as it orbits the Sun", "The Sun turns off in winter", "Clouds block the Sun in winter"], answer: 1, hint: `It has to do with the angle Earth leans at, not its distance.`, explain: `Earth is tilted, so different parts lean toward the Sun at different times, making seasons.` },
  { id: "frog-life-cycle", prompt: `A frog's life cycle goes egg, then tadpole, then what comes next before it is a grown frog?`, choices: ["Caterpillar", "Froglet (young frog with legs)", "Cocoon", "Butterfly"], answer: 1, hint: `The tadpole starts growing legs but isn't fully grown yet.`, explain: `A tadpole grows legs and becomes a froglet, then a full adult frog.` },
  { id: "sound-vibration", prompt: `When you pluck a guitar string, what makes the sound you hear?`, choices: ["The string getting colder", "The string vibrating back and forth", "Light bouncing off the string", "The string changing color"], answer: 1, hint: `Watch the string after you pluck it. It moves very fast.`, explain: `Sound comes from vibrations. The shaking string makes the air vibrate, and we hear it.` },
  { id: "camel-adaptation", prompt: `A camel has a hump and can go a long time without drinking. This helps it survive best in which habitat?`, choices: ["A cold, snowy mountain", "A hot, dry desert", "A deep ocean", "A rainy forest"], answer: 1, hint: `Where would going a long time without water be most useful?`, explain: `Camels are adapted for hot deserts, where water is hard to find.` },
  { id: "ramp-simple-machine", prompt: `Comet uses a slanted board to roll a heavy ball up into a wagon instead of lifting it straight up. This simple machine is called a what?`, choices: ["Pulley", "Inclined plane (ramp)", "Wheel and axle", "Lever"], answer: 1, hint: `It's a flat surface that is tilted, making heavy things easier to move up.`, explain: `A ramp is an inclined plane. It lets you move heavy things up with less force.` },
];

const POOLS: Record<Subject, AcademyQuestion[]> = {
  reading: READING,
  math: MATH,
  science: SCIENCE,
};

export function battleQuestions(subject: Subject): AcademyQuestion[] {
  return POOLS[subject];
}
