import {
  TRUSTED_KEY,
  validateTrustedDraft
} from "./trusted-content.js";

const LOGICAL_MEDIA_PREFIX = "assets/media/";
const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";
const BRAND_WORDMARK_HTML =
  '<span class="brand-wordmark-text" aria-label="SD.Live">SD' +
  '<span class="brand-wordmark-text__dot" aria-hidden="true">.</span>' +
  'Live</span>';

function decodeBlobText(blob) {
  if (!Array.isArray(blob)) {
    throw new Error("Expected D1 BLOB byte array");
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(
    new Uint8Array(blob)
  );
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function visibleHtml(value) {
  return escapeText(value)
    .split("SD.Live")
    .join(BRAND_WORDMARK_HTML);
}

function localizedAttributes(localized) {
  return `data-en="${escapeAttribute(localized?.en || "")}" data-es="${escapeAttribute(localized?.es || "")}"`;
}

function classNames(...values) {
  return values
    .flatMap((value) => String(value || "").split(/\s+/))
    .filter(Boolean)
    .join(" ");
}

function numericDimension(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 5000
    ? number
    : null;
}

export function normalizeTrustedScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(1.8, Math.max(0.5, number));
}

export function normalizeTrustedPlacement(value) {
  const placement = String(value || "auto").toLowerCase();
  return ["auto", "left", "center", "right"].includes(placement)
    ? placement
    : "auto";
}

export function resolveTrustedMediaSource(source) {
  const value = String(source || "");
  if (!value.startsWith(LOGICAL_MEDIA_PREFIX)) return value;

  return `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}`;
}

function renderImage(image, baseClass = "", extraAttributes = "") {
  if (!image?.src) return "";

  const source = String(image.src);
  const resolved = resolveTrustedMediaSource(source);
  const classes = classNames(baseClass, image.className);
  const width = numericDimension(image.width);
  const height = numericDimension(image.height);
  const scale = normalizeTrustedScale(image.scale);
  const attributes = [];

  attributes.push(`src="${escapeAttribute(resolved)}"`);
  attributes.push(`alt="${escapeAttribute(image.alt || "")}"`);

  if (classes) attributes.push(`class="${escapeAttribute(classes)}"`);
  if (width) attributes.push(`width="${width}"`);
  if (height) attributes.push(`height="${height}"`);

  if (source.startsWith(LOGICAL_MEDIA_PREFIX)) {
    attributes.push(`data-cms-media-source="${escapeAttribute(source)}"`);
  }

  if (Math.abs(scale - 1) > 0.0001) {
    attributes.push(`style="scale:${scale}"`);
  }

  if (extraAttributes) attributes.push(extraAttributes);

  return `<img ${attributes.join(" ")}/>`;
}

function renderClientCard(client, lang) {
  const classes = classNames("client-strip-card", client.cardClass);
  const attributes = [
    `class="${escapeAttribute(classes)}"`,
    `data-client="${escapeAttribute(client.id)}"`
  ];

  if (client.reveal?.id) {
    attributes.push(`data-supported-reveal="${escapeAttribute(client.reveal.id)}"`);
    attributes.push('aria-expanded="false"');
  }

  const role = client.role?.[lang] || "";
  const roleHtml = role
    ? `<span ${localizedAttributes(client.role)}>${visibleHtml(role)}</span>`
    : "";

  return [
    `<figure ${attributes.join(" ")}>`,
    '<div class="client-logo-frame">',
    renderImage(client.logo, "client-logo"),
    "</div>",
    `<figcaption><strong>${visibleHtml(client.name || "Untitled client")}</strong>${roleHtml}</figcaption>`,
    "</figure>"
  ].join("");
}

function shouldWrapLogoItem(reveal, item) {
  return Boolean(item.tileClass) ||
    classNames(reveal.layoutClass)
      .split(/\s+/)
      .includes("supported-reveal-logos--wonderlust");
}

function renderLogoItem(reveal, item) {
  const placement = normalizeTrustedPlacement(item.placement);
  const placementAttribute = placement === "auto"
    ? ""
    : `data-cms-brand-placement="${placement}"`;

  if (shouldWrapLogoItem(reveal, item)) {
    const classes = classNames("supported-brand-tile", item.tileClass);
    return `<span class="${escapeAttribute(classes)}"${placementAttribute ? ` ${placementAttribute}` : ""}>${renderImage(item)}</span>`;
  }

  return renderImage(item, "", placementAttribute);
}

function renderCollaboration(item, lang) {
  const lines = (item.lines || [])
    .map((localized) => {
      const value = localized?.[lang] || "";
      return `<span ${localizedAttributes(localized)}>${visibleHtml(value)}</span>`;
    })
    .join("");

  return [
    '<div class="collaboration-credit">',
    renderImage(item.image),
    '<div class="collaboration-credit-copy">',
    `<strong>${visibleHtml(item.title || "Collaboration")}</strong>`,
    lines,
    "</div>",
    "</div>"
  ].join("");
}

function renderReveal(client, lang) {
  const reveal = client.reveal;
  if (!reveal?.id) return "";

  const classes = classNames("supported-reveal", reveal.className);
  const logoItems = (reveal.items || []).filter((item) => item.type === "logo");
  const firstLogoIndex = (reveal.items || []).findIndex((item) => item.type === "logo");
  const logosHtml = logoItems.length
    ? `<div class="${escapeAttribute(classNames("supported-reveal-logos", reveal.layoutClass))}">${logoItems.map((item) => renderLogoItem(reveal, item)).join("")}</div>`
    : "";

  const itemHtml = (reveal.items || [])
    .map((item, index) => {
      if (index === firstLogoIndex) return logosHtml;
      if (item.type === "logo") return "";
      if (item.type === "collaboration") return renderCollaboration(item, lang);
      return "";
    })
    .join("");

  const label = reveal.label?.[lang] || "";

  return [
    `<div aria-hidden="true" class="${escapeAttribute(classes)}" id="${escapeAttribute(reveal.id)}">`,
    '<div class="supported-reveal-inner">',
    `<p ${localizedAttributes(reveal.label)}>${visibleHtml(label)}</p>`,
    itemHtml,
    "</div>",
    "</div>"
  ].join("");
}

export function renderTrustedInnerHtml(content, lang = "en") {
  const language = lang === "es" ? "es" : "en";
  const title = content.title?.[language] || "";
  const clients = content.clients || [];

  const cards = clients
    .map((client) => renderClientCard(client, language))
    .join("");

  const reveals = clients
    .map((client) => renderReveal(client, language))
    .join("");

  return [
    '<div class="container">',
    `<p class="trusted-label" id="trustedTitle" ${localizedAttributes(content.title)}>${visibleHtml(title)}</p>`,
    "</div>",
    '<div class="trusted-marquee" data-marquee="" aria-label="SD.Live collaborators">',
    '<div class="trusted-track"><div class="trusted-set">',
    cards,
    "</div></div></div>",
    reveals
  ].join("");
}

export async function readPublishedTrusted(env) {
  const row = await env.CMS_DB
    .prepare(`
      SELECT
        CAST(published_json AS BLOB) AS published_blob,
        published_at
      FROM cms_entries
      WHERE section = ?
        AND market = ?
        AND route = ?
      LIMIT 1
    `)
    .bind(
      TRUSTED_KEY.section,
      TRUSTED_KEY.market,
      TRUSTED_KEY.route
    )
    .first();

  if (!row) {
    throw new Error("Trusted By content not found");
  }

  const content = JSON.parse(decodeBlobText(row.published_blob));
  validateTrustedDraft(content);

  return {
    content,
    publishedAt: typeof row.published_at === "string"
      ? row.published_at
      : ""
  };
}
