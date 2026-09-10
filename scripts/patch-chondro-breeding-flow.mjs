import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src/components/ChondroBreederGameV3.tsx");
let source = fs.readFileSync(file, "utf8");

if (source.includes("CLUTCH_ESTABLISH_BASE_COST")) {
  console.log("Chondro breeding-flow patch already applied.");
  process.exit(0);
}

function replaceOnce(find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Could not apply Chondro breeding patch: ${label}`);
  source = source.replace(find, replacement);
}

replaceOnce(
  'type BreedingStage = "cycling" | "pairing" | "laying" | "incubation" | "hatch-day";',
  'type BreedingStage = "cycling" | "pairing" | "gestation" | "separate-pair" | "pre-lay" | "laying" | "incubation" | "hatch-day";',
  "breeding stage union",
);

replaceOnce(
  '  breedingMessage?: string;\n};',
  '  breedingMessage?: string;\n  clutchEstablished?: boolean;\n};',
  "save field",
);

replaceOnce(
  'const SEASON_CARE_PER_ADULT = CHONDRO_SPECIES_PROFILE.reproduction.seasonCarePerAdult;\n',
  'const SEASON_CARE_PER_ADULT = CHONDRO_SPECIES_PROFILE.reproduction.seasonCarePerAdult;\nconst CLUTCH_ESTABLISH_BASE_COST = 150;\nconst CLUTCH_ESTABLISH_PER_HATCHLING = 75;\n',
  "establishment constants",
);

replaceOnce(
  '  const [breedingMessage, setBreedingMessage] = useState("");\n',
  '  const [breedingMessage, setBreedingMessage] = useState("");\n  const [clutchEstablished, setClutchEstablished] = useState(false);\n',
  "establishment state",
);

replaceOnce(
  '  const saleIncome = sales.reduce((sum, item) => sum + item.value, 0);\n',
  '  const saleIncome = sales.reduce((sum, item) => sum + item.value, 0);\n  const clutchEstablishmentCost = clutch ? CLUTCH_ESTABLISH_BASE_COST + clutch.offspring.length * CLUTCH_ESTABLISH_PER_HATCHLING : 0;\n',
  "establishment cost",
);

replaceOnce(
  '        setBreedingMessage(chosen.breedingMessage ?? "");\n',
  '        setBreedingMessage(chosen.breedingMessage ?? "");\n        // Grandfather already-hatched clutches from older saves so players do not lose progress.\n        setClutchEstablished(chosen.clutchEstablished ?? Boolean(chosen.clutch));\n',
  "load establishment state",
);

replaceOnce(
  '      breedingMessage,\n    };',
  '      breedingMessage,\n      clutchEstablished,\n    };',
  "save establishment state",
);

replaceOnce(
  '  }, [hydrated, cloudSave, started, cash, colony, tested, damId, sireId, clutch, clutchHistory, holdbacks, season, sales, transfers, enclosures, purchasedStoreIds, careerReputation, facilityRooms, facilityConstruction, breedingCycle, geneticTestsPending, femaleRecovery, seasonCarePaid, breedingMessage]);',
  '  }, [hydrated, cloudSave, started, cash, colony, tested, damId, sireId, clutch, clutchHistory, holdbacks, season, sales, transfers, enclosures, purchasedStoreIds, careerReputation, facilityRooms, facilityConstruction, breedingCycle, geneticTestsPending, femaleRecovery, seasonCarePaid, breedingMessage, clutchEstablished]);',
  "save dependencies",
);

replaceOnce(
  '      if (Math.random() > pairingChance(cycleDam, cycleSire)) {\n        setBreedingCycle(null);\n        setBreedingMessage(pairingFailureReason(cycleDam, cycleSire));\n        return;\n      }',
  '      if (Math.random() > pairingChance(cycleDam, cycleSire)) {\n        const pairingStage = BREEDING_STAGES.find((stage) => stage.id === "pairing");\n        const retryHours = pairingStage?.hours ?? 8;\n        setBreedingCycle({ ...breedingCycle, stage: "pairing", completesAt: Date.now() + retryHours * 3_600_000 });\n        setBreedingMessage(`${pairingFailureReason(cycleDam, cycleSire)} The pair remains in the breeding window at cycling temperatures; another pairing attempt has started without re-cycling.`);\n        return;\n      }',
  "pairing retry without recyling",
);

replaceOnce(
  '      setClutch(createClutch(cycleDam, cycleSire, breederInitials));\n      setHoldbacks([]);',
  '      setClutch(createClutch(cycleDam, cycleSire, breederInitials));\n      setClutchEstablished(false);\n      setHoldbacks([]);',
  "new clutch establishment lock",
);

replaceOnce(
  '  function toggleHoldback(id: string) {\n    setHoldbacks((current) =>',
  '  function payClutchEstablishment() {\n    if (!clutch || clutchEstablished || cash < clutchEstablishmentCost) return;\n    setCash((value) => value - clutchEstablishmentCost);\n    setClutch((current) => current ? {\n      ...current,\n      offspring: current.offspring.map((baby) => ({ ...baby, lifeStage: "Neonate" as LifeStage })),\n    } : current);\n    setClutchEstablished(true);\n    setBreedingMessage(`The entire clutch is established for ${money(clutchEstablishmentCost)}. Neonates are now ready for individual holdback, sale, naming and management.`);\n  }\n\n  function toggleHoldback(id: string) {\n    if (!clutchEstablished) return;\n    setHoldbacks((current) =>',
  "bulk establishment payment",
);

replaceOnce(
  '  async function finishClutch() {\n    if (!clutch || marketBusy) return;',
  '  async function finishClutch() {\n    if (!clutch || !clutchEstablished || marketBusy) return;',
  "prevent sale before establishment",
);

replaceOnce(
  '    setClutch(null);\n    setHoldbacks([]);',
  '    setClutch(null);\n    setClutchEstablished(false);\n    setHoldbacks([]);',
  "clear establishment after finished clutch",
);

replaceOnce(
  '    setBreedingMessage("");\n    setFavoriteIds([]);',
  '    setBreedingMessage("");\n    setClutchEstablished(false);\n    setFavoriteIds([]);',
  "reset establishment state",
);

replaceOnce(
  '<CollapsibleGameSection label={`Active clutch · ${clutch.id}`} detail={`${clutch.offspring.length} offspring · ${holdbacks.length} holdback${holdbacks.length === 1 ? "" : "s"} selected`} defaultOpen>',
  '<CollapsibleGameSection label={`Active clutch · ${clutch.id}`} detail={clutchEstablished ? `${clutch.offspring.length} established neonates · ${holdbacks.length} holdback${holdbacks.length === 1 ? "" : "s"} selected` : `${clutch.offspring.length} hatchlings · establishment required`} defaultOpen>',
  "active clutch detail",
);

replaceOnce(
  '<h2 className="mt-2 text-2xl font-semibold">Clutch hatched · {clutch.offspring.length} offspring</h2>\n            <p className="mt-2 text-sm text-white/34">Choose holdbacks by what you can see, locality grade, or test them later after holding them back. Exact percentages are intentionally hidden at hatch unless an animal is genetically tested.</p>',
  '<h2 className="mt-2 text-2xl font-semibold">{clutchEstablished ? "Neonates established" : "Clutch hatched"} · {clutch.offspring.length} offspring</h2>\n            <p className="mt-2 text-sm text-white/34">{clutchEstablished ? "The clutch has been established. You can now choose holdbacks and move unheld neonates to the player market." : "Raise this clutch together through the establishment period before interacting with individual hatchlings. One payment covers feeders, tubs, cleaning and establishment care for the whole clutch."}</p>\n            {!clutchEstablished ? (\n              <div className="mt-4 rounded-2xl border border-amber-200/15 bg-amber-200/[.035] p-4">\n                <div className="text-[10px] font-black uppercase tracking-[.14em] text-amber-100/55">Establish entire clutch</div>\n                <div className="mt-2 text-sm text-white/45">Base care {money(CLUTCH_ESTABLISH_BASE_COST)} + {clutch.offspring.length} hatchlings × {money(CLUTCH_ESTABLISH_PER_HATCHLING)} = <span className="font-bold text-amber-100/75">{money(clutchEstablishmentCost)}</span></div>\n                <button disabled={cash < clutchEstablishmentCost} onClick={payClutchEstablishment} className="mt-3 rounded-xl bg-amber-200 px-4 py-2 text-xs font-black text-[#17130a] disabled:opacity-30">{cash < clutchEstablishmentCost ? "Not enough cash" : `Establish clutch · ${money(clutchEstablishmentCost)}`}</button>\n              </div>\n            ) : null}',
  "active clutch establishment panel",
);

replaceOnce(
  '<button key={baby.id} onClick={() => toggleHoldback(baby.id)} className={`rounded-3xl border p-4 text-left ${kept ? "border-amber-200/35 bg-amber-200/[.05]" : "border-white/[.06] bg-white/[.015]"}`}>',
  '<button key={baby.id} disabled={!clutchEstablished} onClick={() => toggleHoldback(baby.id)} className={`rounded-3xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-55 ${kept ? "border-amber-200/35 bg-amber-200/[.05]" : "border-white/[.06] bg-white/[.015]"}`}>',
  "lock hatchling interactions",
);

replaceOnce(
  '<div className="mt-1 text-[10px] text-white/30">{baby.sex} · Hatchling · {baby.classification} · {baby.locality}</div>',
  '<div className="mt-1 text-[10px] text-white/30">{baby.sex} · {clutchEstablished ? "Neonate" : "Hatchling"} · {baby.classification} · {baby.locality}</div>',
  "clutch life stage label",
);

replaceOnce(
  '<div className="mt-3 text-[10px] font-bold uppercase tracking-[.12em] text-amber-100/50">{kept ? "Holdback selected" : `Will list · ${money(saleValue(baby, season))}`}</div>',
  '<div className="mt-3 text-[10px] font-bold uppercase tracking-[.12em] text-amber-100/50">{!clutchEstablished ? "Establishing with clutch · individual actions locked" : kept ? "Holdback selected" : `Will list · ${money(saleValue(baby, season))}`}</div>',
  "clutch interaction status",
);

replaceOnce(
  '<div className="text-xs text-white/38">{holdbacks.length} held back · {clutch.offspring.length - holdbacks.length} going to market</div>\n              <button disabled={!!marketBusy} onClick={() => void finishClutch()} className="rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-[#06100c] disabled:opacity-40">{marketBusy === "clutch" ? "Listing offspring…" : "List unheld & advance season"}</button>',
  '<div className="text-xs text-white/38">{clutchEstablished ? `${holdbacks.length} held back · ${clutch.offspring.length - holdbacks.length} going to market` : "The clutch must be established before individual offspring can be kept or sold."}</div>\n              <button disabled={!clutchEstablished || !!marketBusy} onClick={() => void finishClutch()} className="rounded-2xl bg-emerald-300 px-6 py-3 text-sm font-black text-[#06100c] disabled:opacity-40">{!clutchEstablished ? "Establish clutch first" : marketBusy === "clutch" ? "Listing offspring…" : "List unheld & advance season"}</button>',
  "finish clutch lock",
);

fs.writeFileSync(file, source);
console.log("Applied corrected Chondro breeding cycle and bulk clutch establishment flow.");
