"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Tag = "LIFE" | "KEEPER" | "MARKET" | "BREEDING" | "EXPO" | "FISH & GAME" | "WILD";
type EventCard = { title: string; body: string; cash?: number; reputation?: number; stress?: number; tag: Tag };
type Player = { name: string; icon: string; position: number; cash: number; reputation: number; stress: number };

const cards: EventCard[] = [
  { title: "ONE SNAKE TOO MANY", body: "Bought one too many snakes, pissed off your girlfriend. You buy her jewelry and dinner to make it up.", cash: -400, stress: 1, tag: "LIFE" },
  { title: "FISH & GAME RAID", body: "Fish & Game raided your spot and found an illegal box turtle.", cash: -750, reputation: -2, stress: 2, tag: "FISH & GAME" },
  { title: "WHAT THE HELL IS THAT?", body: "The inspector opens the wrong enclosure and discovers an animal you absolutely should not have.", cash: -4000, reputation: -5, stress: 3, tag: "FISH & GAME" },
  { title: "JUST LOOKING", body: "You attended the expo intending to buy nothing. You bought a snake before finding the bathroom.", cash: -450, reputation: 1, tag: "EXPO" },
  { title: "WHAT'S YOUR LOWEST?", body: "A buyer sends one message: “lowest”. No greeting. No punctuation. No sale.", stress: 1, tag: "MARKET" },
  { title: "CASH TODAY BRO", body: "A buyer offers 38% of asking because they can supposedly buy it today.", tag: "MARKET" },
  { title: "MY WIFE SAID NO", body: "Buyer vanishes immediately after saying the deal is done.", stress: 1, tag: "MARKET" },
  { title: "PERFECT SHED", body: "For no rational reason this feels like a major victory.", reputation: 1, tag: "KEEPER" },
  { title: "MITEPOCALYPSE", body: "Somebody brought mites home from the expo. Everyone immediately blames everyone else.", cash: -250, stress: 2, tag: "KEEPER" },
  { title: "SURPRISE CLUTCH", body: "A pair you had nearly given up on surprises you. The incubator is suddenly everybody's favorite place.", cash: 700, reputation: 2, tag: "BREEDING" },
  { title: "THAT FEMALE WAS APPARENTLY MALE", body: "Your breeding plan has been updated by reality.", stress: 1, tag: "BREEDING" },
  { title: "TRUST ME BRO", body: "Seller says the animal is 100% pure. Paperwork says absolutely nothing.", cash: 200, reputation: -1, tag: "MARKET" },
  { title: "RANDY HAS ARRIVED", body: "A guy named Randy pulls up in a van and says he has “something special.” Nobody knows Randy.", stress: 1, tag: "WILD" },
  { title: "DEFINITELY FEMALE", body: "Randy says it's female. The price is suspiciously good. You choose optimism.", cash: -500, tag: "WILD" },
  { title: "I'M DONE BUYING FOR THE YEAR", body: "Place this statement in front of yourself. It has no mechanical effect because nobody believes you.", tag: "LIFE" },
  { title: "ELECTRIC BILL", body: "Six heat panels, two incubators and another mini split apparently use electricity.", cash: -475, stress: 1, tag: "LIFE" },
  { title: "VIRAL POST", body: "Your reptile room goes viral. Everybody suddenly wants what you breed.", cash: 800, reputation: 2, tag: "MARKET" },
  { title: "EXPO AWARD", body: "Your table wins People's Choice. Nobody at home understands why this matters so much.", cash: 300, reputation: 3, tag: "EXPO" },
  { title: "THE EMPTY ENCLOSURE", body: "You have an unused enclosure. This is clearly unacceptable.", cash: -350, tag: "KEEPER" },
];

const board = [
  ["START", "Reptile Room", "Collect $500 when you pass.", "start"],
  ["PET SHOP", "Local Pet Shop", "Impulse purchase territory.", "market"],
  ["CHAOS", "Keeper Problems", "Draw a Keeper card.", "keeper"],
  ["BREEDER ROW", "Breeder Row", "Meet breeders and make deals.", "market"],
  ["LIFE", "Life Happens", "Real life attacks the reptile budget.", "life"],
  ["EXPO", "Reptile Expo", "Buy, sell, show off, regret things.", "expo"],
  ["MARKET", "Marketplace", "Prices move. Buyers flake.", "market"],
  ["FISH & GAME", "Inspection", "Hope your paperwork is boring.", "fish"],
  ["VET", "Exotics Vet", "Pay $200. Lose 1 Stress.", "vet"],
  ["RANDY", "Randy's Van", "This is probably fine.", "wild"],
  ["SUPPLY", "Supply Warehouse", "Pay $250. Gain 1 Reputation.", "supply"],
  ["AUCTION", "Rare Animal Auction", "Pay $500 for a shot at glory.", "auction"],
  ["BREED", "Breeding Season", "Roll for a clutch.", "breed"],
  ["CHAOS", "Keeper Problems", "Something in the room is beeping.", "keeper"],
  ["EXPO", "Regional Expo", "The parking lot is already full.", "expo"],
  ["MARKET", "Online Marketplace", "Somebody asks your lowest.", "market"],
  ["FACILITY", "Facility Upgrade", "Pay $400. Reduce Stress by 1.", "facility"],
  ["LIFE", "Life Happens", "Your reptiles are not your only bills.", "life"],
  ["FISH & GAME", "Surprise Inspection", "Knock. Knock. Knock.", "fish"],
  ["BREEDER ROW", "Private Breeder", "Gain 1 Reputation.", "breeder"],
  ["RANDY", "Randy's Van", "He says it came from a friend.", "wild"],
  ["CHAOS", "Wild Card", "Anything can happen.", "wild"],
  ["AUCTION", "Collection Sale", "Retiring breeder. Everybody panic.", "auction"],
  ["HOME", "Back Home", "Reduce Stress by 1.", "home"],
] as const;

const coords = [
  [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,7],
  [2,7],[3,7],[4,7],[5,7],[6,7],[7,7],
  [7,6],[7,5],[7,4],[7,3],[7,2],[7,1],
  [6,1],[5,1],[4,1],[3,1],[2,1],
];

const tokens = [
  { icon: "🐍", ring: "ring-emerald-300", bg: "bg-emerald-500" },
  { icon: "🦎", ring: "ring-sky-300", bg: "bg-sky-500" },
  { icon: "🐢", ring: "ring-amber-300", bg: "bg-amber-500" },
  { icon: "🐊", ring: "ring-rose-300", bg: "bg-rose-500" },
];

function freshPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Keeper ${i + 1}`,
    icon: tokens[i].icon,
    position: 0,
    cash: 3000,
    reputation: 0,
    stress: 0,
  }));
}

function pickCard(tag?: Tag) {
  const pool = tag ? cards.filter((card) => card.tag === tag) : cards;
  return pool[Math.floor(Math.random() * pool.length)] ?? cards[0];
}

export default function ReptileEmpirePage() {
  const [players, setPlayers] = useState<Player[]>(freshPlayers(2));
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);
  const [lastCard, setLastCard] = useState<EventCard | null>(null);
  const [message, setMessage] = useState("Keeper 1 starts. Roll the dice and move your piece.");
  const [round, setRound] = useState(1);

  const active = players[turn];
  const leader = useMemo(
    () => [...players].sort((a,b) => (b.reputation * 3 + b.cash / 1000) - (a.reputation * 3 + a.cash / 1000))[0],
    [players]
  );

  function updatePlayer(index: number, patch: Partial<Player>) {
    setPlayers((old) => old.map((p, i) => i === index ? { ...p, ...patch } : p));
  }

  function applyCard(card: EventCard, playerIndex: number) {
    setLastCard(card);
    setPlayers((old) => old.map((p, i) => i !== playerIndex ? p : ({
      ...p,
      cash: Math.max(0, p.cash + (card.cash ?? 0)),
      reputation: Math.max(-10, p.reputation + (card.reputation ?? 0)),
      stress: Math.min(10, Math.max(0, p.stress + (card.stress ?? 0))),
    })));
    setMessage(`${oldName(playerIndex)} drew “${card.title}”.`);
  }

  function oldName(index: number) {
    return players[index]?.name ?? `Keeper ${index + 1}`;
  }

  function resolveSpace(playerIndex: number, spaceIndex: number) {
    const [, label, , kind] = board[spaceIndex];
    const p = players[playerIndex];
    if (kind === "life") return applyCard(pickCard("LIFE"), playerIndex);
    if (kind === "keeper") return applyCard(pickCard("KEEPER"), playerIndex);
    if (kind === "market") return applyCard(pickCard("MARKET"), playerIndex);
    if (kind === "expo") return applyCard(pickCard("EXPO"), playerIndex);
    if (kind === "fish") return applyCard(pickCard("FISH & GAME"), playerIndex);
    if (kind === "wild") return applyCard(pickCard(Math.random() > .45 ? "WILD" : undefined), playerIndex);
    if (kind === "vet") {
      updatePlayer(playerIndex, { cash: Math.max(0, p.cash - 200), stress: Math.max(0, p.stress - 1) });
      setMessage(`${p.name} paid $200 at the exotics vet and feels slightly less doomed.`);
      return;
    }
    if (kind === "supply") {
      updatePlayer(playerIndex, { cash: Math.max(0, p.cash - 250), reputation: p.reputation + 1 });
      setMessage(`${p.name} stocked up properly. -$250, +1 Reputation.`);
      return;
    }
    if (kind === "auction") {
      const win = Math.random() > .45;
      updatePlayer(playerIndex, { cash: Math.max(0, p.cash - 500), reputation: p.reputation + (win ? 3 : 0), stress: p.stress + (win ? 0 : 1) });
      setMessage(win ? `${p.name} won the bidding war. Sensible stopping point was several bids ago.` : `${p.name} spent $500 chasing an auction and came home with a story.`);
      return;
    }
    if (kind === "breed") {
      const success = Math.random() > .35;
      if (success) {
        const babies = Math.floor(Math.random() * 8) + 4;
        updatePlayer(playerIndex, { cash: p.cash + babies * 175, reputation: p.reputation + 2 });
        setMessage(`${p.name} hit a clutch of ${babies}. The group chat is unbearable now.`);
      } else {
        updatePlayer(playerIndex, { stress: Math.min(10, p.stress + 1) });
        setMessage(`${p.name}'s breeding season produced nothing except opinions.`);
      }
      return;
    }
    if (kind === "facility") {
      updatePlayer(playerIndex, { cash: Math.max(0, p.cash - 400), stress: Math.max(0, p.stress - 1) });
      setMessage(`${p.name} upgraded the facility. -$400, -1 Stress.`);
      return;
    }
    if (kind === "breeder") {
      updatePlayer(playerIndex, { reputation: p.reputation + 1 });
      setMessage(`${p.name} made a good breeder connection. +1 Reputation.`);
      return;
    }
    if (kind === "home") {
      updatePlayer(playerIndex, { stress: Math.max(0, p.stress - 1) });
      setMessage(`${p.name} made it home. -1 Stress.`);
      return;
    }
    setMessage(`${p.name} landed on ${label}.`);
  }

  function rollDice() {
    if (rolled) return;
    setLastCard(null);
    const value = Math.floor(Math.random() * 6) + 1;
    setDice(value);
    setRolled(true);
    const oldPosition = active.position;
    const newPosition = (oldPosition + value) % board.length;
    const passedStart = oldPosition + value >= board.length;
    setPlayers((old) => old.map((p, i) => i === turn ? { ...p, position: newPosition, cash: p.cash + (passedStart ? 500 : 0) } : p));
    if (passedStart) setMessage(`${active.name} passed START and collected $500.`);
    window.setTimeout(() => resolveSpace(turn, newPosition), 350);
  }

  function endTurn() {
    if (!rolled) return;
    const next = (turn + 1) % players.length;
    if (next === 0) setRound((r) => r + 1);
    setTurn(next);
    setDice(null);
    setRolled(false);
    setLastCard(null);
    setMessage(`${players[next].name}'s turn. Roll the dice.`);
  }

  function setPlayerCount(count: number) {
    setPlayers(freshPlayers(count));
    setTurn(0);
    setDice(null);
    setRolled(false);
    setRound(1);
    setLastCard(null);
    setMessage("New table ready. Keeper 1 starts.");
  }

  return (
    <main className="min-h-screen bg-[#07100b] text-white">
      <section className="border-b border-white/10 bg-black/35">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div>
            <Link href="/arcade" className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/60">← Arboreal Arcade</Link>
            <h1 className="mt-1 text-3xl font-black tracking-[-.04em]">REPTILE <span className="text-emerald-300">EMPIRE</span></h1>
            <p className="mt-1 text-xs text-white/45">Actual board prototype · local hot-seat multiplayer</p>
          </div>
          <div className="flex items-center gap-2">
            {[2,3,4].map((count) => (
              <button key={count} onClick={() => setPlayerCount(count)} className={`rounded-xl border px-3 py-2 text-xs font-black ${players.length === count ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100" : "border-white/10 bg-white/[.03] text-white/45"}`}>
                {count} players
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {players.map((p, i) => (
            <div key={p.name} className={`rounded-2xl border p-3 ${i === turn ? "border-emerald-300/45 bg-emerald-300/[.07]" : "border-white/8 bg-white/[.025]"}`}>
              <div className="flex items-center gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-full ring-2 ${tokens[i].ring} ${tokens[i].bg} text-xl shadow-lg`}>{p.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black">{p.name}{i === turn ? " · YOUR TURN" : ""}</div>
                  <div className="mt-1 text-[11px] text-white/45">${p.cash.toLocaleString()} · REP {p.reputation} · STRESS {p.stress}/10</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-x-auto rounded-[30px] border border-emerald-200/15 bg-[radial-gradient(circle_at_center,rgba(31,83,50,.45),rgba(5,11,7,.98)_65%)] p-3 sm:p-5">
            <div className="relative mx-auto grid min-w-[760px] max-w-[980px] grid-cols-7 grid-rows-7 gap-2 aspect-square">
              {board.map((space, i) => {
                const [short, label, detail, kind] = space;
                const [row, col] = coords[i];
                const here = players.map((p, pi) => ({p,pi})).filter(({p}) => p.position === i);
                return (
                  <div key={i} style={{ gridRow: row, gridColumn: col }} className={`relative overflow-hidden rounded-2xl border p-2.5 ${i === 0 ? "border-amber-200/40 bg-amber-200/[.10]" : kind === "fish" ? "border-rose-300/30 bg-rose-300/[.07]" : kind === "wild" ? "border-fuchsia-300/25 bg-fuchsia-300/[.06]" : "border-white/10 bg-black/45"}`}>
                    <div className="text-[9px] font-black uppercase tracking-[.14em] text-white/35">{short}</div>
                    <div className="mt-1 text-xs font-black leading-tight text-white/85">{label}</div>
                    <div className="mt-1 text-[9px] leading-3.5 text-white/35">{detail}</div>
                    <div className="absolute bottom-1.5 right-1.5 flex -space-x-1">
                      {here.map(({pi}) => <span key={pi} title={players[pi].name} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-black text-sm ring-1 ${tokens[pi].ring} ${tokens[pi].bg}`}>{players[pi].icon}</span>)}
                    </div>
                  </div>
                );
              })}

              <div style={{ gridRow: "2 / 7", gridColumn: "2 / 7" }} className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/35 p-6">
                <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_25%_25%,rgba(31,145,76,.65),transparent_28%),radial-gradient(circle_at_75%_75%,rgba(105,66,34,.6),transparent_30%)]"/>
                <div className="relative flex h-full flex-col items-center justify-center text-center">
                  <div className="text-[10px] font-black uppercase tracking-[.3em] text-emerald-200/60">Round {round}</div>
                  <div className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-6xl">REPTILE<br/><span className="text-emerald-300">EMPIRE</span></div>
                  <p className="mt-4 max-w-md text-sm leading-6 text-white/48">Roll. Move your keeper piece. Land on expos, breeders, inspections, auctions, Randy's van and the bad decisions that built the hobby.</p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button onClick={rollDice} disabled={rolled} className="min-w-40 rounded-2xl bg-amber-200 px-6 py-4 text-sm font-black text-[#17130a] disabled:cursor-not-allowed disabled:opacity-35">
                      {rolled ? `ROLLED ${dice}` : "ROLL DICE"}
                    </button>
                    <button onClick={endTurn} disabled={!rolled} className="min-w-40 rounded-2xl border border-white/15 bg-white/[.05] px-6 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-30">
                      END TURN →
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-black/35 px-5 py-3 text-sm font-semibold text-white/65">{message}</div>

                  {lastCard ? (
                    <div className="mt-4 w-full max-w-lg rounded-[24px] border border-amber-200/25 bg-[linear-gradient(145deg,#24180c,#090b08)] p-5 text-left">
                      <div className="text-[9px] font-black uppercase tracking-[.2em] text-amber-200/60">{lastCard.tag}</div>
                      <div className="mt-2 text-xl font-black text-amber-100">{lastCard.title}</div>
                      <p className="mt-2 text-xs leading-5 text-white/60">{lastCard.body}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black">
                        {lastCard.cash ? <span className="rounded-full bg-white/7 px-2.5 py-1.5">{lastCard.cash > 0 ? "+" : ""}${lastCard.cash}</span> : null}
                        {lastCard.reputation ? <span className="rounded-full bg-white/7 px-2.5 py-1.5">{lastCard.reputation > 0 ? "+" : ""}{lastCard.reputation} REP</span> : null}
                        {lastCard.stress ? <span className="rounded-full bg-white/7 px-2.5 py-1.5">+{lastCard.stress} STRESS</span> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-white/8 bg-[#0b1510] p-5">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300/55">Table status</div>
              <div className="mt-4 text-sm text-white/55">Current leader</div>
              <div className="mt-1 text-xl font-black">{leader.name}</div>
              <div className="mt-5 text-xs leading-5 text-white/38">Passing START pays $500. The game is being built around a real shared board first; animal collections, owned properties, trading and online rooms will hang off this board instead of replacing it.</div>
            </div>

            <div className="rounded-[26px] border border-white/8 bg-[#0b1510] p-5">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300/55">Pieces</div>
              <div className="mt-4 space-y-3">
                {players.map((p,i) => (
                  <div key={p.name} className="flex items-center gap-3 text-sm">
                    <span className={`grid h-9 w-9 place-items-center rounded-full ring-2 ${tokens[i].ring} ${tokens[i].bg}`}>{p.icon}</span>
                    <div><b>{p.name}</b><div className="text-[11px] text-white/35">Space {p.position + 1} · {board[p.position][1]}</div></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-amber-200/12 bg-amber-200/[.04] p-5">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-200/60">Next build layer</div>
              <p className="mt-3 text-xs leading-5 text-white/45">Private online friend rooms, drag/move animations, animal inventory, properties you can own, live trading, auction bidding, Expo mini-rounds and custom illustrated board/piece assets.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
