"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type EventCard = {
  title: string;
  body: string;
  cash?: number;
  reputation?: number;
  stress?: number;
  tag: "LIFE" | "KEEPER" | "MARKET" | "BREEDING" | "EXPO" | "FISH & GAME" | "WILD";
};

const cards: EventCard[] = [
  { title: "ONE SNAKE TOO MANY", body: "Bought one too many snakes. Pissed off your girlfriend. You buy her jewelry and dinner to make it up.", cash: -400, stress: 1, tag: "LIFE" },
  { title: "JUST LOOKING", body: "You attend an expo intending to buy nothing. Draw an animal anyway. Of course you did.", cash: -300, reputation: 1, tag: "EXPO" },
  { title: "WHAT'S YOUR LOWEST?", body: "A buyer sends one message: 'lowest'. You lose fifteen minutes of your life.", stress: 1, tag: "MARKET" },
  { title: "CASH TODAY BRO", body: "A buyer offers 38% of asking price because they can supposedly buy it today.", tag: "MARKET" },
  { title: "MY WIFE SAID NO", body: "The buyer vanishes immediately after saying the deal is done.", stress: 1, tag: "MARKET" },
  { title: "PERFECT SHED", body: "For no rational reason, this feels like a major victory.", reputation: 1, tag: "KEEPER" },
  { title: "MITEPOCALYPSE", body: "Somebody brought mites home from the expo. Everyone immediately blames everyone else.", cash: -250, stress: 2, tag: "KEEPER" },
  { title: "POWER OUTAGE", body: "The incubator goes dark. Good news: you bought the generator. Better news: it actually starts.", cash: -100, reputation: 1, tag: "BREEDING" },
  { title: "SURPRISE CLUTCH", body: "A pair you had nearly given up on surprises you. Gain a clutch and a little swagger.", cash: 650, reputation: 2, tag: "BREEDING" },
  { title: "THAT FEMALE WAS APPARENTLY MALE", body: "Your breeding plan has been updated by reality.", stress: 1, tag: "BREEDING" },
  { title: "TRUST ME BRO", body: "Seller says the animal is 100% pure. Paperwork says absolutely nothing.", cash: 250, reputation: -1, tag: "MARKET" },
  { title: "FISH & GAME RAID", body: "Fish & Game raided your spot and found an illegal box turtle.", cash: -750, reputation: -2, stress: 2, tag: "FISH & GAME" },
  { title: "WHAT THE HELL IS THAT?", body: "The inspector opens the wrong enclosure and discovers an animal you absolutely should not have.", cash: -4000, reputation: -5, stress: 3, tag: "FISH & GAME" },
  { title: "Randy Has Arrived", body: "A guy named Randy pulls up in a van and says he has 'something special.' Nobody knows Randy.", stress: 1, tag: "WILD" },
  { title: "DEFINITELY FEMALE", body: "Randy says it's female. The price is suspiciously good. You choose optimism.", cash: -500, tag: "WILD" },
  { title: "I'M DONE BUYING FOR THE YEAR", body: "Place this statement in front of yourself. It has no mechanical effect because nobody believes you.", tag: "LIFE" },
  { title: "ELECTRIC BILL", body: "Six heat panels, two incubators and another mini split apparently use electricity.", cash: -475, stress: 1, tag: "LIFE" },
  { title: "VIRAL POST", body: "Your reptile room goes viral. Everyone suddenly wants what you breed.", cash: 800, reputation: 2, tag: "MARKET" },
  { title: "EXPO AWARD", body: "Your table wins People's Choice. Nobody at home understands why this matters so much.", cash: 300, reputation: 3, tag: "EXPO" },
  { title: "THE EMPTY ENCLOSURE", body: "You have an unused enclosure. This is clearly unacceptable.", cash: -350, tag: "KEEPER" },
];

const animalOffers = [
  { name: "Biak Green Tree Python", price: 950, rep: 2, art: "/hatchery/snakes/localities/biak/yellow-adult.webp" },
  { name: "Manokwari Green Tree Python", price: 1250, rep: 3, art: "/hatchery/snakes/localities/manokwari/yellow-adult.webp" },
  { name: "Blue Tree Monitor", price: 1100, rep: 2, art: "/hatchery/game/arboreal-keeper-ad-hero.webp" },
  { name: "Mystery 'Pure Aru'", price: 700, rep: 1, art: "/hatchery/snakes/localities/aru/yellow-adult.webp" },
];

const facilityUpgrades = [
  { name: "Quarantine Room", price: 900, capacity: 1, text: "Cuts keeper-event pain and makes inspections less terrifying." },
  { name: "Backup Generator", price: 1200, capacity: 0, text: "Turns power outages from disasters into expensive inconveniences." },
  { name: "Premium Rack Wall", price: 1500, capacity: 6, text: "More room. Which means, naturally, more snakes." },
  { name: "Shipping Station", price: 700, capacity: 0, text: "Makes market turns more profitable." },
];

export default function ReptileEmpirePage() {
  const [cash, setCash] = useState(3000);
  const [reputation, setReputation] = useState(0);
  const [stress, setStress] = useState(0);
  const [season, setSeason] = useState(1);
  const [capacity, setCapacity] = useState(4);
  const [animals, setAnimals] = useState<string[]>(["Starter GTP", "Starter Gecko"]);
  const [lastCard, setLastCard] = useState<EventCard | null>(null);
  const [log, setLog] = useState<string[]>(["You swore this was going to stay a small hobby."]);

  const year = Math.floor((season - 1) / 4) + 1;
  const seasonName = ["Spring", "Summer", "Fall", "Winter"][(season - 1) % 4];
  const legacy = useMemo(() => reputation * 3 + animals.length * 2 + Math.floor(cash / 1000) + capacity, [reputation, animals.length, cash, capacity]);

  function addLog(message: string) {
    setLog((old) => [message, ...old].slice(0, 8));
  }

  function drawEvent() {
    const card = cards[Math.floor(Math.random() * cards.length)];
    setLastCard(card);
    setCash((v) => Math.max(0, v + (card.cash ?? 0)));
    setReputation((v) => Math.max(-10, v + (card.reputation ?? 0)));
    setStress((v) => Math.min(10, Math.max(0, v + (card.stress ?? 0))));
    addLog(`${card.title}: ${card.body}`);
  }

  function buyAnimal(index: number) {
    const offer = animalOffers[index];
    if (cash < offer.price) return addLog(`Couldn't afford ${offer.name}. Probably for the best.`);
    if (animals.length >= capacity) {
      setStress((v) => Math.min(10, v + 2));
      addLog(`Bought ${offer.name} while over capacity. Excellent decision-making.`);
    } else {
      addLog(`Bought ${offer.name} for $${offer.price.toLocaleString()}.`);
    }
    setCash((v) => v - offer.price);
    setReputation((v) => v + offer.rep);
    setAnimals((v) => [...v, offer.name]);
  }

  function buyUpgrade(index: number) {
    const upgrade = facilityUpgrades[index];
    if (cash < upgrade.price) return addLog(`Couldn't afford ${upgrade.name}.`);
    setCash((v) => v - upgrade.price);
    setCapacity((v) => v + upgrade.capacity);
    setStress((v) => Math.max(0, v - 1));
    addLog(`Installed ${upgrade.name} for $${upgrade.price.toLocaleString()}.`);
  }

  function breed() {
    if (animals.length < 2) return addLog("You need at least two animals before pretending you planned this breeding project.");
    const success = Math.random() > 0.35;
    if (success) {
      const clutch = Math.floor(Math.random() * 8) + 4;
      const value = clutch * 180;
      setCash((v) => v + value);
      setReputation((v) => v + 2);
      addLog(`Successful clutch: ${clutch} babies. Sold enough offspring to clear $${value.toLocaleString()}.`);
    } else {
      setStress((v) => Math.min(10, v + 1));
      addLog("Breeding season produced absolutely nothing except opinions.");
    }
  }

  function nextSeason() {
    setSeason((v) => (v >= 20 ? 1 : v + 1));
    setStress((v) => Math.max(0, v - 1));
    addLog("Season advanced. Bills remain undefeated.");
  }

  return (
    <main className="min-h-screen bg-[#07100b] text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(84,140,57,.22),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(165,90,38,.2),transparent_28%),#050907]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:py-12">
          <div>
            <Link href="/arcade" className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300/65">← Arboreal Arcade</Link>
            <div className="mt-6 inline-flex rounded-full border border-amber-200/20 bg-amber-200/[.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-100/70">Playable prototype</div>
            <h1 className="mt-4 text-5xl font-black leading-[.9] tracking-[-.055em] sm:text-7xl">REPTILE<br/><span className="text-emerald-300">EMPIRE</span></h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/62">Build the collection. Breed the impossible. Survive buyers, expos, bills, inspections, Randy, and your own complete inability to stop buying reptiles.</p>
          </div>
          <div className="relative min-h-[280px] overflow-hidden rounded-[30px] border border-emerald-200/15 bg-black/30">
            <Image src="/hatchery/game/arboreal-keeper-ad-hero.webp" alt="Illustrated reptile art" fill priority sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover opacity-80"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"/>
            <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur">
              <div className="text-xs font-black uppercase tracking-[.18em] text-amber-200">Year {year} · {seasonName}</div>
              <div className="mt-2 text-sm text-white/70">“I’m just going to keep a couple reptiles.”</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-6 sm:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Cash", `$${cash.toLocaleString()}`],
            ["Reputation", reputation],
            ["Hobby Stress", `${stress}/10`],
            ["Animals", `${animals.length}/${capacity}`],
            ["Legacy", legacy],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/[.035] p-4">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-white/35">{label}</div>
              <div className="mt-2 text-2xl font-black text-white">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-12 sm:px-6 lg:grid-cols-[1fr_1fr_.8fr]">
        <div className="rounded-[28px] border border-white/8 bg-[#0b1510] p-5">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/55">Choose an action</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button onClick={drawEvent} className="rounded-2xl border border-amber-200/15 bg-amber-200/[.06] p-4 text-left transition hover:-translate-y-0.5 hover:bg-amber-200/[.1]"><b>Draw Chaos Card</b><span className="mt-1 block text-xs leading-5 text-white/45">Life, marketplace, keeper problems, Fish & Game and absolute nonsense.</span></button>
            <button onClick={breed} className="rounded-2xl border border-emerald-200/15 bg-emerald-200/[.05] p-4 text-left transition hover:-translate-y-0.5"><b>Run Breeding Season</b><span className="mt-1 block text-xs leading-5 text-white/45">Push your luck for offspring, money and Reputation.</span></button>
            <button onClick={nextSeason} className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:-translate-y-0.5"><b>Advance Season</b><span className="mt-1 block text-xs leading-5 text-white/45">Move through Spring, Summer, Fall and Winter.</span></button>
          </div>

          {lastCard ? (
            <div className="mt-5 overflow-hidden rounded-[24px] border border-amber-200/20 bg-[linear-gradient(145deg,#20170d,#0b0c09)]">
              <div className="border-b border-white/8 px-5 py-3 text-[10px] font-black uppercase tracking-[.2em] text-amber-200/70">{lastCard.tag}</div>
              <div className="p-5">
                <h2 className="text-2xl font-black tracking-[-.03em] text-amber-100">{lastCard.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/68">{lastCard.body}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                  {lastCard.cash ? <span className="rounded-full bg-white/7 px-3 py-1.5">{lastCard.cash > 0 ? "+" : ""}${lastCard.cash}</span> : null}
                  {lastCard.reputation ? <span className="rounded-full bg-white/7 px-3 py-1.5">{lastCard.reputation > 0 ? "+" : ""}{lastCard.reputation} REP</span> : null}
                  {lastCard.stress ? <span className="rounded-full bg-white/7 px-3 py-1.5">+{lastCard.stress} STRESS</span> : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/8 bg-[#0b1510] p-5">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/55">Animal market</div>
            <div className="mt-4 space-y-3">
              {animalOffers.map((animal, index) => (
                <button key={animal.name} onClick={() => buyAnimal(index)} className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-3 text-left transition hover:border-emerald-200/25">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-black">
                    <Image src={animal.art} alt="" fill sizes="56px" className="object-cover"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{animal.name}</div>
                    <div className="mt-1 text-xs text-white/42">${animal.price.toLocaleString()} · +{animal.rep} REP</div>
                  </div>
                  <span className="text-lg">＋</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-[#0b1510] p-5">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/55">Facility upgrades</div>
            <div className="mt-4 space-y-3">
              {facilityUpgrades.map((upgrade, index) => (
                <button key={upgrade.name} onClick={() => buyUpgrade(index)} className="w-full rounded-2xl border border-white/8 bg-white/[.025] p-4 text-left transition hover:border-amber-200/20">
                  <div className="flex items-start justify-between gap-4"><b className="text-sm">{upgrade.name}</b><span className="text-xs font-black text-amber-100">${upgrade.price}</span></div>
                  <p className="mt-2 text-xs leading-5 text-white/42">{upgrade.text}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/8 bg-[#0b1510] p-5">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300/55">Game log</div>
          <div className="mt-4 space-y-3">
            {log.map((item, index) => (
              <div key={index} className="rounded-2xl border border-white/6 bg-black/20 p-3 text-xs leading-5 text-white/55">{item}</div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-rose-200/10 bg-rose-200/[.04] p-4">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-rose-200/55">Prototype note</div>
            <p className="mt-2 text-xs leading-5 text-white/42">This first build proves the core loop: acquire animals, expand capacity, breed, absorb chaos and chase Legacy. Multiplayer trading, auctions, expos, persistent animal lineage and Randy's full van are next.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
