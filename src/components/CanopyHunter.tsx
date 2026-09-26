"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  EXPEDITION_PYTHONS,
  EXPEDITION_SEARCHES,
  EXPEDITION_TREES,
  KEEPER_SAVE_KEY,
  createExpedition,
  generateWildSnake,
  importWildSnakesIntoSave,
  randomEscapeLine,
  rollRegion,
  rollZoneCenter,
  type CanopyRegion,
  type WildSnake,
} from "@/lib/canopy-hunter";

type Phase = "briefing" | "canopy" | "catch" | "results";

const SWEEP_MS = 1200;
const ZONE_HALF = 0.11; // 22% green zone

/** Triangle-wave sweep: 0 → 1 → 0 over two periods. */
function sweepPos(elapsedMs: number, periodMs: number): number {
  const phase = (elapsedMs % (periodMs * 2)) / periodMs;
  return phase < 1 ? phase : 2 - phase;
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/* ------------------------------------------------------------------ */
/* Art: inline SVG                                                     */
/* ------------------------------------------------------------------ */

function TreeArt({ dimmed, swayDelay }: { dimmed: boolean; swayDelay: number }) {
  return (
    <svg
      viewBox="0 0 120 150"
      className={`h-full w-full ${dimmed ? "opacity-40 saturate-50" : ""}`}
      style={{ transformOrigin: "50% 100%", animation: `ch-sway 5s ease-in-out ${swayDelay}s infinite` }}
      aria-hidden="true"
    >
      <rect x="52" y="92" width="16" height="52" rx="7" fill="#6b4a2f" stroke="#0b140e" strokeWidth="5" />
      <ellipse cx="60" cy="70" rx="40" ry="34" fill="#1f7a45" stroke="#0b140e" strokeWidth="5" />
      <ellipse cx="40" cy="58" rx="26" ry="22" fill="#2e9e5b" stroke="#0b140e" strokeWidth="5" />
      <ellipse cx="80" cy="58" rx="26" ry="22" fill="#2e9e5b" stroke="#0b140e" strokeWidth="5" />
      <ellipse cx="60" cy="46" rx="24" ry="18" fill="#37b368" stroke="#0b140e" strokeWidth="5" />
      <circle cx="46" cy="40" r="4" fill="#7ce3a1" opacity="0.7" />
      <circle cx="74" cy="50" r="3" fill="#7ce3a1" opacity="0.6" />
    </svg>
  );
}

function PythonArt() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      {/* coil: dark outline pass, then green pass */}
      <path
        d="M60 96 C34 96 24 78 33 61 C42 44 66 44 74 61 C82 78 64 95 50 88"
        fill="none"
        stroke="#0b140e"
        strokeWidth="17"
        strokeLinecap="round"
      />
      <path
        d="M60 96 C34 96 24 78 33 61 C42 44 66 44 74 61 C82 78 64 95 50 88"
        fill="none"
        stroke="#3fae62"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* dorsal spots */}
      <circle cx="44" cy="58" r="3.4" fill="#bff0d2" />
      <circle cx="60" cy="52" r="3.4" fill="#bff0d2" />
      <circle cx="40" cy="76" r="3.4" fill="#bff0d2" />
      {/* head */}
      <ellipse cx="54" cy="88" rx="12" ry="9" fill="#46c06e" stroke="#0b140e" strokeWidth="4" transform="rotate(-18 54 88)" />
      <circle cx="50" cy="85" r="2.4" fill="#0b140e" />
      <circle cx="59" cy="86" r="2.4" fill="#0b140e" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Game                                                                */
/* ------------------------------------------------------------------ */

export function CanopyHunter() {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [region, setRegion] = useState<CanopyRegion | null>(null);
  const [pythonTrees, setPythonTrees] = useState<number[]>([]);
  const [wilds, setWilds] = useState<Record<number, WildSnake>>({});
  const [searched, setSearched] = useState<boolean[]>(() => Array(EXPEDITION_TREES).fill(false));
  const [searchesLeft, setSearchesLeft] = useState(EXPEDITION_SEARCHES);
  const [bag, setBag] = useState<WildSnake[]>([]);
  const [escapedCount, setEscapedCount] = useState(0);
  const [catchTree, setCatchTree] = useState<number | null>(null);
  const [zoneCenter, setZoneCenter] = useState(0.5);
  const [catchResolved, setCatchResolved] = useState(false);
  const [catchMessage, setCatchMessage] = useState<string | null>(null);
  const [catchSuccess, setCatchSuccess] = useState(false);
  const [importState, setImportState] = useState<"idle" | "done" | "no-save">("idle");
  const [importedCount, setImportedCount] = useState(0);

  const markerRef = useRef<HTMLDivElement>(null);
  const sweepStartRef = useRef(0);
  // Reads the OS reduced-motion preference without an effect (same pattern as
  // IntroCinematic): server snapshot matches, and it follows live OS changes.
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const period = reducedMotion ? SWEEP_MS * 2.5 : SWEEP_MS;
  const zoneHalf = reducedMotion ? 0.2 : ZONE_HALF;

  const resolvedCount = bag.length + escapedCount;

  /* Marker sweep while the catch is live. */
  useEffect(() => {
    if (phase !== "catch" || catchResolved) return;
    sweepStartRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const pos = sweepPos(now - sweepStartRef.current, period);
      if (markerRef.current) markerRef.current.style.left = `${pos * 100}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, catchResolved, period]);

  /* Auto-advance to results when searches run out or every python is found. */
  useEffect(() => {
    if (phase !== "canopy") return;
    if (searchesLeft <= 0 || resolvedCount >= EXPEDITION_PYTHONS) {
      const t = setTimeout(() => setPhase("results"), 700);
      return () => clearTimeout(t);
    }
  }, [phase, searchesLeft, resolvedCount]);

  function startExpedition() {
    const expeditionRegion = rollRegion();
    const trees = createExpedition();
    const nextWilds: Record<number, WildSnake> = {};
    trees.forEach((treeIndex, i) => {
      nextWilds[treeIndex] = generateWildSnake(i + 1, expeditionRegion);
    });
    setRegion(expeditionRegion);
    setPythonTrees(trees);
    setWilds(nextWilds);
    setSearched(Array(EXPEDITION_TREES).fill(false));
    setSearchesLeft(EXPEDITION_SEARCHES);
    setBag([]);
    setEscapedCount(0);
    setCatchTree(null);
    setCatchResolved(false);
    setCatchMessage(null);
    setImportState("idle");
    setImportedCount(0);
    setPhase("canopy");
  }

  function searchTree(index: number) {
    if (phase !== "canopy" || searched[index] || searchesLeft <= 0) return;
    const nextSearched = [...searched];
    nextSearched[index] = true;
    setSearched(nextSearched);
    setSearchesLeft((n) => n - 1);
    if (pythonTrees.includes(index)) {
      setCatchTree(index);
      setZoneCenter(rollZoneCenter());
      setCatchResolved(false);
      setCatchMessage(null);
      setPhase("catch");
    }
  }

  function grab() {
    if (phase !== "catch" || catchResolved || catchTree === null) return;
    const pos = sweepPos(performance.now() - sweepStartRef.current, period);
    const success = Math.abs(pos - zoneCenter) <= zoneHalf;
    const wild = wilds[catchTree];
    setCatchSuccess(success);
    setCatchResolved(true);
    if (success && wild) {
      setBag((b) => [...b, wild]);
      setCatchMessage("Bagged! A new animal for the collection.");
    } else {
      setEscapedCount((n) => n + 1);
      setCatchMessage(randomEscapeLine());
    }
  }

  function backToCanopy() {
    setCatchTree(null);
    setPhase("canopy");
  }

  function sendToKeeper() {
    if (bag.length === 0 || importState !== "idle") return;
    try {
      const raw = window.localStorage.getItem(KEEPER_SAVE_KEY);
      const result = importWildSnakesIntoSave(raw, bag);
      if (!result.ok) {
        setImportState("no-save");
        return;
      }
      window.localStorage.setItem(KEEPER_SAVE_KEY, result.saveJson);
      setImportedCount(result.imported);
      setImportState("done");
    } catch {
      setImportState("no-save");
    }
  }

  const currentWild = catchTree !== null ? wilds[catchTree] : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6">
      <style>{`@keyframes ch-sway { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }`}</style>

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-4 py-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/70">
          Arboreal Arcade · Mini game
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.03em] text-white sm:text-5xl">Canopy Hunter</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/55">
          Night in the New Guinea canopy. Search the trees, catch the green tree pythons you find,
          and bring them home to your Arboreal Keeper collection.
        </p>
      </div>

      {/* Briefing */}
      {phase === "briefing" && (
        <div className="mx-auto mt-10 max-w-xl rounded-[26px] border border-white/[.07] bg-white/[.02] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">Expedition briefing</h2>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-white/55">
            <li>· {EXPEDITION_TREES} trees in tonight&apos;s patch of canopy.</li>
            <li>· You have {EXPEDITION_SEARCHES} searches — spend them wisely.</li>
            <li>· {EXPEDITION_PYTHONS} pythons are hiding up there. Spot one and grab it before it slips away.</li>
            <li>· Each expedition heads to one of four regions — tonight&apos;s snakes all come from the same corner of New Guinea.</li>
            <li>· Caught snakes can be sent straight to your Arboreal Keeper save.</li>
          </ul>
          <button
            type="button"
            onClick={startExpedition}
            className="mt-6 w-full rounded-2xl bg-emerald-300 px-6 py-4 text-base font-bold text-[#06100c] transition hover:bg-emerald-200 active:scale-[.99]"
          >
            Start expedition
          </button>
        </div>
      )}

      {/* Canopy */}
      {phase === "canopy" && (
        <div className="mt-8">
          {region && (
            <div className="mb-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/60">
                Tonight&apos;s region
              </div>
              <div className="mt-1 text-lg font-semibold text-white">{region.name}</div>
              <p className="mt-0.5 text-xs text-white/40">{region.tagline}</p>
            </div>
          )}
          <div className="flex items-center justify-between rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">
              Searches left · <span className="text-emerald-200">{searchesLeft}</span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">
              Bagged · <span className="text-emerald-200">{bag.length}</span>
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: EXPEDITION_TREES }, (_, i) => {
              const wasSearched = searched[i];
              const hidesPython = pythonTrees.includes(i);
              const showPython = wasSearched && hidesPython;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => searchTree(i)}
                  disabled={wasSearched}
                  aria-label={wasSearched ? (showPython ? `Tree ${i + 1}: python found` : `Tree ${i + 1}: searched, empty`) : `Search tree ${i + 1}`}
                  className={`relative aspect-[4/5] overflow-hidden rounded-2xl border transition active:scale-95 ${
                    wasSearched
                      ? "border-white/[.05] bg-black/40"
                      : "border-emerald-300/10 bg-gradient-to-b from-emerald-950/60 to-black/60 hover:border-emerald-300/30 hover:bg-emerald-900/20"
                  }`}
                >
                  <div className="absolute inset-x-2 bottom-1 top-3">
                    <TreeArt dimmed={wasSearched && !showPython} swayDelay={(i % 5) * 0.7} />
                  </div>
                  {showPython && (
                    <div className="absolute inset-x-4 bottom-6 top-8">
                      <PythonArt />
                    </div>
                  )}
                  {wasSearched && !showPython && (
                    <span className="absolute right-2 top-2 rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] font-bold text-white/35">
                      ∅
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-center text-xs text-white/35">Tap a tree to search it.</p>
        </div>
      )}

      {/* Catch */}
      {phase === "catch" && currentWild && (
        <div className="mx-auto mt-8 max-w-xl rounded-[26px] border border-white/[.07] bg-white/[.02] p-6 sm:p-8">
          <div className="mx-auto h-40 w-40">
            <PythonArt />
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-white">{currentWild.name}</h2>
          <p className="mt-1 text-center text-sm text-white/50">
            {currentWild.locality} · {currentWild.sex} · {currentWild.lifeStage}
          </p>
          {currentWild.exceptionalTraitLabel && (
            <p className="mx-auto mt-3 w-fit rounded-full border border-amber-200/25 bg-amber-200/[.07] px-4 py-1.5 text-xs font-bold text-amber-100">
              {currentWild.exceptionalTraitLabel}
            </p>
          )}

          {!catchResolved ? (
            <div className="mt-6">
              <p className="text-center text-xs uppercase tracking-[.16em] text-white/40">
                Tap grab when the marker is in the green
              </p>
              <div className="relative mt-3 h-5 overflow-hidden rounded-full border border-white/10 bg-black/50">
                <div
                  className="absolute inset-y-0 rounded-full bg-emerald-400/35"
                  style={{ left: `${(zoneCenter - zoneHalf) * 100}%`, width: `${zoneHalf * 2 * 100}%` }}
                />
                <div
                  ref={markerRef}
                  className="absolute inset-y-[-2px] w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]"
                  style={{ left: "0%" }}
                />
              </div>
              <button
                type="button"
                onClick={grab}
                className="mt-5 w-full rounded-2xl bg-emerald-300 px-6 py-4 text-base font-bold text-[#06100c] transition hover:bg-emerald-200 active:scale-[.99]"
              >
                GRAB
              </button>
            </div>
          ) : (
            <div className="mt-6 text-center">
              <p className={`text-sm leading-6 ${catchSuccess ? "text-emerald-200" : "text-white/55"}`}>
                {catchMessage}
              </p>
              <button
                type="button"
                onClick={backToCanopy}
                className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[.04] px-6 py-3.5 text-sm font-bold text-white/80 transition hover:bg-white/[.08]"
              >
                Back to the canopy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {phase === "results" && (
        <div className="mx-auto mt-8 max-w-xl">
          <div className="rounded-[26px] border border-white/[.07] bg-white/[.02] p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white">Expedition complete</h2>
            <p className="mt-1 text-sm text-white/50">
              {region ? `${region.name} · ` : ""}{bag.length} caught · {escapedCount} escaped
            </p>

            {bag.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {bag.map((wild) => (
                  <li
                    key={wild.name}
                    className="flex items-center gap-4 rounded-2xl border border-white/[.06] bg-black/30 p-3"
                  >
                    <div className="h-16 w-16 shrink-0">
                      <PythonArt />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">{wild.name}</div>
                      <div className="mt-0.5 text-xs text-white/50">
                        {wild.locality} · {wild.sex} · {wild.lifeStage} · {wild.neonateColor} neonate
                      </div>
                      {wild.exceptionalTraitLabel && (
                        <div className="mt-1 text-xs font-bold text-amber-200/90">
                          {wild.exceptionalTraitLabel}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-6 text-white/50">
                No snakes this time — the canopy kept its secrets. Try another expedition.
              </p>
            )}

            {importState === "idle" && bag.length > 0 && (
              <button
                type="button"
                onClick={sendToKeeper}
                className="mt-6 w-full rounded-2xl bg-emerald-300 px-6 py-4 text-base font-bold text-[#06100c] transition hover:bg-emerald-200 active:scale-[.99]"
              >
                Send {bag.length === 1 ? "it" : `all ${bag.length}`} to Arboreal Keeper
              </button>
            )}

            {importState === "done" && (
              <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.07] p-4 text-center">
                <p className="text-sm font-bold text-emerald-200">
                  {importedCount} {importedCount === 1 ? "snake" : "snakes"} added to your Keeper colony.
                </p>
                <Link
                  href="/arcade/arboreal-keeper"
                  className="mt-2 inline-block text-sm font-semibold text-emerald-100 underline decoration-emerald-200/30 underline-offset-4 hover:text-white"
                >
                  Open Arboreal Keeper
                </Link>
              </div>
            )}

            {importState === "no-save" && (
              <div className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/[.05] p-4 text-center">
                <p className="text-sm leading-6 text-amber-100/80">
                  No Keeper save found on this device — your catch needs a home first.
                </p>
                <Link
                  href="/arcade/arboreal-keeper"
                  className="mt-3 inline-block rounded-xl bg-amber-200 px-5 py-2.5 text-sm font-bold text-[#17130a]"
                >
                  Start your Arboreal Keeper journey
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={startExpedition}
              className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[.04] px-6 py-3.5 text-sm font-bold text-white/80 transition hover:bg-white/[.08]"
            >
              New expedition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
