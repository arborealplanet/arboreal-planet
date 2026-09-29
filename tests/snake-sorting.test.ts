import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HOUSE_BY_ID,
  NEONATE_POINTS,
  SNAKES,
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

  it("house viridis hatches only yellow (wager exclusion holds)", () => {
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
});
