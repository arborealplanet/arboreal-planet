"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export function SnakeSorterInstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos] = useState(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  });

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!promptEvent && !isIos)) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }

    if (isIos) {
      window.alert("In Safari, tap Share, then Add to Home Screen. Snake Sorter will open directly from its home-screen icon.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className="rounded-full border border-sky-300/12 bg-sky-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-sky-100/55 transition hover:border-sky-300/22 hover:bg-sky-300/[.06]"
      title={isIos && !promptEvent ? "Add Snake Sorter to your Home Screen" : "Install Snake Sorter"}
    >
      Install
    </button>
  );
}
