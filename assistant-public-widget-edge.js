const ASSISTANT_WIDGET_VERSION = "20260903-3";

function enabled(env) {
  return String(env?.ASSISTANT_PUBLIC_ENABLED || "").trim().toLowerCase() === "true";
}

function siteKey(env) {
  const value = String(env?.ASSISTANT_TURNSTILE_SITE_KEY || "").trim();
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(value)) return "";
  return value;
}

function escapeAttribute(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const LAUNCHER_HTML = `
<div class="assistant-contact-entry" data-sdlive-assistant-entry>
  <button class="assistant-contact-launch" type="button" data-sdlive-assistant-launch aria-haspopup="dialog" aria-controls="sdliveAssistantPanel">
    <span class="assistant-contact-launch__mark" aria-hidden="true">AI</span>
    <span class="assistant-contact-launch__copy">
      <strong data-en="Ask SD.Live Assistant" data-es="Pregúntale a SD.Live Assistant">Ask SD.Live Assistant</strong>
      <small data-en="Describe the project and get guided next steps" data-es="Cuéntame el proyecto y recibe próximos pasos guiados">Describe the project and get guided next steps</small>
    </span>
    <span class="assistant-contact-launch__arrow" aria-hidden="true">↗</span>
  </button>
</div>`;

function panelHtml(turnstileSiteKey) {
  return `
<div class="assistant-widget" id="sdliveAssistantWidget" data-turnstile-sitekey="${escapeAttribute(turnstileSiteKey)}" aria-hidden="true">
  <button class="assistant-widget__backdrop" type="button" data-sdlive-assistant-close aria-label="Close Assistant"></button>
  <section class="assistant-panel" id="sdliveAssistantPanel" role="dialog" aria-modal="true" aria-labelledby="sdliveAssistantTitle" tabindex="-1">
    <header class="assistant-panel__header">
      <div class="assistant-panel__identity">
        <span class="assistant-panel__eyebrow" data-en="AI ASSISTANT" data-es="ASISTENTE CON IA">AI ASSISTANT</span>
        <h2 id="sdliveAssistantTitle">SD.Live Assistant</h2>
        <p data-en="Project guidance for creative and technical audio." data-es="Orientación para proyectos de audio creativo y técnico.">Project guidance for creative and technical audio.</p>
      </div>
      <button class="assistant-panel__close" type="button" data-sdlive-assistant-close aria-label="Close Assistant">×</button>
    </header>

    <div class="assistant-panel__conversation">
      <div class="assistant-panel__messages" id="sdliveAssistantMessages" role="log" aria-live="polite" aria-relevant="additions">
        <article class="assistant-message assistant-message--assistant" data-assistant-welcome>
          <span class="assistant-message__label">SD.Live Assistant</span>
          <p data-en="Tell me what you're planning — live sound, theatre, sound design, systems or rental — and I'll help organize the request." data-es="Cuéntame qué estás planeando — sonido en vivo, teatro, diseño sonoro, sistemas o alquiler — y te ayudo a organizar la solicitud.">Tell me what you're planning — live sound, theatre, sound design, systems or rental — and I'll help organize the request.</p>
        </article>
        <article class="assistant-security-message" id="sdliveAssistantSecurity" aria-live="polite">
          <span class="assistant-message__label" data-en="Security check" data-es="Verificación de seguridad">Security check</span>
          <div class="assistant-security-message__bubble">
            <p class="assistant-security-message__status" id="sdliveAssistantSecurityStatus" data-en="Before we start, verify you're human." data-es="Antes de empezar, verifica que eres humano.">Before we start, verify you're human.</p>
            <div class="assistant-turnstile" id="sdliveAssistantTurnstile" aria-label="Security verification"></div>
          </div>
        </article>
        <div class="assistant-panel__consent" id="sdliveAssistantConsent" hidden></div>
      </div>
    </div>

    <form class="assistant-panel__composer" id="sdliveAssistantForm">
      <label class="sr-only" for="sdliveAssistantInput" data-en="Message SD.Live Assistant" data-es="Mensaje para SD.Live Assistant">Message SD.Live Assistant</label>
      <div class="assistant-panel__composer-main">
        <textarea id="sdliveAssistantInput" maxlength="2500" rows="1" required data-en-placeholder="Type your message…" data-es-placeholder="Escribe tu mensaje…" placeholder="Type your message…"></textarea>
        <button class="assistant-panel__send" id="sdliveAssistantSend" type="submit" disabled>
          <span data-en="Send" data-es="Enviar">Send</span>
          <span class="assistant-panel__send-icon" aria-hidden="true">↗</span>
        </button>
      </div>
      <p class="assistant-panel__status" id="sdliveAssistantStatus" role="status" aria-live="polite"></p>
      <div class="assistant-panel__footer">
        <span data-en="Prefer a person?" data-es="¿Prefieres una persona?">Prefer a person?</span>
        <a href="mailto:hello@sdlive.show">hello@sdlive.show</a>
        <a href="https://wa.me/samd.llano95" rel="noopener" target="_blank">WhatsApp ↗</a>
      </div>
    </form>
  </section>
</div>`;
}

export function assistantPublicWidgetPolicy(env = {}) {
  const key = siteKey(env);
  return Object.freeze({
    enabled: enabled(env),
    turnstileSiteKeyConfigured: Boolean(key),
    renders: enabled(env) && Boolean(key),
    launcher: "contact_section",
    persistentFloatingLauncher: false,
    sessionStorage: "memory_only",
    transcriptStorage: "none"
  });
}

export function applyAssistantPublicWidgetRuntime(response, env) {
  const type = response?.headers?.get("content-type") || "";
  const key = siteKey(env);
  if (!response || !response.ok || !type.includes("text/html") || !enabled(env) || !key) {
    return response;
  }

  const transformed = new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/assistant-public-widget.css?v=${ASSISTANT_WIDGET_VERSION}" data-sdlive-assistant-widget/>` +
          `<link rel="stylesheet" href="/assistant-public-widget-layout.css?v=${ASSISTANT_WIDGET_VERSION}" data-sdlive-assistant-widget/>` +
          `<link rel="stylesheet" href="/assistant-public-widget-chat.css?v=${ASSISTANT_WIDGET_VERSION}" data-sdlive-assistant-widget/>` +
          `<script defer src="/assistant-public-widget.js?v=${ASSISTANT_WIDGET_VERSION}" data-sdlive-assistant-widget></script>`,
          { html: true }
        );
      }
    })
    .on("#contact .contact-list", {
      element(element) {
        element.after(LAUNCHER_HTML, { html: true });
      }
    })
    .on("body", {
      element(element) {
        element.append(panelHtml(key), { html: true });
      }
    })
    .transform(response);

  const headers = new Headers(transformed.headers);
  headers.set("X-SDLive-Assistant-Widget", "enabled");
  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}
