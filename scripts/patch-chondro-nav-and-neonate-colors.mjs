import fs from "node:fs";

const shopFile = "src/components/ChondroBreederExpandedShop.tsx";
let shop = fs.readFileSync(shopFile, "utf8");
shop = shop.replace(
  '  const neonateColor: "Red" | "Yellow" = random() < 0.4 ? "Red" : "Yellow";',
  '  const neonateColor: "Red" | "Yellow" = subspecies === "Morelia viridis" ? "Yellow" : random() < 0.4 ? "Red" : "Yellow";',
);
fs.writeFileSync(shopFile, shop);

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");
game = game.replace(
  '    neonateColor: raw.classification === "Pure"\n      ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)\n      : raw.neonateColor,',
  '    neonateColor: subspecies === "Morelia viridis" || locality === "Aru" || locality === "Merauke"\n      ? "Yellow"\n      : raw.classification === "Pure"\n        ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)\n        : raw.neonateColor,',
);
fs.writeFileSync(gameFile, game);

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");
if (!workspace.includes('import { ChondroBreederNavIcon } from "@/components/ChondroBreederNavIcon";')) {
  workspace = workspace.replace(
    'import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";\n',
    'import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";\nimport { ChondroBreederNavIcon } from "@/components/ChondroBreederNavIcon";\n',
  );
}
workspace = workspace.replace(
  '<span className={`grid h-8 w-8 place-items-center rounded-xl text-[15px] transition sm:h-9 sm:w-9 sm:text-base ${selected ? "bg-emerald-300/[.13] text-emerald-200" : "bg-white/[.025]"}`}>{item.icon}</span>',
  '<span className={`grid h-10 w-10 place-items-center rounded-2xl transition sm:h-11 sm:w-11 ${selected ? "bg-emerald-300/[.15] text-emerald-100 shadow-[0_0_22px_rgba(110,231,183,.12)]" : "bg-white/[.025] text-white/42"}`}><ChondroBreederNavIcon id={id as "home" | "breeding" | "colony" | "clutches" | "market"} className="h-[23px] w-[23px] sm:h-6 sm:w-6" /></span>',
);
workspace = workspace.replace(
  '<span className={`grid h-9 w-9 place-items-center rounded-xl transition sm:h-10 sm:w-10 ${selected ? "bg-emerald-300/[.13] text-emerald-200" : "bg-white/[.025]"}`}><ChondroBreederNavIcon id={id as "home" | "breeding" | "colony" | "clutches" | "market"} className="h-[19px] w-[19px] sm:h-5 sm:w-5" /></span>',
  '<span className={`grid h-10 w-10 place-items-center rounded-2xl transition sm:h-11 sm:w-11 ${selected ? "bg-emerald-300/[.15] text-emerald-100 shadow-[0_0_22px_rgba(110,231,183,.12)]" : "bg-white/[.025] text-white/42"}`}><ChondroBreederNavIcon id={id as "home" | "breeding" | "colony" | "clutches" | "market"} className="h-[23px] w-[23px] sm:h-6 sm:w-6" /></span>',
);
workspace = workspace.replace(
  'grid h-[calc(80px+env(safe-area-inset-bottom))] grid-cols-5 gap-1',
  'grid h-[calc(88px+env(safe-area-inset-bottom))] grid-cols-5 gap-1.5',
);
workspace = workspace.replace(
  'grid h-[calc(84px+env(safe-area-inset-bottom))] grid-cols-5 gap-1.5',
  'grid h-[calc(88px+env(safe-area-inset-bottom))] grid-cols-5 gap-1.5',
);
workspace = workspace.replace(
  'lg:h-[78px] lg:max-w-[720px]',
  'lg:h-[86px] lg:max-w-[800px]',
);
workspace = workspace.replace(
  'lg:h-[82px] lg:max-w-[780px]',
  'lg:h-[86px] lg:max-w-[800px]',
);
fs.writeFileSync(workspaceFile, workspace);

console.log("Enforced yellow-only M. viridis records and upgraded breeder navigation icon presentation.");
