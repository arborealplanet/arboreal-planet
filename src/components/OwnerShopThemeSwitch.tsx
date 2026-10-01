"use client";

import { useEffect, useState } from "react";

type Theme = "default" | "halloween";

const OPTIONS: Array<{ id: Theme; label: string; blurb: string }> = [
  { id: "default", label: "Default", blurb: "The standard Verdant Vivarium storefront." },
  { id: "halloween", label: "🎃 Halloween", blurb: "Haunted storefront loop, spooky Hank tips, orange-and-purple accents." },
];

export function OwnerShopThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("default");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Theme | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costume, setCostume] = useState(false);
  const [costumeBusy, setCostumeBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/site-settings?key=shop_theme", { cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (active && data && data.value === "halloween") setTheme("halloween");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/site-settings?key=hank_costume", { cache: "no-store" })
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (active && data && data.value === "on") setCostume(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function saveCostume(next: boolean) {
    if (costumeBusy || next === costume) return;
    setCostumeBusy(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "hank_costume", value: next ? "on" : "off" }),
      });
      const data = (await response.json().catch(() => null)) as { value?: unknown; error?: unknown } | null;
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not save.");
      setCostume(data?.value === "on");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setCostumeBusy(false);
    }
  }

  async function save(next: Theme) {
    if (saving || next === theme) return;
    setSaving(next);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "shop_theme", value: next }),
      });
      const data = (await response.json().catch(() => null)) as { value?: unknown; error?: unknown } | null;
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not save.");
      setTheme(data?.value === "halloween" ? "halloween" : "default");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-3xl border border-white/[.07] bg-white/[.02] p-6">
      {loading ? (
        <p className="text-sm text-white/40">Loading current theme…</p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const selected = option.id === theme;
            const busy = saving === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={saving !== null}
                onClick={() => void save(option.id)}
                aria-pressed={selected}
                className={`rounded-2xl border p-4 text-left transition ${
                  selected
                    ? "border-orange-300/50 bg-orange-300/[.07] shadow-[0_0_24px_rgba(251,146,60,.18)]"
                    : "border-white/[.08] bg-white/[.015] hover:border-white/20 hover:bg-white/[.04]"
                } ${saving !== null && !busy ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black uppercase tracking-[.06em] text-white/85">{option.label}</span>
                  {selected ? (
                    <span className="rounded-full bg-orange-300/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[.1em] text-orange-100/90">
                      Live
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs leading-5 text-white/45">{option.blurb}</p>
                {busy ? <p className="mt-2 text-xs text-white/50">Saving…</p> : null}
              </button>
            );
          })}
        </div>
      )}
      {!loading ? (
        <button
          type="button"
          disabled={costumeBusy}
          onClick={() => void saveCostume(!costume)}
          aria-pressed={costume}
          className={`mt-2.5 w-full rounded-2xl border p-4 text-left transition ${
            costume
              ? "border-red-300/50 bg-red-300/[.07] shadow-[0_0_24px_rgba(248,113,113,.18)]"
              : "border-white/[.08] bg-white/[.015] hover:border-white/20 hover:bg-white/[.04]"
          } ${costumeBusy ? "opacity-60" : ""}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-black uppercase tracking-[.06em] text-white/85">🤡 Hank&apos;s Costume</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[.1em] ${
                costume ? "bg-red-300/20 text-red-100/90" : "bg-white/[.06] text-white/40"
              }`}
            >
              {costume ? "On" : "Off"}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-white/45">
            Captain Spaulding loops for Hank in the shop — separate from the theme, flip it on closer to Halloween.
          </p>
          {costumeBusy ? <p className="mt-2 text-xs text-white/50">Saving…</p> : null}
        </button>
      ) : null}
      <div className="mt-3 min-h-5 text-xs">
        {error ? (
          <p className="text-red-300/90">{error}</p>
        ) : saved ? (
          <p className="text-emerald-300/90">Saved — the shop updates for every keeper immediately.</p>
        ) : (
          <p className="text-white/30">Theme and costume apply to the Arboreal Keeper shop (market tab) site-wide.</p>
        )}
      </div>
    </div>
  );
}
