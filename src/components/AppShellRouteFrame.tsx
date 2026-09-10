"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  header: ReactNode;
  mobileNav: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

function isImmersiveBreederPath(pathname: string) {
  return pathname === "/hatchery/chondro-breeder" || pathname === "/arcade/chondro-breeder";
}

export function AppShellRouteFrame({ header, mobileNav, footer, children }: Props) {
  const pathname = usePathname();
  const immersive = isImmersiveBreederPath(pathname);

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      {!immersive ? header : null}
      {children}
      {!immersive ? mobileNav : null}
      {!immersive ? footer : null}
    </div>
  );
}
