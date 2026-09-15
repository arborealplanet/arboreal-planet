"use client";

import { useState } from "react";

type Props = {
  recordUrl: string;
  animalName: string;
};

export function GtpPedigreeCardActions({ recordUrl, animalName }: Props) {
  const [status, setStatus] = useState("");

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${animalName} · Arboreal Planet pedigree`,
          text: `View ${animalName}'s Green Tree Python lineage record on Arboreal Planet.`,
          url: recordUrl,
        });
        setStatus("Share sheet opened.");
        return;
      }
      await navigator.clipboard.writeText(recordUrl);
      setStatus("Lineage link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(recordUrl);
        setStatus("Lineage link copied.");
      } catch {
        setStatus("Could not copy the link on this device.");
      }
    }
  }

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => window.print()} className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-black text-[#06100c]">Print / save PDF</button>
        <button type="button" onClick={() => void share()} className="rounded-xl border border-white/[.10] px-4 py-2.5 text-xs font-bold text-white/65">Share pedigree</button>
      </div>
      {status ? <div role="status" className="mt-2 text-[10px] text-white/35">{status}</div> : null}
    </div>
  );
}
