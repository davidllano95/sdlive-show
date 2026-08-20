(() => {
  const POLICY_VERSION = "2026-08-19";
  const POLICY_URL = "/privacy";
  const AUTHORIZATION_TTL_MS = 10 * 60 * 1000;

  if (window.SDLIVE_PRIVACY_CONSENT) return;

  const COPY = {
    es: {
      title: "Autorización de datos",
      body: "Para enviar esta solicitud, autorizo a Samuel David Llano / SD.Live a recolectar, almacenar y usar los datos que proporcioné para responder mi solicitud, preparar cotizaciones y gestionar la relación comercial o contractual relacionada.",
      rights: "Puedo consultar, actualizar, rectificar, suprimir mis datos o revocar la autorización escribiendo a hello@sdlive.show.",
      policy: "Ver Política de Tratamiento de Datos Personales",
      authorize: "Autorizar y enviar",
      cancel: "Cancelar",
      footer: "Privacidad y tratamiento de datos"
    },
    en: {
      title: "Data authorization",
      body: "To send this request, I authorize Samuel David Llano / SD.Live to collect, store and use the data I provided to respond to my request, prepare quotes and manage the related commercial or contractual relationship.",
      rights: "I may access, update, correct or delete my data, or revoke this authorization, by writing to hello@sdlive.show.",
      policy: "View Privacy & Data Processing Policy",
      authorize: "Authorize & send",
      cancel: "Cancel",
      footer: "Privacy & data processing"
    }
  };

  const authorizedAt = new Map();
  let activeRequest = null;
  let lastFocusedElement = null;

  const language = () =>
    document.documentElement.lang === "es" ? "es" : "en";

  function createBrandWordmarkText() {
    const wordmark = document.createElement("span");
    wordmark.className = "brand-wordmark-text";
    wordmark.setAttribute("aria-label", "SD.Live");
    wordmark.append(document.createTextNode("SD"));

    const dot = document.createElement("span");
    dot.className = "brand-wordmark-text__dot";
    dot.setAttribute("aria-hidden", "true");
    dot.textContent = ".";

    wordmark.append(dot, document.createTextNode("Live"));
    return wordmark;
  }

  function renderBrandSafeText(element, value) {
    if (!element) return;

    const text = String(value ?? "");
    if (!text.includes("SD.Live")) {
      element.textContent = text;
      return;
    }

    const fragment = document.createDocumentFragment();
    const parts = text.split("SD.Live");

    parts.forEach((part, index) => {
      if (part) fragment.append(document.createTextNode(part));
      if (index < parts.length - 1) {
        fragment.append(createBrandWordmarkText());
      }
    });

    element.replaceChildren(fragment);
  }

  function installBrandSafeAlert() {
    if (window.__sdliveBrandSafeAlertInstalled) return;
    window.__sdliveBrandSafeAlertInstalled = true;

    const nativeAlert = window.alert.bind(window);

    window.alert = (message) => {
      if (message === "Mensaje recibido. Gracias por contactar a SD.Live.") {
        return nativeAlert("Mensaje recibido. Gracias por escribirnos.");
      }

      if (message === "Message received. Thanks for contacting SD.Live.") {
        return nativeAlert("Message received. Thanks for reaching out.");
      }

      return nativeAlert(message);
    };
  }

  function hasFreshAuthorization(source) {
    const timestamp = authorizedAt.get(source);
    return Number.isFinite(timestamp) &&
      Date.now() - timestamp <= AUTHORIZATION_TTL_MS;
  }

  function authorize(source) {
    authorizedAt.set(source, Date.now());
  }

  function clearAuthorization(source) {
    authorizedAt.delete(source);
  }

  function ensureStyles() {
    if (document.getElementById("sdlive-privacy-consent-styles")) return;

    const style = document.createElement("style");
    style.id = "sdlive-privacy-consent-styles";
    style.textContent = `
      .privacy-footer-link {
        color: inherit;
        text-decoration-color: currentColor;
        text-underline-offset: 3px;
      }
      .privacy-footer-link:hover {
        color: var(--color-accent, #A089E5);
      }
      .privacy-consent-modal[hidden] {
        display: none !important;
      }
      .privacy-consent-modal {
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: grid;
        place-items: center;
        padding: 20px;
      }
      .privacy-consent-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(3, 4, 8, .76);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        cursor: default;
      }
      .privacy-consent-dialog {
        position: relative;
        width: min(100%, 520px);
        max-height: min(720px, calc(100vh - 40px));
        overflow: auto;
        padding: clamp(24px, 5vw, 34px);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 24px;
        background:
          radial-gradient(circle at 15% 0%, rgba(160,137,229,.16), transparent 55%),
          rgba(10, 11, 16, .97);
        box-shadow: 0 28px 90px rgba(0,0,0,.55);
        color: var(--color-text, #f4f5f8);
      }
      .privacy-consent-kicker {
        margin: 0 0 8px;
        color: var(--color-accent, #A089E5);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .14em;
        text-transform: uppercase;
      }
      .privacy-consent-title {
        margin: 0;
        font-family: var(--font-display, "Sora", sans-serif);
        font-size: clamp(24px, 5vw, 31px);
        line-height: 1.15;
      }
      .privacy-consent-body {
        margin: 18px 0 0;
        color: var(--color-text-soft, #b8bdc9);
        font-size: 14px;
        line-height: 1.65;
      }
      .privacy-consent-rights {
        margin: 12px 0 0;
        color: var(--color-text-soft, #b8bdc9);
        font-size: 12px;
        line-height: 1.55;
        opacity: .82;
      }
      .privacy-consent-policy {
        display: inline-block;
        margin-top: 16px;
        color: var(--color-text, #f4f5f8);
        font-size: 12px;
        text-underline-offset: 3px;
      }
      .privacy-consent-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 26px;
      }
      .privacy-consent-actions .btn {
        min-width: 0;
      }
      .privacy-consent-cancel {
        border: 1px solid rgba(255,255,255,.14);
        background: transparent;
        color: var(--color-text, #f4f5f8);
      }
      body.privacy-consent-open {
        overflow: hidden;
      }
      @media (max-width: 520px) {
        .privacy-consent-modal {
          align-items: end;
          padding: 12px;
        }
        .privacy-consent-dialog {
          width: 100%;
          border-radius: 22px;
        }
        .privacy-consent-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
        .privacy-consent-actions .btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function buildModal() {
    if (document.getElementById("privacyConsentModal")) {
      return document.getElementById("privacyConsentModal");
    }

    const modal = document.createElement("div");
    modal.id = "privacyConsentModal";
    modal.className = "privacy-consent-modal";
    modal.hidden = true;

    const backdrop = document.createElement("button");
    backdrop.type = "button";
    backdrop.className = "privacy-consent-backdrop";
    backdrop.setAttribute("aria-label", "Cancel");
    backdrop.dataset.privacyAction = "cancel";

    const dialog = document.createElement("section");
    dialog.className = "privacy-consent-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "privacyConsentTitle");
    dialog.setAttribute("aria-describedby", "privacyConsentBody");

    const kicker = document.createElement("p");
    kicker.className = "privacy-consent-kicker";
    renderBrandSafeText(kicker, "SD.Live · Privacy");

    const title = document.createElement("h2");
    title.id = "privacyConsentTitle";
    title.className = "privacy-consent-title";
    title.dataset.privacyText = "title";

    const body = document.createElement("p");
    body.id = "privacyConsentBody";
    body.className = "privacy-consent-body";
    body.dataset.privacyText = "body";

    const rights = document.createElement("p");
    rights.className = "privacy-consent-rights";
    rights.dataset.privacyText = "rights";

    const policy = document.createElement("a");
    policy.className = "privacy-consent-policy";
    policy.href = POLICY_URL;
    policy.target = "_blank";
    policy.rel = "noopener";
    policy.dataset.privacyText = "policy";

    const actions = document.createElement("div");
    actions.className = "privacy-consent-actions";

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn privacy-consent-cancel";
    cancel.dataset.privacyAction = "cancel";
    cancel.dataset.privacyText = "cancel";

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "btn btn-primary";
    confirm.dataset.privacyAction = "authorize";
    confirm.dataset.privacyText = "authorize";

    actions.append(cancel, confirm);
    dialog.append(kicker, title, body, rights, policy, actions);
    modal.append(backdrop, dialog);
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      const action = event.target.closest?.("[data-privacy-action]")?.dataset.privacyAction;
      if (action === "authorize") finishConsent(true);
      if (action === "cancel") finishConsent(false);
    });

    return modal;
  }

  function renderCopy() {
    const lang = language();
    document.querySelectorAll("[data-privacy-text]").forEach((element) => {
      const key = element.dataset.privacyText;
      if (COPY[lang]?.[key]) {
        renderBrandSafeText(element, COPY[lang][key]);
      }
    });

    const backdrop = document.querySelector(".privacy-consent-backdrop");
    if (backdrop) {
      backdrop.setAttribute(
        "aria-label",
        lang === "es" ? "Cancelar autorización" : "Cancel authorization"
      );
    }
  }

  function finishConsent(granted) {
    if (!activeRequest) return;

    const { source, resolve } = activeRequest;
    activeRequest = null;

    if (granted) authorize(source);

    const modal = document.getElementById("privacyConsentModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("privacy-consent-open");

    if (lastFocusedElement?.isConnected) {
      lastFocusedElement.focus({ preventScroll: true });
    }
    lastFocusedElement = null;

    resolve(granted);
  }

  function requestConsent(source) {
    if (hasFreshAuthorization(source)) {
      return Promise.resolve(true);
    }

    if (activeRequest) {
      return Promise.resolve(false);
    }

    const modal = buildModal();
    renderCopy();
    lastFocusedElement = document.activeElement;

    modal.hidden = false;
    document.body.classList.add("privacy-consent-open");

    requestAnimationFrame(() => {
      modal.querySelector('[data-privacy-action="authorize"]')?.focus({ preventScroll: true });
    });

    return new Promise((resolve) => {
      activeRequest = { source, resolve };
    });
  }

  function insertFooterLink() {
    if (document.querySelector(".privacy-footer-link")) return;

    const footerEmail = document.getElementById("footerEmail");
    const footerColumn = footerEmail?.closest(".footer-col");
    if (!footerColumn) return;

    const link = document.createElement("a");
    link.className = "privacy-footer-link";
    link.href = POLICY_URL;
    link.dataset.privacyText = "footer";
    footerColumn.appendChild(link);
  }

  function bindContactConsent() {
    const form = document.getElementById("contactForm");
    if (!form || form.dataset.privacyModalBound === "true") return;
    form.dataset.privacyModalBound = "true";

    form.addEventListener("submit", (event) => {
      if (hasFreshAuthorization("contact")) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const submitter = event.submitter || form.querySelector('button[type="submit"]');

      requestConsent("contact").then((granted) => {
        if (!granted) return;
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit(submitter || undefined);
        } else {
          submitter?.click();
        }
      });
    });
  }

  function bindRentalConsent() {
    const button = document.getElementById("quoteRequestBtn");
    const form = document.getElementById("rentalQuoteBuilder");
    if (!button || !form || button.dataset.privacyModalBound === "true") return;
    button.dataset.privacyModalBound = "true";

    button.addEventListener("click", (event) => {
      if (hasFreshAuthorization("rental")) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!form.reportValidity()) return;

      requestConsent("rental").then((granted) => {
        if (!granted) return;
        button.click();
      });
    });
  }

  function normalizeRequestUrl(input) {
    if (typeof input === "string") {
      try {
        return new URL(input, window.location.origin).pathname;
      } catch {
        return input;
      }
    }

    if (input instanceof Request) {
      try {
        return new URL(input.url).pathname;
      } catch {
        return input.url;
      }
    }

    return "";
  }

  function sourceForEndpoint(pathname) {
    if (pathname === "/api/contact") return "contact";
    if (pathname === "/api/rental") return "rental";
    return "";
  }

  function installFetchGuard() {
    if (window.__sdlivePrivacyFetchInstalled) return;
    window.__sdlivePrivacyFetchInstalled = true;

    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      const pathname = normalizeRequestUrl(input);
      const source = sourceForEndpoint(pathname);
      const method = String(init?.method || "GET").toUpperCase();

      if (
        source &&
        method === "POST" &&
        typeof init?.body === "string"
      ) {
        try {
          const body = JSON.parse(init.body);
          body.privacyConsent = hasFreshAuthorization(source);
          body.privacyPolicyVersion = POLICY_VERSION;
          init = {
            ...init,
            body: JSON.stringify(body)
          };
        } catch {
          // The server rejects malformed or unconsented requests.
        }
      }

      const response = await nativeFetch(input, init);

      if (source && method === "POST" && response.ok) {
        clearAuthorization(source);
      }

      return response;
    };
  }

  function init() {
    ensureStyles();
    buildModal();
    insertFooterLink();
    bindContactConsent();
    bindRentalConsent();
    renderCopy();

    const observer = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) =>
            mutation.type === "attributes" &&
            mutation.attributeName === "lang"
        )
      ) {
        renderCopy();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeRequest) {
        finishConsent(false);
      }
    });
  }

  installFetchGuard();
  installBrandSafeAlert();

  window.SDLIVE_PRIVACY_CONSENT = {
    POLICY_VERSION,
    POLICY_URL,
    request: requestConsent
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
