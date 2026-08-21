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

  const CORE_PREFIXES = {
    services: "service:",
    work: "work:"
  };

  let boundPreviewWindow = null;
  let highlightTimer = 0;

  bindPreviewBridge();

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
})();
