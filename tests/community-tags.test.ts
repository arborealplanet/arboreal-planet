import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveCommunityTags } from "../src/lib/community-sections.js";

describe("resolveCommunityTags", () => {
  it("keeps stored tags untouched", () => {
    assert.deepEqual(
      resolveCommunityTags({ body: "hello", section: "Husbandry", tags: ["Boiga", " Enclosures "] }),
      ["Boiga", "Enclosures"],
    );
  });

  it("caps stored tags at four", () => {
    assert.deepEqual(
      resolveCommunityTags({ tags: ["a", "b", "c", "d", "e"] }).length,
      4,
    );
  });

  it("labels the Hank Scale husbandry series from their titles", () => {
    const cases: Array<[string, string[]]> = [
      ["Before You Bring Home a Chondro: Is a Green Tree Python Right for You?\nbody", ["Green Tree Python", "Husbandry"]],
      ["Buy the Snake, Not the Story: Picking a Healthy Captive-Bred Chondro (Part 1 of 4)\nbody", ["Green Tree Python", "Breeding", "Husbandry"]],
      ["Build a Gradient, Not a Sauna: Heat, Humidity, and Airflow (Part 2 of 4)\nbody", ["Green Tree Python", "Husbandry", "Enclosures"]],
      ["Perches, Privacy, and Practical Caging (Part 3 of 4)\nbody", ["Green Tree Python", "Enclosures", "Husbandry"]],
      ["Feed 'Em Right, Don't Make a Green Couch Potato (Part 4 of 4)\nbody", ["Green Tree Python", "Husbandry"]],
    ];
    for (const [body, expected] of cases) {
      assert.deepEqual(resolveCommunityTags({ body, section: "Husbandry", tags: [] }), expected, body);
    }
  });

  it("falls back to keyword matching for unknown untagged posts", () => {
    assert.deepEqual(
      resolveCommunityTags({ body: "My boiga needs a taller enclosure", section: "Show & Tell", tags: [] }),
      ["Boiga", "Enclosures"],
    );
  });

  it("adds the Husbandry tag from the section", () => {
    assert.deepEqual(
      resolveCommunityTags({ body: "just a quick question", section: "Husbandry", tags: [] }),
      ["Husbandry"],
    );
  });

  it("returns no tags when nothing matches", () => {
    assert.deepEqual(resolveCommunityTags({ body: "just a quick question", section: "Show & Tell" }), []);
  });
});
