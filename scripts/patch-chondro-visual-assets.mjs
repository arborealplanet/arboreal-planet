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
if (!workspace.includes('import { ChondroBreederScreenArt } from "@/components/ChondroBreederScreenArt";')) {
  workspace = workspace.replace(
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\n',
    'import { ChondroClutchHistoryTable } from "@/components/ChondroClutchHistoryTable";\nimport { ChondroBreederScreenArt } from "@/components/ChondroBreederScreenArt";\n',
  );
}

const homeNeedle = '          <ChondroPatternBanner compact />\n';
const homeArt = `          <ChondroPatternBanner compact />\n\n          <section className="mt-4 overflow-hidden rounded-[30px] border border-emerald-300/12 bg-[#030806] shadow-[0_24px_70px_rgba(0,0,0,.28)]">\n            <div className="grid lg:grid-cols-[minmax(330px,46%)_1fr]">\n              <div className="grid min-h-[260px] grid-cols-2 gap-px bg-white/[.06] lg:min-h-[360px]">\n                <div className="relative overflow-hidden bg-black/35">\n                  <Image src="/hatchery/game/hatching.webp" alt="Illustrated green tree python hatchlings emerging" fill sizes="(max-width: 1024px) 50vw, 23vw" className="object-cover" priority />\n                </div>\n                <div className="relative overflow-hidden bg-black/35">\n                  <Image src="/hatchery/game/neonates.webp" alt="Illustrated red and yellow green tree python neonates" fill sizes="(max-width: 1024px) 50vw, 23vw" className="object-cover" priority />\n                </div>\n              </div>\n              <div className="relative flex items-center overflow-hidden p-5 sm:p-7 lg:p-9">\n                <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-300/[.06] blur-3xl" />\n                <div className="relative">\n                  <div className="text-[9px] font-black uppercase tracking-[.19em] text-emerald-200/55">Your program is alive</div>\n                  <h2 className="mt-3 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Breed, incubate, hatch and build a lineage.</h2>\n                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/48 sm:text-[15px]">The Chondro Breeder artwork is now part of the main experience instead of being hidden behind rare game states. Move between breeding, colony, clutch and store screens to see the program progress visually.</p>\n                  <div className="mt-5 h-px w-24 bg-gradient-to-r from-emerald-300/45 to-transparent" />\n                </div>\n              </div>\n            </div>\n          </section>\n`;
if (!workspace.includes('Your program is alive') && workspace.includes(homeNeedle)) {
  workspace = workspace.replace(homeNeedle, homeArt);
}

const headingNeedle = '      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />\n';
if (!workspace.includes('<ChondroBreederScreenArt screen={view} />') && workspace.includes(headingNeedle)) {
  workspace = workspace.replace(
    headingNeedle,
    `${headingNeedle}      {view === "breeding" || view === "colony" || view === "market" ? <ChondroBreederScreenArt screen={view} /> : null}\n`,
  );
}

const clutchNeedle = '      {view === "breeding" ? <ChondroBreedingFocusHeader /> : null}\n';
if (!workspace.includes('<ChondroClutchStageArt />') && workspace.includes(clutchNeedle)) {
  workspace = workspace.replace(
    clutchNeedle,
    `${clutchNeedle}      {view === "clutches" ? <ChondroClutchStageArt /> : null}\n`,
  );
}

const careerNeedle = '        {view === "career" ? <SecondaryScreen active={active} onBack={() => openView("home")}><ChondroBreederManagementView section="career" /></SecondaryScreen> : null}\n';
const careerArt = `        {view === "career" ? (\n          <SecondaryScreen active={active} onBack={() => openView("home")}>\n            <section className="mx-auto mb-6 max-w-7xl px-4 sm:px-6">\n              <div className="overflow-hidden rounded-[30px] border border-amber-200/12 bg-[#06100c] shadow-[0_24px_70px_rgba(0,0,0,.22)]">\n                <div className="grid lg:min-h-[300px] lg:grid-cols-[minmax(300px,42%)_1fr]">\n                  <div className="relative min-h-[250px] overflow-hidden border-b border-white/[.06] bg-black/35 lg:min-h-full lg:border-b-0 lg:border-r">\n                    <Image src="/hatchery/game/incubator.webp" alt="Illustrated Chondro Breeder incubator" fill sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />\n                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_52%,rgba(3,8,6,.64)_100%)] lg:bg-[linear-gradient(90deg,transparent_60%,rgba(6,16,12,.75)_100%)]" />\n                  </div>\n                  <div className="relative flex items-center overflow-hidden p-5 sm:p-7 lg:p-9">\n                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-200/[.055] blur-3xl" />\n                    <div className="relative">\n                      <div className="text-[9px] font-black uppercase tracking-[.19em] text-amber-100/55">Facility progression</div>\n                      <h2 className="mt-3 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">Build the operation behind the breeding program.</h2>\n                      <p className="mt-3 max-w-xl text-sm leading-6 text-white/48 sm:text-[15px]">Capacity, incubation and research upgrades now have a visual home alongside the career systems.</p>\n                    </div>\n                  </div>\n                </div>\n              </div>\n            </section>\n            <ChondroBreederManagementView section="career" />\n          </SecondaryScreen>\n        ) : null}\n`;
if (!workspace.includes('/hatchery/game/incubator.webp') && workspace.includes(careerNeedle)) {
  workspace = workspace.replace(careerNeedle, careerArt);
}

fs.writeFileSync(workspaceFile, workspace);

const hatcheryFile = "src/app/hatchery/page.tsx";
let hatchery = fs.readFileSync(hatcheryFile, "utf8");
const splashNeedle = '              <Image src="/branding/arboreal-arcade-splash.webp" alt="Arboreal Planet Arboreal Arcade" width={700} height={1244} sizes="(max-width: 1024px) 90vw, 384px" className="block h-auto w-full" />\n';
const splashReplacement = `              <Image src="/branding/arboreal-arcade-splash.webp" alt="Arboreal Planet Arboreal Arcade" width={700} height={1244} sizes="(max-width: 1024px) 90vw, 384px" className="block h-auto w-full" />\n              <div className="border-t border-white/[.06] bg-[#030806] p-3">\n                <div className="grid grid-cols-[96px_1fr] items-center gap-3 rounded-[18px] border border-emerald-300/10 bg-emerald-300/[.025] p-3">\n                  <Image src="/hatchery/game/hatching.webp" alt="Chondro Breeder illustrated hatching art" width={220} height={220} className="h-auto w-full rounded-[14px]" />\n                  <div>\n                    <div className="text-[9px] font-bold uppercase tracking-[.16em] text-emerald-200/50">Inside the game</div>\n                    <div className="mt-1 text-sm font-semibold text-white/72">Breeding, housing, clutches and the store now use Arboreal Planet game art.</div>\n                  </div>\n                </div>\n              </div>\n`;
if (!hatchery.includes('Breeding, housing, clutches and the store now use Arboreal Planet game art.') && hatchery.includes(splashNeedle)) {
  hatchery = hatchery.replace(splashNeedle, splashReplacement);
}
fs.writeFileSync(hatcheryFile, hatchery);

console.log("Applied approved Chondro visual assets across Home, Breed, Colony, Clutches, Store, Career, and the Arcade feature card.");
