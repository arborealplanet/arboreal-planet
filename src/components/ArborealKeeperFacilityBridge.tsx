"use client";

import { useEffect } from "react";
import { keeperAnimalFromGtp, type LegacyGtpAnimalInput } from "@/lib/arboreal-keeper-animal-model";
import {
  ARBOREAL_KEEPER_SAVE_EVENT,
  LEGACY_CHONDRO_LOCAL_SAVE_KEY,
  LEGACY_CHONDRO_SAVE_EVENT,
} from "@/lib/arboreal-keeper-compat";
import {
  ARBOREAL_KEEPER_FACILITY_EVENT,
  ARBOREAL_KEEPER_FACILITY_SAVE_KEY,
  mirrorEmeraldHousingIntoFacility,
  sanitizeKeeperFacilitySave,
  type KeeperFacilitySave,
} from "@/lib/arboreal-keeper-facility";
import { mirrorLegacyGtpHousingIntoFacility } from "@/lib/arboreal-keeper-facility-migration";
import {
  EMERALD_KEEPER_SAVE_KEY,
  sanitizeEmeraldKeeperSave,
} from "@/lib/arboreal-keeper-emerald-engine";
import type { KeeperSpeciesId } from "@/lib/arboreal-keeper-species";

const EMERALD_SAVE_EVENT = "arboreal-keeper-emerald-save-updated";
const EMERALD_CLOUD_EVENT = "arboreal-keeper-emerald-cloud-loaded";
const FACILITY_HOUSING_PREFIX = "facility:";

type LegacyGtpSave = {
  colony?: LegacyGtpAnimalInput[];
  enclosures?: Record<string, number>;
};

function readJson(key: string) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function applyFacilityBackedEmeraldOccupancy(
  save: KeeperFacilitySave,
  housingUnits: Array<{ id: string; occupantId: string | null; enclosureId: unknown }>,
  speciesByAnimalId: Map<string, KeeperSpeciesId>,
) {
  const facilityUnits = housingUnits.filter((unit) => unit.id.startsWith(FACILITY_HOUSING_PREFIX));
  if (!facilityUnits.length) return save;

  const occupantIds = new Set(facilityUnits.map((unit) => unit.occupantId).filter((id): id is string => Boolean(id)));
  const assignmentByEnclosure = new Map(
    facilityUnits.map((unit) => [unit.id.slice(FACILITY_HOUSING_PREFIX.length), unit]),
  );

  return {
    ...save,
    enclosures: save.enclosures.map((enclosure) => {
      const assignment = assignmentByEnclosure.get(enclosure.id);
      if (assignment) {
        return {
          ...enclosure,
          occupantId: assignment.occupantId,
          occupantSpeciesId: assignment.occupantId
            ? speciesByAnimalId.get(assignment.occupantId) ?? null
            : null,
        };
      }
      if (enclosure.occupantId && occupantIds.has(enclosure.occupantId)) {
        return { ...enclosure, occupantId: null, occupantSpeciesId: null };
      }
      return enclosure;
    }),
    updatedAt: Date.now(),
  };
}

export function ArborealKeeperFacilityBridge() {
  useEffect(() => {
    const sync = () => {
      const emerald = sanitizeEmeraldKeeperSave(readJson(EMERALD_KEEPER_SAVE_KEY));
      const legacyGtp = (readJson(LEGACY_CHONDRO_LOCAL_SAVE_KEY) ?? {}) as LegacyGtpSave;
      const current = sanitizeKeeperFacilitySave(readJson(ARBOREAL_KEEPER_FACILITY_SAVE_KEY));
      const speciesByAnimalId = new Map<string, KeeperSpeciesId>(
        emerald.animals.map((animal) => [animal.id, animal.speciesId]),
      );

      const gtpAnimals = (legacyGtp.colony ?? []).map((animal) => {
        const record = keeperAnimalFromGtp(animal);
        return {
          id: record.id,
          speciesId: record.speciesId,
          lifeStage: record.lifeStage,
        };
      });

      // Rebuild legacy GTP enclosure instances first, then legacy Emerald-only housing,
      // and finally re-apply facility-backed Emerald assignments. This makes a shared
      // empty enclosure usable by either program without creating a duplicate mirror.
      const withGtps = mirrorLegacyGtpHousingIntoFacility(current, legacyGtp.enclosures, gtpAnimals);
      const legacyEmeraldHousing = emerald.housingUnits.filter(
        (unit) => !unit.id.startsWith(FACILITY_HOUSING_PREFIX),
      );
      const withLegacyEmeralds = mirrorEmeraldHousingIntoFacility(withGtps, legacyEmeraldHousing, speciesByAnimalId);
      const next = applyFacilityBackedEmeraldOccupancy(withLegacyEmeralds, emerald.housingUnits, speciesByAnimalId);

      const currentComparable = JSON.stringify({ ...current, updatedAt: 0 });
      const nextComparable = JSON.stringify({ ...next, updatedAt: 0 });
      if (currentComparable === nextComparable) return;

      try {
        window.localStorage.setItem(ARBOREAL_KEEPER_FACILITY_SAVE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(ARBOREAL_KEEPER_FACILITY_EVENT));
      } catch {
        // Species programs remain playable even if facility persistence is unavailable.
      }
    };

    sync();
    window.addEventListener(ARBOREAL_KEEPER_SAVE_EVENT, sync);
    window.addEventListener(LEGACY_CHONDRO_SAVE_EVENT, sync);
    window.addEventListener(EMERALD_SAVE_EVENT, sync);
    window.addEventListener(EMERALD_CLOUD_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ARBOREAL_KEEPER_SAVE_EVENT, sync);
      window.removeEventListener(LEGACY_CHONDRO_SAVE_EVENT, sync);
      window.removeEventListener(EMERALD_SAVE_EVENT, sync);
      window.removeEventListener(EMERALD_CLOUD_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return null;
}
