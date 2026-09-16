import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");
const gamePath = path.join(root, "src/components/ChondroBreederGameV3.tsx");
const emeraldWorkspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[arboreal-keeper] Expected fragment was not found: ${before.slice(0, 90)}`);
    return source;
  }
  return source.replace(before, after);
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[arboreal-keeper] ChondroBreederWorkspace.tsx not found; skipping shell patch.");
} else {
  let source = fs.readFileSync(workspacePath, "utf8");

  source = replaceOnce(
    source,
    'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";',
    'import { ChondroColonyOverview } from "@/components/ChondroColonyOverview";\nimport { ArborealKeeperSpeciesPrograms } from "@/components/ArborealKeeperSpeciesPrograms";\nimport { ArborealKeeperProgressionStrip } from "@/components/ArborealKeeperProgressionStrip";\nimport { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";\nimport { ArborealKeeperMyAnimals } from "@/components/ArborealKeeperMyAnimals";',
  );

  // A prior lint pass may already have installed the older multispecies imports.
  if (!source.includes('import { ArborealKeeperMyAnimals } from "@/components/ArborealKeeperMyAnimals";')) {
    source = source.replace(
      'import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";',
      'import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";\nimport { ArborealKeeperMyAnimals } from "@/components/ArborealKeeperMyAnimals";',
    );
  }

  const replacements = [
    ["Exit Chondro Breeder and return to Arboreal Planet", "Exit Arboreal Keeper and return to Arboreal Planet"],
    [">Chondro Breeder</div>", ">Arboreal Keeper</div>"],
    ['aria-label="Chondro Breeder navigation"', 'aria-label="Arboreal Keeper navigation"'],
    ['{ id: "home", label: "Home", detail: "Breeder command center", icon: "⌂" }', '{ id: "home", label: "Home", detail: "Arboreal Keeper command center", icon: "⌂" }'],
    ['{ id: "colony", label: "Colony", navLabel: "Snakes", detail: "Animals and breeder records", icon: "◎" }', '{ id: "colony", label: "My Animals", navLabel: "Animals", detail: "Animals, species programs and keeper records", icon: "◎" }'],
    ['{ id: "clutches", label: "Clutches", navLabel: "Clutch", detail: "Eggs, hatchlings and clutch history", icon: "◉" }', '{ id: "clutches", label: "Offspring", navLabel: "Offspring", detail: "Eggs, litters, hatchlings and offspring history", icon: "◉" }'],
    ['{ id: "market", label: "Store", detail: "Buy chondros and use the player market", icon: "$" }', '{ id: "market", label: "Animal Market", detail: "Browse animals across unlocked species and use the player market", icon: "$" }'],
    ['{ id: "guide", label: "Field Guide", detail: "Subspecies, locality and phenotype reference", icon: "?" }', '{ id: "guide", label: "Field Guide", detail: "Species, locality and phenotype reference", icon: "?" }'],
    ['colony: { eyebrow: "Collection", title: "Colony", detail: "Browse your snakes first. Open an animal for naming, testing, notes, sale, retirement and detailed records. Enclosure management follows below the collection." }', 'colony: { eyebrow: "Collection", title: "My Animals", detail: "Browse animals across every active species program. Open an animal for naming, testing, notes, sale, retirement and detailed records. Enclosure management follows below the collection." }'],
    ['clutches: { eyebrow: "Offspring", title: "Clutches", detail: "See the active clutch first, make establishment and holdback decisions, then review completed breeding history below." }', 'clutches: { eyebrow: "Offspring", title: "Offspring", detail: "Review active clutches and litters, make establishment and holdback decisions, then review completed breeding history below." }'],
    ['market: { eyebrow: "Snake exchange", title: "Chondro Store", detail: "Browse rotating game inventory first, then shop breeder-to-breeder listings and manage your seller activity." }', 'market: { eyebrow: "Animal exchange", title: "Animal Market", detail: "Browse rotating inventory across unlocked species, then shop breeder-to-breeder listings and manage your seller activity." }'],
    ["Illustrated Chondro Breeder incubator", "Illustrated Arboreal Keeper incubation room"],
    ["Breed, incubate, hatch and build a lineage.", "Breed, raise and build living lineages."],
    ["The Chondro Breeder artwork is part of the main experience. Move between breeding, colony, clutch and store screens to see the program progress visually.", "Arboreal Keeper brings multiple species into one shared facility. Move between breeding, animals, offspring and the market while each species keeps its own biology and progression."],
    ["Manage colony", "Manage animals"],
    ["Review clutches", "Review offspring"],
    ["← Breeder Home", "← Keeper Home"],
    ["Breeder tools", "Keeper tools"],
  ];

  for (const [before, after] of replacements) {
    source = source.split(before).join(after);
  }

  source = replaceOnce(
    source,
    '          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />',
    '          <ChondroBreederHomeStatus onOpen={(next) => onOpen(next)} />\n\n          <ArborealKeeperProgressionStrip />\n          <ArborealKeeperSpeciesPrograms />',
  );

  source = replaceOnce(
    source,
    '      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />\n      {view === "breeding" || view === "colony" || view === "market" ? <ChondroBreederScreenArt screen={view} /> : null}',
    '      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />\n      {view === "colony" ? <ArborealKeeperMyAnimals /> : null}\n      <ArborealKeeperEmeraldWorkspace mode={view} />\n      {view === "breeding" || view === "colony" || view === "market" ? <ChondroBreederScreenArt screen={view} /> : null}',
  );

  // Keep the patch repeatable after lint has already generated the Emerald workspace mount.
  source = replaceOnce(
    source,
    '      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />\n      <ArborealKeeperEmeraldWorkspace mode={view} />',
    '      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />\n      {view === "colony" ? <ArborealKeeperMyAnimals /> : null}\n      <ArborealKeeperEmeraldWorkspace mode={view} />',
  );

  fs.writeFileSync(workspacePath, source);
  console.log("[arboreal-keeper] Applied Arboreal Keeper multispecies shell patches.");
}

if (!fs.existsSync(gamePath)) {
  console.warn("[arboreal-keeper] ChondroBreederGameV3.tsx not found; skipping shared economy patch.");
} else {
  let game = fs.readFileSync(gamePath, "utf8");

  game = replaceOnce(
    game,
    '    window.addEventListener("arboreal-chondro-enclosure-action", handleEnclosureAction);\n    return () => window.removeEventListener("arboreal-chondro-enclosure-action", handleEnclosureAction);\n  }, [cash, roomEnclosureSlots]);\n  /* eslint-enable react-hooks/exhaustive-deps */',
    '    window.addEventListener("arboreal-chondro-enclosure-action", handleEnclosureAction);\n    return () => window.removeEventListener("arboreal-chondro-enclosure-action", handleEnclosureAction);\n  }, [cash, roomEnclosureSlots]);\n\n  useEffect(() => {\n    function handleKeeperEconomyAction(event: Event) {\n      const detail = (event as CustomEvent<{ action?: string; amount?: number; reason?: string; approved?: boolean; balance?: number }>).detail;\n      if (!detail) return;\n      const amount = Math.max(0, Number(detail.amount ?? 0));\n      if (!Number.isFinite(amount) || amount <= 0) return;\n\n      let nextCash = cash;\n      let nextReputation = careerReputation;\n      if (detail.action === "spend") {\n        if (cash < amount) {\n          detail.approved = false;\n          detail.balance = cash;\n          return;\n        }\n        nextCash = cash - amount;\n        setCash(nextCash);\n      } else if (detail.action === "credit") {\n        nextCash = cash + amount;\n        setCash(nextCash);\n      } else if (detail.action === "reputation") {\n        nextReputation = careerReputation + amount;\n        setCareerReputation(nextReputation);\n      } else {\n        return;\n      }\n\n      detail.approved = true;\n      detail.balance = nextCash;\n      window.dispatchEvent(new CustomEvent("arboreal-keeper-economy-updated", { detail: { cash: nextCash, reputation: nextReputation } }));\n    }\n\n    window.addEventListener("arboreal-keeper-economy-action", handleKeeperEconomyAction);\n    return () => window.removeEventListener("arboreal-keeper-economy-action", handleKeeperEconomyAction);\n  }, [cash, careerReputation]);\n  /* eslint-enable react-hooks/exhaustive-deps */',
  );

  fs.writeFileSync(gamePath, game);
  console.log("[arboreal-keeper] Applied shared Arboreal Keeper economy bridge.");
}

if (fs.existsSync(emeraldWorkspacePath)) {
  let emerald = fs.readFileSync(emeraldWorkspacePath, "utf8");

  emerald = emerald.replace('  eligibleEmeraldEnclosures,\n', "");
  emerald = emerald.replace(
    '\nfunction maxLitterSize(speciesId: EmeraldSpeciesId) {\n  return speciesId === "amazon_basin_emerald_tree_boa" ? 9 : 11;\n}\n',
    "\n",
  );
  emerald = emerald.replace(
    '  let housingUnits = save.housingUnits.map((unit) => ({ ...unit }));',
    '  const housingUnits = save.housingUnits.map((unit) => ({ ...unit }));',
  );
  emerald = emerald.replace(
    '  const [now, setNow] = useState(Date.now());',
    '  const [now, setNow] = useState(0);',
  );

  emerald = replaceOnce(
    emerald,
    '  useEffect(() => {\n    try {\n      const raw = window.localStorage.getItem(EMERALD_KEEPER_SAVE_KEY);\n      setSave(raw ? sanitizeEmeraldKeeperSave(JSON.parse(raw)) : EMPTY_EMERALD_KEEPER_SAVE);\n    } catch {\n      setSave(EMPTY_EMERALD_KEEPER_SAVE);\n    }\n    const progress = readSharedProgress();\n    setCash(progress.cash);\n    setReputation(progress.reputation);\n    setHydrated(true);\n  }, []);',
    '  useEffect(() => {\n    const timer = window.setTimeout(() => {\n      try {\n        const raw = window.localStorage.getItem(EMERALD_KEEPER_SAVE_KEY);\n        setSave(raw ? sanitizeEmeraldKeeperSave(JSON.parse(raw)) : EMPTY_EMERALD_KEEPER_SAVE);\n      } catch {\n        setSave(EMPTY_EMERALD_KEEPER_SAVE);\n      }\n      const progress = readSharedProgress();\n      setCash(progress.cash);\n      setReputation(progress.reputation);\n      setNow(Date.now());\n      setHydrated(true);\n    }, 0);\n    return () => window.clearTimeout(timer);\n  }, []);',
  );

  emerald = replaceOnce(
    emerald,
    '  useEffect(() => {\n    const timer = window.setInterval(() => setNow(Date.now()), 30_000);\n    return () => window.clearInterval(timer);\n  }, []);',
    '  useEffect(() => {\n    const timer = window.setInterval(() => setNow(Date.now()), 30_000);\n    return () => window.clearInterval(timer);\n  }, []);',
  );

  emerald = replaceOnce(
    emerald,
    '  useEffect(() => {\n    const sync = () => {\n      const progress = readSharedProgress();\n      setCash(progress.cash);\n      setReputation(progress.reputation);\n    };\n    window.addEventListener("arboreal-keeper-economy-updated", sync);\n    window.addEventListener("focus", sync);\n    return () => {\n      window.removeEventListener("arboreal-keeper-economy-updated", sync);\n      window.removeEventListener("focus", sync);\n    };\n  }, []);',
    '  useEffect(() => {\n    const syncFromStorage = () => {\n      const progress = readSharedProgress();\n      setCash(progress.cash);\n      setReputation(progress.reputation);\n    };\n    const syncFromEvent = (event: Event) => {\n      const detail = (event as CustomEvent<{ cash?: number; reputation?: number }>).detail;\n      if (typeof detail?.cash === "number") setCash(detail.cash);\n      if (typeof detail?.reputation === "number") setReputation(detail.reputation);\n      if (typeof detail?.cash !== "number" && typeof detail?.reputation !== "number") syncFromStorage();\n    };\n    window.addEventListener("arboreal-keeper-economy-updated", syncFromEvent);\n    window.addEventListener("focus", syncFromStorage);\n    return () => {\n      window.removeEventListener("arboreal-keeper-economy-updated", syncFromEvent);\n      window.removeEventListener("focus", syncFromStorage);\n    };\n  }, []);',
  );

  emerald = replaceOnce(
    emerald,
    '  useEffect(() => {\n    if (!hydrated || !save.breedingJobs.length) return;\n    const resolved = resolveReadyJobs(save, now);\n    if (!resolved.changed) return;\n    setSave(resolved.save);\n    if (resolved.reputationEarned > 0) {\n      requestEconomyAction("reputation", resolved.reputationEarned, "Emerald Tree Boa litter");\n      setMessage(`Live litter produced. +${resolved.reputationEarned} keeper reputation.`);\n    }\n  }, [hydrated, now, save]);',
    '  useEffect(() => {\n    if (!hydrated || !save.breedingJobs.length || now <= 0) return;\n    const timer = window.setTimeout(() => {\n      const resolved = resolveReadyJobs(save, now);\n      if (!resolved.changed) return;\n      setSave(resolved.save);\n      if (resolved.reputationEarned > 0) {\n        requestEconomyAction("reputation", resolved.reputationEarned, "Emerald Tree Boa litter");\n        setMessage(`Live litter produced. +${resolved.reputationEarned} keeper reputation.`);\n      }\n    }, 0);\n    return () => window.clearTimeout(timer);\n  }, [hydrated, now, save]);',
  );

  fs.writeFileSync(emeraldWorkspacePath, emerald);
  console.log("[arboreal-keeper] Polished Emerald Tree Boa workspace bindings.");
}
