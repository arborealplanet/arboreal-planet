"use client";

import { useEffect, useRef } from "react";

type SavedSnake = { id: string; name?: string };
type GameState = {
  colony?: SavedSnake[];
  favorites?: string[];
  [key: string]: unknown;
};

const STAR_CLASS = "chondro-favorite-card-star";

function starText(favorite: boolean) {
  return favorite ? "★" : "☆";
}

function starTitle(favorite: boolean) {
  return favorite ? "Remove from favorites" : "Favorite this snake";
}

export function ChondroFavoriteCardControls() {
  const stateRef = useRef<GameState>({});
  const busyRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    function favoriteIds() {
      return new Set(Array.isArray(stateRef.current.favorites) ? stateRef.current.favorites : []);
    }

    function findColonyArticles() {
      const headings = Array.from(document.querySelectorAll("h2"));
      const colonyHeading = headings.find((heading) => heading.textContent?.trim() === "Animals and project material");
      const section = colonyHeading?.closest("section");
      return section ? Array.from(section.querySelectorAll("article")) : [];
    }

    function decorate() {
      const colony = Array.isArray(stateRef.current.colony) ? stateRef.current.colony : [];
      if (!colony.length) return;
      const favorites = favoriteIds();
      const articles = findColonyArticles();

      articles.forEach((article, index) => {
        const snake = colony[index];
        if (!snake?.id) return;
        article.classList.add("relative");

        let button = article.querySelector<HTMLButtonElement>(`.${STAR_CLASS}`);
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.className = `${STAR_CLASS} absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/25 bg-black/65 text-xl leading-none text-amber-200 shadow-lg backdrop-blur transition hover:border-amber-200/60 hover:bg-amber-200/10`;
          button.setAttribute("aria-label", `Favorite ${snake.name ?? "snake"}`);
          article.appendChild(button);
        }

        button.dataset.snakeId = snake.id;
        button.textContent = starText(favorites.has(snake.id));
        button.title = starTitle(favorites.has(snake.id));
        button.setAttribute("aria-pressed", favorites.has(snake.id) ? "true" : "false");
      });
    }

    async function loadState() {
      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || cancelled) return;
        stateRef.current = (data.save?.state ?? {}) as GameState;
        decorate();
      } catch {}
    }

    async function toggleFavorite(snakeId: string) {
      if (!snakeId || busyRef.current.has(snakeId)) return;
      busyRef.current.add(snakeId);
      try {
        const current = stateRef.current;
        const favorites = new Set(Array.isArray(current.favorites) ? current.favorites : []);
        if (favorites.has(snakeId)) favorites.delete(snakeId);
        else favorites.add(snakeId);

        const next: GameState = { ...current, favorites: Array.from(favorites) };
        stateRef.current = next;
        decorate();

        const response = await fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!response.ok) {
          await loadState();
          return;
        }
        window.dispatchEvent(new CustomEvent("arboreal-chondro-favorites-change", { detail: next.favorites }));
      } catch {
        await loadState();
      } finally {
        busyRef.current.delete(snakeId);
      }
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>(`.${STAR_CLASS}`);
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      void toggleFavorite(button.dataset.snakeId ?? "");
    }

    void loadState();
    document.addEventListener("click", onClick, true);
    observer = new MutationObserver(() => decorate());
    observer.observe(document.body, { childList: true, subtree: true });

    const refresh = window.setInterval(() => {
      if (!cancelled) void loadState();
    }, 15000);

    return () => {
      cancelled = true;
      document.removeEventListener("click", onClick, true);
      observer?.disconnect();
      window.clearInterval(refresh);
    };
  }, []);

  return null;
}
