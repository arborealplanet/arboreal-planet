"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  EXPEDITION_PYTHONS,
  EXPEDITION_SEARCHES,
  EXPEDITION_RANK_LINES,
  CANOPY_LOCALITIES,
  CANOPY_REGION_PLANTS,
  CANOPY_REGION_TREES,
  SHED_FIND_CHANCE,
  SHED_FIND_CHANCE_SLOUGHING,
  TRAIL_SIGN_LABELS,
  atmosphereForRegion,
  createGroveSpots,
  examineShedClue,
  generateWildSnake,
  loadCanopyCodex,
  nightPhaseForLeg,
  nightfallForLeg,
  randomEscapeLine,
  randomShedLine,
  recordCanopyCodex,
  rollBatSwarm,
  rollEmptyTrailSign,
  rollLifeStage,
  rollNightEvent,
  rollPythonTrailSign,
  rollRegion,
  rollShedFind,
  rollZoneCenter,
  scoreExpedition,
  sweepMsForLeg,
  type CanopyAtmosphere,
  type CanopyLifeStage,
  type CanopyLocality,
  type CanopyRegion,
  type ExpeditionRank,
  type GroveSpot,
  type NightEventKind,
  type TrailSignKind,
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
/** Searches refresh at every grove: each grove is always reachable, and the
 *  choice is which hiding spots to spend them on. */
const SEARCHES_PER_GROVE = EXPEDITION_SEARCHES / GROVES_PER_EXPEDITION;

// Keyed variants: edge-connected black flood-filled to transparent at build
// time, so the art composites solidly with normal blending (no screen-blend
// ghosting on the dark trail).
const TREE_ARTS = [
  "/arcade/canopy-hunter/tree-keyed.webp",
  "/arcade/canopy-hunter/tree-2-keyed.webp",
  "/arcade/canopy-hunter/tree-3-keyed.webp",
];
const BANNER_ART = "/arcade/canopy-hunter/canopy-banner.webp";
const CATCH_ART = "/arcade/canopy-hunter/catch-backdrop.webp";
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
/** Unused coiled-python illustration, repurposed as the results-screen quarry art. */
const PYTHON_ART = "/arcade/canopy-hunter/python.webp";

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
  spots: GroveSpot[];
  /** Index into spots hiding the python, or null when this trail is empty. */
  pythonSpot: number | null;
  /**
   * The hidden python's life stage, pre-rolled so the hiding spot matches:
   * adults hunt the tall trees, neonates hide in the low plants. Null when
   * the region has no plant art (height mechanic off) or the trail is empty.
   */
  pythonLifeStage: CanopyLifeStage | null;
  /**
   * The briefing's promised "sign": rustling leaves, a fresh shed, heavy
   * tracks — or, rarely, the enormous shed that marks a trophy grove.
   * Cold trails sometimes lie with a stale shed.
   */
  sign: TrailSignKind | null;
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

function SpotArt({ src, dimmed, swayDelay }: { src: string; dimmed: boolean; swayDelay: number }) {
  return (
    <Image
      src={src}
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

/** The region's keyed tree set once its art lands, else the shared set. */
function regionTreeSet(region: CanopyRegion | null): string[] {
  const set = region ? CANOPY_REGION_TREES[region.id] : [];
  return set.length > 0 ? set : TREE_ARTS;
}

/**
 * Art for a grove hiding spot: the region's tall trees or low plants.
 * Plant spots only exist once the region's plant art has landed.
 */
function artForSpot(region: CanopyRegion | null, spot: GroveSpot): string {
  if (spot.kind === "plant") {
    const set = region ? CANOPY_REGION_PLANTS[region.id] : [];
    return set[spot.variant % set.length];
  }
  const set = regionTreeSet(region);
  return set[spot.variant % set.length];
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

function Fireflies({ count = 8, color = "#fef9c3" }: { count?: number; color?: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
            left: `${8 + ((i * 37) % 84)}%`,
            top: `${18 + ((i * 53) % 52)}%`,
            animation: `ch-firefly ${3 + (i % 4)}s ease-in-out ${i * 0.6}s infinite`,
          }}
        />
      ))}
    </>
  );
}

/**
 * Regional scenery: color grade, drifting fog, and fireflies layered
 * over the trail and grove scenes, deepening as the night wears on. Pure
 * CSS over the existing art — when painted region backdrops exist, the
 * region config's `backdrop` path layers in underneath automatically.
 */
function NightAtmosphere({
  region,
  legIndex,
  compact = false,
  showBackdrop = true,
}: {
  region: CanopyRegion | null;
  legIndex: number;
  compact?: boolean;
  /**
   * The trail scene passes false: its fork paintings are the base layer
   * and a region backdrop would bury them. Painted scenery lives in the
   * grove scene, where the player actually hunts.
   */
  showBackdrop?: boolean;
}) {
  if (!region) return null;
  const atmo: CanopyAtmosphere = atmosphereForRegion(region);
  const nightfall = nightfallForLeg(legIndex);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {showBackdrop && atmo.backdrop && (
        <Image
          src={atmo.backdrop}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 640px) 100vw, 48rem"
          draggable={false}
          className="object-cover"
        />
      )}
      {/* regional color grade */}
      <div className="absolute inset-0" style={{ background: atmo.grade }} />
      {/* the night deepens grove by grove */}
      <div className="absolute inset-0 bg-black" style={{ opacity: nightfall * 0.45 }} />
      {/* drifting fog */}
      <div
        className="absolute -left-10 bottom-[-10%] h-40 w-[70%] rounded-full blur-3xl"
        style={{
          background: atmo.fogTint,
          opacity: atmo.fogOpacity * 0.5,
          animation: "ch-drift 11s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-10 bottom-[-16%] h-48 w-[80%] rounded-full blur-3xl"
        style={{
          background: atmo.fogTint,
          opacity: atmo.fogOpacity * 0.35,
          animation: "ch-drift 14s ease-in-out 2s infinite reverse",
        }}
      />
      <Fireflies
        count={compact ? Math.max(3, Math.floor(atmo.fireflies / 2)) : atmo.fireflies}
        color={atmo.fireflyColor}
      />
    </div>
  );
}

/**
 * The briefing's promised "sign": fluttering leaves, a fresh shed, heavy
 * tracks — or the enormous shed that marks a trophy grove. Pure CSS so it
 * stays crisp at any size.
 */
function TrailSign({ kind }: { kind: TrailSignKind }) {
  const styles: Record<TrailSignKind, { chip: string; text: string }> = {
    rustle: { chip: "bg-emerald-300/85", text: "text-emerald-200/75" },
    shed: { chip: "bg-amber-200/85", text: "text-amber-200/80" },
    tracks: { chip: "bg-sky-300/85", text: "text-sky-200/80" },
    legendary: { chip: "bg-yellow-300", text: "text-yellow-200" },
    stale: { chip: "bg-white/30", text: "text-white/35" },
  };
  const s = styles[kind];
  return (
    <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2" aria-hidden="true">
      <span className="flex items-end justify-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block h-2.5 w-1.5 rounded-[50%_0] ${s.chip} ${kind === "legendary" ? "animate-pulse" : ""}`}
            style={{ animation: `ch-rustle 1.6s ease-in-out ${i * 0.28}s infinite` }}
          />
        ))}
      </span>
      <span className={`mt-1 block whitespace-nowrap text-center text-[9px] font-black uppercase tracking-[.18em] ${s.text}`}>
        {TRAIL_SIGN_LABELS[kind].label}
      </span>
    </span>
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
  const [searchesLeft, setSearchesLeft] = useState(SEARCHES_PER_GROVE);
  /** Total searches across all groves this expedition (for scoring). */
  const [totalSearchesUsed, setTotalSearchesUsed] = useState(0);
  const [bag, setBag] = useState<WildSnake[]>([]);
  const [escapedCount, setEscapedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sheds, setSheds] = useState(0);
  /** A found shed can be examined once for a clue about the grove. */
  const [canExamineShed, setCanExamineShed] = useState(false);
  /** Expedition-wide night event (sloughing season), rolled once per night. */
  const [nightEvent, setNightEvent] = useState<NightEventKind>(null);
  /** Per-grove: a fruit-bat swarm covers the hunter's approach (wider zone). */
  const [batSwarm, setBatSwarm] = useState(false);
  /** Locality codex: every locality ever bagged, persisted across nights. */
  const [codex, setCodex] = useState<CanopyLocality[]>([]);
  /** Localities inked into the codex for the first time tonight. */
  const [newCodexAdds, setNewCodexAdds] = useState<CanopyLocality[]>([]);
  /** Spots whose python escaped this grove — the clues go cold for them. */
  const [escapedSpots, setEscapedSpots] = useState<number[]>([]);
  const [journal, setJournal] = useState<string[]>([]);
  const [groveNote, setGroveNote] = useState<string | null>(null);
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
  const period = sweepMsForLeg(legIndex, reducedMotion ? SWEEP_MS * 2.5 : SWEEP_MS);
  const zoneHalf = (reducedMotion ? 0.2 : ZONE_HALF) * (batSwarm ? 1.35 : 1);

  const resolvedCount = bag.length + escapedCount;
  const phaseName = nightPhaseForLeg(legIndex);
  /** Distant trees on the trail — the region's own set once its art lands. */
  const trailTrees = regionTreeSet(region);
  /** Painted region grove backdrop, when the art exists. */
  const groveBackdrop = region?.id ? atmosphereForRegion(region).backdrop : undefined;

  /** Append a line to the night's field journal. */
  function log(line: string) {
    setJournal((j) => [...j, line]);
  }

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

  /* Auto-advance to results when every python is found. Searches refresh per
     grove, so the night always runs all four groves. */
  useEffect(() => {
    if (phase !== "trail" && phase !== "grove") return;
    if (resolvedCount >= EXPEDITION_PYTHONS) {
      const t = setTimeout(() => setPhase("results"), 700);
      return () => clearTimeout(t);
    }
  }, [phase, resolvedCount]);

  function startExpedition() {
    // User gesture: the one safe moment to wake the Web Audio engine.
    startJungleMusic();
    const expeditionRegion = regionProp ?? rollRegion();
    const regionTrees = CANOPY_REGION_TREES[expeditionRegion.id];
    const regionPlants = CANOPY_REGION_PLANTS[expeditionRegion.id];
    const treeVariants = regionTrees.length > 0 ? regionTrees.length : TREE_ARTS.length;
    const plantVariants = regionPlants.length;
    const nextLegs: Leg[] = [];
    for (let g = 0; g < GROVES_PER_EXPEDITION; g += 1) {
      const trailCount = pickTrailCount();
      const pythonTrail = Math.floor(Math.random() * trailCount);
      const trails: TrailOption[] = [];
      for (let t = 0; t < trailCount; t += 1) {
        const hidesPython = t === pythonTrail;
        const spots = createGroveSpots(treeVariants, plantVariants);
        let pythonSpot: number | null = null;
        let pythonLifeStage: CanopyLifeStage | null = null;
        if (hidesPython) {
          if (plantVariants > 0) {
            // Height mechanic: adults hunt the tall trees, neonates hide low.
            const stage = rollLifeStage();
            const matching = spots
              .map((s, i) => (stage === "Adult" ? s.kind === "tree" : s.kind === "plant") ? i : -1)
              .filter((i) => i >= 0);
            pythonSpot = matching[Math.floor(Math.random() * matching.length)];
            pythonLifeStage = stage;
          } else {
            pythonSpot = Math.floor(Math.random() * spots.length);
          }
        }
        trails.push({
          label: trailLabel(trailCount, t),
          spots,
          pythonSpot,
          pythonLifeStage,
          // The signs aren't always readable — some nights the canopy keeps
          // quiet, and cold trails sometimes lie with a stale shed.
          sign: hidesPython ? rollPythonTrailSign() : rollEmptyTrailSign(),
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
    setSearchesLeft(SEARCHES_PER_GROVE);
    setTotalSearchesUsed(0);
    setBag([]);
    setEscapedCount(0);
    setStreak(0);
    setBestStreak(0);
    setSheds(0);
    setCanExamineShed(false);
    const event = rollNightEvent();
    setNightEvent(event);
    setBatSwarm(false);
    setCodex(loadCanopyCodex());
    setNewCodexAdds([]);
    setJournal([
      `${expeditionRegion.name} — expedition begins at ${atmosphereForRegion(expeditionRegion).nightName}.`,
    ]);
    if (event === "sloughing") {
      setJournal((j) => [
        ...j,
        "The whole canopy is sloughing tonight — sheds everywhere, and every one is a clue waiting to be read.",
      ]);
    }
    setGroveNote(null);
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
    log(`${nightPhaseForLeg(legIndex)} — took the ${trail.label.toLowerCase()} to grove ${legIndex + 1}.`);
    setGroveNote(null);
    setCanExamineShed(false);
    setWalking(true);
    window.setTimeout(() => {
      const wilds: Record<number, WildSnake> = {};
      if (trail.pythonSpot !== null && region) {
        const prime = trail.sign === "legendary";
        wilds[trail.pythonSpot] = generateWildSnake(
          wildIdRef.current,
          region,
          Math.random,
          trail.pythonLifeStage,
          prime,
        );
        wildIdRef.current += 1;
        if (prime) {
          log(`Grove ${legIndex + 1} — the enormous shed wasn't lying. Something exceptional hunts here.`);
        }
      }
      const swarm = rollBatSwarm();
      setBatSwarm(swarm);
      if (swarm) {
        log(`Grove ${legIndex + 1} — a fruit-bat swarm crosses overhead. The snakes won't hear you coming.`);
      }
      setGrove(trail);
      setGroveWilds(wilds);
      setSearched(Array(TREES_PER_GROVE).fill(false));
      setSearchesLeft(SEARCHES_PER_GROVE);
      setCatchTree(null);
      setCatchResolved(false);
      setCatchMessage(null);
      setEscapedSpots([]);
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
    setTotalSearchesUsed((n) => n + 1);
    setGroveNote(null);
    if (groveWilds[index]) {
      setCatchTree(index);
      setZoneCenter(rollZoneCenter());
      setCatchResolved(false);
      setCatchMessage(null);
      setPhase("catch");
    } else if (rollShedFind(Math.random, nightEvent === "sloughing" ? SHED_FIND_CHANCE_SLOUGHING : SHED_FIND_CHANCE)) {
      // Consolation sign: a fresh shed means a python was here tonight —
      // and it can be examined for a clue about the grove.
      const line = randomShedLine();
      setSheds((n) => n + 1);
      setGroveNote(line);
      setCanExamineShed(true);
      log(`Grove ${legIndex + 1} — shed skin found.`);
    }
  }

  /** Read a found shed for clues about the grove's hidden python (if any). */
  function examineShed() {
    if (phase !== "grove" || !canExamineShed || !grove) return;
    const spot = grove.pythonSpot;
    const wild = spot !== null && !escapedSpots.includes(spot) ? groveWilds[spot] ?? null : null;
    const clue =
      wild && bag.includes(wild)
        ? "This shed's owner is already in your bag — nice work."
        : examineShedClue(wild, Math.random);
    setCanExamineShed(false);
    setGroveNote(clue);
    log(`Grove ${legIndex + 1} — shed examined. ${clue}`);
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
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((b) => Math.max(b, nextStreak));
      // Ink the locality into the codex the moment it's bagged.
      const { codex: nextCodex, newlyAdded } = recordCanopyCodex([wild.locality]);
      setCodex(nextCodex);
      if (newlyAdded.length > 0) {
        setNewCodexAdds((prev) => [...prev, ...newlyAdded]);
      }
      log(
        `Grove ${legIndex + 1} — bagged ${wild.name} (${wild.sex.toLowerCase()}, ${wild.lifeStage.toLowerCase()}).` +
          (nextStreak >= 2 ? ` Streak ×${nextStreak}.` : "") +
          (newlyAdded.length > 0 ? ` Codex — ${newlyAdded[0]} documented for the first time!` : ""),
      );
      setCatchMessage(
        wild.gravid
          ? "Bagged! She's gravid — she'll lay her clutch once she's settled in your colony."
          : nextStreak >= 2
            ? `Bagged! Streak ×${nextStreak} — you're on fire.`
            : "Bagged! A new animal for the collection.",
      );
    } else {
      setEscapedCount((n) => n + 1);
      setStreak(0);
      if (catchTree !== null) setEscapedSpots((s) => [...s, catchTree]);
      log(`Grove ${legIndex + 1} — it slipped away.`);
      setCatchMessage(randomEscapeLine());
    }
  }

  function backToGrove() {
    setCatchTree(null);
    setPhase("grove");
  }

  function followTrail() {
    setGroveNote(null);
    if (legIndex + 1 >= GROVES_PER_EXPEDITION) {
      log(`${nightPhaseForLeg(legIndex)} — the night ends.`);
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
  const bestFind =
    bag.length > 0
      ? bag.reduce((a, b) => (b.phenotypeScore > a.phenotypeScore ? b : a))
      : null;
  const searchesUsed = totalSearchesUsed;
  const primeCaught = bag.filter((w) => w.prime).length;
  const score = scoreExpedition(bag.length, bestStreak, escapedCount, searchesUsed, primeCaught);

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
@keyframes ch-firefly { 0%,100% { transform: translate(0,0); opacity: .25; } 50% { transform: translate(10px,-14px); opacity: 1; } }
@keyframes ch-rustle { 0%,100% { transform: rotate(-18deg) translateY(0); opacity: .55; } 50% { transform: rotate(24deg) translateY(-3px); opacity: 1; } }
@keyframes ch-drift { 0%,100% { transform: translateX(-24px); } 50% { transform: translateX(24px); } }`}</style>

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
            <li>· {GROVES_PER_EXPEDITION} groves along the trail, {TREES_PER_GROVE} hiding spots each — search the tall trees and the undergrowth alike.</li>
            <li>· Each grove gives you {SEARCHES_PER_GROVE} searches — spend them wisely, then follow the trail to the next grove.</li>
            <li>· {EXPEDITION_PYTHONS} pythons are hiding out there. At every fork, read the signs — rustling leaves, fresh sheds, heavy tracks. Cold trails sometimes lie.</li>
            <li>· Spot one and grab it before it slips away.</li>
            <li>· Not all ground is equal — common localities show themselves often, legendary ones are ghosts. In pulcher country expect Sorong; pray for Arfak.</li>
            <li>· An enormous shed at a fork marks a trophy grove — something exceptional hunts there.</li>
            <li>· Hunt by height: adults cruise the high branches — search the tall trees. Neonates hide low — check the undergrowth.</li>
            <li>· Each expedition heads to one of four regions — tonight&apos;s snakes all come from the same corner of New Guinea, and each region hunts under its own sky.</li>
            <li>· The night deepens as you go — Dusk, Nightfall, Deep night, Blue hour — and the snakes get warier (and quicker) the later it gets.</li>
            <li>· Chain clean grabs for a streak. Your night earns a hunter&apos;s rank, S through D.</li>
            <li>· Empty trees sometimes turn up fresh shed skins — examine one and it&apos;ll tell you what&apos;s hiding in the grove.</li>
            <li>· Every bagged locality is inked into your codex — document all {CANOPY_LOCALITIES.length}.</li>
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
          <TrailStatus region={region} legIndex={legIndex} searchesLeft={searchesLeft} bagCount={bag.length} streak={streak} phaseName={phaseName} />
          <div className={`relative aspect-[4/3] overflow-hidden rounded-[26px] border border-white/[.07] transition-all duration-700 sm:aspect-[16/9] ${walking ? "scale-110 opacity-0" : "scale-100 opacity-100"}`}>
            <Image src={pathArtForTrailCount(currentTrails.length)} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 48rem" draggable={false} className="object-cover" />
            <NightAtmosphere region={region} legIndex={legIndex} showBackdrop={false} />
            {/* Distant trees near the vanishing point sell the depth (keyed art, plain opacity dimming) */}
            <div className="absolute left-[37%] top-[24%] w-16 opacity-90 sm:w-20">
              <div className="relative aspect-[3/4] brightness-[.55]">
                <SpotArt src={trailTrees[(legIndex + 1) % trailTrees.length]} dimmed={false} swayDelay={0.4} />
              </div>
            </div>
            <div className="absolute right-[37%] top-[24%] w-16 opacity-90 sm:w-20">
              <div className="relative aspect-[3/4] brightness-[.55]">
                <SpotArt src={trailTrees[(legIndex + 2) % trailTrees.length]} dimmed={false} swayDelay={1.3} />
              </div>
            </div>
            {/* Trail choices sit on the path ahead */}
            {currentTrails.map((trail, i) => (
              <div key={i} className="absolute z-10" style={trailButtonPos(currentTrails.length, i)}>
                {trail.sign && <TrailSign kind={trail.sign} />}
                <button
                  type="button"
                  onClick={() => chooseTrail(i)}
                  disabled={walking}
                  className="max-w-[7rem] rounded-full border border-amber-200/30 bg-black/65 px-4 py-2.5 text-center backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-amber-200/60 hover:bg-black/80 active:scale-95 disabled:opacity-60 sm:max-w-[11rem]"
                >
                  <span className="text-[11px] font-black uppercase tracking-[.14em] text-amber-100">{trail.label}</span>
                </button>
              </div>
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
            {currentTrails.length <= 1 ? "One way forward." : "Read the signs — sheds, tracks and rustling leaves all talk. Cold trails sometimes lie."}
          </p>
        </div>
      )}

      {/* Grove — search the trees */}
      {phase === "grove" && grove && (
        <div className="mt-8">
          <TrailStatus region={region} legIndex={legIndex} searchesLeft={searchesLeft} bagCount={bag.length} streak={streak} phaseName={phaseName} grove />
          <div className="relative overflow-hidden rounded-[26px] border border-white/[.07]">
            {!groveBackdrop && (
              <Image src={PATH_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 48rem" draggable={false} className="object-cover brightness-[.38]" />
            )}
            <NightAtmosphere region={region} legIndex={legIndex} compact />
            <div className="relative flex items-end justify-center gap-2 px-4 pb-8 pt-10 sm:gap-6">
              {grove.spots.map((spot, i) => {
                const wasSearched = searched[i];
                const showPython = wasSearched && grove.pythonSpot === i;
                const isTree = spot.kind === "tree";
                const spotName = isTree ? "tree" : "undergrowth";
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => searchTree(i)}
                    disabled={wasSearched}
                    aria-label={wasSearched ? (showPython ? `${spotName} ${i + 1}: python found` : `${spotName} ${i + 1}: searched, empty`) : `Search ${isTree ? `tree ${i + 1}` : `the undergrowth`}`}
                    className={`group relative aspect-[3/4] transition active:scale-95 ${
                      isTree
                        ? i === 1
                          ? "w-24 -translate-y-3 sm:w-32"
                          : "w-32 sm:w-44"
                        : "w-20 sm:w-28"
                    } ${wasSearched ? "" : "hover:drop-shadow-[0_0_20px_rgba(52,211,153,.35)]"}`}
                  >
                    <div className={`absolute inset-0 transition-opacity duration-500 ${wasSearched && !showPython ? "opacity-60" : ""}`}>
                      <SpotArt src={artForSpot(region, spot)} dimmed={wasSearched && !showPython} swayDelay={(i % 5) * 0.7} />
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
          {grove.pythonSpot === null && searched.every(Boolean) && (
            <p className="mt-3 text-center text-xs italic text-white/40">Only leaves — the signs misled you this time.</p>
          )}
          {groveNote && (
            <p className="mt-3 text-center text-xs font-semibold text-amber-200/80">{groveNote}</p>
          )}
          {canExamineShed && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={examineShed}
                className="rounded-full border border-amber-200/30 bg-amber-200/[.07] px-5 py-2 text-xs font-bold uppercase tracking-[.14em] text-amber-100 transition hover:bg-amber-200/[.14] active:scale-95"
              >
                Examine the shed
              </button>
            </div>
          )}
          {nightEvent === "sloughing" && (
            <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[.16em] text-amber-200/60">
              Sloughing night — sheds everywhere, every one a clue
            </p>
          )}
          {legIndex >= 2 && (
            <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-[.16em] text-white/35">
              The night deepens — the snakes are warier now
            </p>
          )}
          <button
            type="button"
            onClick={followTrail}
            className="mt-4 w-full rounded-2xl border border-emerald-300/25 bg-emerald-300/[.07] px-6 py-3.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/[.12] active:scale-[.99]"
          >
            {legIndex + 1 >= GROVES_PER_EXPEDITION ? "Finish the expedition →" : "Follow the trail →"}
          </button>
          <p className="mt-3 text-center text-xs text-white/35">Tap a tree or the undergrowth to search it — or move on down the trail.</p>
        </div>
      )}

      {/* Catch */}
      {phase === "catch" && currentWild && (
        <div className="mx-auto mt-8 max-w-xl overflow-hidden rounded-[26px] border border-white/[.07] bg-white/[.02]">
          <div className="relative">
            <div className="relative h-40 sm:h-48">
              <Image src={CATCH_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 36rem" draggable={false} className="object-cover" />
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
                {streak >= 1 && (
                  <p className="mb-3 text-center">
                    <span className="inline-block rounded-full border border-orange-300/30 bg-orange-400/10 px-4 py-1 text-[11px] font-black uppercase tracking-[.16em] text-orange-200">
                      Streak ×{streak} — keep it hot
                    </span>
                  </p>
                )}
                <p className="text-center text-xs uppercase tracking-[.16em] text-white/40">
                  Tap grab when the marker is in the green
                </p>
                {batSwarm && (
                  <p className="mt-2 text-center text-[11px] font-bold uppercase tracking-[.14em] text-sky-200/70">
                    Bat swarm overhead — wider green zone
                  </p>
                )}
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
            <div className="relative h-44 sm:h-52">
              <Image src={PYTHON_ART} alt="" aria-hidden="true" fill sizes="(max-width: 640px) 100vw, 36rem" draggable={false} className="object-cover object-top" />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(4,10,8,.30)_0%,rgba(4,10,8,.92)_100%)]" />
              <div className="absolute bottom-3 left-6 right-6 sm:left-8 sm:right-8">
                <h2 className="text-xl font-semibold text-white">Expedition complete</h2>
                <p className="mt-1 text-sm text-white/50">
                  {region ? `${region.name} · ` : ""}{bag.length} caught · {escapedCount} escaped
                </p>
              </div>
              <div
                className={`absolute bottom-4 right-6 grid h-16 w-16 place-items-center rounded-full border-2 bg-black/70 backdrop-blur-sm sm:right-8 ${RANK_STYLES[score.rank]}`}
                title={`Hunter rank ${score.rank} · ${score.points} pts`}
              >
                <span className="text-3xl font-black">{score.rank}</span>
              </div>
            </div>
            <div className="p-6 sm:p-8">

            <p className="text-center text-sm italic text-white/55">{EXPEDITION_RANK_LINES[score.rank]}</p>
            <p className="mt-1 text-center text-[11px] text-white/35">
              Hunter rank {score.rank} · {score.points} pts — +40 per catch, +10 per streak best, −10 per escape, −5 per search past the fourth, +10 per trophy animal
            </p>

            {bag.length > 0 ? (
              <>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3 text-[11px] font-semibold uppercase tracking-[.14em] text-white/50">
                  <span>
                    Found · <span className="text-emerald-200">{bag.length}/{EXPEDITION_PYTHONS}</span>
                  </span>
                  <span>
                    Best streak · <span className="text-emerald-200">×{bestStreak}</span>
                  </span>
                  <span>
                    Sheds · <span className="text-emerald-200">{sheds}</span>
                  </span>
                  <span>
                    Searches used · <span className="text-emerald-200">{searchesUsed}</span>
                  </span>
                  <span>
                    Escaped · <span className="text-emerald-200">{escapedCount}</span>
                  </span>
                  {primeCaught > 0 && (
                    <span>
                      Trophies · <span className="text-amber-200">{primeCaught}</span>
                    </span>
                  )}
                </div>
                {bestFind && (
                  <p className="mt-3 text-center text-sm">
                    <span className="text-[10px] font-black uppercase tracking-[.16em] text-amber-200/70">Best find · </span>
                    <span className="font-bold text-amber-100">{bestFind.name}</span>
                    <span className="text-white/50"> — phenotype {bestFind.phenotypeScore}</span>
                  </p>
                )}
              </>
            ) : null}

            {codex.length > 0 && (
              <div className="mt-4 rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
                <p className="text-center text-[10px] font-black uppercase tracking-[.16em] text-white/40">
                  Locality codex · <span className="text-emerald-200">{codex.length}/{CANOPY_LOCALITIES.length}</span> documented
                </p>
                <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                  {CANOPY_LOCALITIES.map((loc) => {
                    const found = codex.includes(loc);
                    const isNew = newCodexAdds.includes(loc);
                    return (
                      <span
                        key={loc}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.1em] ${
                          found
                            ? "border-emerald-300/30 bg-emerald-300/[.08] text-emerald-100"
                            : "border-white/10 text-white/25"
                        } ${isNew ? "ring-1 ring-amber-300/60" : ""}`}
                      >
                        {loc}
                        {isNew && <span className="text-amber-300"> · new</span>}
                      </span>
                    );
                  })}
                </div>
                {newCodexAdds.length > 0 && (
                  <p className="mt-2 text-center text-xs font-semibold text-amber-200/80">
                    New {newCodexAdds.length === 1 ? "locality" : "localities"} inked tonight: {newCodexAdds.join(", ")}
                  </p>
                )}
              </div>
            )}

            {bag.length > 0 ? (
              <ul className="mt-4 space-y-3">
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
                        {wild.prime && (
                          <span className="rounded-full border border-yellow-300/40 bg-yellow-300/[.1] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.14em] text-yellow-200">
                            Trophy
                          </span>
                        )}
                        {bestFind && wild.name === bestFind.name && (
                          <span className="rounded-full border border-amber-200/30 bg-amber-200/[.08] px-2 py-0.5 text-[9px] font-black uppercase tracking-[.14em] text-amber-200">
                            Best find
                          </span>
                        )}
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

            {journal.length > 0 && (
              <div className="mt-6 rounded-2xl border border-white/[.07] bg-black/30 p-4 sm:p-5">
                <h3 className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">
                  Field notes
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {journal.map((line, i) => (
                    <li key={i} className="text-xs leading-5 text-white/55">
                      <span className="mr-2 text-emerald-300/50">·</span>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
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

/** Rank badge colors for the results screen. */
const RANK_STYLES: Record<ExpeditionRank, string> = {
  S: "border-amber-300/60 text-amber-300 shadow-[0_0_30px_rgba(252,211,77,.25)]",
  A: "border-emerald-300/60 text-emerald-300 shadow-[0_0_30px_rgba(110,231,183,.20)]",
  B: "border-sky-300/50 text-sky-300",
  C: "border-white/25 text-white/70",
  D: "border-white/15 text-white/40",
};

function TrailStatus({
  region,
  legIndex,
  searchesLeft,
  bagCount,
  streak,
  phaseName,
  grove = false,
}: {
  region: CanopyRegion | null;
  legIndex: number;
  searchesLeft: number;
  bagCount: number;
  streak: number;
  phaseName: string;
  grove?: boolean;
}) {
  return (
    <div className="mb-3 text-center">
      {region && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-200/60">
            {grove ? `Grove ${legIndex + 1} of ${GROVES_PER_EXPEDITION}` : `Leg ${legIndex + 1} of ${GROVES_PER_EXPEDITION} — choose your path`} · {phaseName}
          </div>
          <div className="mt-1 text-lg font-semibold text-white">{region.name}</div>
          <p className="mt-0.5 text-xs text-white/40">{region.tagline}</p>
        </>
      )}
      <div className="mx-auto mt-3 flex max-w-md items-center justify-between rounded-2xl border border-white/[.07] bg-white/[.02] px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">
          Searches this grove · <span className="text-emerald-200">{searchesLeft}</span>
        </span>
        <span className={`text-xs font-semibold uppercase tracking-[.14em] ${streak >= 2 ? "text-orange-200" : "text-white/50"}`}>
          Streak · <span className={streak >= 2 ? "text-orange-200" : "text-emerald-200"}>×{streak}</span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-[.14em] text-white/50">
          Bagged · <span className="text-emerald-200">{bagCount}</span>
        </span>
      </div>
    </div>
  );
}
