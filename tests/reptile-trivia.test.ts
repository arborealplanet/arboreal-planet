import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  QUESTIONS_PER_ROUND,
  TRIVIA_MODES,
  TRIVIA_QUESTIONS,
  buildRound,
  modeDef,
  rankFor,
  scoreFor,
} from "../src/lib/reptile-trivia.js";

describe("trivia modes", () => {
  it("defines six modes with distinct difficulties", () => {
    assert.equal(TRIVIA_MODES.length, 6);
    assert.deepEqual(
      TRIVIA_MODES.map((m) => m.id),
      ["very-easy", "easy", "normal", "hard", "very-hard", "expert"],
    );
    assert.deepEqual(
      TRIVIA_MODES.map((m) => m.difficulty),
      [1, 2, 3, 4, 5, 6],
    );
  });

  it("deals a full round of matching difficulty for every mode", () => {
    for (const m of TRIVIA_MODES) {
      const round = buildRound(m.id, () => 0.5);
      assert.equal(round.length, QUESTIONS_PER_ROUND, m.id);
      assert.ok(
        round.every((q) => q.difficulty === m.difficulty),
        `${m.id}: all questions should be difficulty ${m.difficulty}`,
      );
    }
  });

  it("keeps the correct answer text after shuffling options", () => {
    for (const m of TRIVIA_MODES) {
      const round = buildRound(m.id, () => 0.42);
      for (const q of round) {
        const original = TRIVIA_QUESTIONS.find((o) => o.id === q.id);
        assert.ok(original, `original question ${q.id} exists`);
        assert.equal(q.options[q.answer], original.options[original.answer]);
        assert.equal(new Set(q.options).size, 4, `${q.id}: options stay unique`);
      }
    }
  });

  it("covers arboreal species beyond green tree pythons", () => {
    const cats: Set<string> = new Set(TRIVIA_QUESTIONS.map((q) => q.category));
    for (const c of [
      "Emerald Tree Boas",
      "Tree Monitors",
      "Boiga & Cat Snakes",
      "Arboreal Vipers",
      "Arboreal Geckos",
    ]) {
      assert.ok(cats.has(c), `category ${c} present`);
    }
  });

  it("scores harder difficulties higher", () => {
    assert.ok(scoreFor(6, 10, 0) > scoreFor(1, 10, 0));
  });

  it("ranks relative to the mode's max score", () => {
    // Perfect-ish expert round earns the top rank; a tiny score stays a hatchling.
    assert.equal(rankFor(7400, "expert").title, "Chondro Master");
    assert.equal(rankFor(100, "expert").title, "Hatchling");
    // Same raw score ranks higher on an easier mode.
    assert.ok(rankFor(2000, "very-easy").title !== "Hatchling");
  });

  it("modeDef falls back to normal for unknown input", () => {
    assert.equal(modeDef("bogus" as never).id, "normal");
  });
});
