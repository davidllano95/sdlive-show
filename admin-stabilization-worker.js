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
import {
  googleCalendarDiagnostic,
  mergeGoogleCalendarOverlayResponse,
  projectCreatedWorkToGoogleCalendar
} from "./google-calendar-integration.js";
import { syncCalendarProjectionToGoogleCalendar } from "./site-schedule-google-projection.js";

const PUBLIC_HOME_PATHS = new Set(["/", "/en", "/es-co"]);
const ADMIN_CALENDAR_PATH = "/api/admin/calendar/events";
const ADMIN_CALENDAR_SYNC_PATH = "/api/admin/calendar/google-sync";
const ADMIN_SITE_SCHEDULE_EVENT_PREFIX = "/api/admin/site-schedule/events/";

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

async function handleGoogleCalendarSync(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const user = await verifyAdminViaExistingApi(request, env);
  if (!user?.email) return json({ ok: false, error: "Unauthorized" }, 403);

  try {
    const result = await syncCalendarProjectionToGoogleCalendar(env);
    return json({
      ok: true,
      source: "REGISTRO + Site Schedule",
      projection: "Google Calendar",
      actor: user.email,
      ...result
    });
  } catch (error) {
    console.error("[SD.Live] Google Calendar sync failed", error);
    return json({
      ok: false,
      error: "Could not sync Google Calendar",
      googleCalendar: {
        ...googleCalendarDiagnostic(error),
        calendarId: String(env?.GOOGLE_CALENDAR_ID || "").trim() || null
      }
    }, 503);
  }
}

async function decorateCreatedWorkResponse(response, env, payload) {
  if (!response?.ok || !(response.headers.get("content-type") || "").includes("application/json")) return response;
  const data = await response.json().catch(() => null);
  if (!data?.ok) return json(data || { ok: false, error: "Invalid Calendar response" }, response.status);

  try {
    const projection = await projectCreatedWorkToGoogleCalendar(env, payload || {});
    return json({
      ...data,
      googleCalendar: {
        available: true,
        calendarId: String(env?.GOOGLE_CALENDAR_ID || "").trim() || null,
        projection
      }
    }, response.status);
  } catch (error) {
    // REGISTRO is canonical. Never roll back or turn a successful work create
    // into an error merely because the secondary Google Calendar projection is
    // unavailable.
    console.error("[SD.Live] Work created but Google Calendar projection failed", error);
    return json({
      ...data,
      googleCalendar: {
        ...googleCalendarDiagnostic(error),
        calendarId: String(env?.GOOGLE_CALENDAR_ID || "").trim() || null,
        projection: "degraded"
      }
    }, response.status);
  }
}

function scheduleGoogleSyncAfterSiteScheduleMutation(path, request, response, env, ctx) {
  if (
    !path.startsWith(ADMIN_SITE_SCHEDULE_EVENT_PREFIX) ||
    !["PUT", "DELETE"].includes(request.method) ||
    !response?.ok ||
    typeof ctx?.waitUntil !== "function"
  ) {
    return;
  }

  ctx.waitUntil(
    syncCalendarProjectionToGoogleCalendar(env).catch((error) => {
      // Site Schedule remains canonical for website presentation. A Google
      // Calendar projection failure must never turn a successful schedule save
      // into an error or write anything back to REGISTRO/AppSheet.
      console.error("[SD.Live] Site Schedule saved but Google Calendar projection failed", error);
    })
  );
}

export default {
  async fetch(request, env, ctx) {
    const path = normalizedPath(request);
    const url = new URL(request.url);

    if (path === ADMIN_CALENDAR_SYNC_PATH) {
      return handleGoogleCalendarSync(request, env);
    }

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

    const calendarCreatePayload = path === ADMIN_CALENDAR_PATH && request.method === "POST"
      ? await request.clone().json().catch(() => null)
      : null;

    const response = await baseWorker.fetch(request, env);

    scheduleGoogleSyncAfterSiteScheduleMutation(path, request, response, env, ctx);

    if (path === ADMIN_CALENDAR_PATH && request.method === "GET") {
      // Site Schedule deliberately consumes ?view=source. Keep that route
      // REGISTRO-only so Google reminders/manual events can never become
      // website-schedule or Show Day source records.
      if (url.searchParams.get("view") === "source") return response;
      return mergeGoogleCalendarOverlayResponse(response, env);
    }

    if (path === ADMIN_CALENDAR_PATH && request.method === "POST") {
      return decorateCreatedWorkResponse(response, env, calendarCreatePayload);
    }

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