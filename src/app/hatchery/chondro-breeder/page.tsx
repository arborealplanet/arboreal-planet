import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroBreederSubspeciesPhenotypes } from "@/components/ChondroBreederSubspeciesPhenotypes";
import { ChondroFavoriteCardControls } from "@/components/ChondroFavoriteCardControls";
import { ChondroBreederCommandCenter } from "@/components/ChondroBreederCommandCenter";

export default function ChondroBreederPage() {
  return (
    <>
      <ChondroFavoriteCardControls />
      <ChondroBreederSubspeciesPhenotypes />
      <ChondroBreederCommandCenter />
      <ChondroBreederGameV3 />
      <ChondroBreederExpandedShop />
    </>
  );
}
