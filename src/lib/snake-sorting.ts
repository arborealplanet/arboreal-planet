/**
 * Snake Sorting — "The Sorting Ceremony" game data.
 *
 * You are the Sorting Hat. Each snake is presented on the dais; you probe
 * Scales / Crown / Origin, then call its House (subspecies) and, for bonus,
 * its Locality. Houses and localities follow the canonical taxonomy in
 * src/lib/green-tree-python-taxa.ts.
 *
 * Snake photos are NOT generated — they are supplied by the owner.
 * Drop a webp named `<snake-id>.webp` into
 * public/arcade/snake-sorting/snakes/ and set `photo` below.
 *
 * Ceremony flow per serpent: a Round One neonate-color wager (Red or
 * Yellow, small points — skipped for House Viridis, which hatches only
 * yellow), then Scales / Crown / Origin probes, then the House
 * (subspecies) call, then the native-haunts (locality) bonus.
 */

export type HouseId = "azurea" | "utaraensis" | "pulcher" | "viridis" | "designer";

/** Game modes: the classic ceremony, the endless night, and the wildcard hard mode. */
export type GameMode = "ceremony" | "endless" | "wildcard";

export interface House {
  id: HouseId;
  name: string;
  taxon: string;
  shortTaxon: string;
  color: string; // hex accent
  glow: string; // rgba glow
  motto: string;
  region: string;
  localities: string[];
  marks: string; // field-mark summary shown in lessons
}

export const HOUSES: House[] = [
  {
    id: "azurea",
    name: "House Azurea",
    taxon: "Morelia azurea azurea",
    shortTaxon: "M. a. azurea",
    color: "#38bdf8",
    glow: "rgba(56,189,248,.45)",
    motto: "Isle-born and tide-true.",
    region: "Cenderawasih Islands",
    localities: ["Biak", "Numfor"],
    marks:
      "The island house. Heavy black dorsal scaling and strong yellow retention. Biak neonates hatch red or yellow — color alone never settles it.",
  },
  {
    id: "utaraensis",
    name: "House Utaraensis",
    taxon: "Morelia azurea utaraensis",
    shortTaxon: "M. a. utaraensis",
    color: "#34d399",
    glow: "rgba(52,211,153,.45)",
    motto: "Sharp eyes, northern skies.",
    region: "Northern Mainland",
    localities: ["Cyclops", "Jayapura", "Lereh", "Wamena"],
    marks:
      "The northern house. Blue striping down the dorsum and high white markings are the signature — the blue stripe never lies.",
  },
  {
    id: "pulcher",
    name: "House Pulcher",
    taxon: "Morelia azurea pulcher",
    shortTaxon: "M. a. pulcher",
    color: "#f87171",
    glow: "rgba(248,113,113,.45)",
    motto: "Bold blood of the western ranges.",
    region: "Western New Guinea",
    localities: ["Manokwari", "Arfak", "Sorong", "Timika", "Kofiau"],
    marks:
      "The western house. Breeders prize clean yellow retention with blue tones bleeding through. Kofiau animals hatch yellow every single time.",
  },
  {
    id: "viridis",
    name: "House Viridis",
    taxon: "Morelia viridis",
    shortTaxon: "M. viridis",
    color: "#fbbf24",
    glow: "rgba(251,191,36,.45)",
    motto: "Ancient gold of the southern wilds.",
    region: "Southern Wilds",
    localities: ["Aru", "Merauke"],
    marks:
      "The southern house — a true species apart. High white AND high black together is the classic look. Aru and Merauke neonates are always yellow.",
  },
  {
    id: "designer",
    name: "House Designer / Hybrid",
    taxon: "Morelia × designer",
    shortTaxon: "M. × designer",
    color: "#c084fc",
    glow: "rgba(192,132,252,.45)",
    motto: "Bred in racks, not rainforests.",
    region: "Captive Bred",
    localities: ["Captive Bred"],
    marks:
      "The wildcard house. Line-bred designer morphs and hybrid crosses — no wild map claims them. When the field marks refuse every homeland, call the wildcard.",
  },
];

export const HOUSE_BY_ID: Record<HouseId, House> = Object.fromEntries(
  HOUSES.map((h) => [h.id, h]),
) as Record<HouseId, House>;

export type ProbeKind = "scales" | "crown" | "origin";

export interface ProbeClue {
  probe: ProbeKind;
  label: string;
  text: string;
}

export interface SortingSnake {
  id: string;
  name: string;
  house: HouseId;
  locality: string;
  neonate: "red" | "yellow";
  photo: string | null;
  clues: ProbeClue[];
  deepScan: string;
  lesson: string;
}

export const PROBE_META: Record<ProbeKind, { label: string; hint: string }> = {
  scales: { label: "Scales", hint: "Probe the pattern & color" },
  crown: { label: "Crown", hint: "Probe the head" },
  origin: { label: "Origin", hint: "Probe the homeland" },
};

export const SNAKES: SortingSnake[] = [
  {
    id: "ember",
    name: "“Ember”",
    house: "azurea",
    locality: "Biak",
    neonate: "red",
    photo: "/arcade/snake-sorting/snakes/ember.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Brick-red neonate with heavy black dorsal scaling edging every scale." },
      { probe: "crown", label: "Head", text: "Crown mostly dark — black speckling across the whole head." },
      { probe: "origin", label: "Homeland", text: "Island moss and sea air. This clutch never knew a mainland." },
    ],
    deepScan: "Island clutch + heavy black scaling. Only one house owns the Cenderawasih islands.",
    lesson:
      "Heavy black scaling on an island animal is the Azurea signature. Biak and Numfor are the only island localities in the game — and Biak babies hatch red or yellow, so color alone never settles it.",
  },
  {
    id: "sulfur",
    name: "“Sulfur”",
    house: "azurea",
    locality: "Numfor",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate — and at two years old it is STILL glowing yellow." },
      { probe: "crown", label: "Head", text: "Broken black bands march across the crown like stitching." },
      { probe: "origin", label: "Homeland", text: "A small island off the north coast, ringed by reef." },
    ],
    deepScan: "Yellow retention plus black banding on a small north-coast island. That is Numfor — pure Azurea.",
    lesson:
      "Yellow retention with black banding on an island animal: House Azurea. The yellow tempted many keepers toward Viridis — but Viridis lives far to the south, never on these islands.",
  },
  {
    id: "coal",
    name: "“Coal”",
    house: "azurea",
    locality: "Biak",
    neonate: "red",
    photo: "/arcade/snake-sorting/snakes/coal.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Deep red neonate; black edging on every single dorsal scale." },
      { probe: "crown", label: "Head", text: "A near-solid black cap covers the head." },
      { probe: "origin", label: "Homeland", text: "Canopy over Biak Island — the big island of the Cenderawasih group." },
    ],
    deepScan: "Biak Island. The black cap and black-edged scales scream the island house.",
    lesson:
      "High black is the Azurea hallmark. When the whole crown goes dark on a Biak animal, the Hat barely has to think.",
  },
  {
    id: "glacier",
    name: "“Glacier”",
    house: "utaraensis",
    locality: "Jayapura",
    neonate: "yellow",
    photo: "/arcade/snake-sorting/snakes/glacier.webp",
    clues: [
      { probe: "scales", label: "Adult scales", text: "Green dorsum split by a teal-blue vertebral stripe." },
      { probe: "crown", label: "Head", text: "White labial scales and a pale, almost frosted crown." },
      { probe: "origin", label: "Homeland", text: "North-coast lowlands, humid air, morning mist off the bay." },
    ],
    deepScan: "Blue vertebral stripe + high white on the north coast. That combination belongs to one house alone.",
    lesson:
      "Blue striping down the back with high white markings is the Utaraensis signature — the blue stripe never lies.",
  },
  {
    id: "lumen",
    name: "“Lumen”",
    house: "utaraensis",
    locality: "Lereh",
    neonate: "yellow",
    photo: "/arcade/snake-sorting/snakes/lumen.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate — a thin blue seam already splitting the dorsum." },
      { probe: "crown", label: "Head", text: "Clean green crown, white lips just beginning to show." },
      { probe: "origin", label: "Homeland", text: "Lowland forest on the north coast, rivers slow and wide." },
    ],
    deepScan: "Yellow baby, blue seam on the dorsum, northern lowlands. Lereh — northern blood, Utaraensis.",
    lesson:
      "The yellow tempted you south toward Viridis — but the blue seam never lies, and Lereh is northern ground. House Utaraensis.",
  },
  {
    id: "mistral",
    name: "“Mistral”",
    house: "utaraensis",
    locality: "Cyclops",
    neonate: "yellow",
    photo: "/arcade/snake-sorting/snakes/mistral.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate — white lateral dashes already showing through the gold." },
      { probe: "crown", label: "Head", text: "Pale snout with white flecks dusting the crown." },
      { probe: "origin", label: "Homeland", text: "Foothills rising steep behind the north coast." },
    ],
    deepScan: "A yellow baby flashing high white this early, from the Cyclops foothills. Northern mainland blood — Utaraensis.",
    lesson:
      "Yellow hatchlings come from every house — that is the trap. But high white this early, blue tones on the crown, and the Cyclops foothills of the northern mainland: only House Utaraensis wears that combination.",
  },
  {
    id: "tempest",
    name: "“Tempest”",
    house: "utaraensis",
    locality: "Cyclops",
    neonate: "red",
    photo: "/arcade/snake-sorting/snakes/tempest.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Red neonate — black edging on every dorsal scale, straight out of the island playbook." },
      { probe: "crown", label: "Head", text: "A dark cap over the crown — but blue ghosts beneath the black." },
      { probe: "origin", label: "Homeland", text: "Foothills rising steep behind the north coast." },
    ],
    deepScan: "Red baby, black-edged scales, Cyclops foothills. The black tempted you toward Azurea — but island black never touches the mainland. Northern blood: Utaraensis.",
    lesson:
      "The cruelest trap in the ceremony: a red baby with black edging, straight out of the Azurea playbook. But Azurea never touches the mainland — Cyclops is northern ground, and the blue ghosting under the black is pure Utaraensis.",
  },
  {
    id: "highblue",
    name: "“Highblue”",
    house: "utaraensis",
    locality: "Wamena",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Adult scales", text: "Adult green with an electric-blue dorsal stripe you could see from the next valley." },
      { probe: "crown", label: "Head", text: "Clean white markings run along the lips like war paint." },
      { probe: "origin", label: "Homeland", text: "A highland valley — cool nights, moss thick as carpet." },
    ],
    deepScan: "Highland valley, electric blue stripe, white lips. Even in the mountains, the blue stripe never lies.",
    lesson:
      "Wamena sits high and cool, but the animal still wears the northern signature: blue stripe plus high white. House Utaraensis, highland division.",
  },
  {
    id: "saffron",
    name: "“Saffron”",
    house: "pulcher",
    locality: "Kofiau",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Lemon-yellow neonate — not a single fleck of red anywhere." },
      { probe: "crown", label: "Head", text: "A faint blue wash ghosts across the crown." },
      { probe: "origin", label: "Homeland", text: "A tiny island clutch, far to the west, reachable only by boat." },
    ],
    deepScan: "Far-west island, yellow baby, blue wash on the crown. Kofiau hatch yellow every time — and that blue wash is pure Pulcher.",
    lesson:
      "The trap of the ceremony! A yellow neonate screams Viridis — but Kofiau pulcher hatch yellow every single time. The blue wash on the crown and the far-west island give it away: House Pulcher.",
  },
  {
    id: "topaz",
    name: "“Topaz”",
    house: "pulcher",
    locality: "Sorong",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Adult scales", text: "Two years old and still glowing yellow-green — the yellow refuses to leave." },
      { probe: "crown", label: "Head", text: "Blue tones bleed from the crown down into the neck." },
      { probe: "origin", label: "Homeland", text: "Lowland forest on the Bird's Head Peninsula." },
    ],
    deepScan: "Yellow retention plus blue bleeding down the neck, Bird's Head lowlands. Western gold, blue-kissed: Pulcher.",
    lesson:
      "Clean yellow retention with blue tones is what western breeders prize most — the defining Pulcher combination, from the Bird's Head lowlands around Sorong.",
  },
  {
    id: "cinder",
    name: "“Cinder”",
    house: "pulcher",
    locality: "Arfak",
    neonate: "red",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Red neonate with blue flecks scattered across the dorsum like sparks." },
      { probe: "crown", label: "Head", text: "Dark crown edged in unmistakable blue." },
      { probe: "origin", label: "Homeland", text: "Mountain slopes in the western ranges, clouds caught in the canopy." },
    ],
    deepScan: "Red baby, blue-flecked dorsum, western mountain slopes. The blue edging on a western animal settles it.",
    lesson:
      "Red neonate, western mountains, blue edging everywhere — House Pulcher. Azurea wears black where Pulcher wears blue.",
  },
  {
    id: "copper",
    name: "“Copper”",
    house: "pulcher",
    locality: "Manokwari",
    neonate: "red",
    photo: "/arcade/snake-sorting/snakes/copper.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Red neonate — blue vertebral dashes marching down the spine." },
      { probe: "crown", label: "Head", text: "A rust-red crown washed with blue at the edges." },
      { probe: "origin", label: "Homeland", text: "Coastal lowlands on the Bird's Head — sea air, mangrove at the forest edge." },
    ],
    deepScan: "Red baby, blue dashes down the spine, Bird's Head coast. Manokwari — western blood, Pulcher.",
    lesson:
      "Red tempted you toward Azurea — but Azurea wears black where Pulcher wears blue. Coastal Bird's Head with blue dashes: House Pulcher, the Manokwari division.",
  },
  {
    id: "ivory",
    name: "“Ivory”",
    house: "viridis",
    locality: "Aru",
    neonate: "yellow",
    photo: "/arcade/snake-sorting/snakes/ivory.webp",
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate with bold white dorsal dashes like ivory inlay." },
      { probe: "crown", label: "Head", text: "High-white crown dusted with black speckles." },
      { probe: "origin", label: "Homeland", text: "Island canopy in the far south, monsoon on the wind." },
    ],
    deepScan: "Southern islands, yellow baby, high white plus black speckles. The ancient southern combination: Viridis.",
    lesson:
      "High white AND high black together on a southern island animal — the classic Viridis look, from the Aru Islands.",
  },
  {
    id: "meridian",
    name: "“Meridian”",
    house: "viridis",
    locality: "Merauke",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate with heavy black lateral blotching." },
      { probe: "crown", label: "Head", text: "Black-speckled head with striking white lips." },
      { probe: "origin", label: "Homeland", text: "Forest edge near the southern savanna, hot and bright." },
    ],
    deepScan: "Southern savanna edge, heavy black blotching, white lips. Merauke — the southernmost house.",
    lesson:
      "The southernmost blood in the game. Heavy black lateral blotching with white lips near Merauke is House Viridis at its most classic.",
  },
  {
    id: "ghost",
    name: "“Ghost”",
    house: "viridis",
    locality: "Aru",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Juvenile scales", text: "A near-white juvenile — black vertebral dashes floating on ivory." },
      { probe: "crown", label: "Head", text: "A pale, ghost-like crown, barely any dark at all." },
      { probe: "origin", label: "Homeland", text: "Aru Islands — the southern archipelago." },
    ],
    deepScan: "Extreme high white from the Aru archipelago. Only the southern house washes out this pale.",
    lesson:
      "When a southern animal goes this pale, there is no mistaking it: extreme high white from Aru is House Viridis, the ghost division.",
  },
  /* ---- Wildcard division: designer morphs and hybrid crosses. Only the
     wildcard hard mode deals these; the classic ceremony never sees them. ---- */
  {
    id: "mimic",
    name: "“Mimic”",
    house: "designer",
    locality: "Captive Bred",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate — extreme white patches blooming far too early." },
      { probe: "crown", label: "Head", text: "A white-washed crown, pigment breaking apart like frost." },
      { probe: "origin", label: "Homeland", text: "Hatched in a rack, not a rainforest — the paperwork says 'project'." },
    ],
    deepScan: "Yellow baby, extreme white, captive-bred. No wild locality claims this blood — Designer.",
    lesson:
      "No island, no mainland, no southern wilds — this blood was mixed in a tub. When the field marks refuse every map, call the wildcard: Designer / Hybrid.",
  },
  {
    id: "chimera",
    name: "“Chimera”",
    house: "designer",
    locality: "Captive Bred",
    neonate: "red",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Red neonate — but the black edging stops mid-body and gives way to blue." },
      { probe: "crown", label: "Head", text: "Half dark cap, half blue wash — two houses fighting on one head." },
      { probe: "origin", label: "Homeland", text: "The breeder's notes list two localities. Both. At once." },
    ],
    deepScan: "Red baby, mixed signals, project paperwork. Two bloodlines in one skin — Designer.",
    lesson:
      "Azurea's black on the front half, Pulcher's blue on the back — no wild snake wears two houses at once. That is the tell: Designer / Hybrid.",
  },
  {
    id: "specter",
    name: "“Specter”",
    house: "designer",
    locality: "Captive Bred",
    neonate: "yellow",
    photo: null,
    clues: [
      { probe: "scales", label: "Neonate scales", text: "Yellow neonate holding ghost-white into adulthood — long past when wild yellows green out." },
      { probe: "crown", label: "Head", text: "A pale, washed-out crown — three generations of selection staring back at you." },
      { probe: "origin", label: "Homeland", text: "Bred for the trait, not the place." },
    ],
    deepScan: "Yellow baby that never greens out, line-bred pale. A trait, not a locality — Designer.",
    lesson:
      "Wild yellows green out; this one was bred not to. When the animal is a trait instead of a place, the house is Designer / Hybrid.",
  },
];

/* ------------------------------ Hat dialogue ----------------------------- */

export const HAT_LINES = {
  greetings: [
    "Ahh... a new keeper steps into my chamber. I am the Sorting Hat — seer of scales, reader of bloodlines.",
    "Bring me your serpents, keeper. One by one, I shall tell you where each truly belongs.",
    "Ten serpents wait upon my dais. Probe them well — a hat is only as wise as its keeper's eyes.",
  ],
  arrive: [
    "Place the serpent upon the dais... steady now. Let me have a look at this one.",
    "Another coil for the dais. Come closer, little one — the Hat sees all.",
    "Hmm, what have we here? Up onto the dais with you.",
  ],
  scanIntro: [
    "Three probes, keeper — Scales, Crown, Origin. Choose where my gaze shall fall.",
    "My eyes are old but sharp. Probe the Scales, the Crown, the Origin — then we shall sort.",
  ],
  neonateIntro: [
    "Round one, keeper — a small wager before the probes. Was this serpent born red as ember, or yellow as morning sun? +25 for a true call.",
    "Before we probe, a gambler's question. Red or yellow — what color was this serpent's first dawn? Call it true for +25.",
  ],
  neonateCorrect: [
    "Born {actual} — and you called it! The wager is yours, keeper.",
    "A true call! This one hatched {actual}. +25 to the keeper with the eye.",
  ],
  neonateWrong: [
    "{picked}, you say? No — this serpent hatched {actual}. The probes will teach you.",
    "A miss! {actual} was its first color. No shame — the wager was only ever small.",
  ],
  viridisSkip: [
    "House Viridis hatches only yellow babes — no wager on this one, keeper. Straight to the probes.",
    "A southern serpent — Viridis babes are yellow, every last one. No wager here; on to the probes.",
  ],
  probeDone: [
    "Noted... noted. What else shall we examine?",
    "Mmm, interesting. Probe deeper, keeper.",
    "The picture sharpens. One more probe, perhaps?",
  ],
  allProbed: [
    "The serpent is laid bare. Now — call its House!",
    "I have seen enough. Speak, keeper: which House claims this blood?",
  ],
  earlyCall: [
    "Bold! Calling it with sight unseen — the Hat respects a gambler.",
    "No more probing? Then trust your eyes, keeper. Speak its House!",
    "Hasty... or brilliant? The dais holds its breath.",
    "You would sort on half the evidence? Very well — the Hat loves nerve.",
  ],
  deliberating: [
    "Hmm... let me turn this one over in my brim...",
    "Scales don't lie, but they do love to tease...",
    "Quiet now. The Hat is thinking...",
    "Bloodlines whisper... let me listen...",
  ],
  correctHouse: {
    azurea: "Island blood runs true! The black-scaled isle calls it home!",
    utaraensis: "The blue stripe never lies — northern blood, through and through!",
    pulcher: "Western gold, blue-kissed! A true Pulcher!",
    viridis: "Ancient southern lines — the one true Viridis!",
    designer: "No map, no homeland — this blood was mixed by human hands! A true wildcard!",
  } as Record<HouseId, string>,
  wrongHouse: [
    "Oof. Even a blind skink saw that one coming.",
    "My brim itches... that was no {picked}. This beauty wears {correct} colors.",
    "A bold call, keeper — and a wrong one. {correct}, plain as day.",
  ],
  localityPrompt: [
    "The Hat senses more... name the native haunts — the homeland this blood is believed to hail from — and earn the True Local's bounty.",
    "House claimed! But can you call its native haunts? The Hat is listening...",
  ],
  localityCorrect: [
    "TRUE LOCAL! {locality} blood, through and through!",
    "{locality}! The Hat bows to your eye, keeper.",
  ],
  localityWrong: [
    "Close, keeper — but this one hailed from {locality}.",
    "A fine guess, but no. {locality} is written in these scales.",
  ],
  streak2: "Two in a row — the Hat is impressed.",
  streak3: "Three! A hat-trick of sorts!",
  streak5: "Five straight! The chamber itself applauds.",
  deepScan: "You ask for my deeper sight... very well. (-25 pts)",
  farewell: {
    master: "The chamber falls silent. Even the candles bow. You sort like the Hat itself, keeper.",
    sage: "A keen eye, keeper. The bloodlines whisper your name now.",
    scholar: "Solid sorting. A few more ceremonies and the Hat may retire.",
    coilkeeper: "Not bad, keeper — but the Hat has seen sharper eyes.",
    hatchling: "We all start as hatchlings. Come back and probe deeper next time.",
  },
};

export interface Rank {
  min: number;
  title: string;
  blurb: string;
}

export const RANKS: Rank[] = [
  { min: 1800, title: "Sorting Master", blurb: "The Hat itself could not have done better." },
  { min: 1400, title: "Serpent Sage", blurb: "The bloodlines whisper your name." },
  { min: 1000, title: "Scale Scholar", blurb: "A trained, trustworthy eye." },
  { min: 600, title: "Coilkeeper", blurb: "Steady hands, learning eyes." },
  { min: 0, title: "Hatchling", blurb: "Every master was once a hatchling." },
];

export function rankFor(score: number): Rank {
  return RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1];
}

export const CEREMONY_SNAKES = 10;
export const HOUSE_POINTS = 100;
export const LOCALITY_POINTS = 50;
/* Round One: the neonate-color wager. Small points, decided before a
   single probe is spent. House Viridis is excluded — it hatches only
   yellow, so there is no wager to make. */
export const NEONATE_POINTS = 25;
export const DEEP_SCAN_COST = 25;
/* Early-call bonus: +25 for each probe left unrevealed when the House is
   called. Blind call (0 probes) = +75. Deep Scan forfeits it. */
export const EARLY_BONUS_PER_PROBE = 25;
export const MAX_SPEED_BONUS = 50;
export const SPEED_BONUS_WINDOW_MS = 30_000;

export function speedBonus(ms: number): number {
  if (ms >= SPEED_BONUS_WINDOW_MS) return 0;
  return Math.round(MAX_SPEED_BONUS * (1 - ms / SPEED_BONUS_WINDOW_MS));
}

export const BEST_CEREMONY_KEY = "snake_sorting_best_ceremony_v1";
export const BEST_ENDLESS_KEY = "snake_sorting_best_endless_v1";
export const BEST_WILDCARD_KEY = "snake_sorting_best_wildcard_v1";

export function readBest(key: string): number {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function writeBest(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* private mode etc. — ignore */
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Serpents eligible for a mode: the wildcard division only walks in hard mode. */
export function bankForMode(mode: GameMode): SortingSnake[] {
  return mode === "wildcard"
    ? [...SNAKES]
    : SNAKES.filter((s) => s.house !== "designer");
}

/** Sort options for a mode: the 5th option only exists in wildcard hard mode. */
export function sortHousesForMode(mode: GameMode): House[] {
  return mode === "wildcard" ? HOUSES : HOUSES.filter((h) => h.id !== "designer");
}

/**
 * Build a ceremony order. Wildcard hard mode guarantees at least two
 * designer animals in the mix — otherwise the 5th option would be a
 * decoration instead of a threat.
 */
export function ceremonyOrder(mode: GameMode, count: number): SortingSnake[] {
  if (mode === "wildcard") {
    const wild = shuffle(SNAKES.filter((s) => s.house === "designer"));
    const pure = shuffle(SNAKES.filter((s) => s.house !== "designer"));
    const guaranteed = wild.slice(0, Math.min(2, wild.length));
    return shuffle([...guaranteed, ...pure.slice(0, Math.max(0, count - guaranteed.length))]);
  }
  return shuffle(bankForMode(mode)).slice(0, count);
}
