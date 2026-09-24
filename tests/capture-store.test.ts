import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hammingDistance,
  missingGallerySlots,
  PERCEPTUAL_DUPLICATE_THRESHOLD,
  validPerceptualHash,
} from "../src/lib/snake-sorter/capture-store.js";
import { capturePriorityScore } from "../src/lib/snake-sorter/capture-priority.js";

describe("validPerceptualHash", () => {
  it("accepts exactly 16 lowercase hex chars", () => {
    assert.equal(validPerceptualHash("abcdef0123456789"), "abcdef0123456789");
  });
  it("rejects anything else — no silent truncation", () => {
    assert.equal(validPerceptualHash("abc"), null);
    assert.equal(validPerceptualHash("abcdef0123456789ff"), null);
    assert.equal(validPerceptualHash("ABCDEF0123456789"), "abcdef0123456789");
    assert.equal(validPerceptualHash("zzzzzzzzzzzzzzzz"), null);
    assert.equal(validPerceptualHash(""), null);
    assert.equal(validPerceptualHash(null), null);
  });
});

describe("hammingDistance", () => {
  it("is zero for identical hashes", () => {
    assert.equal(hammingDistance("abcdef0123456789", "abcdef0123456789"), 0);
  });
  it("counts bit differences across all 64 bits", () => {
    // One nibble differs by one bit.
    assert.equal(hammingDistance("0000000000000000", "1000000000000000"), 1);
    // All 64 bits differ.
    assert.equal(hammingDistance("0000000000000000", "ffffffffffffffff"), 64);
  });
  it("catches near-duplicates inside the threshold", () => {
    const a = "abcdef0123456789";
    const b = "abcdef0123456788"; // one bit off
    assert.ok(hammingDistance(a, b) <= PERCEPTUAL_DUPLICATE_THRESHOLD);
  });
  it("lets clearly different photos through", () => {
    assert.ok(
      hammingDistance("0000000000000000", "ffffffffffffff00") > PERCEPTUAL_DUPLICATE_THRESHOLD,
    );
  });
});

describe("missingGallerySlots", () => {
  it("reports missing slots against the expected total", () => {
    const result = missingGallerySlots([
      { gallery_index: 1, gallery_total: 4 },
      { gallery_index: 3, gallery_total: 4 },
    ]);
    assert.equal(result.gallery_total, 4);
    assert.deepEqual(result.missing, [2, 4]);
  });
  it("reports nothing missing when the gallery is complete", () => {
    const result = missingGallerySlots([
      { gallery_index: 1, gallery_total: 2 },
      { gallery_index: 2, gallery_total: 2 },
    ]);
    assert.deepEqual(result.missing, []);
  });
  it("returns a null total when no gallery accounting was provided", () => {
    const result = missingGallerySlots([{ gallery_index: null, gallery_total: null }]);
    assert.equal(result.gallery_total, null);
  });
});

describe("capturePriorityScore", () => {
  const base = {
    review_status: "pending",
    life_stage_hint: "adult",
    provisional_locality: "Biak",
    locality_raw: null,
    discovered_at: "2026-09-24T00:00:00Z",
  };
  it("never treats neonate color as a signal", () => {
    const red = capturePriorityScore({ ...base }, 10);
    const yellow = capturePriorityScore({ ...base }, 10);
    assert.equal(red, yellow);
  });
  it("prefers approved candidates and rare localities", () => {
    const approved = capturePriorityScore({ ...base, review_status: "approved" }, 10);
    const pending = capturePriorityScore(base, 10);
    assert.ok(approved > pending);
    const rare = capturePriorityScore(base, 1);
    const common = capturePriorityScore(base, 90);
    assert.ok(rare > common);
  });
  it("prefers young animals without any color bias", () => {
    const neonate = capturePriorityScore({ ...base, life_stage_hint: "neonate" }, 10);
    const adult = capturePriorityScore({ ...base, life_stage_hint: "adult" }, 10);
    assert.ok(neonate > adult);
  });
});
