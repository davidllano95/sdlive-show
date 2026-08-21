import {
  TESTIMONIALS_KEY,
  validateTestimonialsDraft
} from "./testimonials-content.js";

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

export function normalizeTestimonialScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(1.8, Math.max(0.5, number));
}

export function resolveTestimonialsMediaSource(source) {
  const value = String(source || "");
  if (!value.startsWith(LOGICAL_MEDIA_PREFIX)) return value;
  return `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}`;
}

function renderLogo(logo) {
  if (!logo?.src) return "";

  const source = String(logo.src);
  const resolved = resolveTestimonialsMediaSource(source);
  const classes = classNames("testimonial-company-logo", logo.className);
  const width = numericDimension(logo.width);
  const height = numericDimension(logo.height);
  const scale = normalizeTestimonialScale(logo.scale);
  const attributes = [
    `src="${escapeAttribute(resolved)}"`,
    `alt="${escapeAttribute(logo.alt || "")}"`,
    `class="${escapeAttribute(classes)}"`,
    'loading="lazy"'
  ];

  if (width) attributes.push(`width="${width}"`);
  if (height) attributes.push(`height="${height}"`);
  if (source.startsWith(LOGICAL_MEDIA_PREFIX)) {
    attributes.push(`data-cms-media-source="${escapeAttribute(source)}"`);
  }
  if (Math.abs(scale - 1) > 0.0001) {
    attributes.push(`style="scale:${scale}"`);
  }

  return `<div aria-hidden="true" class="testimonial-brand"><img ${attributes.join(" ")}/></div>`;
}

function renderTestimonial(item, lang) {
  const quote = item.quote?.[lang] || "";
  const role = item.role?.[lang] || "";
  const classes = classNames(
    "testimonial-card",
    item.featured ? "testimonial-card--featured" : "",
    "glass",
    "reveal"
  );

  return [
    `<article class="${escapeAttribute(classes)}" data-testimonial-id="${escapeAttribute(item.id)}">`,
    renderLogo(item.logo),
    `<p ${localizedAttributes(item.quote)}>${visibleHtml(quote)}</p>`,
    '<div class="testimonial-author">',
    `<div class="testimonial-name">${visibleHtml(item.name)}</div>`,
    `<div class="testimonial-role" ${localizedAttributes(item.role)}>${visibleHtml(role)}</div>`,
    "</div>",
    "</article>"
  ].join("");
}

export function renderTestimonialsInnerHtml(content, lang = "en") {
  validateTestimonialsDraft(content);
  const safeLang = lang === "es" ? "es" : "en";
  const eyebrow = content.eyebrow[safeLang];
  const title = content.title[safeLang];
  const visibleItems = content.items.filter((item) => item.visible);

  return [
    '<div class="container">',
    '<div class="section-head reveal">',
    `<span class="eyebrow" ${localizedAttributes(content.eyebrow)}>${visibleHtml(eyebrow)}</span>`,
    `<h2 id="testimonialsTitle" ${localizedAttributes(content.title)}>${visibleHtml(title)}</h2>`,
    "</div>",
    '<div class="testimonial-grid">',
    visibleItems.map((item) => renderTestimonial(item, safeLang)).join(""),
    "</div>",
    "</div>"
  ].join("");
}

export async function readPublishedTestimonials(env) {
  const row = await env.CMS_DB
    .prepare(`
      SELECT
        CAST(published_json AS BLOB) AS published_blob,
        published_at
      FROM cms_entries
      WHERE section = ? AND market = ? AND route = ?
      LIMIT 1
    `)
    .bind(
      TESTIMONIALS_KEY.section,
      TESTIMONIALS_KEY.market,
      TESTIMONIALS_KEY.route
    )
    .first();

  if (!row) {
    return { content: null, publishedAt: null };
  }

  const content = JSON.parse(decodeBlobText(row.published_blob));
  validateTestimonialsDraft(content);

  return {
    content,
    publishedAt: row.published_at || null
  };
}
