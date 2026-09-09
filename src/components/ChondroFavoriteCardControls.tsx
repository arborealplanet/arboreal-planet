"use client";

import { useEffect, useRef } from "react";

type SavedSnake = { id: string; name?: string };
type GameState = {
  colony?: SavedSnake[];
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
  const favoriteIdsRef = useRef<string[]>([]);
  const busyRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    function findColonyArticles() {
      const headings = Array.from(document.querySelectorAll("h2"));
      const colonyHeading = headings.find((heading) => heading.textContent?.trim() === "Animals and project material");
      const section = colonyHeading?.closest("section");
      return section ? Array.from(section.querySelectorAll("article")) : [];
    }

    function decorate() {
      const colony = Array.isArray(stateRef.current.colony) ? stateRef.current.colony : [];
      if (!colony.length) return;
      const favorites = new Set(favoriteIdsRef.current);
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
          article.appendChild(button);
        }

        const favorite = favorites.has(snake.id);
        const nextText = starText(favorite);
        const nextTitle = starTitle(favorite);
        const nextPressed = favorite ? "true" : "false";
        const nextLabel = `${nextTitle}: ${snake.name ?? "snake"}`;

        button.dataset.snakeId = snake.id;
        if (button.textContent !== nextText) button.textContent = nextText;
        if (button.title !== nextTitle) button.title = nextTitle;
        if (button.getAttribute("aria-pressed") !== nextPressed) button.setAttribute("aria-pressed", nextPressed);
        if (button.getAttribute("aria-label") !== nextLabel) button.setAttribute("aria-label", nextLabel);
      });
    }

    async function loadState() {
      try {
        const [saveResponse, favoritesResponse] = await Promise.all([
          fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" }),
          fetch("/api/hatchery/chondro-breeder/favorites", { cache: "no-store" }),
        ]);
        const saveData = await saveResponse.json();
        const favoritesData = await favoritesResponse.json();
        if (cancelled || !saveResponse.ok) return;
        stateRef.current = (saveData.save?.state ?? {}) as GameState;
        favoriteIdsRef.current = favoritesResponse.ok && Array.isArray(favoritesData.favoriteIds)
          ? favoritesData.favoriteIds.map((id: unknown) => String(id))
          : [];
        decorate();
      } catch {}
    }

    async function toggleFavorite(snakeId: string) {
      if (!snakeId || busyRef.current.has(snakeId)) return;
      busyRef.current.add(snakeId);
      try {
        const current = new Set(favoriteIdsRef.current);
        const favorite = !current.has(snakeId);
        if (favorite) current.add(snakeId);
        else current.delete(snakeId);
        favoriteIdsRef.current = Array.from(current);
        decorate();

        const response = await fetch("/api/hatchery/chondro-breeder/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snakeId, favorite }),
        });
        const data = await response.json();
        if (!response.ok) {
          await loadState();
          return;
        }
        favoriteIdsRef.current = Array.isArray(data.favoriteIds)
          ? data.favoriteIds.map((id: unknown) => String(id))
          : [];
        decorate();
        window.dispatchEvent(new CustomEvent("arboreal-chondro-favorites-change", { detail: favoriteIdsRef.current }));
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
