"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  EXPEDITION_PYTHONS,
  EXPEDITION_SEARCHES,
  EXPEDITION_TREES,
  generateWildSnake,
  randomEscapeLine,
  rollRegion,
  rollZoneCenter,
  type CanopyRegion,
  type WildSnake,
} from "@/lib/canopy-hunter";
import {
  isJungleMuted,
  setJungleMuted,
  startJungleMusic,
  stopJungleMusic,
} from "@/lib/jungle-ambience";
import { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";

type Phase = "briefing" | "trail" | "grove" | "catch" | "results";

const SWEEP_MS = 1200;
const ZONE_HALF = 0.11; // 22% green zone

const GROVES_PER_EXPEDITION = 4;
const TREES_PER_GROVE = 3;

// Keyed variants: edge-connected black flood-filled to transparent at build
// time, so the art composites solidly with normal blending (no screen-blend
// ghosting on the dark trail).
const TREE_ARTS = [
  "/arcade/canopy-hunter/tree-keyed.webp",
  "/arcade/canopy-hunter/tree-2-keyed.webp",
  "/arcade/canopy-hunter/tree-3-keyed.webp",
];
const BANNER_ART = "/arcade/canopy-hunter/canopy-banner.webp";
const PATH_ART = "/arcade/canopy-hunter/path-night.webp";
const PATH_FORK_2_ART = "/arcade/canopy-hunter/path-fork-2.webp";
const PATH_FORK_3_ART = "/arcade/canopy-hunter/path-fork-3.webp";

/** The path backdrop matches the decision: straight trail, two-way fork, or three-way split. */
function pathArtForTrailCount(count: number): string {
  if (count === 2) return PATH_FORK_2_ART;
  if (count >= 3) return PATH_FORK_3_ART;
  return PATH_ART;
}
const EXPLORER_ART = "/arcade/canopy-hunter/explorer-back-keyed.webp";
const FOREGROUND_ART = "/arcade/canopy-hunter/foreground-branches.webp";

/**
 * A caught wild snake rendered through the exact same Keeper pipeline as the
 * colony (ChondroSnakeIcon): the true locality/stage sprite when art exists,
 * Keeper's own "Sprite pending" treatment when it doesn't. The sprite seed is
 * the wild snake's stable name, matching the seed stored on import, so the
 * catch screen, receipt, haul banner, and colony card all resolve identically.
 */
function WildSnakeArt({ wild, mini = false }: { wild: WildSnake; mini?: boolean }) {
  return (
    <ChondroSnakeIcon
      subspecies={wild.subspecies}
      name={wild.name}
      lifeStage={wild.lifeStage}
      neonateColor={wild.neonateColor}
      locality={wild.locality}
      classification="Pure"
      ancestry={{ [wild.subspecies]: 100 }}
      localityAncestry={{ [wild.locality]: 100 }}
      phenotypeScore={wild.phenotypeScore}
      spriteSeed={wild.name}
      mini={mini}
    />
  );
}

/** One branch at a fork in the trail. Exactly one trail per leg hides a python. */
interface TrailOption {
  label: string;
  treeVariants: number[];
  /** Which of the grove's trees hides the python, or null when this trail is empty. */
  pythonTree: number | null;
}

interface Leg {
  trails: TrailOption[];
}

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

function pickTrailCount(): number {
  const r = Math.random();
  if (r < 0.15) return 1;
  if (r < 0.6) return 2;
  return 3;
}

function trailLabel(count: number, index: number): string {
  if (count === 1) return "Follow the trail";
  if (count === 2) return index === 0 ? "Left trail" : "Right trail";
  return index === 0 ? "Left trail" : index === 1 ? "Center trail" : "Right trail";
}

/* ------------------------------------------------------------------ */
/* Art: production sprites                                             */
/* ------------------------------------------------------------------ */

function TreeArt({ variant, dimmed, swayDelay }: { variant: number; dimmed: boolean; swayDelay: number }) {
  return (
    <Image
      src={TREE_ARTS[variant % TREE_ARTS.length]}
      alt=""
      aria-hidden="true"
      fill
      sizes="(max-width: 640px) 30vw, 22vw"
      draggable={false}
      className={`object-cover ${dimmed ? "opacity-35 saturate-50" : ""}`}
      style={{ transformOrigin: "50% 100%", animation: `ch-sway 5s ease-in-out ${swayDelay}s infinite` }}
    />
  );
}

/** Pulsing pink badge for a gravid female. */
function GravidBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-pink-300/30 bg-pink-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-pink-200 ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink-300" />
      </span>
      Gravid
    </span>
  );
}

function Fireflies({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-yellow-200"
          style={{
            left: `${8 + ((i * 37) % 84)}%`,
            top: `${18 + ((i * 53) % 52)}%`,
            animation: `ch-firefly ${3 + (i % 4)}s ease-in-out ${i * 0.6}s infinite`,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Game                                                                */
/* ------------------------------------------------------------------ */

export function CanopyHunter({
  onCatch,
  onClose,
  onExitToGate,
  region: regionProp,
}: {
  onCatch: (wilds: WildSnake[]) => void;
  onClose: () => void;
  /** Return to the Keeper expedition entry gate (weekly-free / paid entry). Never resets the trip internally. */
  onExitToGate: () => void;
  /** Pre-rolled expedition region (the flight intro already picked one). Falls back to rolling. */
  region?: CanopyRegion | null;
}) {
  const [phase, setPhase] = useState<Phase>("briefing");
  const [region, setRegion] = useState<CanopyRegion | null>(null);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [legIndex, setLegIndex] = useState(0);
  const [grove, setGrove] = useState<TrailOption | null>(null);
  const [groveWilds, setGroveWilds] = useState<Record<number, WildSnake>>({});
  const [searched, setSearched] = useState<boolean[]>(() => Array(TREES_PER_GROVE).fill(false));
  const [searchesLeft, setSearchesLeft] = useState(EXPEDITION_SEARCHES);
  const [bag, setBag] = useState<WildSnake[]>([]);
  const [escapedCount, setEscapedCount] = useState(0);
  const [catchTree, setCatchTree] = useState<number | null>(null);
  const [zoneCenter, setZoneCenter] = useState(0.5);
  const [catchResolved, setCatchResolved] = useState(false);
  const [catchMessage, setCatchMessage] = useState<string | null>(null);
  const [catchSuccess, setCatchSuccess] = useState(false);
  const [sent, setSent] = useState(false);
  const [walking, setWalking] = useState(false);
  const [jungleMuted, setJungleMutedState] = useState<boolean>(() => isJungleMuted());

  const markerRef = useRef<HTMLDivElement>(null);
  const sweepStartRef = useRef(0);
  const wildIdRef = useRef(1);
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

  /* Jungle music lives as long as the expedition modal does. */
  useEffect(() => () => {
    stopJungleMusic();
  }, []);

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
    if (phase !== "trail" && phase !== "grove") return;
    if (searchesLeft <= 0 || resolvedCount >= EXPEDITION_PYTHONS) {
      const t = setTimeout(() => setPhase("results"), 700);
      return () => clearTimeout(t);
    }
  }, [phase, searchesLeft, resolvedCount]);

  function startExpedition() {
    // User gesture: the one safe moment to wake the Web Audio engine.
    startJungleMusic();
    const expeditionRegion = regionProp ?? rollRegion();
    const nextLegs: Leg[] = [];
    for (let g = 0; g < GROVES_PER_EXPEDITION; g += 1) {
      const trailCount = pickTrailCount();
      const pythonTrail = Math.floor(Math.random() * trailCount);
      const trails: TrailOption[] = [];
      for (let t = 0; t < trailCount; t += 1) {
        const hidesPython = t === pythonTrail;
        trails.push({
          label: trailLabel(trailCount, t),
          treeVariants: [0, 1, 2].map((_, i) => (g + t + i) % TREE_ARTS.length),
          pythonTree: hidesPython ? Math.floor(Math.random() * TREES_PER_GROVE) : null,
        });
      }
      nextLegs.push({ trails });
    }
    wildIdRef.current = 1;
    setRegion(expeditionRegion);
    setLegs(nextLegs);
    setLegIndex(0);
    setGrove(null);
    setGroveWilds({});
    setSearched(Array(TREES_PER_GROVE).fill(false));
    setSearchesLeft(EXPEDITION_SEARCHES);
    setBag([]);
    setEscapedCount(0);
    setCatchTree(null);
    setCatchResolved(false);
    setCatchMessage(null);
    setSent(false);
    setWalking(false);
    setPhase("trail");
  }

  function chooseTrail(trailIndex: number) {
    if (phase !== "trail" || walking) return;
    const trail = legs[legIndex]?.trails[trailIndex];
    if (!trail) return;
    setWalking(true);
    window.setTimeout(() => {
      const wilds: Record<number, WildSnake> = {};
      if (trail.pythonTree !== null && region) {
        wilds[trail.pythonTree] = generateWildSnake(wildIdRef.current, region);
        wildIdRef.current += 1;
      }
      setGrove(trail);
      setGroveWilds(wilds);
      setSearched(Array(TREES_PER_GROVE).fill(false));
      setCatchTree(null);
      setCatchResolved(false);
      setCatchMessage(null);
      setWalking(false);
      setPhase("grove");
    }, 750);
  }

  function searchTree(index: number) {
    if (phase !== "grove" || searched[index] || searchesLeft <= 0) return;
    const nextSearched = [...searched];
    nextSearched[index] = true;
    setSearched(nextSearched);
    setSearchesLeft((n) => n - 1);
    if (groveWilds[index]) {
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
    const wild = groveWilds[catchTree];
    setCatchSuccess(success);
    setCatchResolved(true);
    if (success && wild) {
      setBag((b) => [...b, wild]);
      setCatchMessage(
        wild.gravid
          ? "Bagged! She's gravid — she'll lay her clutch once she's settled in your colony."
          : "Bagged! A new animal for the collection.",
      );
    } else {
      setEscapedCount((n) => n + 1);
      setCatchMessage(randomEscapeLine());
    }
  }

  function backToGrove() {
    setCatchTree(null);
    setPhase("grove");
  }

  function followTrail() {
    if (legIndex + 1 >= GROVES_PER_EXPEDITION) {
      setPhase("results");
    } else {
      setLegIndex((n) => n + 1);
      setGrove(null);
      setPhase("trail");
    }
  }

  function bringHome() {
    if (bag.length === 0 || sent) return;
    onCatch(bag);
    setSent(true);
  }

  function toggleJungleMuted() {
    const next = !jungleMuted;
    setJungleMuted(next);
    setJungleMutedState(next);
    if (!next && phase !== "briefing") startJungleMusic();
  }

  const currentWild = catchTree !== null ? groveWilds[catchTree] : undefined;
  const currentTrails = legs[legIndex]?.trails ?? [];

  function trailButtonPos(count: number, index: number): React.CSSProperties {
    if (count === 1) return { left: "50%", bottom: "36%", transform: "translateX(-50%)" };
    if (count === 2) {
      return index === 0
        ? { left: "20%", bottom: "38%", transform: "translateX(-50%)" }
        : { left: "80%", bottom: "38%", transform: "translateX(-50%)" };
    }
    return {
      left: index === 0 ? "17%" : index === 1 ? "50%" : "83%",
      bottom: index === 1 ? "44%" : "36%",
      transform: "translateX(-50%)",
    };
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <style>{`@keyframes ch-sway { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes ch-firefly { 0%,100% { transform: translate(0,0); opacity: .25; } 50% { transform: translate(10px,-14px); opacity: 1; } }`}</style>

      {/* Header */}
      <div className="relative text-center">
        <button
          type="button"
          onClick={toggleJungleMuted}
          aria-label={jungleMuted ? "Unmute jungle music" : "Mute jungle music"}
          title={jungleMuted ? "Unmute jungle music" : "Mute jungle music"}
          className="absolute left-0 top-0 z-10 rounded-full border border-white/10 bg-black/60 p-2 text-white/60 transition hover:bg-white/[.1] hover:text-white"
        >
          {jungleMuted ? (
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M2 6v4h3l4 3V3L5 6H2z" fill="currentColor" />
              <path d="M11 5l4 6M15 5l-4 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M2 6v4h3l4 3V3L5 6H2z" fill="currentColor" />
              <path d="M11 5.5a3.5 3.5 0 010 5M12.8 3.8a6 6 0 010 8.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close expedition"
          className="absolute right-0 top-0 z-10 rounded-full border border-white/10 bg-black/60 p-2 text-white/60 transition hover:bg-white/[.1] hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="inline-flex rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-4 py-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/70">
          Arboreal Keeper · Special event
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-.03em] text-white sm:text-5xl">Canopy Hunter</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/55">
          Night in the New Guinea canopy. Walk the trail, read the signs, search the trees —
          and bring your pythons home to your Arboreal Keeper collection.
        </p>
      </div>

      {/* Briefing */}
      {phase === "briefing" && (
        <div className="mx-auto mt-8 max-w-xl overflow-hidden rounded-[26px] border border-white/[.07] bg-white/[.02]">
          <div className="relative h-44 sm:h-52">
            <Image src={BANNER_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 36rem" draggable={false} className="object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(4,10,8,.92)_100%)]" />
            <div className="absolute bottom-3 left-5 right-5">
              <h2 className="text-lg font-semibold text-white">Expedition briefing</h2>
              <p className="text-xs text-white/55">Four groves. One night. Your flashlight and your instincts.</p>
            </div>
          </div>
          <ul className="space-y-2 p-6 text-sm leading-6 text-white/55 sm:px-8">
            <li>· {GROVES_PER_EXPEDITION} groves along the trail, {TREES_PER_GROVE} trees each — {EXPEDITION_TREES} trees in all.</li>
            <li>· You have {EXPEDITION_SEARCHES} searches — spend them wisely.</li>
            <li>· {EXPEDITION_PYTHONS} pythons are hiding out there. At every fork, read the signs: rustling leaves mean snakes.</li>
            <li>· Spot one and grab it before it slips away.</li>
            <li>· Each expedition heads to one of four regions — tonight&apos;s snakes all come from the same corner of New Guinea.</li>
            <li>· Caught snakes head straight into your Keeper colony.</li>
          </ul>
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <button
              type="button"
              onClick={startExpedition}
              className="w-full rounded-2xl bg-emerald-300 px-6 py-4 text-base font-bold text-[#06100c] transition hover:bg-emerald-200 active:scale-[.99]"
            >
              Start expedition
            </button>
          </div>
        </div>
      )}

      {/* Trail — pseudo-3D third-person fork choice */}
      {phase === "trail" && (
        <div className="mt-8">
          <TrailStatus region={region} legIndex={legIndex} searchesLeft={searchesLeft} bagCount={bag.length} />
          <div className={`relative aspect-[4/3] overflow-hidden rounded-[26px] border border-white/[.07] transition-all duration-700 sm:aspect-[16/9] ${walking ? "scale-110 opacity-0" : "scale-100 opacity-100"}`}>
            <Image src={pathArtForTrailCount(currentTrails.length)} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 48rem" draggable={false} className="object-cover" />
            {/* Distant trees near the vanishing point sell the depth */}
            <div className="absolute left-[37%] top-[24%] w-16 opacity-90 mix-blend-screen sm:w-20">
              <div className="relative aspect-[3/4] brightness-[.55]">
                <TreeArt variant={(legIndex + 1) % TREE_ARTS.length} dimmed={false} swayDelay={0.4} />
              </div>
            </div>
            <div className="absolute right-[37%] top-[24%] w-16 opacity-90 mix-blend-screen sm:w-20">
              <div className="relative aspect-[3/4] brightness-[.55]">
                <TreeArt variant={(legIndex + 2) % TREE_ARTS.length} dimmed={false} swayDelay={1.3} />
              </div>
            </div>
            <Fireflies />
            {/* Trail choices sit on the path ahead */}
            {currentTrails.map((trail, i) => (
              <button
                key={i}
                type="button"
                onClick={() => chooseTrail(i)}
                disabled={walking}
                style={trailButtonPos(currentTrails.length, i)}
                className="absolute z-10 max-w-[7rem] rounded-full border border-amber-200/30 bg-black/65 px-4 py-2.5 text-center backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-200/60 hover:bg-black/80 active:scale-95 disabled:opacity-60 sm:max-w-[11rem]"
              >
                <span className="text-[11px] font-black uppercase tracking-[.14em] text-amber-100">{trail.label}</span>
              </button>
            ))}
            {/* Third-person hunter (keyed art, fully opaque) */}
            <div className="absolute bottom-1 left-1/2 z-10 h-32 w-24 -translate-x-1/2 sm:h-40 sm:w-32">
              <Image src={EXPLORER_ART} alt="" aria-hidden="true" fill sizes="96px" draggable={false} className="object-contain" />
            </div>
            {/* Foreground foliage frames the shot */}
            <Image src={FOREGROUND_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 48rem" draggable={false} className="pointer-events-none object-cover mix-blend-screen" />
            {walking && (
              <div className="absolute inset-0 z-20 grid place-items-center">
                <span className="rounded-full border border-white/10 bg-black/70 px-5 py-2.5 text-xs font-bold uppercase tracking-[.18em] text-white/70">
                  Walking…
                </span>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-white/35">
            {currentTrails.length <= 1 ? "One way forward." : "Pick the trail that feels right."}
          </p>
        </div>
      )}

      {/* Grove — search the trees */}
      {phase === "grove" && grove && (
        <div className="mt-8">
          <TrailStatus region={region} legIndex={legIndex} searchesLeft={searchesLeft} bagCount={bag.length} grove />
          <div className="relative overflow-hidden rounded-[26px] border border-white/[.07]">
            <Image src={PATH_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 48rem" draggable={false} className="object-cover brightness-[.38]" />
            <div className="relative flex items-end justify-center gap-2 px-4 pb-8 pt-10 sm:gap-6">
              {grove.treeVariants.map((variant, i) => {
                const wasSearched = searched[i];
                const showPython = wasSearched && grove.pythonTree === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => searchTree(i)}
                    disabled={wasSearched}
                    aria-label={wasSearched ? (showPython ? `Tree ${i + 1}: python found` : `Tree ${i + 1}: searched, empty`) : `Search tree ${i + 1}`}
                    className={`group relative aspect-[3/4] transition active:scale-95 ${
                      i === 1 ? "w-24 -translate-y-3 sm:w-32" : "w-32 sm:w-44"
                    } ${wasSearched ? "" : "hover:drop-shadow-[0_0_20px_rgba(52,211,153,.35)]"}`}
                  >
                    <div className={`absolute inset-0 ${wasSearched && !showPython ? "opacity-60" : ""}`}>
                      <TreeArt variant={variant} dimmed={wasSearched && !showPython} swayDelay={(i % 5) * 0.7} />
                    </div>
                    {showPython && groveWilds[i] && (
                      <div className="absolute inset-x-1 bottom-1 top-4 grid place-items-center">
                        <WildSnakeArt wild={groveWilds[i]} mini />
                      </div>
                    )}
                    {wasSearched && !showPython && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white/40">
                        ∅
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <Image src={FOREGROUND_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 48rem" draggable={false} className="pointer-events-none object-cover opacity-60 mix-blend-screen" />
          </div>
          <button
            type="button"
            onClick={followTrail}
            className="mt-4 w-full rounded-2xl border border-emerald-300/25 bg-emerald-300/[.07] px-6 py-3.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/[.12] active:scale-[.99]"
          >
            {legIndex + 1 >= GROVES_PER_EXPEDITION ? "Finish the expedition →" : "Follow the trail →"}
          </button>
          <p className="mt-3 text-center text-xs text-white/35">Tap a tree to search it — or move on down the trail.</p>
        </div>
      )}

      {/* Catch */}
      {phase === "catch" && currentWild && (
        <div className="mx-auto mt-8 max-w-xl overflow-hidden rounded-[26px] border border-white/[.07] bg-white/[.02]">
          <div className="relative">
            <div className="relative h-40 sm:h-48">
              <Image src={BANNER_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 36rem" draggable={false} className="object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,8,.25)_0%,rgba(4,10,8,.88)_100%)]" />
            </div>
            <div className="relative mx-auto -mt-24 w-64 sm:-mt-28 sm:w-80">
              <div className="absolute inset-6 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
              <div className="relative drop-shadow-[0_0_35px_rgba(52,211,153,.25)]">
                <WildSnakeArt wild={currentWild} />
              </div>
            </div>
          </div>
          <div className="p-6 sm:p-8 sm:pt-2">
            <h2 className="text-center text-xl font-semibold text-white">{currentWild.name}</h2>
            <p className="mt-1 text-center text-sm text-white/50">
              {currentWild.locality} · {currentWild.sex} · {currentWild.lifeStage}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white/60">
                {currentWild.lifeStage}
              </span>
              {currentWild.gravid && <GravidBadge />}
            </div>
            {currentWild.gravid && !catchResolved && (
              <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-5 text-pink-200/80">
                She&apos;s carrying — bring her home and she&apos;ll lay a pure {currentWild.locality} clutch.
              </p>
            )}
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
                  onClick={backToGrove}
                  className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[.04] px-6 py-3.5 text-sm font-bold text-white/80 transition hover:bg-white/[.08]"
                >
                  Back to the grove
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {phase === "results" && (
        <div className="mx-auto mt-8 max-w-xl">
          <div className="overflow-hidden rounded-[26px] border border-white/[.07] bg-white/[.02]">
            <div className="relative h-32 sm:h-36">
              <Image src={BANNER_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 36rem" draggable={false} className="object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,8,.15)_0%,rgba(4,10,8,.9)_100%)]" />
              <div className="absolute bottom-3 left-6 right-6 sm:left-8 sm:right-8">
                <h2 className="text-xl font-semibold text-white">Expedition complete</h2>
                <p className="mt-1 text-sm text-white/50">
                  {region ? `${region.name} · ` : ""}{bag.length} caught · {escapedCount} escaped
                </p>
              </div>
            </div>
            <div className="p-6 sm:p-8">

            {bag.length > 0 ? (
              <ul className="mt-2 space-y-3">
                {bag.map((wild) => (
                  <li
                    key={wild.name}
                    className="flex items-center gap-4 rounded-2xl border border-white/[.06] bg-black/40 p-3"
                  >
                    <div className="h-20 w-20 shrink-0">
                      <WildSnakeArt wild={wild} mini />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-bold text-white">{wild.name}</div>
                        {wild.gravid && <GravidBadge />}
                      </div>
                      <div className="mt-0.5 text-xs text-white/50">
                        {wild.locality} · {wild.sex} · {wild.lifeStage}
                        {wild.lifeStage === "Neonate" ? ` · ${wild.neonateColor} neonate` : ""}
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
              <p className="mt-2 text-sm leading-6 text-white/50">
                No snakes this time — the canopy kept its secrets. Try another expedition.
              </p>
            )}

            {bag.length > 0 && !sent && (
              <button
                type="button"
                onClick={bringHome}
                className="mt-6 w-full rounded-2xl bg-emerald-300 px-6 py-4 text-base font-bold text-[#06100c] transition hover:bg-emerald-200 active:scale-[.99]"
              >
                Bring {bag.length === 1 ? "it" : `all ${bag.length}`} home to the colony
              </button>
            )}

            {sent && (
              <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[.07] p-4 text-center">
                <p className="text-sm font-bold text-emerald-200">
                  {bag.length} {bag.length === 1 ? "snake" : "snakes"} added to your colony.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 text-sm font-semibold text-emerald-100 underline decoration-emerald-200/30 underline-offset-4 transition hover:text-white"
                >
                  Back to the game
                </button>
              </div>
            )}

            {(sent || bag.length === 0) && (
              <button
                type="button"
                onClick={onExitToGate}
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[.04] px-6 py-3.5 text-sm font-bold text-white/80 transition hover:bg-white/[.08]"
              >
                Plan another expedition
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function TrailStatus({
  region,
  legIndex,
  searchesLeft,
  bagCount,
  grove = false,
}: {
  region: CanopyRegion | null;
  legIndex: number;
  searchesLeft: number;
  bagCount: number;
  grove?: boolean;
}) {
  return (
    <div className="mb-3 text-center">
      {region && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/60">
            {grove ? `Grove ${legIndex + 1} of ${GROVES_PER_EXPEDITION}` : `Leg ${legIndex + 1} of ${GROVES_PER_EXPEDITION} — choose your path`}
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{region.name}</div>
          <p className="mt-0.5 text-xs text-white/40">{region.tagline}</p>
        </>
      )}
      <div className="mx-auto mt-3 flex max-w-md items-center justify-between rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">
          Searches left · <span className="text-emerald-200">{searchesLeft}</span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">
          Bagged · <span className="text-emerald-200">{bagCount}</span>
        </span>
      </div>
    </div>
  );
}
