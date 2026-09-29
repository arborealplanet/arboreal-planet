"use client";

import { useEffect, useRef, useState } from "react";
import {
  HOUSES,
  PILE_BEST_KEY,
  PILE_CORRECT_POINTS,
  PILE_WRONG_PENALTY,
  pileSortDeal,
  readBest,
  writeBest,
  type HouseId,
  type SortingSnake,
} from "@/lib/snake-sorting";

/* Tiny local bleeps — the pile table has its own voice. */
function blip(freq: number, dur = 0.09, type: OscillatorType = "sine", delay = 0) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
    void ctx.resume?.();
  } catch {
    /* audio unavailable — the game plays on silently */
  }
}
const chime = () => {
  blip(660);
  blip(880, 0.12, "sine", 0.08);
};
const thud = () => blip(150, 0.16, "sawtooth");

const PRAISE = [
  "Into the pile it goes!",
  "The Hat nods approvingly.",
  "Clean sorting, keeper.",
  "Straight to its kin!",
];
const SNARK = [
  "Not {house}… back to the table with that one.",
  "The Hat shakes its brim — no.",
  "A bold pile, keeper — and a wrong one.",
];
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const fill = (t: string, house: string) => t.replace("{house}", house);
const shortHouse = (id: HouseId) =>
  HOUSES.find((h) => h.id === id)?.name.replace("House ", "") ?? id;

const PILE_HOUSES = HOUSES.filter((h) => h.id !== "designer");

export default function SnakePileSort({ onExit }: { onExit: () => void }) {
  const [deal, setDeal] = useState<SortingSnake[]>(() => pileSortDeal());
  const [placed, setPlaced] = useState<Record<string, HouseId>>({});
  const [misses, setMisses] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeBonus, setTimeBonus] = useState(0);
  const [hatLine, setHatLine] = useState(
    "Eight serpents on the table, four piles awaiting. The Hat is watching…",
  );
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  const reset = () => {
    setDeal(pileSortDeal());
    setPlaced({});
    setMisses({});
    setSelected(null);
    setScore(0);
    setElapsed(0);
    elapsedRef.current = 0;
    setFinished(false);
    setTimeBonus(0);
    setIsNewBest(false);
    setHatLine("A fresh table. The Hat cracks its brim…");
  };

  const place = (snakeId: string, houseId: HouseId) => {
    if (finished || placed[snakeId]) return;
    const snake = deal.find((s) => s.id === snakeId);
    if (!snake) return;
    if (houseId === snake.house) {
      const next = { ...placed, [snakeId]: houseId };
      setPlaced(next);
      setScore((s) => s + PILE_CORRECT_POINTS);
      setSelected(null);
      chime();
      if (Object.keys(next).length >= deal.length) {
        const secs = elapsedRef.current;
        const bonus = Math.max(0, 150 - secs);
        setTimeBonus(bonus);
        setElapsed(secs);
        const final = score + PILE_CORRECT_POINTS + bonus;
        const prev = readBest(PILE_BEST_KEY);
        setBest(Math.max(prev, final));
        if (final > prev) {
          writeBest(PILE_BEST_KEY, final);
          setIsNewBest(true);
        }
        setFinished(true);
        setHatLine("The table is clear! The Hat bows to your eye, keeper.");
      } else {
        setHatLine(pick(PRAISE));
      }
    } else {
      setMisses((m) => ({ ...m, [snakeId]: (m[snakeId] ?? 0) + 1 }));
      setScore((s) => Math.max(0, s - PILE_WRONG_PENALTY));
      setShakeId(snakeId);
      window.setTimeout(() => setShakeId((cur) => (cur === snakeId ? null : cur)), 350);
      thud();
      setHatLine(fill(pick(SNARK), shortHouse(houseId)));
    }
  };

  const table = deal.filter((s) => !placed[s.id]);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="ss-rise mx-auto flex w-full max-w-2xl flex-col px-4 pb-6 pt-4">
      <style>{`
        .pile-card { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'%3E%3Cpath d='M22 3 L33 27 L11 27 Z' fill='%237c3aed' stroke='%234c1d95' stroke-width='2'/%3E%3Cellipse cx='22' cy='30' rx='15' ry='5' fill='%235b21b6' stroke='%233b0764' stroke-width='2'/%3E%3Cpath d='M22 3 l4 7 -8 0 z' fill='%23fbbf24'/%3E%3Ccircle cx='22' cy='16' r='2.5' fill='%23fde68a'/%3E%3Ccircle cx='16.5' cy='22' r='1.8' fill='%23fde68a'/%3E%3C/svg%3E") 22 3, grab; }
        .pile-card:active { cursor: grabbing; }
        .pile-armed { cursor: pointer; }
        @keyframes pile-shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-7px); } 75% { transform: translateX(7px); } }
        .pile-shake { animation: pile-shake .3s ease; }
        @keyframes pile-drop { 0% { transform: scale(1.3); opacity: .3; } 100% { transform: scale(1); opacity: 1; } }
        .pile-drop { animation: pile-drop .3s ease-out; }
        @keyframes pile-lift { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-8px) scale(1.03); } }
        .pile-lift { animation: pile-lift .18s ease-out both; }
      `}</style>

      {/* HUD */}
      <header className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur-sm transition active:scale-95"
        >
          ← Hat
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-200/80">
          🖐️ Pile sort
        </p>
        <div className="flex items-center gap-2 text-[12px] font-bold">
          <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-amber-200">
            {score}
          </span>
          <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-white/60">
            {fmt(elapsed)}
          </span>
        </div>
      </header>

      <p className="mb-3 min-h-[20px] text-center text-[13px] italic text-amber-100/80">
        {hatLine}
      </p>

      {!finished ? (
        <>
          {/* House piles */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PILE_HOUSES.map((h) => {
              const inPile = deal.filter((s) => placed[s.id] === h.id);
              return (
                <div
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${h.name} pile`}
                  onClick={() => selected && place(selected, h.id)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && selected) {
                      e.preventDefault();
                      place(selected, h.id);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    place(e.dataTransfer.getData("text/plain"), h.id);
                  }}
                  className={`rounded-2xl border bg-black/60 p-2.5 backdrop-blur-sm transition ${
                    selected
                      ? "pile-armed animate-pulse border-amber-200/60"
                      : "border-white/12"
                  }`}
                  style={{ boxShadow: `inset 0 0 0 1px ${h.glow}` }}
                >
                  <p className="text-center text-[12px] font-black" style={{ color: h.color }}>
                    {h.name.replace("House ", "")}
                  </p>
                  <p className="text-center text-[10px] uppercase tracking-wider text-white/40">
                    {inPile.length} sorted
                  </p>
                  <div className="mt-1.5 flex min-h-[44px] flex-wrap justify-center gap-1">
                    {inPile.map((s) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={s.id}
                        src={s.photo ?? ""}
                        alt=""
                        className="pile-drop h-10 w-10 rounded-lg border border-white/20 object-cover"
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.25em] text-white/40">
            The table · {table.length} remaining
          </p>

          {/* The table */}
          <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {table.map((s) => (
              <button
                key={s.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", s.id);
                  setSelected(null);
                }}
                onClick={() => setSelected((cur) => (cur === s.id ? null : s.id))}
                className={`pile-card relative overflow-hidden rounded-2xl border bg-black/70 transition active:scale-95 ${
                  shakeId === s.id ? "pile-shake" : ""
                } ${selected === s.id ? "pile-lift border-amber-200/80 shadow-[0_0_24px_rgba(251,191,36,.35)]" : "border-white/10"}`}
                aria-label="Unsorted serpent — drag it to its house pile, or tap to pick it up"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photo ?? ""} alt="Serpent awaiting sorting" className="aspect-[4/3] w-full object-cover" draggable={false} />
                {selected === s.id && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                    In the Hat&apos;s grip — tap a pile
                  </span>
                )}
                {(misses[s.id] ?? 0) > 0 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    ✗ {misses[s.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-white/35">
            Drag a serpent onto its house pile — or tap it, then tap a pile.
          </p>
        </>
      ) : (
        /* Results */
        <div className="ss-rise rounded-2xl border border-white/10 bg-black/65 p-4 text-center backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-teal-200/70">
            Table cleared
          </p>
          <p className="mt-1 text-4xl font-black text-amber-200">{score + timeBonus}</p>
          {isNewBest && <p className="mt-1 text-[13px] font-bold text-emerald-300">✦ New best ✦</p>}
          <div className="mx-auto mt-3 grid max-w-[320px] grid-cols-3 gap-2 text-[12px]">
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-2">
              <p className="font-black text-white/90">{fmt(elapsed)}</p>
              <p className="text-white/45">time</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-2">
              <p className="font-black text-white/90">+{timeBonus}</p>
              <p className="text-white/45">speed bonus</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.04] p-2">
              <p className="font-black text-white/90">
                {Math.round(
                  (deal.filter((s) => !(misses[s.id] > 0)).length / Math.max(1, deal.length)) * 100,
                )}
                %
              </p>
              <p className="text-white/45">first-try rate</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 text-left">
            {deal.map((s, i) => {
              const was = placed[s.id];
              const ok = was === s.house;
              return (
                <li key={s.id} className="flex items-center gap-2 text-[12px]">
                  <span className={`w-4 shrink-0 font-black ${ok ? "text-emerald-300" : "text-red-300"}`}>
                    {ok ? "✓" : "✗"}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.photo ?? ""} alt="" className="h-8 w-8 rounded-lg object-cover" />
                  <span className="font-semibold text-white/90">Serpent {i + 1}</span>
                  <span className="truncate text-white/50">
                    {ok ? shortHouse(was) : `piled ${shortHouse(was)}, was ${shortHouse(s.house)}`}
                    {(misses[s.id] ?? 0) > 0 && ` · ✗${misses[s.id]}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-3 text-[14px] font-black uppercase tracking-wider text-black transition active:scale-95"
            >
              Sort again
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex-1 rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-[14px] font-black uppercase tracking-wider text-white/80 transition active:scale-95"
            >
              Back to the Hat
            </button>
          </div>
          {best > 0 && (
            <p className="mt-2 text-[12px] text-white/45">
              Best pile score: <span className="font-bold text-amber-200">{best}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
