(() => {
  "use strict";

  if (window.SDLiveDocumentsProductionActiveUx) return;
  window.SDLiveDocumentsProductionActiveUx = true;

  const $ = (id) => document.getElementById(id);

  function syncStaticCopy() {
    const workspaceNotice = $("documentsWorkspace")?.querySelector(".documents-notice");
    if (workspaceNotice) {
      workspaceNotice.innerHTML = "<strong>Draft-safe workflow:</strong> Preview never consumes a number and never includes the private signature. Finalize consumes the number shown in the confirmation dialog and freezes the snapshot.";
    }

    const settingsNotice = $("settingsWorkspace")?.querySelector(".documents-notice");
    if (settingsNotice) {
      settingsNotice.innerHTML = "<strong>Numbering safety:</strong> real series are active. Cuenta de Cobro uses <code>samuel:CC</code>; international Invoice uses <code>samuel:INV</code>. TEST series remain available through the test issuer.";
    }

    const sequenceList = $("sequenceList");
    const card = sequenceList?.closest(".documents-card");
    if (card) {
      const chip = card.querySelector(".documents-chip");
      if (chip && /real locked/i.test(chip.textContent || "")) {
        chip.textContent = "Real active";
        chip.classList.add("is-safe");
      }
      const help = card.querySelector(".documents-help");
      if (help && /planning only|bootstrap remains disabled/i.test(help.textContent || "")) {
        help.textContent = "Real CC and Invoice sequences are active. Run the production health check below before investigating any numbering concern.";
      }
    }
  }

  function syncSequenceRows() {
    const rows = $("sequenceList")?.querySelectorAll(".sequence-item") || [];
    for (const row of rows) {
      const title = row.querySelector("strong")?.textContent?.trim() || "";
      if (title !== "samuel:CC" && title !== "samuel:INV") continue;
      const state = row.lastElementChild;
      if (state && /LOCKED/i.test(state.textContent || "")) state.textContent = "ACTIVE";
    }
  }

  function finalizationMode() {
    const numberText = $("finalizeNumber")?.textContent || "";
    if (/\bsamuel:(?:CC|INV)\b/.test(numberText)) return "real";
    if (/\btest:(?:CC|INV)\b/i.test(numberText)) return "test";
    return "unknown";
  }

  function syncFinalizeUi() {
    const launch = $("finalizeDraft");
    if (launch && /Finalize TEST/i.test(launch.textContent || "")) launch.textContent = "Finalize…";

    const dialog = $("finalizeDialog");
    if (!dialog) return;
    const card = dialog.querySelector(".documents-finalize-card");
    const eyebrow = card?.querySelector(".eyebrow");
    const warning = card?.querySelector(".documents-finalize-warning");
    const confirm = $("confirmFinalize");
    const mode = finalizationMode();

    if (mode === "real") {
      if (eyebrow) eyebrow.textContent = "REAL document issue";
      if (warning) warning.textContent = "This consumes the REAL number shown above and freezes the snapshot. That number is never reused, including if PDF rendering later fails.";
      if (confirm && /Finalize TEST document|Finalize document|Issue REAL document/.test(confirm.textContent || "")) {
        confirm.textContent = "Issue REAL document";
      }
    } else if (mode === "test") {
      if (eyebrow) eyebrow.textContent = "TEST document issue";
      if (warning) warning.textContent = "This consumes a TEST number and freezes the snapshot. It does not affect the real CC or Invoice sequence.";
      if (confirm && /Finalize TEST document|Finalize document|Issue REAL document/.test(confirm.textContent || "")) {
        confirm.textContent = "Finalize TEST document";
      }
    } else {
      if (eyebrow) eyebrow.textContent = "Document issue";
      if (warning) warning.textContent = "Review the prospective number and document details carefully before finalizing.";
      if (confirm && /Finalize TEST document/.test(confirm.textContent || "")) confirm.textContent = "Finalize document";
    }
  }

  function sync() {
    syncStaticCopy();
    syncSequenceRows();
    syncFinalizeUi();
  }

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["open", "hidden"] });
})();
