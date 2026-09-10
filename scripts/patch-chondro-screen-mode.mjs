import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

if (source.includes("BreederGameScreenContext")) {
  console.log("Chondro Breeder screen mode already applied.");
  process.exit(0);
}

source = source.replace(
  'import { useEffect, useMemo, useState } from "react";',
  'import { createContext, useContext, useEffect, useMemo, useState } from "react";',
);

source = source.replace(
  'function CollapsibleGameSection({\n',
  'type BreederGameScreen = "all" | "breeding" | "colony" | "clutches" | "market";\n\nconst BreederGameScreenContext = createContext<BreederGameScreen>("all");\n\nfunction sectionScreen(label: string): BreederGameScreen | "shared" {\n  const value = label.toLowerCase();\n  if (value.includes("daily snake store") || value.includes("player market") || value.includes("market")) return "market";\n  if (value.includes("active clutch") || value.includes("clutch")) return "clutches";\n  if (value.includes("breeding room") || value.includes("pairing")) return "breeding";\n  if (value.includes("your colony") || value.includes("enclosures") || value.includes("genetics & locality")) return "colony";\n  return "shared";\n}\n\nfunction CollapsibleGameSection({\n',
);

source = source.replace(
  '  const [isOpen, setIsOpen] = useState(defaultOpen);\n  return (\n',
  '  const [isOpen, setIsOpen] = useState(defaultOpen);\n  const activeScreen = useContext(BreederGameScreenContext);\n  const targetScreen = sectionScreen(label);\n  if (activeScreen !== "all" && targetScreen !== "shared" && targetScreen !== activeScreen) return null;\n  return (\n',
);

source = source.replace(
  'export function ChondroBreederGameV3() {',
  'export function ChondroBreederGameV3({ screen = "all" }: { screen?: BreederGameScreen } = {}) {',
);

const finalReturn = '  return (\n    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6">';
if (!source.includes(finalReturn)) {
  throw new Error("Could not locate ChondroBreederGameV3 final return.");
}
source = source.replace(
  finalReturn,
  '  return (\n    <BreederGameScreenContext.Provider value={screen}>\n    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 sm:py-8">',
);

const closingNeedle = '\n    </div>\n  );\n}\n';
const lastClosing = source.lastIndexOf(closingNeedle);
if (lastClosing === -1) throw new Error("Could not locate ChondroBreederGameV3 closing wrapper.");
source = source.slice(0, lastClosing) + '\n    </div>\n    </BreederGameScreenContext.Provider>\n  );\n}\n' + source.slice(lastClosing + closingNeedle.length);

fs.writeFileSync(file, source);
console.log("Applied focused Chondro Breeder core-game screen modes.");
