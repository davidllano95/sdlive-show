(() => {
  const POLICY_VERSION = "2026-08-19";
  const POLICY_URL = "/privacy";

  if (window.SDLIVE_PRIVACY_CONSENT) return;

  const COPY = {
    es: {
      consent:
        "Autorizo a Samuel David Llano / SD.Live a tratar los datos personales enviados aquí para responder esta solicitud, elaborar cotizaciones y gestionar la relación comercial o contractual relacionada. He leído la",
      policy: "Política de Tratamiento de Datos Personales",
      rights: "Puedo ejercer mis derechos de consulta, actualización, rectificación, supresión o revocatoria escribiendo a hello@sdlive.show.",
      footer: "Privacidad y tratamiento de datos"
    },
    en: {
      consent:
        "I authorize Samuel David Llano / SD.Live to process the personal data submitted here to respond to this request, prepare quotes and manage the related commercial or contractual relationship. I have read the",
      policy: "Privacy & Data Processing Policy",
      rights: "I may exercise my data access, update, correction, deletion or revocation rights by writing to hello@sdlive.show.",
      footer: "Privacy & data processing"
    }
  };

  const language = () =>
    document.documentElement.lang === "es" ? "es" : "en";

  function ensureStyles() {
    if (document.getElementById("sdlive-privacy-consent-styles")) return;

    const style = document.createElement("style");
    style.id = "sdlive-privacy-consent-styles";
    style.textContent = `
      .privacy-consent-block {
        display: grid;
        gap: 7px;
        width: 100%;
        margin: 4px 0 8px;
        color: var(--color-text-soft, #b8bdc9);
        font-size: 12px;
        line-height: 1.55;
      }
      .privacy-consent-label {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr);
        align-items: start;
        gap: 10px;
        cursor: pointer;
      }
      .privacy-consent-label input[type="checkbox"] {
        width: 17px;
        height: 17px;
        margin: 2px 0 0;
        accent-color: var(--color-accent, #A089E5);
        cursor: pointer;
      }
      .privacy-consent-copy a,
      .privacy-consent-rights a,
      .privacy-footer-link {
        color: inherit;
        text-decoration-color: currentColor;
        text-underline-offset: 3px;
      }
      .privacy-consent-copy a:hover,
      .privacy-consent-rights a:hover,
      .privacy-footer-link:hover {
        color: var(--color-accent, #A089E5);
      }
      .privacy-consent-rights {
        display: block;
        padding-left: 28px;
        opacity: .82;
      }
      .privacy-consent-label input[type="checkbox"]:focus-visible {
        outline: 2px solid var(--color-accent, #A089E5);
        outline-offset: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  function makeConsentBlock({ id, source }) {
    const block = document.createElement("div");
    block.className = "privacy-consent-block";
    block.dataset.privacySource = source;

    const label = document.createElement("label");
    label.className = "privacy-consent-label";
    label.htmlFor = id;

    const checkbox = document.createElement("input");
    checkbox.id = id;
    checkbox.type = "checkbox";
    checkbox.required = true;
    checkbox.autocomplete = "off";
    checkbox.dataset.privacyConsent = source;

    const copy = document.createElement("span");
    copy.className = "privacy-consent-copy";

    const consentText = document.createElement("span");
    consentText.dataset.privacyText = "consent";

    const spacer = document.createTextNode(" ");

    const policyLink = document.createElement("a");
    policyLink.href = POLICY_URL;
    policyLink.target = "_blank";
    policyLink.rel = "noopener";
    policyLink.dataset.privacyText = "policy";

    const period = document.createTextNode(".");

    copy.append(consentText, spacer, policyLink, period);
    label.append(checkbox, copy);

    const rights = document.createElement("small");
    rights.className = "privacy-consent-rights";
    rights.dataset.privacyText = "rights";

    block.append(label, rights);
    return block;
  }

  function insertConsentBlocks() {
    const rentalTurnstile = document.getElementById("rentalTurnstile");
    if (
      rentalTurnstile &&
      !document.getElementById("rentalPrivacyConsent")
    ) {
      rentalTurnstile.before(
        makeConsentBlock({
          id: "rentalPrivacyConsent",
          source: "rental"
        })
      );
    }

    const contactTurnstile = document.getElementById("contactTurnstile");
    if (
      contactTurnstile &&
      !document.getElementById("contactPrivacyConsent")
    ) {
      contactTurnstile.before(
        makeConsentBlock({
          id: "contactPrivacyConsent",
          source: "contact"
        })
      );
    }
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

  function renderCopy() {
    const lang = language();
    document.querySelectorAll("[data-privacy-text]").forEach((element) => {
      const key = element.dataset.privacyText;
      if (COPY[lang]?.[key]) {
        element.textContent = COPY[lang][key];
      }
    });
  }

  function consentForEndpoint(url) {
    if (url === "/api/contact") {
      return document.getElementById("contactPrivacyConsent");
    }
    if (url === "/api/rental") {
      return document.getElementById("rentalPrivacyConsent");
    }
    return null;
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

  function installFetchGuard() {
    if (window.__sdlivePrivacyFetchInstalled) return;
    window.__sdlivePrivacyFetchInstalled = true;

    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      const pathname = normalizeRequestUrl(input);
      const checkbox = consentForEndpoint(pathname);
      const method = String(init?.method || "GET").toUpperCase();

      if (
        checkbox &&
        method === "POST" &&
        typeof init?.body === "string"
      ) {
        try {
          const body = JSON.parse(init.body);
          body.privacyConsent = checkbox.checked === true;
          body.privacyPolicyVersion = POLICY_VERSION;
          init = {
            ...init,
            body: JSON.stringify(body)
          };
        } catch {
          // The server will reject malformed or unconsented requests.
        }
      }

      const response = await nativeFetch(input, init);

      if (checkbox && method === "POST" && response.ok) {
        checkbox.checked = false;
      }

      return response;
    };
  }

  function init() {
    ensureStyles();
    insertConsentBlocks();
    insertFooterLink();
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
  }

  installFetchGuard();

  window.SDLIVE_PRIVACY_CONSENT = {
    POLICY_VERSION,
    POLICY_URL
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
