"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PlantCollection = {
  slug: string;
  name: string;
  scientific_name: string;
  plant_group: string;
  description: string | null;
  tags: string[];
  status: "REFERENCE" | "PUBLISHED" | "PLANNED";
};

const groupContext: Record<string, { title: string; context: string }> = {
  Carnivorous: {
    title: "Carnivorous plants",
    context: "Pitcher plants and related carnivorous groups, with tropical cultivation kept distinct from groups that need very different seasonal care.",
  },
  Epiphytes: {
    title: "Epiphytes",
    context: "Plants that naturally fit the vertical, mounted and branch-oriented side of arboreal enclosure design, including bromeliads and orchids.",
  },
  "Tropical foliage": {
    title: "Tropical foliage",
    context: "Climbing and foliage plants that can add structure, cover and visual depth to planted arboreal displays when their needs fit the enclosure.",
  },
};

function statusLabel(status: PlantCollection["status"]) {
  if (status === "PLANNED") return "ROADMAP";
  return status;
}

export function PlantCollectionRoadmap() {
  const [rows, setRows] = useState<PlantCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/catalog/plants", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null) as { rows?: PlantCollection[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error || "Plant catalog unavailable.");
        if (active) setRows(Array.isArray(data?.rows) ? data.rows : []);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Plant catalog unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, PlantCollection[]>();
    for (const row of rows) map.set(row.plant_group, [...(map.get(row.plant_group) ?? []), row]);
    return [...map.entries()];
  }, [rows]);

  return (
    <section className="mx-auto max-w-7xl px-5 pb-10 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-kicker">Collection roadmap</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-white/82">Built around the plants arboreal keepers actually use and grow.</h2>
        </div>
        <div className="text-xs text-white/35">Reference records open as they are completed.</div>
      </div>

      {loading ? <div className="panel rounded-[26px] p-6 text-sm text-white/35">Loading plant collections…</div> : null}
      {error ? <div className="rounded-[26px] border border-red-300/10 bg-red-300/[.025] p-6 text-sm text-red-100/55">{error}</div> : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {groups.map(([group, collections]) => {
            const copy = groupContext[group] ?? { title: group, context: "A growing Arboreal Planet plant collection." };
            const ready = collections.filter((item) => item.status !== "PLANNED").length;
            return (
              <article key={group} className="panel rounded-[26px] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="section-kicker">{copy.title}</div>
                    <p className="mt-3 text-xs leading-6 text-white/38">{copy.context}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[.07] px-2.5 py-1.5 text-[9px] font-black text-white/35">{ready}/{collections.length} LIVE</span>
                </div>
                <div className="mt-5 space-y-2">
                  {collections.map((collection) => {
                    const live = collection.status !== "PLANNED";
                    const content = (
                      <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${live ? "border-emerald-300/10 bg-emerald-300/[.025]" : "border-white/[.055] bg-black/10"}`}>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white/68">{collection.name}</div>
                          <div className="mt-1 truncate text-[10px] italic text-white/28">{collection.scientific_name}</div>
                        </div>
                        <span className={`shrink-0 text-[8px] font-black uppercase tracking-[.12em] ${live ? "text-emerald-200/62" : "text-white/24"}`}>{statusLabel(collection.status)}</span>
                      </div>
                    );
                    return live ? <Link key={collection.slug} href={`/plants/${collection.slug}`} className="block transition hover:translate-x-0.5">{content}</Link> : <div key={collection.slug}>{content}</div>;
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
