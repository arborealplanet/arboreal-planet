import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(find, replacement, label) {
  if (!source.includes(find)) throw new Error(`Could not apply breeder initials recovery patch: ${label}`);
  source = source.replace(find, replacement);
}

replaceOnce(
  '  const [breederInitials, setBreederInitials] = useState<string | null>(null);\n  const [initialsInput, setInitialsInput] = useState("");',
  '  const [breederInitials, setBreederInitials] = useState<string | null>(null);\n  const [breederIdentityLoaded, setBreederIdentityLoaded] = useState(false);\n  const [initialsInput, setInitialsInput] = useState("");',
  "identity loaded state",
);

replaceOnce(
  `    async function loadBreederIdentity() {\n      try {\n        const response = await fetch("/api/hatchery/chondro-breeder/breeder-identity", { cache: "no-store" });\n        const data = await response.json();\n        if (!cancelled && response.ok) setBreederInitials(data.initials ?? null);\n      } catch {}\n    }`,
  `    async function loadBreederIdentity() {\n      try {\n        const response = await fetch("/api/hatchery/chondro-breeder/breeder-identity", { cache: "no-store" });\n        const data = await response.json();\n        if (!cancelled && response.ok) setBreederInitials(data.initials ?? null);\n      } catch {} finally {\n        if (!cancelled) setBreederIdentityLoaded(true);\n      }\n    }`,
  "identity loader completion",
);

replaceOnce(
  `    if (breedingCycle.stage === "incubation") {\n      if (!breederInitials) {\n        setBreedingCycle(null);\n        setInitialsPrompt(true);\n        setBreedingMessage("Choose breeder initials before the clutch can be recorded.");\n        return;\n      }`,
  `    if (breedingCycle.stage === "incubation") {\n      if (!breederIdentityLoaded) return;\n      if (!breederInitials) {\n        setInitialsPrompt(true);\n        setBreedingMessage("Choose breeder initials before the clutch can be recorded. Your completed incubation is being held safely until initials are confirmed.");\n        return;\n      }`,
  "preserve incubation while identity loads",
);

replaceOnce(
  '  }, [hydrated, now, facilityConstruction, geneticTestsPending, breedingCycle, colony, breederInitials, damId, sireId]);',
  '  }, [hydrated, now, facilityConstruction, geneticTestsPending, breedingCycle, colony, breederInitials, breederIdentityLoaded, damId, sireId]);',
  "breeding effect dependencies",
);

replaceOnce(
  `    setBreederInitials(data.initials);\n    setInitialsPrompt(false);\n    setInitialsStatus("");\n    window.setTimeout(() => startBreedingCycle(), 0);`,
  `    setBreederInitials(data.initials);\n    setBreederIdentityLoaded(true);\n    setInitialsPrompt(false);\n    setInitialsStatus("");\n    if (!breedingCycle) window.setTimeout(() => startBreedingCycle(), 0);`,
  "do not restart completed breeding cycle",
);

const insertionPoint = '  function paySeasonCare() {';
if (!source.includes('Recovered the completed incubation after restoring your breeder initials')) {
  if (!source.includes(insertionPoint)) throw new Error("Could not find recovery insertion point.");
  const recovery = `  /* eslint-disable react-hooks/set-state-in-effect */\n  useEffect(() => {\n    if (!hydrated || !breederIdentityLoaded || !breederInitials || breedingCycle || clutch) return;\n    if (!breedingMessage.startsWith("Choose breeder initials before the clutch can be recorded")) return;\n    const recoveryDam = colony.find((animal) => animal.id === damId);\n    const recoverySire = colony.find((animal) => animal.id === sireId);\n    if (!recoveryDam || !recoverySire) return;\n    setClutch(createClutch(recoveryDam, recoverySire, breederInitials));\n    setClutchEstablished(false);\n    setHoldbacks([]);\n    setInitialsPrompt(false);\n    setBreedingMessage("Recovered the completed incubation after restoring your breeder initials. The clutch is ready to establish.");\n  }, [hydrated, breederIdentityLoaded, breederInitials, breedingCycle, clutch, breedingMessage, colony, damId, sireId]);\n  /* eslint-enable react-hooks/set-state-in-effect */\n\n`;
  source = source.replace(insertionPoint, recovery + insertionPoint);
}

fs.writeFileSync(file, source);
console.log("Protected completed incubations from breeder-initials races and added recovery for affected saves.");
