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

  function editorIsOpen() {
    const shell = editorShell();
    return Boolean(shell && !shell.hidden && !shell.querySelector(".document-editor-grid")?.hidden);
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
        setMode(button.dataset.mode, { scroll: false });
      });
    }
    if (!shell.classList.contains("documents-mobile-mode-edit") && !shell.classList.contains("documents-mobile-mode-preview")) setMode("preview");
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

  function enhanceFieldsets() {
    const form = document.getElementById("draftForm");
    if (!form || !media.matches) return;
    for (const fieldset of form.querySelectorAll(":scope > fieldset")) {
      if (fieldset.dataset.mobileCollapsible === "true") continue;
      const legend = fieldset.querySelector(":scope > legend");
      if (!legend) continue;
      const label = String(legend.textContent || "Section").trim();
      const key = label.toLowerCase();
      const collapsedByDefault = key === "issuer" || key === "client";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "documents-mobile-fieldset-toggle";
      button.innerHTML = `<span>${label}</span><span class="documents-mobile-fieldset-chevron" aria-hidden="true">⌄</span>`;
      legend.replaceChildren(button);
      fieldset.dataset.mobileCollapsible = "true";
      fieldset.classList.toggle("is-mobile-collapsed", collapsedByDefault);
      button.setAttribute("aria-expanded", collapsedByDefault ? "false" : "true");
      button.addEventListener("click", () => {
        const collapsed = fieldset.classList.toggle("is-mobile-collapsed");
        button.setAttribute("aria-expanded", collapsed ? "false" : "true");
      });
    }
  }

  function ensureActionDock() {
    let dock = document.getElementById("documentsMobileActionDock");
    if (!dock) {
      dock = document.createElement("div");
      dock.id = "documentsMobileActionDock";
      dock.className = "documents-mobile-action-dock";
      dock.innerHTML = `
        <button type="button" class="button button--ghost" data-mobile-action="save">Save</button>
        <button type="button" class="button" data-mobile-action="finalize">Finalize</button>`;
      dock.addEventListener("click", (event) => {
        const action = event.target instanceof Element ? event.target.closest("[data-mobile-action]")?.dataset.mobileAction : null;
        if (action === "save") document.getElementById("saveDraft")?.click();
        if (action === "finalize") document.getElementById("finalizeDraft")?.click();
      });
      document.body.appendChild(dock);
    }
    return dock;
  }

  function syncActionDock() {
    const dock = ensureActionDock();
    const shouldShow = media.matches && editorIsOpen() && !document.body.classList.contains("documents-preview-fullscreen");
    dock.hidden = !shouldShow;
    document.body.classList.toggle("documents-mobile-editor-open", shouldShow);
    if (!shouldShow) return;
    const save = dock.querySelector('[data-mobile-action="save"]');
    const finalize = dock.querySelector('[data-mobile-action="finalize"]');
    const originalSave = document.getElementById("saveDraft");
    const originalFinalize = document.getElementById("finalizeDraft");
    if (save) save.disabled = Boolean(originalSave?.disabled);
    if (finalize) finalize.disabled = !originalFinalize || Boolean(originalFinalize.disabled) || Boolean(originalFinalize.hidden);
  }

  function syncEditorChrome() {
    ensureModeControl();
    ensurePreviewAction();
    enhanceFieldsets();
    const control = document.getElementById("documentsMobileEditorMode");
    if (control) control.hidden = !media.matches || !editorIsOpen();
    if (!media.matches) {
      document.body.classList.remove("documents-preview-fullscreen", "documents-mobile-editor-open");
    }
    syncActionDock();
  }

  installMobileMeta();
  syncEditorChrome();

  media.addEventListener?.("change", syncEditorChrome);
  window.addEventListener("orientationchange", () => requestAnimationFrame(syncEditorChrome), { passive: true });
  window.addEventListener("resize", syncActionDock, { passive: true });

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("#closeEditor, #newDraft, #documentsTab, #settingsTab")) setPreviewFullscreen(false);
    if (target.closest("#closeEditor, #documentsTab, #settingsTab")) document.body.classList.remove("documents-mobile-editor-open");
    if (media.matches && target.closest("#registryList .registry-row")) {
      requestAnimationFrame(() => {
        syncEditorChrome();
        if (editorIsOpen()) setMode("preview");
      });
    }
    requestAnimationFrame(syncEditorChrome);
  }, true);

  document.addEventListener("submit", (event) => {
    if (event.target?.id === "newDraftForm") {
      setTimeout(syncEditorChrome, 0);
      setTimeout(syncEditorChrome, 180);
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("documents-preview-fullscreen")) setPreviewFullscreen(false);
  });

  setTimeout(syncEditorChrome, 100);
  setTimeout(syncEditorChrome, 500);
})();