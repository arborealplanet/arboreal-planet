import fs from "node:fs";

const file = "src/components/ChondroBreederGameV3.tsx";
let source = fs.readFileSync(file, "utf8");

const functionSignature = 'export function ChondroBreederGameV3({ screen = "all" }: { screen?: BreederGameScreen } = {}) {';
if (!source.includes(functionSignature)) {
  throw new Error("Focused Chondro game signature was not found before reset-safety patch.");
}

if (!source.includes("const [resetMenuOpen, setResetMenuOpen]")) {
  source = source.replace(
    functionSignature,
    `${functionSignature}\n  const [resetMenuOpen, setResetMenuOpen] = useState(false);`,
  );
}

source = source.replace(
  '  function resetGame() {\n    if (!window.confirm("Reset Chondro Breeder and erase this save?")) return;',
  `  function resetGame() {
    const confirmation = window.prompt(
      "This permanently erases your Chondro Breeder save on this device and account.\\n\\nType RESET CHONDRO BREEDER exactly to continue.",
    );
    if (confirmation !== "RESET CHONDRO BREEDER") return;
    setResetMenuOpen(false);`,
);

const oldResetButton = '<button onClick={resetGame} className="rounded-xl border border-red-300/12 px-3 py-2 text-[10px] font-bold text-red-100/45 transition hover:border-red-300/25 hover:text-red-100/70">Reset</button>';
const newResetButton = `<button
          type="button"
          onClick={() => setResetMenuOpen((value) => !value)}
          aria-expanded={resetMenuOpen}
          aria-label="Open game options"
          title="Game options"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/[.06] bg-black/15 text-base font-black tracking-[.08em] text-white/30 transition hover:border-white/[.12] hover:text-white/58"
        >
          •••
        </button>`;

if (!source.includes(oldResetButton)) {
  throw new Error("Could not locate visible focused-screen reset button.");
}
source = source.replace(oldResetButton, newResetButton);

const stateStripEnd = `      </div>\n\n      {(screen === "all") && (breedingCycle || geneticTestsPending.length || facilityConstruction) ? (`;
const safetyPanel = `      </div>

      {resetMenuOpen ? (
        <div className="mt-2 ml-auto max-w-sm rounded-2xl border border-white/[.07] bg-[#07100c] p-4 shadow-2xl">
          <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/30">Game options</div>
          <div className="mt-2 text-sm font-semibold text-white/68">Save controls</div>
          <p className="mt-1 text-xs leading-5 text-white/34">Reset is intentionally buried here because it permanently clears your breeder progress.</p>
          <button
            type="button"
            onClick={resetGame}
            className="mt-3 rounded-xl border border-red-300/15 bg-red-300/[.025] px-3 py-2 text-[10px] font-bold text-red-100/55 transition hover:border-red-300/28 hover:text-red-100/78"
          >
            Reset breeder save…
          </button>
        </div>
      ) : null}

      {(screen === "all") && (breedingCycle || geneticTestsPending.length || facilityConstruction) ? (`;

if (!source.includes(stateStripEnd)) {
  throw new Error("Could not locate focused core state strip ending.");
}
source = source.replace(stateStripEnd, safetyPanel);

fs.writeFileSync(file, source);
console.log("Moved Chondro reset into guarded game options with exact-phrase confirmation.");
