export const RENTAL_SUPPORTED_PRESETS = ["corporate", "digital", "theater", "livePro", "fohMonPro"];

export const RENTAL_ITEM_GROUPS = {
  consoles: ["wing", "flow8", "lv1"],
  stageRacks: ["dl32", "stageGrid"],
  wireless: ["handhelds", "headsets"],
  pa: ["pa"],
  tools: ["labeler", "videoServer", "monitor"]
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, max, { allowEmpty = false } = {}) {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  if (!allowEmpty && !value.trim()) throw new Error(`${field} is required`);
  if (value.length > max) throw new Error(`${field} is too long`);
}

function requireLocalized(value, field, max) {
  if (!isObject(value)) throw new Error(`${field} must contain en and es`);
  requireString(value.en, `${field}.en`, max);
  requireString(value.es, `${field}.es`, max);
}

function validateCard(card, index, ids) {
  const field = `rental.recommended.cards.${index}`;
  if (!isObject(card)) throw new Error(`${field} must be an object`);
  requireString(card.id, `${field}.id`, 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(card.id)) throw new Error(`${field}.id is invalid`);
  if (ids.has(card.id)) throw new Error(`${field}.id must be unique`);
  ids.add(card.id);
  if (!RENTAL_SUPPORTED_PRESETS.includes(card.presetKey)) throw new Error(`${field}.presetKey is not supported by Rental quote logic`);
  requireLocalized(card.kicker, `${field}.kicker`, 160);
  requireLocalized(card.title, `${field}.title`, 180);
  requireLocalized(card.action, `${field}.action`, 120);
  if (typeof card.visible !== "boolean") throw new Error(`${field}.visible must be boolean`);
}

function validateOrder(order) {
  if (!isObject(order)) throw new Error("rental.recommended.itemOrder must be an object");
  for (const [group, expected] of Object.entries(RENTAL_ITEM_GROUPS)) {
    const actual = order[group];
    if (!Array.isArray(actual)) throw new Error(`rental.recommended.itemOrder.${group} must be an array`);
    if (actual.length !== expected.length) throw new Error(`rental.recommended.itemOrder.${group} must preserve all group items`);
    const set = new Set(actual);
    if (set.size !== actual.length || expected.some((id) => !set.has(id))) {
      throw new Error(`rental.recommended.itemOrder.${group} must contain each supported item exactly once`);
    }
  }
}

function validateMediaPresentation(items) {
  if (!isObject(items)) return;
  Object.entries(items).forEach(([id, item]) => {
    if (!isObject(item?.image)) return;
    const displayScale = Number(item.image.displayScale ?? item.image.scale ?? 1);
    const positionX = Number(item.image.positionX ?? 0);
    const positionY = Number(item.image.positionY ?? 0);
    if (!Number.isFinite(displayScale) || displayScale < 0.5 || displayScale > 2.5) {
      throw new Error(`rental.items.${id}.image.displayScale must be between 0.5 and 2.5`);
    }
    if (!Number.isFinite(positionX) || positionX < -100 || positionX > 100) {
      throw new Error(`rental.items.${id}.image.positionX must be between -100 and 100`);
    }
    if (!Number.isFinite(positionY) || positionY < -100 || positionY > 100) {
      throw new Error(`rental.items.${id}.image.positionY must be between -100 and 100`);
    }
  });
}

export function validateRentalPresentationExtras(rental) {
  if (!isObject(rental)) throw new Error("rental draft must be an object");
  const recommended = rental.recommended;
  if (!isObject(recommended)) throw new Error("rental.recommended must be an object");

  if (recommended.cards !== undefined) {
    if (!Array.isArray(recommended.cards) || recommended.cards.length < 1 || recommended.cards.length > 12) {
      throw new Error("rental.recommended.cards must contain between 1 and 12 presentation cards");
    }
    const ids = new Set();
    recommended.cards.forEach((card, index) => validateCard(card, index, ids));
    if (!recommended.cards.some((card) => card.visible)) throw new Error("At least one Rental presentation card must remain visible");
  }

  if (recommended.itemOrder !== undefined) validateOrder(recommended.itemOrder);
  validateMediaPresentation(rental.items);
  return true;
}

export function defaultRentalCards(rental) {
  return RENTAL_SUPPORTED_PRESETS.map((presetKey) => ({
    id: `preset-${presetKey}`,
    presetKey,
    kicker: { ...rental.presets[presetKey].kicker },
    title: { ...rental.presets[presetKey].title },
    action: { ...rental.presets[presetKey].action },
    visible: true
  }));
}

export function defaultRentalItemOrder() {
  return Object.fromEntries(Object.entries(RENTAL_ITEM_GROUPS).map(([group, ids]) => [group, [...ids]]));
}
