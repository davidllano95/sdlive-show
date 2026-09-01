const CATALOG_SNAPSHOT = Object.freeze({
  wing: Object.freeze({
    type: "quantity",
    maxQuantity: 1,
    label: "Behringer WING",
    aliases: ["wing", "behringer wing", "consola wing"]
  }),
  flow8: Object.freeze({
    type: "quantity",
    maxQuantity: 1,
    label: "Behringer FLOW 8",
    aliases: ["flow 8", "flow8", "behringer flow 8", "behringer flow8"]
  }),
  lv1: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "Waves LV1 Classic",
    aliases: ["lv1", "lv1 classic", "waves lv1", "waves lv1 classic"]
  }),
  dl32: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "Midas DL32",
    aliases: ["dl32", "midas dl32"]
  }),
  stageGrid: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "StageGrid 4000",
    aliases: ["stagegrid", "stagegrid 4000", "waves stagegrid", "waves stagegrid 4000"]
  }),
  handhelds: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "Wireless handheld microphones",
    aliases: [
      "handheld",
      "handheld mic",
      "handheld microphone",
      "wireless handheld",
      "wireless handheld mic",
      "microfono inalambrico de mano",
      "microfonos inalambricos de mano"
    ]
  }),
  headsets: Object.freeze({
    type: "quantity",
    maxQuantity: 6,
    label: "Wireless headset microphones",
    aliases: [
      "headset",
      "headset mic",
      "headset microphone",
      "wireless headset",
      "wireless headset mic",
      "diadema",
      "microfono diadema",
      "microfonos diadema"
    ]
  }),
  pa: Object.freeze({
    type: "quantity",
    maxQuantity: 2,
    label: "PA",
    aliases: ["pa", "pa system", "sistema pa", "parlante pa", "parlantes pa"]
  }),
  labeler: Object.freeze({
    type: "binary",
    maxQuantity: 1,
    label: "Labeler",
    aliases: ["labeler", "label printer", "etiquetadora", "impresora de etiquetas"]
  }),
  videoServer: Object.freeze({
    type: "binary",
    maxQuantity: 1,
    label: "Video server",
    aliases: ["video server", "servidor de video", "pc gamer", "gaming pc"]
  }),
  monitor: Object.freeze({
    type: "binary",
    maxQuantity: 1,
    label: "Portable monitor",
    aliases: ["portable monitor", "monitor portatil", "monitor portable"]
  })
});

const SERVICE_SNAPSHOT = Object.freeze({
  engineering: Object.freeze({
    label: "Sound engineering",
    aliases: [
      "engineering",
      "sound engineering",
      "sound engineer",
      "audio engineer",
      "ingenieria de sonido",
      "ingeniero de sonido"
    ]
  }),
  streaming: Object.freeze({
    label: "Streaming",
    aliases: ["streaming", "streaming service", "servicio de streaming"]
  }),
  delivery: Object.freeze({
    label: "Delivery",
    aliases: ["delivery", "delivery service", "entrega", "transporte"]
  })
});

export const ASSISTANT_RENTAL_QUERY_VERSION = "assistant-rental-query-v1";

export const ASSISTANT_RENTAL_INTEGRATION_GUARDRAILS = Object.freeze({
  catalogSnapshotOnly: true,
  runtimeMustShareRentalMetadataBeforeIntegration: true,
  priceAuthority: "rental_backend",
  quoteRequired: true,
  inventoryAvailability: "unknown",
  mayQuotePrice: false,
  mayClaimInventoryAvailability: false,
  requiresBackendPricingEvaluation: true,
  requiresBackendInventoryEvaluation: true
});

function cleanString(value, maxLength = 240) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function normalizedAlias(value) {
  return cleanString(value, 240)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function positiveInteger(value, fallback = 1) {
  if (value === undefined || value === null || value === "") return fallback;
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
}

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function buildAliasMap(snapshot) {
  const map = new Map();
  for (const [key, entry] of Object.entries(snapshot)) {
    for (const raw of [key, entry.label, ...(entry.aliases || [])]) {
      const alias = normalizedAlias(raw);
      if (!alias) continue;
      if (map.has(alias) && map.get(alias) !== key) {
        throw new Error(`Ambiguous Rental alias: ${alias}`);
      }
      map.set(alias, key);
    }
  }
  return map;
}

const ITEM_ALIAS_MAP = buildAliasMap(CATALOG_SNAPSHOT);
const SERVICE_ALIAS_MAP = buildAliasMap(SERVICE_SNAPSHOT);

function emptyBackendItems() {
  return {
    wing: 0,
    flow8: 0,
    lv1: 0,
    dl32: 0,
    stageGrid: 0,
    handhelds: 0,
    headsets: 0,
    pa: 0,
    labeler: "0",
    videoServer: "0",
    monitor: "0"
  };
}

function emptyBackendServices() {
  return {
    engineering: "no",
    streaming: "no",
    delivery: "no"
  };
}

function normalizedItemRequests(value) {
  const list = Array.isArray(value) ? value : [];
  return list.slice(0, 30).map((raw, index) => {
    if (typeof raw === "string") {
      return { index, name: cleanString(raw), quantity: 1 };
    }
    const source = plainObject(raw);
    return {
      index,
      name: cleanString(source.name || source.item || source.label),
      quantity: positiveInteger(source.quantity, 1)
    };
  });
}

function normalizedServiceRequests(value) {
  const list = Array.isArray(value) ? value : [];
  return list.slice(0, 20).map((raw, index) => {
    if (typeof raw === "string") {
      return { index, name: cleanString(raw) };
    }
    const source = plainObject(raw);
    return { index, name: cleanString(source.name || source.service || source.label) };
  });
}

function resolvedItemSummary(key, quantity) {
  const entry = CATALOG_SNAPSHOT[key];
  return {
    key,
    label: entry.label,
    quantity,
    type: entry.type,
    maxQuantity: entry.maxQuantity
  };
}

function resolvedServiceSummary(key) {
  return {
    key,
    label: SERVICE_SNAPSHOT[key].label
  };
}

export function resolveAssistantRentalQuery(value) {
  const body = plainObject(value);
  const backendItems = emptyBackendItems();
  const backendServices = emptyBackendServices();
  const requestedTotals = new Map();
  const unresolved = [];
  const issues = [];

  for (const request of normalizedItemRequests(body.items)) {
    const alias = normalizedAlias(request.name);
    if (!alias) {
      issues.push({
        type: "invalid_item_name",
        index: request.index
      });
      continue;
    }

    if (request.quantity === null) {
      issues.push({
        type: "invalid_quantity",
        index: request.index,
        requested: request.name
      });
      continue;
    }

    const key = ITEM_ALIAS_MAP.get(alias);
    if (!key) {
      unresolved.push({
        type: "item",
        index: request.index,
        requested: request.name,
        quantity: request.quantity
      });
      continue;
    }

    requestedTotals.set(
      key,
      (requestedTotals.get(key) || 0) + request.quantity
    );
  }

  const resolvedItems = [];
  for (const [key, quantity] of requestedTotals.entries()) {
    const entry = CATALOG_SNAPSHOT[key];
    if (quantity > entry.maxQuantity) {
      issues.push({
        type: "quantity_exceeds_current_backend_limit",
        key,
        requestedQuantity: quantity,
        maxQuantity: entry.maxQuantity
      });
      continue;
    }

    if (entry.type === "binary") {
      if (quantity !== 1) {
        issues.push({
          type: "binary_item_quantity_invalid",
          key,
          requestedQuantity: quantity,
          maxQuantity: 1
        });
        continue;
      }
      backendItems[key] = "1";
    } else {
      backendItems[key] = quantity;
    }

    resolvedItems.push(resolvedItemSummary(key, quantity));
  }

  const seenServices = new Set();
  const resolvedServices = [];
  for (const request of normalizedServiceRequests(body.services)) {
    const alias = normalizedAlias(request.name);
    if (!alias) {
      issues.push({
        type: "invalid_service_name",
        index: request.index
      });
      continue;
    }

    const key = SERVICE_ALIAS_MAP.get(alias);
    if (!key) {
      unresolved.push({
        type: "service",
        index: request.index,
        requested: request.name
      });
      continue;
    }

    if (seenServices.has(key)) continue;
    seenServices.add(key);
    backendServices[key] = "yes";
    resolvedServices.push(resolvedServiceSummary(key));
  }

  const hasSelection = resolvedItems.length > 0 || resolvedServices.length > 0;
  const readyForBackendEvaluation =
    hasSelection && issues.length === 0 && unresolved.length === 0;

  return {
    version: ASSISTANT_RENTAL_QUERY_VERSION,
    readyForBackendEvaluation,
    resolvedItems,
    resolvedServices,
    unresolved,
    issues,
    backendRequest: {
      items: backendItems,
      services: backendServices
    },
    guardrails: { ...ASSISTANT_RENTAL_INTEGRATION_GUARDRAILS }
  };
}

export function assistantRentalCatalogSnapshot() {
  return {
    version: ASSISTANT_RENTAL_QUERY_VERSION,
    items: Object.entries(CATALOG_SNAPSHOT).map(([key, entry]) => ({
      key,
      label: entry.label,
      type: entry.type,
      maxQuantity: entry.maxQuantity
    })),
    services: Object.entries(SERVICE_SNAPSHOT).map(([key, entry]) => ({
      key,
      label: entry.label
    })),
    guardrails: { ...ASSISTANT_RENTAL_INTEGRATION_GUARDRAILS }
  };
}
