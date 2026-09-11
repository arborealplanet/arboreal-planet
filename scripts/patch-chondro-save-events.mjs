import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

if (source.includes("const latestSaveRef = useRef<GameSave | null>(null);")) {
  console.log("Chondro Breeder save durability patch already applied.");
  process.exit(0);
}

function replaceOrThrow(label, needle, replacement) {
  if (!source.includes(needle)) throw new Error(`Could not locate ${label}.`);
  source = source.replace(needle, replacement);
}

replaceOrThrow(
  "React hook import",
  'import { createContext, useContext, useEffect, useMemo, useState } from "react";',
  'import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";',
);

replaceOrThrow(
  "game save timestamp field",
  `  breedingMessage?: string;\n  clutchEstablished?: boolean;\n};`,
  `  breedingMessage?: string;\n  clutchEstablished?: boolean;\n  updatedAt?: number;\n};`,
);

replaceOrThrow(
  "save refs",
  `  const [cloudSave, setCloudSave] = useState(false);\n  const [now, setNow] = useState(Date.now());`,
  `  const [cloudSave, setCloudSave] = useState(false);\n  const [now, setNow] = useState(Date.now());\n  const latestSaveRef = useRef<GameSave | null>(null);\n  const cloudSaveRef = useRef(false);`,
);

replaceOrThrow(
  "newest-save selection",
  `          if (data.authenticated) setCloudSave(true);\n          if (isGameSave(data.save?.state)) chosen = data.save.state;`,
  `          if (data.authenticated) setCloudSave(true);\n          if (isGameSave(data.save?.state)) {\n            const cloud = data.save.state;\n            const localUpdatedAt = Number(local?.updatedAt ?? 0);\n            const cloudUpdatedAt = Number(cloud.updatedAt ?? 0);\n            if (!local || cloudUpdatedAt >= localUpdatedAt) chosen = cloud;\n          }`,
);

const oldSaveEffect = `  useEffect(() => {\n    if (!hydrated) return;\n    const save: GameSave = {\n      started,\n      cash,\n      colony,\n      tested,\n      damId,\n      sireId,\n      clutch,\n      clutchHistory,\n      holdbacks,\n      season,\n      sales,\n      transfers,\n      enclosures,\n      purchasedStoreIds,\n      careerReputation,\n      facilityRooms,\n      facilityConstruction,\n      breedingCycle,\n      geneticTestsPending,\n      femaleRecovery,\n      seasonCarePaid,\n      breedingMessage,\n      clutchEstablished,\n    };\n    const timer = window.setTimeout(() => {\n      try {\n        window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(save));\n      } catch {}\n      if (cloudSave)\n        void fetch(\"/api/hatchery/chondro-breeder/save\", {\n          method: \"PUT\",\n          headers: { \"Content-Type\": \"application/json\" },\n          body: JSON.stringify(save),\n        });\n    }, 650);\n    return () => window.clearTimeout(timer);\n  }, [hydrated, cloudSave, started, cash, colony, tested, damId, sireId, clutch, clutchHistory, holdbacks, season, sales, transfers, enclosures, purchasedStoreIds, careerReputation, facilityRooms, facilityConstruction, breedingCycle, geneticTestsPending, femaleRecovery, seasonCarePaid, breedingMessage, clutchEstablished]);`;

const newSaveEffect = `  useEffect(() => {\n    cloudSaveRef.current = cloudSave;\n  }, [cloudSave]);\n\n  useEffect(() => {\n    if (!hydrated) return;\n    const save: GameSave = {\n      started,\n      cash,\n      colony,\n      tested,\n      damId,\n      sireId,\n      clutch,\n      clutchHistory,\n      holdbacks,\n      season,\n      sales,\n      transfers,\n      enclosures,\n      purchasedStoreIds,\n      careerReputation,\n      facilityRooms,\n      facilityConstruction,\n      breedingCycle,\n      geneticTestsPending,\n      femaleRecovery,\n      seasonCarePaid,\n      breedingMessage,\n      clutchEstablished,\n      updatedAt: Date.now(),\n    };\n    latestSaveRef.current = save;\n    try {\n      window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(save));\n      window.dispatchEvent(new Event(\"arboreal-chondro-breeder-save-change\"));\n    } catch {}\n    if (!cloudSave) return;\n    const timer = window.setTimeout(() => {\n      void fetch(\"/api/hatchery/chondro-breeder/save\", {\n        method: \"PUT\",\n        headers: { \"Content-Type\": \"application/json\" },\n        body: JSON.stringify(save),\n      }).catch(() => undefined);\n    }, 650);\n    return () => window.clearTimeout(timer);\n  }, [hydrated, cloudSave, started, cash, colony, tested, damId, sireId, clutch, clutchHistory, holdbacks, season, sales, transfers, enclosures, purchasedStoreIds, careerReputation, facilityRooms, facilityConstruction, breedingCycle, geneticTestsPending, femaleRecovery, seasonCarePaid, breedingMessage, clutchEstablished]);\n\n  useEffect(() => {\n    const flushLatestSave = () => {\n      const save = latestSaveRef.current;\n      if (!save) return;\n      try {\n        window.localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(save));\n      } catch {}\n      if (cloudSaveRef.current) {\n        void fetch(\"/api/hatchery/chondro-breeder/save\", {\n          method: \"PUT\",\n          headers: { \"Content-Type\": \"application/json\" },\n          body: JSON.stringify(save),\n          keepalive: true,\n        }).catch(() => undefined);\n      }\n    };\n    window.addEventListener(\"pagehide\", flushLatestSave);\n    return () => {\n      window.removeEventListener(\"pagehide\", flushLatestSave);\n      flushLatestSave();\n    };\n  }, []);`;

replaceOrThrow("save persistence effect", oldSaveEffect, newSaveEffect);

fs.writeFileSync(file, source);
console.log("Applied durable Chondro Breeder local/cloud save persistence.");
