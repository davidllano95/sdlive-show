import apiWorker from "./worker.js";
import { applyBaselineSecurityHeaders } from "./security-headers.js";

const HERO_KEY = {
  section: "hero",
  market: "all",
  route: "root"
};

const LANGUAGE_COOKIE = "sdlive-language-preference";
const LANGUAGE_BOOTSTRAP_VERSION = "20260820-1";
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

function isLocalizedText(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    typeof value.en === "string" &&
    typeof value.es === "string";
}

function isInternalAnchor(value) {
  return typeof value === "string" &&
    /^#[A-Za-z][\w:-]*$/.test(value);
}

export function isValidHeroContent(content) {
  if (!content || typeof content !== "object") return false;

  if (
    !isLocalizedText(content.headline?.line1) ||
    !isLocalizedText(content.headline?.line2) ||
    !isLocalizedText(content.headline?.accent) ||
    !isLocalizedText(content.lede) ||
    !isLocalizedText(content.actions?.primary?.label) ||
    !isLocalizedText(content.actions?.secondary?.label) ||
    !isInternalAnchor(content.actions?.primary?.href) ||
    !isInternalAnchor(content.actions?.secondary?.href) ||
    !Array.isArray(content.stats) ||
    content.stats.length !== 4
  ) {
    return false;
  }

  return content.stats.every((stat) =>
    isLocalizedText(stat?.value) &&
    isLocalizedText(stat?.label)
  );
}

export function normalizeLanguage(value) {
  return value === "es" || value === "en" ? value : null;
}

export function cookieLanguage(request) {
  const cookieHeader = request.headers.get("Cookie") || "";

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = part.trim().split("=");
    if (rawName !== LANGUAGE_COOKIE) continue;

    const rawValue = rawValueParts.join("=");

    try {
      return normalizeLanguage(decodeURIComponent(rawValue));
    } catch {
      return normalizeLanguage(rawValue);
    }
  }

  return null;
}

export function preferredRequestLanguage(request) {
  const stored = cookieLanguage(request);
  if (stored) return stored;

  const acceptLanguage = request.headers.get("Accept-Language") || "";

  for (const entry of acceptLanguage.split(",")) {
    const language = entry.split(";")[0].trim().toLowerCase();
    if (!language) continue;
    if (language.startsWith("es")) return "es";
    if (language.startsWith("en")) return "en";
  }

  return "en";
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function brandHtml(value) {
  return escapeHtml(value)
    .split("SD.Live")
    .join(BRAND_WORDMARK_HTML);
}

function addVary(headers, value) {
  const current = headers.get("Vary") || "";
  const values = current
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  value.split(",").forEach((item) => {
    const normalized = item.trim();
    if (
      normalized &&
      !values.some((existing) =>
        existing.toLowerCase() === normalized.toLowerCase()
      )
    ) {
      values.push(normalized);
    }
  });

  if (values.length) {
    headers.set("Vary", values.join(", "));
  }
}

export async function readPublishedHero(env) {
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
      HERO_KEY.section,
      HERO_KEY.market,
      HERO_KEY.route
    )
    .first();

  if (!row) {
    throw new Error("Hero content not found");
  }

  const content = JSON.parse(decodeBlobText(row.published_blob));

  if (!isValidHeroContent(content)) {
    throw new Error("Published Hero is invalid");
  }

  return {
    content,
    publishedAt: typeof row.published_at === "string"
      ? row.published_at
      : ""
  };
}

function setLocalizedAttributes(element, localized) {
  element.setAttribute("data-en", localized.en);
  element.setAttribute("data-es", localized.es);
}

function setLocalizedText(element, localized, lang) {
  setLocalizedAttributes(element, localized);
  element.setInnerContent(localized[lang]);
}

function localizeStaticElement(element, lang) {
  const value = element.getAttribute(
    lang === "es" ? "data-es" : "data-en"
  );

  if (value !== null) {
    element.setInnerContent(value, { html: true });
  }
}

function localizeAttribute(element, lang, sourceSuffix, targetAttribute) {
  const value = element.getAttribute(
    lang === "es"
      ? `data-es-${sourceSuffix}`
      : `data-en-${sourceSuffix}`
  );

  if (value !== null) {
    element.setAttribute(targetAttribute, value);
  }
}

function transformHomeResponse(assetResponse, publishedHero, lang) {
  const content = publishedHero?.content || null;
  const isCms = Boolean(content);
  let headlineIndex = 0;
  let statValueIndex = 0;
  let statLabelIndex = 0;

  const rewriter = new HTMLRewriter()
    .on("html", {
      element(element) {
        element.setAttribute("lang", lang);
        element.setAttribute("data-server-language", lang);
      }
    })
    .on("head", {
      element(element) {
        element.prepend(
          `<script src="/language-bootstrap.js?v=${LANGUAGE_BOOTSTRAP_VERSION}"></script>`,
          { html: true }
        );
      }
    })
    .on("#contentStaging", {
      element(element) {
        // Staging remains in the static source for the isolated Admin iframe,
        // but unfinished placeholder content must never ship in public Home HTML.
        element.remove();
      }
    })
    .on("[data-en]", {
      element(element) {
        localizeStaticElement(element, lang);
      }
    })
    .on("[data-en-placeholder]", {
      element(element) {
        localizeAttribute(element, lang, "placeholder", "placeholder");
      }
    })
    .on("[data-en-aria]", {
      element(element) {
        localizeAttribute(element, lang, "aria", "aria-label");
      }
    })
    .on("[data-en-href]", {
      element(element) {
        localizeAttribute(element, lang, "href", "href");
      }
    })
    .on("#langEn", {
      element(element) {
        element.setAttribute("aria-pressed", String(lang === "en"));
      }
    })
    .on("#langEs", {
      element(element) {
        element.setAttribute("aria-pressed", String(lang === "es"));
      }
    })
    .on("#hero", {
      element(element) {
        element.setAttribute("data-cms-state", "ready");
        element.setAttribute(
          "data-content-source",
          isCms ? "cms-ssr" : "static-fallback"
        );
        element.setAttribute("data-server-rendered", "true");

        if (isCms && publishedHero.publishedAt) {
          element.setAttribute(
            "data-cms-published-at",
            publishedHero.publishedAt
          );
        } else {
          element.removeAttribute("data-cms-published-at");
        }
      }
    });

  if (isCms) {
    rewriter
      .on("#hero h1 > span", {
        element(element) {
          const fields = [
            content.headline.line1,
            content.headline.line2
          ];
          const localized = fields[headlineIndex++];
          if (localized) setLocalizedText(element, localized, lang);
        }
      })
      .on("#hero h1 > em", {
        element(element) {
          setLocalizedText(element, content.headline.accent, lang);
        }
      })
      .on("#hero .hero-lede", {
        element(element) {
          setLocalizedAttributes(element, content.lede);
          element.setInnerContent(
            brandHtml(content.lede[lang]),
            { html: true }
          );
        }
      })
      .on("#hero .hero-actions .btn-primary", {
        element(element) {
          setLocalizedText(element, content.actions.primary.label, lang);
          element.setAttribute("href", content.actions.primary.href);
        }
      })
      .on("#hero .hero-actions .btn-ghost", {
        element(element) {
          setLocalizedText(element, content.actions.secondary.label, lang);
          element.setAttribute("href", content.actions.secondary.href);
        }
      })
      .on("#hero .hero-stats .stat-value", {
        element(element) {
          const stat = content.stats[statValueIndex++];
          if (stat) setLocalizedText(element, stat.value, lang);
        }
      })
      .on("#hero .hero-stats .stat-label", {
        element(element) {
          const stat = content.stats[statLabelIndex++];
          if (stat) setLocalizedText(element, stat.label, lang);
        }
      });
  }

  const transformed = rewriter.transform(assetResponse);
  const headers = new Headers(transformed.headers);
  applyBaselineSecurityHeaders(headers);

  // The root HTML contains live CMS data and request-specific language content,
  // so it must not be stored as a long-lived browser/shared-cache response.
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Language", lang === "es" ? "es-CO" : "en");
  addVary(headers, "Accept-Language, Cookie");
  headers.set(
    "X-SDLive-Hero-Render",
    isCms ? "cms-ssr" : "static-fallback"
  );
  headers.set("X-SDLive-Language", lang);

  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

export function isAdminPreviewRequest(request) {
  if (request.headers.get("Sec-Fetch-Dest") !== "iframe") {
    return false;
  }

  const referer = request.headers.get("Referer");
  if (!referer) return false;

  try {
    const requestUrl = new URL(request.url);

    // The automatic post-publish verifier is intentionally an iframe inside
    // /admin/, but it must receive the real public Home (Published D1 + edge
    // SSR + public visual safeguards) rather than the Draft-isolated Admin
    // preview document. Keep this exception narrow to the verifier marker.
    if (
      requestUrl.pathname === "/" &&
      requestUrl.searchParams.has("failsafe_verify")
    ) {
      return false;
    }

    const refererUrl = new URL(referer);

    return refererUrl.origin === requestUrl.origin &&
      refererUrl.pathname.startsWith("/admin/");
  } catch {
    return false;
  }
}

async function serveHome(request, env) {
  const assetPromise = env.ASSETS.fetch(request);

  // Admin owns the iframe preview content. Never inject Published CMS copy into
  // that document before the editor applies its Draft state.
  if (isAdminPreviewRequest(request)) {
    return assetPromise;
  }

  const lang = preferredRequestLanguage(request);

  const heroPromise = readPublishedHero(env)
    .catch((error) => {
      console.error(
        "[SD.Live] Edge Hero render failed; serving static fallback.",
        error
      );
      return null;
    });

  const [assetResponse, publishedHero] = await Promise.all([
    assetPromise,
    heroPromise
  ]);

  const contentType = assetResponse.headers.get("Content-Type") || "";

  if (!assetResponse.ok || !contentType.includes("text/html")) {
    return assetResponse;
  }

  return transformHomeResponse(assetResponse, publishedHero, lang);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.length > 1
      ? url.pathname.replace(/\/+$/, "")
      : url.pathname;

    if (path === "/" && (request.method === "GET" || request.method === "HEAD")) {
      if (request.method === "HEAD") {
        return env.ASSETS.fetch(request);
      }

      return serveHome(request, env);
    }

    if (path.startsWith("/api/")) {
      return apiWorker.fetch(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
