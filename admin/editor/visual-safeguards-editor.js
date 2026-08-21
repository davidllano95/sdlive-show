(() => {
  if (window.SDLIVE_VISUAL_SAFEGUARDS_EDITOR) return;
  window.SDLIVE_VISUAL_SAFEGUARDS_EDITOR = true;

  const iframe = document.getElementById("sitePreview");
  const toolbar = document.querySelector(".toolbar");
  const refreshButton = document.getElementById("refreshPreview");

  if (!iframe || !toolbar) return;

  const STYLE_HREF = "/visual-safeguards.css?v=20260821-2";
  const SCRIPT_SRC = "/visual-safeguards.js?v=20260821-2";
  let panel = null;
  let button = null;

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

  function previewDocument() {
    try {
      return iframe.contentDocument;
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

  function installPreviewRuntime() {
    const doc = previewDocument();
    if (!doc?.head) return false;

    let link = doc.querySelector("link[data-sdlive-visual-safeguards]");
    if (!link) {
      link = doc.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-sdlive-visual-safeguards", "true");
      doc.head.appendChild(link);
    }
    if (link.getAttribute("href") !== STYLE_HREF) {
      link.href = STYLE_HREF;
    }

    if (!iframe.contentWindow?.SDLiveVisualSafeguards) {
      let script = doc.querySelector("script[data-sdlive-visual-safeguards-runtime]");
      if (!script) {
        script = doc.createElement("script");
        script.src = SCRIPT_SRC;
        script.setAttribute("data-sdlive-visual-safeguards-runtime", "true");
        script.addEventListener("load", () => window.setTimeout(renderPanel, 60));
        doc.head.appendChild(script);
      }
    }

    return true;
  }

  function emptyPanel(message) {
    if (!panel) return;
    panel.querySelector("[data-guard-summary]").textContent = message;
    panel.querySelector("[data-guard-features]").replaceChildren();
    panel.querySelector("[data-guard-checks]").replaceChildren();
  }

  function renderPanel() {
    if (!panel || panel.hidden) return;

    installPreviewRuntime();
    const runtime = previewRuntime();
    if (!runtime?.status) {
      emptyPanel("Loading safeguard runtime in preview…");
      window.setTimeout(renderPanel, 100);
      return;
    }

    const status = runtime.status();
    const summary = panel.querySelector("[data-guard-summary]");
    const featureList = panel.querySelector("[data-guard-features]");
    const checkList = panel.querySelector("[data-guard-checks]");

    summary.textContent = status.healthy
      ? `${status.healthyCount}/${status.totalChecks} visual contracts healthy.`
      : `${status.healthyCount}/${status.totalChecks} visual contracts healthy · repair recommended.`;

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
        runtime.setFeature(feature.id, !feature.enabled);
        renderPanel();
      });

      row.append(label, toggle);
      featureList.appendChild(row);
    });

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

    if (button) {
      const badge = button.querySelector(".visual-guards-badge");
      if (badge) badge.textContent = `${status.healthyCount}/${status.totalChecks}`;
      button.classList.toggle("has-warning", !status.healthy);
    }
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

    panel.querySelector("[data-guard-restore]").addEventListener("click", () => {
      installPreviewRuntime();
      previewRuntime()?.repair?.();
      window.setTimeout(renderPanel, 60);
    });

    panel.querySelector("[data-guard-check]").addEventListener("click", renderPanel);
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
      if (!panel.hidden) renderPanel();
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
      installPreviewRuntime();
      if (!panel.hidden) renderPanel();
    }, 120);
  });

  if (iframe.contentDocument?.readyState === "complete") {
    installPreviewRuntime();
  }
})();
