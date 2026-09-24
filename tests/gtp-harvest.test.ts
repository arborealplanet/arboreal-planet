import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyGtpListing,
  normalizeAgeClass,
  normalizeListingStatus,
  normalizeLocalityLabel,
  normalizeMarketCountry,
  normalizeNeonateColor,
  normalizeOrigin,
  normalizePriceFormat,
  normalizePriceType,
  normalizeSex,
} from "../src/lib/gtp-harvest.js";

describe("normalizeLocalityLabel", () => {
  it("maps Lereh to the seeded 'Lereh / Highland' row", () => {
    assert.equal(normalizeLocalityLabel("Lereh"), "Lereh / Highland");
    assert.equal(normalizeLocalityLabel("lereh highland"), "Lereh / Highland");
  });
  it("maps trade-name aliases to seeded localities", () => {
    assert.equal(normalizeLocalityLabel("Supiori"), "Biak");
    assert.equal(normalizeLocalityLabel("Numfoor"), "Numfor");
  });
  it("passes through unknown labels untouched and nulls blanks", () => {
    assert.equal(normalizeLocalityLabel("Somewhere Else"), "Somewhere Else");
    assert.equal(normalizeLocalityLabel(""), null);
    assert.equal(normalizeLocalityLabel(null), null);
  });
});

describe("classifyGtpListing", () => {
  it("sends unknown ancestry to needs_review, never auto-rejection", () => {
    const result = classifyGtpListing("Green tree python for sale", "");
    assert.equal(result.ancestry_class, "unknown");
    assert.equal(result.review_status, "needs_review");
    assert.equal(result.snake_sorter_eligible, false);
  });
  it("accepts same-subspecies locality crosses (Numfor x Biak is azurea azurea)", () => {
    const result = classifyGtpListing("Numfor x Biak green tree python", "");
    assert.equal(result.ancestry_class, "pure_subspecies_locality_cross");
    assert.equal(result.snake_sorter_eligible, true);
    assert.equal(result.review_status, "pending");
  });
  it("rejects cross-subspecies animals", () => {
    const result = classifyGtpListing("Aru x Sorong green tree python", "");
    assert.equal(result.ancestry_class, "cross_subspecies");
    assert.equal(result.review_status, "rejected");
  });
  it("rejects designer animals", () => {
    const result = classifyGtpListing("Blue line green tree python", "");
    assert.equal(result.ancestry_class, "designer");
    assert.equal(result.review_status, "rejected");
  });
});

describe("normalizeOrigin", () => {
  it("treats LTC as IMPORT", () => {
    assert.equal(normalizeOrigin("LTC"), "IMPORT");
    assert.equal(normalizeOrigin("long-term captive"), "IMPORT");
  });
  it("leaves CH / captive-hatched UNKNOWN for manual review", () => {
    assert.equal(normalizeOrigin("CH"), "UNKNOWN");
    assert.equal(normalizeOrigin("captive-hatched"), "UNKNOWN");
  });
});

describe("normalizeListingStatus", () => {
  it("keeps PENDING and UNLISTED distinct from SOLD/REMOVED", () => {
    assert.equal(normalizeListingStatus("pending"), "PENDING");
    assert.equal(normalizeListingStatus("unlisted"), "UNLISTED");
    assert.equal(normalizeListingStatus("sold"), "SOLD");
    assert.equal(normalizeListingStatus("removed"), "REMOVED");
  });
});

describe("price normalization", () => {
  it("restricts price_type to the contract enum", () => {
    assert.equal(normalizePriceType("pair"), "pair");
    assert.equal(normalizePriceType("auction"), "unknown");
  });
  it("classifies price edge cases and never guesses fixed", () => {
    assert.equal(normalizePriceFormat("auction"), "auction");
    assert.equal(normalizePriceFormat("inquire"), "inquire");
    assert.equal(normalizePriceFormat("trade"), "trade");
    assert.equal(normalizePriceFormat("payment plan"), "payment_plan");
    assert.equal(normalizePriceFormat("something weird"), "unknown");
  });
});

describe("other normalizers", () => {
  it("normalizes country, sex, age, and neonate color", () => {
    assert.equal(normalizeMarketCountry("usa"), "USA");
    assert.equal(normalizeSex("f"), "FEMALE");
    assert.equal(normalizeAgeClass("hatchling"), "NEONATE");
    assert.equal(normalizeNeonateColor("red"), "RED");
    assert.equal(normalizeNeonateColor("green"), "UNKNOWN");
  });
});
