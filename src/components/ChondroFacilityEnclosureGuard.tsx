"use client";

import { useEffect, useRef } from "react";
import { facilityEnclosureCap, installedEnclosures } from "@/lib/chondro-facility-limits";

type Save = {
  facilityId?: string;
  enclosures?: Record<string, number>;
};

export function ChondroFacilityEnclosureGuard() {
  const saveRef = useRef<Save>({});

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    async function load() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled && response.ok) {
          saveRef.current = (data.save?.state ?? {}) as Save;
          decorate();
        }
      } catch {}
    }

    function enclosureSection() {
      const headings = Array.from(document.querySelectorAll("h2"));
      const heading = headings.find((node) => node.textContent?.includes("Buy space before you buy snakes"));
      return heading?.closest("section") ?? null;
    }

    function decorate() {
      const section = enclosureSection();
      if (!section) return;
      const installed = installedEnclosures(saveRef.current.enclosures);
      const cap = facilityEnclosureCap(saveRef.current.facilityId);
      const full = installed >= cap;

      let notice = section.querySelector<HTMLElement>("[data-facility-enclosure-limit]");
      if (!notice) {
        notice = document.createElement("div");
        notice.dataset.facilityEnclosureLimit = "true";
        notice.className = "mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[.025] px-3 py-2 text-[10px] text-amber-100/65";
        const intro = section.querySelector("h2")?.parentElement;
        intro?.appendChild(notice);
      }
      notice.textContent = `Facility enclosure space: ${installed}/${cap} installed${full ? " · Upgrade your facility to add more enclosures." : ` · ${cap - installed} slots remaining.`}`;

      for (const button of Array.from(section.querySelectorAll<HTMLButtonElement>("button"))) {
        const text = button.textContent ?? "";
        if (!text.includes("Buy ·")) continue;
        button.dataset.facilityCapBlocked = full ? "true" : "false";
        if (full) {
          button.disabled = true;
          button.title = "Facility enclosure cap reached";
          button.textContent = "Facility full";
        }
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>("button");
      if (!button || button.dataset.facilityCapBlocked !== "true") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    void load();
    document.addEventListener("click", onClick, true);
    observer = new MutationObserver(decorate);
    observer.observe(document.body, { childList: true, subtree: true });

    const refresh = window.setInterval(() => {
      if (!cancelled) void load();
    }, 5000);

    return () => {
      cancelled = true;
      document.removeEventListener("click", onClick, true);
      observer?.disconnect();
      window.clearInterval(refresh);
    };
  }, []);

  return null;
}
