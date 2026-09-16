"use client";

import { useEffect } from "react";
import {
  ARBOREAL_KEEPER_FACILITY_EVENT,
  ARBOREAL_KEEPER_FACILITY_SAVE_KEY,
  mirrorEmeraldHousingIntoFacility,
  sanitizeKeeperFacilitySave,
} from "@/lib/arboreal-keeper-facility";
import {
  EMERALD_KEEPER_SAVE_KEY,
  sanitizeEmeraldKeeperSave,
} from "@/lib/arboreal-keeper-emerald-engine";
import type { KeeperSpeciesId } from "@/lib/arboreal-keeper-species";

const EMERALD_SAVE_EVENT = "arboreal-keeper-emerald-save-updated";
const EMERALD_CLOUD_EVENT = "arboreal-keeper-emerald-cloud-loaded";

function readJson(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function ArborealKeeperFacilityBridge() {
  useEffect(() => {
    const sync = () => {
      const emerald = sanitizeEmeraldKeeperSave(readJson(EMERALD_KEEPER_SAVE_KEY));
      const current = sanitizeKeeperFacilitySave(readJson(ARBOREAL_KEEPER_FACILITY_SAVE_KEY));
      const speciesByAnimalId = new Map<string, KeeperSpeciesId>(
        emerald.animals.map((animal) => [animal.id, animal.speciesId]),
      );
      const next = mirrorEmeraldHousingIntoFacility(current, emerald.housingUnits, speciesByAnimalId);

      const currentComparable = JSON.stringify({ ...current, updatedAt: 0 });
      const nextComparable = JSON.stringify({ ...next, updatedAt: 0 });
      if (currentComparable === nextComparable) return;

      try {
        window.localStorage.setItem(ARBOREAL_KEEPER_FACILITY_SAVE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(ARBOREAL_KEEPER_FACILITY_EVENT));
      } catch {
        // The species program remains playable even if facility persistence is unavailable.
      }
    };

    sync();
    window.addEventListener(EMERALD_SAVE_EVENT, sync);
    window.addEventListener(EMERALD_CLOUD_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EMERALD_SAVE_EVENT, sync);
      window.removeEventListener(EMERALD_CLOUD_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return null;
}
