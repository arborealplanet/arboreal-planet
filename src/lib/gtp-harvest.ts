export const GTP_LOCALITY_TAXON: Record<string, string> = {
  Jayapura: "Morelia azurea utaraensis",
  Cyclops: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  "Lereh / Highland": "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Yapen: "Morelia azurea utaraensis",
  Arfak: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Manokwari: "Morelia azurea pulcher",
  Kofiau: "Morelia azurea pulcher",
  Batanta: "Morelia azurea pulcher",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
  Biak: "Morelia viridis",
  Numfor: "Morelia azurea azurea",
};

const LOCALITY_ALIASES: Array<[string, string]> = [
  ["jayapura", "Jayapura"],
  ["cyclops", "Cyclops"],
  ["lereh", "Lereh"],
  ["yapen", "Yapen"],
  ["wamena", "Wamena"],
  ["arfak", "Arfak"],
  ["sorong", "Sorong"],
  ["timika", "Timika"],
  ["manokwari", "Manokwari"],
  ["kofiau", "Kofiau"],
  ["batanta", "Batanta"],
  ["aru", "Aru"],
  ["merauke", "Merauke"],
  ["biak", "Biak"],
  ["numfor", "Numfor"],
  ["numfoor", "Numfor"],
];

export type GtpAncestryClass =
  | "pure_locality"
  | "pure_subspecies_locality_cross"
  | "cross_subspecies"
  | "designer"
  | "hybrid"
  | "unknown";

export function classifyGtpListing(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  const localities = [...new Set(
    LOCALITY_ALIASES
      .filter(([needle]) => text.includes(needle))
      .map(([, label]) => label),
  )];

  const taxa = [...new Set(
    localities
      .map((locality) => GTP_LOCALITY_TAXON[locality])
      .filter((value): value is string => Boolean(value)),
  )];

  const crossLanguage = /\bmixed locality\b|\blocality cross\b|\boutcross\b|\s[x×]\s/i.test(` ${title} ${description} `);
  let ancestryClass: GtpAncestryClass;
  let exclusionReason: string | null = null;

  if (/\bdesigner\b|\bcalico\b/.test(text)) {
    ancestryClass = "designer";
    exclusionReason = "designer";
  } else if (/\bhybrid\b/.test(text)) {
    ancestryClass = "hybrid";
    exclusionReason = "hybrid";
  } else if (taxa.length > 1) {
    ancestryClass = "cross_subspecies";
    exclusionReason = "cross-subspecies ancestry";
  } else if (localities.length > 1 && taxa.length === 1) {
    ancestryClass = "pure_subspecies_locality_cross";
  } else if (localities.length === 1 && !crossLanguage) {
    ancestryClass = "pure_locality";
  } else if (localities.length === 1 && crossLanguage) {
    ancestryClass = "unknown";
    exclusionReason = "locality cross not fully documented";
  } else {
    ancestryClass = "unknown";
    exclusionReason = /\bunknown locality\b|\bunknown lineage\b/.test(text)
      ? "unknown locality or lineage"
      : "locality not documented";
  }

  const neonateColor =
    /\bred\b/.test(text) ? "red" :
    /\byellow\b/.test(text) ? "yellow" :
    null;

  const lifeStage =
    /\bhatchling\b/.test(text) ? "hatchling" :
    /\bneo(?:nate)?\b/.test(text) ? "neonate" :
    /\bjuvenile\b|\bjuvi\b/.test(text) ? "juvenile" :
    /\bsubadult\b/.test(text) ? "subadult" :
    /\badult\b/.test(text) ? "adult" :
    null;

  const snakeSorterEligible =
    ancestryClass === "pure_locality" ||
    ancestryClass === "pure_subspecies_locality_cross";

  return {
    localities,
    locality: localities.length === 1 ? localities[0] : null,
    taxa,
    taxon: taxa.length === 1 ? taxa[0] : null,
    ancestry_class: ancestryClass,
    pure_locality: ancestryClass === "pure_locality",
    pure_subspecies: snakeSorterEligible,
    snake_sorter_eligible: snakeSorterEligible,
    review_status: snakeSorterEligible ? "pending" : "rejected",
    exclusion_reason: exclusionReason,
    neonate_color_hint: neonateColor,
    life_stage_hint: lifeStage,
  };
}

export function normalizeMarketCountry(value: unknown) {
  const raw = String(value ?? "").trim();
  const key = raw.toLowerCase();
  if (!raw) return null;
  if (["us", "usa", "united states", "united states of america"].includes(key)) return "USA";
  if (["uk", "united kingdom", "great britain"].includes(key)) return "United Kingdom";
  return raw;
}

export function normalizeListingStatus(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase();
  if (["active", "available", "for sale", "forsale"].includes(key)) return "ACTIVE";
  if (["sold", "closed"].includes(key)) return "SOLD";
  if (["removed", "unavailable", "expired"].includes(key)) return "REMOVED";
  return "UNKNOWN";
}

export function normalizeOrigin(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (["cb", "cbb", "captive_bred", "captivebred"].includes(key)) return "CAPTIVE_BRED";
  if (["import", "imported", "wc", "wild_caught", "ch", "captive_hatched"].includes(key)) return "IMPORT";
  return "UNKNOWN";
}

export function normalizeSex(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase();
  if (["female", "f"].includes(key)) return "FEMALE";
  if (["male", "m"].includes(key)) return "MALE";
  return "UNKNOWN";
}

export function normalizeAgeClass(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase();
  if (["neonate", "hatchling", "neo"].includes(key)) return "NEONATE";
  if (["juvenile", "juvi"].includes(key)) return "JUVENILE";
  if (["subadult", "sub-adult"].includes(key)) return "SUBADULT";
  if (["adult"].includes(key)) return "ADULT";
  return "UNKNOWN";
}

export function normalizeNeonateColor(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase();
  if (key === "red") return "RED";
  if (key === "yellow") return "YELLOW";
  if (["not_applicable", "n/a", "na"].includes(key)) return "NOT_APPLICABLE";
  return "UNKNOWN";
}

export function normalizePriceType(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase();
  return ["individual", "pair", "group", "auction", "deposit", "payment", "unknown"].includes(key)
    ? key
    : "unknown";
}
