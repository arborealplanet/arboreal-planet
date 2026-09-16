import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enginePath = path.join(root, "src/lib/arboreal-keeper-emerald-engine.ts");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[emerald-recovery] Expected ${label} fragment not found: ${before.slice(0, 120)}`);
    return source;
  }
  return source.replace(before, after);
}

if (fs.existsSync(enginePath)) {
  let engine = fs.readFileSync(enginePath, "utf8");
  const engineMarker = "femaleRecoveryUntil: Record<string, number>;";

  if (!engine.includes(engineMarker)) {
    engine = replaceOnce(
      engine,
      "export type EmeraldMarketOffer = {",
      `export type EmeraldAnimalSnapshot = Pick<
  EmeraldAnimal,
  "id" | "name" | "speciesId" | "sex" | "lifeStage" | "phase" | "neonateColor" | "traits" | "generation"
>;

export type EmeraldMarketOffer = {`,
      "animal snapshot type",
    );

    engine = replaceOnce(
      engine,
      `export type EmeraldLitterRecord = {
  id: string;
  speciesId: EmeraldSpeciesId;
  damId: string;
  sireId: string;
  offspringIds: string[];
  bornAt: number;
  seasonLabel: string;
};`,
      `export type EmeraldLitterRecord = {
  id: string;
  speciesId: EmeraldSpeciesId;
  damId: string;
  sireId: string;
  offspringIds: string[];
  bornAt: number;
  seasonLabel: string;
  damSnapshot?: EmeraldAnimalSnapshot;
  sireSnapshot?: EmeraldAnimalSnapshot;
  offspringSnapshots?: EmeraldAnimalSnapshot[];
};`,
      "litter snapshot fields",
    );

    engine = replaceOnce(
      engine,
      `  housingUnits: EmeraldHousingUnit[];
  selectedSpecies: EmeraldSpeciesId;
  updatedAt: number;`,
      `  housingUnits: EmeraldHousingUnit[];
  femaleRecoveryUntil: Record<string, number>;
  selectedSpecies: EmeraldSpeciesId;
  updatedAt: number;`,
      "save recovery map",
    );

    engine = replaceOnce(
      engine,
      `  litters: [],
  housingUnits: [],
  selectedSpecies: "northern_emerald_tree_boa",`,
      `  litters: [],
  housingUnits: [],
  femaleRecoveryUntil: {},
  selectedSpecies: "northern_emerald_tree_boa",`,
      "empty save recovery map",
    );

    engine = replaceOnce(
      engine,
      `export function breedingStageLabel(stage: EmeraldBreedingStage) {`,
      `export function emeraldRecoveryDurationMs(speciesId: EmeraldSpeciesId) {
  // Gameplay recovery windows. These are balance values, not real-world husbandry guidance.
  return speciesId === "amazon_basin_emerald_tree_boa" ? 96 * HOUR_MS : 72 * HOUR_MS;
}

export function breedingStageLabel(stage: EmeraldBreedingStage) {`,
      "recovery duration helper",
    );

    engine = replaceOnce(
      engine,
      `    litters: Array.isArray(input.litters) ? input.litters : [],
    housingUnits: Array.isArray(input.housingUnits) ? input.housingUnits : [],
    selectedSpecies:`,
      `    litters: Array.isArray(input.litters) ? input.litters : [],
    housingUnits: Array.isArray(input.housingUnits) ? input.housingUnits : [],
    femaleRecoveryUntil:
      input.femaleRecoveryUntil && typeof input.femaleRecoveryUntil === "object" && !Array.isArray(input.femaleRecoveryUntil)
        ? Object.fromEntries(
            Object.entries(input.femaleRecoveryUntil)
              .map(([animalId, until]) => [String(animalId).slice(0, 180), Number(until)] as const)
              .filter(([, until]) => Number.isFinite(until) && until > 0),
          )
        : {},
    selectedSpecies:`,
      "sanitize recovery map",
    );

    console.log("[emerald-recovery] Added recovery state and durable litter snapshot types.");
  } else {
    console.log("[emerald-recovery] Engine recovery model already applied.");
  }

  fs.writeFileSync(enginePath, engine);
}

if (fs.existsSync(workspacePath)) {
  let workspace = fs.readFileSync(workspacePath, "utf8");
  const workspaceMarker = "femaleRecoveryUntil[dam.id] = now + emeraldRecoveryDurationMs(original.speciesId);";

  if (!workspace.includes(workspaceMarker)) {
    workspace = replaceOnce(
      workspace,
      `  emeraldMarketForEpoch,
  emeraldMarketValue,`,
      `  emeraldMarketForEpoch,
  emeraldMarketValue,
  emeraldRecoveryDurationMs,`,
      "recovery helper import",
    );

    workspace = replaceOnce(
      workspace,
      `  const litters = [...save.litters];
  const jobs: EmeraldBreedingJob[] = [];
  let changed = false;
  let reputationEarned = 0;

  for (const original of save.breedingJobs) {`,
      `  const litters = [...save.litters];
  const jobs: EmeraldBreedingJob[] = [];
  let changed = false;
  let reputationEarned = 0;
  const femaleRecoveryUntil = { ...save.femaleRecoveryUntil };

  for (const [animalId, until] of Object.entries(femaleRecoveryUntil)) {
    if (now < Number(until)) continue;
    delete femaleRecoveryUntil[animalId];
    animals = animals.map((animal) =>
      animal.id === animalId && animal.condition === "Fair"
        ? { ...animal, condition: "Good" as const }
        : animal,
    );
    changed = true;
  }

  for (const original of save.breedingJobs) {`,
      "recovery resolution",
    );

    workspace = replaceOnce(
      workspace,
      `      animals = [...animals, ...offspring];
      litters.unshift({
        id: \`litter-\${original.seed}\`,
        speciesId: original.speciesId,
        damId: original.damId,
        sireId: original.sireId,
        offspringIds: offspring.map((animal) => animal.id),
        bornAt: now,
        seasonLabel: \`Keeper year \${new Date(now).getFullYear()}\`,
      });`,
      `      animals = animals.map((animal) =>
        animal.id === dam.id ? { ...animal, condition: "Fair" as const } : animal,
      );
      animals = [...animals, ...offspring];
      femaleRecoveryUntil[dam.id] = now + emeraldRecoveryDurationMs(original.speciesId);
      litters.unshift({
        id: \`litter-\${original.seed}\`,
        speciesId: original.speciesId,
        damId: original.damId,
        sireId: original.sireId,
        offspringIds: offspring.map((animal) => animal.id),
        bornAt: now,
        seasonLabel: \`Keeper year \${new Date(now).getFullYear()}\`,
        damSnapshot: {
          id: dam.id,
          name: dam.name,
          speciesId: dam.speciesId,
          sex: dam.sex,
          lifeStage: dam.lifeStage,
          phase: dam.phase,
          neonateColor: dam.neonateColor,
          traits: { ...dam.traits },
          generation: dam.generation,
        },
        sireSnapshot: {
          id: sire.id,
          name: sire.name,
          speciesId: sire.speciesId,
          sex: sire.sex,
          lifeStage: sire.lifeStage,
          phase: sire.phase,
          neonateColor: sire.neonateColor,
          traits: { ...sire.traits },
          generation: sire.generation,
        },
        offspringSnapshots: offspring.map((animal) => ({
          id: animal.id,
          name: animal.name,
          speciesId: animal.speciesId,
          sex: animal.sex,
          lifeStage: animal.lifeStage,
          phase: animal.phase,
          neonateColor: animal.neonateColor,
          traits: { ...animal.traits },
          generation: animal.generation,
        })),
      });`,
      "litter snapshots and dam recovery",
    );

    workspace = replaceOnce(
      workspace,
      `          litters,
          breedingJobs: jobs,
          updatedAt: now,`,
      `          litters,
          breedingJobs: jobs,
          femaleRecoveryUntil,
          updatedAt: now,`,
      "persist recovery map",
    );

    workspace = replaceOnce(
      workspace,
      `  useEffect(() => {
    if (!hydrated || !save.breedingJobs.length || now <= 0) return;`,
      `  useEffect(() => {
    if (!hydrated || now <= 0) return;
    if (!save.breedingJobs.length && !Object.keys(save.femaleRecoveryUntil).length) return;`,
      "recovery timer effect",
    );

    workspace = replaceOnce(
      workspace,
      `  const females = animalsForSpecies.filter(
    (animal) => animal.lifeStage === "adult" && animal.sex === "Female",
  );`,
      `  const females = animalsForSpecies.filter(
    (animal) =>
      animal.lifeStage === "adult" &&
      animal.sex === "Female" &&
      Number(save.femaleRecoveryUntil[animal.id] ?? 0) <= now,
  );`,
      "eligible female filter",
    );

    workspace = replaceOnce(
      workspace,
      `    if (currentJob) {
      setMessage("This species already has an active reproductive cycle.");
      return;
    }
    const cost = breedingCost(speciesId);`,
      `    const recoveryUntil = Number(save.femaleRecoveryUntil[dam.id] ?? 0);
    if (recoveryUntil > now) {
      setMessage(\`${dam.name} is still recovering from her previous litter for ${remaining(recoveryUntil - now)}.\`);
      return;
    }
    if (currentJob) {
      setMessage("This species already has an active reproductive cycle.");
      return;
    }
    const cost = breedingCost(speciesId);`,
      "pairing recovery gate",
    );

    workspace = replaceOnce(
      workspace,
      `      animals: current.animals.filter((item) => item.id !== animalId),
      housingUnits: current.housingUnits.map((unit) =>
        unit.occupantId === animalId ? { ...unit, occupantId: null } : unit,
      ),`,
      `      animals: current.animals.filter((item) => item.id !== animalId),
      housingUnits: current.housingUnits.map((unit) =>
        unit.occupantId === animalId ? { ...unit, occupantId: null } : unit,
      ),
      femaleRecoveryUntil: Object.fromEntries(
        Object.entries(current.femaleRecoveryUntil).filter(([id]) => id !== animalId),
      ),`,
      "cleanup recovery on sale",
    );

    workspace = replaceOnce(
      workspace,
      `  const housingNeeded = currentJob?.stage === "birth" && birthPreview
    ? Math.max(0, birthPreview.length - openNeonateHousing)
    : 0;

  return (`,
      `  const housingNeeded = currentJob?.stage === "birth" && birthPreview
    ? Math.max(0, birthPreview.length - openNeonateHousing)
    : 0;
  const recoveringFemales = animals.filter(
    (animal) =>
      animal.speciesId === speciesId &&
      animal.sex === "Female" &&
      animal.lifeStage === "adult" &&
      Number(save.femaleRecoveryUntil[animal.id] ?? 0) > now,
  );

  return (`,
      "breeding recovery list",
    );

    workspace = replaceOnce(
      workspace,
      `      <div className="mt-3 rounded-2xl border border-white/[.05] bg-white/[.018] px-4 py-3 text-[10px] leading-5 text-white/30">
        Anaconda Phase inheritance is currently a gameplay placeholder while the final project inheritance rules are being locked. Anaconda neonates are always generated green.
      </div>`,
      `      {recoveringFemales.length ? (
        <div className="mt-3 rounded-2xl border border-amber-200/10 bg-amber-200/[.025] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-[.14em] text-amber-100/45">Post-litter recovery</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recoveringFemales.map((female) => {
              const until = Number(save.femaleRecoveryUntil[female.id] ?? now);
              return (
                <span key={female.id} className="rounded-full border border-amber-200/10 bg-black/15 px-3 py-1.5 text-[10px] text-amber-50/55">
                  {female.name} · {remaining(until - now)}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      <div className="mt-3 rounded-2xl border border-white/[.05] bg-white/[.018] px-4 py-3 text-[10px] leading-5 text-white/30">
        Anaconda Phase inheritance is currently a gameplay placeholder while the final project inheritance rules are being locked. Anaconda neonates are always generated green.
      </div>`,
      "recovery status UI",
    );

    workspace = replaceOnce(
      workspace,
      `        {litters.slice(0, 8).map((litter) => {
          const offspring = save.animals.filter((animal) => litter.offspringIds.includes(animal.id));
          return (
            <div key={litter.id} className="rounded-[20px] border border-white/[.055] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/70">{offspring.length} offspring</div>
                <div className="text-[10px] text-white/28">{new Date(litter.bornAt).toLocaleDateString()}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {offspring.map((animal) => (
                  <span key={animal.id} className="rounded-full border border-white/[.05] bg-white/[.02] px-2 py-1 text-[9px] text-white/42">
                    {animal.sex} · {animal.neonateColor ?? "neo"}{animal.phase === "anaconda" ? " · Anaconda" : ""}
                  </span>
                ))}
              </div>
            </div>
          );
        })}`,
      `        {litters.slice(0, 8).map((litter) => {
          const currentOffspring = save.animals.filter((animal) => litter.offspringIds.includes(animal.id));
          const offspring = litter.offspringSnapshots?.length ? litter.offspringSnapshots : currentOffspring;
          const damName = litter.damSnapshot?.name ?? save.animals.find((animal) => animal.id === litter.damId)?.name ?? litter.damId;
          const sireName = litter.sireSnapshot?.name ?? save.animals.find((animal) => animal.id === litter.sireId)?.name ?? litter.sireId;
          return (
            <div key={litter.id} className="rounded-[20px] border border-white/[.055] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white/70">{offspring.length} offspring</div>
                <div className="text-[10px] text-white/28">{new Date(litter.bornAt).toLocaleDateString()}</div>
              </div>
              <div className="mt-2 text-[10px] text-white/32">Dam · {damName} &nbsp;×&nbsp; Sire · {sireName}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {offspring.map((animal) => (
                  <span key={animal.id} className="rounded-full border border-white/[.05] bg-white/[.02] px-2 py-1 text-[9px] text-white/42">
                    {animal.sex} · {animal.neonateColor ?? "neo"}{animal.phase === "anaconda" ? " · Anaconda" : ""}
                  </span>
                ))}
              </div>
              {currentOffspring.length < offspring.length ? (
                <div className="mt-3 text-[9px] leading-4 text-white/24">Historical litter record retained even when offspring or parents leave the collection.</div>
              ) : null}
            </div>
          );
        })}`,
      "durable litter history UI",
    );

    console.log("[emerald-recovery] Added post-litter recovery gates and durable lineage snapshots.");
  } else {
    console.log("[emerald-recovery] Workspace recovery model already applied.");
  }

  fs.writeFileSync(workspacePath, workspace);
}
