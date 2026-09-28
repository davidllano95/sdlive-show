(() => {
  "use strict";

  if (window.SDLiveDocumentsMobileWebapp) return;
  window.SDLiveDocumentsMobileWebapp = true;

  const MOBILE_QUERY = "(max-width: 820px)";
  const media = window.matchMedia(MOBILE_QUERY);

  function ensureMeta(name, content, { property = false } = {}) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(property ? "property" : "name", name);
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function installMobileMeta() {
    let viewport = document.head.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    viewport.content = "width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content";
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    ensureMeta("apple-mobile-web-app-title", "SD.Live Docs");
    ensureMeta("theme-color", "#0b0d14");
  }

  function editorShell() {
    return document.getElementById("documentEditor");
  }

  function setMode(mode, { scroll = false } = {}) {
    const shell = editorShell();
    const control = document.getElementById("documentsMobileEditorMode");
    if (!shell || !control) return;
    const next = mode === "edit" ? "edit" : "preview";
    shell.classList.toggle("documents-mobile-mode-edit", next === "edit");
    shell.classList.toggle("documents-mobile-mode-preview", next === "preview");
    for (const button of control.querySelectorAll("button[data-mode]")) {
      const active = button.dataset.mode === next;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    }
    if (scroll) shell.scrollIntoView({ behavior: "smooth", block: "start" });
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  function ensureModeControl() {
    const shell = editorShell();
    const grid = shell?.querySelector(".document-editor-grid");
    if (!shell || !grid) return;
    let control = document.getElementById("documentsMobileEditorMode");
    if (!control) {
      control = document.createElement("div");
      control.id = "documentsMobileEditorMode";
      control.className = "documents-mobile-editor-mode";
      control.setAttribute("role", "tablist");
      control.setAttribute("aria-label", "Draft view");
      control.innerHTML = `
        <button type="button" data-mode="preview" role="tab" aria-selected="true">Preview</button>
        <button type="button" data-mode="edit" role="tab" aria-selected="false">Edit</button>`;
      grid.before(control);
      control.addEventListener("click", (event) => {
        const button = event.target instanceof Element ? event.target.closest("button[data-mode]") : null;
        if (!button) return;
        setMode(button.dataset.mode, { scroll: true });
      });
    }
    if (!shell.classList.contains("documents-mobile-mode-edit") && !shell.classList.contains("documents-mobile-mode-preview")) {
      setMode("preview");
    }
  }

  function setPreviewFullscreen(active) {
    document.body.classList.toggle("documents-preview-fullscreen", active);
    const button = document.getElementById("documentsMobilePreviewFullscreen");
    if (button) {
      button.textContent = active ? "Close" : "Full screen";
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }

  function ensurePreviewAction() {
    const head = document.querySelector("#documentEditor .preview-panel__head");
    if (!head || document.getElementById("documentsMobilePreviewActions")) return;
    const actions = document.createElement("div");
    actions.id = "documentsMobilePreviewActions";
    actions.className = "documents-mobile-preview-actions";
    const button = document.createElement("button");
    button.id = "documentsMobilePreviewFullscreen";
    button.type = "button";
    button.textContent = "Full screen";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => setPreviewFullscreen(!document.body.classList.contains("documents-preview-fullscreen")));
    actions.appendChild(button);
    head.appendChild(actions);
  }

  function applyModeForViewport() {
    ensureModeControl();
    ensurePreviewAction();
    const control = document.getElementById("documentsMobileEditorMode");
    if (control) control.hidden = !media.matches;
    if (!media.matches) {
      document.body.classList.remove("documents-preview-fullscreen");
      return;
    }
    const shell = editorShell();
    if (shell && !shell.classList.contains("documents-mobile-mode-edit") && !shell.classList.contains("documents-mobile-mode-preview")) setMode("preview");
  }

  installMobileMeta();
  ensureModeControl();
  ensurePreviewAction();
  applyModeForViewport();

  media.addEventListener?.("change", applyModeForViewport);
  window.addEventListener("orientationchange", () => requestAnimationFrame(applyModeForViewport), { passive: true });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("#closeEditor, #newDraft, #documentsTab, #settingsTab")) setPreviewFullscreen(false);
    if (media.matches && target.closest("#registryList .registry-row")) {
      requestAnimationFrame(() => {
        ensureModeControl();
        ensurePreviewAction();
        setMode("preview");
      });
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("documents-preview-fullscreen")) setPreviewFullscreen(false);
  });
})();
