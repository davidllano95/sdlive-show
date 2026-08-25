import test from "node:test";
import assert from "node:assert/strict";
import { rentalRequestHasSelection } from "../rental-request-validation.js";

test("rental selection rejects a completely empty request", () => {
  assert.equal(rentalRequestHasSelection({ items: {}, services: {} }), false);
  assert.equal(rentalRequestHasSelection({}), false);
  assert.equal(rentalRequestHasSelection(null), false);
});

test("rental selection accepts equipment requests", () => {
  assert.equal(rentalRequestHasSelection({ items: { wing: 1 }, services: {} }), true);
  assert.equal(rentalRequestHasSelection({ items: { labeler: "1" }, services: {} }), true);
  assert.equal(rentalRequestHasSelection({ items: { lv1: "2" }, services: {} }), true);
});

test("rental selection preserves valid service-only requests", () => {
  assert.equal(rentalRequestHasSelection({ items: {}, services: { engineering: "yes" } }), true);
  assert.equal(rentalRequestHasSelection({ items: {}, services: { streaming: "yes" } }), true);
  assert.equal(rentalRequestHasSelection({ items: {}, services: { delivery: "yes" } }), true);
});

test("rental selection ignores zero and disabled values", () => {
  assert.equal(rentalRequestHasSelection({
    items: { wing: 0, lv1: "0", labeler: "0" },
    services: { engineering: "no", streaming: "no", delivery: "no" }
  }), false);
});
