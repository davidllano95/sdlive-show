(() => {
  if (window.SDLiveVisualSafeguards) return;

  const STYLESHEET_HREF = "/visual-safeguards.css?v=20260821-2";
  const ROOT_ATTR = "data-sdlive-vfx";
  const FEATURES = [
    { id: "surfaces", label: "Glass surfaces" },
    { id: "ambient", label: "Aurora ambience" },
    { id: "reveals", label: "Section reveal motion" },
    { id: "sheen", label: "Card highlights / sheen" },
    { id: "trusted-motion", label: "Trusted carousel motion" },
    { id: "supported-reveals", label: "Supported-brand reveal motion" },
    { id: "buttons", label: "CTA hover treatments" }
  ];

  const featureState = new Map(
    FEATURES.map((feature) => [feature.id, true])
  );

  function featureAttribute(id) {
    return `data-sdlive-vfx-${id}`;
  }

  function setAttributeIfNeeded(element, name, value) {
    if (element.getAttribute(name) === value) return false;
    element.setAttribute(name, value);
    return true;
  }

  function ensureStylesheet() {
    let link = document.querySelector("link[data-sdlive-visual-safeguards]");
    if (link) {
      if (String(link.getAttribute("href") || "") !== STYLESHEET_HREF) {
        link.href = STYLESHEET_HREF;
      }
      return link;
    }

    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET_HREF;
    link.setAttribute("data-sdlive-visual-safeguards", "true");
    document.head.appendChild(link);
    return link;
  }

  function applyState() {
    const root = document.documentElement;
    setAttributeIfNeeded(root, ROOT_ATTR, "on");

    FEATURES.forEach(({ id }) => {
      setAttributeIfNeeded(
        root,
        featureAttribute(id),
        featureState.get(id) === false ? "off" : "on"
      );
    });
  }

  function setFeature(id, enabled) {
    if (!featureState.has(id)) return false;
    featureState.set(id, Boolean(enabled));
    applyState();
    return true;
  }

  function enableAll() {
    FEATURES.forEach(({ id }) => featureState.set(id, true));
    ensureStylesheet();
    applyState();
    return status();
  }

  function safeStyle(element, pseudo = null) {
    if (!element) return null;
    try {
      return getComputedStyle(element, pseudo);
    } catch {
      return null;
    }
  }

  function hasMotion(style) {
    if (!style) return false;
    const durations = `${style.transitionDuration || ""} ${style.animationDuration || ""}`;
    return !durations.split(/[ ,]+/).every((value) => !value || value === "0s" || value === "0ms");
  }

  function diagnostics() {
    const reducedMotion = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );

    const stylesheet = document.querySelector("link[data-sdlive-visual-safeguards]");
    const root = document.documentElement;
    const checks = [];

    checks.push({
      id: "stylesheet",
      label: "Safeguard stylesheet",
      healthy: Boolean(stylesheet)
    });

    checks.push({
      id: "root",
      label: "Safeguard runtime",
      healthy: root.getAttribute(ROOT_ATTR) === "on"
    });

    const glass = document.querySelector(".glass");
    if (glass) {
      const style = safeStyle(glass);
      checks.push({
        id: "surfaces",
        label: "Glass surfaces",
        healthy: Boolean(
          style &&
          (style.backdropFilter !== "none" ||
            style.webkitBackdropFilter !== "none" ||
            style.backgroundColor !== "rgba(0, 0, 0, 0)")
        )
      });
    }

    const trustedCard = document.querySelector(".client-strip-card");
    if (trustedCard) {
      const sheen = safeStyle(trustedCard, "::after");
      checks.push({
        id: "trusted-sheen",
        label: "Trusted card sheen",
        healthy: Boolean(
          sheen &&
          sheen.content !== "none" &&
          sheen.backgroundImage !== "none"
        )
      });
    }

    const testimonialCard = document.querySelector(
      ".testimonials--public .testimonial-card"
    );
    if (testimonialCard) {
      const sheen = safeStyle(testimonialCard, "::after");
      const cardStyle = safeStyle(testimonialCard);
      checks.push({
        id: "testimonial-sheen",
        label: "Testimonials card sheen",
        healthy: Boolean(
          sheen &&
          sheen.content !== "none" &&
          sheen.backgroundImage !== "none" &&
          cardStyle?.overflow === "hidden"
        )
      });
    }

    const reveal = document.querySelector(".reveal");
    if (reveal) {
      const style = safeStyle(reveal);
      checks.push({
        id: "reveals",
        label: "Section reveal system",
        healthy: reducedMotion || hasMotion(style)
      });
    }

    const supportedReveal = document.querySelector(".supported-reveal");
    if (supportedReveal) {
      const style = safeStyle(supportedReveal);
      checks.push({
        id: "supported-reveals",
        label: "Supported-brand reveal system",
        healthy: reducedMotion || hasMotion(style)
      });
    }

    const marquee = document.querySelector(".trusted-marquee.is-ready .trusted-track");
    if (marquee) {
      const style = safeStyle(marquee);
      checks.push({
        id: "trusted-motion",
        label: "Trusted carousel animation",
        healthy: reducedMotion || Boolean(style && style.animationName !== "none")
      });
    }

    const aurora = document.querySelector(".aurora");
    if (aurora) {
      const style = safeStyle(aurora, "::before");
      checks.push({
        id: "ambient",
        label: "Aurora animation",
        healthy: reducedMotion || Boolean(style && style.animationName !== "none")
      });
    }

    return checks;
  }

  function status() {
    const checks = diagnostics();
    return {
      enabled: document.documentElement.getAttribute(ROOT_ATTR) === "on",
      features: FEATURES.map((feature) => ({
        ...feature,
        enabled: featureState.get(feature.id) !== false
      })),
      checks,
      healthy: checks.every((check) => check.healthy),
      healthyCount: checks.filter((check) => check.healthy).length,
      totalChecks: checks.length
    };
  }

  function repair() {
    ensureStylesheet();
    return enableAll();
  }

  ensureStylesheet();
  applyState();

  const observer = new MutationObserver(() => {
    ensureStylesheet();
    applyState();
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      ROOT_ATTR,
      ...FEATURES.map(({ id }) => featureAttribute(id))
    ]
  });

  observer.observe(document.head, {
    childList: true
  });

  window.SDLiveVisualSafeguards = {
    features: FEATURES.map((feature) => ({ ...feature })),
    setFeature,
    enableAll,
    repair,
    status
  };
})();
