"use client";

import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroPlayerMarket } from "@/components/ChondroPlayerMarket";

export function ArborealKeeperReptiShop() {
  return (
    <div className="pb-8">
      <ChondroBreederExpandedShop />

      <section className="mx-auto mt-7 max-w-7xl px-5 sm:px-6">
        <div className="rounded-[28px] border border-emerald-300/12 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,.07),transparent_38%),#06100c] p-5 sm:p-6">
          <div className="text-[9px] font-black uppercase tracking-[.17em] text-emerald-200/52">Player Market</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white">Animals listed by other Arboreal Keeper players</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
            These are real player-to-player virtual listings. Animals keep their locality, life stage, testing data and breeder history when they change hands.
          </p>
        </div>
      </section>

      <ChondroPlayerMarket />
    </div>
  );
}
