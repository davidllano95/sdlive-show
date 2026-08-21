(() => {
  if (window.SDLIVE_VISUAL_SAFEGUARDS_EDITOR) return;
  window.SDLIVE_VISUAL_SAFEGUARDS_EDITOR = true;

  const iframe = document.getElementById("sitePreview");
  const toolbar = document.querySelector(".toolbar");
  const refreshButton = document.getElementById("refreshPreview");

  if (!iframe || !toolbar) return;

  const STYLE_HREF = "/visual-safeguards.css?v=20260821-2";
  const SCRIPT_SRC = "/visual-safeguards.js?v=20260821-2";
  const FEATURES = [
    { id: "surfaces", label: "Glass surfaces" },
    { id: "ambient", label: "Aurora ambience" },
    { id: "reveals", label: "Section reveal motion" },
    { id: "sheen", label: "Card highlights / sheen" },
    { id: "trusted-motion", label: "Trusted carousel motion" },
    { id: "supported-reveals", label: "Supported-brand reveal motion" },
    { id: "buttons", label: "CTA hover treatments" }
  ];

  let panel = null;
  let button = null;
  let checkRun = 0;

  function injectStyles() {
    if (document.getElementById("visual-safeguards-editor-styles")) return;

    const style = document.createElement("style");
    style.id = "visual-safeguards-editor-styles";
    style.textContent = `
      .visual-guards-panel {
        position: fixed;
        top: 78px;
        right: 20px;
        z-index: 7000;
        width: min(390px, calc(100vw - 40px));
        max-height: calc(100vh - 98px);
        overflow: auto;
        padding: 16px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        background: rgba(10,11,17,.96);
        box-shadow: 0 24px 70px rgba(0,0,0,.48);
        backdrop-filter: blur(18px);
      }
      .visual-guards-panel[hidden] { display: none; }
      .visual-guards-head,
      .visual-guards-row,
      .visual-guards-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .visual-guards-head { margin-bottom: 8px; }
      .visual-guards-head h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 650;
      }
      .visual-guards-summary,
      .visual-guards-note {
        margin: 0;
        color: rgba(244,245,247,.58);
        font-size: 11px;
        line-height: 1.45;
      }
      .visual-guards-summary { margin-bottom: 14px; }
      .visual-guards-section-title {
        margin: 14px 0 7px;
        color: rgba(244,245,247,.48);
        font-size: 10px;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      .visual-guards-list {
        display: grid;
        gap: 6px;
      }
      .visual-guards-row {
        min-height: 38px;
        padding: 8px 9px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 9px;
        background: rgba(255,255,255,.025);
      }
      .visual-guards-label {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        font-size: 11px;
      }
      .visual-guards-dot {
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.28);
      }
      .visual-guards-dot.is-healthy { background: #58d68d; }
      .visual-guards-dot.is-broken { background: #ff6b4a; }
      .visual-guards-toggle,
      .visual-guards-action,
      .visual-guards-close {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 7px;
        background: rgba(255,255,255,.05);
        color: inherit;
        font: inherit;
        font-size: 10px;
        cursor: pointer;
      }
      .visual-guards-toggle,
      .visual-guards-action { padding: 6px 8px; }
      .visual-guards-toggle.is-on {
        border-color: rgba(160,137,229,.5);
        background: rgba(160,137,229,.14);
      }
      .visual-guards-close {
        width: 28px;
        height: 28px;
        padding: 0;
      }
      .visual-guards-actions {
        margin-top: 14px;
        justify-content: flex-start;
        flex-wrap: wrap;
      }
      .visual-guards-action.is-primary {
        border-color: rgba(160,137,229,.52);
        background: rgba(160,137,229,.14);
      }
      .visual-guards-action.is-running {
        border-color: rgba(160,137,229,.72);
        background: rgba(160,137,229,.2);
      }
      .visual-guards-note { margin-top: 12px; }
      .tool-button[data-visual-safeguards] .visual-guards-badge {
        min-width: 28px;
        margin-left: 3px;
        padding: 2px 5px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        font-size: 9px;
        text-align: center;
      }
      .tool-button[data-visual-safeguards].has-warning {
        border-color: rgba(255,107,74,.52);
      }
    `;
    document.head.appendChild(style);
  }

  function previewContext() {
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      return doc && win ? { doc, win } : null;
    } catch {
      return null;
    }
  }

  function previewRuntime() {
    try {
      return iframe.contentWindow?.SDLiveVisualSafeguards || null;
    } catch {
      return null;
    }
  }

  function featureAttribute(id) {
    return `data-sdlive-vfx-${id}`;
  }

  function ensurePreviewStylesheet() {
    const context = previewContext();
    if (!context?.doc?.head) return false;

    let link = context.doc.querySelector("link[data-sdlive-visual-safeguards]");
    if (!link) {
      link = context.doc.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-sdlive-visual-safeguards", "true");
      context.doc.head.appendChild(link);
    }

    if (link.getAttribute("href") !== STYLE_HREF) {
      link.href = STYLE_HREF;
    }

    return true;
  }

  function ensurePreviewBaseline({ restoreAll = false } = {}) {
    const context = previewContext();
    if (!context?.doc?.documentElement) return false;

    ensurePreviewStylesheet();

    const root = context.doc.documentElement;
    if (restoreAll || root.getAttribute("data-sdlive-vfx") == null) {
      root.setAttribute("data-sdlive-vfx", "on");
    }

    FEATURES.forEach(({ id }) => {
      const attr = featureAttribute(id);
      if (restoreAll || root.getAttribute(attr) == null) {
        root.setAttribute(attr, "on");
      }
    });

    return true;
  }

  function tryInstallPreviewRuntime() {
    const context = previewContext();
    if (!context?.doc?.head) return false;
    if (previewRuntime()?.status) return true;

    const existing = context.doc.querySelector(
      "script[data-sdlive-visual-safeguards-runtime]"
    );
    if (existing) return false;

    const script = context.doc.createElement("script");
    script.src = SCRIPT_SRC;
    script.setAttribute("data-sdlive-visual-safeguards-runtime", "true");
    script.addEventListener("load", () => {
      if (!panel?.hidden) renderStatus(readStatus(), { checked: false });
    }, { once: true });
    context.doc.head.appendChild(script);
    return true;
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
    const durations = `${style.transitionDuration || ""} ${style.animationDuration || ""}`;
    return !durations
      .split(/[ ,]+/)
      .every((value) => !value || value === "0s" || value === "0ms");
  }

  function directStatus() {
    const context = previewContext();
    if (!context) {
      return {
        enabled: false,
        features: FEATURES.map((feature) => ({ ...feature, enabled: false })),
        checks: [{ id: "preview", label: "Preview document", healthy: false }],
        healthy: false,
        healthyCount: 0,
        totalChecks: 1
      };
    }

    const { doc, win } = context;
    const reducedMotion = Boolean(
      win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    );
    const root = doc.documentElement;
    const checks = [];

    checks.push({
      id: "stylesheet",
      label: "Safeguard stylesheet",
      healthy: Boolean(doc.querySelector("link[data-sdlive-visual-safeguards]"))
    });
    checks.push({
      id: "root",
      label: "Safeguard baseline",
      healthy: root.getAttribute("data-sdlive-vfx") === "on"
    });

    const glass = doc.querySelector(".glass");
    if (glass) {
      const style = safeStyle(win, glass);
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

    const trustedCard = doc.querySelector(".client-strip-card");
    if (trustedCard) {
      const sheen = safeStyle(win, trustedCard, "::after");
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

    const testimonialCard = doc.querySelector(
      ".testimonials--public .testimonial-card"
    );
    if (testimonialCard) {
      const sheen = safeStyle(win, testimonialCard, "::after");
      const cardStyle = safeStyle(win, testimonialCard);
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

    const reveal = doc.querySelector(".reveal");
    if (reveal) {
      checks.push({
        id: "reveals",
        label: "Section reveal system",
        healthy: reducedMotion || hasMotion(safeStyle(win, reveal))
      });
    }

    const supportedReveal = doc.querySelector(".supported-reveal");
    if (supportedReveal) {
      checks.push({
        id: "supported-reveals",
        label: "Supported-brand reveal system",
        healthy: reducedMotion || hasMotion(safeStyle(win, supportedReveal))
      });
    }

    const marquee = doc.querySelector(".trusted-marquee.is-ready .trusted-track");
    if (marquee) {
      const style = safeStyle(win, marquee);
      checks.push({
        id: "trusted-motion",
        label: "Trusted carousel animation",
        healthy: reducedMotion || Boolean(style && style.animationName !== "none")
      });
    }

    const aurora = doc.querySelector(".aurora");
    if (aurora) {
      const style = safeStyle(win, aurora, "::before");
      checks.push({
        id: "ambient",
        label: "Aurora animation",
        healthy: reducedMotion || Boolean(style && style.animationName !== "none")
      });
    }

    const features = FEATURES.map((feature) => ({
      ...feature,
      enabled: root.getAttribute(featureAttribute(feature.id)) !== "off"
    }));
    const healthyCount = checks.filter((check) => check.healthy).length;

    return {
      enabled: root.getAttribute("data-sdlive-vfx") === "on",
      features,
      checks,
      healthy: healthyCount === checks.length,
      healthyCount,
      totalChecks: checks.length
    };
  }

  function readStatus() {
    const runtime = previewRuntime();
    if (runtime?.status) {
      try {
        return runtime.status();
      } catch {
        return directStatus();
      }
    }
    return directStatus();
  }

  function renderStatus(status, { checked = false } = {}) {
    if (!panel || panel.hidden || !status) return;

    const summary = panel.querySelector("[data-guard-summary]");
    const featureList = panel.querySelector("[data-guard-features]");
    const checkList = panel.querySelector("[data-guard-checks]");

    if (summary) {
      const suffix = checked ? ` · checked now · run ${checkRun}.` : ".";
      summary.textContent = status.healthy
        ? `${status.healthyCount}/${status.totalChecks} visual contracts healthy${suffix}`
        : `${status.healthyCount}/${status.totalChecks} visual contracts healthy · repair recommended${suffix}`;
    }

    if (featureList) {
      featureList.replaceChildren();
      status.features.forEach((feature) => {
        const row = document.createElement("div");
        row.className = "visual-guards-row";

        const label = document.createElement("span");
        label.className = "visual-guards-label";
        label.textContent = feature.label;

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = `visual-guards-toggle${feature.enabled ? " is-on" : ""}`;
        toggle.textContent = feature.enabled ? "Protected" : "Re-enable";
        toggle.setAttribute("aria-pressed", feature.enabled ? "true" : "false");
        toggle.addEventListener("click", () => {
          setFeature(feature.id, !feature.enabled);
          renderStatus(readStatus(), { checked: false });
        });

        row.append(label, toggle);
        featureList.appendChild(row);
      });
    }

    if (checkList) {
      checkList.replaceChildren();
      status.checks.forEach((check) => {
        const row = document.createElement("div");
        row.className = "visual-guards-row";

        const label = document.createElement("span");
        label.className = "visual-guards-label";

        const dot = document.createElement("span");
        dot.className = `visual-guards-dot ${check.healthy ? "is-healthy" : "is-broken"}`;
        dot.setAttribute("aria-hidden", "true");

        const text = document.createElement("span");
        text.textContent = check.label;
        label.append(dot, text);

        const state = document.createElement("span");
        state.className = "visual-guards-note";
        state.textContent = check.healthy ? "OK" : "Needs repair";

        row.append(label, state);
        checkList.appendChild(row);
      });
    }

    if (button) {
      const badge = button.querySelector(".visual-guards-badge");
      if (badge) badge.textContent = `${status.healthyCount}/${status.totalChecks}`;
      button.classList.toggle("has-warning", !status.healthy);
    }
  }

  function setFeature(id, enabled) {
    ensurePreviewBaseline();
    const runtime = previewRuntime();
    if (runtime?.setFeature) {
      try {
        runtime.setFeature(id, enabled);
        return;
      } catch {}
    }

    const context = previewContext();
    context?.doc?.documentElement?.setAttribute(
      featureAttribute(id),
      enabled ? "on" : "off"
    );
  }

  function restoreAllDefaults() {
    ensurePreviewBaseline({ restoreAll: true });
    const runtime = previewRuntime();
    try {
      runtime?.repair?.();
    } catch {}
    tryInstallPreviewRuntime();
    window.requestAnimationFrame(() => {
      renderStatus(readStatus(), { checked: false });
    });
  }

  function runVisualCheck() {
    if (!panel || panel.hidden) return;
    checkRun += 1;

    const summary = panel.querySelector("[data-guard-summary]");
    const checkButton = panel.querySelector("[data-guard-check]");
    if (summary) summary.textContent = `Running visual diagnostics… run ${checkRun}.`;
    checkButton?.classList.add("is-running");

    ensurePreviewBaseline();
    tryInstallPreviewRuntime();

    window.requestAnimationFrame(() => {
      renderStatus(readStatus(), { checked: true });
      checkButton?.classList.remove("is-running");
    });
  }

  function createPanel() {
    panel = document.createElement("section");
    panel.className = "visual-guards-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Visual safeguards");
    panel.innerHTML = `
      <div class="visual-guards-head">
        <h2>Visual safeguards</h2>
        <button class="visual-guards-close" type="button" aria-label="Close safeguards">×</button>
      </div>
      <p class="visual-guards-summary" data-guard-summary>Checking preview…</p>
      <p class="visual-guards-section-title">Protection layers</p>
      <div class="visual-guards-list" data-guard-features></div>
      <p class="visual-guards-section-title">Live diagnostics</p>
      <div class="visual-guards-list" data-guard-checks></div>
      <div class="visual-guards-actions">
        <button class="visual-guards-action is-primary" type="button" data-guard-restore>Restore all defaults</button>
        <button class="visual-guards-action" type="button" data-guard-check>Run check</button>
      </div>
      <p class="visual-guards-note">These controls protect the Editor preview. The public Home always loads the same safeguards enabled by default; they are not content settings and are never saved into a section Draft.</p>
    `;

    panel.querySelector(".visual-guards-close").addEventListener("click", () => {
      panel.hidden = true;
      button?.setAttribute("aria-expanded", "false");
    });
    panel.querySelector("[data-guard-restore]").addEventListener(
      "click",
      restoreAllDefaults
    );
    panel.querySelector("[data-guard-check]").addEventListener(
      "click",
      runVisualCheck
    );

    document.body.appendChild(panel);
  }

  function createButton() {
    button = document.createElement("button");
    button.type = "button";
    button.className = "tool-button";
    button.setAttribute("data-visual-safeguards", "true");
    button.setAttribute("aria-expanded", "false");
    button.title = "Check or restore stable site aesthetics";
    button.innerHTML = '<span>Safeguards</span><span class="visual-guards-badge">—</span>';

    button.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      button.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
      if (!panel.hidden) {
        ensurePreviewBaseline();
        tryInstallPreviewRuntime();
        renderStatus(readStatus(), { checked: false });
      }
    });

    if (refreshButton?.parentElement === toolbar) {
      toolbar.insertBefore(button, refreshButton);
    } else {
      toolbar.appendChild(button);
    }
  }

  injectStyles();
  createPanel();
  createButton();

  iframe.addEventListener("load", () => {
    window.setTimeout(() => {
      ensurePreviewBaseline();
      tryInstallPreviewRuntime();
      if (!panel.hidden) renderStatus(readStatus(), { checked: false });
    }, 120);
  });

  if (iframe.contentDocument?.readyState === "complete") {
    ensurePreviewBaseline();
    tryInstallPreviewRuntime();
  }
})();
