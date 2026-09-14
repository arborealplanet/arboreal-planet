import fs from "node:fs";
import { spawnSync } from "node:child_process";

const patches = [
  "scripts/materialize-assets.mjs",
  "scripts/materialize-chondro-game-assets.mjs",
  "scripts/cleanup-product-copy.mjs",
];

for (const patch of patches) {
  process.stdout.write(`\n[Chondro setup] ${patch}\n`);
  const result = spawnSync(process.execPath, [patch], {
    cwd: process.cwd(),
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[Chondro setup] Could not start ${patch}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[Chondro setup] ${patch} failed with exit code ${result.status ?? "unknown"}.`);
    process.exit(result.status ?? 1);
  }
}

const checks = [
  {
    file: "src/components/ChondroBreederGameV3.tsx",
    markers: [
      'type BreedingStage = "cycling" | "pairing" | "development" | "incubation";',
      "const latestSaveRef = useRef<GameSave | null>(null);",
      "CLUTCH_ESTABLISH_BASE_COST",
      "Incubation complete. The clutch hatched and now needs to be established.",
      "BreederGameScreenContext",
      "hideLegacySectionForFocusedScreen",
      'arboreal-chondro-market-action',
      'arboreal-chondro-clutch-action',
      'arboreal-chondro-enclosure-action',
      'aria-label="Open game options"',
      'confirmation !== "RESET CHONDRO BREEDER"',
      'subspecies === "Morelia viridis" || locality === "Aru" || locality === "Merauke"',
      "updatedAt: Date.now()",
      "keepalive: true",
      "const [breederIdentityLoaded, setBreederIdentityLoaded] = useState(false);",
      "Your completed incubation is being held safely until initials are confirmed.",
      "Recovered the completed incubation after restoring your breeder initials.",
      "animalHousingCapacity",
      "enclosureFootprint",
      '"Chondro Dojo Bin": 250',
    ],
    forbidden: [
      '<CollapsibleGameSection label="Enclosures"',
    ],
  },
  {
    file: "src/app/api/hatchery/chondro-breeder/breeder-identity/route.ts",
    markers: [
      "async function loadOwnInitials",
      "alreadyAssigned: true",
      "retryOwn.ok && retryOwn.initials",
    ],
  },
  {
    file: "src/components/ChondroBreederWorkspace.tsx",
    markers: [
      'import Image from "next/image";',
      'import { ChondroBreederHomeStatus } from "@/components/ChondroBreederHomeStatus";',
      'import { ChondroGameNotifications } from "@/components/ChondroGameNotifications";',
      'import { ChondroBreederNavIcon } from "@/components/ChondroBreederNavIcon";',
      'import { ChondroClutchStageArt } from "@/components/ChondroClutchStageArt";',
      'import { ChondroBreederScreenArt } from "@/components/ChondroBreederScreenArt";',
      'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";',
      "<ChondroColonyOverview />",
      "<ChondroClutchStageArt />",
      "Your program is alive",
      "/hatchery/game/incubator.webp",
    ],
  },
  {
    file: "src/components/ChondroBreederExpandedShop.tsx",
    markers: [
      'subspecies === "Morelia viridis" ? "Yellow"',
      'const SHOP_REFRESH_AT_KEY = "arboreal_chondro_expanded_shop_refresh_at_v1";',
      "const SHOP_REFRESH_MS = 24 * 60 * 60 * 1000;",
      "Next shop refresh",
      "Inventory rotates automatically every 24 hours.",
      "Loading snake store…",
      'type EnclosureType = "Chondro Dojo Bin" | "PVC Arboreal";',
      'arboreal-chondro-enclosure-action',
      "/hatchery/game/pvc-enclosure.webp",
      "Buy housing before you buy snakes.",
      "Chondro Dojo Pair",
      "PVC Arboreal Enclosure",
      "+2 snake capacity per set",
      "animalHousingCapacity",
      "enclosureFootprint",
    ],
  },
  {
    file: "src/components/ChondroColonyOverview.tsx",
    markers: [
      "animalHousingCapacity",
      "enclosureFootprint",
      "facility slots used",
      "animal spaces open",
    ],
  },
  {
    file: "src/lib/chondro-facility-limits.ts",
    markers: [
      "export function enclosureFootprint",
      "export function animalHousingCapacity",
      "return dojoSets * 2 + pvc + other;",
      "cap - enclosureFootprint(enclosures)",
    ],
  },
  {
    file: "src/components/ChondroConservationPartnerships.tsx",
    markers: [
      "const mapSpotlight",
      "radial-gradient(circle at",
      "aria-pressed={active(subspecies)}",
      "Selected program",
    ],
  },
];

for (const check of checks) {
  const source = fs.readFileSync(check.file, "utf8");
  for (const marker of check.markers) {
    if (!source.includes(marker)) {
      console.error(`\n[Chondro setup] Validation failed: ${check.file} is missing expected output:\n${marker}`);
      process.exit(1);
    }
  }
  for (const marker of check.forbidden ?? []) {
    if (source.includes(marker)) {
      console.error(`\n[Chondro setup] Validation failed: ${check.file} still contains retired output:\n${marker}`);
      process.exit(1);
    }
  }
}

console.log("\n[Chondro setup] Source-native Chondro game validation completed successfully.");
