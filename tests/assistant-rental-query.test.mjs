import test from "node:test";
import assert from "node:assert/strict";

import {
  ASSISTANT_RENTAL_INTEGRATION_GUARDRAILS,
  assistantRentalCatalogSnapshot,
  resolveAssistantRentalQuery
} from "../assistant-rental-query.js";

const EXPECTED_ITEM_KEYS = [
  "wing",
  "flow8",
  "lv1",
  "dl32",
  "stageGrid",
  "handhelds",
  "headsets",
  "pa",
  "labeler",
  "videoServer",
  "monitor"
];

const EXPECTED_SERVICE_KEYS = ["engineering", "streaming", "delivery"];

test("Assistant Rental metadata comes from the shared Rental catalog contract", () => {
  const catalog = assistantRentalCatalogSnapshot();
  assert.equal(catalog.version, "rental-catalog-v1");
  assert.equal(catalog.assistantVersion, "assistant-rental-query-v2");
  assert.deepEqual(catalog.items.map((item) => item.key), EXPECTED_ITEM_KEYS);
  assert.deepEqual(catalog.services.map((service) => service.key), EXPECTED_SERVICE_KEYS);

  assert.deepEqual(
    Object.fromEntries(catalog.items.map((item) => [item.key, item.maxQuantity])),
    {
      wing: 1,
      flow8: 1,
      lv1: 2,
      dl32: 2,
      stageGrid: 2,
      handhelds: 2,
      headsets: 6,
      pa: 2,
      labeler: 1,
      videoServer: 1,
      monitor: 1
    }
  );

  assert.equal(catalog.guardrails.catalogSnapshotOnly, false);
  assert.equal(catalog.guardrails.sharedRentalMetadata, true);
});

test("resolves exact product aliases into existing Rental keys", () => {
  const result = resolveAssistantRentalQuery({
    items: [
      { name: "Behringer WING", quantity: 1 },
      { name: "Midas DL32", quantity: 2 },
      { name: "Waves LV1 Classic", quantity: 1 },
      { name: "StageGrid 4000", quantity: 1 }
    ]
  });

  assert.equal(result.readyForBackendEvaluation, true);
  assert.deepEqual(
    result.resolvedItems.map((item) => [item.key, item.quantity]),
    [
      ["wing", 1],
      ["dl32", 2],
      ["lv1", 1],
      ["stageGrid", 1]
    ]
  );
  assert.deepEqual(result.backendRequest.items, {
    wing: 1,
    flow8: 0,
    lv1: 1,
    dl32: 2,
    stageGrid: 1,
    handhelds: 0,
    headsets: 0,
    pa: 0,
    labeler: "0",
    videoServer: "0",
    monitor: "0"
  });
});

test("resolves bounded Spanish aliases without fuzzy guessing", () => {
  const result = resolveAssistantRentalQuery({
    items: [
      { name: "micrófono inalámbrico de mano", quantity: 2 },
      { name: "micrófonos diadema", quantity: 4 },
      { name: "etiquetadora", quantity: 1 },
      { name: "servidor de video", quantity: 1 }
    ],
    services: ["ingeniero de sonido", "servicio de streaming", "transporte"]
  });

  assert.equal(result.readyForBackendEvaluation, true);
  assert.equal(result.backendRequest.items.handhelds, 2);
  assert.equal(result.backendRequest.items.headsets, 4);
  assert.equal(result.backendRequest.items.labeler, "1");
  assert.equal(result.backendRequest.items.videoServer, "1");
  assert.deepEqual(result.backendRequest.services, {
    engineering: "yes",
    streaming: "yes",
    delivery: "yes"
  });
});

test("combines duplicate aliases for the same canonical item", () => {
  const result = resolveAssistantRentalQuery({
    items: [
      { name: "DL32", quantity: 1 },
      { name: "Midas DL32", quantity: 1 }
    ]
  });

  assert.equal(result.readyForBackendEvaluation, true);
  assert.equal(result.backendRequest.items.dl32, 2);
  assert.deepEqual(
    result.resolvedItems.find((item) => item.key === "dl32"),
    {
      key: "dl32",
      label: "Midas DL32",
      quantity: 2,
      type: "quantity",
      maxQuantity: 2
    }
  );
});

test("quantities above current backend limits fail closed instead of clamping", () => {
  const result = resolveAssistantRentalQuery({
    items: [{ name: "WING", quantity: 2 }]
  });

  assert.equal(result.readyForBackendEvaluation, false);
  assert.equal(result.backendRequest.items.wing, 0);
  assert.deepEqual(result.resolvedItems, []);
  assert.deepEqual(result.issues, [{
    type: "quantity_exceeds_current_backend_limit",
    key: "wing",
    requestedQuantity: 2,
    maxQuantity: 1
  }]);
});

test("unknown and ambiguous names remain unresolved and are never guessed", () => {
  const result = resolveAssistantRentalQuery({
    items: [
      { name: "wireless", quantity: 2 },
      { name: "Yamaha DM7", quantity: 1 }
    ],
    services: ["lighting"]
  });

  assert.equal(result.readyForBackendEvaluation, false);
  assert.deepEqual(result.resolvedItems, []);
  assert.deepEqual(result.resolvedServices, []);
  assert.deepEqual(result.unresolved, [
    { type: "item", index: 0, requested: "wireless", quantity: 2 },
    { type: "item", index: 1, requested: "Yamaha DM7", quantity: 1 },
    { type: "service", index: 0, requested: "lighting" }
  ]);
});

test("invalid quantities are reported without creating a backend selection", () => {
  for (const quantity of [0, -1, 1.5, "many"]) {
    const result = resolveAssistantRentalQuery({
      items: [{ name: "DL32", quantity }]
    });
    assert.equal(result.readyForBackendEvaluation, false);
    assert.equal(result.backendRequest.items.dl32, 0);
    assert.equal(result.issues[0].type, "invalid_quantity");
  }
});

test("service aliases deduplicate into backend yes/no fields", () => {
  const result = resolveAssistantRentalQuery({
    services: ["engineering", "sound engineer", "streaming"]
  });

  assert.equal(result.readyForBackendEvaluation, true);
  assert.deepEqual(result.resolvedServices.map((service) => service.key), [
    "engineering",
    "streaming"
  ]);
  assert.deepEqual(result.backendRequest.services, {
    engineering: "yes",
    streaming: "yes",
    delivery: "no"
  });
});

test("query result carries no quote, total or commercial value", () => {
  const result = resolveAssistantRentalQuery({
    items: [
      { name: "WING", quantity: 1 },
      { name: "DL32", quantity: 1 },
      { name: "LV1 Classic", quantity: 1 }
    ],
    services: ["engineering"]
  });
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("estimatedTotal"), false);
  assert.equal(serialized.includes("customQuote"), false);
  assert.equal(serialized.includes("COP"), false);
  assert.equal(serialized.includes("$"), false);
  for (const commercialValue of ["350000", "3000000", "2700000", "500000", "250000"]) {
    assert.equal(serialized.includes(commercialValue), false, commercialValue);
  }

  assert.deepEqual(result.guardrails, ASSISTANT_RENTAL_INTEGRATION_GUARDRAILS);
  assert.equal(result.guardrails.priceAuthority, "rental_backend");
  assert.equal(result.guardrails.quoteRequired, true);
  assert.equal(result.guardrails.inventoryAvailability, "unknown");
  assert.equal(result.guardrails.mayQuotePrice, false);
});

test("empty request is not ready for backend evaluation", () => {
  const result = resolveAssistantRentalQuery({});
  assert.equal(result.readyForBackendEvaluation, false);
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(result.issues, []);
});
