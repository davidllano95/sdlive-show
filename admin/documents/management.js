(() => {
  "use strict";

  if (window.SDLiveDocumentsManagement) return;
  window.SDLiveDocumentsManagement = true;

  const API = "/api/admin/documents";
  const $ = (id) => document.getElementById(id);
  let settings = null;
  let finalizeKey = null;
  let finalizePreview = null;

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...options
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const error = new Error(data?.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function setMessage(id, text, type = "") {
    const node = $(id);
    if (!node) return;
    node.textContent = text || "";
    node.className = `documents-message${type ? ` is-${type}` : ""}`;
  }

  function friendly(error) {
    const code = String(error?.message || error || "");
    if (code === "issuer_profile_in_use") return "This issuer is still used by a document or number series. Delete its drafts first; issued history cannot be removed.";
    if (code === "client_profile_in_use") return "This client is still used by a document. Delete its drafts first; issued history cannot be removed.";
    if (code === "document_not_draft") return "Only drafts can be deleted. Drafts may also be finalized; finalized or void documents are permanent.";
    if (code === "document_not_found") return "This draft no longer exists.";
    if (code === "stale_draft_revision") return "The draft changed after this confirmation was prepared. Review the latest revision and confirm again.";
    if (code === "active_signature_required") return "The issuer needs an active private signature before finalizing.";
    if (code === "test_series_issuer_mismatch") return "This gate only finalizes drafts whose issuer matches the TEST series. Use the test issuer for this smoke; real series remain locked.";
    if (code === "document_sequence_not_found") return "The TEST number series is not ready. Verify test series in Settings first.";
    if (code === "real_document_series_disabled") return "Real document numbering is still locked in this gate.";
    if (code === "client_required") return "Add a client legal name before finalizing.";
    if (code === "client_tax_id_required") return "A tax ID is required for this Cuenta de cobro.";
    if (code === "issue_date_required") return "Add the issue date before finalizing.";
    if (code === "issue_city_required") return "Add the issue city before finalizing.";
    if (code === "line_description_required") return "Every concept line needs a description before finalizing.";
    if (code === "at_least_one_line_required") return "Add at least one concept line before finalizing.";
    return code || "Request failed";
  }

  function primaryAddress(profile) {
    const first = profile?.addresses?.[0];
    return typeof first === "string" ? first : (first?.text || "");
  }

  function setValue(id, value) {
    const node = $(id);
    if (node) node.value = value == null ? "" : String(value);
  }

  function setChecked(id, value) {
    const node = $(id);
    if (node) node.checked = Boolean(value);
  }

  function loadIssuer(profile) {
    if (!profile) return clearIssuer();
    setValue("issuerId", profile.id);
    setValue("issuerLegalName", profile.legalName);
    setValue("issuerIdType", profile.idType);
    setValue("issuerIdNumber", profile.idNumber);
    setValue("issuerVatLabel", profile.vatLabel);
    setValue("issuerCiiu", profile.ciiu);
    setValue("issuerPhone", profile.phone);
    setValue("issuerEmail", profile.email);
    setValue("issuerAddress", primaryAddress(profile));
    setValue("issuerBrandLabel", profile.brandLabel);
    setValue("issuerBankBeneficiary", profile.bank?.beneficiary);
    setValue("issuerBankName", profile.bank?.bankName);
    setValue("issuerRoutingNumber", profile.bank?.routingNumber);
    setValue("issuerAccountType", profile.bank?.accountType);
    setValue("issuerAccountNumber", profile.bank?.accountNumber);
    setValue("issuerBankAddress", profile.bank?.bankAddress);
    setChecked("issuerActive", profile.active !== false);

    const picker = $("issuerProfilePicker");
    if (picker) picker.value = profile.id;
    const activeSignature = profile.activeSignatureId
      ? (settings?.signatures || []).find((item) => item.id === profile.activeSignatureId)
      : null;
    if ($("signatureState")) {
      $("signatureState").textContent = activeSignature ? "Active" : "Not loaded";
      $("signatureState").classList.toggle("is-safe", Boolean(activeSignature));
    }
    if ($("deleteIssuerProfile")) $("deleteIssuerProfile").disabled = false;
  }

  function clearIssuer() {
    [
      "issuerId", "issuerLegalName", "issuerIdType", "issuerIdNumber", "issuerVatLabel", "issuerCiiu",
      "issuerPhone", "issuerEmail", "issuerAddress", "issuerBrandLabel", "issuerBankBeneficiary", "issuerBankName",
      "issuerRoutingNumber", "issuerAccountType", "issuerAccountNumber", "issuerBankAddress"
    ].forEach((id) => setValue(id, ""));
    setValue("issuerBrandLabel", "SD.Live");
    setChecked("issuerActive", true);
    if ($("issuerProfilePicker")) $("issuerProfilePicker").value = "";
    if ($("signatureState")) {
      $("signatureState").textContent = "Not loaded";
      $("signatureState").classList.remove("is-safe");
    }
    if ($("deleteIssuerProfile")) $("deleteIssuerProfile").disabled = true;
    setMessage("issuerMessage", "New profile · choose a unique Profile ID");
    $("issuerId")?.focus();
  }

  function renderIssuerPicker(preferredId = "") {
    const picker = $("issuerProfilePicker");
    if (!picker) return;
    const current = preferredId || picker.value || $("issuerId")?.value.trim() || "";
    picker.replaceChildren(new Option("New issuer…", ""));
    for (const issuer of settings?.issuers || []) {
      const label = `${issuer.legalName || issuer.id} · ${issuer.id}${issuer.active === false ? " · inactive" : ""}`;
      picker.add(new Option(label, issuer.id));
    }
    if (current && (settings?.issuers || []).some((item) => item.id === current)) picker.value = current;
  }

  async function refreshSettings(preferredIssuerId = "") {
    settings = await api("/settings");
    renderIssuerPicker(preferredIssuerId);
    const id = preferredIssuerId || $("issuerProfilePicker")?.value || "";
    const profile = (settings.issuers || []).find((item) => item.id === id);
    if (profile) loadIssuer(profile);
    return settings;
  }

  async function deleteIssuer() {
    const id = $("issuerId")?.value.trim();
    if (!id) return;
    const profile = (settings?.issuers || []).find((item) => item.id === id);
    if (!profile) {
      setMessage("issuerMessage", "Save the profile before deleting it.", "error");
      return;
    }
    if (!window.confirm(`Delete issuer profile “${id}”?\n\nThis removes the profile and its private signature assets. Documents are never deleted implicitly.`)) return;
    const button = $("deleteIssuerProfile");
    if (button) button.disabled = true;
    setMessage("issuerMessage", "Deleting…");
    try {
      const result = await api(`/issuers/${encodeURIComponent(id)}`, { method: "DELETE" });
      settings = await api("/settings");
      renderIssuerPicker();
      clearIssuer();
      if (result.privateCleanupFailed) {
        setMessage("issuerMessage", `Profile deleted; ${result.privateCleanupFailed} private asset cleanup operation(s) need attention.`, "error");
      } else {
        setMessage("issuerMessage", "Issuer deleted", "success");
      }
    } catch (error) {
      setMessage("issuerMessage", friendly(error), "error");
      if (button) button.disabled = false;
    }
  }

  async function deleteClient() {
    const id = $("clientId")?.value.trim();
    if (!id) {
      setMessage("clientMessage", "Select an existing client first.", "error");
      return;
    }
    const client = (settings?.clients || []).find((item) => item.id === id);
    const name = client?.displayName || client?.legalName || id;
    if (!window.confirm(`Delete client profile “${name}”?\n\nDocuments are never deleted implicitly.`)) return;
    const button = $("deleteClientProfile");
    if (button) button.disabled = true;
    setMessage("clientMessage", "Deleting…");
    try {
      await api(`/clients/${encodeURIComponent(id)}`, { method: "DELETE" });
      setMessage("clientMessage", "Client deleted", "success");
      setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      setMessage("clientMessage", friendly(error), "error");
      if (button) button.disabled = false;
    }
  }

  async function deleteDraft() {
    const id = $("draftId")?.value.trim();
    if (!id) return;
    const title = $("editorTitle")?.textContent?.trim() || id;
    if (!window.confirm(`Delete draft “${title}”?\n\nThis cannot delete finalized or void documents.`)) return;
    const button = $("deleteDraft");
    if (button) button.disabled = true;
    if ($("draftSaveState")) $("draftSaveState").textContent = "Deleting…";
    try {
      await api(`/${encodeURIComponent(id)}`, { method: "DELETE" });
      if ($("draftSaveState")) $("draftSaveState").textContent = "Deleted";
      setTimeout(() => window.location.reload(), 180);
    } catch (error) {
      if ($("draftSaveState")) $("draftSaveState").textContent = `Error · ${friendly(error)}`;
      if (button) button.disabled = false;
    }
  }

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
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  function installFinalizeStyles() {
    if ($("documentsFinalizeStyles")) return;
    const style = document.createElement("style");
    style.id = "documentsFinalizeStyles";
    style.textContent = `
      .documents-finalize-dialog{width:min(560px,calc(100vw - 32px));border:1px solid rgba(130,112,220,.35);border-radius:20px;padding:0;background:#11111a;color:#f7f5ff;box-shadow:0 24px 80px rgba(0,0,0,.45)}
      .documents-finalize-dialog::backdrop{background:rgba(5,5,10,.72);backdrop-filter:blur(6px)}
      .documents-finalize-card{padding:24px}.documents-finalize-card h3{margin:4px 0 10px;font-size:1.35rem}.documents-finalize-card p{color:#c9c4d8;line-height:1.5}
      .documents-finalize-summary{margin:18px 0;padding:16px;border-radius:14px;background:rgba(118,91,220,.12);border:1px solid rgba(130,112,220,.24)}
      .documents-finalize-number{display:block;font:700 1.05rem/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#c9b8ff}.documents-finalize-meta{display:block;margin-top:7px;color:#f1edf9}
      .documents-finalize-warning{font-size:.9rem;color:#e4b96e!important}.documents-finalize-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.documents-finalize-error{min-height:1.2em;margin-top:12px;color:#ff9da5;font-size:.9rem}
      #finalizeDraft{margin-left:auto}
    `;
    document.head.append(style);
  }

  function installFinalizeUx() {
    const actions = document.querySelector(".draft-actions");
    if (!actions || $("finalizeDraft")) return;
    installFinalizeStyles();

    const button = document.createElement("button");
    button.id = "finalizeDraft";
    button.type = "button";
    button.className = "button";
    button.textContent = "Finalize TEST…";
    actions.append(button);

    const dialog = document.createElement("dialog");
    dialog.id = "finalizeDialog";
    dialog.className = "documents-finalize-dialog";
    dialog.innerHTML = `
      <div class="documents-finalize-card">
        <span class="eyebrow">Irreversible test issue</span>
        <h3>Confirm finalization</h3>
        <p id="finalizeSummaryText">Preparing the next TEST number…</p>
        <div class="documents-finalize-summary">
          <strong class="documents-finalize-number" id="finalizeNumber">—</strong>
          <span class="documents-finalize-meta" id="finalizeMeta">—</span>
        </div>
        <p class="documents-finalize-warning">This consumes a TEST number and freezes the snapshot. Real CC/INV series remain locked. PDF rendering is intentionally not enabled until the next gate.</p>
        <div class="documents-finalize-error" id="finalizeError" aria-live="polite"></div>
        <div class="documents-finalize-actions">
          <button class="button button--ghost" id="cancelFinalize" type="button">Cancel</button>
          <button class="button" id="confirmFinalize" type="button">Finalize TEST document</button>
        </div>
      </div>`;
    document.body.append(dialog);

    button.addEventListener("click", openFinalizeDialog);
    $("cancelFinalize")?.addEventListener("click", () => {
      dialog.close();
      finalizeKey = null;
      finalizePreview = null;
    });
    dialog.addEventListener("cancel", () => {
      finalizeKey = null;
      finalizePreview = null;
    });
    $("confirmFinalize")?.addEventListener("click", confirmFinalize);
  }

  async function openFinalizeDialog() {
    const documentId = $("draftId")?.value.trim();
    const draftRev = Number($("draftRev")?.value);
    if (!documentId || !Number.isSafeInteger(draftRev) || draftRev < 1) return;

    const saveState = $("draftSaveState")?.textContent?.trim() || "";
    if (/Unsaved|Saving|Autosaving/i.test(saveState)) {
      if ($("draftSaveState")) $("draftSaveState").textContent = "Save changes before finalizing";
      return;
    }

    const button = $("finalizeDraft");
    if (button) button.disabled = true;
    try {
      finalizePreview = await api(`/${encodeURIComponent(documentId)}/finalize-preview?draftRev=${encodeURIComponent(draftRev)}`);
      finalizeKey = crypto.randomUUID();
      $("finalizeNumber").textContent = `${finalizePreview.displayNumber} · ${finalizePreview.seriesKey}`;
      $("finalizeMeta").textContent = `${finalizePreview.clientName || "No client"} · ${formatMoney(finalizePreview.totalMinor, finalizePreview.currency)} · with private signature`;
      $("finalizeSummaryText").textContent = finalizePreview.docType === "cc"
        ? `Se emitirá como ${finalizePreview.displayNumber}.`
        : `This will issue ${finalizePreview.displayNumber}.`;
      $("finalizeError").textContent = "";
      $("confirmFinalize").disabled = false;
      $("confirmFinalize").textContent = "Finalize TEST document";
      const dialog = $("finalizeDialog");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } catch (error) {
      if ($("draftSaveState")) $("draftSaveState").textContent = `Cannot finalize · ${friendly(error)}`;
      finalizeKey = null;
      finalizePreview = null;
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function confirmFinalize() {
    if (!finalizePreview || !finalizeKey) return;
    const button = $("confirmFinalize");
    button.disabled = true;
    button.textContent = "Finalizing…";
    $("finalizeError").textContent = "";
    try {
      const result = await api(`/${encodeURIComponent(finalizePreview.documentId)}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftRev: finalizePreview.draftRev, finalizeKey })
      });
      button.textContent = result.idempotent ? "Already finalized" : "Finalized";
      if ($("draftSaveState")) $("draftSaveState").textContent = `${result.displayNumber || finalizePreview.displayNumber} finalized · PDF pending next gate`;
      setTimeout(() => window.location.reload(), 350);
    } catch (error) {
      $("finalizeError").textContent = friendly(error);
      button.disabled = false;
      button.textContent = "Retry with same key";
    }
  }

  function observeSaves() {
    const issuerMessage = $("issuerMessage");
    if (issuerMessage) {
      new MutationObserver(() => {
        if (issuerMessage.textContent.trim() === "Saved") {
          const id = $("issuerId")?.value.trim() || "";
          setTimeout(() => refreshSettings(id).catch(() => {}), 80);
        }
      }).observe(issuerMessage, { childList: true, characterData: true, subtree: true });
    }
    const clientMessage = $("clientMessage");
    if (clientMessage) {
      new MutationObserver(() => {
        if (clientMessage.textContent.trim() === "Saved") setTimeout(() => refreshSettings().catch(() => {}), 80);
      }).observe(clientMessage, { childList: true, characterData: true, subtree: true });
    }
  }

  function bind() {
    $("issuerProfilePicker")?.addEventListener("change", () => {
      const id = $("issuerProfilePicker").value;
      const profile = (settings?.issuers || []).find((item) => item.id === id) || null;
      profile ? loadIssuer(profile) : clearIssuer();
      setMessage("issuerMessage", "");
    });
    $("newIssuerProfile")?.addEventListener("click", clearIssuer);
    $("deleteIssuerProfile")?.addEventListener("click", deleteIssuer);
    $("deleteClientProfile")?.addEventListener("click", deleteClient);
    $("deleteDraft")?.addEventListener("click", deleteDraft);
    $("clientList")?.addEventListener("click", () => {
      setTimeout(() => {
        if ($("deleteClientProfile")) $("deleteClientProfile").disabled = !$("clientId")?.value.trim();
      }, 0);
    });
    $("newClient")?.addEventListener("click", () => {
      if ($("deleteClientProfile")) $("deleteClientProfile").disabled = true;
    });
  }

  async function boot() {
    bind();
    installFinalizeUx();
    observeSaves();
    if ($("deleteClientProfile")) $("deleteClientProfile").disabled = !$("clientId")?.value.trim();
    try {
      await refreshSettings($("issuerId")?.value.trim() || "");
    } catch {
      // Existing Documents UI owns primary availability errors.
    }
  }

  boot();
})();