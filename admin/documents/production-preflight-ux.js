(() => {
  "use strict";

  if (window.SDLiveDocumentsProductionPreflightUx) return;
  window.SDLiveDocumentsProductionPreflightUx = true;

  const PREFLIGHT_API = "/api/admin/documents/production-preflight";
  const BOOTSTRAP_API = "/api/admin/documents/production-bootstrap";
  const BOOTSTRAP_CONFIRMATION = "BOOTSTRAP_SAMUEL_CC_21_AND_INV_0019";

  function installStyles() {
    if (document.getElementById("documentsProductionPreflightStyles")) return;
    const style = document.createElement("style");
    style.id = "documentsProductionPreflightStyles";
    style.textContent = `
      .documents-production-preflight{margin-top:14px;padding-top:14px;border-top:1px solid var(--border,rgba(255,255,255,.12))}
      .documents-production-preflight__head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .documents-production-preflight__buttons{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
      .documents-production-preflight__result{display:grid;gap:8px;margin-top:12px}
      .documents-production-preflight__row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:rgba(255,255,255,.025)}
      .documents-production-preflight__row strong{display:block}.documents-production-preflight__row span{display:block;margin-top:2px;color:#bdb6cb;font-size:.84rem}
      .documents-production-preflight__state{font-style:normal;font-weight:800;font-size:.75rem;letter-spacing:.08em}.documents-production-preflight__state.is-ready{color:#bceca8}.documents-production-preflight__state.is-blocked{color:#ffb4aa}
      .documents-production-preflight__note{margin-top:10px;color:#bdb6cb;font-size:.85rem;line-height:1.45}
    `;
    document.head.append(style);
  }

  function row(title, detail, ready) {
    const item = document.createElement("div");
    item.className = "documents-production-preflight__row";
    const copy = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = title;
    const span = document.createElement("span");
    span.textContent = detail;
    copy.append(strong, span);
    const state = document.createElement("em");
    state.className = `documents-production-preflight__state ${ready ? "is-ready" : "is-blocked"}`;
    state.textContent = ready ? "READY" : "BLOCKED";
    item.append(copy, state);
    return item;
  }

  function displayValue(series, number) {
    const value = Number(number);
    if (!Number.isSafeInteger(value) || value < 1) return series.intendedDisplay || "—";
    return series.displayPattern === "{n:04}" ? String(value).padStart(4, "0") : String(value);
  }

  function render(resultNode, data) {
    resultNode.replaceChildren();
    const storage = data.storage || { ready: data.storageReady === true, blockers: [] };
    const storageBlockers = (storage.blockers || [])
      .map((item) => [item.area, item.reason].filter(Boolean).join(":"))
      .filter(Boolean)
      .join(", ");
    const storageDetail = storage.ready
      ? "DOCS_DB + DOCS_BUCKET available · schema exact · TEST sequence identities valid."
      : `Storage blocker: ${storageBlockers || "storage_not_ready"}`;
    resultNode.append(row("Documents storage", storageDetail, Boolean(storage.ready)));

    for (const signature of data.signatures || []) {
      const detail = signature.ready
        ? "Active private signature object exists and its SHA-256 matches metadata."
        : `Signature blocker: ${signature.blocker || "unknown"}`;
      resultNode.append(row(`Signature · ${signature.issuerId || "issuer"}`, detail, Boolean(signature.ready)));
    }
    for (const series of data.series || []) {
      const current = series.sequenceState === "existing"
        ? `Current next ${displayValue(series, series.existingNextValue)}`
        : `Planned next ${series.intendedDisplay}`;
      const detail = series.ready
        ? `${current} · pattern ${series.displayPattern} · DB ${series.sequenceState} · no number collision`
        : `${current} · blocker: ${series.blocker || "unknown"}`;
      resultNode.append(row(series.seriesKey, detail, Boolean(series.ready)));
    }
  }

  function bootstrapState(data) {
    const series = data?.series || [];
    return {
      required: data?.ready === true && series.length > 0 && series.some((item) => item.sequenceState === "absent"),
      complete: data?.ready === true && series.length > 0 && series.every((item) => item.sequenceState === "existing")
    };
  }

  function setBootstrapVisibility(button, visible) {
    button.hidden = !visible;
    button.style.display = visible ? "inline-flex" : "none";
    button.disabled = !visible;
  }

  async function run(button, status, resultNode, note, bootstrapButton) {
    button.disabled = true;
    setBootstrapVisibility(bootstrapButton, false);
    status.textContent = "CHECKING";
    status.className = "documents-production-preflight__state";
    resultNode.replaceChildren();
    note.textContent = "Reading production Documents state. This operation performs no writes.";
    try {
      const response = await fetch(PREFLIGHT_API, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      status.textContent = data.ready ? "READY" : "BLOCKED";
      status.className = `documents-production-preflight__state ${data.ready ? "is-ready" : "is-blocked"}`;
      render(resultNode, data);
      const state = bootstrapState(data);
      setBootstrapVisibility(bootstrapButton, state.required);
      note.textContent = state.complete
        ? "Production sequences are active and still pass the read-only safety checks. Finalizing a real draft will consume the current next number."
        : (data.note || "Read-only preflight complete.");
    } catch (error) {
      status.textContent = "ERROR";
      status.className = "documents-production-preflight__state is-blocked";
      note.textContent = `Preflight failed: ${String(error?.message || error)}`;
      setBootstrapVisibility(bootstrapButton, false);
    } finally {
      button.disabled = false;
    }
  }

  async function bootstrapRealSeries(button, preflightButton, status, resultNode, note) {
    const confirmed = window.confirm(
      "Create the REAL Documents sequences now?\n\nCuenta de Cobro: next 21\nInvoice: next 0019\n\nThis creates sequence rows only. It does NOT issue a document, generate a PDF, or consume either number."
    );
    if (!confirmed) return;

    button.disabled = true;
    preflightButton.disabled = true;
    status.textContent = "BOOTSTRAPPING";
    status.className = "documents-production-preflight__state";
    note.textContent = "Running the owner-authorized production bootstrap. The server will re-run the full READY preflight before writing.";
    try {
      const response = await fetch(BOOTSTRAP_API, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: BOOTSTRAP_CONFIRMATION })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      note.textContent = "Production sequence bootstrap completed. Re-running the read-only postflight…";
      await run(preflightButton, status, resultNode, note, button);
    } catch (error) {
      status.textContent = "ERROR";
      status.className = "documents-production-preflight__state is-blocked";
      note.textContent = `Production bootstrap failed: ${String(error?.message || error)}. No document was issued.`;
      button.disabled = false;
      preflightButton.disabled = false;
    }
  }

  function install() {
    const sequenceList = document.getElementById("sequenceList");
    const card = sequenceList?.closest(".documents-card");
    if (!card || card.querySelector("[data-production-preflight]")) return;
    installStyles();

    const section = document.createElement("div");
    section.className = "documents-production-preflight";
    section.dataset.productionPreflight = "true";

    const head = document.createElement("div");
    head.className = "documents-production-preflight__head";
    const copy = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Production gate";
    const title = document.createElement("strong");
    title.textContent = "Real-series health";
    copy.append(eyebrow, title);

    const status = document.createElement("em");
    status.className = "documents-production-preflight__state";
    status.textContent = "NOT RUN";
    head.append(copy, status);

    const buttons = document.createElement("div");
    buttons.className = "documents-production-preflight__buttons";

    const preflightButton = document.createElement("button");
    preflightButton.type = "button";
    preflightButton.className = "button button--ghost";
    preflightButton.textContent = "Run production preflight";

    const bootstrapButton = document.createElement("button");
    bootstrapButton.type = "button";
    bootstrapButton.className = "button";
    bootstrapButton.textContent = "Bootstrap real series · CC 21 + INV 0019";
    setBootstrapVisibility(bootstrapButton, false);
    buttons.append(preflightButton, bootstrapButton);

    const resultNode = document.createElement("div");
    resultNode.className = "documents-production-preflight__result";
    const note = document.createElement("p");
    note.className = "documents-production-preflight__note";
    note.textContent = "Checks storage, real sequence state, number collisions and each private active signature.";

    preflightButton.addEventListener("click", () => run(preflightButton, status, resultNode, note, bootstrapButton));
    bootstrapButton.addEventListener("click", () => bootstrapRealSeries(bootstrapButton, preflightButton, status, resultNode, note));
    section.append(head, buttons, resultNode, note);
    card.append(section);
  }

  install();
  const observer = new MutationObserver(install);
  observer.observe(document.body, { childList: true, subtree: true });
})();
