import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "src/components/ChondroBreederWorkspace.tsx");
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, "utf8");
const before = source;

source = source.replace('import { ChondroBreederNavIcon } from "@/components/ChondroBreederNavIcon";\n', "");

if (!source.includes("const dockIconByView")) {
  source = source.replace(
    'const dockViews: WorkspaceView[] = ["home", "breeding", "colony", "clutches", "market"];\n',
    'const dockViews = ["home", "breeding", "colony", "clutches", "market"] as const;\nconst dockIconByView: Record<(typeof dockViews)[number], string> = {\n  home: "/hatchery/game/dock/home.webp",\n  breeding: "/hatchery/game/dock/breed.webp",\n  colony: "/hatchery/game/dock/animals.webp",\n  clutches: "/hatchery/game/dock/offspring.webp",\n  market: "/hatchery/game/dock/store.webp",\n};\n',
  );
}

source = source.replace(
  'className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-1 text-[8px] font-bold uppercase tracking-[.025em] transition sm:text-[9px] ${selected ? "bg-emerald-300/[.09] text-emerald-100" : "text-white/38 hover:bg-white/[.035] hover:text-white/68"}`}',
  'aria-label={item.navLabel ?? item.label}\n              title={item.navLabel ?? item.label}\n              className={`group flex min-w-0 items-center justify-center rounded-2xl p-0.5 transition ${selected ? "bg-emerald-300/[.09] shadow-[0_0_24px_rgba(110,231,183,.10)]" : "hover:bg-white/[.035]"}`}',
);

const oldInner = `              <span className={\`grid h-10 w-10 place-items-center rounded-2xl transition sm:h-11 sm:w-11 \${selected ? "bg-emerald-300/[.15] text-emerald-100 shadow-[0_0_22px_rgba(110,231,183,.12)]" : "bg-white/[.025] text-white/42"}\`}>
                <ChondroBreederNavIcon id={id as "home" | "breeding" | "colony" | "clutches" | "market"} className="h-[23px] w-[23px] sm:h-6 sm:w-6" />
              </span>
              <span className="max-w-full truncate leading-none">{item.navLabel ?? item.label}</span>`;

const newInner = `              <span className={\`relative block h-[68px] w-[68px] overflow-hidden rounded-[20px] border transition sm:h-[74px] sm:w-[74px] \${selected ? "scale-[1.035] border-emerald-200/45 shadow-[0_0_28px_rgba(110,231,183,.20)]" : "border-white/[.07] opacity-84 group-hover:opacity-100"}\`}>
                <Image
                  src={dockIconByView[id]}
                  alt=""
                  fill
                  sizes="74px"
                  className="object-cover"
                />
              </span>`;

if (source.includes(oldInner)) {
  source = source.replace(oldInner, newInner);
}

source = source
  .replace('h-[58px] w-[58px]', 'h-[68px] w-[68px]')
  .replace('sm:h-[64px] sm:w-[64px]', 'sm:h-[74px] sm:w-[74px]')
  .replace('sizes="64px"', 'sizes="74px"')
  .replace('rounded-[18px]', 'rounded-[20px]')
  .replace('p-1 transition ${selected ?', 'p-0.5 transition ${selected ?');

source = source.replace(
  'className="fixed inset-x-0 bottom-0 z-[80] mx-auto grid h-[calc(88px+env(safe-area-inset-bottom))] grid-cols-5 gap-1.5 border-t border-white/[.08] bg-[#030806]/97 px-2.5 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl sm:px-4 lg:bottom-4 lg:h-[86px] lg:max-w-[800px] lg:rounded-[24px] lg:border lg:px-4 lg:pb-2"',
  'className="fixed inset-x-0 bottom-0 z-[80] mx-auto grid h-[calc(94px+env(safe-area-inset-bottom))] grid-cols-5 gap-1 border-t border-white/[.08] bg-[#030806]/97 px-1.5 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl sm:px-3 lg:bottom-4 lg:h-[94px] lg:max-w-[800px] lg:rounded-[24px] lg:border lg:px-3 lg:pb-2"',
);
source = source.replace(
  'className="fixed inset-x-0 bottom-0 z-[80] mx-auto grid h-[calc(82px+env(safe-area-inset-bottom))] grid-cols-5 gap-1.5 border-t border-white/[.08] bg-[#030806]/97 px-2.5 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl sm:px-4 lg:bottom-4 lg:h-[82px] lg:max-w-[800px] lg:rounded-[24px] lg:border lg:px-4 lg:pb-2"',
  'className="fixed inset-x-0 bottom-0 z-[80] mx-auto grid h-[calc(94px+env(safe-area-inset-bottom))] grid-cols-5 gap-1 border-t border-white/[.08] bg-[#030806]/97 px-1.5 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-18px_50px_rgba(0,0,0,.34)] backdrop-blur-xl sm:px-3 lg:bottom-4 lg:h-[94px] lg:max-w-[800px] lg:rounded-[24px] lg:border lg:px-3 lg:pb-2"',
);

if (source !== before) {
  fs.writeFileSync(file, source);
  console.log("[keeper-dock] Replaced bottom navigation symbols and labels with larger custom image icons.");
} else {
  console.log("[keeper-dock] Larger custom bottom navigation icons already applied.");
}
