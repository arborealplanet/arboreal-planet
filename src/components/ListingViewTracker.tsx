"use client";

import { useEffect } from "react";

// Fire-and-forget view ping for a listing. Skips the owner's own views so the
// seller's count reflects outside interest, not their own management visits.
export function ListingViewTracker({ listingId, isOwner }: { listingId: string; isOwner: boolean }) {
  useEffect(() => {
    if (isOwner) return;
    fetch(`/api/marketplace/listings/${encodeURIComponent(listingId)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {});
  }, [listingId, isOwner]);
  return null;
}
