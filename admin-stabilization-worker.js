import baseWorker from "./public-form-rate-limit.js";
import {
  handleSitePresentationApi,
  readPublishedSitePresentation
} from "./site-presentation-api.js";
import { applySitePresentation } from "./site-presentation-edge.js";

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
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

    const response = await baseWorker.fetch(request, env);

    if (
      path !== "/" ||
      request.method !== "GET" ||
      isAdminPreview(request)
    ) {
      return response;
    }

    try {
      const published = await readPublishedSitePresentation(env);
      return applySitePresentation(response, published);
    } catch (error) {
      console.error("[SD.Live] Site presentation render failed; preserving stable base response.", error);
      return response;
    }
  }
};
