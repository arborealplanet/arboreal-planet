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

export function SnakeSorterInstallButton({ prominent = false }: { prominent?: boolean }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isIos] = useState(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/snake-sorter-sw.js", { scope: "/snake-sorter", updateViaCache: "none" }).catch(() => undefined);
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

  if (installed) return null;

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }

    if (isIos) {
      window.alert("In Safari, tap Share, then Add to Home Screen. Snake Sorter will install with its own home-screen icon.");
      return;
    }

    window.alert(
      "Open /snake-sorter/install in a normal Chrome tab, outside the Arboreal Planet app. Then use Chrome’s menu → Add to Home screen → Install. Confirm the name is Snake Sorter. If only Arboreal Planet is offered, cancel rather than installing the wrong app."
    );
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={prominent
        ? "rounded-xl border border-sky-200/25 bg-sky-200 px-4 py-2.5 text-[10px] font-black text-[#03100c] shadow-[0_8px_28px_rgba(125,211,252,.12)] transition hover:bg-sky-100"
        : "rounded-full border border-sky-300/12 bg-sky-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-sky-100/55 transition hover:border-sky-300/22 hover:bg-sky-300/[.06]"}
      title="Install Snake Sorter as its own app"
    >
      {prominent ? "Add Snake Sorter to Home Screen" : "Install App"}
    </button>
  );
}
