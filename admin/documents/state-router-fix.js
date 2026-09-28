(() => {
  "use strict";

  if (window.SDLiveDocumentsStateRouterFix) return;
  window.SDLiveDocumentsStateRouterFix = true;

  function installHiddenGuard() {
    if (document.getElementById("documentsStateRouterHiddenGuard")) return;
    const style = document.createElement("style");
    style.id = "documentsStateRouterHiddenGuard";
    style.textContent = ".document-editor-grid[hidden]{display:none!important}";
    document.head.appendChild(style);
  }

  function loadRevisionUx() {
    if (document.querySelector("script[data-sdlive-documents-revision-ux]")) return;
    const script = document.createElement("script");
    script.src = "/admin/documents/revision-ux.js?v=20260928-2";
    script.dataset.sdliveDocumentsRevisionUx = "true";
    document.body.appendChild(script);
  }

  function loadPreviewFitUx() {
    if (document.querySelector("script[data-sdlive-documents-preview-fit-ux]")) return;
    const script = document.createElement("script");
    script.src = "/admin/documents/preview-fit-ux.js?v=20260928-1";
    script.dataset.sdliveDocumentsPreviewFitUx = "true";
    document.body.appendChild(script);
  }

  function loadMobileWebappUx() {
    if (!document.querySelector("link[data-sdlive-documents-mobile-webapp]")) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "/admin/documents/mobile-webapp.css?v=20260928-1";
      style.dataset.sdliveDocumentsMobileWebapp = "true";
      document.head.appendChild(style);
    }
    if (!document.querySelector("link[data-sdlive-documents-mobile-webapp-v2]")) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "/admin/documents/mobile-webapp-v2.css?v=20260928-2";
      style.dataset.sdliveDocumentsMobileWebappV2 = "true";
      document.head.appendChild(style);
    }
    if (!document.querySelector("link[data-sdlive-documents-mobile-webapp-v3]")) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "/admin/documents/mobile-webapp-v3.css?v=20260928-1";
      style.dataset.sdliveDocumentsMobileWebappV3 = "true";
      document.head.appendChild(style);
    }
    if (!document.querySelector("link[data-sdlive-documents-mobile-webapp-v4]")) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "/admin/documents/mobile-webapp-v4.css?v=20260928-1";
      style.dataset.sdliveDocumentsMobileWebappV4 = "true";
      document.head.appendChild(style);
    }
    if (document.querySelector("script[data-sdlive-documents-mobile-webapp]")) return;
    const script = document.createElement("script");
    script.src = "/admin/documents/mobile-webapp.js?v=20260928-2";
    script.dataset.sdliveDocumentsMobileWebapp = "true";
    document.body.appendChild(script);
  }

  function loadTestCleanupUx() {
    if (document.querySelector("script[data-sdlive-documents-test-cleanup]")) return;
    const script = document.createElement("script");
    script.src = "/admin/documents/test-cleanup-ux.js?v=20260928-1";
    script.dataset.sdliveDocumentsTestCleanup = "true";
    document.body.appendChild(script);
  }

  function issuedPanel() {
    return document.getElementById("issuedDocumentPanel");
  }

  function editorShell() {
    return document.getElementById("documentEditor");
  }

  function resetIssuedState() {
    const shell = editorShell();
    const grid = shell?.querySelector(".document-editor-grid");
    const panel = issuedPanel();
    const deleteButton = document.getElementById("deleteDraft");
    const finalizeButton = document.getElementById("finalizeDraft");
    const mobileMode = document.getElementById("documentsMobileEditorMode");

    if (panel) {
      panel.querySelector("iframe")?.removeAttribute("src");
      panel.replaceChildren();
      panel.hidden = true;
    }
    if (shell) shell.classList.add("documents-draft-preview-first");
    if (grid) grid.hidden = false;
    if (deleteButton) deleteButton.hidden = false;
    if (finalizeButton) finalizeButton.hidden = false;
    if (mobileMode && window.matchMedia("(max-width: 820px)").matches) mobileMode.hidden = false;
  }

  function prepareIssuedState() {
    const shell = editorShell();
    const grid = shell?.querySelector(".document-editor-grid");
    const mobileMode = document.getElementById("documentsMobileEditorMode");
    if (shell) shell.classList.remove("documents-draft-preview-first");
    if (grid) grid.hidden = true;
    if (mobileMode) mobileMode.hidden = true;
    document.body.classList.remove("documents-preview-fullscreen", "documents-mobile-editor-open");
  }

  installHiddenGuard();
  loadRevisionUx();
  loadPreviewFitUx();
  loadMobileWebappUx();
  loadTestCleanupUx();

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (target.closest("#newDraft")) {
      resetIssuedState();
      return;
    }

    const row = target.closest("#registryList .registry-row");
    if (!row) return;
    const status = String(row.querySelector(".registry-row__meta em")?.textContent || "").trim().toLowerCase();
    if (!status || status === "draft") resetIssuedState();
    else prepareIssuedState();
  }, true);
})();
