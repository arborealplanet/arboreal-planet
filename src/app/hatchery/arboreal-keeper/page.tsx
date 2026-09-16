import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";
import { ChondroSaveRecoveryGate } from "@/components/ChondroSaveRecoveryGate";

export default function ArborealKeeperPage() {
  return (
    <ChondroSaveRecoveryGate>
      <ChondroBreederWorkspace />
    </ChondroSaveRecoveryGate>
  );
}
