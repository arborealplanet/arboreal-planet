import fs from "node:fs";

const shopFile = "src/components/ChondroBreederExpandedShop.tsx";
let shop = fs.readFileSync(shopFile, "utf8");

function replaceShop(find, replacement, label) {
  if (!shop.includes(find)) throw new Error(`Could not update Chondro store: ${label}`);
  shop = shop.replace(find, replacement);
}

replaceShop(
  'import { useEffect, useMemo, useState } from "react";\nimport { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";',
  'import Image from "next/image";\nimport { useEffect, useMemo, useState } from "react";\nimport { ChondroSnakeIcon } from "@/components/ChondroSnakeIcon";\nimport { roomCapacityFromSave } from "@/lib/chondro-facility-limits";',
  "shop imports",
);

replaceShop(
  'type Offer = Snake & { price: number; featured?: boolean; specialLabel?: string };\ntype GameSave = { cash: number; colony: Snake[]; enclosures: Record<string, number>; purchasedStoreIds?: string[]; [key: string]: unknown };',
  'type Offer = Snake & { price: number; featured?: boolean; specialLabel?: string };\ntype EnclosureType = "Chondro Dojo Bin" | "PVC Arboreal";\ntype GameSave = { cash: number; colony: Snake[]; enclosures: Record<string, number>; facilityRooms?: Record<string, number>; purchasedStoreIds?: string[]; [key: string]: unknown };',
  "enclosure save types",
);

replaceShop(
  'const SHOP_REFRESH_MS = 24 * 60 * 60 * 1000;\nconst subspeciesList:',
  'const SHOP_REFRESH_MS = 24 * 60 * 60 * 1000;\nconst enclosurePrices: Record<EnclosureType, number> = { "Chondro Dojo Bin": 225, "PVC Arboreal": 650 };\nconst subspeciesList:',
  "enclosure prices",
);

replaceShop(
  '    const onConservation = () => void load();\n    window.addEventListener("chondro-conservation-updated", onConservation);',
  '    const onConservation = () => void load();\n    const onSaveChange = () => void load();\n    window.addEventListener("chondro-conservation-updated", onConservation);\n    window.addEventListener("arboreal-chondro-breeder-save-change", onSaveChange);',
  "save event listener",
);

replaceShop(
  '      window.removeEventListener("chondro-conservation-updated", onConservation);\n    };',
  '      window.removeEventListener("chondro-conservation-updated", onConservation);\n      window.removeEventListener("arboreal-chondro-breeder-save-change", onSaveChange);\n    };',
  "save event cleanup",
);

replaceShop(
  '  const capacity = Object.values(save?.enclosures ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);\n  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));',
  '  const capacity = Object.values(save?.enclosures ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0);\n  const physicalRoomCapacity = roomCapacityFromSave({ facilityRooms: save?.facilityRooms });\n  const roomEnclosureSlots = Math.max(0, physicalRoomCapacity - capacity);\n  const openSlots = Math.max(0, capacity - (save?.colony.length ?? 0));',
  "store capacity calculations",
);

replaceShop(
  '  async function buy(offer: Offer) {',
  `  function buyEnclosure(type: EnclosureType) {
    if (!save || busy || roomEnclosureSlots <= 0 || save.cash < enclosurePrices[type]) return;
    setBusy(\`enclosure:\${type}\`);
    setStatus(\`Buying \${type}…\`);
    window.dispatchEvent(new CustomEvent("arboreal-chondro-enclosure-action", {
      detail: { action: "buy-enclosure", type },
    }));
    window.setTimeout(() => {
      setBusy(null);
      setStatus(\`\${type} purchased. Your snake capacity increased by 1.\`);
    }, 350);
  }

  async function buy(offer: Offer) {`,
  "enclosure purchase dispatcher",
);

const shopHeader = '    <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">\n      <div className="rounded-[24px] border border-sky-300/15 bg-sky-300/[.025] p-4 sm:p-5">';
const enclosureBlock = `    <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
      <section className="mb-4 overflow-hidden rounded-[26px] border border-emerald-300/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.08),transparent_38%),#07110d] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-100/55">Enclosures</div>
            <h3 className="mt-2 text-xl font-semibold text-white/80">Buy housing before you buy snakes.</h3>
            <p className="mt-1 text-xs leading-5 text-white/38">Each enclosure adds room for one snake. Your facility currently has {roomEnclosureSlots} installation slot{roomEnclosureSlots === 1 ? "" : "s"} open.</p>
          </div>
          <div className="rounded-xl border border-white/[.07] bg-black/15 px-4 py-2 text-right">
            <div className="text-[9px] font-black uppercase tracking-[.13em] text-white/32">Animal capacity</div>
            <div className="mt-1 text-sm font-black text-emerald-100/72">{capacity} total · {openSlots} open</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(["Chondro Dojo Bin", "PVC Arboreal"] as EnclosureType[]).map((type) => {
            const price = enclosurePrices[type];
            const owned = Number(save.enclosures?.[type] ?? 0);
            const unavailable = busy !== null || roomEnclosureSlots <= 0 || save.cash < price;
            return (
              <article key={type} className="overflow-hidden rounded-[22px] border border-white/[.07] bg-black/15">
                <div className="relative aspect-[16/8] overflow-hidden border-b border-white/[.06] bg-black/25">
                  <Image src="/hatchery/game/pvc-enclosure.webp" alt={type} fill sizes="(max-width: 768px) 100vw, 50vw" className={type === "Chondro Dojo Bin" ? "object-cover object-[center_64%] opacity-90" : "object-cover object-center"} />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10">
                    <div className="text-lg font-semibold text-white">{type}</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[.12em] text-white/30">Owned</div>
                      <div className="mt-1 text-sm font-semibold text-white/70">{owned} · +1 snake capacity each</div>
                    </div>
                    <div className="text-lg font-semibold text-emerald-200/78">{money(price)}</div>
                  </div>
                  <button type="button" disabled={unavailable} onClick={() => buyEnclosure(type)} className="mt-4 w-full rounded-xl bg-emerald-300 px-4 py-3 text-xs font-black text-[#06100c] disabled:opacity-30">
                    {roomEnclosureSlots <= 0 ? "Need another facility room" : save.cash < price ? `Need ${money(price)}` : busy === `enclosure:${type}` ? "Installing…" : `Buy ${type}`}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="rounded-[24px] border border-sky-300/15 bg-sky-300/[.025] p-4 sm:p-5">`;
replaceShop(shopHeader, enclosureBlock, "enclosure store section");

fs.writeFileSync(shopFile, shop);

const gameFile = "src/components/ChondroBreederGameV3.tsx";
let game = fs.readFileSync(gameFile, "utf8");
if (!game.includes('arboreal-chondro-enclosure-action')) {
  const marker = '  function buySnake(offer: StoreSnake) {';
  if (!game.includes(marker)) throw new Error("Could not find enclosure bridge insertion point in GameV3.");
  const bridge = `  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    function handleEnclosureAction(event: Event) {
      const detail = (event as CustomEvent<{ action?: string; type?: EnclosureType }>).detail ?? {};
      if (detail.action !== "buy-enclosure") return;
      if (detail.type !== "Chondro Dojo Bin" && detail.type !== "PVC Arboreal") return;
      buyEnclosure(detail.type);
    }
    window.addEventListener("arboreal-chondro-enclosure-action", handleEnclosureAction);
    return () => window.removeEventListener("arboreal-chondro-enclosure-action", handleEnclosureAction);
  }, [cash, roomEnclosureSlots]);
  /* eslint-enable react-hooks/exhaustive-deps */

`;
  game = game.replace(marker, bridge + marker);
}
fs.writeFileSync(gameFile, game);

console.log("Added source-native enclosure purchases to the top of Chondro Store.");