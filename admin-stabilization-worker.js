import baseWorker from "./public-form-rate-limit.js";
import {
  handleSitePresentationApi,
  readPublishedSitePresentation
} from "./site-presentation-api.js";
import { applySitePresentation } from "./site-presentation-edge.js";
import {
  readPublishedMediaPresentation,
  applyMediaPresentation
} from "./media-presentation-edge.js";
import { applyRentalPresentationRuntime } from "./rental-presentation-edge.js";
import { validateRentalPresentationExtras } from "./rental-presentation-contract.js";

const PUBLIC_HOME_PATHS = new Set(["/", "/en", "/es-co"]);

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function isAdminPreview(request) {
  if (request.headers.get("Sec-Fetch-Dest") !== "iframe") return false;
  const referer = request.headers.get("Referer");
  if (!referer) return false;
  try {
    const requestUrl = new URL(request.url);
    const refererUrl = new URL(referer);
    if (requestUrl.pathname === "/" && requestUrl.searchParams.has("failsafe_verify")) return false;
    return refererUrl.origin === requestUrl.origin && refererUrl.pathname.startsWith("/admin/");
  } catch {
    return false;
  }
}

function languageForPath(path) {
  return path === "/es-co" ? "es" : "en";
}

async function verifyAdminViaExistingApi(request, env) {
  const url = new URL(request.url);
  url.pathname = "/api/admin/whoami";
  url.search = "";
  const verificationRequest = new Request(url.toString(), { method: "GET", headers: request.headers });
  const response = await baseWorker.fetch(verificationRequest, env);
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.authenticated || !data?.email) return null;
  return { email: String(data.email).toLowerCase() };
}

async function validateRentalPut(request) {
  try {
    const type = request.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("application/json")) return null;
    const body = await request.clone().json();
    if (!body?.draft) throw new Error("Rental draft is required");
    validateRentalPresentationExtras(body.draft);
    return null;
  } catch (error) {
    return json({
      ok: false,
      error: "Could not save Rental Draft",
      detail: String(error?.message || error)
    }, 400);
  }
}

export default {
  async fetch(request, env) {
    const path = normalizedPath(request);

    if (
      path === "/api/content/site-presentation" ||
      path.startsWith("/api/admin/content/site-presentation")
    ) {
      const response = await handleSitePresentationApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (path === "/api/admin/content/rental" && request.method === "PUT") {
      const invalid = await validateRentalPut(request);
      if (invalid) return invalid;
    }

    const response = await baseWorker.fetch(request, env);

    if (
      !PUBLIC_HOME_PATHS.has(path) ||
      request.method !== "GET" ||
      isAdminPreview(request)
    ) {
      return response;
    }

    try {
      const [published, mediaState] = await Promise.all([
        readPublishedSitePresentation(env),
        readPublishedMediaPresentation(env)
      ]);
      let transformed = applySitePresentation(response, published, languageForPath(path));
      transformed = applyRentalPresentationRuntime(transformed, mediaState.rental);
      transformed = applyMediaPresentation(transformed, mediaState);
      return transformed;
    } catch (error) {
      console.error("[SD.Live] Stabilization presentation render failed; preserving stable base response.", error);
      return response;
    }
  }
};