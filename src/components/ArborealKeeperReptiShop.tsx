"use client";

import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ArborealKeeperEmeraldMarketBar } from "@/components/ArborealKeeperEmeraldMarketBar";

export function ArborealKeeperReptiShop() {
  return (
    <div className="pb-8">
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-6">
        <div className="border-b border-white/[.055] pb-4">
          <div className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/42">Arboreal Keeper</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">Repti-Shop</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-white/42">Enclosures first, followed by one horizontal carousel for each animal group.</p>
        </div>
      </div>

      <ChondroBreederExpandedShop />
      <ArborealKeeperEmeraldMarketBar />
    </div>
  );
}
