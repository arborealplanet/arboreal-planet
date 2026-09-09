import { ChondroBreederWorkspace } from "@/components/ChondroBreederWorkspace";
import { ChondroSaveRecoveryGate } from "@/components/ChondroSaveRecoveryGate";

export default function ChondroBreederPage() {
  return (
    <ChondroSaveRecoveryGate>
      <ChondroBreederWorkspace />
    </ChondroSaveRecoveryGate>
  );
}
