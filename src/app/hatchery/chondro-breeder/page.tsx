import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroBreederSubspeciesPhenotypes } from "@/components/ChondroBreederSubspeciesPhenotypes";
import { ChondroFavoriteCardControls } from "@/components/ChondroFavoriteCardControls";
import { ChondroFacilityEnclosureGuard } from "@/components/ChondroFacilityEnclosureGuard";
import { ChondroBreederCommandCenter } from "@/components/ChondroBreederCommandCenter";

export default function ChondroBreederPage() {
  return (
    <>
      <ChondroFavoriteCardControls />
      <ChondroFacilityEnclosureGuard />
      <ChondroBreederSubspeciesPhenotypes />
      <ChondroBreederCommandCenter />
      <ChondroBreederGameV3 />
      <ChondroBreederExpandedShop />
    </>
  );
}
