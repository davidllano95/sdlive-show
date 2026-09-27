(() => {
  "use strict";

  const API = "/api/admin/documents";
  const $ = (id) => document.getElementById(id);
  let settings = null;
  let registry = [];
  let activeDocument = null;
  let saveTimer = null;
  let saving = false;
  let saveQueued = false;

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, { credentials: "include", cache: "no-store", ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const error = new Error(data?.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  function setTab(tab) {
    const documents = tab === "documents";
    $("documentsWorkspace").hidden = !documents;
    $("settingsWorkspace").hidden = documents;
    $("documentsTab").classList.toggle("is-active", documents);
    $("settingsTab").classList.toggle("is-active", !documents);
  }

  function localToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function majorToMinor(value) {
    const normalized = String(value ?? "").replace(/,/g, "").trim();
    if (!normalized) return 0;
    const number = Number(normalized);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.round(number * 100);
  }

  function minorToMajor(value) {
    const number = Number(value || 0) / 100;
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
  }

  function selectedProfile(list, id) {
    return (list || []).find((item) => item.id === id) || null;
  }

  function primaryAddress(issuer) {
    const first = issuer?.addresses?.[0];
    return typeof first === "string" ? first : (first?.text || "");
  }

  function issuerOverrideFromProfile(profile) {
    return {
      legalName: profile?.legalName || "",
      idType: profile?.idType || "",
      idNumber: profile?.idNumber || "",
      vatLabel: profile?.vatLabel || "",
      ciiu: profile?.ciiu || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      address: primaryAddress(profile),
      brandLabel: profile?.brandLabel || ""
    };
  }

  function clientOverrideFromProfile(profile) {
    return {
      legalName: profile?.legalName || "",
      taxIdType: profile?.taxIdType || "",
      taxId: profile?.taxId || "",
      billingAddress: profile?.billingAddress || "",
      phone: profile?.phone || ""
    };
  }

  function preferredIssuerForKind(kindId) {
    const preferred = kindId === "cc-co-es" ? "samuel-cop" : "samuel-usd";
    return (settings?.issuers || []).find((item) => item.id === preferred && item.active !== false)
      || (settings?.issuers || []).find((item) => item.active !== false)
      || null;
  }

  function populateCreateSelectors() {
    const issuerSelect = $("newIssuer");
    const clientSelect = $("newDocumentClient");
    issuerSelect.replaceChildren();
    clientSelect.replaceChildren(new Option("Document-only client", ""));
    for (const issuer of (settings?.issuers || []).filter((item) => item.active !== false)) {
      issuerSelect.add(new Option(`${issuer.legalName} · ${issuer.id}`, issuer.id));
    }
    for (const client of settings?.clients || []) clientSelect.add(new Option(client.displayName || client.legalName, client.id));
    const preferred = preferredIssuerForKind($("newKind")?.value || "cc-co-es");
    if (preferred) issuerSelect.value = preferred.id;
    $("newDraft").disabled = issuerSelect.options.length === 0;
  }

  function renderRegistry() {
    const node = $("registryList");
    node.replaceChildren();
    if (!registry.length) {
      const empty = document.createElement("div");
      empty.className = "documents-empty";
      empty.textContent = (settings?.issuers || []).length ? "No documents yet. Create the first draft." : "Create an issuer profile in Settings before creating a draft.";
      node.append(empty);
      return;
    }
    for (const document of registry) {
      const button = documentCreate("button", "registry-row");
      button.type = "button";
      const main = documentCreate("div", "registry-row__main");
      const title = documentCreate("strong");
      title.textContent = document.displayNumber || (document.status === "draft" ? "Draft · no number" : document.id);
      const detail = documentCreate("span");
      detail.textContent = [document.clientName || "No client", document.projectLabel, document.issueDate].filter(Boolean).join(" · ");
      main.append(title, detail);
      const meta = documentCreate("div", "registry-row__meta");
      const status = documentCreate("em");
      status.textContent = document.status.toUpperCase();
      const amount = documentCreate("span");
      amount.textContent = `${document.currency} ${minorToMajor(document.totalMinor)}`;
      meta.append(status, amount);
      button.append(main, meta);
      button.addEventListener("click", () => openDocument(document.id));
      node.append(button);
    }
  }

  function documentCreate(tag, className = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function lineField(labelText, control, extraClass = "") {
    const label = documentCreate("label", `line-field${extraClass ? ` ${extraClass}` : ""}`);
    const caption = documentCreate("span", "line-field__label");
    caption.textContent = labelText;
    label.append(caption, control);
    return label;
  }

  function lineTemplate(line = {}, currency = "COP", kindId = activeDocument?.kindId || "cc-co-es") {
    const row = documentCreate("div", "draft-line");
    row.dataset.lineId = line.id || `line-${crypto.randomUUID()}`;
    const kinds = [
      ["professional_service", "Service"], ["equipment", "Equipment"], ["per_diem", "Per diem"],
      ["transport", "Transport"], ["reimbursable", "Reimbursable"], ["other", "Other"]
    ];
    const kind = documentCreate("select", "line-kind");
    for (const [value, label] of kinds) kind.add(new Option(label, value));
    kind.value = line.kind || "professional_service";

    const description = documentCreate("input", "line-description");
    description.placeholder = "Description";
    description.value = line.description || "";

    const quantity = documentCreate("input", "line-quantity");
    quantity.type = "number";
    quantity.step = "1";
    quantity.min = "0";
    quantity.placeholder = "0";
    quantity.value = Number.isSafeInteger(Number(line.quantity)) && Number(line.quantity) >= 0 ? String(Number(line.quantity)) : "0";

    const unit = documentCreate("input", "line-unit");
    unit.placeholder = kindId === "cc-co-es" ? "servicio / día / unidad" : "service / day / unit";
    unit.value = line.unit || "";

    const effectiveQuantity = Number(quantity.value) > 0 ? Number(quantity.value) : 1;
    const derivedUnitMinor = line.unitMinor == null ? Math.round(Number(line.amountMinor || 0) / effectiveQuantity) : Number(line.unitMinor);
    const rate = documentCreate("input", "line-rate");
    rate.type = "number";
    rate.step = "0.01";
    rate.min = "0";
    rate.placeholder = "0.00";
    rate.value = minorToMajor(derivedUnitMinor);

    const total = documentCreate("output", "line-total");
    const updateTotal = () => {
      const rawQuantity = Math.max(0, Math.trunc(Number(quantity.value) || 0));
      const multiplier = rawQuantity > 0 ? rawQuantity : 1;
      total.value = `${currency} ${minorToMajor(majorToMinor(rate.value) * multiplier)}`;
      total.textContent = total.value;
    };
    updateTotal();

    const date = documentCreate("input", "line-date");
    date.type = "date";
    date.value = line.serviceDate || "";

    const dateEnd = documentCreate("input", "line-date-end");
    dateEnd.type = "date";
    dateEnd.value = line.serviceDateEnd || "";

    const po = documentCreate("input", "line-po");
    po.placeholder = "PO / reference";
    po.value = line.poNumber || line.reference || "";

    const original = documentCreate("input", "line-original");
    original.type = "number";
    original.step = "0.01";
    original.min = "0";
    original.placeholder = "0.00";
    original.value = line.originalAmountMinor == null ? "" : minorToMajor(line.originalAmountMinor);

    const originalCurrency = documentCreate("select", "line-original-currency");
    originalCurrency.add(new Option("—", ""));
    originalCurrency.add(new Option("COP", "COP"));
    originalCurrency.add(new Option("USD", "USD"));
    originalCurrency.value = line.originalCurrency || "";

    const remove = documentCreate("button", "line-remove");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.title = "Remove line";
    remove.addEventListener("click", () => { row.remove(); scheduleSave(); });

    quantity.addEventListener("input", updateTotal);
    rate.addEventListener("input", updateTotal);
    const controls = [kind, description, quantity, unit, rate, date, dateEnd, po];
    if (kindId === "invoice-intl-en") controls.push(original, originalCurrency);
    for (const control of controls) {
      control.addEventListener("input", scheduleSave);
      control.addEventListener("change", scheduleSave);
    }

    const fields = [
      lineField("Type", kind),
      lineField("Description", description, "line-field--description"),
      lineField("Qty · 0 = hidden", quantity),
      lineField("Unit (optional)", unit),
      lineField("Rate", rate),
      lineField("Line total", total),
      lineField("Date from (optional)", date),
      lineField("Date to (optional)", dateEnd),
      lineField("PO / reference (optional)", po)
    ];
    if (kindId === "invoice-intl-en") {
      fields.push(
        lineField("Original expense currency (optional)", originalCurrency),
        lineField("Original expense amount (optional)", original)
      );
    }
    fields.push(remove);
    row.append(...fields);
    return row;
  }

  function renderLines(lines, currency) {
    const node = $("draftLines");
    node.replaceChildren();
    const source = Array.isArray(lines) && lines.length ? lines : [{ kind: "professional_service", description: "", quantity: 0, unitMinor: 0, amountMinor: 0 }];
    for (const line of source) node.append(lineTemplate(line, currency, activeDocument?.kindId));
  }

  function readLines() {
    return Array.from($("draftLines").querySelectorAll(".draft-line")).map((row) => {
      const quantityInput = row.querySelector(".line-quantity").value.trim();
      const quantity = quantityInput === "" ? 0 : Math.max(0, Math.trunc(Number(quantityInput) || 0));
      const multiplier = quantity > 0 ? quantity : 1;
      const unitMinor = majorToMinor(row.querySelector(".line-rate").value);
      const amountMinor = unitMinor * multiplier;
      const originalCurrencyControl = row.querySelector(".line-original-currency");
      const originalAmountControl = row.querySelector(".line-original");
      const originalCurrency = originalCurrencyControl?.value || "";
      return {
        id: row.dataset.lineId,
        kind: row.querySelector(".line-kind").value,
        description: row.querySelector(".line-description").value.trim(),
        quantity,
        unit: row.querySelector(".line-unit").value.trim() || null,
        unitMinor,
        amountMinor,
        serviceDate: row.querySelector(".line-date").value || null,
        serviceDateEnd: row.querySelector(".line-date-end").value || null,
        poNumber: row.querySelector(".line-po").value.trim() || null,
        reference: null,
        originalCurrency: originalCurrency || null,
        originalAmountMinor: originalCurrency && originalAmountControl?.value !== "" ? majorToMinor(originalAmountControl.value) : null
      };
    });
  }

  function formDraft() {
    return {
      kindId: activeDocument.kindId,
      currency: $("draftCurrency").value,
      issueDate: $("draftIssueDate").value,
      issueCity: $("draftIssueCity").value.trim(),
      projectLabel: $("draftProject").value.trim(),
      purchaseOrder: $("draftPO").value.trim(),
      dueDate: $("draftDueDate").value || null,
      terms: $("draftTerms").value.trim() || null,
      amountWordsOverride: $("draftAmountWords").value.trim() || null,
      usesCostsDeductions: $("draftUsesCosts").checked,
      showBankDetails: $("draftShowBank").checked,
      notes: $("draftNotes").value.trim() || null,
      issuerOverride: {
        legalName: $("draftIssuerName").value.trim(), idType: $("draftIssuerIdType").value.trim(), idNumber: $("draftIssuerIdNumber").value.trim(),
        address: $("draftIssuerAddress").value.trim(), phone: $("draftIssuerPhone").value.trim(), email: $("draftIssuerEmail").value.trim(), brandLabel: $("draftBrandLabel").value.trim()
      },
      clientOverride: {
        legalName: $("draftClientName").value.trim(), taxIdType: $("draftClientTaxType").value.trim(), taxId: $("draftClientTaxId").value.trim(),
        billingAddress: $("draftClientAddress").value.trim(), phone: $("draftClientPhone").value.trim()
      },
      lines: readLines()
    };
  }

  function hydrateEditor(document) {
    activeDocument = document;
    const draft = document.draft || {};
    const issuerProfile = selectedProfile(settings?.issuers, document.issuerId);
    const clientProfile = selectedProfile(settings?.clients, document.clientId);
    const issuer = { ...issuerOverrideFromProfile(issuerProfile), ...(draft.issuerOverride || {}) };
    const client = { ...clientOverrideFromProfile(clientProfile), ...(draft.clientOverride || {}) };
    $("draftId").value = document.id;
    $("draftRev").value = document.draftRev;
    $("draftRevChip").textContent = `rev ${document.draftRev}`;
    $("editorKindLabel").textContent = document.kindId === "cc-co-es" ? "Cuenta de cobro · Colombia · ES" : "Invoice · International · EN";
    $("editorTitle").textContent = document.clientName || client.legalName || "Untitled draft";
    $("previewTemplate").textContent = document.kindId === "cc-co-es" ? "cc-co-es@1" : "invoice-intl-en@1";
    $("draftIssuerName").value = issuer.legalName || ""; $("draftIssuerIdType").value = issuer.idType || ""; $("draftIssuerIdNumber").value = issuer.idNumber || "";
    $("draftIssuerAddress").value = issuer.address || ""; $("draftIssuerPhone").value = issuer.phone || ""; $("draftIssuerEmail").value = issuer.email || ""; $("draftBrandLabel").value = issuer.brandLabel || "";
    $("draftClientName").value = client.legalName || ""; $("draftClientTaxType").value = client.taxIdType || ""; $("draftClientTaxId").value = client.taxId || ""; $("draftClientAddress").value = client.billingAddress || ""; $("draftClientPhone").value = client.phone || "";
    $("draftIssueDate").value = draft.issueDate || ""; $("draftIssueCity").value = draft.issueCity || ""; $("draftProject").value = draft.projectLabel || ""; $("draftPO").value = draft.purchaseOrder || "";
    $("draftCurrency").value = document.currency; $("draftDueDate").value = draft.dueDate || ""; $("draftTerms").value = draft.terms || ""; $("draftAmountWords").value = draft.amountWordsOverride || "";
    $("draftUsesCosts").checked = Boolean(draft.usesCostsDeductions); $("draftShowBank").checked = draft.showBankDetails == null ? Boolean(clientProfile?.showBankDetails) : Boolean(draft.showBankDetails); $("draftNotes").value = draft.notes || "";
    renderLines(draft.lines, document.currency);
    $("documentEditor").hidden = false;
  }

  async function refreshPreview() {
    if (!activeDocument) return;
    try {
      const result = await api(`/${encodeURIComponent(activeDocument.id)}/preview`);
      $("draftPreview").srcdoc = result.html;
    } catch (error) {
      $("draftPreview").srcdoc = `<p style="font-family:sans-serif;padding:24px">Preview unavailable: ${String(error.message).replace(/[<>]/g, "")}</p>`;
    }
  }

  async function openDocument(id) {
    const result = await api(`/${encodeURIComponent(id)}`);
    hydrateEditor(result.document);
    await refreshPreview();
    $("documentEditor").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveDraft({ manual = false } = {}) {
    if (!activeDocument) return;
    if (saving) { saveQueued = true; return; }
    saving = true;
    $("draftSaveState").textContent = manual ? "Saving…" : "Autosaving…";
    try {
      const result = await api(`/${encodeURIComponent(activeDocument.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftRev: activeDocument.draftRev, clientId: activeDocument.clientId, currency: $("draftCurrency").value, draft: formDraft() })
      });
      activeDocument = result.document;
      $("draftRev").value = activeDocument.draftRev;
      $("draftRevChip").textContent = `rev ${activeDocument.draftRev}`;
      $("draftSaveState").textContent = "Saved";
      await refreshPreview();
      await refreshRegistry();
    } catch (error) {
      $("draftSaveState").textContent = error.message === "stale_draft_revision" ? "Conflict · refresh required" : `Error · ${error.message}`;
    } finally {
      saving = false;
      if (saveQueued) { saveQueued = false; saveDraft(); }
    }
  }

  function scheduleSave() {
    if (!activeDocument) return;
    clearTimeout(saveTimer);
    $("draftSaveState").textContent = "Unsaved changes";
    saveTimer = setTimeout(() => saveDraft(), 700);
  }

  async function refreshRegistry() {
    const result = await api("/registry");
    registry = result.documents || [];
    renderRegistry();
  }

  async function boot() {
    try {
      settings = await api("/settings");
      populateCreateSelectors();
      await refreshRegistry();
    } catch (error) {
      $("registryList").textContent = `Documents unavailable: ${error.message}`;
    }
  }

  $("documentsTab").addEventListener("click", () => setTab("documents"));
  $("settingsTab").addEventListener("click", () => setTab("settings"));
  $("newDraft").addEventListener("click", () => { $("newDraftPanel").hidden = false; });
  $("cancelNewDraft").addEventListener("click", () => { $("newDraftPanel").hidden = true; });
  $("newKind").addEventListener("change", () => {
    const kindId = $("newKind").value;
    $("newCurrency").value = kindId === "cc-co-es" ? "COP" : "USD";
    const preferred = preferredIssuerForKind(kindId);
    if (preferred && Array.from($("newIssuer").options).some((option) => option.value === preferred.id)) $("newIssuer").value = preferred.id;
  });
  $("newDocumentClient").addEventListener("change", () => {
    const client = selectedProfile(settings?.clients, $("newDocumentClient").value);
    if (client?.defaultCurrency) $("newCurrency").value = client.defaultCurrency;
  });

  $("newDraftForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const issuer = selectedProfile(settings?.issuers, $("newIssuer").value);
    const client = selectedProfile(settings?.clients, $("newDocumentClient").value);
    if (!issuer) { $("newDraftMessage").textContent = "Create an issuer profile first."; return; }
    $("newDraftMessage").textContent = "Creating…";
    try {
      const kindId = $("newKind").value;
      const currency = $("newCurrency").value;
      const draft = {
        kindId, currency, issueDate: localToday(), issueCity: "Bogotá, Colombia",
        projectLabel: "", purchaseOrder: "", usesCostsDeductions: false, showBankDetails: client?.showBankDetails ?? (kindId === "invoice-intl-en"), notes: null,
        issuerOverride: issuerOverrideFromProfile(issuer), clientOverride: clientOverrideFromProfile(client),
        lines: [{ id: `line-${crypto.randomUUID()}`, kind: "professional_service", description: "", quantity: 0, unit: null, unitMinor: 0, amountMinor: 0, serviceDate: null, serviceDateEnd: null, poNumber: null }]
      };
      const result = await api("/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kindId, issuerId: issuer.id, clientId: client?.id || null, currency, draft }) });
      $("newDraftPanel").hidden = true;
      $("newDraftMessage").textContent = "";
      await refreshRegistry();
      hydrateEditor(result.document);
      await refreshPreview();
    } catch (error) {
      $("newDraftMessage").textContent = error.message;
    }
  });

  $("draftForm").addEventListener("submit", (event) => { event.preventDefault(); clearTimeout(saveTimer); saveDraft({ manual: true }); });
  $("draftForm").addEventListener("input", (event) => { if (!event.target.closest(".draft-line")) scheduleSave(); });
  $("addDraftLine").addEventListener("click", () => { $("draftLines").append(lineTemplate({}, $("draftCurrency").value, activeDocument?.kindId)); scheduleSave(); });
  $("closeEditor").addEventListener("click", () => { clearTimeout(saveTimer); activeDocument = null; $("documentEditor").hidden = true; });

  setTab("documents");
  boot();
})();