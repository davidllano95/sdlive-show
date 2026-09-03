import baseWorker from "./admin-stabilization-worker.js";
import { handleWhatsAppOwnerWebhook } from "./whatsapp-owner-webhook.js";
import { handleWhatsAppOwnerAdminApi } from "./whatsapp-owner-admin.js";

async function verifyAdminViaExistingApi(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/api/admin/whoami";
  url.search = "";
  const verificationRequest = new Request(url.toString(), {
    method: "GET",
    headers: request.headers
  });
  const response = await baseWorker.fetch(verificationRequest, env, ctx);
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.authenticated || !data?.email) return null;
  return { email: String(data.email).trim().toLowerCase() };
}

export default {
  async fetch(request, env, ctx) {
    const webhookResponse = await handleWhatsAppOwnerWebhook(request, env);
    if (webhookResponse) return webhookResponse;

    const adminResponse = await handleWhatsAppOwnerAdminApi(request, env, {
      verifyAdmin: (adminRequest, adminEnv) => verifyAdminViaExistingApi(adminRequest, adminEnv, ctx)
    });
    if (adminResponse) return adminResponse;

    return baseWorker.fetch(request, env, ctx);
  }
};
