import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  RENTAL_ITEM_LIMITS,
  RENTAL_ITEM_KEYS,
  RENTAL_SERVICE_KEYS,
  rentalCatalogPublicMetadata
} from "../rental-catalog-contract.js";

function parseLegacyWorkerLimits(source) {
  const block = source.match(/const RENTAL_ITEM_LIMITS = \{([\s\S]*?)\n\};/);
  assert.ok(block, "worker.js must expose the legacy Rental limits block until extraction is complete");
  return Object.fromEntries(
    [...block[1].matchAll(/([A-Za-z][A-Za-z0-9]*):\s*(\d+)/g)]
      .map((match) => [match[1], Number(match[2])])
  );
}

test("shared Rental catalog preserves the active backend IDs and limits", async () => {
  const worker = await readFile(new URL("../worker.js", import.meta.url), "utf8");
  assert.deepEqual(parseLegacyWorkerLimits(worker), RENTAL_ITEM_LIMITS);
  assert.deepEqual(RENTAL_ITEM_KEYS, [
    "wing", "flow8", "lv1", "dl32", "stageGrid", "handhelds",
    "headsets", "pa", "labeler", "videoServer", "monitor"
  ]);
  assert.deepEqual(RENTAL_SERVICE_KEYS, ["engineering", "streaming", "delivery"]);
});

test("shared Rental metadata contains no pricing or inventory-availability claims", () => {
  const serialized = JSON.stringify(rentalCatalogPublicMetadata());
  for (const forbidden of [
    "dayOne",
    "additionalDayMultiplier",
    "estimatedTotal",
    "customQuote",
    "availableNow",
    "inventoryAvailable"
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("Assistant no longer owns a private Rental catalog snapshot", async () => {
  const assistantSource = await readFile(
    new URL("../assistant-rental-query.js", import.meta.url),
    "utf8"
  );
  assert.match(assistantSource, /from "\.\/rental-catalog-contract\.js"/);
  assert.doesNotMatch(assistantSource, /const CATALOG_SNAPSHOT/);
  assert.doesNotMatch(assistantSource, /const SERVICE_SNAPSHOT/);
});
