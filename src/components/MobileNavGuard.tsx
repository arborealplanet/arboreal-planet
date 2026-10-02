"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Hides its children (the app's bottom mobile navigation) while a Canopy
 * Hunter expedition modal is open. An accidental tap on the bottom bar
 * used to navigate away mid-run and kill it; the modal has its own Close
 * button, so nothing is lost by hiding the bar. Renders nothing itself.
 *
 * The expedition modal in ChondroBreederGameV3 broadcasts
 * `canopy-hunter-modal` with `{ open: boolean }` on open/close/unmount.
 */
export function MobileNavGuard({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const open = (event as CustomEvent<{ open?: boolean }>).detail?.open === true;
      setHidden(open);
    };
    window.addEventListener("canopy-hunter-modal", handler);
    return () => window.removeEventListener("canopy-hunter-modal", handler);
  }, []);

  if (hidden) return null;
  return <>{children}</>;
}
