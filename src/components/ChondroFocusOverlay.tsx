"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

type FocusOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  mode?: "drawer" | "modal";
};

export function ChondroFocusOverlay({ open, onClose, title, eyebrow, children, mode = "drawer" }: FocusOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const shell = mode === "drawer"
    ? "ml-auto h-full w-full max-w-[620px] border-l border-white/[.08] bg-[#07110d] shadow-[-24px_0_80px_rgba(0,0,0,.42)] sm:w-[min(620px,92vw)]"
    : "mx-auto my-auto max-h-[90vh] w-[min(940px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-white/[.09] bg-[#07110d] shadow-[0_30px_100px_rgba(0,0,0,.55)]";

  return (
    <div className={`fixed inset-0 z-[90] flex ${mode === "drawer" ? "justify-end" : "items-center justify-center p-3"}`} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close detail view" onClick={onClose} className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[3px]" />
      <section className={`relative flex flex-col ${shell}`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/[.07] px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            {eyebrow ? <div className="section-kicker">{eyebrow}</div> : null}
            <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-.035em] text-white">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[.08] bg-white/[.025] text-lg text-white/55 transition hover:border-white/[.15] hover:text-white" aria-label="Close">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}
