export type GtpTaxon =
  | "Morelia azurea azurea"
  | "Morelia azurea pulcher"
  | "Morelia azurea utaraensis"
  | "Morelia viridis";

export type GtpLocality =
  | "Biak"
  | "Numfor"
  | "Manokwari"
  | "Sorong"
  | "Timika"
  | "Cyclops"
  | "Jayapura"
  | "Lereh"
  | "Wamena"
  | "Aru"
  | "Merauke";

export const GTP_LOCALITY_TAXON: Record<GtpLocality, GtpTaxon> = {
  Biak: "Morelia azurea azurea",
  Numfor: "Morelia azurea azurea",
  Manokwari: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Cyclops: "Morelia azurea utaraensis",
  Jayapura: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
};

export const GTP_TAXON_LOCALITIES: Record<GtpTaxon, GtpLocality[]> = {
  "Morelia azurea azurea": ["Biak", "Numfor"],
  "Morelia azurea pulcher": ["Manokwari", "Sorong", "Timika"],
  "Morelia azurea utaraensis": ["Cyclops", "Jayapura", "Lereh", "Wamena"],
  "Morelia viridis": ["Aru", "Merauke"],
};

export const GTP_TAXON_NOTES: Record<GtpTaxon, string> = {
  "Morelia azurea azurea": "Northern island/locality grouping used by Arboreal Planet for Biak and Numfor.",
  "Morelia azurea pulcher": "Western New Guinea grouping used by Arboreal Planet for Manokwari, Sorong and Timika.",
  "Morelia azurea utaraensis": "Northern mainland grouping used by Arboreal Planet for Cyclops, Jayapura, Lereh and Wamena.",
  "Morelia viridis": "Southern green tree python taxon used here for Aru and Merauke. This is a separate species-level taxon rather than an azurea subspecies.",
};
