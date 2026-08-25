(() => {
  const TESTIMONIAL_COLLAPSE_CLASS = "testimonial-quote--collapsible";
  const TESTIMONIAL_EXPANDED_CLASS = "is-expanded";

  function currentLanguage() {
    return String(document.documentElement.lang || "en").toLowerCase().startsWith("es")
      ? "es"
      : "en";
  }

  function fixTurnstileContainerSemantics(root = document) {
    ["contactTurnstile", "rentalTurnstile"].forEach((id) => {
      root.getElementById?.(id)?.removeAttribute("aria-label");
    });
  }

  function fixConsentBannerSemantics(root = document) {
    const banner = root.querySelector?.(".analytics-consent-banner");
    if (!banner) return false;

    const title = banner.querySelector(".analytics-consent-title");
    const text = banner.querySelector(".analytics-consent-text");

    if (title && !title.id) title.id = "analyticsConsentTitle";
    if (text && !text.id) text.id = "analyticsConsentDescription";

    banner.setAttribute("role", "region");
    banner.removeAttribute("aria-modal");
    if (title?.id) banner.setAttribute("aria-labelledby", title.id);
    if (text?.id) banner.setAttribute("aria-describedby", text.id);
    return true;
  }

  function fixFooterHeadingSemantics(root = document) {
    root.querySelectorAll?.(".site-footer .footer-col h4").forEach((heading) => {
      const label = document.createElement("p");
      for (const { name, value } of Array.from(heading.attributes)) {
        label.setAttribute(name, value);
      }
      label.classList.add("footer-heading");
      while (heading.firstChild) label.appendChild(heading.firstChild);
      heading.replaceWith(label);
    });
  }

  function testimonialButtonLabel(expanded) {
    const lang = currentLanguage();
    if (lang === "es") return expanded ? "Leer menos" : "Leer más";
    return expanded ? "Read less" : "Read more";
  }

  function ensureTestimonialDisclosure(card, index) {
    const quote = card.querySelector(":scope > p");
    if (!quote) return;

    if (!quote.id) quote.id = `testimonialQuote${index + 1}`;

    let button = card.querySelector(":scope > .testimonial-disclosure");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "testimonial-disclosure";
      button.setAttribute("aria-controls", quote.id);
      quote.insertAdjacentElement("afterend", button);

      button.addEventListener("click", () => {
        const expanded = quote.classList.toggle(TESTIMONIAL_EXPANDED_CLASS);
        button.setAttribute("aria-expanded", String(expanded));
        button.textContent = testimonialButtonLabel(expanded);
      });
    }

    quote.classList.remove(TESTIMONIAL_EXPANDED_CLASS, TESTIMONIAL_COLLAPSE_CLASS);
    button.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.textContent = testimonialButtonLabel(false);

    quote.classList.add(TESTIMONIAL_COLLAPSE_CLASS);
    const overflows = quote.scrollHeight > quote.clientHeight + 2;

    if (!overflows) {
      quote.classList.remove(TESTIMONIAL_COLLAPSE_CLASS);
      return;
    }

    button.hidden = false;
  }

  function syncTestimonials() {
    document.querySelectorAll(".testimonials--public .testimonial-card").forEach(
      (card, index) => ensureTestimonialDisclosure(card, index)
    );
  }

  function rentalHasSelection() {
    const quantityIds = [
      "quoteWing",
      "quoteFlow8",
      "quoteLv1",
      "quoteDl32",
      "quoteStageGrid",
      "quoteHandhelds",
      "quoteHeadsets",
      "quotePa"
    ];
    const binaryItemIds = ["quoteLabeler", "quoteVideoServer", "quoteMonitor"];
    const serviceIds = ["quoteEngineering", "quoteStreaming", "quoteDelivery"];

    const hasQuantity = quantityIds.some((id) => {
      const value = Number(document.getElementById(id)?.value || 0);
      return Number.isFinite(value) && value > 0;
    });
    const hasBinaryItem = binaryItemIds.some(
      (id) => document.getElementById(id)?.value === "1"
    );
    const hasService = serviceIds.some(
      (id) => document.getElementById(id)?.value === "yes"
    );

    return hasQuantity || hasBinaryItem || hasService;
  }

  function installRentalSelectionGuard() {
    const requestButton = document.getElementById("quoteRequestBtn");
    const warning = document.getElementById("quoteSummaryWarning");
    if (!requestButton || requestButton.dataset.selectionGuard === "true") return;

    requestButton.dataset.selectionGuard = "true";
    if (warning) warning.setAttribute("role", "status");

    requestButton.addEventListener("click", (event) => {
      if (rentalHasSelection()) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (warning) {
        warning.hidden = false;
        warning.textContent = currentLanguage() === "es"
          ? "Selecciona al menos un equipo o servicio antes de enviar la solicitud."
          : "Select at least one equipment item or service before sending the request.";
        requestButton.setAttribute("aria-describedby", warning.id);
      }

      window.__openRentalCart?.();
    }, true);
  }

  function init() {
    fixTurnstileContainerSemantics();
    fixFooterHeadingSemantics();
    fixConsentBannerSemantics();
    syncTestimonials();
    installRentalSelectionGuard();

    const langObserver = new MutationObserver(() => {
      window.requestAnimationFrame(syncTestimonials);
    });
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });

    if (!document.querySelector(".analytics-consent-banner")) {
      const consentObserver = new MutationObserver(() => {
        if (fixConsentBannerSemantics()) consentObserver.disconnect();
      });
      consentObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
