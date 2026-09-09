import { ChondroFavoriteCardControls } from "@/components/ChondroFavoriteCardControls";
import { ChondroFacilityEnclosureGuard } from "@/components/ChondroFacilityEnclosureGuard";
import { ChondroCoreBreedingSync } from "@/components/ChondroCoreBreedingSync";
import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";

export default function ChondroBreederPage() {
  return (
    <>
      <ChondroFavoriteCardControls />
      <ChondroFacilityEnclosureGuard />
      <ChondroCoreBreedingSync />
      <ChondroBreederWorkspace />
    </>
  );
}
