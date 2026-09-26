"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BEST_CEREMONY_KEY,
  BEST_ENDLESS_KEY,
  CEREMONY_SNAKES,
  DEEP_SCAN_COST,
  EARLY_BONUS_PER_PROBE,
  HAT_LINES,
  HOUSES,
  HOUSE_BY_ID,
  HOUSE_POINTS,
  LOCALITY_POINTS,
  PROBE_META,
  RANKS,
  SNAKES,
  rankFor,
  readBest,
  shuffle,
  speedBonus,
  writeBest,
  type HouseId,
  type ProbeKind,
  type SortingSnake,
} from "@/lib/snake-sorting";

type Phase =
  | "title"
  | "arrive"
  | "scan"
  | "sort"
  | "deliberate"
  | "reveal"
  | "locality"
  | "localityReveal"
  | "results";

type Mode = "ceremony" | "endless";

const ASSET = "/arcade/snake-sorting";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(t: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
    t,
  );
}

/* ------------------------------- sound ---------------------------------- */

/* Haptics: a gentle buzz on reveals for phones that support it. */
function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* no haptics — stay still */
  }
}

const MUTE_KEY = "snake_sorter_muted_v1";

function useSynth(mutedRef: React.MutableRefObject<boolean>) {  const ctxRef = useRef<AudioContext | null>(null);

  const tone = (
    freq: number,
    dur = 0.15,
    type: OscillatorType = "sine",
    when = 0,
    vol = 0.1,
  ) => {
    if (mutedRef.current) return;
    try {
      if (!ctxRef.current) {
        const AC =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch {
      /* audio unavailable — stay silent */
    }
  };

  return {
    tick: () => tone(660, 0.08, "triangle", 0, 0.05),
    chime: () => {
      tone(523, 0.12, "triangle", 0, 0.09);
      tone(784, 0.2, "triangle", 0.1, 0.09);
    },
    buzz: () => tone(138, 0.32, "sawtooth", 0, 0.07),
    slam: () => {
      tone(98, 0.28, "sine", 0, 0.16);
      tone(196, 0.22, "triangle", 0.05, 0.07);
    },
    sparkle: () => {
      tone(880, 0.1, "sine", 0, 0.07);
      tone(1174, 0.1, "sine", 0.08, 0.07);
      tone(1568, 0.18, "sine", 0.16, 0.07);
    },
  };
}

/* ------------------------------ hat bubble ------------------------------ */

function HatBubble({ line }: { line: string }) {
  const [count, setCount] = useState(0);
  const done = count >= line.length;
  const shown = line.slice(0, count);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => {
      setCount((c) => Math.min(c + 2, line.length));
    }, 22);
    return () => clearInterval(id);
  }, [line, done]);

  return (
    <button
      type="button"
      onClick={() => setCount(line.length)}
      className="min-h-[3.5rem] flex-1 rounded-2xl rounded-tl-md border border-amber-100/15 bg-black/60 px-3.5 py-2.5 text-left backdrop-blur-sm"
    >
      <p className="text-[13px] leading-snug text-amber-50/95">
        {shown}
        {!done && <span className="animate-pulse text-amber-200">▍</span>}
      </p>
    </button>
  );
}

/* ------------------------------ house crest ----------------------------- */

function Crest({ house, size = 44 }: { house: HouseId; size?: number }) {
  const h = HOUSE_BY_ID[house];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${h.name} crest`}
    >
      <circle cx="32" cy="32" r="30" fill="#0b0f0d" stroke="#d4af37" strokeWidth="2.5" />
      <circle cx="32" cy="32" r="25" fill={h.color} opacity="0.16" />
      {/* coiled serpent sigil */}
      <g
        fill="none"
        stroke={h.color}
        strokeWidth="4"
        strokeLinecap="round"
      >
        <path d="M32 46 C20 46 14 39 14 32 C14 24 21 19 28 19 C34 19 39 23 39 28 C39 32 36 35 32 35 C29 35 27 33 27 31" />
        <path d="M39 28 L47 24 L43 32 Z" fill={h.color} stroke="none" />
      </g>
      <circle cx="44.5" cy="27.5" r="1.6" fill="#0b0f0d" />
    </svg>
  );
}

/* -------------------------------- sparkles ------------------------------ */

function Sparkles({ color, seed = 1 }: { color: string; seed?: number }) {
  const pieces = Array.from({ length: 26 }, (_, i) => {
    const left = ((i * 37 + seed * 53) % 100).toFixed(1);
    const delay = (((i * 29 + seed * 17) % 900) / 1000).toFixed(2);
    const size = 5 + ((i * 13 + seed * 7) % 6);
    return { left, delay, size, i };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.i}
          className="ss-sparkle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: color,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------ photo plate ----------------------------- */

function PhotoPlate({
  snake,
  probing,
  reducedMotion,
}: {
  snake: SortingSnake;
  probing: ProbeKind | null;
  reducedMotion: boolean;
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_0_60px_rgba(45,212,191,.12)]">
      {snake.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={snake.photo}
          alt={`Specimen ${snake.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,.08),transparent_70%)] px-6 text-center">
          <span className="text-5xl text-teal-200/30">?</span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-teal-100/50">
            Snake photo
          </p>
          <p className="text-[11px] leading-snug text-white/35">
            Specimen {snake.name} — drop{" "}
            <code className="text-teal-200/60">{snake.id}.webp</code> into
            /arcade/snake-sorting/snakes/
          </p>
        </div>
      )}

      {/* specimen tag */}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-1 backdrop-blur-sm">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{
            background: snake.neonate === "red" ? "#ef4444" : "#facc15",
            boxShadow: `0 0 8px ${snake.neonate === "red" ? "#ef4444" : "#facc15"}`,
          }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Neonate: {snake.neonate}
        </span>
      </div>

      {/* scan frame */}
      <div className="pointer-events-none absolute inset-3" aria-hidden>
        <span className="ss-corner left-0 top-0 border-l-2 border-t-2 border-teal-300/80" />
        <span className="ss-corner right-0 top-0 border-r-2 border-t-2 border-teal-300/80" />
        <span className="ss-corner bottom-0 left-0 border-b-2 border-l-2 border-teal-300/80" />
        <span className="ss-corner bottom-0 right-0 border-b-2 border-r-2 border-teal-300/80" />
        {probing && !reducedMotion && <span className="ss-laser" />}
        {probing && reducedMotion && (
          <span className="absolute inset-x-0 top-1/2 h-0.5 bg-teal-300/80" />
        )}
      </div>
    </div>
  );
}

/* --------------------------------- game --------------------------------- */

interface Gain {
  house: number;
  speed: number;
  streakBonus: number;
  earlyBonus: number;
  locality: number;
}

interface RecapEntry {
  snakeId: string;
  name: string;
  pickedHouse: HouseId;
  house: HouseId;
  houseCorrect: boolean;
  locality: string | null;
  localityCorrect: boolean | null;
}

/* Best-score store. useSyncExternalStore with a server snapshot of 0 keeps
   SSR HTML and the hydrated client in agreement for returning players —
   their stored best appears right after hydration, never as a mismatch. */
const bestListeners = new Set<() => void>();
function notifyBest() {
  bestListeners.forEach((cb) => cb());
}

function useBestScore(key: string): readonly [number, (v: number) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      bestListeners.add(cb);
      return () => {
        bestListeners.delete(cb);
      };
    },
    () => readBest(key),
    () => 0,
  );
  const setBest = (v: number) => {
    writeBest(key, v);
    notifyBest();
  };
  return [value, setBest] as const;
}

export function SnakeSorting() {
  const [phase, setPhase] = useState<Phase>("title");
  const [mode, setMode] = useState<Mode>("ceremony");
  const [order, setOrder] = useState<SortingSnake[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [housesCorrect, setHousesCorrect] = useState(0);
  const [houseAttempts, setHouseAttempts] = useState(0);
  const [localitiesCorrect, setLocalitiesCorrect] = useState(0);
  const [localitiesOffered, setLocalitiesOffered] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [probed, setProbed] = useState<ProbeKind[]>([]);
  const [probing, setProbing] = useState<ProbeKind | null>(null);
  const [deepUsed, setDeepUsed] = useState<boolean>(false);
  const [earlyBonus, setEarlyBonus] = useState(0);
  const [pickedHouse, setPickedHouse] = useState<HouseId | null>(null);
  const [pickedLocality, setPickedLocality] = useState<string | null>(null);
  const [houseWasCorrect, setHouseWasCorrect] = useState(false);
  const [localityWasCorrect, setLocalityWasCorrect] = useState(false);
  const [gain, setGain] = useState<Gain>({ house: 0, speed: 0, streakBonus: 0, earlyBonus: 0, locality: 0 });
  const [hatLine, setHatLine] = useState(HAT_LINES.greetings[0]);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bestCeremony, setBestCeremony] = useBestScore(BEST_CEREMONY_KEY);
  const [bestEndless, setBestEndless] = useBestScore(BEST_ENDLESS_KEY);
  const [muted, setMuted] = useState(() => {
    try {
      return window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [showHow, setShowHow] = useState(false);
  const [recap, setRecap] = useState<RecapEntry[]>([]);

  const timeouts = useRef<number[]>([]);
  const sortElapsedMs = useRef(0);
  const mutedRef = useRef(false);
  const scoreRef = useRef(0);
  const synth = useSynth(mutedRef);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const snake = order[idx];

  useEffect(() => {
    mutedRef.current = muted;
    try {
      window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* storage unavailable — mute lasts the session */
    }
  }, [muted]);

  useEffect(
    () => () => {
      timeouts.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  /* Elapsed-time ticker for the sort-phase speed bonus. Tick-based rather
     than Date.now() so the speed bonus stays measurable without impure
     clock reads in the component body. */
  useEffect(() => {
    if (phase !== "sort") return;
    sortElapsedMs.current = 0;
    const id = window.setInterval(() => {
      sortElapsedMs.current += 250;
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timeouts.current.push(id);
  };

  const setScoreBoth = (v: number) => {
    scoreRef.current = v;
    setScore(v);
  };

  const addScore = (d: number) => setScoreBoth(Math.max(0, scoreRef.current + d));

  const resetSnakeState = () => {
    setProbed([]);
    setProbing(null);
    setDeepUsed(false);
    setEarlyBonus(0);
    setPickedHouse(null);
    setPickedLocality(null);
    setHouseWasCorrect(false);
    setLocalityWasCorrect(false);
    setGain({ house: 0, speed: 0, streakBonus: 0, earlyBonus: 0, locality: 0 });
  };

  const enterScan = () => {
    setPhase("scan");
    setHatLine(pick(HAT_LINES.scanIntro));
  };

  const startGame = (m: Mode) => {
    timeouts.current.forEach((t) => window.clearTimeout(t));
    timeouts.current = [];
    const shuffled = shuffle(SNAKES);
    setMode(m);
    setOrder(m === "ceremony" ? shuffled.slice(0, CEREMONY_SNAKES) : shuffled);
    setIdx(0);
    setScoreBoth(0);
    setStreak(0);
    setBestStreak(0);
    setHousesCorrect(0);
    setHouseAttempts(0);
    setLocalitiesCorrect(0);
    setLocalitiesOffered(0);
    setStrikes(0);
    setIsNewBest(false);
    setRecap([]);
    resetSnakeState();
    setPhase("arrive");
    setHatLine(pick(HAT_LINES.arrive));
    synth.tick();
    later(1700, enterScan);
  };

  const advanceToNextSnake = () => {
    resetSnakeState();
    const lastIdx = order.length - 1;
    if (mode === "ceremony") {
      if (idx >= lastIdx) {
        finishGame();
        return;
      }
      setIdx(idx + 1);
    } else {
      if (idx >= lastIdx) {
        setOrder(shuffle(SNAKES));
        setIdx(0);
      } else {
        setIdx(idx + 1);
      }
    }
    setPhase("arrive");
    setHatLine(pick(HAT_LINES.arrive));
    later(1500, enterScan);
  };

  const finishGame = () => {
    const finalScore = scoreRef.current;
    const prevBest = mode === "ceremony" ? bestCeremony : bestEndless;
    if (finalScore > prevBest) {
      setIsNewBest(true);
      if (mode === "ceremony") setBestCeremony(finalScore);
      else setBestEndless(finalScore);
    }
    const r = rankFor(finalScore);
    const farewell =
      finalScore >= 1800
        ? HAT_LINES.farewell.master
        : finalScore >= 1400
          ? HAT_LINES.farewell.sage
          : finalScore >= 1000
            ? HAT_LINES.farewell.scholar
            : finalScore >= 600
              ? HAT_LINES.farewell.coilkeeper
              : HAT_LINES.farewell.hatchling;
    setHatLine(`${r.title}. ${farewell}`);
    setPhase("results");
    synth.sparkle();
  };

  const probe = (kind: ProbeKind) => {
    if (phase !== "scan" || probing || probed.includes(kind)) return;
    setProbing(kind);
    synth.tick();
    later(950, () => {
      setProbing(null);
      setProbed((p) => {
        const next = [...p, kind];
        if (next.length >= 3) {
          setHatLine(pick(HAT_LINES.allProbed));
        } else {
          setHatLine(pick(HAT_LINES.probeDone));
        }
        return next;
      });
    });
  };

  const deepScan = () => {
    if (phase !== "scan" || deepUsed || probing) return;
    setDeepUsed(true);
    addScore(-DEEP_SCAN_COST);
    setHatLine(HAT_LINES.deepScan);
    synth.sparkle();
  };

  const beginSort = () => {
    if (phase !== "scan") return;
    // Early-call bonus: +25 per probe left unrevealed. Deep Scan forfeits it.
    const bonus = deepUsed ? 0 : (3 - probed.length) * EARLY_BONUS_PER_PROBE;
    setEarlyBonus(bonus);
    setPhase("sort");
    setHatLine(
      bonus > 0 ? pick(HAT_LINES.earlyCall) : "The probes are spent. Now, keeper — call its House!",
    );
    synth.tick();
  };

  const pickHouse = (id: HouseId) => {
    if (phase !== "sort" || !snake) return;
    const elapsedMs = sortElapsedMs.current;
    setPickedHouse(id);
    setPhase("deliberate");
    setHatLine(pick(HAT_LINES.deliberating));
    later(1900, () => revealHouse(id, elapsedMs));
  };

  const revealHouse = (id: HouseId, elapsedMs: number) => {
    if (!snake) return;
    const correct = id === snake.house;
    setHouseAttempts((c) => c + 1);
    setRecap((r) => [
      ...r,
      {
        snakeId: snake.id,
        name: snake.name,
        pickedHouse: id,
        house: snake.house,
        houseCorrect: correct,
        locality: null,
        localityCorrect: null,
      },
    ]);
    if (correct) {
      const spd = speedBonus(elapsedMs);
      const sBonus = streak * 10;
      const g: Gain = {
        house: HOUSE_POINTS,
        speed: spd,
        streakBonus: sBonus,
        earlyBonus,
        locality: 0,
      };
      setGain(g);
      addScore(g.house + g.speed + g.streakBonus + g.earlyBonus);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      setHousesCorrect((c) => c + 1);
      setHouseWasCorrect(true);
      setHatLine(`${HAT_LINES.correctHouse[snake.house]}`);
      synth.slam();
      buzz(25);
      later(500, synth.chime);
      if (newStreak === 5) later(1400, () => setHatLine(HAT_LINES.streak5));
      else if (newStreak === 3) later(1400, () => setHatLine(HAT_LINES.streak3));
      else if (newStreak === 2) later(1400, () => setHatLine(HAT_LINES.streak2));
    } else {
      setStreak(0);
      setHouseWasCorrect(false);
      setHatLine(
        fillTemplate(pick(HAT_LINES.wrongHouse), {
          picked: HOUSE_BY_ID[id].name,
          correct: HOUSE_BY_ID[snake.house].name,
        }),
      );
      synth.buzz();
      buzz([70, 50, 70]);
      if (mode === "endless") {
        setStrikes((s) => s + 1);
      }
    }
    setPhase("reveal");
  };

  const continueFromReveal = () => {
    if (!snake) return;
    if (houseWasCorrect) {
      setLocalitiesOffered((c) => c + 1);
      setPhase("locality");
      setHatLine(pick(HAT_LINES.localityPrompt));
      synth.tick();
    } else if (mode === "endless" && strikes >= 3) {
      finishGame();
    } else {
      advanceToNextSnake();
    }
  };

  const pickLocality = (loc: string) => {
    if (phase !== "locality" || !snake) return;
    const correct = loc === snake.locality;
    setPickedLocality(loc);
    setLocalityWasCorrect(correct);
    setRecap((r) =>
      r.map((e, i) =>
        i === r.length - 1 ? { ...e, locality: loc, localityCorrect: correct } : e,
      ),
    );
    if (correct) {
      setGain((g) => ({ ...g, locality: LOCALITY_POINTS }));
      addScore(LOCALITY_POINTS);
      setLocalitiesCorrect((c) => c + 1);
      setHatLine(fillTemplate(pick(HAT_LINES.localityCorrect), { locality: loc }));
      synth.sparkle();
      buzz(20);
    } else {
      setHatLine(
        fillTemplate(pick(HAT_LINES.localityWrong), { locality: snake.locality }),
      );
      synth.buzz();
    }
    setPhase("localityReveal");
  };

  const totalSnakes = mode === "ceremony" ? order.length : undefined;
  const accuracy =
    houseAttempts > 0 ? Math.round((housesCorrect / houseAttempts) * 100) : 0;

  return (
    <div className="relative min-h-dvh overflow-hidden text-white">
      {/* chamber backdrop */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ASSET}/sorting-chamber.webp)` }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/85"
        aria-hidden
      />

      <style>{`
        .ss-corner { position: absolute; width: 26px; height: 26px; }
        .ss-laser {
          position: absolute; left: 0; right: 0; top: 0; height: 3px;
          background: linear-gradient(90deg, transparent, #5eead4 20%, #5eead4 80%, transparent);
          box-shadow: 0 0 18px 4px rgba(94,234,212,.55);
          animation: ss-laser 0.95s linear infinite;
        }
        @keyframes ss-laser { 0% { top: 2%; } 100% { top: 96%; } }
        .ss-pop { animation: ss-pop .35s cubic-bezier(.2,1.6,.4,1) both; }
        @keyframes ss-pop { 0% { transform: scale(.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .ss-rise { animation: ss-rise .5s ease-out both; }
        @keyframes ss-rise { 0% { transform: translateY(14px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .ss-slam { animation: ss-slam .55s cubic-bezier(.2,1.4,.3,1) both; }
        @keyframes ss-slam {
          0% { transform: scale(2.6); opacity: 0; }
          60% { transform: scale(.94); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .ss-flash { animation: ss-flash .9s ease-out both; }
        @keyframes ss-flash { 0% { opacity: .55; } 100% { opacity: 0; } }
        .ss-sparkle {
          position: absolute; top: -12px; border-radius: 2px; opacity: 0;
          animation: ss-sparkle-fall 1.6s ease-in forwards;
        }
        @keyframes ss-sparkle-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
        .ss-float { animation: ss-float 3.2s ease-in-out infinite; }
        @keyframes ss-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-7px) rotate(2deg); } }
        .ss-bracket { animation: ss-bracket 2s ease-in-out infinite; }
        @keyframes ss-bracket { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
      `}</style>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4">
        {phase === "title" ? (
          <TitleScreen
            bestCeremony={bestCeremony}
            bestEndless={bestEndless}
            showHow={showHow}
            setShowHow={setShowHow}
            onStart={startGame}
          />
        ) : phase === "results" ? (
          <ResultsScreen
            score={score}
            mode={mode}
            housesCorrect={housesCorrect}
            accuracy={accuracy}
            totalSnakes={order.length}
            bestStreak={bestStreak}
            localitiesCorrect={localitiesCorrect}
            localitiesOffered={localitiesOffered}
            isNewBest={isNewBest}
            hatLine={hatLine}
            recap={recap}
            onRestart={startGame}
          />
        ) : (
          snake && (
            <>
              {/* HUD */}
              <header className="mb-3 flex items-center justify-between gap-2">
                <div className="rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                  {mode === "ceremony"
                    ? `Serpent ${idx + 1} / ${totalSnakes}`
                    : `#${idx + 1} · Endless`}
                </div>
                <div className="flex items-center gap-2">
                  {streak >= 2 && (
                    <span className="ss-pop rounded-full border border-orange-300/30 bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold text-orange-200">
                      🔥 {streak}
                    </span>
                  )}
                  {mode === "endless" && (
                    <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[11px] text-white/70">
                      {"💔".repeat(strikes)}
                      {"🖤".repeat(Math.max(0, 3 - strikes))}
                    </span>
                  )}
                  <span className="rounded-full border border-amber-200/30 bg-amber-400/10 px-3 py-1.5 text-[12px] font-bold text-amber-100">
                    {score} pts
                  </span>
                  <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1.5 text-[12px] backdrop-blur-sm"
                    aria-label={muted ? "Unmute sound" : "Mute sound"}
                  >
                    {muted ? "🔇" : "🔔"}
                  </button>
                </div>
              </header>

              {/* stage */}
              <div className="ss-rise" key={snake.id}>
                <PhotoPlate snake={snake} probing={probing} reducedMotion={reducedMotion} />
              </div>

              {/* clue chips */}
              {probed.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {probed.map((k) => {
                    const clue = snake.clues.find((c) => c.probe === k);
                    if (!clue) return null;
                    return (
                      <div
                        key={k}
                        className="ss-pop rounded-xl border border-teal-200/25 bg-teal-950/60 px-3 py-2 backdrop-blur-sm"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
                          {clue.label}
                        </p>
                        <p className="text-[12px] leading-snug text-teal-50/90">{clue.text}</p>
                      </div>
                    );
                  })}
                  {deepUsed && (
                    <div className="ss-pop w-full rounded-xl border border-violet-300/30 bg-violet-950/60 px-3 py-2 backdrop-blur-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
                        Deep scan
                      </p>
                      <p className="text-[12px] leading-snug text-violet-50/90">
                        {snake.deepScan}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* hat dialogue */}
              <div className="mt-3 flex items-start gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${ASSET}/sorting-hat.webp`}
                  alt="The Sorting Hat"
                  className="ss-float h-14 w-14 shrink-0 rounded-full border border-amber-200/30 object-cover shadow-[0_0_18px_rgba(251,191,36,.25)]"
                />
                <HatBubble key={hatLine} line={hatLine} />
              </div>

              {/* action area */}
              <div className="mt-4 flex-1">
                {phase === "arrive" && (
                  <p className="text-center text-[12px] uppercase tracking-[0.3em] text-white/40">
                    The serpent approaches…
                  </p>
                )}

                {phase === "scan" && (
                  <div className="ss-rise space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(PROBE_META) as ProbeKind[]).map((k) => {
                        const done = probed.includes(k);
                        const active = probing === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            disabled={done || !!probing}
                            onClick={() => probe(k)}
                            className={`rounded-2xl border px-2 py-3 text-center backdrop-blur-sm transition active:scale-95 ${
                              done
                                ? "border-teal-300/40 bg-teal-400/15 text-teal-100"
                                : active
                                  ? "border-teal-200/70 bg-teal-300/25 text-white"
                                  : "border-white/15 bg-black/55 text-white/85 hover:border-teal-200/40"
                            } disabled:opacity-60`}
                          >
                            <span className="text-xl">{done ? "✓" : active ? "◉" : "◎"}</span>
                            <p className="mt-1 text-[12px] font-bold uppercase tracking-wider">
                              {PROBE_META[k].label}
                            </p>
                            <p className="text-[10px] text-white/50">{PROBE_META[k].hint}</p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      {!deepUsed && probed.length >= 1 && (
                        <button
                          type="button"
                          onClick={deepScan}
                          disabled={!!probing}
                          className="flex-1 rounded-2xl border border-violet-300/30 bg-violet-950/50 px-3 py-2.5 text-[12px] font-semibold text-violet-200 backdrop-blur-sm transition active:scale-95 disabled:opacity-50"
                        >
                          🔮 Deep scan (−{DEEP_SCAN_COST} pts)
                        </button>
                      )}
                      <button
                          type="button"
                          onClick={beginSort}
                          className="ss-pop flex-1 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-2.5 text-[13px] font-black uppercase tracking-wider text-black shadow-[0_0_24px_rgba(251,191,36,.35)] transition active:scale-95"
                        >
                          {deepUsed || probed.length >= 3
                            ? "Begin the sorting →"
                            : `Call it now (+${(3 - probed.length) * EARLY_BONUS_PER_PROBE})`}
                        </button>
                    </div>
                  </div>
                )}

                {phase === "sort" && (
                  <div className="ss-rise">
                    <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-100/70">
                      Call its house
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {HOUSES.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => pickHouse(h.id)}
                          className="group rounded-2xl border border-white/12 bg-black/60 p-3 text-left backdrop-blur-sm transition active:scale-95 hover:border-white/30"
                          style={{ boxShadow: `inset 0 0 0 1px ${h.glow}, 0 0 18px transparent` }}
                        >
                          <div className="flex items-center gap-2.5">
                            <Crest house={h.id} />
                            <div>
                              <p className="text-[14px] font-black" style={{ color: h.color }}>
                                {h.name}
                              </p>
                              <p className="text-[10px] italic text-white/45">{h.shortTaxon}</p>
                            </div>
                          </div>
                          <p className="mt-1.5 text-[11px] italic leading-snug text-white/55">
                            “{h.motto}”
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {phase === "deliberate" && (
                  <p className="ss-bracket text-center text-[13px] italic text-amber-100/80">
                    The Hat deliberates…
                  </p>
                )}

                {phase === "reveal" && pickedHouse && (
                  <RevealPanel
                    snake={snake}
                    pickedHouse={pickedHouse}
                    correct={houseWasCorrect}
                    gain={gain}
                    onContinue={continueFromReveal}
                    reducedMotion={reducedMotion}
                  />
                )}

                {phase === "locality" && (
                  <div className="ss-rise">
                    <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-100/70">
                      Name its homeland · +{LOCALITY_POINTS}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {shuffle(HOUSE_BY_ID[snake.house].localities).map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => pickLocality(loc)}
                          className="rounded-full border border-white/20 bg-black/60 px-5 py-2.5 text-[14px] font-bold text-white/90 backdrop-blur-sm transition active:scale-95 hover:border-amber-200/50 hover:text-amber-100"
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {phase === "localityReveal" && pickedLocality && (
                  <div className="ss-rise relative overflow-hidden rounded-2xl border border-white/12 bg-black/60 p-4 text-center backdrop-blur-sm">
                    {localityWasCorrect && !reducedMotion && (
                      <Sparkles color={HOUSE_BY_ID[snake.house].color} seed={idx + 7} />
                    )}
                    <p
                      className="ss-slam text-2xl font-black uppercase tracking-wide"
                      style={{
                        color: localityWasCorrect
                          ? HOUSE_BY_ID[snake.house].color
                          : "#f87171",
                        textShadow: `0 0 24px ${localityWasCorrect ? HOUSE_BY_ID[snake.house].glow : "rgba(248,113,113,.4)"}`,
                      }}
                    >
                      {localityWasCorrect ? "True local!" : snake.locality}
                    </p>
                    {localityWasCorrect ? (
                      <p className="mt-1 text-[13px] text-white/75">
                        +{LOCALITY_POINTS} pts — the Hat bows to your eye.
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] text-white/75">
                        This one hailed from{" "}
                        <span className="font-bold text-amber-200">{snake.locality}</span>.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={advanceToNextSnake}
                      className="mt-3 w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-2.5 text-[13px] font-black uppercase tracking-wider text-black transition active:scale-95"
                    >
                      {mode === "ceremony" && idx >= order.length - 1
                        ? "Hear the verdict →"
                        : "Next serpent →"}
                    </button>
                  </div>
                )}
              </div>

              {/* reveal overlays */}
              {phase === "reveal" && houseWasCorrect && pickedHouse && (
                <div
                  className="ss-flash pointer-events-none fixed inset-0 z-10"
                  style={{ background: HOUSE_BY_ID[pickedHouse].color }}
                  aria-hidden
                />
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

/* ------------------------------ reveal panel ---------------------------- */

function RevealPanel({
  snake,
  pickedHouse,
  correct,
  gain,
  onContinue,
  reducedMotion,
}: {
  snake: SortingSnake;
  pickedHouse: HouseId;
  correct: boolean;
  gain: Gain;
  onContinue: () => void;
  reducedMotion: boolean;
}) {
  const house = HOUSE_BY_ID[snake.house];
  return (
    <div className="ss-rise relative overflow-hidden rounded-2xl border border-white/12 bg-black/65 p-4 text-center backdrop-blur-sm">
      {correct && !reducedMotion && <Sparkles color={house.color} seed={snake.id.length} />}
      <p
        className="ss-slam text-[26px] font-black uppercase leading-tight tracking-wide"
        style={{
          color: correct ? house.color : "#f87171",
          textShadow: `0 0 28px ${correct ? house.glow : "rgba(248,113,113,.4)"}`,
        }}
      >
        {correct ? `${house.name}!` : `Not ${HOUSE_BY_ID[pickedHouse].name}…`}
      </p>

      {correct ? (
        <div className="mx-auto mt-2 max-w-[240px] space-y-1 text-[13px]">
          <GainRow label="House claimed" value={gain.house} />
          {gain.speed > 0 && <GainRow label="Swift call" value={gain.speed} />}
          {gain.streakBonus > 0 && <GainRow label="Streak bonus" value={gain.streakBonus} />}
          {gain.earlyBonus > 0 && <GainRow label="Early call" value={gain.earlyBonus} />}
          <div className="border-t border-white/10 pt-1">
            <GainRow
              label="Total"
              value={gain.house + gain.speed + gain.streakBonus + gain.earlyBonus}
              bold
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[.04] p-3 text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
            The Hat&apos;s lesson
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-white/80">{snake.lesson}</p>
          <p className="mt-2 text-[11px] italic leading-snug text-white/50">{house.marks}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="mt-3 w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-2.5 text-[13px] font-black uppercase tracking-wider text-black transition active:scale-95"
      >
        {correct ? "Name its homeland →" : "Next serpent →"}
      </button>
    </div>
  );
}

function GainRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-black text-amber-100" : "text-white/70"}`}
    >
      <span>{label}</span>
      <span>+{value}</span>
    </div>
  );
}

/* ------------------------------ title screen ---------------------------- */

function TitleScreen({
  bestCeremony,
  bestEndless,
  showHow,
  setShowHow,
  onStart,
}: {
  bestCeremony: number;
  bestEndless: number;
  showHow: boolean;
  setShowHow: React.Dispatch<React.SetStateAction<boolean>>;
  onStart: (m: Mode) => void;
}) {
  return (
    <div className="ss-rise flex flex-col items-center pt-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSET}/snake-sorter-logo.webp`}
        alt="Snake Sorter — Identify, Classify, Sort, Conserve"
        className="w-40 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(52,211,153,.2)]"
      />
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.4em] text-teal-200/80">
        The Sorting Ceremony
      </p>
      <h1 className="mt-2 font-serif text-4xl font-black leading-tight text-amber-50">
        You are the
        <br />
        Sorting Hat.
      </h1>
      <p className="mt-3 max-w-[300px] text-[13.5px] leading-relaxed text-white/65">
        Twelve serpents await upon the dais. Probe their scales, crown and
        homeland — then call their House, and name their valley.
      </p>

      <div className="mt-6 w-full space-y-2.5">
        <button
          type="button"
          onClick={() => onStart("ceremony")}
          className="w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3.5 text-[15px] font-black uppercase tracking-wider text-black shadow-[0_0_30px_rgba(251,191,36,.3)] transition active:scale-95"
        >
          Begin the ceremony
          <span className="block text-[11px] font-bold normal-case tracking-normal opacity-70">
            10 serpents · call the House, then the homeland
          </span>
        </button>
        <button
          type="button"
          onClick={() => onStart("endless")}
          className="w-full rounded-2xl border border-violet-300/30 bg-violet-950/50 px-4 py-3 text-[14px] font-black uppercase tracking-wider text-violet-100 backdrop-blur-sm transition active:scale-95"
        >
          🌙 Endless night
          <span className="block text-[11px] font-bold normal-case tracking-normal opacity-70">
            Sort until 3 wrong calls end the night
          </span>
        </button>
        {(bestCeremony > 0 || bestEndless > 0) && (
          <p className="text-[12px] text-white/50">
            Best ceremony: <span className="font-bold text-amber-200">{bestCeremony}</span>
            {bestEndless > 0 && (
              <>
                {" · "}Best endless:{" "}
                <span className="font-bold text-violet-200">{bestEndless}</span>
              </>
            )}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowHow((v) => !v)}
        className="mt-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-white/45 underline-offset-4 hover:underline"
      >
        {showHow ? "Hide" : "How it works"}
      </button>
      {showHow && (
        <div className="ss-rise mt-2 w-full space-y-2 rounded-2xl border border-white/10 bg-black/55 p-4 text-left backdrop-blur-sm">
          {[
            ["① Probe", "Tap Scales, Crown and Origin to reveal the serpent's field marks."],
            ["② Sort", "Call its House — Azurea, Utaraensis, Pulcher or Viridis. Faster calls earn up to +50. Certain? Call early for +25 per unrevealed probe (blind call: +75)."],
            ["③ Localize", "Name its homeland valley for +50 and the True Local's glory."],
            ["🔮 Deep scan", "Stuck? Spend 25 pts for the Hat's decisive insight — but it forfeits the early-call bonus."],
          ].map(([t, d]) => (
            <p key={t} className="text-[12.5px] leading-snug text-white/70">
              <span className="font-bold text-amber-200">{t} — </span>
              {d}
            </p>
          ))}
          <p className="pt-1 text-[11px] italic text-white/40">
            Specimen photography is owner-supplied; placeholder plates stand in
            for this build.
          </p>
        </div>
      )}

      <Link
        href="/arcade"
        className="mt-6 text-[12px] text-white/40 underline-offset-4 hover:underline"
      >
        ← Back to the arcade
      </Link>
    </div>
  );
}

/* ----------------------------- results screen --------------------------- */

function ResultsScreen({
  score,
  mode,
  housesCorrect,
  accuracy,
  totalSnakes,
  bestStreak,
  localitiesCorrect,
  localitiesOffered,
  isNewBest,
  hatLine,
  recap,
  onRestart,
}: {
  score: number;
  mode: Mode;
  housesCorrect: number;
  accuracy: number;
  totalSnakes: number;
  bestStreak: number;
  localitiesCorrect: number;
  localitiesOffered: number;
  isNewBest: boolean;
  hatLine: string;
  recap: RecapEntry[];
  onRestart: (m: Mode) => void;
}) {
  const rank = rankFor(score);
  const nextRank = [...RANKS].reverse().find((r) => r.min > score);
  const shortHouse = (h: HouseId) => HOUSE_BY_ID[h].name.replace("House ", "");
  return (
    <div className="ss-rise flex flex-col items-center pt-8 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-teal-200/80">
        The Headmaster&apos;s verdict
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSET}/sorting-hat.webp`}
        alt="The Sorting Hat"
        className="ss-float mt-4 h-24 w-24 rounded-full border border-amber-200/30 object-cover shadow-[0_0_30px_rgba(251,191,36,.3)]"
      />
      <h2 className="mt-4 font-serif text-4xl font-black text-amber-50">{rank.title}</h2>
      <p className="mt-1 text-[13px] italic text-white/55">{rank.blurb}</p>
      {nextRank && (
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200/70">
          {nextRank.min - score} pts to {nextRank.title}
        </p>
      )}
      <p className="mt-3 text-5xl font-black text-amber-200">{score}</p>
      {isNewBest && (
        <p className="ss-pop mt-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-4 py-1 text-[12px] font-black uppercase tracking-widest text-amber-200">
          ✦ New best ✦
        </p>
      )}

      <div className="mt-5 grid w-full grid-cols-2 gap-2">
        {[
          ["Houses sorted", `${housesCorrect} / ${mode === "ceremony" ? totalSnakes : "∞"}`],
          ["Best streak", `🔥 ${bestStreak}`],
          ["True locals", `${localitiesCorrect} / ${localitiesOffered}`],
          ["House accuracy", `${accuracy}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-black/55 px-3 py-3 backdrop-blur-sm"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              {label}
            </p>
            <p className="mt-1 text-xl font-black text-white/90">{value}</p>
          </div>
        ))}
      </div>

      {recap.length > 0 && (
        <div className="mt-5 w-full rounded-2xl border border-white/10 bg-black/55 p-3 text-left backdrop-blur-sm">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">
            {mode === "ceremony" ? "Ceremony recap" : "Night's tally"}
          </p>
          <ul className="space-y-1.5">
            {recap.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px]">
                <span
                  className={`w-4 shrink-0 font-black ${e.houseCorrect ? "text-emerald-300" : "text-red-300"}`}
                >
                  {e.houseCorrect ? "✓" : "✗"}
                </span>
                <span className="shrink-0 font-semibold text-white/90">{e.name}</span>
                <span className="truncate text-white/50">
                  {e.houseCorrect
                    ? shortHouse(e.house)
                    : `called ${shortHouse(e.pickedHouse)}, was ${shortHouse(e.house)}`}
                </span>
                <span className="ml-auto shrink-0 text-white/50">
                  {e.localityCorrect == null
                    ? ""
                    : e.localityCorrect
                      ? `📍 ${e.locality} ✓`
                      : `📍 ${e.locality} ✗`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex w-full items-start gap-2.5 text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSET}/sorting-hat.webp`}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full border border-amber-200/30 object-cover"
        />
        <div className="flex-1 rounded-2xl rounded-tl-md border border-amber-100/15 bg-black/60 px-3.5 py-2.5 backdrop-blur-sm">
          <p className="text-[13px] leading-snug text-amber-50/95">{hatLine}</p>
        </div>
      </div>

      <div className="mt-5 w-full space-y-2.5">
        <button
          type="button"
          onClick={() => onRestart("ceremony")}
          className="w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-[14px] font-black uppercase tracking-wider text-black transition active:scale-95"
        >
          Sort again
        </button>
        <button
          type="button"
          onClick={() => onRestart(mode === "ceremony" ? "endless" : "ceremony")}
          className="w-full rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-[14px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-sm transition active:scale-95"
        >
          {mode === "ceremony" ? "🌙 Try endless night" : "🏛 Back to ceremony"}
        </button>
        <Link
          href="/arcade"
          className="block w-full rounded-2xl px-4 py-2 text-center text-[12px] text-white/40 underline-offset-4 hover:underline"
        >
          ← Back to the arcade
        </Link>
      </div>
    </div>
  );
}
