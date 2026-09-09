import { ChondroFavoriteCardControls } from "@/components/ChondroFavoriteCardControls";
import { ChondroAnimalCardCollapse } from "@/components/ChondroAnimalCardCollapse";
import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";
import { ChondroSaveRecoveryGate } from "@/components/ChondroSaveRecoveryGate";

export default function ChondroBreederPage() {
  return (
    <ChondroSaveRecoveryGate>
      <ChondroFavoriteCardControls />
      <ChondroAnimalCardCollapse />
      <ChondroBreederWorkspace />
    </ChondroSaveRecoveryGate>
  );
}
