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

export function PwaInstallButton() {
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
      window.alert("On iPhone or iPad, tap Share in Safari, then choose Add to Home Screen.");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className="ml-auto shrink-0 rounded-xl border border-emerald-300/20 bg-emerald-300/[.045] px-3 py-2 text-[10px] font-black uppercase tracking-[.08em] text-emerald-100/75 transition hover:border-emerald-300/35 hover:bg-emerald-300/[.08] lg:ml-2 lg:text-[11px]"
      title={isIos && !promptEvent ? "Add Arboreal Planet to your Home Screen" : "Install Arboreal Planet"}
    >
      Install App
    </button>
  );
}
