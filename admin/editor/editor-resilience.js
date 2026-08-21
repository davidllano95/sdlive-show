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

  const SAFEGUARD_STYLE = "/visual-safeguards.css?v=20260821-2";
  const SAFEGUARD_SCRIPT = "/visual-safeguards.js?v=20260821-2";
  const CORE_PREFIXES = {
    services: "service:",
    work: "work:"
  };

  let boundPreviewWindow = null;
  let highlightTimer = 0;

  injectResilienceStyles();
  bindPreviewBridge();
  bindSafeguardCheckBridge();

  iframe.addEventListener("load", () => {
    boundPreviewWindow = null;
    window.setTimeout(bindPreviewBridge, 80);
  });

  function activeCoreSection() {
    const active = document.querySelector(
      ".section-link.is-active[data-section]"
    );
    const section = active?.dataset.section || "";
    return Object.hasOwn(CORE_PREFIXES, section) ? section : null;
  }

  function ensureInspectorVisible() {
    if (
      inspector?.getAttribute("aria-hidden") === "true" &&
      toggleInspectorButton
    ) {
      toggleInspectorButton.click();
    }
  }

  function exactEditorTarget(key) {
    if (!key) return null;
    return editorBody.querySelector(
      `[data-core-editor-key="${CSS.escape(key)}"]`
    );
  }

  function selectExactCoreItem(section, key) {
    const prefix = CORE_PREFIXES[section];
    if (!prefix || !key?.startsWith(prefix)) return false;

    const target = exactEditorTarget(key);
    if (!target) return false;

    ensureInspectorVisible();

    const details = target.closest("details");
    if (details) details.open = true;

    window.clearTimeout(highlightTimer);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("is-selected");
        highlightTimer = window.setTimeout(() => {
          target.classList.remove("is-selected");
        }, 1800);
      });
    });

    if (selectionName) {
      selectionName.textContent =
        `${section === "services" ? "Service" : "Work"} · ${key.slice(prefix.length)}`;
    }
    if (selectionSelector) {
      selectionSelector.textContent = `[data-cms-editor-key="${key}"]`;
    }
    if (selectionHint) {
      selectionHint.textContent =
        "Editing the exact CMS item selected in the preview.";
    }

    return true;
  }

  function handlePreviewClick(event) {
    const section = activeCoreSection();
    if (!section) return;
    if (selectModeButton?.getAttribute("aria-pressed") === "false") return;

    const target = event.target?.closest?.("[data-cms-editor-key]");
    if (!target) return;

    const key = target.dataset.cmsEditorKey || "";
    if (!key.startsWith(CORE_PREFIXES[section])) return;

    // The base visual selector also listens on the preview document in capture
    // phase. Listening one level earlier (iframe Window capture) guarantees the
    // CMS-specific exact route wins before the generic selector can consume it.
    event.preventDefault();
    event.stopImmediatePropagation();
    selectExactCoreItem(section, key);
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

  function installSafeguardRuntime() {
    const doc = previewDocument();
    if (!doc?.head) return Promise.resolve(null);

    let link = doc.querySelector("link[data-sdlive-visual-safeguards]");
    if (!link) {
      link = doc.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-sdlive-visual-safeguards", "true");
      doc.head.appendChild(link);
    }
    if (link.getAttribute("href") !== SAFEGUARD_STYLE) {
      link.href = SAFEGUARD_STYLE;
    }

    const existing = previewRuntime();
    if (existing?.status) return Promise.resolve(existing);

    doc
      .querySelectorAll("script[data-sdlive-visual-safeguards-runtime]")
      .forEach((script) => script.remove());

    return new Promise((resolve) => {
      const script = doc.createElement("script");
      script.src = SAFEGUARD_SCRIPT;
      script.setAttribute("data-sdlive-visual-safeguards-runtime", "true");

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve(previewRuntime());
      };

      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", finish, { once: true });
      doc.head.appendChild(script);
      window.setTimeout(finish, 1600);
    });
  }

  function renderSafeguardCheck(status) {
    const panel = document.querySelector(".visual-guards-panel");
    if (!panel) return;

    const summary = panel.querySelector("[data-guard-summary]");
    const checks = panel.querySelector("[data-guard-checks]");
    const toolbarButton = document.querySelector("[data-visual-safeguards]");

    if (!status) {
      if (summary) {
        summary.textContent =
          "Safeguard runtime could not be reached. Use Restore all defaults, then run the check again.";
      }
      toolbarButton?.classList.add("has-warning");
      return;
    }

    if (summary) {
      summary.textContent = status.healthy
        ? `${status.healthyCount}/${status.totalChecks} visual contracts healthy · checked now.`
        : `${status.healthyCount}/${status.totalChecks} visual contracts healthy · repair recommended · checked now.`;
    }

    if (checks) {
      checks.replaceChildren();
      status.checks.forEach((check) => {
        const row = document.createElement("div");
        row.className = "visual-guards-row";

        const label = document.createElement("span");
        label.className = "visual-guards-label";

        const dot = document.createElement("span");
        dot.className =
          `visual-guards-dot ${check.healthy ? "is-healthy" : "is-broken"}`;
        dot.setAttribute("aria-hidden", "true");

        const text = document.createElement("span");
        text.textContent = check.label;
        label.append(dot, text);

        const state = document.createElement("span");
        state.className = "visual-guards-note";
        state.textContent = check.healthy ? "OK" : "Needs repair";

        row.append(label, state);
        checks.appendChild(row);
      });
    }

    const badge = toolbarButton?.querySelector(".visual-guards-badge");
    if (badge) badge.textContent = `${status.healthyCount}/${status.totalChecks}`;
    toolbarButton?.classList.toggle("has-warning", !status.healthy);
  }

  async function runSafeguardCheck() {
    const panel = document.querySelector(".visual-guards-panel");
    const summary = panel?.querySelector("[data-guard-summary]");
    const checkButton = panel?.querySelector("[data-guard-check]");

    if (checkButton) {
      checkButton.disabled = true;
      checkButton.removeAttribute("aria-disabled");
    }
    if (summary) summary.textContent = "Checking preview visual contracts…";

    const runtime = previewRuntime() || await installSafeguardRuntime();
    let status = null;
    try {
      status = runtime?.status?.() || null;
    } catch {
      status = null;
    }

    renderSafeguardCheck(status);

    if (checkButton) checkButton.disabled = false;
  }

  function bindSafeguardCheckBridge() {
    // Delegated capture makes Run check authoritative even if another editor
    // module has attached a stale/competing button listener.
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("[data-guard-check]");
      if (!button) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      button.disabled = false;
      void runSafeguardCheck();
    }, true);

    const checkButton = document.querySelector("[data-guard-check]");
    if (checkButton) {
      checkButton.disabled = false;
      checkButton.removeAttribute("aria-disabled");
    }
  }

  function injectResilienceStyles() {
    if (document.getElementById("sdlive-editor-resilience-style")) return;
    const style = document.createElement("style");
    style.id = "sdlive-editor-resilience-style";
    style.textContent = `
      [data-guard-check] {
        pointer-events: auto !important;
        cursor: pointer !important;
      }
      [data-guard-check]:disabled {
        cursor: progress !important;
        opacity: .72;
      }
    `;
    document.head.appendChild(style);
  }
})();
