(() => {
  "use strict";

  if (window.SDLiveDocumentsTestCleanupUx) return;
  window.SDLiveDocumentsTestCleanupUx = true;

  const PREFLIGHT_API = "/api/admin/documents/test-data-preflight";
  const PURGE_API = "/api/admin/documents/test-data-purge";
  const CONFIRMATION = "PURGE_DOCUMENTS_TEST_DATA";
  let lastPreflight = null;

  function installStyles() {
    if (document.getElementById("documentsTestCleanupStyles")) return;
    const style = document.createElement("style");
    style.id = "documentsTestCleanupStyles";
    style.textContent = `
      .documents-test-cleanup{margin-top:16px;padding-top:16px;border-top:1px solid var(--border,rgba(255,255,255,.12))}
      .documents-test-cleanup__head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .documents-test-cleanup__head strong{display:block;margin-top:3px}
      .documents-test-cleanup__state{font-style:normal;font-weight:800;font-size:.75rem;letter-spacing:.08em;color:var(--soft)}
      .documents-test-cleanup__state.is-ready{color:#bceca8}.documents-test-cleanup__state.is-blocked{color:#ffb4aa}
      .documents-test-cleanup__actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
      .documents-test-cleanup__summary{margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.025);font-size:.84rem;line-height:1.5;color:#c8c1d4}
      .documents-test-cleanup__summary strong{color:var(--text)}
      .documents-test-cleanup__note{margin:10px 0 0;color:#bdb6cb;font-size:.82rem;line-height:1.45}
      .documents-test-cleanup__purge{border-color:rgba(255,107,74,.35)!important;background:rgba(255,107,74,.12)!important;color:#ffb5a4!important}
      @media(max-width:820px){.documents-test-cleanup__actions{display:grid;grid-template-columns:1fr}.documents-test-cleanup__actions .button{min-height:46px!important}.documents-test-cleanup__head{align-items:center}}
    `;
    document.head.appendChild(style);
  }

  function countLine(counts = {}) {
    return [
      `${counts.documents || 0} documents`,
      `${counts.drafts || 0} drafts`,
      `${counts.finalized || 0} finalized`,
      `${counts.void || 0} void`,
      `${counts.privateArtifacts || 0} private PDFs/artifacts`,
      `${counts.revisionSequences || 0} revision counters`,
      `${counts.events || 0} events`
    ].join(" · ");
  }

  function renderSummary(node, data) {
    node.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = data.ready ? "TEST-only set verified" : "Cleanup blocked";
    const detail = document.createElement("div");
    detail.textContent = countLine(data.counts);
    node.append(strong, detail);
    if (data.blockers?.length) {
      const blockers = document.createElement("div");
      blockers.style.marginTop = "7px";
      blockers.textContent = `Blockers: ${data.blockers.map((item) => [item.area, item.reason].filter(Boolean).join(":" )).join(", ")}`;
      node.append(blockers);
    }
  }

  async function runPreflight(scanButton, purgeButton, state, summary, note) {
    scanButton.disabled = true;
    purgeButton.hidden = true;
    purgeButton.disabled = true;
    state.textContent = "SCANNING";
    state.className = "documents-test-cleanup__state";
    note.textContent = "Read-only scan. No TEST or production data is being changed.";
    try {
      const response = await fetch(PREFLIGHT_API, { credentials: "include", cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      lastPreflight = data;
      renderSummary(summary, data);
      state.textContent = data.ready ? "READY" : "BLOCKED";
      state.className = `documents-test-cleanup__state ${data.ready ? "is-ready" : "is-blocked"}`;
      const hasAnything = Number(data.counts?.documents || 0) > 0 || Number(data.counts?.revisionSequences || 0) > 0 || (data.testSequences || []).some((item) => Number(item.nextValue) !== 1);
      purgeButton.hidden = !(data.ready && hasAnything);
      purgeButton.disabled = !(data.ready && hasAnything);
      note.textContent = hasAnything
        ? (data.note || "Dry-run complete.")
        : "TEST workspace is already clean. Root TEST counters are at their clean baseline.";
    } catch (error) {
      lastPreflight = null;
      state.textContent = "ERROR";
      state.className = "documents-test-cleanup__state is-blocked";
      summary.textContent = "";
      note.textContent = `TEST cleanup scan failed: ${String(error?.message || error)}`;
    } finally {
      scanButton.disabled = false;
    }
  }

  async function purge(scanButton, purgeButton, state, summary, note) {
    if (!lastPreflight?.ready || !lastPreflight.fingerprint) return;
    const counts = lastPreflight.counts || {};
    const confirmed = window.confirm(
      `Permanently purge the TEST Documents workspace?\n\n` +
      `${counts.documents || 0} TEST documents\n` +
      `${counts.privateArtifacts || 0} private TEST PDF/artifact objects\n` +
      `${counts.events || 0} TEST events\n` +
      `${counts.revisionSequences || 0} TEST revision counters\n\n` +
      `test:CC and test:INV will reset to 1.\n\n` +
      `REAL sequences samuel:CC and samuel:INV are excluded and cannot be deleted by this operation.`
    );
    if (!confirmed) return;

    scanButton.disabled = true;
    purgeButton.disabled = true;
    state.textContent = "PURGING";
    state.className = "documents-test-cleanup__state";
    note.textContent = "Deleting only the exact TEST-only set verified by the dry-run fingerprint…";
    try {
      const response = await fetch(PURGE_API, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: CONFIRMATION, fingerprint: lastPreflight.fingerprint })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      state.textContent = "CLEAN";
      state.className = "documents-test-cleanup__state is-ready";
      summary.innerHTML = `<strong>TEST workspace purged</strong><div>${countLine(data.counts || {})}</div>`;
      note.textContent = "TEST documents and private TEST artifacts are gone; TEST counters are reset to 1. Reloading registry…";
      lastPreflight = null;
      purgeButton.hidden = true;
      setTimeout(() => window.location.reload(), 650);
    } catch (error) {
      state.textContent = "ERROR";
      state.className = "documents-test-cleanup__state is-blocked";
      note.textContent = `TEST purge failed: ${String(error?.message || error)}. Run the dry-run again before retrying.`;
      scanButton.disabled = false;
    }
  }

  function install() {
    if (document.querySelector("[data-test-cleanup]")) return;
    const sequenceList = document.getElementById("sequenceList");
    const card = sequenceList?.closest(".documents-card");
    if (!card) return;
    installStyles();

    const section = document.createElement("div");
    section.className = "documents-test-cleanup";
    section.dataset.testCleanup = "true";

    const head = document.createElement("div");
    head.className = "documents-test-cleanup__head";
    const copy = document.createElement("div");
    const eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Maintenance";
    const title = document.createElement("strong");
    title.textContent = "TEST workspace cleanup";
    copy.append(eyebrow, title);
    const state = document.createElement("em");
    state.className = "documents-test-cleanup__state";
    state.textContent = "NOT SCANNED";
    head.append(copy, state);

    const actions = document.createElement("div");
    actions.className = "documents-test-cleanup__actions";
    const scanButton = document.createElement("button");
    scanButton.type = "button";
    scanButton.className = "button button--ghost";
    scanButton.textContent = "Scan TEST data";
    const purgeButton = document.createElement("button");
    purgeButton.type = "button";
    purgeButton.className = "button documents-test-cleanup__purge";
    purgeButton.textContent = "Purge verified TEST data";
    purgeButton.hidden = true;
    purgeButton.disabled = true;
    actions.append(scanButton, purgeButton);

    const summary = document.createElement("div");
    summary.className = "documents-test-cleanup__summary";
    summary.textContent = "Run the dry-run to identify the exact TEST-only set. Production records are excluded fail-closed.";
    const note = document.createElement("p");
    note.className = "documents-test-cleanup__note";
    note.textContent = "No cleanup can run without a fresh matching dry-run fingerprint.";

    scanButton.addEventListener("click", () => runPreflight(scanButton, purgeButton, state, summary, note));
    purgeButton.addEventListener("click", () => purge(scanButton, purgeButton, state, summary, note));
    section.append(head, actions, summary, note);
    card.appendChild(section);
  }

  install();
})();
