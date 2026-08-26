(() => {
  const DASHBOARD_PATH = "/api/admin/finance/dashboard";
  const REQUEST_TIMEOUT_MS = 12000;
  const SHORT_CACHE_MS = 1500;
  const originalFetch = window.fetch.bind(window);

  let inFlight = null;
  let cachedResponse = null;
  let cachedAt = 0;
  let lastFailureMessage = "";

  function requestPath(input) {
    try {
      const raw = typeof input === "string" ? input : input?.url;
      return new URL(raw, window.location.origin).pathname;
    } catch {
      return "";
    }
  }

  function isDashboardGet(input, init = {}) {
    const method = String(init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
    return method === "GET" && requestPath(input) === DASHBOARD_PATH;
  }

  async function diagnosticResponse(response) {
    const type = String(response.headers.get("content-type") || "").toLowerCase();
    if (response.ok || !type.includes("application/json")) return response;

    const data = await response.clone().json().catch(() => null);
    if (!data) return response;

    const diagnostic = [data.stage, data.code].filter(Boolean).join("/");
    lastFailureMessage = diagnostic
      ? `${data.error || "Finance source unavailable"} · ${diagnostic}`
      : (data.error || `Finance request failed (${response.status})`);

    return new Response(JSON.stringify({
      ...data,
      error: lastFailureMessage
    }), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  async function fetchDashboard(input, init = {}) {
    const now = Date.now();
    if (cachedResponse && now - cachedAt < SHORT_CACHE_MS) {
      return cachedResponse.clone();
    }

    if (!inFlight) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      inFlight = originalFetch(input, {
        ...init,
        signal: controller.signal
      })
        .then(diagnosticResponse)
        .then((response) => {
          cachedResponse = response.clone();
          cachedAt = Date.now();
          return response;
        })
        .catch((error) => {
          if (error?.name === "AbortError") {
            lastFailureMessage = "Finance request timed out";
            throw new Error(lastFailureMessage);
          }
          lastFailureMessage = error?.message || "Finance source unavailable";
          throw error;
        })
        .finally(() => {
          window.clearTimeout(timer);
          inFlight = null;
        });
    }

    const response = await inFlight;
    return response.clone();
  }

  window.fetch = function stableFinanceFetch(input, init = {}) {
    if (isDashboardGet(input, init)) return fetchDashboard(input, init);
    return originalFetch(input, init);
  };

  const dashboard = window.SDLiveFinanceDashboard;
  if (!dashboard?.load) return;

  const originalLoad = dashboard.load.bind(dashboard);
  dashboard.load = async function stableFinanceLoad() {
    await originalLoad();

    const source = document.getElementById("financeSource");
    const label = source?.querySelector("span");
    const message = String(label?.textContent || "").trim();
    const normalized = message.toLowerCase();

    if (
      source?.classList.contains("is-error") ||
      normalized.includes("unavailable") ||
      normalized.includes("timed out") ||
      !normalized.startsWith("live ·")
    ) {
      throw new Error(lastFailureMessage || message || "Finance source unavailable");
    }

    lastFailureMessage = "";
    return true;
  };
})();
