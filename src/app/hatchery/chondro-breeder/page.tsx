import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederExpandedShop } from "@/components/ChondroBreederExpandedShop";
import { ChondroBreederLines } from "@/components/ChondroBreederLines";
import { ChondroBreederProgression } from "@/components/ChondroBreederProgression";
import { ChondroBreederSocial } from "@/components/ChondroBreederSocial";
import { ChondroBreederFacility } from "@/components/ChondroBreederFacility";
import { ChondroBreederSubspeciesPhenotypes } from "@/components/ChondroBreederSubspeciesPhenotypes";
import { ChondroConservationPartnerships } from "@/components/ChondroConservationPartnerships";

export default function ChondroBreederPage() {
  return (
    <>
      <ChondroBreederSubspeciesPhenotypes />
      <ChondroBreederGameV3 />
      <ChondroBreederExpandedShop />
      <ChondroConservationPartnerships />
      <ChondroBreederLines />
      <ChondroBreederProgression />
      <ChondroBreederSocial />
      <ChondroBreederFacility />
    </>
  );
}
