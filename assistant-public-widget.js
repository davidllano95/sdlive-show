(() => {
  const ENDPOINT = "/api/assistant";
  const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const MAX_MESSAGE_CHARS = 2500;

  const COPY = {
    en: {
      close: "Close Assistant",
      securityPending: "Complete the security check to continue.",
      securityLoading: "Loading security check…",
      securityFailed: "Security verification is unavailable. You can use email or WhatsApp instead.",
      sending: "Sending…",
      fallback: "The Assistant is temporarily unavailable. No request was submitted. You can continue by email or WhatsApp.",
      network: "I couldn't reach the Assistant. No request was submitted. You can try again or use email or WhatsApp.",
      expired: "This conversation expired for security. No new request was submitted. Send your message again to start a fresh session.",
      submitted: "Request saved",
      cancelled: "Submission cancelled",
      you: "You",
      assistant: "SD.Live Assistant"
    },
    es: {
      close: "Cerrar Assistant",
      securityPending: "Completa la verificación de seguridad para continuar.",
      securityLoading: "Cargando verificación de seguridad…",
      securityFailed: "La verificación de seguridad no está disponible. Puedes usar correo o WhatsApp.",
      sending: "Enviando…",
      fallback: "El Assistant no está disponible temporalmente. No se envió ninguna solicitud. Puedes continuar por correo o WhatsApp.",
      network: "No pude conectar con el Assistant. No se envió ninguna solicitud. Puedes intentar de nuevo o usar correo o WhatsApp.",
      expired: "Esta conversación expiró por seguridad. No se envió una nueva solicitud. Envía tu mensaje otra vez para iniciar una sesión nueva.",
      submitted: "Solicitud guardada",
      cancelled: "Envío cancelado",
      you: "Tú",
      assistant: "SD.Live Assistant"
    }
  };

  let root;
  let panel;
  let messages;
  let form;
  let input;
  let sendButton;
  let status;
  let turnstileContainer;
  let consentBox;
  let siteKey = "";
  let sessionToken = null;
  let securityToken = "";
  let widgetId = null;
  let busy = false;
  let consentPending = false;
  let previousFocus = null;
  let turnstilePromise = null;

  function language() {
    return String(document.documentElement.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function text() {
    return COPY[language()];
  }

  function setStatus(value = "") {
    if (status) status.textContent = String(value || "");
  }

  function localize(scope = document) {
    const lang = language();
    scope.querySelectorAll?.("[data-en][data-es]").forEach((element) => {
      element.textContent = element.getAttribute(lang === "es" ? "data-es" : "data-en") || "";
    });
    scope.querySelectorAll?.("[data-en-placeholder][data-es-placeholder]").forEach((element) => {
      element.setAttribute(
        "placeholder",
        element.getAttribute(lang === "es" ? "data-es-placeholder" : "data-en-placeholder") || ""
      );
    });
    root?.querySelectorAll?.("[data-sdlive-assistant-close]").forEach((button) => {
      button.setAttribute("aria-label", text().close);
    });
  }

  function scrollMessages() {
    if (!messages) return;
    messages.scrollTop = messages.scrollHeight;
  }

  function appendMessage(kind, body, label) {
    const value = String(body || "").trim();
    if (!value || !messages) return null;

    const article = document.createElement("article");
    article.className = `assistant-message assistant-message--${kind}`;

    const labelEl = document.createElement("span");
    labelEl.className = "assistant-message__label";
    labelEl.textContent = label || (kind === "user" ? text().you : text().assistant);

    const paragraph = document.createElement("p");
    paragraph.textContent = value;
    article.append(labelEl, paragraph);
    messages.append(article);
    scrollMessages();
    return article;
  }

  function validPolicyUrl(value) {
    const url = String(value || "").trim();
    return /^\/[A-Za-z0-9/_-]*$/.test(url) ? url : "/privacy";
  }

  function clearConsent() {
    consentPending = false;
    if (consentBox) {
      consentBox.replaceChildren();
      consentBox.hidden = true;
    }
    if (input) input.disabled = false;
    updateControls();
  }

  function consentButton(className, label, action, policyVersion) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.dataset.consentAction = action;
    button.addEventListener("click", () => submitConsent(action, policyVersion));
    return button;
  }

  function renderConsent(prompt) {
    if (!consentBox || !prompt?.copy || !prompt?.policyVersion) return;
    consentPending = true;
    input.disabled = true;
    consentBox.replaceChildren();
    consentBox.hidden = false;

    const title = document.createElement("h3");
    title.className = "assistant-consent__title";
    title.textContent = String(prompt.copy.title || "");

    const body = document.createElement("p");
    body.className = "assistant-consent__body";
    body.textContent = String(prompt.copy.body || "");

    const rights = document.createElement("p");
    rights.className = "assistant-consent__rights";
    rights.textContent = String(prompt.copy.rights || "");

    const policy = document.createElement("a");
    policy.className = "assistant-consent__policy";
    policy.href = validPolicyUrl(prompt.policyUrl);
    policy.target = "_blank";
    policy.rel = "noopener";
    policy.textContent = String(prompt.copy.policy || "Privacy policy");

    const actions = document.createElement("div");
    actions.className = "assistant-consent__actions";
    actions.append(
      consentButton(
        "assistant-consent__authorize",
        String(prompt.copy.authorize || "Authorize & send"),
        "authorize",
        String(prompt.policyVersion)
      ),
      consentButton(
        "assistant-consent__cancel",
        String(prompt.copy.cancel || "Cancel"),
        "cancel",
        String(prompt.policyVersion)
      )
    );

    consentBox.append(title, body, rights, policy, actions);
    updateControls();
  }

  function updateControls() {
    const hasMessage = Boolean(String(input?.value || "").trim());
    if (sendButton) {
      sendButton.disabled = busy || consentPending || !hasMessage || !securityToken;
    }
    consentBox?.querySelectorAll("button[data-consent-action]").forEach((button) => {
      button.disabled = busy || !securityToken;
    });
  }

  function loadTurnstile() {
    if (window.turnstile?.render) return Promise.resolve(window.turnstile);
    if (turnstilePromise) return turnstilePromise;

    turnstilePromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-sdlive-assistant-turnstile]");
      const script = existing || document.createElement("script");
      let settled = false;

      const finish = () => {
        if (settled) return;
        if (window.turnstile?.render) {
          settled = true;
          resolve(window.turnstile);
        }
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        reject(new Error("turnstile_unavailable"));
      };

      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", fail, { once: true });
      if (!existing) {
        script.src = TURNSTILE_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.sdliveAssistantTurnstile = "true";
        document.head.append(script);
      } else {
        window.setTimeout(finish, 0);
      }
    });

    return turnstilePromise;
  }

  async function ensureSecurity() {
    if (widgetId !== null || !turnstileContainer || !siteKey) return;
    setStatus(text().securityLoading);
    try {
      const turnstile = await loadTurnstile();
      widgetId = turnstile.render(turnstileContainer, {
        sitekey: siteKey,
        action: "assistant",
        theme: "dark",
        callback(token) {
          securityToken = String(token || "");
          setStatus("");
          updateControls();
        },
        "expired-callback"() {
          securityToken = "";
          setStatus(text().securityPending);
          updateControls();
        },
        "error-callback"() {
          securityToken = "";
          setStatus(text().securityFailed);
          updateControls();
        }
      });
    } catch {
      setStatus(text().securityFailed);
      updateControls();
    }
  }

  function resetSecurity() {
    securityToken = "";
    try {
      if (widgetId !== null && window.turnstile?.reset) {
        window.turnstile.reset(widgetId);
      }
    } catch {
      // A failed reset simply leaves submit disabled until a fresh widget token exists.
    }
    updateControls();
  }

  function safeSessionToken(data) {
    const value = String(data?.sessionToken || "").trim();
    if (value.startsWith("ast1.") && value.length <= 24000) sessionToken = value;
  }

  async function apiRequest(payload) {
    const body = {
      ...payload,
      language: language(),
      turnstileToken: securityToken
    };
    if (sessionToken) body.sessionToken = sessionToken;

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(body)
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  }

  function handleApiError(response, data) {
    if (data?.error === "session_expired") {
      sessionToken = null;
      clearConsent();
      appendMessage("system", text().expired, "SD.Live");
      return;
    }
    const safeReply = String(data?.reply || "").trim();
    appendMessage("system", safeReply || text().fallback, "SD.Live");
    if (response?.status === 404) sessionToken = null;
  }

  function handleApiSuccess(data) {
    safeSessionToken(data);
    const reply = String(data?.reply || "").trim();
    if (reply) appendMessage("assistant", reply);

    if (data?.kind === "request_consent" && data?.consentPrompt) {
      renderConsent(data.consentPrompt);
      return;
    }

    if (data?.kind === "consent_cancelled") {
      clearConsent();
      setStatus(text().cancelled);
      return;
    }

    if (data?.kind === "lead_captured" && data?.submitted === true) {
      clearConsent();
      setStatus(text().submitted);
      return;
    }

    clearConsent();
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (busy || consentPending) return;
    const message = String(input.value || "").trim().slice(0, MAX_MESSAGE_CHARS);
    if (!message) return;
    if (!securityToken) {
      setStatus(text().securityPending);
      return;
    }

    busy = true;
    updateControls();
    appendMessage("user", message);
    input.value = "";
    setStatus(text().sending);

    try {
      const { response, data } = await apiRequest({ message });
      if (!response.ok || !data?.ok) handleApiError(response, data);
      else handleApiSuccess(data);
    } catch {
      appendMessage("system", text().network, "SD.Live");
    } finally {
      busy = false;
      resetSecurity();
      updateControls();
      input.focus();
    }
  }

  async function submitConsent(action, policyVersion) {
    if (busy || !consentPending) return;
    if (!securityToken) {
      setStatus(text().securityPending);
      return;
    }

    busy = true;
    updateControls();
    setStatus(text().sending);

    try {
      const { response, data } = await apiRequest({
        consentAction: action,
        privacyPolicyVersion: String(policyVersion || "")
      });
      if (!response.ok || !data?.ok) handleApiError(response, data);
      else handleApiSuccess(data);
    } catch {
      appendMessage("system", text().network, "SD.Live");
    } finally {
      busy = false;
      resetSecurity();
      updateControls();
      if (!consentPending) input.focus();
    }
  }

  function open() {
    previousFocus = document.activeElement;
    root.dataset.open = "true";
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("sdlive-assistant-open");
    localize(root);
    panel.focus({ preventScroll: true });
    ensureSecurity();
  }

  function close() {
    root.dataset.open = "false";
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sdlive-assistant-open");
    previousFocus?.focus?.({ preventScroll: true });
  }

  function bind() {
    document.querySelectorAll("[data-sdlive-assistant-launch]").forEach((button) => {
      button.addEventListener("click", open);
    });
    root.querySelectorAll("[data-sdlive-assistant-close]").forEach((button) => {
      button.addEventListener("click", close);
    });
    form.addEventListener("submit", submitMessage);
    input.addEventListener("input", updateControls);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.dataset.open === "true") close();
    });
    new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === "lang")) {
        localize(document);
        if (!busy && !securityToken && widgetId !== null) setStatus(text().securityPending);
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  function init() {
    root = document.getElementById("sdliveAssistantWidget");
    if (!root) return;
    panel = document.getElementById("sdliveAssistantPanel");
    messages = document.getElementById("sdliveAssistantMessages");
    form = document.getElementById("sdliveAssistantForm");
    input = document.getElementById("sdliveAssistantInput");
    sendButton = document.getElementById("sdliveAssistantSend");
    status = document.getElementById("sdliveAssistantStatus");
    turnstileContainer = document.getElementById("sdliveAssistantTurnstile");
    consentBox = document.getElementById("sdliveAssistantConsent");
    siteKey = String(root.dataset.turnstileSitekey || "").trim();

    if (!panel || !messages || !form || !input || !sendButton || !turnstileContainer || !consentBox || !siteKey) {
      root.remove();
      document.querySelectorAll("[data-sdlive-assistant-entry]").forEach((entry) => entry.remove());
      return;
    }

    root.dataset.open = "false";
    localize(document);
    bind();
    updateControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
