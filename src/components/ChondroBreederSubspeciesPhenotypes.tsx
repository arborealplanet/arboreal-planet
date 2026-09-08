"use client";

import { useEffect, useState } from "react";

type Subspecies =
  | "Morelia azurea azurea"
  | "Morelia azurea pulcher"
  | "Morelia azurea utaraensis"
  | "Morelia viridis";

type Snake = {
  id?: string;
  name?: string;
  subspecies?: Subspecies;
  locality?: string;
  classification?: string;
  phenotypeScore?: number;
  generation?: number;
  parentIds?: string[];
  ancestry?: Partial<Record<Subspecies, number>>;
};

type Clutch = { dam?: Snake; sire?: Snake; offspring?: Snake[] };
type GameSave = {
  colony?: Snake[];
  clutch?: Clutch | null;
  clutchHistory?: Array<Clutch & { holdbackIds?: string[] }>;
  [key: string]: unknown;
};

const LOCAL_SAVE_KEY = "arboreal_chondro_breeder_v2";

const shortName: Record<Subspecies, string> = {
  "Morelia azurea azurea": "M. a. azurea",
  "Morelia azurea pulcher": "M. a. pulcher",
  "Morelia azurea utaraensis": "M. a. utaraensis",
  "Morelia viridis": "M. viridis",
};

const localitySubspecies: Record<string, Subspecies> = {
  Biak: "Morelia azurea azurea",
  Numfor: "Morelia azurea azurea",
  Manokwari: "Morelia azurea pulcher",
  Sorong: "Morelia azurea pulcher",
  Timika: "Morelia azurea pulcher",
  Cyclops: "Morelia azurea utaraensis",
  Jayapura: "Morelia azurea utaraensis",
  Lereh: "Morelia azurea utaraensis",
  Wamena: "Morelia azurea utaraensis",
  Aru: "Morelia viridis",
  Merauke: "Morelia viridis",
};

function parseSave(value: unknown): GameSave | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as GameSave;
}

function hashNumber(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function grade(score = 0) {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 74) return "B";
  if (score >= 68) return "B-";
  if (score >= 62) return "C+";
  return "C";
}

function subspeciesPurity(snake: Snake) {
  if (!snake.subspecies || snake.classification !== "Pure") return 0;
  const ancestry = snake.ancestry?.[snake.subspecies];
  return typeof ancestry === "number" ? ancestry : 100;
}

function qualifies(snake: Snake) {
  return Boolean(snake.subspecies && snake.classification === "Pure" && subspeciesPurity(snake) >= 99.9);
}

function allSnakes(save: GameSave) {
  const found = new Map<string, Snake>();
  const add = (snake?: Snake) => {
    if (!snake) return;
    const key = snake.id || `${snake.name || "snake"}-${found.size}`;
    if (!found.has(key)) found.set(key, snake);
  };
  for (const snake of save.colony ?? []) add(snake);
  if (save.clutch) {
    add(save.clutch.dam);
    add(save.clutch.sire);
    for (const snake of save.clutch.offspring ?? []) add(snake);
  }
  for (const record of save.clutchHistory ?? []) {
    add(record.dam);
    add(record.sire);
    for (const snake of record.offspring ?? []) add(snake);
  }
  return [...found.values()];
}

function migratePhenotypes(save: GameSave) {
  const copy = JSON.parse(JSON.stringify(save)) as GameSave;
  const snakes = allSnakes(copy);
  const byId = new Map(snakes.filter((snake) => snake.id).map((snake) => [snake.id as string, snake]));
  let changed = false;

  for (let pass = 0; pass < 4; pass++) {
    for (const snake of snakes) {
      if (!qualifies(snake) || Number(snake.phenotypeScore ?? 0) > 0) continue;
      const parents = (snake.parentIds ?? []).map((id) => byId.get(id)).filter((parent): parent is Snake => Boolean(parent));
      const sameSubspeciesParents = parents.filter(
        (parent) => parent.subspecies === snake.subspecies && qualifies(parent) && Number(parent.phenotypeScore ?? 0) > 0,
      );

      if (sameSubspeciesParents.length >= 2) {
        const midpoint = sameSubspeciesParents.slice(0, 2).reduce((sum, parent) => sum + Number(parent.phenotypeScore ?? 0), 0) / 2;
        const hash = hashNumber(snake.id || snake.name || "offspring");
        const variation = (hash % 13) - 6;
        const breakthrough = hash % 40 === 0 ? 4 + (hash % 7) : 0;
        snake.phenotypeScore = clamp(midpoint + variation + breakthrough);
        changed = true;
      } else if ((snake.generation ?? 1) <= 1) {
        snake.phenotypeScore = 66 + (hashNumber(snake.id || snake.name || "foundation") % 30);
        changed = true;
      }
    }
  }

  return { save: copy, changed };
}

function replaceLegacyCopy(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    let text = node.nodeValue || "";
    const original = text;
    for (const [locality, subspecies] of Object.entries(localitySubspecies)) {
      text = text.replace(
        new RegExp(`(A\\+\\+|A\\+|A-|A|B\\+|B-|B|C\\+|C) ${locality} phenotype`, "g"),
        `$1 ${shortName[subspecies]} phenotype`,
      );
    }
    text = text
      .replace("Pure locality is its own chase.", "Subspecies phenotype is its own chase.")
      .replace(
        "Same-locality pure pairings preserve a named phenotype grade. Mixing localities creates a Pure · Mixed Locality animal with no named-locality grade.",
        "Pure pairings within the same subspecies preserve a subspecies phenotype grade. Locality names remain pedigree information; mixing locality labels within one subspecies stays Pure and is not a hybrid.",
      )
      .replace("locality breeders can choose to work completely by appearance and pedigree", "subspecies breeders can work completely by appearance and pedigree")
      .replace("locality grade", "subspecies phenotype grade")
      .replace("best locality grade", "best subspecies phenotype")
      .replace("A+ pure named-locality phenotype", "A+ pure-subspecies phenotype")
      .replace("100% named-locality line", "100% pure-subspecies line");
    if (text !== original) node.nodeValue = text;
  }
}

function addMissingBadges(save: GameSave) {
  const snakes = allSnakes(save).filter((snake) => qualifies(snake) && Number(snake.phenotypeScore ?? 0) > 0 && snake.subspecies);
  const containers = document.querySelectorAll<HTMLElement>("article, [role='dialog'], button");

  for (const snake of snakes) {
    const id = snake.id || "";
    const candidates = [...containers].filter((node) => {
      const text = node.textContent || "";
      return id ? text.includes(id) : Boolean(snake.name && text.includes(snake.name));
    });
    for (const node of candidates) {
      if (node.querySelector(`[data-subspecies-phenotype="${CSS.escape(id || snake.name || "snake")}"]`)) continue;
      const legacyBadge = [...node.querySelectorAll<HTMLElement>("span")].find((span) => / phenotype$/.test(span.textContent?.trim() || ""));
      if (legacyBadge) continue;
      const badge = document.createElement("span");
      badge.dataset.subspeciesPhenotype = id || snake.name || "snake";
      badge.className = "ml-2 inline-flex rounded-full border border-amber-200/15 bg-amber-200/[.04] px-3 py-1 text-[10px] font-bold text-amber-100/70";
      badge.textContent = `${grade(Number(snake.phenotypeScore))} ${shortName[snake.subspecies as Subspecies]} phenotype`;
      const heading = node.querySelector<HTMLElement>(".font-semibold, .text-xl");
      if (heading?.parentElement) heading.parentElement.appendChild(badge);
    }
  }
}

export function ChondroBreederSubspeciesPhenotypes() {
  const [save, setSave] = useState<GameSave | null>(null);

  useEffect(() => {
    let cancelled = false;
    let lastSerialized = "";

    async function sync() {
      let current: GameSave | null = null;
      try {
        current = parseSave(JSON.parse(window.localStorage.getItem(LOCAL_SAVE_KEY) || "null"));
      } catch {}

      try {
        const response = await fetch("/api/hatchery/chondro-breeder/save", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          current = parseSave(data.save?.state) ?? current;
        }
      } catch {}

      if (!current || cancelled) return;
      const migrated = migratePhenotypes(current);
      const serialized = JSON.stringify(migrated.save);
      if (serialized !== lastSerialized) {
        lastSerialized = serialized;
        setSave(migrated.save);
      }
      if (!migrated.changed) return;

      try {
        window.localStorage.setItem(LOCAL_SAVE_KEY, serialized);
      } catch {}
      try {
        await fetch("/api/hatchery/chondro-breeder/save", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
      } catch {}
    }

    void sync();
    const timer = window.setInterval(() => void sync(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const enhance = () => {
      replaceLegacyCopy(document.body);
      if (save) addMissingBadges(save);
    };
    enhance();
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [save]);

  return null;
}
