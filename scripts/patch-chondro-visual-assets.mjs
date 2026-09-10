import fs from "node:fs";

const workspaceFile = "src/components/ChondroBreederWorkspace.tsx";
let workspace = fs.readFileSync(workspaceFile, "utf8");

if (!workspace.includes('import Image from "next/image";')) {
  workspace = workspace.replace('import Link from "next/link";\n', 'import Link from "next/link";\nimport Image from "next/image";\n');
}

const homeNeedle = '          <ChondroPatternBanner compact />\n';
const homeArt = `          <ChondroPatternBanner compact />\n\n          <section className="mt-4 overflow-hidden rounded-[24px] border border-emerald-300/10 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.09),transparent_44%),#030806]">\n            <div className="grid items-center gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-5">\n              <div className="mx-auto overflow-hidden rounded-[20px] border border-white/[.07] bg-black/30 shadow-[0_18px_44px_rgba(0,0,0,.28)]">\n                <Image src="/hatchery/game/fresh-eggs.webp" alt="Illustrated green tree python clutch in the Arboreal Planet style" width={220} height={220} className="h-auto w-full" priority />\n              </div>\n              <div>\n                <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/50">Your program is alive</div>\n                <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white sm:text-2xl">Breed, incubate, hatch and build a lineage.</h2>\n                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/44">Game art now follows the same illustrated visual language as Arboreal Planet instead of relying on plain status panels alone.</p>\n              </div>\n            </div>\n          </section>\n`;
if (!workspace.includes('/hatchery/game/fresh-eggs.webp') && workspace.includes(homeNeedle)) {
  workspace = workspace.replace(homeNeedle, homeArt);
}

const clutchNeedle = '      {view === "breeding" ? <ChondroBreedingFocusHeader /> : null}\n';
const clutchArt = `      {view === "breeding" ? <ChondroBreedingFocusHeader /> : null}\n      {view === "clutches" ? (\n        <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">\n          <div className="overflow-hidden rounded-[26px] border border-emerald-300/10 bg-[linear-gradient(135deg,rgba(16,185,129,.08),rgba(0,0,0,.18))]">\n            <div className="grid items-center gap-4 p-4 sm:grid-cols-[170px_1fr] sm:p-5">\n              <div className="mx-auto overflow-hidden rounded-[20px] border border-white/[.07] bg-black/30">\n                <Image src="/hatchery/game/fresh-eggs.webp" alt="Fresh green tree python clutch illustration" width={220} height={220} className="h-auto w-full" />\n              </div>\n              <div>\n                <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/48">Clutch room</div>\n                <h2 className="mt-2 text-xl font-semibold tracking-[-.03em] text-white">Follow the clutch from laying through establishment.</h2>\n                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">The visual clutch system will change with the active reproductive stage as the approved art library is added.</p>\n              </div>\n            </div>\n          </div>\n        </section>\n      ) : null}\n`;
if (!workspace.includes('Clutch room') && workspace.includes(clutchNeedle)) {
  workspace = workspace.replace(clutchNeedle, clutchArt);
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

console.log("Applied approved Chondro visual assets to breeder Home, Clutches, and the Arcade feature card.");
