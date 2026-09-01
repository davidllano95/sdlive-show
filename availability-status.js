(() => {
  const ENDPOINT = "/api/availability";
  const REFRESH_MS = 60000;
  const AUTO_SHOW_DELAY_MS = 1200;
  const AUTO_HIDE_MS = 5200;
  const SESSION_KEY = "sdlive-availability-popover-v1";

  const copy = {
    en: {
      available: {
        status: "Available now",
        message: "Message me on WhatsApp."
      },
      limited: {
        status: "Limited response",
        message: "Leave a WhatsApp message — I may reply more slowly right now."
      },
      away: {
        status: "Currently away",
        message: "Leave a WhatsApp message — I'll reply during the next service window."
      }
    },
    es: {
      available: {
        status: "Disponible ahora",
        message: "Escríbeme por WhatsApp."
      },
      limited: {
        status: "Respuesta limitada",
        message: "Déjame un mensaje por WhatsApp — puede que responda más lento ahora."
      },
      away: {
        status: "No disponible ahora",
        message: "Déjame un mensaje por WhatsApp — responderé en la próxima ventana de atención."
      }
    }
  };

  let button = null;
  let popover = null;
  let statusEl = null;
  let messageEl = null;
  let currentState = null;
  let autoHideTimer = 0;
  let refreshTimer = 0;
  let hoverHideTimer = 0;

  function language() {
    return String(document.documentElement.lang || "en").toLowerCase().startsWith("es") ? "es" : "en";
  }

  function normalizedState(value) {
    return ["available", "limited", "away"].includes(value) ? value : "available";
  }

  function ensurePopover() {
    if (popover) return popover;
    popover = document.createElement("aside");
    popover.className = "availability-popover";
    popover.id = "availabilityPopover";
    popover.setAttribute("role", "status");
    popover.setAttribute("aria-live", "polite");
    popover.setAttribute("aria-hidden", "true");

    statusEl = document.createElement("span");
    statusEl.className = "availability-popover__status";
    messageEl = document.createElement("span");
    messageEl.className = "availability-popover__message";
    popover.append(statusEl, messageEl);
    document.body.append(popover);
    return popover;
  }

  function positionPopover() {
    if (!button || !popover) return;
    const rect = button.getBoundingClientRect();
    const width = popover.offsetWidth || 290;
    const height = popover.offsetHeight || 70;
    const gap = 14;
    const left = Math.max(12, rect.left - width - gap);
    const top = Math.min(
      window.innerHeight - height - 12,
      Math.max(12, rect.top + (rect.height - height) / 2)
    );
    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  function renderCopy() {
    if (!currentState) return;
    ensurePopover();
    const text = copy[language()][currentState];
    statusEl.textContent = text.status;
    messageEl.textContent = text.message;
    button?.setAttribute("aria-describedby", popover.id);
    positionPopover();
  }

  function showPopover({ autoHide = true } = {}) {
    if (!currentState) return;
    ensurePopover();
    renderCopy();
    window.clearTimeout(autoHideTimer);
    popover.classList.add("is-visible");
    popover.setAttribute("aria-hidden", "false");
    positionPopover();
    if (autoHide) {
      autoHideTimer = window.setTimeout(hidePopover, AUTO_HIDE_MS);
    }
  }

  function hidePopover() {
    if (!popover) return;
    window.clearTimeout(autoHideTimer);
    popover.classList.remove("is-visible");
    popover.setAttribute("aria-hidden", "true");
  }

  function sessionMarker(state) {
    return `shown:${state}`;
  }

  function shouldAutoShow(state, changed) {
    if (changed) return true;
    try {
      return sessionStorage.getItem(SESSION_KEY) !== sessionMarker(state);
    } catch {
      return true;
    }
  }

  function markAutoShown(state) {
    try {
      sessionStorage.setItem(SESSION_KEY, sessionMarker(state));
    } catch {
      // Availability remains functional if session storage is unavailable.
    }
  }

  function applyState(nextState) {
    const state = normalizedState(nextState);
    const changed = Boolean(currentState && currentState !== state);
    currentState = state;
    button.dataset.availabilityState = state;
    ensurePopover().dataset.availabilityState = state;
    renderCopy();

    if (shouldAutoShow(state, changed)) {
      markAutoShown(state);
      window.setTimeout(() => showPopover({ autoHide: true }), changed ? 120 : AUTO_SHOW_DELAY_MS);
    }
  }

  async function refresh() {
    try {
      const response = await fetch(ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.ok) return;
      applyState(data.status);
    } catch {
      // Fail open: keep the existing WhatsApp button without status decoration.
    }
  }

  function bindInteractions() {
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (hoverCapable) {
      button.addEventListener("pointerenter", () => {
        window.clearTimeout(hoverHideTimer);
        showPopover({ autoHide: false });
      });
      button.addEventListener("pointerleave", () => {
        hoverHideTimer = window.setTimeout(hidePopover, 220);
      });
      popover?.addEventListener("pointerenter", () => window.clearTimeout(hoverHideTimer));
      popover?.addEventListener("pointerleave", () => {
        hoverHideTimer = window.setTimeout(hidePopover, 180);
      });
    }

    window.addEventListener("resize", positionPopover, { passive: true });
    window.addEventListener("scroll", positionPopover, { passive: true });

    new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.attributeName === "lang")) renderCopy();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  function init() {
    button = document.getElementById("whatsappFloat");
    if (!button) return;
    ensurePopover();
    bindInteractions();
    refresh();
    refreshTimer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("pagehide", () => window.clearInterval(refreshTimer), { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
