import fs from "node:fs";
import path from "node:path";

const workspacePath = path.join(process.cwd(), "src/components/ChondroBreederWorkspace.tsx");

function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) {
    console.warn(`[keeper-programs] Expected fragment not found: ${before.slice(0, 100)}`);
    return source;
  }
  return source.replace(before, after);
}

if (!fs.existsSync(workspacePath)) {
  console.warn("[keeper-programs] Workspace source not found; skipping program switcher.");
  process.exit(0);
}

let source = fs.readFileSync(workspacePath, "utf8");

source = replaceOnce(
  source,
  '  const active = config[view];\n\n  return (',
  '  const active = config[view];\n  const [activeProgram, setActiveProgram] = useState<"gtp" | "emerald">("gtp");\n\n  return (',
);

source = replaceOnce(
  source,
  '      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />\n      <ArborealKeeperEmeraldWorkspace mode={view} />',
  `      <ScreenHeading eyebrow={active.eyebrow} title={active.title} detail={active.detail} />
      <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
        <div className="grid gap-2 rounded-[24px] border border-white/[.06] bg-[#05100b] p-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveProgram("gtp")}
            aria-pressed={activeProgram === "gtp"}
            className={\`rounded-[18px] border px-4 py-3 text-left transition \${activeProgram === "gtp" ? "border-emerald-300/18 bg-emerald-300/[.075]" : "border-transparent bg-black/15 hover:bg-white/[.025]"}\`}
          >
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-200/40">Species program</div>
            <div className="mt-1 text-sm font-semibold text-white/78">Green Tree Pythons</div>
            <div className="mt-1 text-[10px] text-white/30">Morelia locality, phenotype and egg-laying program</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveProgram("emerald")}
            aria-pressed={activeProgram === "emerald"}
            className={\`rounded-[18px] border px-4 py-3 text-left transition \${activeProgram === "emerald" ? "border-emerald-300/18 bg-emerald-300/[.075]" : "border-transparent bg-black/15 hover:bg-white/[.025]"}\`}
          >
            <div className="text-[9px] font-black uppercase tracking-[.15em] text-emerald-200/40">Species program</div>
            <div className="mt-1 text-sm font-semibold text-white/78">Emerald Tree Boas</div>
            <div className="mt-1 text-[10px] text-white/30">Northern + Amazon Basin live-bearing programs</div>
          </button>
        </div>
      </div>
      {activeProgram === "emerald" ? <ArborealKeeperEmeraldWorkspace mode={view} /> : null}`,
);

source = replaceOnce(
  source,
  '      {view === "breeding" || view === "colony" || view === "market" ? <ChondroBreederScreenArt screen={view} /> : null}',
  '      <div className={activeProgram === "gtp" ? "" : "hidden"} aria-hidden={activeProgram !== "gtp"}>\n        {view === "breeding" || view === "colony" || view === "market" ? <ChondroBreederScreenArt screen={view} /> : null}',
);

source = replaceOnce(
  source,
  '      {view === "clutches" ? <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div></section> : null}\n    </>',
  '      {view === "clutches" ? <section className="mx-auto max-w-7xl px-5 pt-5 sm:px-6"><div className="panel rounded-[28px] p-4 sm:p-5"><ChondroClutchHistoryTable /></div></section> : null}\n      </div>\n    </>',
);

fs.writeFileSync(workspacePath, source);
console.log("[keeper-programs] Added Green Tree Python / Emerald Tree Boa program switching to core game screens.");
