(() => {
  "use strict";

  const API = "/api/admin/documents";
  let state = null;

  const $ = (id) => document.getElementById(id);

  function message(id, text, type = "") {
    const node = $(id);
    if (!node) return;
    node.textContent = text || "";
    node.className = `documents-message${type ? ` is-${type}` : ""}`;
  }

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

  function issuerToForm(profile) {
    if (!profile) return;
    $("issuerId").value = profile.id || "samuel";
    $("issuerLegalName").value = profile.legalName || "";
    $("issuerIdType").value = profile.idType || "";
    $("issuerIdNumber").value = profile.idNumber || "";
    $("issuerVatLabel").value = profile.vatLabel || "";
    $("issuerCiiu").value = profile.ciiu || "";
    $("issuerPhone").value = profile.phone || "";
    $("issuerEmail").value = profile.email || "";
    $("issuerAddress").value = profile.addresses?.[0]?.text || profile.addresses?.[0] || "";
    $("issuerBrandLabel").value = profile.brandLabel || "";
  }

  function issuerPayload() {
    const address = $("issuerAddress").value.trim();
    return {
      legalName: $("issuerLegalName").value.trim(),
      idType: $("issuerIdType").value.trim(),
      idNumber: $("issuerIdNumber").value.trim(),
      vatLabel: $("issuerVatLabel").value.trim(),
      ciiu: $("issuerCiiu").value.trim(),
      phone: $("issuerPhone").value.trim(),
      email: $("issuerEmail").value.trim(),
      addresses: address ? [{ text: address }] : [],
      bank: state?.issuers?.find((item) => item.id === $("issuerId").value.trim())?.bank || {},
      brandLabel: $("issuerBrandLabel").value.trim(),
      active: true
    };
  }

  function clientToForm(profile = null) {
    $("clientId").value = profile?.id || "";
    $("clientDisplayName").value = profile?.displayName || "";
    $("clientLegalName").value = profile?.legalName || "";
    $("clientTaxIdType").value = profile?.taxIdType || "";
    $("clientTaxId").value = profile?.taxId || "";
    $("clientCurrency").value = profile?.defaultCurrency || "";
    $("clientPoPolicy").value = profile?.poPolicy || "none";
    $("clientTerms").value = profile?.paymentTermsDays ?? "";
    $("clientCountry").value = profile?.country || "";
    $("clientBillingAddress").value = profile?.billingAddress || "";
    $("clientShowBank").checked = Boolean(profile?.showBankDetails);
  }

  function clientPayload() {
    return {
      displayName: $("clientDisplayName").value.trim(),
      legalName: $("clientLegalName").value.trim(),
      taxIdType: $("clientTaxIdType").value.trim(),
      taxId: $("clientTaxId").value.trim(),
      defaultCurrency: $("clientCurrency").value,
      poPolicy: $("clientPoPolicy").value,
      paymentTermsDays: $("clientTerms").value === "" ? null : Number($("clientTerms").value),
      country: $("clientCountry").value.trim(),
      billingAddress: $("clientBillingAddress").value.trim(),
      showBankDetails: $("clientShowBank").checked,
      financeAliases: []
    };
  }

  function renderClients() {
    const list = $("clientList");
    const clients = state?.clients || [];
    $("clientCount").textContent = `${clients.length} client${clients.length === 1 ? "" : "s"}`;
    list.replaceChildren();
    if (!clients.length) {
      const empty = document.createElement("div");
      empty.className = "documents-empty";
      empty.textContent = "No client profiles yet.";
      list.append(empty);
      return;
    }
    for (const client of clients) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "client-row";
      const label = document.createElement("div");
      const strong = document.createElement("strong");
      strong.textContent = client.displayName;
      const detail = document.createElement("span");
      detail.textContent = [client.legalName, client.taxId].filter(Boolean).join(" · ");
      label.append(strong, detail);
      const currency = document.createElement("small");
      currency.textContent = client.defaultCurrency || "—";
      button.append(label, currency);
      button.addEventListener("click", () => clientToForm(client));
      list.append(button);
    }
  }

  function renderSequences() {
    const node = $("sequenceList");
    node.replaceChildren();
    const current = state?.sequences || [];
    const real = state?.intendedRealSequences || [];
    for (const seq of current.filter((item) => item.isTest)) {
      const row = document.createElement("div");
      row.className = "sequence-item";
      const left = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = seq.seriesKey;
      const meta = document.createElement("span");
      meta.textContent = `Next ${seq.nextValue} · ${seq.displayPattern}`;
      left.append(title, meta);
      const stateLabel = document.createElement("em");
      stateLabel.textContent = "TEST";
      row.append(left, stateLabel);
      node.append(row);
    }
    for (const seq of real) {
      const row = document.createElement("div");
      row.className = "sequence-item";
      const left = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = seq.seriesKey;
      const meta = document.createElement("span");
      const next = seq.bootstrapped && Number.isSafeInteger(Number(seq.currentNextValue))
        ? `Current next ${seq.currentNextValue}`
        : `Planned next ${seq.intendedNextValue}`;
      meta.textContent = `${next} · ${seq.displayPattern}`;
      left.append(title, meta);
      const stateLabel = document.createElement("span");
      stateLabel.textContent = seq.bootstrapped ? "ACTIVE" : "LOCKED";
      row.append(left, stateLabel);
      node.append(row);
    }
  }

  function render() {
    $("identity").textContent = state?.actor || "Authenticated";
    const ready = state?.storage?.ready === true;
    $("documentsStatus").classList.toggle("is-ok", ready);
    $("documentsStatus").querySelector("span").textContent = ready ? "Documents storage ready" : "Documents storage needs attention";
    const issuers = state?.issuers || [];
    $("issuerCount").textContent = `${issuers.length} profile${issuers.length === 1 ? "" : "s"}`;
    issuerToForm(issuers.find((item) => item.id === "samuel") || issuers[0] || null);
    const activeIssuer = issuers.find((item) => item.id === $("issuerId").value.trim());
    const signatures = state?.signatures || [];
    const activeSignature = activeIssuer?.activeSignatureId
      ? signatures.find((item) => item.id === activeIssuer.activeSignatureId)
      : null;
    $("signatureState").textContent = activeSignature ? "Active" : "Not loaded";
    $("signatureState").classList.toggle("is-safe", Boolean(activeSignature));
    renderClients();
    renderSequences();
  }

  async function refresh() {
    const button = $("refreshDocuments");
    if (button) button.disabled = true;
    try {
      state = await api("/settings");
      render();
    } catch (error) {
      $("documentsStatus").querySelector("span").textContent = `Error: ${error.message}`;
    } finally {
      if (button) button.disabled = false;
    }
  }

  $("issuerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message("issuerMessage", "Saving…");
    const id = $("issuerId").value.trim();
    try {
      await api(`/issuers/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issuerPayload())
      });
      message("issuerMessage", "Saved", "success");
      await refresh();
    } catch (error) {
      message("issuerMessage", error.message, "error");
    }
  });

  $("signatureForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const issuerId = $("issuerId").value.trim();
    const file = $("signatureFile").files?.[0];
    if (!issuerId || !file) return;
    message("signatureMessage", "Uploading privately…");
    const form = new FormData();
    form.set("issuerId", issuerId);
    form.set("file", file);
    try {
      await api("/signatures/upload", { method: "POST", body: form });
      $("signatureFile").value = "";
      message("signatureMessage", "Uploaded & active", "success");
      await refresh();
    } catch (error) {
      message("signatureMessage", error.message, "error");
    }
  });

  $("clientForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    message("clientMessage", "Saving…");
    const id = $("clientId").value.trim();
    try {
      if (id) {
        await api(`/clients/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientPayload())
        });
      } else {
        await api("/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clientPayload())
        });
      }
      message("clientMessage", "Saved", "success");
      clientToForm();
      await refresh();
    } catch (error) {
      message("clientMessage", error.message, "error");
    }
  });

  $("newClient").addEventListener("click", () => {
    clientToForm();
    message("clientMessage", "");
  });

  $("ensureTestSequences").addEventListener("click", async () => {
    const button = $("ensureTestSequences");
    button.disabled = true;
    button.textContent = "Verifying…";
    try {
      await api("/sequences/test-ensure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "ENSURE_TEST_DOCUMENT_SEQUENCES" })
      });
      await refresh();
      button.textContent = "Test series verified";
    } catch (error) {
      button.textContent = `Failed: ${error.message}`;
    } finally {
      button.disabled = false;
      setTimeout(() => { button.textContent = "Verify test series"; }, 2200);
    }
  });

  $("refreshDocuments").addEventListener("click", refresh);
  refresh();
})();