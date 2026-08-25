const QUANTITY_ITEM_KEYS = [
  "wing",
  "flow8",
  "lv1",
  "dl32",
  "stageGrid",
  "handhelds",
  "headsets",
  "pa"
];

const BINARY_ITEM_KEYS = ["labeler", "videoServer", "monitor"];
const SERVICE_KEYS = ["engineering", "streaming", "delivery"];

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export function rentalRequestHasSelection(payload) {
  const body = plainObject(payload);
  const items = plainObject(body.items);
  const services = plainObject(body.services);

  const hasQuantityItem = QUANTITY_ITEM_KEYS.some((key) => {
    const quantity = Number(items[key]);
    return Number.isFinite(quantity) && quantity > 0;
  });

  const hasBinaryItem = BINARY_ITEM_KEYS.some((key) =>
    items[key] === "1" || items[key] === 1 || items[key] === true
  );

  const hasService = SERVICE_KEYS.some((key) =>
    services[key] === "yes" || services[key] === "1" || services[key] === 1 || services[key] === true
  );

  return hasQuantityItem || hasBinaryItem || hasService;
}
