import type { ReactNode } from "react";
import { FollowedSubjectsPanel } from "@/components/FollowedSubjectsPanel";

export default function SavedLayout({children}:{children:ReactNode}){
  return <>{children}<FollowedSubjectsPanel/></>;
}
