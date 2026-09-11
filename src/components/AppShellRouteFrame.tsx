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
      {!immersive ? <a href="#main-content" className="sr-only z-[100] rounded-lg bg-emerald-300 px-4 py-3 font-bold text-[#06100c] focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a> : null}
      {!immersive ? header : null}
      <div id="main-content" className={!immersive?"min-h-[40vh] scroll-mt-28":""}>{children}</div>
      {!immersive ? mobileNav : null}
      {!immersive ? footer : null}
    </div>
  );
}
