import baseWorker, { isAdminPreviewRequest } from "./worker-entry.js";
import { handleCoreSectionsApi } from "./core-sections-api.js";
import { handleMediaApi } from "./media-api.js";
import { handleTestimonialsApi } from "./testimonials-api.js";
import { handleTrustedApi } from "./trusted-api.js";
import {
  readPublishedCoreSection,
  renderAboutInnerHtml,
  renderInternationalInnerHtml,
  renderServicesInnerHtml,
  renderWorkInnerHtml
} from "./core-sections-edge.js";
import {
  readPublishedTestimonials,
  renderTestimonialsInnerHtml
} from "./testimonials-edge.js";
import {
  readPublishedTrusted,
  renderTrustedInnerHtml
} from "./trusted-edge.js";

const TRUSTED_RUNTIME_VERSION = "20260821-1";
const VISUAL_SAFEGUARDS_VERSION = "20260821-2";

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1
    ? url.pathname.replace(/\/+$/, "")
    : url.pathname;
}

async function verifyAdminViaExistingApi(request, env) {
  const url = new URL(request.url);
  url.pathname = "/api/admin/whoami";
  url.search = "";

  const verificationRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });

  const response = await baseWorker.fetch(verificationRequest, env);
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data?.authenticated || !data?.email) return null;
  return { email: String(data.email).toLowerCase() };
}

function responseLanguage(response) {
  return String(response.headers.get("Content-Language") || "en")
    .toLowerCase()
    .startsWith("es")
    ? "es"
    : "en";
}

function applySectionRenderMetadata(element, published) {
  const isCms = Boolean(published?.content);
  element.setAttribute("data-cms-state", "ready");
  element.setAttribute(
    "data-content-source",
    isCms ? "cms-ssr" : "static-fallback"
  );
  element.setAttribute("data-server-rendered", "true");

  if (isCms && published.publishedAt) {
    element.setAttribute("data-cms-published-at", published.publishedAt);
  } else {
    element.removeAttribute("data-cms-published-at");
  }

  return isCms;
}

function transformCmsHomeResponse(
  response,
  publishedTrusted,
  publishedTestimonials,
  publishedCore
) {
  const trustedIsCms = Boolean(publishedTrusted?.content);
  const testimonialsIsCms = Boolean(publishedTestimonials?.content);
  const lang = responseLanguage(response);
  const core = publishedCore || {};

  const rewriter = new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/visual-safeguards.css?v=${VISUAL_SAFEGUARDS_VERSION}" data-sdlive-visual-safeguards/>` +
          `<script defer src="/visual-safeguards.js?v=${VISUAL_SAFEGUARDS_VERSION}"></script>`,
          { html: true }
        );

        if (trustedIsCms) {
          element.append(
            `<script defer src="/trusted-published-runtime.js?v=${TRUSTED_RUNTIME_VERSION}"></script>`,
            { html: true }
          );
        }
      }
    })
    .on(".trusted-wrap", {
      element(element) {
        applySectionRenderMetadata(element, publishedTrusted);
        if (trustedIsCms) {
          element.setInnerContent(
            renderTrustedInnerHtml(publishedTrusted.content, lang),
            { html: true }
          );
        }
      }
    })
    .on("#about", {
      element(element) {
        if (applySectionRenderMetadata(element, core.about)) {
          element.setInnerContent(renderAboutInnerHtml(core.about.content, lang), { html: true });
        }
      }
    })
    .on("#services", {
      element(element) {
        if (applySectionRenderMetadata(element, core.services)) {
          element.setInnerContent(renderServicesInnerHtml(core.services.content, lang), { html: true });
        }
      }
    })
    .on("#work", {
      element(element) {
        if (applySectionRenderMetadata(element, core.work)) {
          element.setInnerContent(renderWorkInnerHtml(core.work.content, lang), { html: true });
        }
      }
    })
    .on("#international", {
      element(element) {
        if (applySectionRenderMetadata(element, core.international)) {
          element.setInnerContent(renderInternationalInnerHtml(core.international.content, lang), { html: true });
        }
      }
    })
    .on(".testimonials--public#testimonials", {
      element(element) {
        applySectionRenderMetadata(element, publishedTestimonials);
        if (testimonialsIsCms) {
          element.setAttribute("aria-labelledby", "testimonialsTitle");
          element.setInnerContent(
            renderTestimonialsInnerHtml(publishedTestimonials.content, lang),
            { html: true }
          );
        }
      }
    });

  const transformed = rewriter.transform(response);
  const headers = new Headers(transformed.headers);
  headers.set("X-SDLive-Trusted-Render", trustedIsCms ? "cms-ssr" : "static-fallback");
  headers.set("X-SDLive-Testimonials-Render", testimonialsIsCms ? "cms-ssr" : "static-fallback");
  for (const section of ["about", "services", "work", "international"]) {
    headers.set(
      `X-SDLive-${section[0].toUpperCase()}${section.slice(1)}-Render`,
      core[section]?.content ? "cms-ssr" : "static-fallback"
    );
  }

  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

function safePublishedCoreRead(env, section) {
  return readPublishedCoreSection(env, section).catch((error) => {
    console.error(`[SD.Live] Edge ${section} render failed; serving static fallback.`, error);
    return null;
  });
}

async function servePublicHome(request, env) {
  if (isAdminPreviewRequest(request)) {
    return baseWorker.fetch(request, env);
  }

  const [
    response,
    publishedTrusted,
    publishedTestimonials,
    about,
    services,
    work,
    international
  ] = await Promise.all([
    baseWorker.fetch(request, env),
    readPublishedTrusted(env).catch((error) => {
      console.error("[SD.Live] Edge Trusted By render failed; serving static fallback.", error);
      return null;
    }),
    readPublishedTestimonials(env).catch((error) => {
      console.error("[SD.Live] Edge Testimonials render failed; serving static fallback.", error);
      return null;
    }),
    safePublishedCoreRead(env, "about"),
    safePublishedCoreRead(env, "services"),
    safePublishedCoreRead(env, "work"),
    safePublishedCoreRead(env, "international")
  ]);

  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;

  return transformCmsHomeResponse(
    response,
    publishedTrusted,
    publishedTestimonials,
    { about, services, work, international }
  );
}

export default {
  async fetch(request, env) {
    const path = normalizedPath(request);

    if (path.startsWith("/api/admin/media")) {
      const response = await handleMediaApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (
      /^\/api\/content\/(?:about|services|work|international)$/.test(path) ||
      /^\/api\/admin\/content\/(?:about|services|work|international)(?:\/.*)?$/.test(path)
    ) {
      const response = await handleCoreSectionsApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (
      path === "/api/content/trusted" ||
      path.startsWith("/api/admin/content/trusted")
    ) {
      const response = await handleTrustedApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (
      path === "/api/content/testimonials" ||
      path.startsWith("/api/admin/content/testimonials")
    ) {
      const response = await handleTestimonialsApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (path === "/" && request.method === "GET") {
      return servePublicHome(request, env);
    }

    return baseWorker.fetch(request, env);
  }
};
