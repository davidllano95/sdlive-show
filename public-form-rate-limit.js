import appWorker from "./worker-router.js";
import { handleFinanceApi } from "./finance-api.js";
import { handleFinanceDashboardApi } from "./finance-dashboard-api.js";
import { handleCalendarApi } from "./calendar-api.js";
import {
  decorateCalendarResponseV2,
  handleSiteScheduleApiV2
} from "./site-schedule-store-v2.js";
import { applyShowDayRuntime } from "./showday-edge.js";
import { handleAvailabilityApi } from "./availability-core.js";
import { decorateAvailabilityNextWindowResponse } from "./availability-next-window.js";
import { applyAvailabilityAdminRuntime } from "./availability-admin-edge.js";
import { rentalRequestHasSelection } from "./rental-request-validation.js";
import { financeUpstreamFetch } from "./finance-upstream.js";
import { preparePublicLeadRequest } from "./lead-core-public-request.js";
import { persistLeadCoreFromPublicResponse } from "./lead-core-storage.js";

const PUBLIC_FORM_LIMITS = {
  "/api/contact": {
    binding: "CONTACT_FORM_RATE_LIMITER",
    retryAfter: 60
  },
  "/api/rental": {
    binding: "RENTAL_FORM_RATE_LIMITER",
    retryAfter: 60
  }
};

const FINANCE_PAGE_PATH = "/admin/finance";
const FINANCE_RUNTIME_VERSION = "20260825-2";
const LIVENTX_PORTAL_RUNTIME_VERSION = "20260825-2";

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

  const response = await appWorker.fetch(verificationRequest, env);
  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  if (!data?.authenticated || !data?.email) return null;

  return {
    email: String(data.email).toLowerCase()
  };
}

export function publicFormRateLimitConfig(request) {
  if (request.method !== "POST") return null;
  return PUBLIC_FORM_LIMITS[normalizedPath(request)] || null;
}

export function publicFormRateLimitKey(request) {
  const ip = String(request.headers.get("CF-Connecting-IP") || "").trim();
  return ip || "unknown-client";
}

function jsonResponse(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

function decorateFinanceAdminPage(response) {
  const type = response.headers.get("Content-Type") || "";
  if (!response.ok || !type.includes("text/html")) return response;

  const transformed = new HTMLRewriter()
    .on('script[src*="finance-runtime-stability.js"]', {
      element(element) {
        element.remove();
      }
    })
    .on('script[src*="finance-page.js"]', {
      element(element) {
        element.before(
          `<script src="/admin/finance-runtime-stability.js?v=${FINANCE_RUNTIME_VERSION}"></script>`,
          { html: true }
        );
      }
    })
    .on('script[src*="finance-liventx-portal-link.js"]', {
      element(element) {
        element.setAttribute(
          "src",
          `/admin/finance-liventx-portal-link.js?v=${LIVENTX_PORTAL_RUNTIME_VERSION}`
        );
      }
    })
    .transform(response);

  const headers = new Headers(transformed.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("X-SDLive-Finance-Page", `worker-runtime-${FINANCE_RUNTIME_VERSION}`);

  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

export async function enforcePublicFormRateLimit(request, env) {
  const config = publicFormRateLimitConfig(request);
  if (!config) return null;

  const limiter = env?.[config.binding];
  if (!limiter || typeof limiter.limit !== "function") {
    console.error(`[SD.Live] Missing rate-limit binding: ${config.binding}`);
    return jsonResponse(
      {
        ok: false,
        error: "Form submissions are temporarily unavailable"
      },
      503,
      { "Retry-After": String(config.retryAfter) }
    );
  }

  const { success } = await limiter.limit({
    key: publicFormRateLimitKey(request)
  });

  if (success) return null;

  return jsonResponse(
    {
      ok: false,
      error: "Too many requests. Please wait a minute and try again."
    },
    429,
    { "Retry-After": String(config.retryAfter) }
  );
}

async function rejectEmptyRentalRequest(request, path) {
  if (path !== "/api/rental" || request.method !== "POST") return null;

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return null;

  const body = await request.clone().json().catch(() => null);
  if (!body || rentalRequestHasSelection(body)) return null;

  return jsonResponse(
    {
      ok: false,
      error: "Select at least one equipment item or service"
    },
    400
  );
}

export default {
  async fetch(request, env) {
    const path = normalizedPath(request);
    const url = new URL(request.url);

    if (path === "/api/availability" || path === "/api/admin/availability") {
      const response = await handleAvailabilityApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) {
        return decorateAvailabilityNextWindowResponse(response, env, {
          publicView: path === "/api/availability"
        });
      }
    }

    if (
      path === "/api/site/showday-status" ||
      path === "/api/admin/showday-override" ||
      path === "/api/admin/site-schedule" ||
      path.startsWith("/api/admin/site-schedule/events/")
    ) {
      const response = await handleSiteScheduleApiV2(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (path === "/api/admin/calendar/events") {
      const response = await handleCalendarApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (!response) return response;
      if (request.method === "GET" && response.ok) {
        return decorateCalendarResponseV2(response, env, {
          applyOverrides: url.searchParams.get("view") !== "source"
        });
      }
      return response;
    }

    if (
      path === "/api/admin/finance/dashboard" ||
      path === "/api/admin/finance/settings"
    ) {
      const response = await handleFinanceDashboardApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi,
        fetchImpl: financeUpstreamFetch
      });
      if (response) return response;
    }

    if (path.startsWith("/api/admin/finance")) {
      const response = await handleFinanceApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi,
        fetchImpl: financeUpstreamFetch
      });
      if (response) return response;
    }

    const limited = await enforcePublicFormRateLimit(request, env);
    if (limited) return limited;

    const emptyRental = await rejectEmptyRentalRequest(request, path);
    if (emptyRental) return emptyRental;

    const preparedLead = await preparePublicLeadRequest(request);
    const response = await appWorker.fetch(preparedLead.request, env);

    if (preparedLead.lead) {
      try {
        await persistLeadCoreFromPublicResponse(
          env,
          response,
          preparedLead.lead
        );
      } catch (error) {
        // The established public form write remains authoritative. Lead Core
        // enrichment must never turn an already-successful Contact/Rental
        // capture into a public failure during this storage migration.
        console.error("[SD.Live] Lead Core storage enrichment failed", error);
      }
    }

    if (request.method === "GET" && path === FINANCE_PAGE_PATH) {
      return decorateFinanceAdminPage(response);
    }
    if (request.method === "GET" && (path === "/admin" || path === "/admin/index.html")) {
      return applyAvailabilityAdminRuntime(response);
    }
    if (request.method === "GET" && !path.startsWith("/admin")) {
      return applyShowDayRuntime(response);
    }
    return response;
  }
};
