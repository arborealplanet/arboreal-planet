"use client";

import { useEffect } from "react";

const TOGGLE_CLASS = "chondro-animal-card-toggle";
const FAVORITE_CLASS = "chondro-favorite-card-star";

function colonyArticles() {
  const heading = Array.from(document.querySelectorAll("h2")).find(
    (node) => node.textContent?.trim() === "Animals and project material",
  );
  const section = heading?.closest("section");
  return section ? Array.from(section.querySelectorAll<HTMLElement>("article.panel")) : [];
}

function decorateCards() {
  for (const article of colonyArticles()) {
    if (!article.dataset.chondroExpanded) article.dataset.chondroExpanded = "false";

    let toggle = article.querySelector<HTMLButtonElement>(`.${TOGGLE_CLASS}`);
    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = `${TOGGLE_CLASS} mt-3 w-full rounded-xl border border-white/[.08] bg-white/[.025] px-3 py-2 text-left text-[10px] font-black uppercase tracking-[.12em] text-white/45 transition hover:border-emerald-300/20 hover:text-emerald-100/70`;

      const directChildren = Array.from(article.children);
      const header = directChildren[1];
      if (header) header.insertAdjacentElement("afterend", toggle);
      else article.appendChild(toggle);
    }

    const expanded = article.dataset.chondroExpanded === "true";
    toggle.textContent = expanded ? "Hide animal details ▴" : "Show animal details ▾";
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");

    const children = Array.from(article.children) as HTMLElement[];
    let visibleCoreCount = 0;
    for (const child of children) {
      if (child === toggle || child.classList.contains(FAVORITE_CLASS)) continue;

      if (visibleCoreCount < 2) {
        visibleCoreCount += 1;
        child.hidden = false;
        child.removeAttribute("data-chondro-animal-detail");
        continue;
      }

      child.dataset.chondroAnimalDetail = "true";
      child.hidden = !expanded;
    }
  }
}

export function ChondroAnimalCardCollapse() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const toggle = target?.closest<HTMLButtonElement>(`.${TOGGLE_CLASS}`);
      if (!toggle) return;

      const article = toggle.closest<HTMLElement>("article.panel");
      if (!article) return;

      article.dataset.chondroExpanded = article.dataset.chondroExpanded === "true" ? "false" : "true";
      decorateCards();
    };

    decorateCards();
    document.addEventListener("click", onClick);

    const observer = new MutationObserver(() => decorateCards());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("click", onClick);
      observer.disconnect();
    };
  }, []);

  return null;
}
