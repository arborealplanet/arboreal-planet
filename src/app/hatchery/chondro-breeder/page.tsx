import { ChondroBreederGameV3 } from "@/components/ChondroBreederGameV3";
import { ChondroBreederProgression } from "@/components/ChondroBreederProgression";
import { ChondroBreederSocial } from "@/components/ChondroBreederSocial";
import { ChondroBreederFacility } from "@/components/ChondroBreederFacility";

export default function ChondroBreederPage() {
  return (
    <>
      <ChondroBreederGameV3 />
      <ChondroBreederProgression />
      <ChondroBreederSocial />
      <ChondroBreederFacility />
    </>
  );
}
