import apiWorker from "./worker.js";

const HERO_KEY = {
  section: "hero",
  market: "all",
  route: "root"
};

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

function isValidHeroContent(content) {
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

async function readPublishedHero(env) {
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

function setLocalizedText(element, localized) {
  element.setAttribute("data-en", localized.en);
  element.setAttribute("data-es", localized.es);
  element.setInnerContent(localized.en);
}

function transformHeroResponse(assetResponse, publishedHero) {
  const content = publishedHero?.content || null;
  const isCms = Boolean(content);
  let headlineIndex = 0;
  let statValueIndex = 0;
  let statLabelIndex = 0;

  const rewriter = new HTMLRewriter()
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
          if (localized) setLocalizedText(element, localized);
        }
      })
      .on("#hero h1 > em", {
        element(element) {
          setLocalizedText(element, content.headline.accent);
        }
      })
      .on("#hero .hero-lede", {
        element(element) {
          setLocalizedText(element, content.lede);
        }
      })
      .on("#hero .hero-actions .btn-primary", {
        element(element) {
          setLocalizedText(element, content.actions.primary.label);
          element.setAttribute("href", content.actions.primary.href);
        }
      })
      .on("#hero .hero-actions .btn-ghost", {
        element(element) {
          setLocalizedText(element, content.actions.secondary.label);
          element.setAttribute("href", content.actions.secondary.href);
        }
      })
      .on("#hero .hero-stats .stat-value", {
        element(element) {
          const stat = content.stats[statValueIndex++];
          if (stat) setLocalizedText(element, stat.value);
        }
      })
      .on("#hero .hero-stats .stat-label", {
        element(element) {
          const stat = content.stats[statLabelIndex++];
          if (stat) setLocalizedText(element, stat.label);
        }
      });
  }

  const transformed = rewriter.transform(assetResponse);
  const headers = new Headers(transformed.headers);

  // The root HTML now contains live CMS data and must not be browser-cached
  // as a long-lived static asset. Static CSS/JS/images still bypass this Worker.
  headers.set("Cache-Control", "no-store");
  headers.set(
    "X-SDLive-Hero-Render",
    isCms ? "cms-ssr" : "static-fallback"
  );

  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

function isAdminPreviewRequest(request) {
  if (request.headers.get("Sec-Fetch-Dest") !== "iframe") {
    return false;
  }

  const referer = request.headers.get("Referer");
  if (!referer) return false;

  try {
    const requestUrl = new URL(request.url);
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

  return transformHeroResponse(assetResponse, publishedHero);
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
