// ---------------------------------------------------------------------------
// advancedContent — harder (grade 4-5) question pools for tier-2 "Grand"
// creatures and the co-op boss. Generated + adversarially fact-checked.
// ---------------------------------------------------------------------------
import type { AcademyQuestion, Subject } from "./academyQuests";

const POOLS: Record<Subject, AcademyQuestion[]> = {
  "reading": [
    {
      "id": "r1",
      "prompt": "Read the passage: \"Maya double-checked the campsite, tightened every knot, and packed a backup map. Her brother just shrugged and threw his gear in the car.\" What does this passage suggest about Maya?",
      "choices": [
        "She is careless and forgetful",
        "She is thorough and well-prepared",
        "She is angry at her brother",
        "She is afraid of camping"
      ],
      "answer": 1,
      "hint": "Notice the careful actions: double-checked, tightened, packed a backup.",
      "explain": "Maya double-checks, tightens knots, and brings a backup map. These careful actions show she is thorough and well-prepared. The text never says she is careless, angry, or afraid."
    },
    {
      "id": "r2",
      "prompt": "The coach told the team, \"The new player is a rock during tough games.\" What does the metaphor \"a rock\" mean here?",
      "choices": [
        "The player is heavy and slow",
        "The player is steady and dependable under pressure",
        "The player is hard to talk to",
        "The player likes collecting stones"
      ],
      "answer": 1,
      "hint": "Think about what good quality a rock has when things get hard.",
      "explain": "Calling someone \"a rock\" is a metaphor meaning they stay steady and dependable, especially under pressure. It is praise, not a comment about weight, friendliness, or hobbies."
    },
    {
      "id": "r3",
      "prompt": "Read: \"After running the whole race in the heat, Liam was exhausted.\" Which word could BEST replace 'exhausted' without changing the meaning?",
      "choices": [
        "worn out",
        "sleepy",
        "bored",
        "hungry"
      ],
      "answer": 0,
      "hint": "Pick the phrase that means completely out of energy, just like 'exhausted.'",
      "explain": "'Exhausted' means completely out of energy, so 'worn out' fits best. 'Sleepy,' 'bored,' and 'hungry' describe different feelings, not the deep tiredness of being exhausted."
    },
    {
      "id": "r4",
      "prompt": "The prefix 'mis-' is added to 'understand' to make 'misunderstand.' What does the prefix 'mis-' add to the meaning?",
      "choices": [
        "again",
        "wrongly or badly",
        "before",
        "without"
      ],
      "answer": 1,
      "hint": "To 'misunderstand' is to understand it the wrong way.",
      "explain": "The prefix 'mis-' means 'wrongly' or 'badly,' so to misunderstand is to understand incorrectly. 'Again' is 're-', 'before' is 'pre-', and 'without' is closer to '-less' or 'non-'."
    },
    {
      "id": "r5",
      "prompt": "Choose the sentence with correct subject-verb agreement.",
      "choices": [
        "The bunch of grapes were sitting on the table.",
        "Neither of the dogs are barking now.",
        "Each of the students brings a snack to share.",
        "The pile of books were on the floor."
      ],
      "answer": 2,
      "hint": "Words like 'each,' 'neither,' and 'bunch' are usually singular subjects.",
      "explain": "'Each' is singular, so it takes the singular verb 'brings': \"Each of the students brings a snack.\" The other sentences pair singular subjects (bunch, neither, pile) with the plural verb 'were,' which is incorrect."
    },
    {
      "id": "r6",
      "prompt": "An author writes an article titled \"Five Easy Steps to Keep Your Goldfish Healthy.\" What is the author's MAIN purpose?",
      "choices": [
        "To entertain readers with a funny story",
        "To inform and instruct readers how to do something",
        "To persuade readers to buy a goldfish",
        "To describe how a goldfish feels"
      ],
      "answer": 1,
      "hint": "A list of 'steps' is meant to teach you how to do a task.",
      "explain": "A title offering numbered 'steps' to do a task signals the author's purpose is to inform and instruct. It is not telling a story, selling a product, or describing feelings."
    },
    {
      "id": "r7",
      "prompt": "Read: \"The old gym was as quiet as a library, until the whistle blew and the room burst to life.\" The phrase \"as quiet as a library\" is an example of what?",
      "choices": [
        "A simile",
        "A pun",
        "An exaggeration that is false",
        "A spelling rule"
      ],
      "answer": 0,
      "hint": "It compares two things using the word 'as.'",
      "explain": "A simile compares two things using 'like' or 'as.' Here \"as quiet as a library\" compares the gym's quiet to a library, so it is a simile. It is not a pun, a falsehood, or a spelling rule."
    },
    {
      "id": "r8",
      "prompt": "Which sentence uses the correct comparative or superlative form?",
      "choices": [
        "This trail is the most steepest one in the park.",
        "This trail is steeper than the one we hiked yesterday.",
        "This trail is more steep than yesterday's trail.",
        "This trail is the steepest more difficult of all."
      ],
      "answer": 1,
      "hint": "Short words like 'steep' usually add '-er' or '-est' without 'more' or 'most.'",
      "explain": "For a short word like 'steep,' the comparative is 'steeper' (not 'more steep'), giving \"steeper than the one we hiked yesterday.\" The other choices double up forms ('most steepest') or misuse 'more.'"
    }
  ],
  "math": [
    {
      "id": "m1",
      "prompt": "A theater has 34 rows of seats with 27 seats in each row. How many seats are there in all?",
      "choices": [
        "918",
        "816",
        "888",
        "952"
      ],
      "answer": 0,
      "hint": "Multiply 34 x 27. Break it up: 34 x 20 plus 34 x 7.",
      "explain": "34 x 20 = 680 and 34 x 7 = 238. Add them: 680 + 238 = 918 seats."
    },
    {
      "id": "m2",
      "prompt": "A factory packs 1,456 crayons equally into 8 boxes. How many crayons go in each box?",
      "choices": [
        "172",
        "182",
        "192",
        "181"
      ],
      "answer": 1,
      "hint": "Divide 1,456 by 8. Try how many 8s fit into 14, then 5, then 16.",
      "explain": "1,456 / 8 = 182 with no remainder, since 8 x 182 = 1,456. Each box gets 182 crayons."
    },
    {
      "id": "m3",
      "prompt": "Which comparison is TRUE?",
      "choices": [
        "3/4 < 5/8",
        "3/4 = 5/8",
        "3/4 > 5/8",
        "5/8 > 7/8"
      ],
      "answer": 2,
      "hint": "Give both fractions the same bottom number. Change 3/4 into eighths.",
      "explain": "3/4 equals 6/8. Since 6/8 is greater than 5/8, it is true that 3/4 > 5/8."
    },
    {
      "id": "m4",
      "prompt": "What is 5/12 + 4/12 in simplest form?",
      "choices": [
        "9/24",
        "3/4",
        "9/12",
        "2/3"
      ],
      "answer": 1,
      "hint": "Add the top numbers and keep the bottom number, then simplify.",
      "explain": "5/12 + 4/12 = 9/12. Both 9 and 12 divide by 3, so 9/12 simplifies to 3/4."
    },
    {
      "id": "m5",
      "prompt": "Maya buys 3 notebooks that cost $4.85 each. She pays with a $20 bill. How much change should she get back?",
      "choices": [
        "$5.45",
        "$15.15",
        "$4.55",
        "$5.55"
      ],
      "answer": 0,
      "hint": "First find the total cost of 3 notebooks, then subtract from $20.",
      "explain": "3 x $4.85 = $14.55. Then $20.00 - $14.55 = $5.45 in change."
    },
    {
      "id": "m6",
      "prompt": "A garden is shaped like a rectangle that is 12 meters long and 7 meters wide. What is its PERIMETER?",
      "choices": [
        "84 m",
        "38 m",
        "19 m",
        "42 m"
      ],
      "answer": 1,
      "hint": "Perimeter adds up all four sides: length + width + length + width.",
      "explain": "Perimeter = 2 x (12 + 7) = 2 x 19 = 38 meters. (84 would be the area instead.)"
    },
    {
      "id": "m7",
      "prompt": "A movie starts at 10:45 a.m. and ends at 1:20 p.m. How long is the movie?",
      "choices": [
        "2 hours 35 minutes",
        "2 hours 25 minutes",
        "3 hours 35 minutes",
        "1 hour 35 minutes"
      ],
      "answer": 0,
      "hint": "Count from 10:45 to noon, then from noon to 1:20, and add.",
      "explain": "10:45 to 12:45 is 2 hours, and 12:45 to 1:20 is 35 minutes. Total is 2 hours 35 minutes."
    },
    {
      "id": "m8",
      "prompt": "Use order of operations to solve: 6 + 4 x 5 - 3",
      "choices": [
        "47",
        "23",
        "43",
        "27"
      ],
      "answer": 1,
      "hint": "Do the multiplication before the addition and subtraction.",
      "explain": "First 4 x 5 = 20. Then 6 + 20 - 3 = 23. Multiplying first is the key step."
    }
  ],
  "science": [
    {
      "id": "sci-adv-1",
      "prompt": "We see different moon phases because the Moon orbits Earth and we see different amounts of its sunlit half. If tonight is a first-quarter moon (right half lit), what phase comes about one week later?",
      "choices": [
        "New moon",
        "Full moon",
        "Waning crescent",
        "Another first quarter"
      ],
      "answer": 1,
      "hint": "The full cycle takes about 4 weeks, and a quarter of the way around is one week.",
      "explain": "The lunar cycle is about 28 days. First quarter is one week after new moon, and one more week brings the full moon, when we see the entire sunlit half."
    },
    {
      "id": "sci-adv-2",
      "prompt": "A scientist heats solid wax until it melts, then keeps heating until it boils into vapor. Which sequence correctly names these two changes of state?",
      "choices": [
        "Freezing, then condensation",
        "Melting, then evaporation",
        "Melting, then condensation",
        "Evaporation, then melting"
      ],
      "answer": 1,
      "hint": "Solid to liquid has one name; liquid to gas has another.",
      "explain": "Solid to liquid is melting; liquid to gas is evaporation (or boiling). Freezing and condensation go the other direction, releasing energy."
    },
    {
      "id": "sci-adv-3",
      "prompt": "A cart rolls down a ramp and speeds up the whole way. What is the main reason its speed increases as it goes down?",
      "choices": [
        "Air pushes it forward",
        "Gravity pulls it downhill",
        "Friction adds energy",
        "It has no mass"
      ],
      "answer": 1,
      "hint": "Think about which unbalanced force points down the slope.",
      "explain": "Gravity provides an unbalanced force pulling the cart down the ramp, so it accelerates. Friction and air resistance actually slow it down, not speed it up."
    },
    {
      "id": "sci-adv-4",
      "prompt": "In a simple circuit, a bulb lights when a switch is closed. The switch is then opened. Why does the bulb go out?",
      "choices": [
        "The battery instantly runs empty",
        "The circuit is now an open (broken) loop, so current can't flow",
        "The wire turns into an insulator",
        "Magnetism stops the electrons"
      ],
      "answer": 1,
      "hint": "Electric current needs a complete, unbroken path.",
      "explain": "Current only flows in a closed loop. Opening the switch creates a gap (an open circuit), breaking the path, so no current reaches the bulb."
    },
    {
      "id": "sci-adv-5",
      "prompt": "In a meadow food web, grass is eaten by grasshoppers, grasshoppers are eaten by frogs, and frogs are eaten by hawks. If a disease wiped out almost all the frogs, what would most likely happen first?",
      "choices": [
        "Grasshopper numbers would rise and hawks would have less food",
        "Grass would disappear completely",
        "Hawks would immediately increase",
        "Grasshoppers would go extinct"
      ],
      "answer": 0,
      "hint": "Frogs eat grasshoppers AND frogs are food for hawks.",
      "explain": "Without frogs eating them, grasshoppers would increase. And since hawks ate frogs, the hawks lose a food source. Removing one link affects animals both above and below it."
    },
    {
      "id": "sci-adv-6",
      "prompt": "When you breathe in, oxygen enters your lungs and passes into your blood. Which body system then carries that oxygen to the rest of your body?",
      "choices": [
        "Digestive system",
        "Circulatory system",
        "Skeletal system",
        "Nervous system"
      ],
      "answer": 1,
      "hint": "It's the system with the heart and blood vessels.",
      "explain": "The respiratory system takes in oxygen, but the circulatory system (heart and blood vessels) carries that oxygen in the blood to cells throughout the body."
    },
    {
      "id": "sci-adv-7",
      "prompt": "A granite rock is buried deep underground, where intense heat and pressure change it into a new rock called gneiss without melting it. What type of rock did the granite become?",
      "choices": [
        "Sedimentary rock",
        "Metamorphic rock",
        "Igneous rock",
        "Liquid magma"
      ],
      "answer": 1,
      "hint": "The word means 'changed form' and comes from heat and pressure, not melting.",
      "explain": "Heat and pressure that change a rock without melting it create metamorphic rock. If it had fully melted and cooled, it would form igneous rock instead."
    },
    {
      "id": "sci-adv-8",
      "prompt": "Maria thinks plants grow taller with more sunlight. She puts one plant in bright light and one in a dark closet, giving both the same water and soil. Why is keeping the water and soil the same so important?",
      "choices": [
        "To use up extra supplies",
        "So sunlight is the only thing that differs, making the test fair",
        "To make the plants grow faster",
        "Because plants don't need water"
      ],
      "answer": 1,
      "hint": "A fair test changes only one thing at a time.",
      "explain": "In a fair experiment you change just one variable (here, sunlight) and keep everything else the same. That way, any difference in growth can be linked to the sunlight, not water or soil."
    }
  ]
};

export function advancedQuestions(subject: Subject): AcademyQuestion[] {
  return POOLS[subject];
}

/** The boss draws from ALL advanced pools (a mixed-subject champion). */
export function bossQuestions(): AcademyQuestion[] {
  return [...POOLS.reading, ...POOLS.math, ...POOLS.science];
}
