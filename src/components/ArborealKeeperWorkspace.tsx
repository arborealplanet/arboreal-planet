"use client";

import { ArborealKeeperFacilityBridge } from "@/components/ArborealKeeperFacilityBridge";
import { ArborealKeeperProgramHub } from "@/components/ArborealKeeperProgramHub";
import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";

// Canonical Arboreal Keeper shell. Shared species, collection and facility
// systems live above the mature Green Tree Python program while its gameplay
// continues to migrate into the multi-species experience.
export function ArborealKeeperWorkspace() {
  return (
    <>
      <ArborealKeeperFacilityBridge />
      <ArborealKeeperProgramHub />
      <ChondroBreederWorkspace />
    </>
  );
}
