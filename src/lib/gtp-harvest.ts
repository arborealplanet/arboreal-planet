export const GTP_LOCALITY_TAXON: Record<string, string> = {
  Jayapura: "Morelia azurea utaraensis",
  Cyclops: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  "Lereh / Highland": "Morelia azurea utaraensis",
  Arso: "Morelia azurea utaraensis",
  Vanimo: "Morelia azurea utaraensis",
  Wewak: "Morelia azurea utaraensis",
  Sepik: "Morelia azurea utaraensis",
  Madang: "Morelia azurea utaraensis",
  Lae: "Morelia azurea utaraensis",
  "Huon Peninsula": "Morelia azurea utaraensis",
  Wau: "Morelia azurea utaraensis",
  Karkar: "Morelia azurea utaraensis",
  Manam: "Morelia azurea utaraensis",
  "Mios Num": "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Yapen: "Morelia azurea utaraensis",
  Arfak: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Manokwari: "Morelia azurea pulcher",
  Kofiau: "Morelia azurea pulcher",
  Salawati: "Morelia azurea pulcher",
  Batanta: "Morelia azurea pulcher",
  Biak: "Morelia azurea azurea",
  Numfor: "Morelia azurea azurea",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
  Kiunga: "Morelia viridis",
  Daru: "Morelia viridis",
  "Lake Murray": "Morelia viridis",
  Normanby: "Morelia viridis",
  "d'Entrecasteaux": "Morelia viridis",
  "Cape York": "Morelia viridis",
  "Iron Range": "Morelia viridis",
};

const LOCALITY_ALIASES: Array<[string, string]> = [
  ["jayapura", "Jayapura"],
  ["cyclops", "Cyclops"],
  ["lereh", "Lereh"],
  ["arso", "Arso"],
  ["vanimo", "Vanimo"],
  ["wewak", "Wewak"],
  ["sepik", "Sepik"],
  ["madang", "Madang"],
  ["lae", "Lae"],
  ["huon peninsula", "Huon Peninsula"],
  ["huon", "Huon Peninsula"],
  ["wau", "Wau"],
  ["karkar", "Karkar"],
  ["manam", "Manam"],
  ["mios num", "Mios Num"],
  ["miosnum", "Mios Num"],
  ["yapen", "Yapen"],
  ["wamena", "Wamena"],
  ["arfak", "Arfak"],
  ["sorong", "Sorong"],
  ["timika", "Timika"],
  ["manokwari", "Manokwari"],
  ["kofiau", "Kofiau"],
  ["salawati", "Salawati"],
  ["batanta", "Batanta"],
  ["aru", "Aru"],
  ["merauke", "Merauke"],
  ["kiunga", "Kiunga"],
  ["daru", "Daru"],
  ["lake murray", "Lake Murray"],
  ["normanby", "Normanby"],
  ["d'entrecasteaux", "d'Entrecasteaux"],
  ["entrecasteaux", "d'Entrecasteaux"],
  ["cape york", "Cape York"],
  ["iron range", "Iron Range"],
  ["biak", "Biak"],
  ["supiori", "Biak"],
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

/**
 * Resolve a supplied locality label to the canonical seeded locality name.
 * Handles aliases ("Supiori" -> "Biak"), misspellings ("Numfoor" -> "Numfor"),
 * and longer forms ("Cyclops Mountains" -> "Cyclops"). Returns the trimmed
 * input unchanged when nothing matches so callers can still store it raw.
 */
export function normalizeLocalityLabel(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  // The seeded locality row uses "Lereh / Highland".
  if (lower === "lereh" || lower === "lereh / highland" || lower === "lereh highland") {
    return "Lereh / Highland";
  }
  for (const [needle, label] of LOCALITY_ALIASES) {
    if (lower === needle) return label;
  }
  for (const [needle, label] of LOCALITY_ALIASES) {
    if (needle.length >= 3 && lower.includes(needle)) return label;
  }
  return raw;
}

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

  if (/\bdesigner\b|\bcalico\b|\bblue[ -]?line\b|\bline[ -]?bred\b/.test(text)) {
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

  // Unresolvable ancestry goes to manual review, never auto-rejection.
  // Only confirmed cross-subspecies / designer / hybrid animals are rejected.
  const reviewStatus =
    ancestryClass === "unknown"
      ? "needs_review"
      : snakeSorterEligible
        ? "pending"
        : "rejected";

  return {
    localities,
    locality: localities.length === 1 ? localities[0] : null,
    taxa,
    taxon: taxa.length === 1 ? taxa[0] : null,
    ancestry_class: ancestryClass,
    pure_locality: ancestryClass === "pure_locality",
    pure_subspecies: snakeSorterEligible,
    snake_sorter_eligible: snakeSorterEligible,
    review_status: reviewStatus,
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
  if (["pending", "pending sale", "sale pending"].includes(key)) return "PENDING";
  if (["unlisted", "delisted"].includes(key)) return "UNLISTED";
  if (["removed", "unavailable", "expired"].includes(key)) return "REMOVED";
  return "UNKNOWN";
}

export function normalizeOrigin(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (["cb", "cbb", "captive_bred", "captivebred"].includes(key)) return "CAPTIVE_BRED";
  // LTC (long-term captive) is always an import. CH / captive-hatched is
  // ambiguous on its own: pass through as UNKNOWN and let review decide.
  if (["ltc", "long_term_captive", "longterm_captive"].includes(key)) return "IMPORT";
  if (["import", "imported", "wc", "wild_caught", "wildcaught"].includes(key)) return "IMPORT";
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
  // Contract enum: individual | pair | group. Anything else is unknown —
  // auction / inquire / trade / payment-plan detail belongs in price_format
  // and the dedicated edge-case fields, not price_type.
  return ["individual", "pair", "group"].includes(key) ? key : "unknown";
}

export function normalizePriceFormat(value: unknown) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (["fixed", "buy_now", "buy_it_now", "bin"].includes(key)) return "fixed";
  if (["auction", "bid"].includes(key)) return "auction";
  if (["inquire", "inquiry", "inquire_only", "poa", "price_on_ask"].includes(key)) return "inquire";
  if (["trade", "swap"].includes(key)) return "trade";
  if (["payment_plan", "installments", "deposit", "payment"].includes(key)) return "payment_plan";
  // Never guess: an unrecognized format is unknown, not fixed.
  return "unknown";
}
