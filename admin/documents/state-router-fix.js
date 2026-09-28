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
    script.src = "/admin/documents/revision-ux.js?v=20260927-1";
    script.dataset.sdliveDocumentsRevisionUx = "true";
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

    if (panel) {
      panel.querySelector("iframe")?.removeAttribute("src");
      panel.replaceChildren();
      panel.hidden = true;
    }
    if (shell) shell.classList.add("documents-draft-preview-first");
    if (grid) grid.hidden = false;
    if (deleteButton) deleteButton.hidden = false;
    if (finalizeButton) finalizeButton.hidden = false;
  }

  function prepareIssuedState() {
    const shell = editorShell();
    const grid = shell?.querySelector(".document-editor-grid");
    if (shell) shell.classList.remove("documents-draft-preview-first");
    if (grid) grid.hidden = true;
  }

  installHiddenGuard();
  loadRevisionUx();

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
