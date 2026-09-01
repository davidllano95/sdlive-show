import baseWorker from "./admin-stabilization-worker.js";
import { handleWhatsAppOwnerWebhook } from "./whatsapp-owner-webhook.js";

/**
 * Narrow transport wrapper for verified-owner WhatsApp commands.
 * All non-webhook traffic is delegated unchanged to the current stable Worker.
 */
export default {
  async fetch(request, env, ctx) {
    const webhookResponse = await handleWhatsAppOwnerWebhook(request, env);
    if (webhookResponse) return webhookResponse;
    return baseWorker.fetch(request, env, ctx);
  }
};
