// ---------------------------------------------------------------------------
// academyContent — the educational quest-chain content for the three Academies.
//
// Authored for ages 8-10 (US grades 3-5) and adversarially fact-checked (every
// answer key re-verified, ambiguity removed, science facts confirmed). Difficulty
// ramps across the four chapters of each quest. Edit chapters/questions here;
// the engine + UI in academyQuests.ts / AcademyChallenge.tsx are content-agnostic.
// ---------------------------------------------------------------------------
import type { AcademyQuest, AcademyQuestId } from "./academyQuests";

export const ACADEMY_QUESTS: AcademyQuest[] = [
  {
    questId: "story-grove",
    subject: "reading",
    giver: "Sage the Story Keeper",
    emoji: "📚",
    title: "The Whispering Library",
    blurb:
      "A mischievous wind scattered the words from Story Grove's books — help Sage answer reading challenges to bring every story back to life.",
    chapters: [
      {
        id: "ch1-faded-pages",
        title: "Chapter 1 · The Faded Pages",
        intro:
          "Welcome, friend! The wind blew the easiest words right off these first pages. Pop them back in and the books will start to glow again.",
        rewardTokens: 6,
        questions: [
          {
            id: "ch1-q1-vocab",
            prompt:
              'A page reads: "The hungry cub gobbled its dinner." What does "gobbled" mean here?',
            choices: ["ate quickly", "looked at", "cooked slowly", "hid away"],
            answer: 0,
            hint: "A hungry animal eats in a fast, eager way.",
            explain: '"Gobbled" means ate quickly — the hungry cub couldn\'t wait!',
          },
          {
            id: "ch1-q2-synonym",
            prompt: 'Which word means almost the SAME as "happy"?',
            choices: ["glad", "tired", "angry", "quiet"],
            answer: 0,
            hint: "A synonym has a meaning that is very close.",
            explain: '"Glad" and "happy" both describe a good, cheerful feeling.',
          },
          {
            id: "ch1-q3-plural",
            prompt: "The page shows one book. Which word means MORE than one?",
            choices: ["books", "book's", "booking", "book"],
            answer: 0,
            hint: "Most plurals just add an -s.",
            explain: '"Books" is the plural — it means more than one book.',
          },
        ],
      },
      {
        id: "ch2-tangled-words",
        title: "Chapter 2 · The Tangled Words",
        intro:
          "Good work! Now the wind knotted some words into the wrong shapes. Untangle the spelling and grammar so the story reads smoothly.",
        rewardTokens: 8,
        questions: [
          {
            id: "ch2-q1-spelling",
            prompt: "Which word is spelled correctly?",
            choices: ["friend", "freind", "frend", "friynd"],
            answer: 0,
            hint: 'Remember the saying: a friend is there to the "end."',
            explain: '"Friend" is correct — it ends in the word "end."',
          },
          {
            id: "ch2-q2-antonym",
            prompt: 'Which word is the OPPOSITE of "ancient"?',
            choices: ["modern", "old", "dusty", "huge"],
            answer: 0,
            hint: "An antonym means the reverse. Ancient means very old.",
            explain: '"Modern" means new, the opposite of "ancient" (very old).',
          },
          {
            id: "ch2-q3-contraction",
            prompt: 'Which contraction means "they are"?',
            choices: ["they're", "their", "there", "theyre"],
            answer: 0,
            hint: "The apostrophe stands for the missing letter a.",
            explain: '"They\'re" is short for "they are" — the apostrophe replaces the a.',
          },
        ],
      },
      {
        id: "ch3-living-story",
        title: "Chapter 3 · The Living Story",
        intro:
          "The pages are warming up! Now a whole story is waking. Read each page carefully and show that you understand what the words mean.",
        rewardTokens: 11,
        questions: [
          {
            id: "ch3-q1-comprehension",
            prompt:
              'Read: "Maya planted a seed in a cup by the window. She watered it every morning. Soon a tiny green leaf peeked out." Why did the seed grow?',
            choices: [
              "Maya watered it each day",
              "Maya moved the cup outside",
              "Maya sang to the cup",
              "Maya bought a new plant",
            ],
            answer: 0,
            hint: "Look for what Maya did every morning.",
            explain:
              "The seed grew because Maya watered it every morning by the sunny window.",
          },
          {
            id: "ch3-q2-vocab",
            prompt:
              'A page reads: "The path was so narrow that only one person could pass." What does "narrow" mean?',
            choices: ["very thin or tight", "very long", "very bright", "very muddy"],
            answer: 0,
            hint: "Only one person fits — so the path is not wide.",
            explain:
              '"Narrow" means thin or tight from side to side, so only one person fits.',
          },
          {
            id: "ch3-q3-partsofspeech",
            prompt:
              'In "The clever fox jumped high," which word is an ADJECTIVE?',
            choices: ["clever", "fox", "jumped", "high"],
            answer: 0,
            hint: "An adjective describes what the noun is like.",
            explain: '"Clever" is an adjective — it describes the fox.',
          },
        ],
      },
      {
        id: "ch4-final-whisper",
        title: "Chapter 4 · The Final Whisper",
        intro:
          "The whole library is glowing — only the trickiest words remain. Solve these last riddles and every book in Story Grove will speak again!",
        rewardTokens: 14,
        questions: [
          {
            id: "ch4-q1-prefix",
            prompt:
              'The prefix "re-" means "again." What does "rebuild" mean?',
            choices: [
              "to build again",
              "to stop building",
              "to build slowly",
              "to build alone",
            ],
            answer: 0,
            hint: 'Add the meaning of "re-" to the word "build."',
            explain: '"Re-" means again, so "rebuild" means to build something again.',
          },
          {
            id: "ch4-q2-suffix",
            prompt:
              'Adding the suffix "-less" means "without." What does "fearless" mean?',
            choices: ["without fear", "full of fear", "a little afraid", "causing fear"],
            answer: 0,
            hint: '"-less" takes the fear away.',
            explain: '"-less" means without, so "fearless" means without fear — very brave!',
          },
          {
            id: "ch4-q3-context",
            prompt:
              'Read: "The hikers were weary after the long climb, so they rested by the stream." What does "weary" mean?',
            choices: ["very tired", "very excited", "very hungry", "very lost"],
            answer: 0,
            hint: "Think about how a long climb makes you feel, and why they rested.",
            explain: '"Weary" means very tired — that\'s why the hikers stopped to rest.',
          },
        ],
      },
    ],
  },
  {
    questId: "maker-yard",
    subject: "math",
    giver: "Gizmo the Maker",
    emoji: "🛠️",
    title: "The Clockwork Festival",
    blurb:
      "Help Gizmo fix the jammed festival machines by solving math puzzles to bring the Clockwork Festival roaring back to life.",
    chapters: [
      {
        id: "ch1-start-the-gears",
        title: "Chapter 1 · Start the Gears",
        intro:
          "Welcome to Maker Yard! The big festival gears are stuck. Help me count and turn them, and we'll get this machine humming again.",
        rewardTokens: 6,
        questions: [
          {
            id: "ch1-q1",
            prompt:
              "Gizmo loads 245 bolts into the gear box, then adds 132 more. How many bolts are in the box now?",
            choices: ["377", "367", "387", "313"],
            answer: 0,
            hint: "Add the hundreds, tens, and ones. 245 + 132.",
            explain: "245 + 132 = 377 bolts. Nice adding!",
          },
          {
            id: "ch1-q2",
            prompt:
              "A small gear has 6 teeth. A row needs 7 of these gears. How many teeth are in the whole row?",
            choices: ["13", "36", "42", "48"],
            answer: 2,
            hint: "This is multiplication: 6 teeth times 7 gears.",
            explain: "6 × 7 = 42 teeth in the row.",
          },
          {
            id: "ch1-q3",
            prompt:
              "Gizmo shares 24 springs equally into 4 boxes. How many springs go in each box?",
            choices: ["6", "8", "5", "4"],
            answer: 0,
            hint: "Divide the springs into equal groups: 24 ÷ 4.",
            explain: "24 ÷ 4 = 6 springs in each box. Fair shares!",
          },
        ],
      },
      {
        id: "ch2-tune-the-music-box",
        title: "Chapter 2 · Tune the Music Box",
        intro:
          "The festival music box plays cut-up tunes and broken patterns. Use fractions and number patterns to set it right!",
        rewardTokens: 8,
        questions: [
          {
            id: "ch2-q1",
            prompt:
              "The music wheel is split into 8 equal slices. 3 slices are blue. What fraction of the wheel is blue?",
            choices: ["3/8", "8/3", "3/5", "1/8"],
            answer: 0,
            hint: "The top number is the colored slices; the bottom is the total slices.",
            explain: "3 blue out of 8 slices is 3/8.",
          },
          {
            id: "ch2-q2",
            prompt:
              "A song fills 2/6 of the reel, then 3/6 more. How much of the reel is filled now?",
            choices: ["5/12", "5/6", "6/6", "1/6"],
            answer: 1,
            hint: "Same bottom number, so just add the tops: 2 + 3.",
            explain: "2/6 + 3/6 = 5/6 of the reel.",
          },
          {
            id: "ch2-q3",
            prompt: "The note pattern goes 3, 6, 9, 12, ___. What number comes next?",
            choices: ["14", "15", "16", "13"],
            answer: 1,
            hint: "Each note jumps up by the same amount. How much?",
            explain: "The pattern adds 3 each time, so 12 + 3 = 15.",
          },
        ],
      },
      {
        id: "ch3-build-the-ride",
        title: "Chapter 3 · Build the Festival Ride",
        intro:
          "The shape-sorting ride won't start until its panels fit just right. Measure the panels and check your shapes to get it spinning!",
        rewardTokens: 11,
        questions: [
          {
            id: "ch3-q1",
            prompt:
              "A rectangular ride panel is 9 feet long and 4 feet wide. What is its area?",
            choices: [
              "13 square feet",
              "26 square feet",
              "36 square feet",
              "32 square feet",
            ],
            answer: 2,
            hint: "Area of a rectangle is length times width.",
            explain: "9 × 4 = 36 square feet of panel.",
          },
          {
            id: "ch3-q2",
            prompt:
              "A square safety mat has sides of 7 feet each. What is the perimeter all the way around?",
            choices: ["14 feet", "28 feet", "49 feet", "21 feet"],
            answer: 1,
            hint: "A square has 4 equal sides. Add them all, or multiply 7 × 4.",
            explain: "7 + 7 + 7 + 7 = 28 feet around.",
          },
          {
            id: "ch3-q3",
            prompt:
              "Gizmo needs a shape with exactly 3 sides and 3 corners for the ride's flag. Which shape works?",
            choices: ["Triangle", "Square", "Pentagon", "Circle"],
            answer: 0,
            hint: "Count the sides: which shape has just 3?",
            explain: "A triangle has exactly 3 sides and 3 corners.",
          },
        ],
      },
      {
        id: "ch4-light-the-clock-tower",
        title: "Chapter 4 · Light the Clock Tower",
        intro:
          "One machine left: the grand clock tower! Solve these tricky festival puzzles about time, money, and clever thinking to light it up.",
        rewardTokens: 14,
        questions: [
          {
            id: "ch4-q1",
            prompt:
              "The festival opens at 9:45 AM and the parade starts 50 minutes later. What time does the parade start?",
            choices: ["10:35 AM", "10:25 AM", "10:45 AM", "9:95 AM"],
            answer: 0,
            hint: "Add 50 minutes to 9:45. Remember an hour is 60 minutes.",
            explain: "9:45 plus 50 minutes is 10:35 AM.",
          },
          {
            id: "ch4-q2",
            prompt:
              "A ticket costs $4. Gizmo buys 6 tickets and pays with a $30 bill. How much change does Gizmo get back?",
            choices: ["$24", "$6", "$10", "$4"],
            answer: 1,
            hint: "First find the total cost: 6 × $4. Then subtract from $30.",
            explain: "6 × $4 = $24, and $30 − $24 = $6 change.",
          },
          {
            id: "ch4-q3",
            prompt:
              "There are 18 lanterns. One third of them are red, and the rest are gold. How many lanterns are gold?",
            choices: ["6", "9", "12", "15"],
            answer: 2,
            hint: "One third of 18 is red (18 ÷ 3). The rest are gold.",
            explain: "18 ÷ 3 = 6 red, so 18 − 6 = 12 gold lanterns.",
          },
        ],
      },
    ],
  },
  {
    questId: "sky-lab",
    subject: "science",
    giver: "Dr. Lux the Stargazer",
    emoji: "🔭",
    title: "Signals from the Stars",
    blurb:
      "Strange signals are beaming into Sky Lab from deep space, and only your science smarts can decode them and answer back.",
    chapters: [
      {
        id: "ch1-first-ping",
        title: "Chapter 1 · The First Ping",
        intro:
          'A soft beep, beep, beep fills Sky Lab. Dr. Lux grins. "A signal! It\'s faint, friend. Answer these starter questions and the message will sharpen up."',
        rewardTokens: 6,
        questions: [
          {
            id: "q1-sun-star",
            prompt: "The signal asks: what is our Sun?",
            choices: ["A planet", "A star", "A moon", "A cloud"],
            answer: 1,
            hint: "It makes its own light and heat, like the tiny dots you see at night.",
            explain: "The Sun is a star, the closest one to Earth!",
          },
          {
            id: "q2-moon-light",
            prompt: "Why does the Moon shine at night?",
            choices: [
              "It is on fire",
              "It makes its own light",
              "It reflects light from the Sun",
              "It is full of glowing rocks",
            ],
            answer: 2,
            hint: "The Moon has no light of its own. Something else's light bounces off it.",
            explain: "The Moon reflects the Sun's light, like a mirror in the sky.",
          },
          {
            id: "q3-water-states",
            prompt: "When water freezes solid, what does it become?",
            choices: ["Steam", "Ice", "Rain", "Fog"],
            answer: 1,
            hint: "Think about what forms in a freezer.",
            explain: "Frozen water becomes ice, the solid state of water.",
          },
        ],
      },
      {
        id: "ch2-clearing-static",
        title: "Chapter 2 · Clearing the Static",
        intro:
          '"Static is scrambling the message," Dr. Lux says, twisting a dial. "Each right answer wipes away the fuzz. Let\'s tune it in together!"',
        rewardTokens: 9,
        questions: [
          {
            id: "q1-water-cycle",
            prompt:
              "In the water cycle, what is it called when water vapor cools and forms clouds?",
            choices: ["Evaporation", "Condensation", "Erosion", "Reflection"],
            answer: 1,
            hint: "It's the opposite of evaporation, when gas turns back into tiny water drops.",
            explain: "Condensation is water vapor cooling into droplets that build clouds.",
          },
          {
            id: "q2-magnet",
            prompt: "Which object would a magnet pull toward itself?",
            choices: [
              "A plastic spoon",
              "A wooden block",
              "An iron nail",
              "A glass marble",
            ],
            answer: 2,
            hint: "Magnets pull on certain metals, like iron and steel.",
            explain: "Magnets attract iron, so the iron nail gets pulled in.",
          },
          {
            id: "q3-food-chain",
            prompt:
              "In a meadow food chain, which living thing makes its own food using sunlight?",
            choices: ["A grasshopper", "A grass plant", "A frog", "A hawk"],
            answer: 1,
            hint: "Only one of these is green and grows in the ground.",
            explain:
              "Plants like grass make their own food from sunlight. That's why they start food chains.",
          },
        ],
      },
      {
        id: "ch3-decoding-map",
        title: "Chapter 3 · The Hidden Star Map",
        intro:
          '"The signal is a map!" Dr. Lux gasps. "But the labels are missing. Decode each clue and the map will glow back to life."',
        rewardTokens: 12,
        questions: [
          {
            id: "q1-gravity",
            prompt: "What force keeps the planets moving around the Sun?",
            choices: ["Magnetism", "Wind", "Gravity", "Electricity"],
            answer: 2,
            hint: "It's the same pull that makes a dropped ball fall to the ground.",
            explain: "Gravity is the pull that holds planets in orbit around the Sun.",
          },
          {
            id: "q2-seasons",
            prompt: "Why does Earth have seasons like summer and winter?",
            choices: [
              "Earth moves closer to and farther from the Sun",
              "Earth is tilted as it orbits the Sun",
              "The Sun turns on and off",
              "The Moon blocks the Sun",
            ],
            answer: 1,
            hint: "It has to do with the way Earth leans, not how far away it is.",
            explain:
              "Earth's tilt means different parts lean toward the Sun at different times, giving us seasons.",
          },
          {
            id: "q3-adaptation",
            prompt:
              "A polar bear has thick fur and a layer of fat. How does this help it?",
            choices: [
              "It helps it fly",
              "It keeps it warm in the cold",
              "It helps it breathe underwater",
              "It makes it glow in the dark",
            ],
            answer: 1,
            hint: "Think about where polar bears live and how cold it is there.",
            explain:
              "Thick fur and fat are adaptations that keep polar bears warm in icy places.",
          },
        ],
      },
      {
        id: "ch4-send-reply",
        title: "Chapter 4 · Sending Our Reply",
        intro:
          '"The map points home, friend, and now we answer back!" Dr. Lux beams. "These last clues are the trickiest. Decode them and our reply lights up the stars."',
        rewardTokens: 15,
        questions: [
          {
            id: "q1-moon-phase",
            prompt: "During a new moon, why can't we see the Moon in the night sky?",
            choices: [
              "The Moon has disappeared",
              "The Sun-lit side of the Moon faces away from Earth",
              "Clouds always cover it",
              "The Moon stops moving",
            ],
            answer: 1,
            hint: "The Moon is still there, but its bright, Sun-lit side is turned away from us.",
            explain:
              "At a new moon, the lit half faces the Sun, away from Earth, so we see almost nothing.",
          },
          {
            id: "q2-rock-cycle",
            prompt:
              "Which type of rock forms when melted rock from a volcano cools and hardens?",
            choices: ["Sedimentary rock", "Igneous rock", "A fossil", "Sand"],
            answer: 1,
            hint: "Its name comes from a word meaning fire. Think of hot, melted rock.",
            explain:
              "Igneous rock forms when melted rock (lava or magma) cools and hardens.",
          },
          {
            id: "q3-sound",
            prompt:
              "You see a faraway firework flash, then hear the boom a moment later. Why does the sound arrive after the light?",
            choices: [
              "Light travels faster than sound",
              "Sound travels faster than light",
              "Your ears are slower than your eyes",
              "The boom happened later than the flash",
            ],
            answer: 0,
            hint: "One of these zips through the air much faster than the other.",
            explain:
              "Light travels much faster than sound, so we see the flash before we hear the boom.",
          },
        ],
      },
    ],
  },
];

export function academyById(id: AcademyQuestId): AcademyQuest | undefined {
  return ACADEMY_QUESTS.find((quest) => quest.questId === id);
}
