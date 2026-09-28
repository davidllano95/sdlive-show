(() => {
  "use strict";

  if (window.SDLiveDocumentsProductionPreflightUx) return;
  window.SDLiveDocumentsProductionPreflightUx = true;

  const API = "/api/admin/documents/production-preflight";

  function installStyles() {
    if (document.getElementById("documentsProductionPreflightStyles")) return;
    const style = document.createElement("style");
    style.id = "documentsProductionPreflightStyles";
    style.textContent = `
      .documents-production-preflight{margin-top:14px;padding-top:14px;border-top:1px solid var(--border,rgba(255,255,255,.12))}
      .documents-production-preflight__head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
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

  function render(resultNode, data) {
    resultNode.replaceChildren();
    for (const signature of data.signatures || []) {
      const detail = signature.ready
        ? "Active private signature object exists and its SHA-256 matches metadata."
        : `Signature blocker: ${signature.blocker || "unknown"}`;
      resultNode.append(row(`Signature · ${signature.issuerId || "issuer"}`, detail, Boolean(signature.ready)));
    }
    for (const series of data.series || []) {
      const detail = series.ready
        ? `Planned next ${series.intendedDisplay} · pattern ${series.displayPattern} · DB ${series.sequenceState} · no number collision`
        : `Planned next ${series.intendedDisplay} · blocker: ${series.blocker || "unknown"}`;
      resultNode.append(row(series.seriesKey, detail, Boolean(series.ready)));
    }
  }

  async function run(button, status, resultNode, note) {
    button.disabled = true;
    status.textContent = "CHECKING";
    status.className = "documents-production-preflight__state";
    resultNode.replaceChildren();
    note.textContent = "Reading production Documents state. This operation performs no writes.";
    try {
      const response = await fetch(API, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      status.textContent = data.ready ? "READY" : "BLOCKED";
      status.className = `documents-production-preflight__state ${data.ready ? "is-ready" : "is-blocked"}`;
      render(resultNode, data);
      note.textContent = data.note || "Read-only preflight complete.";
    } catch (error) {
      status.textContent = "ERROR";
      status.className = "documents-production-preflight__state is-blocked";
      note.textContent = `Preflight failed: ${String(error?.message || error)}`;
    } finally {
      button.disabled = false;
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
    title.textContent = "Read-only real-series preflight";
    copy.append(eyebrow, title);

    const status = document.createElement("em");
    status.className = "documents-production-preflight__state";
    status.textContent = "NOT RUN";
    head.append(copy, status);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "button button--ghost";
    button.textContent = "Run production preflight";
    button.style.marginTop = "10px";

    const resultNode = document.createElement("div");
    resultNode.className = "documents-production-preflight__result";
    const note = document.createElement("p");
    note.className = "documents-production-preflight__note";
    note.textContent = "Checks real sequence state, number collisions and the private active signature. It cannot bootstrap or issue a real number.";

    button.addEventListener("click", () => run(button, status, resultNode, note));
    section.append(head, button, resultNode, note);
    card.append(section);
  }

  install();
  const observer = new MutationObserver(install);
  observer.observe(document.body, { childList: true, subtree: true });
})();
