import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HAT_LINES,
  HOUSES,
  HOUSE_BY_ID,
  NEONATE_POINTS,
  SNAKES,
  bankForMode,
  ceremonyOrder,
  pileSortDeal,
  sortHousesForMode,
} from "../src/lib/snake-sorting.js";

describe("snake-sorting neonate round data", () => {
  it("exports a small positive wager value", () => {
    assert.equal(typeof NEONATE_POINTS, "number");
    assert.ok(NEONATE_POINTS > 0 && NEONATE_POINTS < 50);
  });

  it("every snake has a red|yellow neonate color", () => {
    for (const s of SNAKES) {
      assert.ok(
        s.neonate === "red" || s.neonate === "yellow",
        `${s.id} has invalid neonate ${s.neonate}`,
      );
    }
  });

  it("house viridis hatches only yellow", () => {
    const viridis = SNAKES.filter((s) => s.house === "viridis");
    assert.ok(viridis.length > 0);
    for (const s of viridis) {
      assert.equal(s.neonate, "yellow");
    }
  });

  it("non-viridis houses offer both neonate colors across the bank", () => {
    const colors = new Set(
      SNAKES.filter((s) => s.house !== "viridis").map((s) => s.neonate),
    );
    assert.deepEqual([...colors].sort(), ["red", "yellow"]);
  });

  it("mistral is a yellow-born cyclops (owner correction)", () => {
    const mistral = SNAKES.find((s) => s.id === "mistral");
    assert.ok(mistral);
    assert.equal(mistral.neonate, "yellow");
    assert.equal(mistral.locality, "Cyclops");
    assert.equal(mistral.house, "utaraensis");
    const scales = mistral.clues.find((c) => c.probe === "scales");
    assert.ok(scales && !/red neonate/i.test(scales.text));
    assert.ok(!/red baby/i.test(mistral.deepScan));
    assert.ok(!/red neonate/i.test(mistral.lesson));
  });

  it("every house referenced by a snake exists", () => {
    for (const s of SNAKES) {
      assert.ok(HOUSE_BY_ID[s.house], `${s.id} references unknown house`);
    }
  });

  it("Gage's new specimens are slotted with correct data", () => {
    const expected = [
      { id: "tempest", house: "utaraensis", locality: "Cyclops", neonate: "red" },
      { id: "copper", house: "pulcher", locality: "Manokwari", neonate: "red" },
      { id: "lumen", house: "utaraensis", locality: "Lereh", neonate: "yellow" },
      { id: "willow", house: "viridis", locality: "Aru", neonate: "yellow" },
      { id: "rust", house: "azurea", locality: "Biak", neonate: "red" },
      { id: "amber", house: "pulcher", locality: "Manokwari", neonate: "yellow" },
      { id: "dune", house: "pulcher", locality: "Manokwari", neonate: "yellow" },
      { id: "spark", house: "azurea", locality: "Biak", neonate: "red" },
      { id: "ash", house: "azurea", locality: "Biak", neonate: "red" },
      { id: "prairie", house: "pulcher", locality: "Manokwari", neonate: "yellow" },
      { id: "pip", house: "pulcher", locality: "Manokwari", neonate: "yellow" },
      { id: "ghost", house: "viridis", locality: "Aru", neonate: "yellow" },
      { id: "fern", house: "viridis", locality: "Aru", neonate: "yellow" },
      { id: "zephyr", house: "utaraensis", locality: "Jayapura", neonate: "yellow" },
      { id: "yapen-1", house: "utaraensis", locality: "Yapen", neonate: "yellow" },
      { id: "sorong-2", house: "pulcher", locality: "Sorong", neonate: "red" },
      { id: "aru-5", house: "viridis", locality: "Aru", neonate: "yellow" },
      { id: "merauke-2", house: "viridis", locality: "Merauke", neonate: "yellow" },
      { id: "merauke-3", house: "viridis", locality: "Merauke", neonate: "yellow" },
      { id: "merauke-4", house: "viridis", locality: "Merauke", neonate: "yellow" },
      { id: "cyclops-3", house: "utaraensis", locality: "Cyclops", neonate: "red" },
    ] as const;
    for (const e of expected) {
      const s = SNAKES.find((x) => x.id === e.id);
      assert.ok(s, `${e.id} missing from the bank`);
      assert.equal(s.house, e.house);
      assert.equal(s.locality, e.locality);
      assert.equal(s.neonate, e.neonate);
      assert.equal(s.photo, `/arcade/snake-sorting/snakes/${e.id}.webp`);
      assert.equal(s.clues.length, 3);
      assert.ok(s.deepScan.length > 0 && s.lesson.length > 0);
      assert.ok(HOUSE_BY_ID[s.house].localities.includes(s.locality));
    }
  });

  it("snake ids are unique", () => {
    const ids = SNAKES.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("the wildcard division exists for hard mode", () => {
    const designer = HOUSES.find((h) => h.id === "designer");
    assert.ok(designer, "designer house missing");
    assert.deepEqual(designer.localities, ["Captive Bred"]);
    // Designer animals join the roster as their photos arrive — the house
    // stands ready even when the division is empty.
    const wild = SNAKES.filter((s) => s.house === "designer");
    for (const s of wild) {
      assert.equal(s.locality, "Captive Bred");
      assert.ok(s.neonate === "red" || s.neonate === "yellow");
      assert.ok(s.clues.length === 3 && s.deepScan.length > 0 && s.lesson.length > 0);
    }
    assert.ok(HAT_LINES.correctHouse.designer.length > 0);
  });

  it("banks and sort options respect the mode", () => {
    const classic = bankForMode("ceremony");
    assert.ok(classic.length > 0);
    assert.ok(classic.every((s) => s.house !== "designer"));
    const endless = bankForMode("endless");
    assert.ok(endless.every((s) => s.house !== "designer"));
    const wild = bankForMode("wildcard");
    assert.equal(wild.length, SNAKES.length);
    assert.equal(sortHousesForMode("ceremony").length, 4);
    assert.equal(sortHousesForMode("endless").length, 4);
    assert.equal(sortHousesForMode("wildcard").length, 5);
    assert.ok(sortHousesForMode("wildcard").some((h) => h.id === "designer"));
  });

  it("wildcard ceremonies include every available designer (up to two)", () => {
    const wildCount = SNAKES.filter((s) => s.house === "designer").length;
    for (let i = 0; i < 25; i++) {
      const order = ceremonyOrder("wildcard", 10);
      assert.equal(order.length, 10);
      assert.equal(
        order.filter((s) => s.house === "designer").length,
        Math.min(2, wildCount),
        "a wildcard ceremony dropped a designer it promised",
      );
    }
    const classic = ceremonyOrder("ceremony", 10);
    assert.equal(classic.length, 10);
    assert.ok(classic.every((s) => s.house !== "designer"));
  });

  it("visible neonates are flagged so the wager is skipped", () => {
    for (const id of ["spark", "ash", "pip", "yapen-1", "merauke-2", "merauke-3"]) {
      const s = SNAKES.find((x) => x.id === id);
      assert.ok(s, `${id} missing`);
      assert.equal(s.isNeonate, true);
    }
    assert.ok(SNAKES.filter((s) => s.isNeonate).length === 6);
  });

  it("the alternate photo never shares a lineup with its twin", () => {
    const spark = SNAKES.find((x) => x.id === "spark");
    assert.ok(spark?.photoAlt, "spark needs its alternate photo");
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const deal = ceremonyOrder("ceremony", 10);
      const cards = deal.filter((s) => s.id === "spark");
      assert.ok(cards.length <= 1, "both spark photos in one lineup");
      for (const c of cards) if (c.photo) seen.add(c.photo);
    }
    assert.ok(seen.has(spark.photo!), "primary spark photo never dealt");
    assert.ok(seen.has(spark.photoAlt!), "alternate spark photo never dealt");
  });

  it("pile-sort deals only photographed serpents", () => {
    for (let i = 0; i < 25; i++) {
      const deal = pileSortDeal();
      assert.ok(deal.length > 0 && deal.length <= 8);
      assert.ok(deal.every((s) => s.photo));
      const ids = deal.map((s) => s.id);
      assert.equal(new Set(ids).size, ids.length);
    }
  });
});
