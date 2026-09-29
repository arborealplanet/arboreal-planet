export const COMMUNITY_SECTION_GROUPS = [
  {
    key: "species",
    heading: "Species",
    sections: [
      "Green Tree Pythons",
      "Boiga & Cat Snakes",
      "Tree Monitors",
      "Emerald Tree Boas",
      "Ball Pythons",
      "Corn Snakes & Rat Snakes",
      "Geckos",
      "Other Reptiles & Amphibians",
    ],
  },
  {
    key: "care",
    heading: "Care",
    sections: [
      "Husbandry",
      "Feeding & Nutrition",
      "Health & Vet Help",
      "Enclosures & Bioactive Builds",
    ],
  },
  {
    key: "projects",
    heading: "Projects",
    sections: [
      "Breeding & Genetics",
      "Pedigrees & Lineages",
      "Plants (Nepenthes & Vivarium Plants)",
    ],
  },
  {
    key: "community",
    heading: "Community",
    sections: [
      "Introductions",
      "Show & Tell",
      "Field Herping & Conservation",
      "Shows & Events",
      "Marketplace Talk",
      "Site Help & Feedback",
    ],
  },
] as const;

export type CommunitySection =
  (typeof COMMUNITY_SECTION_GROUPS)[number]["sections"][number];

export const COMMUNITY_SECTIONS = COMMUNITY_SECTION_GROUPS.flatMap(
  (group) => [...group.sections],
) as CommunitySection[];

export const LEGACY_COMMUNITY_TOPICS = [
  "Green Tree Python",
  "Boiga",
  "Tree Monitors",
  "Nepenthes",
  "Breeding",
  "Husbandry",
  "Enclosures",
] as const;

const sectionLookup = new Map<string, CommunitySection>(
  COMMUNITY_SECTIONS.map((section) => [section.toLowerCase(), section]),
);

export function normalizeCommunitySection(raw: unknown): CommunitySection | null {
  const value = String(raw ?? "").trim().toLowerCase();
  return sectionLookup.get(value) ?? null;
}

// Curated tag sets for known series that were published without tags,
// matched against the post's opening line (its title).
const CURATED_COMMUNITY_TAG_SETS: Array<{ match: RegExp; tags: string[] }> = [
  { match: /before you bring home a chondro/i, tags: ["Green Tree Python", "Husbandry"] },
  { match: /buy the snake, not the story/i, tags: ["Green Tree Python", "Breeding", "Husbandry"] },
  { match: /build a gradient, not a sauna/i, tags: ["Green Tree Python", "Husbandry", "Enclosures"] },
  { match: /perches, privacy, and practical caging/i, tags: ["Green Tree Python", "Enclosures", "Husbandry"] },
  { match: /feed 'em right/i, tags: ["Green Tree Python", "Husbandry"] },
];

// Keyword fallback for any other untagged post.
const KEYWORD_COMMUNITY_TAGS: Array<{ match: RegExp; tag: string }> = [
  { match: /green tree python|\bchondro\b/i, tag: "Green Tree Python" },
  { match: /\bboiga\b/i, tag: "Boiga" },
  { match: /tree monitor/i, tag: "Tree Monitors" },
  { match: /\bnepenthes\b/i, tag: "Nepenthes" },
  { match: /breed/i, tag: "Breeding" },
  { match: /enclosure|\bcage\b|perch|terrarium|vivarium/i, tag: "Enclosures" },
];

export function resolveCommunityTags(post: {
  body?: unknown;
  section?: unknown;
  tags?: unknown;
}): string[] {
  const stored = Array.isArray(post.tags)
    ? post.tags.map((value) => String(value).trim()).filter(Boolean).slice(0, 4)
    : [];
  if (stored.length > 0) return stored;
  const body = String(post.body ?? "");
  const title = body.split("\n")[0] ?? "";
  for (const entry of CURATED_COMMUNITY_TAG_SETS) {
    if (entry.match.test(title)) return entry.tags;
  }
  const found: string[] = [];
  for (const entry of KEYWORD_COMMUNITY_TAGS) {
    if (entry.match.test(body) && !found.includes(entry.tag)) found.push(entry.tag);
  }
  if (
    String(post.section ?? "").toLowerCase() === "husbandry" &&
    !found.includes("Husbandry")
  ) {
    found.push("Husbandry");
  }
  return found.slice(0, 4);
}
