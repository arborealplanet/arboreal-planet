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
