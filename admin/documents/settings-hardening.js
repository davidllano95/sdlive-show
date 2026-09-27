(() => {
  "use strict";

  if (window.SDLiveDocumentsSettingsHardening) return;
  window.SDLiveDocumentsSettingsHardening = true;

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
    if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
    return data;
  }

  function setMessage(id, text, type = "") {
    const node = $(id);
    if (!node) return;
    node.textContent = text || "";
    node.className = `documents-message${type ? ` is-${type}` : ""}`;
  }

  function field(id, label, { type = "text", placeholder = "", autocomplete = "off" } = {}) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const labelNode = document.createElement("label");
    labelNode.htmlFor = id;
    labelNode.textContent = label;
    const input = document.createElement("input");
    input.id = id;
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    wrap.append(labelNode, input);
    return wrap;
  }

  function selectField(id, label, options) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const labelNode = document.createElement("label");
    labelNode.htmlFor = id;
    labelNode.textContent = label;
    const select = document.createElement("select");
    select.id = id;
    for (const [value, text] of options) select.add(new Option(text, value));
    wrap.append(labelNode, select);
    return wrap;
  }

  function ensureIssuerFields() {
    const form = $("issuerForm");
    const actions = form?.querySelector(".documents-form__actions");
    if (!form || !actions || $("issuerBankName")) return;

    const heading = document.createElement("div");
    heading.className = "documents-settings-subhead";
    heading.innerHTML = "<strong>Private payment profile</strong><span>Stored in Documents only. Never exposed by draft preview.</span>";

    const activeWrap = document.createElement("div");
    activeWrap.className = "field";
    const activeLabel = document.createElement("label");
    activeLabel.className = "check";
    const active = document.createElement("input");
    active.id = "issuerActive";
    active.type = "checkbox";
    activeLabel.append(active, document.createTextNode(" Active issuer"));
    activeWrap.append(activeLabel);

    const nodes = [
      heading,
      field("issuerBankBeneficiary", "Beneficiary"),
      field("issuerBeneficiaryAddress", "Beneficiary address (optional)"),
      field("issuerBankName", "Bank name"),
      field("issuerRoutingNumber", "Routing / bank code"),
      field("issuerAccountType", "Account type"),
      field("issuerAccountNumber", "Account number", { type: "password" }),
      field("issuerBankAddress", "Bank address"),
      activeWrap
    ];
    for (const node of nodes) form.insertBefore(node, actions);
  }

  function ensureClientFields() {
    const form = $("clientForm");
    const existingId = $("clientId");
    if (!form || !existingId || $("clientDefaultKind")) return;

    existingId.type = "text";
    existingId.autocomplete = "off";
    const idWrap = document.createElement("div");
    idWrap.className = "field";
    const idLabel = document.createElement("label");
    idLabel.htmlFor = "clientId";
    idLabel.textContent = "Profile ID";
    existingId.before(idWrap);
    idWrap.append(idLabel, existingId);

    const kindWrap = selectField("clientDefaultKind", "Default document", [
      ["", "—"],
      ["cc-co-es", "Cuenta de cobro · CO · ES"],
      ["invoice-intl-en", "Invoice · International · EN"]
    ]);
    const currencyField = $("clientCurrency")?.closest(".field");
    if (currencyField) currencyField.after(kindWrap);
    else form.append(kindWrap);
  }

  function currentIssuer() {
    const id = $("issuerId")?.value.trim();
    return (settings?.issuers || []).find((item) => item.id === id) || null;
  }

  function currentClient() {
    const id = $("clientId")?.value.trim();
    return (settings?.clients || []).find((item) => item.id === id) || null;
  }

  function syncIssuerFields() {
    const profile = currentIssuer();
    const bank = profile?.bank || {};
    if ($("issuerBankBeneficiary")) $("issuerBankBeneficiary").value = bank.beneficiary || "";
    if ($("issuerBeneficiaryAddress")) $("issuerBeneficiaryAddress").value = bank.beneficiaryAddress || "";
    if ($("issuerBankName")) $("issuerBankName").value = bank.bankName || "";
    if ($("issuerRoutingNumber")) $("issuerRoutingNumber").value = bank.routingNumber || "";
    if ($("issuerAccountType")) $("issuerAccountType").value = bank.accountType || "";
    if ($("issuerAccountNumber")) $("issuerAccountNumber").value = bank.accountNumber || "";
    if ($("issuerBankAddress")) $("issuerBankAddress").value = bank.bankAddress || "";
    if ($("issuerActive")) $("issuerActive").checked = profile ? profile.active !== false : true;
  }

  function syncClientFields() {
    const profile = currentClient();
    if ($("clientDefaultKind")) $("clientDefaultKind").value = profile?.defaultKindId || "";
  }

  function primaryAddressPayload(current, text) {
    const previous = Array.isArray(current?.addresses) ? current.addresses : [];
    const rest = previous.slice(1);
    return text ? [{ text }, ...rest] : rest;
  }

  function issuerPayload() {
    const current = currentIssuer();
    const address = $("issuerAddress").value.trim();
    return {
      id: $("issuerId").value.trim(),
      legalName: $("issuerLegalName").value.trim(),
      idType: $("issuerIdType").value.trim(),
      idNumber: $("issuerIdNumber").value.trim(),
      vatLabel: $("issuerVatLabel").value.trim(),
      ciiu: $("issuerCiiu").value.trim(),
      phone: $("issuerPhone").value.trim(),
      email: $("issuerEmail").value.trim(),
      addresses: primaryAddressPayload(current, address),
      bank: {
        beneficiary: $("issuerBankBeneficiary").value.trim(),
        beneficiaryAddress: $("issuerBeneficiaryAddress").value.trim(),
        bankName: $("issuerBankName").value.trim(),
        routingNumber: $("issuerRoutingNumber").value.trim(),
        accountType: $("issuerAccountType").value.trim(),
        accountNumber: $("issuerAccountNumber").value.trim(),
        bankAddress: $("issuerBankAddress").value.trim()
      },
      brandLabel: $("issuerBrandLabel").value.trim(),
      active: $("issuerActive").checked
    };
  }

  function clientPayload() {
    const current = currentClient();
    return {
      id: $("clientId").value.trim() || undefined,
      displayName: $("clientDisplayName").value.trim(),
      legalName: $("clientLegalName").value.trim(),
      taxIdType: $("clientTaxIdType").value.trim(),
      taxId: $("clientTaxId").value.trim(),
      billingAddress: $("clientBillingAddress").value.trim(),
      city: current?.city || null,
      country: $("clientCountry").value.trim(),
      email: current?.email || null,
      phone: current?.phone || null,
      contactName: current?.contactName || null,
      defaultKindId: $("clientDefaultKind").value || null,
      defaultCurrency: $("clientCurrency").value || null,
      paymentTermsDays: $("clientTerms").value === "" ? null : Number($("clientTerms").value),
      poPolicy: $("clientPoPolicy").value,
      showBankDetails: $("clientShowBank").checked,
      financeAliases: Array.isArray(current?.financeAliases) ? current.financeAliases : [],
      notes: current?.notes || null,
      archived: Boolean(current?.archivedAt)
    };
  }

  async function refreshLocalSettings() {
    settings = await api("/settings");
    syncIssuerFields();
    syncClientFields();
    enforceActiveIssuerChoices();
  }

  function enforceActiveIssuerChoices() {
    const select = $("newIssuer");
    if (!select || !settings) return;
    const activeIds = new Set((settings.issuers || []).filter((issuer) => issuer.active !== false).map((issuer) => issuer.id));
    for (const option of Array.from(select.options)) {
      if (!activeIds.has(option.value)) option.remove();
    }
    const canonical = (settings.issuers || []).find((issuer) => issuer.id === "samuel" && issuer.active !== false);
    if (canonical && Array.from(select.options).some((option) => option.value === canonical.id)) select.value = canonical.id;
    if ($("newDraft")) $("newDraft").disabled = select.options.length === 0;
  }

  function applyClientDefaultsToNewDraft() {
    const client = (settings?.clients || []).find((item) => item.id === $("newDocumentClient")?.value);
    if (!client) return;
    if (client.defaultKindId && $("newKind")?.querySelector(`option[value="${client.defaultKindId}"]`)) {
      $("newKind").value = client.defaultKindId;
    }
    if (client.defaultCurrency && $("newCurrency")) $("newCurrency").value = client.defaultCurrency;
  }

  function bindForms() {
    const issuerForm = $("issuerForm");
    const clientForm = $("clientForm");

    issuerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = $("issuerId").value.trim();
      setMessage("issuerMessage", "Saving…");
      try {
        await api(`/issuers/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(issuerPayload())
        });
        setMessage("issuerMessage", "Saved", "success");
        await refreshLocalSettings();
        $("refreshDocuments")?.click();
      } catch (error) {
        setMessage("issuerMessage", error.message, "error");
      }
    }, true);

    clientForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = $("clientId").value.trim();
      setMessage("clientMessage", "Saving…");
      try {
        const payload = clientPayload();
        const result = id
          ? await api(`/clients/${encodeURIComponent(id)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          : await api("/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!id && result.profile?.id) $("clientId").value = result.profile.id;
        setMessage("clientMessage", "Saved", "success");
        await refreshLocalSettings();
        $("refreshDocuments")?.click();
      } catch (error) {
        setMessage("clientMessage", error.message, "error");
      }
    }, true);
  }

  function bindSyncHooks() {
    $("issuerId")?.addEventListener("change", () => { syncIssuerFields(); });
    $("clientList")?.addEventListener("click", () => { setTimeout(syncClientFields, 0); });
    $("newClient")?.addEventListener("click", () => {
      setTimeout(() => {
        if ($("clientDefaultKind")) $("clientDefaultKind").value = "";
      }, 0);
    });
    $("newDocumentClient")?.addEventListener("change", applyClientDefaultsToNewDraft);
    $("refreshDocuments")?.addEventListener("click", () => { setTimeout(() => refreshLocalSettings().catch(() => {}), 350); });

    const issuerSelect = $("newIssuer");
    if (issuerSelect) {
      const observer = new MutationObserver(enforceActiveIssuerChoices);
      observer.observe(issuerSelect, { childList: true });
    }
  }

  async function boot() {
    ensureIssuerFields();
    ensureClientFields();
    bindForms();
    bindSyncHooks();
    try {
      await refreshLocalSettings();
    } catch {
      // The base Documents UI owns the primary error state.
    }
  }

  boot();
})();
