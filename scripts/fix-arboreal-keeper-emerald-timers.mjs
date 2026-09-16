import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const enginePath = path.join(root, "src/lib/arboreal-keeper-emerald-engine.ts");
const workspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[emerald-timers] Expected fragment not found: ${before.slice(0, 100)}`);
    return source;
  }
  return source.replace(before, after);
}

if (fs.existsSync(enginePath)) {
  let source = fs.readFileSync(enginePath, "utf8");

  source = replaceOnce(
    source,
    '    const lifeStage: KeeperLifeStage = random() < 0.68 ? "adult" : "subadult";\n    const phase = marketPhase(speciesId, random);\n    const neonateColor = null;',
    '    const stageRoll = random();\n    const lifeStage: KeeperLifeStage = stageRoll < 0.18 ? "neonate" : stageRoll < 0.70 ? "adult" : "subadult";\n    const phase = marketPhase(speciesId, random);\n    const neonateColor = lifeStage === "neonate" ? randomNeonateColor(speciesId, phase, random) : null;',
  );

  source = replaceOnce(
    source,
    '  return {\n    completed: false as const,\n    job: {\n      ...job,\n      stage: next.id,\n      startedAt: now,\n      completesAt: now + next.durationMs,\n    },\n  };',
    '  const nextStartedAt = job.completesAt;\n  return {\n    completed: false as const,\n    job: {\n      ...job,\n      stage: next.id,\n      startedAt: nextStartedAt,\n      completesAt: nextStartedAt + next.durationMs,\n    },\n  };',
  );

  fs.writeFileSync(enginePath, source);
  console.log("[emerald-timers] Emerald market now includes neonates and breeding stages catch up after offline time.");
}

if (fs.existsSync(workspacePath)) {
  let source = fs.readFileSync(workspacePath, "utf8");

  source = replaceOnce(
    source,
    '      if (availableUnits.length < offspring.length) {\n        // Birth remains ready until each neonate has an individual enclosure.\n        job = original;\n        break;\n      }',
    '      if (availableUnits.length < offspring.length) {\n        // Birth remains ready until each neonate has an individual enclosure. Keep the cycle at birth rather than rewinding earlier offline progress.\n        break;\n      }',
  );

  fs.writeFileSync(workspacePath, source);
  console.log("[emerald-timers] Birth-ready litters no longer rewind when housing is short.");
}
