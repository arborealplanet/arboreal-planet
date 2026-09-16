import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const workspacePath = path.join(root, "src/components/ChondroBreederWorkspace.tsx");
const emeraldWorkspacePath = path.join(root, "src/components/ArborealKeeperEmeraldWorkspace.tsx");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[arboreal-cloud] Expected fragment not found: ${before.slice(0, 100)}`);
    return source;
  }
  return source.replace(before, after);
}

if (fs.existsSync(workspacePath)) {
  let source = fs.readFileSync(workspacePath, "utf8");

  source = replaceOnce(
    source,
    'import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";',
    'import { ArborealKeeperEmeraldWorkspace } from "@/components/ArborealKeeperEmeraldWorkspace";\nimport { ArborealKeeperEmeraldCloudSync } from "@/components/ArborealKeeperEmeraldCloudSync";',
  );

  source = replaceOnce(
    source,
    '      <ChondroGameNotifications />',
    '      <ArborealKeeperEmeraldCloudSync />\n      <ChondroGameNotifications />',
  );

  fs.writeFileSync(workspacePath, source);
  console.log("[arboreal-cloud] Mounted Emerald cloud synchronization.");
}

if (fs.existsSync(emeraldWorkspacePath)) {
  let source = fs.readFileSync(emeraldWorkspacePath, "utf8");

  source = replaceOnce(
    source,
    '  useEffect(() => {\n    if (!hydrated) return;\n    window.localStorage.setItem(\n      EMERALD_KEEPER_SAVE_KEY,\n      JSON.stringify({ ...save, updatedAt: Date.now() }),\n    );\n  }, [hydrated, save]);',
    '  useEffect(() => {\n    if (!hydrated) return;\n    const snapshot = { ...save, updatedAt: Date.now() };\n    window.localStorage.setItem(EMERALD_KEEPER_SAVE_KEY, JSON.stringify(snapshot));\n    window.dispatchEvent(\n      new CustomEvent("arboreal-keeper-emerald-save-updated", { detail: { save: snapshot } }),\n    );\n  }, [hydrated, save]);\n\n  useEffect(() => {\n    function handleCloudLoaded(event: Event) {\n      const detail = (event as CustomEvent<{ save?: unknown }>).detail;\n      if (!detail?.save) return;\n      setSave(sanitizeEmeraldKeeperSave(detail.save));\n    }\n    window.addEventListener("arboreal-keeper-emerald-cloud-loaded", handleCloudLoaded);\n    return () => window.removeEventListener("arboreal-keeper-emerald-cloud-loaded", handleCloudLoaded);\n  }, []);',
  );

  fs.writeFileSync(emeraldWorkspacePath, source);
  console.log("[arboreal-cloud] Connected Emerald local save updates to cloud sync.");
}
