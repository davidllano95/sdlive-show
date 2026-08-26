import { SITE_PRESENTATION_ALLOWED_ANCHORS } from "./site-presentation-content.js";

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function localizedAttributes(value) {
  return `data-en="${escapeAttribute(value?.en || "")}" data-es="${escapeAttribute(value?.es || "")}"`;
}

function setLocalized(element, value, lang) {
  if (!element || !value) return;
  element.setAttribute("data-en", value.en || "");
  element.setAttribute("data-es", value.es || "");
  element.setInnerContent(value[lang] || "");
}

function safeHeaderItems(content) {
  const seen = new Set();
  return (content?.header?.items || []).filter((item) => {
    if (!item?.visible || !SITE_PRESENTATION_ALLOWED_ANCHORS.includes(item.target) || seen.has(item.target)) return false;
    seen.add(item.target);
    return true;
  });
}

function headerHtml(content, lang) {
  return safeHeaderItems(content).map((item) => {
    const classes = item.target === "#rental" ? ' class="local-market-only"' : "";
    const label = item.label?.[lang] || "";
    return `<a${classes} ${localizedAttributes(item.label)} href="${escapeAttribute(item.target)}">${escapeText(label)}</a>`;
  }).join("");
}

function tagsHtml(tags) {
  return (tags || []).slice(0, 12).map((tag) => `<li>${escapeText(tag)}</li>`).join("");
}

export function applySitePresentation(response, published) {
  const type = response.headers.get("Content-Type") || "";
  if (!response.ok || !type.includes("text/html") || !published?.content) return response;

  const content = published.content;
  const lang = String(response.headers.get("Content-Language") || "en").toLowerCase().startsWith("es") ? "es" : "en";
  const managedTargets = new Set(SITE_PRESENTATION_ALLOWED_ANCHORS);

  const rewriter = new HTMLRewriter()
    .on(".main-nav", {
      element(element) {
        element.prepend(headerHtml(content, lang), { html: true });
        element.setAttribute("data-cms-navigation", published.source === "cms" ? "published" : "default");
      }
    })
    .on(".main-nav > a", {
      element(element) {
        const href = element.getAttribute("href") || "";
        const classes = String(element.getAttribute("class") || "").split(/\s+/);
        if (managedTargets.has(href) && !classes.includes("mobile-project-cta")) element.remove();
      }
    })
    .on("#travel .section-head .eyebrow", { element: (el) => setLocalized(el, content.travel.eyebrow, lang) })
    .on("#travel .section-head h2", { element: (el) => setLocalized(el, content.travel.title, lang) })
    .on("#travel .section-head p", { element: (el) => setLocalized(el, content.travel.body, lang) })
    .on("#travel .reach-stat strong", { element: (el) => el.setInnerContent(escapeText(content.travel.statValue), { html: true }) })
    .on("#travel .reach-stat span", { element: (el) => setLocalized(el, content.travel.statLabel, lang) })
    .on("#picture .eyebrow", { element: (el) => setLocalized(el, content.picture.eyebrow, lang) })
    .on("#picture h2", { element: (el) => setLocalized(el, content.picture.title, lang) })
    .on("#picture .picture-grid > .reveal > p", { element: (el) => setLocalized(el, content.picture.body, lang) })
    .on("#picture .picture-tags", { element: (el) => el.setInnerContent(tagsHtml(content.picture.tags), { html: true }) })
    .on("#picture .section-detail-link a", { element: (el) => setLocalized(el, content.picture.ctaLabel, lang) })
    .on("#travel", {
      element(element) {
        element.setAttribute("data-content-source", published.source === "cms" ? "cms-ssr" : "static-default");
        if (published.publishedAt) element.setAttribute("data-cms-published-at", published.publishedAt);
      }
    })
    .on("#picture", {
      element(element) {
        element.setAttribute("data-content-source", published.source === "cms" ? "cms-ssr" : "static-default");
        if (published.publishedAt) element.setAttribute("data-cms-published-at", published.publishedAt);
      }
    });

  const transformed = rewriter.transform(response);
  const headers = new Headers(transformed.headers);
  headers.set("X-SDLive-Site-Presentation-Render", published.source === "cms" ? "cms-ssr" : "static-default");
  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}
