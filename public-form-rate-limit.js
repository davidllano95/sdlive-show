import appWorker from "./worker-router.js";
import { handleFinanceApi } from "./finance-api.js";
import { handleFinanceDashboardApi } from "./finance-dashboard-api.js";
import { handleCalendarApi } from "./calendar-api.js";
import {
  decorateCalendarResponseV2,
  handleSiteScheduleApiV2
} from "./site-schedule-store-v2.js";
import { applyShowDayRuntime } from "./showday-edge.js";

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

export default {
  async fetch(request, env) {
    const path = normalizedPath(request);
    const url = new URL(request.url);

    if (
      path === "/api/site/showday-status" ||
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
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    if (path.startsWith("/api/admin/finance")) {
      const response = await handleFinanceApi(request, env, {
        verifyAdmin: verifyAdminViaExistingApi
      });
      if (response) return response;
    }

    const limited = await enforcePublicFormRateLimit(request, env);
    if (limited) return limited;

    const response = await appWorker.fetch(request, env);
    if (request.method === "GET" && !path.startsWith("/admin")) {
      return applyShowDayRuntime(response);
    }
    return response;
  }
};
