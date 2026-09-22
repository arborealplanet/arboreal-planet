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
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  });
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function preparePwa() {
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register("/snake-sorter-sw.js", {
          scope: "/snake-sorter",
          updateViaCache: "none",
        });
        await registration.update().catch(() => undefined);
        await navigator.serviceWorker.ready;
        if (!cancelled && !navigator.serviceWorker.controller && !sessionStorage.getItem("snake-sorter-pwa-reloaded")) {
          sessionStorage.setItem("snake-sorter-pwa-reloaded", "1");
        }
      } catch {
        // The install button below will explain the fallback if Chrome never exposes
        // the native install prompt.
      }
    }

    void preparePwa();

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setPreparing(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      sessionStorage.removeItem("snake-sorter-pwa-reloaded");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <div className="text-sm font-semibold text-emerald-200">Snake Sorter is installed as its own app.</div>;
  }

  async function install() {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }

    if (isIos) {
      window.alert("In Safari, tap Share, then Add to Home Screen. Snake Sorter will open as a standalone app.");
      return;
    }

    setPreparing(true);

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/snake-sorter-sw.js", {
          scope: "/snake-sorter",
          updateViaCache: "none",
        });
        await registration.update().catch(() => undefined);
        await navigator.serviceWorker.ready;

        if (!navigator.serviceWorker.controller && !sessionStorage.getItem("snake-sorter-pwa-reloaded")) {
          sessionStorage.setItem("snake-sorter-pwa-reloaded", "1");
          window.location.reload();
          return;
        }
      } catch {
        // Fall through to the guidance below.
      }
    }

    setPreparing(false);
    window.alert(
      "Chrome has not offered the real app install yet. Do not choose Create shortcut — that is what adds the small Chrome badge. Refresh this page once, then use the Snake Sorter Install App button when Chrome offers the install prompt. If Chrome's menu says Install app, that option is also correct."
    );
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      disabled={preparing}
      className={prominent
        ? "rounded-xl border border-sky-200/25 bg-sky-200 px-4 py-2.5 text-[10px] font-black text-[#03100c] shadow-[0_8px_28px_rgba(125,211,252,.12)] transition hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60"
        : "rounded-full border border-sky-300/12 bg-sky-300/[.035] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.1em] text-sky-100/55 transition hover:border-sky-300/22 hover:bg-sky-300/[.06] disabled:cursor-wait disabled:opacity-60"}
      title="Install Snake Sorter as its own app"
    >
      {preparing ? "Preparing app…" : promptEvent ? "Install Snake Sorter App" : prominent ? "Prepare Snake Sorter App" : "Install App"}
    </button>
  );
}
