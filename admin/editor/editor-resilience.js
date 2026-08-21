(() => {
  if (window.SDLIVE_EDITOR_RESILIENCE) return;
  window.SDLIVE_EDITOR_RESILIENCE = true;

  const iframe = document.getElementById("sitePreview");
  const editorBody = document.getElementById("editorBody");
  const inspector = document.getElementById("contentInspector");
  const toggleInspectorButton = document.getElementById("toggleInspector");
  const selectModeButton = document.getElementById("toggleSelectMode");
  const selectionName = document.getElementById("selectionName");
  const selectionSelector = document.getElementById("selectionSelector");
  const selectionHint = document.getElementById("selectionHint");

  if (!iframe || !editorBody) return;

  const SECTION_ALIASES = {
    trusted: "trustedTitle"
  };

  let boundPreviewWindow = null;
  let highlightTimer = 0;

  injectStyles();
  bindPreviewBridge();

  iframe.addEventListener("load", () => {
    boundPreviewWindow = null;
    window.setTimeout(bindPreviewBridge, 80);
  });

  function normalize(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function selectModeIsActive() {
    if (selectModeButton?.getAttribute("aria-pressed") === "false") return false;
    try {
      return iframe.contentDocument?.documentElement?.dataset.sdliveAdminSelect === "true";
    } catch {
      return false;
    }
  }

  function ensureInspectorVisible() {
    if (
      inspector?.getAttribute("aria-hidden") === "true" &&
      toggleInspectorButton
    ) {
      toggleInspectorButton.click();
    }
  }

  function sectionButton(section) {
    const key = SECTION_ALIASES[section] || section;
    return document.querySelector(`.section-link[data-section="${CSS.escape(key)}"]`)
      || document.querySelector(`[data-section="${CSS.escape(key)}"]`);
  }

  function closestKey(target, attribute) {
    const node = target?.closest?.(`[${attribute}]`);
    return node?.getAttribute(attribute) || "";
  }

  function descriptorForHero(target) {
    if (!target?.closest?.("#hero")) return null;
    if (target.closest("#hero .hero-actions")) return { section: "hero", summary: "Calls to action", label: "Hero actions" };
    if (target.closest("#hero .hero-lede")) return { section: "hero", summary: "Description", label: "Hero description" };
    if (target.closest("#hero .stat-card")) return { section: "hero", summary: "Capability cards", label: "Hero capability card" };
    return { section: "hero", summary: "Headline", label: "Hero headline" };
  }

  function descriptorForAbout(target) {
    const section = target?.closest?.("#about");
    if (!section) return null;
    const explicit = closestKey(target, "data-cms-editor-key");
    if (explicit) return { section: "about", key: explicit, label: "About" };
    if (target.closest(".about-photo")) return { section: "about", key: "about:image", label: "About image" };
    if (target.closest(".about-copy .eyebrow")) return { section: "about", key: "about:eyebrow", label: "About eyebrow" };
    if (target.closest(".about-copy h2")) return { section: "about", key: "about:title", label: "About title" };
    const paragraph = target.closest(".about-copy p");
    if (paragraph) {
      const index = Array.from(section.querySelectorAll(".about-copy p")).indexOf(paragraph);
      if (index >= 0) return { section: "about", key: `about:paragraph:${index}`, label: `About paragraph ${index + 1}` };
    }
    return { section: "about", summary: "About heading", label: "About" };
  }

  function descriptorForServices(target) {
    const section = target?.closest?.("#services");
    if (!section) return null;
    const explicit = closestKey(target, "data-cms-editor-key");
    if (explicit) return { section: "services", key: explicit, label: "Services" };
    if (target.closest(".filter-btn")) return { section: "services", summary: "Filter labels", label: "Service filter" };
    if (target.closest(".section-detail-link")) return { section: "services", summary: "Section detail link", label: "Services detail link" };
    const card = target.closest(".service-card");
    if (card) {
      const cards = Array.from(section.querySelectorAll(".service-card"));
      return {
        section: "services",
        prefix: "service:",
        index: cards.indexOf(card),
        label: String(card.querySelector("h3")?.textContent || "Service").trim()
      };
    }
    if (target.closest(".section-head")) return { section: "services", summary: "Services heading", label: "Services heading" };
    return { section: "services", summary: "Services heading", label: "Services" };
  }

  function descriptorForWork(target) {
    const section = target?.closest?.("#work");
    if (!section) return null;
    const explicit = closestKey(target, "data-cms-editor-key");
    if (explicit) return { section: "work", key: explicit, label: "Selected Work" };
    const card = target.closest(".work-card");
    if (card) {
      const cards = Array.from(section.querySelectorAll(".work-card"));
      return {
        section: "work",
        prefix: "work:",
        index: cards.indexOf(card),
        label: String(card.querySelector("h3")?.textContent || "Work item").trim()
      };
    }
    if (target.closest(".section-head")) return { section: "work", summary: "Selected Work heading", label: "Selected Work heading" };
    return { section: "work", summary: "Selected Work heading", label: "Selected Work" };
  }

  function descriptorForInternational(target) {
    const section = target?.closest?.("#international");
    if (!section) return null;
    const explicit = closestKey(target, "data-cms-editor-key");
    if (explicit) return { section: "international", key: explicit, label: "International" };
    if (target.closest(".eyebrow")) return { section: "international", key: "international:eyebrow", label: "International eyebrow" };
    if (target.closest("h2")) return { section: "international", key: "international:title", label: "International title" };
    if (target.closest(".btn")) return { section: "international", key: "international:cta", label: "International CTA" };
    if (target.closest("p")) return { section: "international", key: "international:body", label: "International body" };
    return { section: "international", summary: "International productions", label: "International" };
  }

  function descriptorForTrusted(target) {
    const wrap = target?.closest?.(".trusted-wrap");
    if (!wrap) return null;
    const key = closestKey(target, "data-trusted-editor-key") || "section:title";
    return { section: "trustedTitle", trustedKey: key, label: "Trusted By" };
  }

  function descriptorForTestimonials(target) {
    const section = target?.closest?.("#testimonials");
    if (!section) return null;
    const card = target.closest(".testimonial-card");
    if (card) {
      const cards = Array.from(section.querySelectorAll(".testimonial-card"));
      const id = card.dataset.testimonialId || "";
      const name = String(card.querySelector(".testimonial-name")?.textContent || "").trim();
      return {
        section: "testimonials",
        testimonialId: id,
        index: cards.indexOf(card),
        label: name || "Testimonial"
      };
    }
    return { section: "testimonials", summary: "Section heading", label: "Testimonials heading" };
  }

  function descriptorForRental(target) {
    const section = target?.closest?.("#rental");
    if (!section) return null;
    const explicit = closestKey(target, "data-cms-editor-key");
    if (explicit) return { section: "rental", key: explicit, label: "Rental" };
    const item = target.closest("[data-rental-item]");
    if (item?.dataset.rentalItem) {
      return { section: "rental", key: `rental:item:${item.dataset.rentalItem}`, label: item.dataset.rentalItem };
    }
    const preset = target.closest("[data-rental-preset]");
    if (preset?.dataset.rentalPreset) {
      return { section: "rental", key: `rental:preset:${preset.dataset.rentalPreset}`, label: preset.dataset.rentalPreset };
    }
    if (target.closest("#mixingEquipmentTitle, #stageRackEquipmentTitle, #wirelessEquipmentTitle, #paEquipmentTitle, #productionToolsTitle")) {
      return { section: "rental", summary: "Equipment group headings", label: "Rental equipment group heading" };
    }
    if (target.closest(".rental-subhead")) return { section: "rental", key: "rental:recommended", label: "Recommended configurations" };
    if (target.closest(".rental-cart-hint")) return { section: "rental", key: "rental:cartHint", label: "Rental cart guidance" };
    if (target.closest(".rental-sourcing")) return { section: "rental", key: "rental:sourcing", label: "Rental sourcing" };
    return { section: "rental", key: "rental:heading", label: "Rental heading" };
  }

  function descriptorForContact(target) {
    const section = target?.closest?.("#contact");
    if (!section && !target?.closest?.("footer")) return null;
    if (target.closest("#contactForm")) return { section: "contact", key: "contact:form", label: "Contact form" };
    return { section: "contact", key: "contact:copy", label: "Contact copy" };
  }

  function descriptorFromTarget(target) {
    if (!target?.closest) return null;
    return descriptorForTrusted(target)
      || descriptorForHero(target)
      || descriptorForAbout(target)
      || descriptorForServices(target)
      || descriptorForInternational(target)
      || descriptorForWork(target)
      || descriptorForTestimonials(target)
      || descriptorForRental(target)
      || descriptorForContact(target);
  }

  function marketButton(value) {
    return document.querySelector(`[data-market="${CSS.escape(value)}"]`);
  }

  function activateSection(section, done) {
    const activate = () => {
      const button = sectionButton(section);
      if (!button) {
        done?.();
        return;
      }
      if (!button.classList.contains("is-active")) button.click();
      done?.();
    };

    if (section === "rental") {
      const button = sectionButton(section);
      if (button?.disabled) {
        const col = marketButton("colombia");
        if (col) col.click();
        window.setTimeout(activate, 60);
        return;
      }
    }

    activate();
  }

  function openEditorAncestors(target) {
    let node = target;
    while (node && node !== editorBody) {
      if (node.matches?.("details.editor-section")) node.open = true;
      node = node.parentElement;
    }
  }

  function summaryTarget(label) {
    const wanted = normalize(label);
    if (!wanted) return null;
    return Array.from(editorBody.querySelectorAll("details.editor-section")).find((details) => {
      return normalize(details.querySelector(":scope > summary")?.textContent) === wanted;
    }) || null;
  }

  function summaryFallbackForKey(key) {
    if (!key) return "";
    if (key === "about:image") return "Portrait / production photo";
    if (key === "about:eyebrow" || key === "about:title") return "About heading";
    if (key === "services:eyebrow" || key === "services:title") return "Services heading";
    if (key === "work:eyebrow" || key === "work:title" || key === "work:intro") return "Selected Work heading";
    if (key.startsWith("international:")) return "International productions";
    return "";
  }

  function exactEditorTarget(descriptor) {
    const selectors = [];

    if (descriptor.key) {
      selectors.push(
        `[data-core-editor-key="${CSS.escape(descriptor.key)}"]`,
        `[data-presentation-editor-key="${CSS.escape(descriptor.key)}"]`
      );
    }

    if (descriptor.trustedKey) {
      selectors.push(`[data-trusted-editor-key="${CSS.escape(descriptor.trustedKey)}"]`);
    }

    if (descriptor.testimonialId) {
      selectors.push(`[data-testimonial-editor-id="${CSS.escape(descriptor.testimonialId)}"]`);
    }

    for (const selector of selectors) {
      const found = editorBody.querySelector(selector);
      if (found) return found;
    }

    if (descriptor.prefix) {
      const candidates = Array.from(editorBody.querySelectorAll(`[data-core-editor-key^="${CSS.escape(descriptor.prefix)}"]`));
      const byLabel = candidates.find((candidate) => normalize(candidate.textContent).includes(normalize(descriptor.label)));
      if (byLabel) return byLabel;
      if (descriptor.index >= 0 && candidates[descriptor.index]) return candidates[descriptor.index];
    }

    if (descriptor.section === "testimonials") {
      const candidates = Array.from(editorBody.querySelectorAll("[data-testimonial-editor-id]"));
      const byLabel = candidates.find((candidate) => normalize(candidate.textContent).includes(normalize(descriptor.label)));
      if (byLabel) return byLabel;
      if (descriptor.index >= 0 && candidates[descriptor.index]) return candidates[descriptor.index];
    }

    const summary = descriptor.summary || summaryFallbackForKey(descriptor.key);
    if (summary) return summaryTarget(summary);
    return null;
  }

  function highlightEditorTarget(target) {
    if (!target) return false;
    ensureInspectorVisible();
    openEditorAncestors(target);

    editorBody.querySelectorAll(".sdlive-global-select-target").forEach((item) => {
      item.classList.remove("sdlive-global-select-target");
    });

    target.classList.add("sdlive-global-select-target");
    const anchor = target.querySelector?.(":scope > summary") || target;
    anchor.scrollIntoView({ behavior: "smooth", block: "center" });

    window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
      target.classList.remove("sdlive-global-select-target");
    }, 2200);
    return true;
  }

  function updateSelectionMeta(descriptor) {
    if (selectionName) selectionName.textContent = descriptor.label || descriptor.section;
    if (selectionSelector) {
      selectionSelector.textContent = descriptor.key
        ? `[data-cms-editor-key="${descriptor.key}"]`
        : descriptor.testimonialId
          ? `[data-testimonial-id="${descriptor.testimonialId}"]`
          : descriptor.trustedKey
            ? `[data-trusted-editor-key="${descriptor.trustedKey}"]`
            : descriptor.section;
    }
    if (selectionHint) {
      selectionHint.textContent = "Global Select routed to the owning CMS section and the closest exact editor item.";
    }
  }

  function focusWhenReady(descriptor) {
    const deadline = performance.now() + 3500;

    const locate = () => {
      const target = exactEditorTarget(descriptor);
      if (target) {
        highlightEditorTarget(target);
        updateSelectionMeta(descriptor);
        return;
      }
      if (performance.now() < deadline) window.setTimeout(locate, 50);
    };

    locate();
  }

  function routeDescriptor(descriptor) {
    if (!descriptor?.section) return;
    ensureInspectorVisible();
    activateSection(descriptor.section, () => focusWhenReady(descriptor));
  }

  function handlePreviewClick(event) {
    if (!selectModeIsActive()) return;
    const descriptor = descriptorFromTarget(event.target);
    if (!descriptor) return;

    // This bridge listens at iframe Window capture, one level before the base
    // document selector. It never replaces section-specific editors; it only
    // routes Select to the existing owner and lets the base selector keep its
    // preview outline behavior.
    event.preventDefault();
    window.setTimeout(() => routeDescriptor(descriptor), 0);
  }

  function bindPreviewBridge() {
    let previewWindow;
    try {
      previewWindow = iframe.contentWindow;
    } catch {
      return false;
    }

    if (!previewWindow || previewWindow === boundPreviewWindow) return false;
    boundPreviewWindow = previewWindow;
    previewWindow.addEventListener("click", handlePreviewClick, true);
    return true;
  }

  function injectStyles() {
    if (document.getElementById("sdlive-global-select-styles")) return;
    const style = document.createElement("style");
    style.id = "sdlive-global-select-styles";
    style.textContent = `
      #editorBody .sdlive-global-select-target {
        outline: 1px solid rgba(160,137,229,.9);
        outline-offset: 3px;
        border-radius: 8px;
        background-color: rgba(160,137,229,.07);
      }
    `;
    document.head.appendChild(style);
  }
})();