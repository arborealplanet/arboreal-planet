"use client";

import { useEffect, useRef } from "react";
import { installedEnclosures, roomCapacityFromSave, type FacilityRoomState } from "@/lib/chondro-facility-limits";

type Save = {
  facilityId?: string;
  facilityRooms?: FacilityRoomState;
  enclosures?: Record<string, number>;
};

export function ChondroFacilityEnclosureGuard() {
  const saveRef = useRef<Save>({});

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    function enclosureSection() {
      const headings = Array.from(document.querySelectorAll("h2"));
      const heading = headings.find((node) => node.textContent?.includes("Buy space before you buy snakes"));
      return heading?.closest("section") ?? null;
    }

    function decorate() {
      const section = enclosureSection();
      if (!section) return;
      const installed = installedEnclosures(saveRef.current.enclosures);
      const cap = roomCapacityFromSave(saveRef.current);
      const full = installed >= cap;

      let notice = section.querySelector<HTMLElement>("[data-facility-enclosure-limit]");
      if (!notice) {
        notice = document.createElement("div");
        notice.dataset.facilityEnclosureLimit = "true";
        notice.className = "mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[.025] px-3 py-2 text-[10px] text-amber-100/65";
        const intro = section.querySelector("h2")?.parentElement;
        intro?.appendChild(notice);
      }
      const nextNotice = `Room enclosure space: ${installed}/${cap} installed${full ? " · Add another room or facility wing to install more enclosures." : ` · ${cap - installed} physical slots remaining.`}`;
      if (notice.textContent !== nextNotice) notice.textContent = nextNotice;

      for (const button of Array.from(section.querySelectorAll<HTMLButtonElement>("button"))) {
        const currentText = button.textContent ?? "";
        const originalText = button.dataset.facilityOriginalText ?? (currentText.includes("Buy ·") ? currentText : "");
        if (!originalText) continue;
        if (!button.dataset.facilityOriginalText) button.dataset.facilityOriginalText = originalText;
        button.dataset.facilityCapBlocked = full ? "true" : "false";
        if (full) {
          if (!button.disabled) button.disabled = true;
          if (button.title !== "Room enclosure cap reached") button.title = "Room enclosure cap reached";
          if (button.textContent !== "Room full") button.textContent = "Room full";
        } else {
          if (button.disabled) button.disabled = false;
          if (button.title) button.title = "";
          if (button.textContent !== originalText) button.textContent = originalText;
        }
      }
    }

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
    observer = new MutationObserver(() => decorate());
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
