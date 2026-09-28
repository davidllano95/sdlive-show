(() => {
  "use strict";

  if (window.SDLiveDocumentsPdfArtifactUx) return;
  window.SDLiveDocumentsPdfArtifactUx = true;

  const API = "/api/admin/documents";
  let registryCache = null;
  let registryLoading = null;
  let syncQueued = false;

  function formatMoney(minor, currency) {
    const value = Number(minor || 0) / 100;
    try {
      return new Intl.NumberFormat(currency === "COP" ? "es-CO" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: currency === "COP" ? 0 : 2,
        maximumFractionDigits: currency === "COP" ? 0 : 2
      }).format(value);
    } catch {
      return `${currency || ""} ${value.toFixed(2)}`.trim();
    }
  }

  function filenamePart(value, maxLength = 80) {
    return String(value || "")
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, maxLength);
  }

  function pdfDownloadFilename(documentInfo) {
    const number = filenamePart(documentInfo.displayNumber || documentInfo.id || "document", 100) || "document";
    const client = filenamePart(documentInfo.clientName, 100);
    if (!client) throw new Error("document_client_name_required_for_filename");
    return `${number} - ${client}.pdf`;
  }

  async function readRegistry({ fresh = false } = {}) {
    if (!fresh && registryCache) return registryCache;
    if (!fresh && registryLoading) return registryLoading;
    registryLoading = fetch(`${API}/registry`, { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
        registryCache = data.documents || [];
        return registryCache;
      })
      .finally(() => { registryLoading = null; });
    return registryLoading;
  }

  function installIssuedStyles() {
    if (document.getElementById("documentsIssuedArtifactStyles")) return;
    const style = document.createElement("style");
    style.id = "documentsIssuedArtifactStyles";
    style.textContent = `
      .documents-issued-panel{padding:26px;border:1px solid rgba(130,112,220,.24);border-radius:18px;background:rgba(118,91,220,.08);margin-top:18px}
      .documents-issued-panel[hidden]{display:none!important}.documents-issued-panel h4{font-size:1.35rem;margin:18px 0 8px}.documents-issued-panel p{color:#c9c4d8;line-height:1.5}
      .documents-issued-number{font:750 1.05rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#c9b8ff}.documents-issued-meta{margin-top:6px;color:#f1edf9}
      .documents-issued-status{display:inline-flex;align-items:center;gap:8px;margin-top:10px;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.06);font-size:.88rem}
      .documents-issued-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.documents-issued-actions a{text-decoration:none}
      .documents-issued-preview{margin-top:16px;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;background:#fff;min-height:720px}
      .documents-issued-preview[hidden]{display:none!important}.documents-issued-preview iframe{display:block;width:100%;height:min(82vh,940px);min-height:720px;border:0;background:#fff}
      .registry-row[data-issued-document="true"] em{color:#c9b8ff}
      .document-editor-shell.documents-draft-preview-first .document-editor-grid{grid-template-columns:minmax(520px,1.12fr) minmax(420px,.88fr)}
      .document-editor-shell.documents-draft-preview-first .preview-panel{order:1;border-left:0;border-right:1px solid var(--border)}
      .document-editor-shell.documents-draft-preview-first .draft-editor{order:2}
      @media(max-width:1200px){.document-editor-shell.documents-draft-preview-first .document-editor-grid{grid-template-columns:1fr}.document-editor-shell.documents-draft-preview-first .preview-panel{border-right:0;border-top:0;border-bottom:1px solid var(--border)}}
    `;
    document.head.append(style);
  }

  function ensureIssuedPanel() {
    installIssuedStyles();
    let panel = document.getElementById("issuedDocumentPanel");
    if (panel) return panel;
    const shell = document.getElementById("documentEditor");
    if (!shell) return null;
    panel = document.createElement("section");
    panel.id = "issuedDocumentPanel";
    panel.className = "documents-issued-panel";
    panel.hidden = true;
    shell.append(panel);
    return panel;
  }

  function restoreDraftView() {
    const shell = document.getElementById("documentEditor");
    const grid = shell?.querySelector(".document-editor-grid");
    const panel = document.getElementById("issuedDocumentPanel");
    const deleteButton = document.getElementById("deleteDraft");
    const finalizeButton = document.getElementById("finalizeDraft");
    if (shell) shell.classList.add("documents-draft-preview-first");
    if (grid) grid.hidden = false;
    if (panel) panel.hidden = true;
    if (deleteButton) deleteButton.hidden = false;
    if (finalizeButton) finalizeButton.hidden = false;
  }

  async function checkPdf(documentInfo, panel) {
    const status = panel.querySelector("[data-issued-status]");
    const actions = panel.querySelector("[data-issued-actions]");
    const preview = panel.querySelector("[data-issued-preview]");
    const frame = panel.querySelector("[data-issued-pdf-frame]");
    status.textContent = "Checking signed PDF…";
    actions.replaceChildren();
    if (preview) preview.hidden = true;
    if (frame) frame.removeAttribute("src");
    try {
      const pdfPath = `${API}/${encodeURIComponent(documentInfo.id)}/pdf`;
      const response = await fetch(pdfPath, { credentials: "include", cache: "no-store" });
      if (response.ok) {
        status.textContent = "PDF ready · private artifact";
        const download = document.createElement("a");
        download.className = "button";
        download.href = pdfPath;
        download.download = pdfDownloadFilename(documentInfo);
        download.textContent = "Download PDF";
        actions.append(download);
        if (frame && preview) {
          frame.src = `${pdfPath}#view=FitH`;
          preview.hidden = false;
        }
        return;
      }
      const data = await response.json().catch(() => null);
      if (data?.error !== "pdf_not_ready") throw new Error(data?.error || `HTTP ${response.status}`);
      status.textContent = "PDF not ready · retry is safe";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button";
      retry.textContent = "Retry PDF";
      retry.addEventListener("click", () => retryPdf(documentInfo, panel, retry));
      actions.append(retry);
    } catch (error) {
      status.textContent = `PDF status unavailable · ${String(error?.message || error)}`;
    }
  }

  async function retryPdf(documentInfo, panel, button) {
    const status = panel.querySelector("[data-issued-status]");
    button.disabled = true;
    status.textContent = "Generating signed PDF from frozen snapshot…";
    try {
      const response = await fetch(`${API}/${encodeURIComponent(documentInfo.id)}/pdf`, {
        method: "POST",
        credentials: "include",
        cache: "no-store"
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      await checkPdf(documentInfo, panel);
    } catch (error) {
      status.textContent = `PDF generation failed · ${String(error?.message || error)}`;
      button.disabled = false;
    }
  }

  function environmentLabel(documentInfo) {
    return String(documentInfo.seriesKey || "").startsWith("test:") ? "TEST" : "REAL";
  }

  async function showIssuedDocument(documentInfo) {
    const shell = document.getElementById("documentEditor");
    const grid = shell?.querySelector(".document-editor-grid");
    const panel = ensureIssuedPanel();
    if (!shell || !panel) return;
    const environment = environmentLabel(documentInfo);
    shell.classList.remove("documents-draft-preview-first");
    if (grid) grid.hidden = true;
    shell.hidden = false;
    panel.hidden = false;
    const deleteButton = document.getElementById("deleteDraft");
    const finalizeButton = document.getElementById("finalizeDraft");
    if (deleteButton) deleteButton.hidden = true;
    if (finalizeButton) finalizeButton.hidden = true;
    const title = document.getElementById("editorTitle");
    const kind = document.getElementById("editorKindLabel");
    const rev = document.getElementById("draftRevChip");
    const saveState = document.getElementById("draftSaveState");
    if (title) title.textContent = documentInfo.displayNumber || documentInfo.id;
    if (kind) kind.textContent = documentInfo.status === "void" ? `Void ${environment} document` : `Finalized ${environment} document`;
    if (rev) rev.textContent = "snapshot frozen";
    if (saveState) saveState.textContent = "Issued · immutable";
    panel.innerHTML = `
      <span class="eyebrow">Issued ${environment} artifact</span>
      <div class="documents-issued-status" data-issued-status>Checking signed PDF…</div>
      <div class="documents-issued-actions" data-issued-actions></div>
      <div class="documents-issued-preview" data-issued-preview hidden><iframe data-issued-pdf-frame title="Finalized PDF preview"></iframe></div>
      <h4>${String(documentInfo.displayNumber || documentInfo.id).replace(/[<>&]/g, "")}</h4>
      <div class="documents-issued-number">${String(documentInfo.seriesKey || "Document series").replace(/[<>&]/g, "")}</div>
      <div class="documents-issued-meta">${String(documentInfo.clientName || "No client").replace(/[<>&]/g, "")} · ${formatMoney(documentInfo.totalMinor, documentInfo.currency)}</div>
      <p>This ${environment} number and snapshot are already frozen. The draft editor is disabled for issued documents.</p>`;
    shell.scrollIntoView({ behavior: "smooth", block: "start" });
    await checkPdf(documentInfo, panel);
  }

  function installRegistryCapture() {
    const list = document.getElementById("registryList");
    if (!list || list.dataset.issuedCaptureReady === "true") return;
    list.dataset.issuedCaptureReady = "true";
    list.addEventListener("click", async (event) => {
      const row = event.target.closest(".registry-row");
      if (!row || !list.contains(row)) return;
      const status = String(row.querySelector(".registry-row__meta em")?.textContent || "").trim().toLowerCase();
      if (!status || status === "draft") {
        restoreDraftView();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const rows = Array.from(list.querySelectorAll(".registry-row"));
      const index = rows.indexOf(row);
      if (index < 0) return;
      try {
        const documents = await readRegistry();
        const info = documents[index];
        if (info && info.status !== "draft") await showIssuedDocument(info);
      } catch (error) {
        console.error("[SD.Live] Failed to open issued document", error);
      }
    }, true);
  }

  function cleanFxUi() {
    for (const control of document.querySelectorAll(".line-exchange-rate-date")) {
      control.closest(".line-field")?.remove();
    }
    for (const control of document.querySelectorAll(".line-exchange-rate")) {
      const label = control.closest(".line-field")?.querySelector(".line-field__label");
      const desired = "FX rate · 1 USD = original currency (optional)";
      if (label && label.textContent !== desired) label.textContent = desired;
      if (control.placeholder !== "e.g. 0.92") control.placeholder = "e.g. 0.92";
    }
  }

  async function decorateRegistry() {
    const rows = Array.from(document.querySelectorAll("#registryList .registry-row"));
    if (!rows.length || rows.every((row) => row.dataset.artifactUxReady === "true")) return;
    let documents;
    try { documents = await readRegistry(); } catch { return; }
    rows.forEach((row, index) => {
      if (row.dataset.artifactUxReady === "true") return;
      const info = documents[index];
      if (!info) return;
      row.dataset.artifactUxReady = "true";
      if (info.status !== "draft") row.dataset.issuedDocument = "true";
    });
  }

  function syncArtifactUi() {
    installRegistryCapture();
    cleanFxUi();
    decorateRegistry();
    const saveState = document.getElementById("draftSaveState");
    if (saveState && /Finalized\s*·\s*(?:PDF pending(?: next gate)?|signed PDF generation requested)/i.test(saveState.textContent || "")) {
      const desired = "Finalized · signed PDF requested";
      if (saveState.textContent !== desired) saveState.textContent = desired;
    }
  }

  function queueSync() {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      syncArtifactUi();
    });
  }

  syncArtifactUi();
  const observer = new MutationObserver(queueSync);
  observer.observe(document.body, { childList: true, subtree: true });
})();
