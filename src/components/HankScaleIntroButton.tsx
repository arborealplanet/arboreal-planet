"use client";

import { useEffect, useState } from "react";
import { isHankScaleMuted, playHankScaleAudio, setHankScaleMuted } from "@/lib/hank-scale-voice";

/**
 * "Hear Hank's intro" button for site section pages (episodes, community,
 * marketplace, journal). Clicking while muted unmutes first — the click is an
 * explicit request to hear him.
 */
export function HankScaleIntroButton({ src, label }: { src: string; label: string }) {
  const [muted, setMuted] = useState(() => isHankScaleMuted());

  useEffect(() => {
    const onChange = () => setMuted(isHankScaleMuted());
    window.addEventListener("hank-scale-mute-changed", onChange);
    return () => window.removeEventListener("hank-scale-mute-changed", onChange);
  }, []);

  function handleClick() {
    if (isHankScaleMuted()) setHankScaleMuted(false);
    playHankScaleAudio(src);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
      className="secondary-action"
    >
      <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
      <span>Hear Hank&apos;s intro</span>
    </button>
  );
}
