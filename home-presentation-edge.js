import {
  PRESENTATION_SECTION_KEYS,
  validatePresentationSection
} from "./home-presentation-content.js";

const MEDIA_PREFIX = "assets/media/";
const MEDIA_PUBLIC_BASE = "https://media.sdlive.show";

function decodeBlobText(blob) {
  if (!Array.isArray(blob)) throw new Error("Expected D1 BLOB byte array");
  return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(blob));
}

function localized(element, value, lang) {
  element.setAttribute("data-en", value.en);
  element.setAttribute("data-es", value.es);
  element.setInnerContent(value[lang]);
}

function mediaSrc(source) {
  const value = String(source || "");
  if (value.startsWith(MEDIA_PREFIX)) return `${MEDIA_PUBLIC_BASE}/${value.slice(MEDIA_PREFIX.length)}`;
  return value;
}

function imageHandler(image) {
  return {
    element(element) {
      element.setAttribute("src", mediaSrc(image.src));
      if (element.getAttribute("aria-hidden") !== "true") element.setAttribute("alt", image.alt || "");
      if (Number(image.width) > 0) element.setAttribute("width", String(image.width));
      if (Number(image.height) > 0) element.setAttribute("height", String(image.height));
      const scale = Math.min(1.8, Math.max(0.5, Number(image.scale) || 1));
      const current = String(element.getAttribute("style") || "").replace(/(?:^|;)\s*scale\s*:[^;]*/gi, "");
      element.setAttribute("style", `${current}${current && !current.trim().endsWith(";") ? ";" : ""}scale:${scale}`);
    }
  };
}

export async function readPublishedPresentationSection(env, section) {
  const key = PRESENTATION_SECTION_KEYS[section];
  if (!key) throw new Error(`Unknown presentation section: ${section}`);
  const row = await env.CMS_DB.prepare(`
    SELECT CAST(published_json AS BLOB) AS published_blob, published_at
    FROM cms_entries
    WHERE section = ? AND market = ? AND route = ?
    LIMIT 1
  `).bind(key.section, key.market, key.route).first();
  if (!row) throw new Error(`${section} content not found`);
  const content = JSON.parse(decodeBlobText(row.published_blob));
  validatePresentationSection(section, content);
  return { content, publishedAt: typeof row.published_at === "string" ? row.published_at : "" };
}

export function applyRentalHandlers(rewriter, published, lang) {
  const content = published?.content;
  if (!content) return rewriter;
  rewriter
    .on("#rental .section-head .eyebrow", { element: (el) => localized(el, content.heading.eyebrow, lang) })
    .on("#rental .section-head h2", { element: (el) => localized(el, content.heading.title, lang) })
    .on("#rental .rental-price-disclaimer", { element: (el) => localized(el, content.heading.disclaimer, lang) })
    .on("#rental .rental-subhead .eyebrow", { element: (el) => localized(el, content.recommended.eyebrow, lang) })
    .on("#rental .rental-subhead h3", { element: (el) => localized(el, content.recommended.title, lang) })
    .on("#rental .rental-subhead p", { element: (el) => localized(el, content.recommended.intro, lang) })
    .on("#rental .rental-cart-hint .eyebrow", { element: (el) => localized(el, content.cartHint.eyebrow, lang) })
    .on("#rental .rental-cart-hint p", { element: (el) => localized(el, content.cartHint.body, lang) })
    .on("#mixingEquipmentTitle", { element: (el) => localized(el, content.groups.consoles, lang) })
    .on("#stageRackEquipmentTitle", { element: (el) => localized(el, content.groups.stageRacks, lang) })
    .on("#wirelessEquipmentTitle", { element: (el) => localized(el, content.groups.wireless, lang) })
    .on("#paEquipmentTitle", { element: (el) => localized(el, content.groups.pa, lang) })
    .on("#productionToolsTitle", { element: (el) => localized(el, content.groups.tools, lang) })
    .on("#rental .rental-sourcing .eyebrow", { element: (el) => localized(el, content.sourcing.eyebrow, lang) })
    .on("#rental .rental-sourcing h3", { element: (el) => localized(el, content.sourcing.title, lang) })
    .on("#rental .rental-sourcing p", { element: (el) => localized(el, content.sourcing.body, lang) });

  let introSeen = false;
  rewriter.on("#rental .section-head > p", {
    element(element) {
      if (element.getAttribute("class") === "rental-price-disclaimer") return;
      if (introSeen) return;
      introSeen = true;
      localized(element, content.heading.intro, lang);
    }
  });

  Object.entries(content.presets).forEach(([id, preset]) => {
    rewriter
      .on(`#rental [data-rental-preset="${id}"] .rental-config-kicker`, { element: (el) => localized(el, preset.kicker, lang) })
      .on(`#rental [data-rental-preset="${id}"] > strong`, { element: (el) => localized(el, preset.title, lang) })
      .on(`#rental [data-rental-preset="${id}"] > small`, { element: (el) => localized(el, preset.action, lang) });
  });

  Object.entries(content.items).forEach(([id, item]) => {
    let paragraphIndex = 0;
    rewriter
      .on(`#rental [data-rental-item="${id}"] img`, imageHandler(item.image))
      .on(`#rental [data-rental-item="${id}"] .equipment-card-body > h4`, { element: (el) => localized(el, item.title, lang) })
      .on(`#rental [data-rental-item="${id}"] .equipment-card-body > p`, {
        element(element) {
          const value = paragraphIndex++ === 0 ? item.description : item.technicalNote;
          if (value) localized(element, value, lang);
        }
      });
  });
  return rewriter;
}

export function applyContactHandlers(rewriter, published, lang) {
  const content = published?.content;
  if (!content) return rewriter;
  return rewriter
    .on("#contact .contact-info .eyebrow", { element: (el) => localized(el, content.eyebrow, lang) })
    .on("#contact .contact-info h2", { element: (el) => localized(el, content.title, lang) })
    .on("#contact .contact-info > p", { element: (el) => localized(el, content.body, lang) })
    .on('#contactForm label[for="cfName"]', { element: (el) => localized(el, content.form.nameLabel, lang) })
    .on('#contactForm label[for="cfEmail"]', { element: (el) => localized(el, content.form.emailLabel, lang) })
    .on('#contactForm label[for="cfMessage"]', { element: (el) => localized(el, content.form.messageLabel, lang) })
    .on("#contactForm button[type=submit]", { element: (el) => localized(el, content.form.buttonLabel, lang) })
    .on("#contactForm .contact-form-note", { element: (el) => localized(el, content.form.note, lang) });
}
