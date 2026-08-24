(() => {
  const STORAGE_KEY = "sdlive-analytics-consent-v1";
  const POLICY_URL = "/privacy";
  const VALID_CHOICES = new Set(["granted", "denied"]);

  if (window.SDLIVE_ANALYTICS_CONSENT) return;

  const COPY = {
    es: {
      text: "Usamos analítica para entender cómo se utiliza SD.Live y mejorar el sitio. Puedes permitirla o continuar solo con funciones necesarias.",
      necessary: "Solo necesarias",
      allow: "Permitir analítica",
      policy: "Privacidad",
      preferences: "Preferencias de cookies",
      title: "Privacidad y analítica"
    },
    en: {
      text: "We use analytics to understand how SD.Live is used and improve the site. You can allow analytics or continue with necessary functions only.",
      necessary: "Necessary only",
      allow: "Allow analytics",
      policy: "Privacy",
      preferences: "Cookie preferences",
      title: "Privacy & analytics"
    }
  };

  let banner = null;
  let currentChoice = readChoice();

  function language() {
    return String(document.documentElement.lang || "en")
      .toLowerCase()
      .startsWith("es")
      ? "es"
      : "en";
  }

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

  function readChoice() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return VALID_CHOICES.has(value) ? value : "";
    } catch {
      return "";
    }
  }

  function saveChoice(choice) {
    currentChoice = choice;
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Consent still applies for the current page if storage is unavailable.
    }
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
  }

  function setGoogleConsentDefault() {
    ensureGtag();
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "granted",
      security_storage: "granted"
    });
  }

  function updateGoogleConsent(choice) {
    ensureGtag();
    const granted = choice === "granted";

    window.gtag("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "granted",
      security_storage: "granted"
    });

    window.dataLayer.push({
      event: "sdlive_consent_update",
      analytics_consent: granted ? "granted" : "denied"
    });
  }

  function expireCookie(name, domain = "") {
    const domainPart = domain ? `;domain=${domain}` : "";
    document.cookie = `${name}=;Max-Age=0;path=/${domainPart};SameSite=Lax`;
  }

  function removeAnalyticsCookies() {
    const names = document.cookie
      .split(";")
      .map((entry) => entry.split("=")[0].trim())
      .filter((name) => /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name));

    names.forEach((name) => {
      expireCookie(name);
      expireCookie(name, location.hostname);
      expireCookie(name, `.${location.hostname}`);
      if (location.hostname.endsWith("sdlive.show")) {
        expireCookie(name, ".sdlive.show");
      }
    });
  }

  function ensureStyles() {
    if (document.getElementById("sdlive-analytics-consent-styles")) return;

    const style = document.createElement("style");
    style.id = "sdlive-analytics-consent-styles";
    style.textContent = `
      .analytics-consent-banner[hidden] { display: none !important; }
      .analytics-consent-banner {
        position: fixed;
        left: 50%;
        bottom: max(18px, env(safe-area-inset-bottom));
        z-index: 10030;
        width: min(calc(100% - 28px), 720px);
        transform: translateX(-50%);
        padding: 16px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 18px;
        background: rgba(10,11,16,.96);
        color: var(--color-text, #f4f5f8);
        box-shadow: 0 20px 70px rgba(0,0,0,.42);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }
      .analytics-consent-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
      }
      .analytics-consent-title {
        margin: 0 0 4px;
        font: 700 13px/1.3 var(--font-display, "Manrope", sans-serif);
      }
      .analytics-consent-text {
        margin: 0;
        color: var(--color-text-soft, #b8bdc9);
        font: 500 12px/1.5 var(--font-body, "Manrope", sans-serif);
      }
      .analytics-consent-policy {
        display: inline-block;
        margin-top: 7px;
        color: var(--color-text-soft, #b8bdc9);
        font-size: 11px;
        text-underline-offset: 3px;
      }
      .analytics-consent-actions {
        display: flex;
        gap: 8px;
        white-space: nowrap;
      }
      .analytics-consent-button {
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.16);
        background: transparent;
        color: var(--color-text, #f4f5f8);
        cursor: pointer;
        font: 700 11px/1 var(--font-body, "Manrope", sans-serif);
      }
      .analytics-consent-button--primary {
        border-color: transparent;
        background: var(--color-accent, #A089E5);
        color: #090a0d;
      }
      .analytics-consent-button:focus-visible,
      .analytics-preferences-link:focus-visible {
        outline: 2px solid var(--color-accent, #A089E5);
        outline-offset: 3px;
      }
      .analytics-preferences-link {
        border: 0;
        padding: 0;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        text-decoration: none;
      }
      .footer-bottom--with-legal {
        flex-wrap: wrap;
        gap: 12px 24px;
      }
      .footer-legal-links {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: flex-end;
        gap: 8px 16px;
        margin-left: auto;
      }
      .footer-legal-links .privacy-footer-link,
      .footer-legal-links .analytics-preferences-link {
        color: inherit;
        opacity: .72;
        font: inherit;
        text-decoration: none;
      }
      .footer-legal-links .privacy-footer-link:hover,
      .footer-legal-links .analytics-preferences-link:hover {
        color: var(--color-accent, #A089E5);
        opacity: 1;
      }
      @media (max-width: 680px) {
        .analytics-consent-grid { grid-template-columns: 1fr; }
        .analytics-consent-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .analytics-consent-button { width: 100%; }
        .footer-legal-links {
          width: 100%;
          margin-left: 0;
          justify-content: flex-start;
        }
      }
      @media (max-width: 420px) {
        .analytics-consent-actions { grid-template-columns: 1fr; }
      }
    `;

    document.head.appendChild(style);
  }

  function buildBanner() {
    if (banner?.isConnected) return banner;

    banner = document.createElement("aside");
    banner.className = "analytics-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.hidden = true;
    banner.innerHTML = `
      <div class="analytics-consent-grid">
        <div>
          <p class="analytics-consent-title" data-analytics-copy="title"></p>
          <p class="analytics-consent-text" data-analytics-copy="text"></p>
          <a class="analytics-consent-policy" href="${POLICY_URL}" data-analytics-copy="policy"></a>
        </div>
        <div class="analytics-consent-actions">
          <button class="analytics-consent-button" type="button" data-analytics-choice="denied"></button>
          <button class="analytics-consent-button analytics-consent-button--primary" type="button" data-analytics-choice="granted"></button>
        </div>
      </div>
    `;

    banner.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-analytics-choice]");
      if (!button) return;
      setChoice(button.dataset.analyticsChoice);
    });

    document.body.appendChild(banner);
    renderCopy();
    return banner;
  }

  function renderCopy() {
    const copy = COPY[language()];

    document.querySelectorAll("[data-analytics-copy]").forEach((element) => {
      const key = element.dataset.analyticsCopy;
      if (copy[key]) renderBrandSafeText(element, copy[key]);
    });

    const denied = document.querySelector('[data-analytics-choice="denied"]');
    const granted = document.querySelector('[data-analytics-choice="granted"]');
    if (denied) denied.textContent = copy.necessary;
    if (granted) granted.textContent = copy.allow;

    document.querySelectorAll(".analytics-preferences-link").forEach((element) => {
      element.textContent = copy.preferences;
    });
  }

  function showBanner() {
    buildBanner().hidden = false;
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  function setChoice(choice) {
    if (!VALID_CHOICES.has(choice)) return;
    saveChoice(choice);
    updateGoogleConsent(choice);
    if (choice === "denied") removeAnalyticsCookies();
    hideBanner();
  }

  function ensureFooterLegalContainer() {
    const footerBottom = document.querySelector(".site-footer .footer-bottom");
    if (!footerBottom) return null;

    footerBottom.classList.add("footer-bottom--with-legal");

    let container = footerBottom.querySelector(".footer-legal-links");
    if (!container) {
      container = document.createElement("div");
      container.className = "footer-legal-links";
      footerBottom.appendChild(container);
    }

    return container;
  }

  function insertPrivacyLink() {
    const normalizedPath = location.pathname.replace(/\/+$/, "") || "/";
    if (normalizedPath === POLICY_URL) return;

    let link = document.querySelector(".privacy-footer-link, footer a[href='/privacy']");
    if (!link) {
      link = document.createElement("a");
      link.className = "privacy-footer-link";
      link.href = POLICY_URL;
      link.dataset.analyticsCopy = "policy";
    }

    const legalContainer = ensureFooterLegalContainer();
    if (legalContainer) {
      legalContainer.appendChild(link);
      return;
    }

    document.querySelector(".seo-footer-links")?.appendChild(link);
  }

  function insertPreferencesLink() {
    let link = document.querySelector(".analytics-preferences-link");
    if (!link) {
      link = document.createElement("button");
      link.type = "button";
      link.className = "analytics-preferences-link";
      link.addEventListener("click", showBanner);
    }

    const legalContainer = ensureFooterLegalContainer();
    if (legalContainer) {
      legalContainer.appendChild(link);
      renderCopy();
      return;
    }

    const seoFooter = document.querySelector(".seo-footer-links");
    if (seoFooter) {
      seoFooter.appendChild(link);
      renderCopy();
    }
  }

  function init() {
    ensureStyles();
    buildBanner();
    insertPrivacyLink();
    insertPreferencesLink();
    renderCopy();

    if (currentChoice) {
      updateGoogleConsent(currentChoice);
      if (currentChoice === "denied") removeAnalyticsCookies();
    } else {
      showBanner();
    }

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
  }

  setGoogleConsentDefault();

  window.SDLIVE_ANALYTICS_CONSENT = {
    STORAGE_KEY,
    getChoice: () => currentChoice,
    showPreferences: showBanner,
    setChoice
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();