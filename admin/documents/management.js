(() => {
  "use strict";

  if (window.SDLiveDocumentsManagement) return;
  window.SDLiveDocumentsManagement = true;

  const API = "/api/admin/documents";
  const $ = (id) => document.getElementById(id);
  let settings = null;

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
    if (code === "document_not_draft") return "Only drafts can be deleted. Finalized or void documents are permanent.";
    if (code === "document_not_found") return "This draft no longer exists.";
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
