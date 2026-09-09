import { ChondroFavoriteCardControls } from "@/components/ChondroFavoriteCardControls";
import { ChondroFacilityEnclosureGuard } from "@/components/ChondroFacilityEnclosureGuard";
import { ChondroAnimalCardCollapse } from "@/components/ChondroAnimalCardCollapse";
import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";

export default function ChondroBreederPage() {
  return (
    <>
      <ChondroFavoriteCardControls />
      <ChondroFacilityEnclosureGuard />
      <ChondroAnimalCardCollapse />
      <ChondroBreederWorkspace />
    </>
  );
}
