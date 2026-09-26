/* ------------------------------------------------------------------ */
/* Reptile Trivia — question bank + round logic                        */
/* ------------------------------------------------------------------ */

export type TriviaCategory =
  | "Green Tree Pythons"
  | "Snake Biology"
  | "Husbandry"
  | "Arboreal Planet";

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  difficulty: 1 | 2 | 3;
  question: string;
  options: [string, string, string, string];
  /** Index of the correct option. */
  answer: number;
  explanation: string;
}

export const QUESTIONS_PER_ROUND = 10;
export const QUESTION_SECONDS = 15;
export const TRIVIA_BEST_KEY = "arboreal_reptile_trivia_best";

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  /* ------------------------- Green Tree Pythons ------------------------- */
  {
    id: "gtp-01",
    category: "Green Tree Pythons",
    difficulty: 1,
    question: "What does “arboreal” mean?",
    options: ["Tree-dwelling", "Egg-laying", "Night-hunting", "Venomous"],
    answer: 0,
    explanation: "Arboreal animals live most of their lives in trees — like green tree pythons.",
  },
  {
    id: "gtp-02",
    category: "Green Tree Pythons",
    difficulty: 1,
    question: "Newborn green tree pythons are usually which colors?",
    options: ["Green or blue", "Red or yellow", "Black or white", "Brown or gray"],
    answer: 1,
    explanation: "GTP babies hatch red or yellow depending on locality, then turn green as they grow.",
  },
  {
    id: "gtp-03",
    category: "Green Tree Pythons",
    difficulty: 1,
    question: "What color are most adult green tree pythons?",
    options: ["Bright green", "Deep red", "Golden yellow", "Jet black"],
    answer: 0,
    explanation: "Most adults settle into that famous emerald green, often with white or blue markings.",
  },
  {
    id: "gtp-04",
    category: "Green Tree Pythons",
    difficulty: 2,
    question: "In 2020 the green tree python complex was split into two species. The northern species is…",
    options: ["Morelia azurea", "Morelia bredli", "Morelia spilota", "Morelia carinata"],
    answer: 0,
    explanation: "Northern populations became Morelia azurea; true Morelia viridis is now the southern (Aru/Merauke) lineage.",
  },
  {
    id: "gtp-05",
    category: "Green Tree Pythons",
    difficulty: 2,
    question: "Which locality is famous for yellow neonates?",
    options: ["Biak", "Sorong", "Aru", "Jayapura"],
    answer: 2,
    explanation: "Aru Islands animals — true Morelia viridis — famously hatch yellow.",
  },
  {
    id: "gtp-06",
    category: "Green Tree Pythons",
    difficulty: 2,
    question: "“Chondro” is short for…",
    options: ["Chondropython", "Chondrodite", "Chondrichthyes", "Chondroma"],
    answer: 0,
    explanation: "Chondropython viridis was the green tree python's former scientific name — the nickname stuck.",
  },
  {
    id: "gtp-07",
    category: "Green Tree Pythons",
    difficulty: 1,
    question: "How do green tree pythons subdue their prey?",
    options: ["Venom", "Constriction", "Electrocution", "Drowning"],
    answer: 1,
    explanation: "They're non-venomous constrictors — they strike, coil, and squeeze.",
  },
  {
    id: "gtp-08",
    category: "Green Tree Pythons",
    difficulty: 3,
    question: "Kofiau, home of famously yellow GTP babies, sits in which island group?",
    options: ["Raja Ampat", "Solomon Islands", "Bismarck Archipelago", "Lesser Sundas"],
    answer: 0,
    explanation: "Kofiau is part of the Raja Ampat archipelago off the Bird's Head Peninsula.",
  },
  {
    id: "gtp-09",
    category: "Green Tree Pythons",
    difficulty: 1,
    question: "Wild green tree pythons are native to…",
    options: ["New Guinea and nearby islands", "The Amazon basin", "Madagascar", "Mainland Southeast Asia"],
    answer: 0,
    explanation: "New Guinea and surrounding islands, plus Australia's Cape York Peninsula.",
  },
  {
    id: "gtp-10",
    category: "Green Tree Pythons",
    difficulty: 2,
    question: "In adult green tree pythons, which sex is typically larger?",
    options: ["Females", "Males", "They're identical", "It varies randomly"],
    answer: 0,
    explanation: "Adult females are usually the larger, heavier sex — handy for breeding projects.",
  },
  {
    id: "gtp-11",
    category: "Green Tree Pythons",
    difficulty: 3,
    question: "In Canopy Hunter's Southern Wilds region, the snakes are…",
    options: [
      "True Morelia viridis that throw yellow babies",
      "A mix of every locality",
      "Albino morphs",
      "Emerald tree boas",
    ],
    answer: 0,
    explanation: "The Southern Wilds (Aru + Merauke) is true Morelia viridis country — yellow babies only.",
  },
  {
    id: "gtp-12",
    category: "Green Tree Pythons",
    difficulty: 1,
    question: "Green tree pythons are primarily active…",
    options: ["At night", "At dawn", "At midday", "Only during rain"],
    answer: 0,
    explanation: "They're nocturnal ambush hunters, coiled on a branch waiting for dinner to wander by.",
  },

  /* ---------------------------- Snake Biology ---------------------------- */
  {
    id: "bio-01",
    category: "Snake Biology",
    difficulty: 1,
    question: "A snake's forked tongue is mainly used for…",
    options: ["Smelling", "Tasting food", "Hearing", "Drinking"],
    answer: 0,
    explanation: "The tongue delivers scent particles to the Jacobson's organ in the roof of the mouth.",
  },
  {
    id: "bio-02",
    category: "Snake Biology",
    difficulty: 1,
    question: "How many eyelids does a snake have?",
    options: ["None", "Two", "Four", "One"],
    answer: 0,
    explanation: "Snakes have no eyelids — a transparent scale called the brille protects each eye.",
  },
  {
    id: "bio-03",
    category: "Snake Biology",
    difficulty: 2,
    question: "What is the brille?",
    options: ["A clear scale covering the eye", "A type of venom", "A throat pouch", "A tail rattle"],
    answer: 0,
    explanation: "The brille (spectacle) is a transparent scale shielding the eye — it sheds with the skin.",
  },
  {
    id: "bio-04",
    category: "Snake Biology",
    difficulty: 1,
    question: "The heat-sensing pits of pythons detect…",
    options: ["Infrared radiation", "Ultraviolet light", "Sound waves", "Magnetic fields"],
    answer: 0,
    explanation: "Pit organs sense the body heat of warm-blooded prey — night-vision goggles, built in.",
  },
  {
    id: "bio-05",
    category: "Snake Biology",
    difficulty: 2,
    question: "“Oviparous” means an animal…",
    options: ["Lays eggs", "Gives live birth", "Clones itself", "Hatches eggs internally"],
    answer: 0,
    explanation: "Oviparous = egg-laying. Pythons are oviparous; most boas are viviparous (live birth).",
  },
  {
    id: "bio-06",
    category: "Snake Biology",
    difficulty: 2,
    question: "Which gives live birth — the emerald tree boa or the green tree python?",
    options: ["Emerald tree boa", "Green tree python", "Both do", "Neither does"],
    answer: 0,
    explanation: "Most boas bear live young; pythons lay eggs. Convergent looks, different playbooks.",
  },
  {
    id: "bio-07",
    category: "Snake Biology",
    difficulty: 1,
    question: "A group of snakes is called…",
    options: ["A den", "A flock", "A school", "A pack"],
    answer: 0,
    explanation: "A den (also called a nest or pit) of snakes. Try not to find one unexpectedly.",
  },
  {
    id: "bio-08",
    category: "Snake Biology",
    difficulty: 2,
    question: "Brumation is…",
    options: ["A dormancy period like hibernation", "A mating dance", "A type of shed", "A venom delivery method"],
    answer: 0,
    explanation: "Brumation is the reptile version of hibernation — slowed metabolism through the cool season.",
  },
  {
    id: "bio-09",
    category: "Snake Biology",
    difficulty: 3,
    question: "Compared to adults, young growing snakes typically shed…",
    options: ["More often", "Less often", "Only once a year", "Never"],
    answer: 0,
    explanation: "Fast growth means frequent sheds — babies can shed every few weeks.",
  },
  {
    id: "bio-10",
    category: "Snake Biology",
    difficulty: 2,
    question: "Snakes with long, hinged, hollow fangs that fold back are…",
    options: ["Vipers", "Pythons", "Colubrids", "Boas"],
    answer: 0,
    explanation: "That's solenoglyphous dentition — classic viper hardware, like a switchblade.",
  },
  {
    id: "bio-11",
    category: "Snake Biology",
    difficulty: 1,
    question: "Snakes hear the way we do.",
    options: [
      "False — no external ears, they sense vibrations",
      "True — with keen hearing",
      "True — but only low rumbles",
      "False — they are completely deaf",
    ],
    answer: 0,
    explanation: "No external ears, but their jawbones pick up ground vibrations just fine.",
  },
  {
    id: "bio-12",
    category: "Snake Biology",
    difficulty: 3,
    question: "A snake's wide belly scales (ventral scutes) mainly help it…",
    options: ["Grip surfaces to move", "Absorb heat", "Sense smell", "Store fat"],
    answer: 0,
    explanation: "Ventral scutes grip the ground like cleats — that's how a snake with no legs gets around.",
  },

  /* ------------------------------ Husbandry ------------------------------ */
  {
    id: "hus-01",
    category: "Husbandry",
    difficulty: 1,
    question: "A shed that comes off in one complete piece suggests…",
    options: ["Good health and humidity", "Mites", "Old age", "Overfeeding"],
    answer: 0,
    explanation: "One clean tube of shed skin is the gold star of reptile keeping.",
  },
  {
    id: "hus-02",
    category: "Husbandry",
    difficulty: 2,
    question: "Stuck shed constricting toes or a tail tip can lead to…",
    options: ["Tissue loss", "Better color", "Faster growth", "Nothing at all"],
    answer: 0,
    explanation: "Retained shed cuts off circulation — always check toes and tail tips after a shed.",
  },
  {
    id: "hus-03",
    category: "Husbandry",
    difficulty: 1,
    question: "The safest way to thaw a frozen feeder is…",
    options: ["In the fridge or cold water", "In the microwave", "In direct sunlight", "With a hair dryer"],
    answer: 0,
    explanation: "Slow-thaw in the fridge or cold water. Microwaves cook unevenly and invite bacteria.",
  },
  {
    id: "hus-04",
    category: "Husbandry",
    difficulty: 2,
    question: "New animals are quarantined to…",
    options: [
      "Watch for illness or mites before joining the collection",
      "Tame them faster",
      "Save on heating",
      "Keep them hungry",
    ],
    answer: 0,
    explanation: "Quarantine keeps one sick newcomer from becoming a collection-wide problem.",
  },
  {
    id: "hus-05",
    category: "Husbandry",
    difficulty: 2,
    question: "Green tree pythons generally thrive at humidity around…",
    options: ["60–80%", "10–20%", "30–40%", "95–100%"],
    answer: 0,
    explanation: "They're rainforest canopy animals — moderate to high humidity keeps sheds clean.",
  },
  {
    id: "hus-06",
    category: "Husbandry",
    difficulty: 1,
    question: "A proper enclosure has a warm side and a cool side so the snake can…",
    options: ["Thermoregulate", "Hide from you", "Exercise", "Digest only"],
    answer: 0,
    explanation: "Reptiles can't make their own body heat — the gradient lets them pick their temperature.",
  },
  {
    id: "hus-07",
    category: "Husbandry",
    difficulty: 3,
    question: "The “wobble” condition is famously linked to which ball python morph?",
    options: ["Spider", "Albino", "Piebald", "Clown"],
    answer: 0,
    explanation: "The spider morph carries a neurological wobble of varying severity — a well-known ethics debate.",
  },
  {
    id: "hus-08",
    category: "Husbandry",
    difficulty: 1,
    question: "Fresh drinking water should be available…",
    options: ["At all times", "Once a week", "Only after feeding", "Only in summer"],
    answer: 0,
    explanation: "Always. A big water bowl also bumps humidity — double duty.",
  },
  {
    id: "hus-09",
    category: "Husbandry",
    difficulty: 3,
    question: "In reptile genetics, “het” means…",
    options: [
      "Heterozygous — carrying a hidden recessive gene",
      "A heating element",
      "A locality code",
      "Short for heterodont",
    ],
    answer: 0,
    explanation: "A het animal looks normal but carries one copy of a recessive gene it can pass on.",
  },
  {
    id: "hus-10",
    category: "Husbandry",
    difficulty: 2,
    question: "Handling a snake right after a meal risks…",
    options: ["Regurgitation", "A better bond", "Faster digestion", "Nothing"],
    answer: 0,
    explanation: "Give them 48 hours to digest in peace — a regurgitated meal is rough on the animal.",
  },
  {
    id: "hus-11",
    category: "Husbandry",
    difficulty: 2,
    question: "Hides on both the warm and cool ends let a snake…",
    options: ["Feel secure while thermoregulating", "Pick a favorite color", "Avoid drinking", "Sleep less"],
    answer: 0,
    explanation: "Security plus temperature choice — a hiding snake is a happy snake.",
  },
  {
    id: "hus-12",
    category: "Husbandry",
    difficulty: 1,
    question: "The most important first step when a reptile looks sick is…",
    options: ["See a reptile vet", "Bathe it in oil", "Crank the heat to max", "Wait a month"],
    answer: 0,
    explanation: "Find an exotics vet. Internet remedies can wait; a professional can't.",
  },

  /* ---------------------------- Arboreal Planet ---------------------------- */
  {
    id: "ap-01",
    category: "Arboreal Planet",
    difficulty: 1,
    question: "Hank Scale's catchphrase is…",
    options: [
      "We sell snakes and snake accessories.",
      "Got chondros?",
      "Snakes forever.",
      "Buy the dip.",
    ],
    answer: 0,
    explanation: "Hank Hill energy, reptile edition.",
  },
  {
    id: "ap-02",
    category: "Arboreal Planet",
    difficulty: 1,
    question: "The Chondro Dojo is…",
    options: [
      "An enclosure built to house a GTP from hatchling to adult",
      "A martial arts gym",
      "A snake restaurant",
      "A type of heat lamp",
    ],
    answer: 0,
    explanation: "Gage's real-life product — one enclosure for a chondro's whole life.",
  },
  {
    id: "ap-03",
    category: "Arboreal Planet",
    difficulty: 2,
    question: "The Arboreal Keeper intro grants new players…",
    options: ["$30,000 in credit", "A free car", "One cricket", "$30"],
    answer: 0,
    explanation: "Thirty grand in store credit at Hank Scale's Reptiles. Not a bad start.",
  },
  {
    id: "ap-04",
    category: "Arboreal Planet",
    difficulty: 1,
    question: "Which mini-game lets you catch wild GTPs and send them to your Keeper save?",
    options: ["Canopy Hunter", "Reptile Trivia", "Snake Poker", "The Dojo"],
    answer: 0,
    explanation: "Canopy Hunter — bag wild green tree pythons and import them into Arboreal Keeper.",
  },
  {
    id: "ap-05",
    category: "Arboreal Planet",
    difficulty: 2,
    question: "Arboreal Radio is…",
    options: [
      "An opt-in mini-player for music by Gage and collaborators",
      "A live snake cam",
      "A podcast about taxes",
      "A weather station",
    ],
    answer: 0,
    explanation: "Silent until you press play — 17 tracks of Lizard music and counting.",
  },
  {
    id: "ap-06",
    category: "Arboreal Planet",
    difficulty: 2,
    question: "Which carnivorous plant genus is featured in the Plants section?",
    options: ["Nepenthes", "Rosa", "Quercus", "Tulipa"],
    answer: 0,
    explanation: "Tropical pitcher plants — a bioactive-enclosure favorite.",
  },
  {
    id: "ap-07",
    category: "Arboreal Planet",
    difficulty: 3,
    question: "The game is called Arboreal Keeper. The community is called…",
    options: ["Arboreal Planet", "Arboreal Keeper", "Chondro World", "Snakebook"],
    answer: 0,
    explanation: "Arboreal Planet is the community; Arboreal Keeper is the game it made. Don't mix them up.",
  },
  {
    id: "ap-08",
    category: "Arboreal Planet",
    difficulty: 1,
    question: "In Canopy Hunter, how many trees are in each expedition?",
    options: ["12", "4", "8", "20"],
    answer: 0,
    explanation: "Twelve trees, eight searches, four hidden pythons. Spend those searches wisely.",
  },
  {
    id: "ap-09",
    category: "Arboreal Planet",
    difficulty: 2,
    question: "In Canopy Hunter, how many searches do you get per expedition?",
    options: ["8", "12", "4", "Unlimited"],
    answer: 0,
    explanation: "Eight searches for four pythons — a 50% hit rate if you play it perfectly.",
  },
  {
    id: "ap-10",
    category: "Arboreal Planet",
    difficulty: 3,
    question: "Which Canopy Hunter region is “true Morelia viridis country”?",
    options: ["Southern Wilds", "Cenderawasih Islands", "Bird's Head West", "Highlands & North Coast"],
    answer: 0,
    explanation: "The Southern Wilds (Aru + Merauke) — yellow babies only.",
  },
  {
    id: "ap-11",
    category: "Arboreal Planet",
    difficulty: 1,
    question: "Arboreal Planet is…",
    options: ["A reptile hobby community", "A planetarium", "A tree farm", "A crypto exchange"],
    answer: 0,
    explanation: "Reptiles, stories, keepers, and one extremely catchy radio station.",
  },
  {
    id: "ap-12",
    category: "Arboreal Planet",
    difficulty: 2,
    question: "The arcade's featured full game is…",
    options: ["Arboreal Keeper", "Canopy Hunter", "Reptile Trivia", "Pong"],
    answer: 0,
    explanation: "Arboreal Keeper — build a green tree python breeding program from the ground up.",
  },
];

/* ------------------------------------------------------------------ */
/* Round logic                                                         */
/* ------------------------------------------------------------------ */

type RandomFn = () => number;

/** Shuffle the bank and deal a round of QUESTIONS_PER_ROUND. */
export function buildRound(random: RandomFn = Math.random): TriviaQuestion[] {
  const pool = [...TRIVIA_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, QUESTIONS_PER_ROUND);
}

/** Score for a correct answer: base by difficulty + speed bonus + streak bonus. */
export function scoreFor(difficulty: 1 | 2 | 3, secondsLeft: number, streak: number): number {
  const base = 100 * difficulty;
  const timeBonus = Math.round((secondsLeft / QUESTION_SECONDS) * 50);
  const streakBonus = Math.min(streak, 5) * 20;
  return base + timeBonus + streakBonus;
}

export interface TriviaRank {
  title: string;
  blurb: string;
}

/** Rank titles for a finished round. */
export function rankFor(score: number): TriviaRank {
  if (score >= 3200)
    return { title: "Chondro Master", blurb: "The canopy bows to you. Hank would be proud." };
  if (score >= 2200)
    return { title: "Seasoned Keeper", blurb: "Years of shed skins and thermostat checks shine through." };
  if (score >= 1200)
    return { title: "Keeper in Training", blurb: "Solid foundation — the snakes can tell." };
  return { title: "Hatchling", blurb: "Every expert started exactly here. Run it back." };
}

/** Read the persisted best score (0 when none). */
export function readBestScore(): number {
  try {
    const raw = window.localStorage.getItem(TRIVIA_BEST_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist a best score. */
export function writeBestScore(score: number): void {
  try {
    window.localStorage.setItem(TRIVIA_BEST_KEY, String(score));
  } catch {
    /* storage unavailable — best score just won't persist */
  }
}
