import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

if (!source.includes("BreederGameScreenContext")) {
  source = source.replace(
    'import { useEffect, useMemo, useState } from "react";',
    'import { createContext, useContext, useEffect, useMemo, useState } from "react";',
  );

  source = source.replace(
    'function CollapsibleGameSection({\n',
    'type BreederGameScreen = "all" | "breeding" | "colony" | "clutches" | "market";\n\nconst BreederGameScreenContext = createContext<BreederGameScreen>("all");\n\nfunction sectionScreen(label: string): BreederGameScreen | "shared" {\n  const value = label.toLowerCase();\n  if (value.includes("daily snake store") || value.includes("player market") || value.includes("market")) return "market";\n  if (value.includes("active clutch") || value.includes("clutch") || value.includes("program records")) return "clutches";\n  if (value.includes("breeding room") || value.includes("pairing")) return "breeding";\n  if (value.includes("your colony") || value.includes("enclosures") || value.includes("genetics & locality")) return "colony";\n  return "shared";\n}\n\nfunction hideLegacySectionForFocusedScreen(activeScreen: BreederGameScreen, label: string) {\n  const value = label.toLowerCase();\n  if (activeScreen !== "all" && value.includes("activity")) return true;\n  if (activeScreen === "colony" && (value.includes("your colony") || value.includes("genetics & locality"))) return true;\n  if (activeScreen === "clutches" && (value.includes("program records") || value.includes("active clutch"))) return true;\n  if (activeScreen === "market" && (value.includes("daily snake store") || value.includes("player snake market"))) return true;\n  return false;\n}\n\nfunction CollapsibleGameSection({\n',
  );

  source = source.replace(
    '  const [isOpen, setIsOpen] = useState(defaultOpen);\n  return (\n',
    '  const [isOpen, setIsOpen] = useState(defaultOpen);\n  const activeScreen = useContext(BreederGameScreenContext);\n  const targetScreen = sectionScreen(label);\n  if (activeScreen !== "all" && targetScreen !== "shared" && targetScreen !== activeScreen) return null;\n  if (hideLegacySectionForFocusedScreen(activeScreen, label)) return null;\n  return (\n',
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

  const oldHeader = `      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">Chondro Breeder · Season {season}</div>
          <h1 className="mt-2 text-3xl font-semibold">Build your program</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/34">Breed by eye, reveal exact genetics when it matters, or build a documented pure-locality line over generations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
            <div className="text-[9px] uppercase tracking-[.14em] text-white/24">Cash</div>
            <div className="mt-1 font-semibold text-emerald-200/75">{money(cash)}</div>
          </div>
          <div className="rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
            <div className="text-[9px] uppercase tracking-[.14em] text-white/24">Capacity</div>
            <div className="mt-1 font-semibold text-white/65">{colony.length}/{capacity}</div>
          </div>
          <button onClick={resetGame} className="rounded-2xl border border-red-300/15 px-4 py-3 text-xs font-bold text-red-100/55">Reset game</button>
        </div>
      </div>`;

  const newHeader = `      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[.06] bg-white/[.018] p-3 sm:gap-3 sm:p-4">
        <div className="mr-auto min-w-[150px]">
          <div className="text-[9px] font-black uppercase tracking-[.14em] text-emerald-200/38">Season {season}</div>
          <div className="mt-1 text-xs text-white/38">Core breeder state</div>
        </div>
        <div className="rounded-xl border border-white/[.06] bg-black/15 px-3 py-2">
          <div className="text-[8px] uppercase tracking-[.12em] text-white/22">Cash</div>
          <div className="mt-0.5 text-sm font-semibold text-emerald-200/72">{money(cash)}</div>
        </div>
        <div className="rounded-xl border border-white/[.06] bg-black/15 px-3 py-2">
          <div className="text-[8px] uppercase tracking-[.12em] text-white/22">Capacity</div>
          <div className="mt-0.5 text-sm font-semibold text-white/62">{colony.length}/{capacity}</div>
        </div>
        <button onClick={resetGame} className="rounded-xl border border-red-300/12 px-3 py-2 text-[10px] font-bold text-red-100/45 transition hover:border-red-300/25 hover:text-red-100/70">Reset</button>
      </div>`;

  if (!source.includes(oldHeader)) throw new Error("Could not locate legacy Chondro core heading.");
  source = source.replace(oldHeader, newHeader);

  const closingNeedle = '\n    </div>\n  );\n}\n';
  const lastClosing = source.lastIndexOf(closingNeedle);
  if (lastClosing === -1) throw new Error("Could not locate ChondroBreederGameV3 closing wrapper.");
  source = source.slice(0, lastClosing) + '\n    </div>\n    </BreederGameScreenContext.Provider>\n  );\n}\n' + source.slice(lastClosing + closingNeedle.length);
}

const queueNeedle = '      {(breedingCycle || geneticTestsPending.length || facilityConstruction) ? (\n';
if (source.includes(queueNeedle)) {
  source = source.replace(
    queueNeedle,
    '      {screen === "all" && (breedingCycle || geneticTestsPending.length || facilityConstruction) ? (\n',
  );
}

if (!source.includes('arboreal-chondro-market-action')) {
  const marketMarker = '  function transferPositive(a: Snake) {';
  if (!source.includes(marketMarker)) throw new Error("Could not locate market action bridge insertion point.");
  const marketBridge = `  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    function handleMarketAction(event: Event) {
      const custom = event as CustomEvent<{ action?: string; listing?: PlayerMarketListing }>;
      const detail = custom.detail ?? {};
      if (detail.action === "buy-player-snake" && detail.listing) {
        void buyPlayerSnake(detail.listing);
      }
    }
    window.addEventListener("arboreal-chondro-market-action", handleMarketAction);
    return () => window.removeEventListener("arboreal-chondro-market-action", handleMarketAction);
  }, [cash, openSlots, marketBusy]);
  /* eslint-enable react-hooks/exhaustive-deps */

`;
  source = source.replace(marketMarker, marketBridge + marketMarker);
}

if (!source.includes('arboreal-chondro-clutch-action')) {
  const clutchMarker = '  async function finishClutch() {\n    if (!clutch || !clutchEstablished || marketBusy) return;';
  if (!source.includes(clutchMarker)) throw new Error("Could not find focused clutch finish handler for action bridge.");
  const clutchBridge = `  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    function handleClutchAction(event: Event) {
      const detail = (event as CustomEvent<{ action?: string; snakeId?: string }>).detail ?? {};
      if (detail.action === "establish") {
        payClutchEstablishment();
        return;
      }
      if (detail.action === "toggle-holdback" && typeof detail.snakeId === "string") {
        toggleHoldback(detail.snakeId);
        return;
      }
      if (detail.action === "finish") {
        void finishClutch();
      }
    }
    window.addEventListener("arboreal-chondro-clutch-action", handleClutchAction);
    return () => window.removeEventListener("arboreal-chondro-clutch-action", handleClutchAction);
  }, [clutch, clutchEstablished, cash, clutchEstablishmentCost, holdbacks, marketBusy, season]);
  /* eslint-enable react-hooks/exhaustive-deps */

`;
  source = source.replace(clutchMarker, clutchBridge + clutchMarker);
}

source = source.replace(
  '    neonateColor: raw.classification === "Pure"\n      ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)\n      : raw.neonateColor,',
  '    neonateColor: subspecies === "Morelia viridis" || locality === "Aru" || locality === "Merauke"\n      ? "Yellow"\n      : raw.classification === "Pure"\n        ? normalizeNeonateColorFor(CHONDRO_SPECIES_PROFILE, subspecies, raw.neonateColor)\n        : raw.neonateColor,',
);

const functionSignature = 'export function ChondroBreederGameV3({ screen = "all" }: { screen?: BreederGameScreen } = {}) {';
if (source.includes(functionSignature) && !source.includes("const [resetMenuOpen, setResetMenuOpen]")) {
  source = source.replace(
    functionSignature,
    `${functionSignature}\n  const [resetMenuOpen, setResetMenuOpen] = useState(false);`,
  );
}

const legacyReset = '  function resetGame() {\n    if (!window.confirm("Reset Chondro Breeder and erase this save?")) return;';
if (source.includes(legacyReset)) {
  source = source.replace(
    legacyReset,
    `  function resetGame() {
    const confirmation = window.prompt(
      "This permanently erases your Chondro Breeder save on this device and account.\\n\\nType RESET CHONDRO BREEDER exactly to continue.",
    );
    if (confirmation !== "RESET CHONDRO BREEDER") return;
    setResetMenuOpen(false);`,
  );
}

const oldResetButton = '<button onClick={resetGame} className="rounded-xl border border-red-300/12 px-3 py-2 text-[10px] font-bold text-red-100/45 transition hover:border-red-300/25 hover:text-red-100/70">Reset</button>';
const resetMenu = `<div className="relative">
          <button
            type="button"
            onClick={() => setResetMenuOpen((value) => !value)}
            aria-expanded={resetMenuOpen}
            aria-haspopup="menu"
            aria-label="Open game options"
            title="Game options"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.06] bg-black/15 text-base font-black tracking-[.08em] text-white/30 transition hover:border-white/[.12] hover:text-white/58"
          >
            •••
          </button>
          {resetMenuOpen ? (
            <div role="menu" className="absolute right-0 top-11 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/[.08] bg-[#07100c] p-4 shadow-2xl">
              <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/30">Game options</div>
              <div className="mt-2 text-sm font-semibold text-white/68">Save controls</div>
              <p className="mt-1 text-xs leading-5 text-white/34">Reset is intentionally buried here because it permanently clears your breeder progress.</p>
              <button
                type="button"
                role="menuitem"
                onClick={resetGame}
                className="mt-3 rounded-xl border border-red-300/15 bg-red-300/[.025] px-3 py-2 text-[10px] font-bold text-red-100/55 transition hover:border-red-300/28 hover:text-red-100/78"
              >
                Reset breeder save…
              </button>
            </div>
          ) : null}
        </div>`;

if (source.includes(oldResetButton)) {
  source = source.replace(oldResetButton, resetMenu);
}

fs.writeFileSync(file, source);
console.log("Applied focused Chondro screen mode, action bridges, neonate normalization and guarded reset controls.");
