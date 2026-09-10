import fs from "node:fs";

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");

if (!workspace.includes('import Image from "next/image";')) {
  workspace = workspace.replace('import Link from "next/link";\n', 'import Link from "next/link";\nimport Image from "next/image";\n');
}
if (!workspace.includes('import { ChondroClutchStageArt } from "@/components/ChondroClutchStageArt";')) {
  workspace = workspace.replace(
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\n',
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\nimport { ChondroClutchStageArt } from "@/components/ChondroClutchStageArt";\n',
  );
}

const homeNeedle = '          <ChondroPatternBanner compact />\n';
const homeArt = `          <ChondroPatternBanner compact />\n\n          <section className="mt-4 overflow-hidden rounded-[24px] border border-emerald-300/10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.09),transparent_44%),#030806]">\n            <div className="grid items-center gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-5">\n              <div className="mx-auto overflow-hidden rounded-[20px] border border-white/[.07] bg-black/30 shadow-[0_18px_44px_rgba(0,0,0,.28)]">\n                <Image src="/hatchery/game/fresh-eggs.webp" alt="Illustrated green tree python clutch in the Arboreal Planet style" width={220} height={220} className="h-auto w-full" priority />\n              </div>\n              <div>\n                <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/50">Your program is alive</div>\n                <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white sm:text-2xl">Breed, incubate, hatch and build a lineage.</h2>\n                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/44">The breeder now uses the same illustrated visual language as Arboreal Planet instead of relying on status panels alone.</p>\n              </div>\n            </div>\n          </section>\n`;
if (!workspace.includes('/hatchery/game/fresh-eggs.webp') && workspace.includes(homeNeedle)) {
  workspace = workspace.replace(homeNeedle, homeArt);
}

const clutchNeedle = '      {view === "breeding" ? <ChondroBreedingFocusHeader /> : null}\n';
if (!workspace.includes('<ChondroClutchStageArt />') && workspace.includes(clutchNeedle)) {
  workspace = workspace.replace(
    clutchNeedle,
    `${clutchNeedle}      {view === "clutches" ? <ChondroClutchStageArt /> : null}\n`,
  );
}

const careerNeedle = '        {view === "career" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroBreederManagementView section="career" /></SecondaryScreen> : null}\n';
const careerArt = `        {view === "career" ? (\n          <SecondaryScreen active={active} onBack={() => openView("home")}>\n            <section className="mx-auto mb-5 max-w-7xl px-4 sm:px-6">\n              <div className="overflow-hidden rounded-[26px] border border-amber-200/10 bg-[radial-gradient(circle_at_left,rgba(251,191,36,.08),transparent_36%),#06100c]">\n                <div className="grid items-center gap-4 p-4 sm:grid-cols-[170px_1fr] sm:p-5">\n                  <div className="mx-auto overflow-hidden rounded-[20px] border border-white/[.07] bg-black/30">\n                    <Image src="/hatchery/game/incubator.webp" alt="Illustrated Chondro Breeder incubator" width={560} height={560} className="h-auto w-full" />\n                  </div>\n                  <div>\n                    <div className="text-[9px] font-black uppercase tracking-[.17em] text-amber-100/50">Facility progression</div>\n                    <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white">Build the operation behind the breeding program.</h2>\n                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">Capacity, incubation and research upgrades now have a visual home alongside the career systems.</p>\n                  </div>\n                </div>\n              </div>\n            </section>\n            <ChondroBreederManagementView section="career" />\n          </SecondaryScreen>\n        ) : null}\n`;
if (!workspace.includes('/hatchery/game/incubator.webp') && workspace.includes(careerNeedle)) {
  workspace = workspace.replace(careerNeedle, careerArt);
}

fs.writeFileSync(workspaceFile, workspace);

const hatcheryFile = "src/app/hatchery/page.tsx";
let hatchery = fs.readFileSync(hatcheryFile, "utf8");
const splashNeedle = '              <Image src="/branding/arboreal-arcade-splash.webp" alt="Arboreal Planet Arboreal Arcade" width={700} height={1244} sizes="(max-width: 1024px) 90vw, 384px" className="block h-auto w-full" />\n';
const splashReplacement = `              <Image src="/branding/arboreal-arcade-splash.webp" alt="Arboreal Planet Arboreal Arcade" width={700} height={1244} sizes="(max-width: 1024px) 90vw, 384px" className="block h-auto w-full" />\n              <div className="border-t border-white/[.06] bg-[#030806] p-3">\n                <div className="grid grid-cols-[88px_1fr] items-center gap-3 rounded-[18px] border border-emerald-300/10 bg-emerald-300/[.025] p-3">\n                  <Image src="/hatchery/game/fresh-eggs.webp" alt="Chondro Breeder illustrated clutch art" width={220} height={220} className="h-auto w-full rounded-[14px]" />\n                  <div>\n                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-emerald-200/50">Inside the game</div>\n                    <div className="mt-1 text-sm font-semibold text-white/72">Clutches now use Arboreal Planet game art.</div>\n                  </div>\n                </div>\n              </div>\n`;
if (!hatchery.includes('Clutches now use Arboreal Planet game art.') && hatchery.includes(splashNeedle)) {
  hatchery = hatchery.replace(splashNeedle, splashReplacement);
}
fs.writeFileSync(hatcheryFile, hatchery);

console.log("Applied approved Chondro visual assets to breeder Home, state-aware Clutches, Career, and the Arcade feature card.");
