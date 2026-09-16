"use client";

import { ArborealKeeperFacilityBridge } from "@/components/ArborealKeeperFacilityBridge";
import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";

// Canonical Arboreal Keeper shell. Shared systems mount here while the original
// Green Tree Python workspace continues to provide the mature game UI during
// the migration. Species-neutral systems can now move out independently.
export function ArborealKeeperWorkspace() {
  return (
    <>
      <ArborealKeeperFacilityBridge />
      <ChondroBreederWorkspace />
    </>
  );
}
