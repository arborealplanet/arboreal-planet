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
} else if (!source.includes('aria-label="Open game options"')) {
  throw new Error("Could not locate the focused-screen reset control.");
}

fs.writeFileSync(file, source);
console.log("Moved Chondro reset into guarded game options with exact-phrase confirmation.");
