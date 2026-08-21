import { CORE_SECTION_KEYS } from "./core-sections-content.js";
import { validateCoreSectionPayload } from "./core-sections-security.js";

const LOGICAL_MEDIA_PREFIX = "assets/media/";
const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";
const BRAND_WORDMARK_HTML =
  '<span class="brand-wordmark-text" aria-label="SD.Live">SD' +
  '<span class="brand-wordmark-text__dot" aria-hidden="true">.</span>' +
  'Live</span>';

function decodeBlobText(blob) {
  if (!Array.isArray(blob)) throw new Error("Expected D1 BLOB byte array");
  return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(blob));
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
  return escapeText(value).split("SD.Live").join(BRAND_WORDMARK_HTML);
}

function richHtml(value) {
  const raw = String(value ?? "");
  const openToken = "__SDLIVE_STRONG_OPEN__";
  const closeToken = "__SDLIVE_STRONG_CLOSE__";
  return escapeText(
    raw.replaceAll("<strong>", openToken).replaceAll("</strong>", closeToken)
  )
    .split("SD.Live").join(BRAND_WORDMARK_HTML)
    .replaceAll(openToken, "<strong>")
    .replaceAll(closeToken, "</strong>");
}

function localizedAttributes(localized) {
  return `data-en="${escapeAttribute(localized?.en || "")}" data-es="${escapeAttribute(localized?.es || "")}"`;
}

function hrefAttributes(href) {
  return `data-en-href="${escapeAttribute(href?.en || "")}" data-es-href="${escapeAttribute(href?.es || "")}"`;
}

function localized(localizedValue, lang) {
  return localizedValue?.[lang === "es" ? "es" : "en"] || "";
}

function numericDimension(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 && number <= 6000 ? number : null;
}

function normalizeScale(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(1.8, Math.max(0.5, number));
}

export function resolveCoreMediaSource(source) {
  const value = String(source || "");
  if (!value.startsWith(LOGICAL_MEDIA_PREFIX)) return value;
  return `${MEDIA_PUBLIC_BASE}/${value.slice(LOGICAL_MEDIA_PREFIX.length)}`;
}

function mediaImage(image, lang, extraClass = "") {
  const source = String(image?.src || "");
  const resolved = resolveCoreMediaSource(source);
  const width = numericDimension(image?.width);
  const height = numericDimension(image?.height);
  const scale = normalizeScale(image?.scale);
  const altValue = typeof image?.alt === "object" ? localized(image.alt, lang) : String(image?.alt || "");
  const attributes = [
    `src="${escapeAttribute(resolved)}"`,
    `alt="${escapeAttribute(altValue)}"`,
    'loading="lazy"'
  ];
  if (extraClass) attributes.push(`class="${escapeAttribute(extraClass)}"`);
  if (width) attributes.push(`width="${width}"`);
  if (height) attributes.push(`height="${height}"`);
  if (source.startsWith(LOGICAL_MEDIA_PREFIX)) attributes.push(`data-cms-media-source="${escapeAttribute(source)}"`);
  if (Math.abs(scale - 1) > 0.0001) attributes.push(`style="scale:${scale}"`);
  return `<img ${attributes.join(" ")}/>`;
}

export async function readPublishedCoreSection(env, section) {
  const key = CORE_SECTION_KEYS[section];
  if (!key) throw new Error(`Unknown core section: ${section}`);
  const row = await env.CMS_DB
    .prepare(`
      SELECT CAST(published_json AS BLOB) AS published_blob, published_at
      FROM cms_entries
      WHERE section = ? AND market = ? AND route = ?
      LIMIT 1
    `)
    .bind(key.section, key.market, key.route)
    .first();

  if (!row) return { content: null, publishedAt: null };
  const content = JSON.parse(decodeBlobText(row.published_blob));
  validateCoreSectionPayload(section, content);
  return { content, publishedAt: row.published_at || null };
}

export function renderAboutInnerHtml(content, lang = "en") {
  validateCoreSectionPayload("about", content);
  const safeLang = lang === "es" ? "es" : "en";
  const paragraphs = content.paragraphs.map((paragraph, index) => {
    const value = localized(paragraph, safeLang);
    return `<p data-cms-editor-key="about:paragraph:${index}" ${localizedAttributes(paragraph)}>${richHtml(value)}</p>`;
  }).join("");

  return [
    '<div class="container about-grid">',
    '<div class="about-photo glass reveal" data-tilt="" data-cms-editor-key="about:image">',
    mediaImage(content.image, safeLang),
    '</div>',
    '<div class="about-copy reveal">',
    `<span class="eyebrow" data-cms-editor-key="about:eyebrow" ${localizedAttributes(content.eyebrow)}>${visibleHtml(localized(content.eyebrow, safeLang))}</span>`,
    `<h2 data-cms-editor-key="about:title" ${localizedAttributes(content.title)}>${visibleHtml(localized(content.title, safeLang))}</h2>`,
    paragraphs,
    '</div>',
    '</div>'
  ].join("");
}

function renderPricingBlock(pricing, market, lang) {
  if (!pricing) return "";
  const entry = pricing[market];
  if (!entry) return "";
  const className = market === "colombia" ? "local-market-only" : "international-market-only service-project-quote";
  const label = localized(entry.label, lang);
  const note = localized(entry.note, lang);
  if (!label && !note) return "";
  return [
    `<div class="${className}">`,
    label ? `<p class="service-rate" ${localizedAttributes(entry.label)}>${visibleHtml(label)}</p>` : "",
    note ? `<p class="service-rate-note" ${localizedAttributes(entry.note)}>${visibleHtml(note)}</p>` : "",
    '</div>'
  ].join("");
}

function renderService(item, index, lang) {
  if (!item.visible) return "";
  const marketClass = item.market === "colombia"
    ? " local-market-only"
    : item.market === "international"
      ? " international-market-only"
      : "";
  const scope = localized(item.scopeNote, lang);
  return [
    `<article class="service-card${marketClass} glass reveal" data-category="${escapeAttribute(item.categories.join(" "))}" data-service-id="${escapeAttribute(item.id)}" data-cms-editor-key="service:${escapeAttribute(item.id)}">`,
    `<span class="service-index">${String(index + 1).padStart(2, "0")}</span>`,
    `<h3 ${localizedAttributes(item.title)}>${visibleHtml(localized(item.title, lang))}</h3>`,
    `<p ${localizedAttributes(item.description)}>${visibleHtml(localized(item.description, lang))}</p>`,
    scope ? `<p class="service-rate-note service-scope-note" ${localizedAttributes(item.scopeNote)}>${visibleHtml(scope)}</p>` : "",
    renderPricingBlock(item.pricing, "colombia", lang),
    renderPricingBlock(item.pricing, "international", lang),
    '<ul class="service-caps">',
    item.capabilities.map((capability) => `<li>${escapeText(capability)}</li>`).join(""),
    '</ul>',
    '</article>'
  ].join("");
}

export function renderServicesInnerHtml(content, lang = "en") {
  validateCoreSectionPayload("services", content);
  const safeLang = lang === "es" ? "es" : "en";
  return [
    '<div class="container">',
    '<div class="section-head reveal">',
    `<span class="eyebrow" data-cms-editor-key="services:eyebrow" ${localizedAttributes(content.eyebrow)}>${visibleHtml(localized(content.eyebrow, safeLang))}</span>`,
    `<h2 data-cms-editor-key="services:title" ${localizedAttributes(content.title)}>${visibleHtml(localized(content.title, safeLang))}</h2>`,
    '</div>',
    '<div aria-label="Filter services" class="filter-pills" role="group">',
    content.filters.map((filter, index) => `<button aria-pressed="${index === 0 ? "true" : "false"}" class="filter-btn${index === 0 ? " is-active" : ""}" data-en="${escapeAttribute(filter.label.en)}" data-es="${escapeAttribute(filter.label.es)}" data-filter="${escapeAttribute(filter.id)}" type="button">${visibleHtml(localized(filter.label, safeLang))}</button>`).join(""),
    '</div>',
    '<div class="services-grid">',
    content.items.map((item, index) => renderService(item, index, safeLang)).join(""),
    '</div>',
    '<div class="section-detail-link reveal">',
    `<a class="btn btn-ghost" ${localizedAttributes(content.detailLink.label)} ${hrefAttributes(content.detailLink.href)} href="${escapeAttribute(localized(content.detailLink.href, safeLang))}">${visibleHtml(localized(content.detailLink.label, safeLang))}</a>`,
    '</div>',
    '</div>'
  ].join("");
}

function renderWorkItem(item, lang) {
  if (!item.visible) return "";
  const imageClass = item.image.presentation === "logo" ? "work-image work-image--logo" : "work-image";
  return [
    `<article class="work-card glass reveal" data-work-id="${escapeAttribute(item.id)}" data-cms-editor-key="work:${escapeAttribute(item.id)}">`,
    `<div class="${imageClass}">${mediaImage(item.image, lang)}</div>`,
    '<div class="work-body">',
    `<span class="work-role" ${localizedAttributes(item.role)}>${visibleHtml(localized(item.role, lang))}</span>`,
    `<h3 ${localizedAttributes(item.title)}>${visibleHtml(localized(item.title, lang))}</h3>`,
    `<p ${localizedAttributes(item.description)}>${visibleHtml(localized(item.description, lang))}</p>`,
    `<ul class="work-tags">${item.tags.map((tag) => `<li>${escapeText(tag)}</li>`).join("")}</ul>`,
    '<div class="work-actions">',
    `<a class="quick-view-btn" ${localizedAttributes(item.cta.label)} ${hrefAttributes(item.cta.href)} href="${escapeAttribute(localized(item.cta.href, lang))}">${visibleHtml(localized(item.cta.label, lang))}</a>`,
    '</div>',
    '</div>',
    '</article>'
  ].join("");
}

export function renderWorkInnerHtml(content, lang = "en") {
  validateCoreSectionPayload("work", content);
  const safeLang = lang === "es" ? "es" : "en";
  return [
    '<div class="container">',
    '<div class="section-head reveal">',
    `<span class="eyebrow" data-cms-editor-key="work:eyebrow" ${localizedAttributes(content.eyebrow)}>${visibleHtml(localized(content.eyebrow, safeLang))}</span>`,
    `<h2 data-cms-editor-key="work:title" ${localizedAttributes(content.title)}>${visibleHtml(localized(content.title, safeLang))}</h2>`,
    `<p data-cms-editor-key="work:intro" ${localizedAttributes(content.intro)}>${visibleHtml(localized(content.intro, safeLang))}</p>`,
    '</div>',
    '<div class="work-grid">',
    content.items.map((item) => renderWorkItem(item, safeLang)).join(""),
    '</div>',
    '</div>'
  ].join("");
}

export function renderInternationalInnerHtml(content, lang = "en") {
  validateCoreSectionPayload("international", content);
  const safeLang = lang === "es" ? "es" : "en";
  return [
    '<div class="container">',
    '<div class="international-quote-panel glass reveal">',
    '<div>',
    `<span class="eyebrow" data-cms-editor-key="international:eyebrow" ${localizedAttributes(content.eyebrow)}>${visibleHtml(localized(content.eyebrow, safeLang))}</span>`,
    `<h2 data-cms-editor-key="international:title" ${localizedAttributes(content.title)}>${visibleHtml(localized(content.title, safeLang))}</h2>`,
    `<p data-cms-editor-key="international:body" ${localizedAttributes(content.body)}>${visibleHtml(localized(content.body, safeLang))}</p>`,
    '</div>',
    `<a class="btn btn-primary" data-cms-editor-key="international:cta" ${localizedAttributes(content.cta.label)} ${hrefAttributes(content.cta.href)} href="${escapeAttribute(localized(content.cta.href, safeLang))}">${visibleHtml(localized(content.cta.label, safeLang))}</a>`,
    '</div>',
    '</div>'
  ].join("");
}
