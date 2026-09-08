"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHONDRO_ACHIEVEMENTS,
  achievementReputation,
  completedAchievements,
  unlockedTitles,
  type AchievementSave,
} from "@/lib/chondro-achievements";

export function ChondroAchievementsPanel() {
  const [save, setSave] = useState<AchievementSave>({});
  const [selectedTitle, setSelectedTitle] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) {
          const state = (data.save?.state ?? {}) as AchievementSave & { selectedBreederTitle?: string };
          setSave(state);
          setSelectedTitle(typeof state.selectedBreederTitle === "string" ? state.selectedBreederTitle : "");
        }
      } catch {}
      if (!cancelled) setLoaded(true);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const completed = useMemo(() => completedAchievements(save), [save]);
  const completedIds = useMemo(() => new Set(completed.map((item) => item.id)), [completed]);
  const titles = useMemo(() => unlockedTitles(save), [save]);
  const reputation = useMemo(() => achievementReputation(save), [save]);

  async function chooseTitle(title: string) {
    const next = { ...(save as Record<string, unknown>), selectedBreederTitle: title };
    setSelectedTitle(title);
    setSave(next as AchievementSave);
    try {
      await fetch("/api/hatchery/chondro-breeder/save", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {}
  }

  if (!loaded) return null;

  return (
    <section className="panel rounded-[28px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Career achievements</div>
          <h2 className="mt-2 text-2xl font-semibold">Breeder milestones</h2>
          <p className="mt-2 max-w-2xl text-sm text-white/35">
            Progress is calculated from your actual save: animals produced, generations, trait milestones, sales, seasons and other breeder accomplishments.
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-[.18em] text-white/35">Achievement reputation</div>
          <div className="mt-1 text-2xl font-black text-emerald-200">{reputation.toLocaleString()}</div>
          <div className="text-[10px] text-white/30">{completed.length}/{CHONDRO_ACHIEVEMENTS.length} complete</div>
        </div>
      </div>

      {titles.length ? (
        <div className="mt-5 rounded-2xl border border-white/[.07] bg-black/15 p-4">
          <div className="text-xs font-bold text-white/65">Breeder title</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {titles.map((title) => (
              <button
                type="button"
                key={title}
                onClick={() => void chooseTitle(title)}
                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${selectedTitle === title ? "border-amber-200/35 bg-amber-200/[.08] text-amber-100" : "border-white/[.08] text-white/45"}`}
              >
                {selectedTitle === title ? "★ " : ""}{title}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CHONDRO_ACHIEVEMENTS.map((achievement) => {
          const done = completedIds.has(achievement.id);
          return (
            <div key={achievement.id} className={`rounded-2xl border p-4 ${done ? "border-emerald-300/20 bg-emerald-300/[.035]" : "border-white/[.06] bg-black/10"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-bold text-white/75">{done ? "✓ " : ""}{achievement.name}</div>
                <span className={`text-[9px] font-bold uppercase tracking-[.15em] ${done ? "text-emerald-200/70" : "text-white/25"}`}>
                  {done ? "Complete" : "+" + achievement.reputation + " rep"}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-white/35">{achievement.description}</p>
              {achievement.title ? <div className="mt-2 text-[10px] text-amber-100/50">Title: {achievement.title}</div> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
