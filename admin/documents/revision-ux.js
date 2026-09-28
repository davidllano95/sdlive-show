(() => {
  "use strict";

  if (window.SDLiveDocumentsRevisionUx) return;
  window.SDLiveDocumentsRevisionUx = true;

  const API = "/api/admin/documents";
  const PENDING_KEY = "sdlive.documents.openCorrectionDraft";
  let registry = null;
  let registryLoading = null;
  let activeIssuedId = null;
  let installingFor = null;

  async function readRegistry({ fresh = false } = {}) {
    if (!fresh && registry) return registry;
    if (!fresh && registryLoading) return registryLoading;
    registryLoading = fetch(`${API}/registry`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        registry = data.documents || [];
        return registry;
      })
      .finally(() => { registryLoading = null; });
    return registryLoading;
  }

  async function correctionInfo(documentId) {
    const response = await fetch(`${API}/${encodeURIComponent(documentId)}/correction-info`, {
      credentials: "include",
      cache: "no-store"
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  }

  function stashAndReload(documentId) {
    sessionStorage.setItem(PENDING_KEY, documentId);
    window.location.reload();
  }

  async function createCorrection(documentId, button) {
    button.disabled = true;
    const original = button.textContent;
    button.textContent = "Creating correction…";
    try {
      const response = await fetch(`${API}/${encodeURIComponent(documentId)}/corrections`, {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      stashAndReload(data.documentId);
    } catch (error) {
      button.disabled = false;
      button.textContent = original;
      button.title = `Could not create correction: ${String(error?.message || error)}`;
    }
  }

  async function installCorrectionAction() {
    const panel = document.getElementById("issuedDocumentPanel");
    const actions = panel?.querySelector("[data-issued-actions]");
    if (!panel || panel.hidden || !actions || !activeIssuedId) return;
    if (actions.querySelector(`[data-correction-for="${CSS.escape(activeIssuedId)}"]`)) return;
    if (installingFor === activeIssuedId) return;
    installingFor = activeIssuedId;
    try {
      const info = await correctionInfo(activeIssuedId);
      if (activeIssuedId !== info.documentId || panel.hidden) return;

      const existing = actions.querySelector("[data-documents-correction-action]");
      if (existing) existing.remove();

      if (!info.canCorrect) {
        const state = document.createElement("span");
        state.className = "documents-chip";
        state.dataset.documentsCorrectionAction = "true";
        state.dataset.correctionFor = activeIssuedId;
        state.textContent = info.supersededByDocumentId ? "Superseded · newer revision exists" : "Correction unavailable";
        actions.append(state);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button--ghost";
      button.dataset.documentsCorrectionAction = "true";
      button.dataset.correctionFor = activeIssuedId;
      if (info.openCorrectionDraftId) {
        button.textContent = `Open correction draft · ${info.nextDisplayNumber}`;
        button.addEventListener("click", () => stashAndReload(info.openCorrectionDraftId));
      } else {
        button.textContent = `Create correction · ${info.nextDisplayNumber}`;
        button.addEventListener("click", () => createCorrection(activeIssuedId, button));
      }
      actions.append(button);
    } catch (error) {
      console.error("[SD.Live] Could not load correction state", error);
    } finally {
      installingFor = null;
    }
  }

  async function captureRegistrySelection(event) {
    const target = event.target instanceof Element ? event.target : null;
    const list = document.getElementById("registryList");
    const row = target?.closest("#registryList .registry-row");
    if (!row || !list?.contains(row)) return;
    const status = String(row.querySelector(".registry-row__meta em")?.textContent || "").trim().toLowerCase();
    if (!status || status === "draft") {
      activeIssuedId = null;
      return;
    }
    const rows = Array.from(list.querySelectorAll(".registry-row"));
    const index = rows.indexOf(row);
    if (index < 0) return;
    try {
      const documents = await readRegistry();
      activeIssuedId = documents[index]?.id || null;
      queueMicrotask(installCorrectionAction);
    } catch (error) {
      console.error("[SD.Live] Could not resolve issued document for correction", error);
    }
  }

  async function resumeCorrectionDraft() {
    const targetId = sessionStorage.getItem(PENDING_KEY);
    if (!targetId) return;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const documents = await readRegistry({ fresh: attempt > 0 });
        const index = documents.findIndex((item) => item.id === targetId);
        const rows = Array.from(document.querySelectorAll("#registryList .registry-row"));
        if (index >= 0 && rows[index]) {
          sessionStorage.removeItem(PENDING_KEY);
          rows[index].click();
          return;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  document.addEventListener("click", captureRegistrySelection, true);
  const observer = new MutationObserver(() => {
    if (activeIssuedId) installCorrectionAction();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  resumeCorrectionDraft();
})();
