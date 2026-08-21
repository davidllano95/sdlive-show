(() => {
  if (window.SDLIVE_AUTOMATIC_FAILSAFE) return;
  window.SDLIVE_AUTOMATIC_FAILSAFE = true;

  const iframe = document.getElementById("sitePreview");
  const publishButton = document.getElementById("publishContent");
  const toastStack = document.getElementById("toastStack");
  if (!iframe || !publishButton) return;

  const ORIGINAL_FETCH = window.fetch.bind(window);
  const STYLE_HREF = "/visual-safeguards.css?v=20260821-2";
  const FEATURE_IDS = [
    "surfaces",
    "ambient",
    "reveals",
    "sheen",
    "trusted-motion",
    "supported-reveals",
    "buttons"
  ];
  const PUBLISH_RE =
    /\/api\/admin\/content\/([a-z0-9-]+)\/publish(?:[/?#]|$)/i;

  const SECTION_SELECTORS = {
    hero: "#hero",
    trusted: ".trusted-wrap",
    testimonials: ".testimonials--public#testimonials",
    about: "#about",
    services: "#services",
    work: "#work",
    international: "#international"
  };

  let previewObserver = null;
  let previewCheckTimer = 0;
  let verificationFrame = null;
  let lastResult = null;

  injectStyles();
  const inlineStatus = mountStatus();
  bindPreviewObserver();
  iframe.addEventListener("load", () => {
    bindPreviewObserver();
    window.setTimeout(() => runEditingCheck(activeSection()), 180);
  });

  function injectStyles() {
    if (document.getElementById("sdlive-automatic-failsafe-style")) return;
    const style = document.createElement("style");
    style.id = "sdlive-automatic-failsafe-style";
    style.textContent = `
      .automatic-failsafe-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        margin-left: 4px;
        padding: 0 8px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 8px;
        background: rgba(255,255,255,.025);
        color: rgba(244,245,247,.54);
        font-size: 10px;
        line-height: 1.15;
        white-space: nowrap;
      }
      .automatic-failsafe-status::before {
        content: "";
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.28);
      }
      .automatic-failsafe-status.is-ready {
        color: rgba(197,239,211,.82);
      }
      .automatic-failsafe-status.is-ready::before {
        background: #58d68d;
      }
      .automatic-failsafe-status.is-working {
        color: rgba(244,245,247,.72);
      }
      .automatic-failsafe-status.is-working::before {
        background: rgba(160,137,229,.92);
      }
      .automatic-failsafe-status.is-fixed {
        color: rgba(222,206,255,.9);
      }
      .automatic-failsafe-status.is-fixed::before {
        background: rgba(160,137,229,.96);
      }
      .automatic-failsafe-status.is-failed {
        border-color: rgba(255,107,74,.36);
        color: rgba(255,172,152,.96);
      }
      .automatic-failsafe-status.is-failed::before {
        background: #ff6b4a;
      }
      .automatic-failsafe-status[title] {
        cursor: help;
      }
      .sdlive-failsafe-verifier {
        position: fixed !important;
        left: -20000px !important;
        top: 0 !important;
        width: 1280px !important;
        height: 900px !important;
        visibility: hidden !important;
        pointer-events: none !important;
        border: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function mountStatus() {
    let status = document.querySelector("[data-automatic-failsafe-status]");
    if (status) return status;

    status = document.createElement("span");
    status.className = "automatic-failsafe-status is-ready";
    status.setAttribute("data-automatic-failsafe-status", "true");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.textContent = "Failsafe ready";
    publishButton.insertAdjacentElement("afterend", status);
    return status;
  }

  function setStatus(kind, text, detail = "") {
    inlineStatus.className = `automatic-failsafe-status is-${kind}`;
    inlineStatus.textContent = text;
    inlineStatus.title = detail || "";
    lastResult = { kind, text, detail, at: Date.now() };
  }

  function showToast(title, detail = "", type = "success") {
    if (!toastStack) return;
    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;
    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);
    if (detail) toast.append(document.createTextNode(` ${detail}`));
    toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 5200);
  }

  function activeSection() {
    const section =
      document.querySelector(".section-link.is-active[data-section]")?.dataset
        .section || "";
    if (section === "trustedTitle") return "trusted";
    if (section === "travel") return "international";
    return section;
  }

  function sameOriginContext(frame = iframe) {
    try {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      return doc && win ? { doc, win } : null;
    } catch {
      return null;
    }
  }

  function safeStyle(win, element, pseudo = null) {
    if (!win || !element) return null;
    try {
      return win.getComputedStyle(element, pseudo);
    } catch {
      return null;
    }
  }

  function hasMotion(style) {
    if (!style) return false;
    const durations =
      `${style.transitionDuration || ""} ${style.animationDuration || ""}`
        .split(/[ ,]+/)
        .filter(Boolean);
    return durations.some((value) => value !== "0s" && value !== "0ms");
  }

  function check(id, label, healthy, repairable = false) {
    return { id, label, healthy: Boolean(healthy), repairable };
  }

  function inspectDocument(doc, win, section = "") {
    const reducedMotion = Boolean(
      win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );
    const root = doc.documentElement;
    const checks = [];

    checks.push(
      check(
        "safeguard-stylesheet",
        "Safeguard stylesheet",
        Boolean(doc.querySelector("link[data-sdlive-visual-safeguards]")),
        true
      )
    );
    checks.push(
      check(
        "safeguard-baseline",
        "Safeguard baseline",
        root.getAttribute("data-sdlive-vfx") === "on",
        true
      )
    );

    const glass = doc.querySelector(".glass");
    if (glass) {
      const style = safeStyle(win, glass);
      checks.push(
        check(
          "glass-surfaces",
          "Glass surfaces",
          style &&
            (style.backdropFilter !== "none" ||
              style.webkitBackdropFilter !== "none" ||
              style.backgroundColor !== "rgba(0, 0, 0, 0)")
        )
      );
    }

    const reveal = doc.querySelector(".reveal");
    if (reveal) {
      checks.push(
        check(
          "reveal-motion",
          "Reveal system",
          reducedMotion || hasMotion(safeStyle(win, reveal))
        )
      );
    }

    const trustedCard = doc.querySelector(".client-strip-card");
    if (trustedCard && (!section || section === "trusted")) {
      const sheen = safeStyle(win, trustedCard, "::after");
      checks.push(
        check(
          "trusted-sheen",
          "Trusted card sheen",
          sheen &&
            sheen.content !== "none" &&
            sheen.backgroundImage !== "none"
        )
      );
    }

    const testimonialCard = doc.querySelector(
      ".testimonials--public .testimonial-card"
    );
    if (testimonialCard && (!section || section === "testimonials")) {
      const sheen = safeStyle(win, testimonialCard, "::after");
      const cardStyle = safeStyle(win, testimonialCard);
      checks.push(
        check(
          "testimonial-sheen",
          "Testimonials sheen + clipping",
          sheen &&
            sheen.content !== "none" &&
            sheen.backgroundImage !== "none" &&
            cardStyle?.overflow === "hidden"
        )
      );
    }

    const marquee = doc.querySelector(
      ".trusted-marquee.is-ready .trusted-track"
    );
    if (marquee && (!section || section === "trusted")) {
      const style = safeStyle(win, marquee);
      checks.push(
        check(
          "trusted-motion",
          "Trusted carousel motion",
          reducedMotion || Boolean(style && style.animationName !== "none")
        )
      );
    }

    const supportedReveal = doc.querySelector(".supported-reveal");
    if (supportedReveal && (!section || section === "trusted")) {
      checks.push(
        check(
          "supported-reveal",
          "Supported-brand reveal",
          reducedMotion || hasMotion(safeStyle(win, supportedReveal))
        )
      );
    }

    const aurora = doc.querySelector(".aurora");
    if (aurora && (!section || section === "hero")) {
      const style = safeStyle(win, aurora, "::before");
      checks.push(
        check(
          "aurora",
          "Aurora ambience",
          reducedMotion || Boolean(style && style.animationName !== "none")
        )
      );
    }

    appendSectionContracts(checks, doc, section);

    return summarize(checks, section);
  }

  function appendSectionContracts(checks, doc, section) {
    if (!section) return;
    const rootSelector = SECTION_SELECTORS[section];
    if (!rootSelector) return;

    const sectionRoot = doc.querySelector(rootSelector);
    checks.push(
      check(
        `${section}-root`,
        `${sectionLabel(section)} section structure`,
        Boolean(sectionRoot)
      )
    );
    if (!sectionRoot) return;

    if (section === "services") {
      checks.push(
        check(
          "services-cards",
          "Services cards",
          sectionRoot.querySelectorAll(".service-card").length > 0
        ),
        check(
          "services-filters",
          "Services filters",
          sectionRoot.querySelectorAll(".filter-btn").length > 0
        )
      );
    } else if (section === "work") {
      checks.push(
        check(
          "work-cards",
          "Selected Work cards",
          sectionRoot.querySelectorAll(".work-card").length > 0
        )
      );
    } else if (section === "about") {
      checks.push(
        check(
          "about-layout",
          "About layout",
          Boolean(sectionRoot.querySelector(".about-grid"))
        ),
        check(
          "about-image",
          "About image",
          Boolean(sectionRoot.querySelector(".about-photo img"))
        )
      );
    } else if (section === "international") {
      checks.push(
        check(
          "international-content",
          "International content",
          Boolean(sectionRoot.querySelector("h2, h3")) &&
            Boolean(sectionRoot.querySelector("a, button"))
        )
      );
    } else if (section === "trusted") {
      checks.push(
        check(
          "trusted-cards",
          "Trusted cards",
          sectionRoot.querySelectorAll(".client-strip-card").length > 0
        )
      );
    } else if (section === "testimonials") {
      checks.push(
        check(
          "testimonial-cards",
          "Testimonials cards",
          sectionRoot.querySelectorAll(".testimonial-card").length > 0
        )
      );
    } else if (section === "hero") {
      checks.push(
        check(
          "hero-cta",
          "Hero CTA",
          Boolean(sectionRoot.querySelector("a.btn-primary, .btn-primary"))
        )
      );
    }
  }

  function summarize(checks, section) {
    const failures = checks.filter((item) => !item.healthy);
    return {
      section,
      checks,
      failures,
      healthy: failures.length === 0,
      healthyCount: checks.length - failures.length,
      totalChecks: checks.length
    };
  }

  function sectionLabel(section) {
    return (
      {
        hero: "Hero",
        trusted: "Trusted",
        testimonials: "Testimonials",
        about: "About",
        services: "Services",
        work: "Selected Work",
        international: "International"
      }[section] || section || "Global"
    );
  }

  function repairPreviewProtections() {
    const context = sameOriginContext();
    if (!context) return false;
    const { doc, win } = context;

    let link = doc.querySelector("link[data-sdlive-visual-safeguards]");
    if (!link) {
      link = doc.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-sdlive-visual-safeguards", "true");
      doc.head.appendChild(link);
    }
    if (link.getAttribute("href") !== STYLE_HREF) link.href = STYLE_HREF;

    const root = doc.documentElement;
    root.setAttribute("data-sdlive-vfx", "on");
    FEATURE_IDS.forEach((id) =>
      root.setAttribute(`data-sdlive-vfx-${id}`, "on")
    );

    try {
      win.SDLiveVisualSafeguards?.repair?.();
    } catch {}
    return true;
  }

  function previewCheck(section = activeSection()) {
    const context = sameOriginContext();
    if (!context) {
      return summarize(
        [check("preview", "Editor preview", false)],
        section
      );
    }
    return inspectDocument(context.doc, context.win, section);
  }

  function preflight(section) {
    const before = previewCheck(section);
    if (before.healthy) return { ...before, repaired: false };

    const repairableOnly = before.failures.every((item) => item.repairable);
    if (!repairableOnly) return { ...before, repaired: false };

    repairPreviewProtections();
    const after = previewCheck(section);
    return { ...after, repaired: after.healthy };
  }

  function scheduleEditingCheck(section = activeSection()) {
    window.clearTimeout(previewCheckTimer);
    previewCheckTimer = window.setTimeout(() => runEditingCheck(section), 180);
  }

  function runEditingCheck(section = activeSection()) {
    if (!section) return;
    const result = preflight(section);
    if (result.healthy && result.repaired) {
      setStatus(
        "fixed",
        "Failsafe ready · protection restored",
        `${result.healthyCount}/${result.totalChecks} contracts healthy.`
      );
    } else if (result.healthy) {
      setStatus(
        "ready",
        "Failsafe ready",
        `${result.healthyCount}/${result.totalChecks} contracts healthy.`
      );
    } else {
      setStatus(
        "failed",
        `Failsafe warning · ${result.failures.length} issue${result.failures.length === 1 ? "" : "s"}`,
        failureDetail(result)
      );
    }
    return result;
  }

  function bindPreviewObserver() {
    previewObserver?.disconnect();
    const context = sameOriginContext();
    if (!context?.doc?.body) return;

    previewObserver = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        if (mutation.type === "childList") return true;
        if (mutation.type !== "attributes") return false;
        return ["class", "style", "src", "hidden"].includes(
          mutation.attributeName
        );
      });
      if (relevant) scheduleEditingCheck(activeSection());
    });

    previewObserver.observe(context.doc.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "src", "hidden"]
    });
  }

  function requestUrl(input) {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.href;
    return input?.url || "";
  }

  function requestMethod(input, init) {
    return String(
      init?.method || (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
  }

  function publishSection(input, init) {
    if (requestMethod(input, init) !== "POST") return "";
    return requestUrl(input).match(PUBLISH_RE)?.[1] || "";
  }

  function blockedResponse(result) {
    const detail =
      `Failsafe blocked publish: ${failureDetail(result)}. ` +
      "The saved Draft was not promoted to Published.";
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Failsafe blocked publish.",
        detail
      }),
      {
        status: 409,
        headers: { "content-type": "application/json; charset=utf-8" }
      }
    );
  }

  async function failsafeFetch(input, init) {
    const section = publishSection(input, init);
    if (!section) return ORIGINAL_FETCH(input, init);

    setStatus("working", "Failsafe pre-publish check…");
    const gate = preflight(section);

    if (!gate.healthy) {
      setStatus(
        "failed",
        "Failsafe blocked publish",
        failureDetail(gate)
      );
      showToast(
        "Failsafe blocked publish.",
        `${failureDetail(gate)} Draft remains unpublished.`,
        "error"
      );
      return blockedResponse(gate);
    }

    if (gate.repaired) {
      setStatus(
        "fixed",
        "Failsafe fixed preview protection · publishing…",
        `${gate.healthyCount}/${gate.totalChecks} contracts healthy before publish.`
      );
    } else {
      setStatus(
        "working",
        "Failsafe passed · publishing…",
        `${gate.healthyCount}/${gate.totalChecks} contracts healthy before publish.`
      );
    }

    const response = await ORIGINAL_FETCH(input, init);
    if (!response.ok) {
      setStatus("failed", "Publish failed · Failsafe not run");
      return response;
    }

    setStatus("working", "Published · Failsafe verifying live…");
    const post = await verifyPublished(section);

    if (post.healthy) {
      const prefix = gate.repaired
        ? "Published · Failsafe fixed + verified"
        : "Published · Failsafe ✓ All running";
      setStatus(
        gate.repaired ? "fixed" : "ready",
        prefix,
        `${post.healthyCount}/${post.totalChecks} live contracts healthy.`
      );
      showToast(
        "Failsafe check · All running.",
        `${sectionLabel(section)} verified after publish (${post.healthyCount}/${post.totalChecks}).`
      );
    } else {
      setStatus(
        "failed",
        "Published · Failsafe failed",
        failureDetail(post)
      );
      showToast(
        "Failsafe verification failed.",
        `${failureDetail(post)} The publish completed, but the live visual contract needs attention.`,
        "error"
      );
    }

    return response;
  }

  async function verifyPublished(section) {
    cleanupVerifier();

    const frame = document.createElement("iframe");
    verificationFrame = frame;
    frame.className = "sdlive-failsafe-verifier";
    frame.tabIndex = -1;
    frame.setAttribute("aria-hidden", "true");
    frame.src = `/?failsafe_verify=${Date.now()}`;
    document.body.appendChild(frame);

    const loaded = await new Promise((resolve) => {
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      frame.addEventListener("load", () => done(true), { once: true });
      frame.addEventListener("error", () => done(false), { once: true });
      window.setTimeout(() => done(false), 4500);
    });

    if (!loaded) {
      cleanupVerifier();
      return summarize(
        [check("live-load", "Published Home verification", false)],
        section
      );
    }

    await new Promise((resolve) =>
      frame.contentWindow?.requestAnimationFrame?.(() =>
        frame.contentWindow?.requestAnimationFrame?.(resolve)
      ) || window.setTimeout(resolve, 80)
    );

    const context = sameOriginContext(frame);
    const result = context
      ? inspectDocument(context.doc, context.win, section)
      : summarize(
          [check("live-access", "Published Home verification", false)],
          section
        );

    cleanupVerifier();
    return result;
  }

  function cleanupVerifier() {
    if (!verificationFrame) return;
    verificationFrame.remove();
    verificationFrame = null;
  }

  function failureDetail(result) {
    if (!result?.failures?.length) return "Unknown visual-contract failure";
    return result.failures.map((item) => item.label).join(", ");
  }

  window.fetch = failsafeFetch;

  window.SDLiveAutomaticFailsafe = {
    status: () => ({ ...(lastResult || {}) }),
    check: (section = activeSection()) => runEditingCheck(section),
    preflight,
    verifyPublished
  };
})();