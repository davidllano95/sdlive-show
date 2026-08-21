import baseWorker, { isAdminPreviewRequest } from "./worker-entry.js";
import { handleMediaApi } from "./media-api.js";
import { handleTrustedApi } from "./trusted-api.js";
import {
  readPublishedTrusted,
  renderTrustedInnerHtml
} from "./trusted-edge.js";

const TRUSTED_RUNTIME_VERSION = "20260820-1";

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

function transformTrustedHomeResponse(response, publishedTrusted) {
  const isCms = Boolean(publishedTrusted?.content);
  const lang = responseLanguage(response);

  const rewriter = new HTMLRewriter()
    .on("head", {
      element(element) {
        if (!isCms) return;

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
          isCms ? "cms-ssr" : "static-fallback"
        );
        element.setAttribute("data-server-rendered", "true");

        if (isCms && publishedTrusted.publishedAt) {
          element.setAttribute(
            "data-cms-published-at",
            publishedTrusted.publishedAt
          );
        } else {
          element.removeAttribute("data-cms-published-at");
        }

        if (isCms) {
          element.setInnerContent(
            renderTrustedInnerHtml(publishedTrusted.content, lang),
            { html: true }
          );
        }
      }
    });

  const transformed = rewriter.transform(response);
  const headers = new Headers(transformed.headers);
  headers.set(
    "X-SDLive-Trusted-Render",
    isCms ? "cms-ssr" : "static-fallback"
  );

  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

async function servePublicHome(request, env) {
  // The Admin iframe intentionally receives the untouched static document so
  // its local Draft renderer remains isolated from Published CMS content.
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

  const [response, publishedTrusted] = await Promise.all([
    basePromise,
    trustedPromise
  ]);

  const contentType = response.headers.get("Content-Type") || "";
  if (!response.ok || !contentType.includes("text/html")) {
    return response;
  }

  return transformTrustedHomeResponse(response, publishedTrusted);
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
      path === "/" &&
      request.method === "GET"
    ) {
      return servePublicHome(request, env);
    }

    return baseWorker.fetch(request, env);
  }
};
