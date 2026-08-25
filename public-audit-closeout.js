(() => {
  const TESTIMONIAL_COLLAPSE_CLASS = "testimonial-quote--collapsible";
  const TESTIMONIAL_EXPANDED_CLASS = "is-expanded";
  const TESTIMONIAL_SHARED_EXPANDED_CLASS = "testimonial-quote--shared-expanded";
  const TESTIMONIAL_GROUP_EXPANDED_CLASS = "has-synced-testimonial-expansion";
  const TESTIMONIAL_OVERFLOW_TOLERANCE = 2;
  let activeTestimonialQuoteId = null;
  let testimonialResizeFrame = 0;

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

  function testimonialCards() {
    return Array.from(document.querySelectorAll(".testimonials--public .testimonial-card"));
  }

  function testimonialSection() {
    return document.querySelector(".testimonials--public");
  }

  function setTestimonialExpandedLayout(expanded) {
    testimonialSection()?.classList.toggle(TESTIMONIAL_GROUP_EXPANDED_CLASS, expanded);
  }

  function preserveViewportAfterCollapse(anchorButton, anchorTop) {
    if (!anchorButton?.isConnected || !Number.isFinite(anchorTop)) return;

    window.requestAnimationFrame(() => {
      if (!anchorButton.isConnected) return;
      const nextTop = anchorButton.getBoundingClientRect().top;
      const delta = nextTop - anchorTop;
      if (Math.abs(delta) > 1) window.scrollBy(0, delta);
    });
  }

  function testimonialQuoteNeedsDisclosure(quote) {
    if (!quote) return false;

    const hadCollapsed = quote.classList.contains(TESTIMONIAL_COLLAPSE_CLASS);
    const hadExpanded = quote.classList.contains(TESTIMONIAL_EXPANDED_CLASS);
    const hadSharedExpanded = quote.classList.contains(TESTIMONIAL_SHARED_EXPANDED_CLASS);
    const previousMaxHeight = quote.style.maxHeight;

    quote.classList.remove(TESTIMONIAL_EXPANDED_CLASS, TESTIMONIAL_SHARED_EXPANDED_CLASS);
    quote.style.removeProperty("max-height");
    quote.classList.add(TESTIMONIAL_COLLAPSE_CLASS);

    const overflows = quote.scrollHeight > quote.clientHeight + TESTIMONIAL_OVERFLOW_TOLERANCE;

    quote.classList.toggle(TESTIMONIAL_COLLAPSE_CLASS, hadCollapsed);
    quote.classList.toggle(TESTIMONIAL_EXPANDED_CLASS, hadExpanded);
    quote.classList.toggle(TESTIMONIAL_SHARED_EXPANDED_CLASS, hadSharedExpanded);
    if (previousMaxHeight) quote.style.maxHeight = previousMaxHeight;
    else quote.style.removeProperty("max-height");

    return overflows;
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
        if (activeTestimonialQuoteId === quote.id) {
          collapseTestimonialGroup(button);
          return;
        }

        expandTestimonialGroup(quote);
      });
    }
  }

  function collapseTestimonialGroup(anchorButton = null) {
    const anchorTop = anchorButton?.getBoundingClientRect?.().top;
    activeTestimonialQuoteId = null;
    setTestimonialExpandedLayout(false);

    testimonialCards().forEach((card) => {
      const quote = card.querySelector(":scope > p");
      const button = card.querySelector(":scope > .testimonial-disclosure");
      if (!quote || !button) return;

      quote.classList.remove(TESTIMONIAL_EXPANDED_CLASS, TESTIMONIAL_SHARED_EXPANDED_CLASS);
      quote.style.removeProperty("max-height");
      quote.classList.add(TESTIMONIAL_COLLAPSE_CLASS);

      const overflows = quote.scrollHeight > quote.clientHeight + TESTIMONIAL_OVERFLOW_TOLERANCE;
      if (!overflows) quote.classList.remove(TESTIMONIAL_COLLAPSE_CLASS);

      button.hidden = !overflows;
      button.setAttribute("aria-expanded", "false");
      button.textContent = testimonialButtonLabel(false);
    });

    preserveViewportAfterCollapse(anchorButton, anchorTop);
  }

  function expandTestimonialGroup(activeQuote) {
    if (!activeQuote?.id) return;

    const targetHeight = activeQuote.scrollHeight;
    activeTestimonialQuoteId = activeQuote.id;
    setTestimonialExpandedLayout(true);

    testimonialCards().forEach((card) => {
      const quote = card.querySelector(":scope > p");
      const button = card.querySelector(":scope > .testimonial-disclosure");
      if (!quote || !button) return;

      const fullHeight = quote.scrollHeight;
      const visibleHeight = Math.min(fullHeight, targetHeight);
      const isActive = quote.id === activeTestimonialQuoteId;
      const hasMoreBeyondTarget = fullHeight > targetHeight + TESTIMONIAL_OVERFLOW_TOLERANCE;

      quote.classList.remove(TESTIMONIAL_COLLAPSE_CLASS, TESTIMONIAL_EXPANDED_CLASS);
      quote.classList.add(TESTIMONIAL_SHARED_EXPANDED_CLASS);
      quote.style.maxHeight = `${visibleHeight}px`;
      if (isActive) quote.classList.add(TESTIMONIAL_EXPANDED_CLASS);

      button.hidden = !isActive && !hasMoreBeyondTarget;
      button.setAttribute("aria-expanded", String(isActive));
      button.textContent = testimonialButtonLabel(isActive);
    });
  }

  function syncTestimonials() {
    testimonialCards().forEach((card, index) => ensureTestimonialDisclosure(card, index));
    collapseTestimonialGroup();
  }

  function refreshTestimonialsForLanguageChange() {
    const preservedQuoteId = activeTestimonialQuoteId;
    testimonialCards().forEach((card, index) => ensureTestimonialDisclosure(card, index));

    if (!preservedQuoteId) {
      collapseTestimonialGroup();
      return;
    }

    const activeQuote = document.getElementById(preservedQuoteId);
    if (!activeQuote || !testimonialQuoteNeedsDisclosure(activeQuote)) {
      collapseTestimonialGroup();
      return;
    }

    expandTestimonialGroup(activeQuote);
  }

  function refreshExpandedTestimonials() {
    if (!activeTestimonialQuoteId) return;
    const activeQuote = document.getElementById(activeTestimonialQuoteId);
    if (!activeQuote) {
      collapseTestimonialGroup();
      return;
    }
    expandTestimonialGroup(activeQuote);
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
      if (rentalHasSelection()) {
        requestButton.removeAttribute("aria-describedby");
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      // openCart() re-renders the Rental summary, so show the validation message after it.
      window.__openRentalCart?.();

      if (warning) {
        warning.hidden = false;
        warning.textContent = currentLanguage() === "es"
          ? "Selecciona al menos un equipo o servicio antes de enviar la solicitud."
          : "Select at least one equipment item or service before sending the request.";
        requestButton.setAttribute("aria-describedby", warning.id);
      }
    }, true);
  }

  function init() {
    fixTurnstileContainerSemantics();
    fixFooterHeadingSemantics();
    fixConsentBannerSemantics();
    syncTestimonials();
    installRentalSelectionGuard();

    const langObserver = new MutationObserver(() => {
      // Run synchronously in the observer callback. The site's language runtime already
      // schedules a final scroll-anchor correction in the next animation frame; waiting
      // another frame here would make Testimonials resize after that correction and cause
      // the visible jump that this audit is eliminating.
      refreshTestimonialsForLanguageChange();
    });
    langObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"]
    });

    window.addEventListener("resize", () => {
      if (!activeTestimonialQuoteId) return;
      window.cancelAnimationFrame(testimonialResizeFrame);
      testimonialResizeFrame = window.requestAnimationFrame(refreshExpandedTestimonials);
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
