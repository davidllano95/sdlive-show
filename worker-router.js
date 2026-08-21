import baseWorker, { isAdminPreviewRequest } from "./worker-entry.js";
import { handleMediaApi } from "./media-api.js";
import { handleTestimonialsApi } from "./testimonials-api.js";
import { handleTrustedApi } from "./trusted-api.js";
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

  const response = await baseWorker.fetch(
    verificationRequest,
    env
  );

  if (!response.ok) return null;

  const data = await response.json().catch(() => null);

  if (!data?.authenticated || !data?.email) {
    return null;
  }

  return {
    email: String(data.email).toLowerCase()
  };
}

function responseLanguage(response) {
  return String(response.headers.get("Content-Language") || "en")
    .toLowerCase()
    .startsWith("es")
    ? "es"
    : "en";
}

function transformCmsHomeResponse(
  response,
  publishedTrusted,
  publishedTestimonials
) {
  const trustedIsCms = Boolean(publishedTrusted?.content);
  const testimonialsIsCms = Boolean(publishedTestimonials?.content);
  const lang = responseLanguage(response);

  const rewriter = new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/visual-safeguards.css?v=${VISUAL_SAFEGUARDS_VERSION}" data-sdlive-visual-safeguards/>` +
          `<script defer src="/visual-safeguards.js?v=${VISUAL_SAFEGUARDS_VERSION}"></script>`,
          { html: true }
        );

        if (!trustedIsCms) return;

        element.append(
          `<script defer src="/trusted-published-runtime.js?v=${TRUSTED_RUNTIME_VERSION}"></script>`,
          { html: true }
        );
      }
    })
    .on(".trusted-wrap", {
      element(element) {
        element.setAttribute("data-cms-state", "ready");
        element.setAttribute(
          "data-content-source",
          trustedIsCms ? "cms-ssr" : "static-fallback"
        );
        element.setAttribute("data-server-rendered", "true");

        if (trustedIsCms && publishedTrusted.publishedAt) {
          element.setAttribute(
            "data-cms-published-at",
            publishedTrusted.publishedAt
          );
        } else {
          element.removeAttribute("data-cms-published-at");
        }

        if (trustedIsCms) {
          element.setInnerContent(
            renderTrustedInnerHtml(publishedTrusted.content, lang),
            { html: true }
          );
        }
      }
    })
    .on(".testimonials--public#testimonials", {
      element(element) {
        element.setAttribute("data-cms-state", "ready");
        element.setAttribute(
          "data-content-source",
          testimonialsIsCms ? "cms-ssr" : "static-fallback"
        );
        element.setAttribute("data-server-rendered", "true");

        if (testimonialsIsCms && publishedTestimonials.publishedAt) {
          element.setAttribute(
            "data-cms-published-at",
            publishedTestimonials.publishedAt
          );
        } else {
          element.removeAttribute("data-cms-published-at");
        }

        if (testimonialsIsCms) {
          element.setAttribute("aria-labelledby", "testimonialsTitle");
          element.setInnerContent(
            renderTestimonialsInnerHtml(
              publishedTestimonials.content,
              lang
            ),
            { html: true }
          );
        }
      }
    });

  const transformed = rewriter.transform(response);
  const headers = new Headers(transformed.headers);
  headers.set(
    "X-SDLive-Trusted-Render",
    trustedIsCms ? "cms-ssr" : "static-fallback"
  );
  headers.set(
    "X-SDLive-Testimonials-Render",
    testimonialsIsCms ? "cms-ssr" : "static-fallback"
  );

  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

async function servePublicHome(request, env) {
  if (isAdminPreviewRequest(request)) {
    return baseWorker.fetch(request, env);
  }

  const basePromise = baseWorker.fetch(request, env);
  const trustedPromise = readPublishedTrusted(env)
    .catch((error) => {
      console.error(
        "[SD.Live] Edge Trusted By render failed; serving static fallback.",
        error
      );
      return null;
    });
  const testimonialsPromise = readPublishedTestimonials(env)
    .catch((error) => {
      console.error(
        "[SD.Live] Edge Testimonials render failed; serving static fallback.",
        error
      );
      return null;
    });

  const [response, publishedTrusted, publishedTestimonials] = await Promise.all([
    basePromise,
    trustedPromise,
    testimonialsPromise
  ]);

  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.includes("text/html")) {
    return response;
  }

  return transformCmsHomeResponse(
    response,
    publishedTrusted,
    publishedTestimonials
  );
}

export default {
  async fetch(request, env) {
    const path = normalizedPath(request);

    if (path.startsWith("/api/admin/media")) {
      const response = await handleMediaApi(
        request,
        env,
        {
          verifyAdmin: verifyAdminViaExistingApi
        }
      );

      if (response) return response;
    }

    if (
      path === "/api/content/trusted" ||
      path.startsWith("/api/admin/content/trusted")
    ) {
      const response = await handleTrustedApi(
        request,
        env,
        {
          verifyAdmin: verifyAdminViaExistingApi
        }
      );

      if (response) return response;
    }

    if (
      path === "/api/content/testimonials" ||
      path.startsWith("/api/admin/content/testimonials")
    ) {
      const response = await handleTestimonialsApi(
        request,
        env,
        {
          verifyAdmin: verifyAdminViaExistingApi
        }
      );

      if (response) return response;
    }

    if (
      path === "/" &&
      request.method === "GET"
    ) {
      return servePublicHome(request, env);
    }

    return baseWorker.fetch(request, env);
  }
};
