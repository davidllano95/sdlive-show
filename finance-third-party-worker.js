import baseWorker from "./admin-stabilization-worker.js";
import { handleFinanceThirdPartyDashboardApi } from "./finance-third-party-dashboard-api.js";

function normalizedPath(request) {
  const url = new URL(request.url);
  return url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
}

async function verifyAdminViaBase(request, env) {
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

export default {
  async fetch(request, env, ctx) {
    if (normalizedPath(request) === "/api/admin/finance/dashboard") {
      const response = await handleFinanceThirdPartyDashboardApi(request, env, {
        verifyAdmin: verifyAdminViaBase
      });
      if (response) return response;
    }
    return baseWorker.fetch(request, env, ctx);
  }
};
