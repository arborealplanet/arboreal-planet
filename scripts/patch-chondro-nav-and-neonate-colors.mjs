import fs from "node:fs";

const shopFile = "src/components/ChondroBreederExpandedShop.tsx";
let shop = fs.readFileSync(shopFile, "utf8");
shop = shop.replace(
  '  const neonateColor: "Red" | "Yellow" = random() < 0.4 ? "Red" : "Yellow";',
  '  const neonateColor: "Red" | "Yellow" = subspecies === "Morelia viridis" ? "Yellow" : random() < 0.4 ? "Red" : "Yellow";',
);
fs.writeFileSync(shopFile, shop);

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
  '<span className={`grid h-9 w-9 place-items-center rounded-xl transition sm:h-10 sm:w-10 ${selected ? "bg-emerald-300/[.13] text-emerald-200" : "bg-white/[.025]"}`}><ChondroBreederNavIcon id={id as "home" | "breeding" | "colony" | "clutches" | "market"} className="h-[19px] w-[19px] sm:h-5 sm:w-5" /></span>',
);
workspace = workspace.replace(
  'className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1 text-[8px] font-bold uppercase tracking-[.025em] transition sm:text-[9px]',
  'className={`flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-1 text-[8px] font-bold uppercase tracking-[.015em] transition sm:text-[9px]',
);
workspace = workspace.replace(
  'grid h-[calc(80px+env(safe-area-inset-bottom))] grid-cols-5 gap-1',
  'grid h-[calc(84px+env(safe-area-inset-bottom))] grid-cols-5 gap-1.5',
);
workspace = workspace.replace(
  'lg:h-[78px] lg:max-w-[760px]',
  'lg:h-[82px] lg:max-w-[780px]',
);
fs.writeFileSync(workspaceFile, workspace);

console.log("Enforced yellow-only Morelia viridis neonates and added dedicated breeder navigation icons.");
