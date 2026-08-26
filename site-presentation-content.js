export const SITE_PRESENTATION_KEY = {
  section: "site-presentation",
  market: "all",
  route: "root"
};

export const SITE_PRESENTATION_ALLOWED_ANCHORS = [
  "#about",
  "#travel",
  "#services",
  "#picture",
  "#work",
  "#international",
  "#testimonials",
  "#rental",
  "#contact"
];

const localized = (en, es) => ({ en, es });

export const SITE_PRESENTATION_DEFAULT_CONTENT = {
  header: {
    items: [
      { id: "about", target: "#about", label: localized("About", "Sobre mí"), visible: true },
      { id: "work", target: "#work", label: localized("Work", "Trabajo"), visible: true },
      { id: "services", target: "#services", label: localized("Services", "Servicios"), visible: true },
      { id: "international", target: "#international", label: localized("International", "Internacional"), visible: true },
      { id: "rental", target: "#rental", label: localized("Rental", "Alquiler"), visible: true }
    ]
  },
  travel: {
    eyebrow: localized("Reach", "Alcance"),
    title: localized("Where has our audio traveled?", "¿Hasta dónde ha viajado nuestro audio?"),
    body: localized(
      "From Colombia to ships, stages, broadcasts and live productions across the world.",
      "Desde Colombia hacia barcos, escenarios, transmisiones y producciones en vivo alrededor del mundo."
    ),
    statValue: "40+",
    statLabel: localized("Ports around the world", "Puertos alrededor del mundo")
  },
  picture: {
    eyebrow: localized("Beyond Live", "Más Allá de lo En Vivo"),
    title: localized("Sound design isn't only theatre", "El sound design no es solo teatro"),
    body: localized(
      "From commercials to branded content, the same discipline applies: dialogue, effects, ambiences and transitions built for picture, then finished in a proper audio post mix.",
      "De comerciales a branded content, aplica la misma disciplina: diálogo, efectos, ambientes y transiciones construidos para imagen, terminados con una mezcla de audio post adecuada."
    ),
    tags: ["Video", "Commercials", "Branded Content", "Dialogue", "Effects", "Ambiences", "Final Mix"],
    ctaLabel: localized("Explore sound design and audio post", "Explorar diseño sonoro y audio post")
  }
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, max, { allowEmpty = false } = {}) {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  if (!allowEmpty && !value.trim()) throw new Error(`${field} is required`);
  if (value.length > max) throw new Error(`${field} is too long`);
}

function requireLocalized(value, field, max, options = {}) {
  if (!isObject(value)) throw new Error(`${field} must contain en and es`);
  requireString(value.en, `${field}.en`, max, options);
  requireString(value.es, `${field}.es`, max, options);
}

function requireId(value, field) {
  requireString(value, field, 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${field} contains invalid characters`);
  }
}

function validateHeader(header) {
  if (!isObject(header) || !Array.isArray(header.items)) {
    throw new Error("header.items must be an array");
  }
  if (header.items.length < 1 || header.items.length > SITE_PRESENTATION_ALLOWED_ANCHORS.length) {
    throw new Error("header.items has an invalid length");
  }

  const ids = new Set();
  const targets = new Set();
  header.items.forEach((item, index) => {
    const field = `header.items.${index}`;
    if (!isObject(item)) throw new Error(`${field} must be an object`);
    requireId(item.id, `${field}.id`);
    if (ids.has(item.id)) throw new Error(`${field}.id must be unique`);
    ids.add(item.id);
    if (!SITE_PRESENTATION_ALLOWED_ANCHORS.includes(item.target)) {
      throw new Error(`${field}.target is not an approved internal anchor`);
    }
    if (targets.has(item.target)) throw new Error(`${field}.target must be unique`);
    targets.add(item.target);
    requireLocalized(item.label, `${field}.label`, 100);
    if (typeof item.visible !== "boolean") throw new Error(`${field}.visible must be boolean`);
  });
}

function validateTravel(travel) {
  if (!isObject(travel)) throw new Error("travel must be an object");
  requireLocalized(travel.eyebrow, "travel.eyebrow", 100);
  requireLocalized(travel.title, "travel.title", 240);
  requireLocalized(travel.body, "travel.body", 1200);
  requireString(travel.statValue, "travel.statValue", 40);
  requireLocalized(travel.statLabel, "travel.statLabel", 160);
}

function validatePicture(picture) {
  if (!isObject(picture)) throw new Error("picture must be an object");
  requireLocalized(picture.eyebrow, "picture.eyebrow", 100);
  requireLocalized(picture.title, "picture.title", 240);
  requireLocalized(picture.body, "picture.body", 1600);
  if (!Array.isArray(picture.tags) || picture.tags.length < 1 || picture.tags.length > 12) {
    throw new Error("picture.tags must contain between 1 and 12 items");
  }
  picture.tags.forEach((tag, index) => requireString(tag, `picture.tags.${index}`, 80));
  requireLocalized(picture.ctaLabel, "picture.ctaLabel", 160);
}

export function validateSitePresentationDraft(value) {
  if (!isObject(value)) throw new Error("Site presentation content must be an object");
  validateHeader(value.header);
  validateTravel(value.travel);
  validatePicture(value.picture);
  const serialized = JSON.stringify(value);
  if (serialized.length > 40000) throw new Error("Site presentation draft is too large");
  return serialized;
}

export function cloneSitePresentationDefault() {
  return JSON.parse(JSON.stringify(SITE_PRESENTATION_DEFAULT_CONTENT));
}
