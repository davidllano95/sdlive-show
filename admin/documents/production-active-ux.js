(() => {
  "use strict";

  if (window.SDLiveDocumentsProductionActiveUx) return;
  window.SDLiveDocumentsProductionActiveUx = true;

  const $ = (id) => document.getElementById(id);

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function setHtml(node, value) {
    if (node && node.innerHTML !== value) node.innerHTML = value;
  }

  function syncStaticCopy() {
    const workspaceNotice = $("documentsWorkspace")?.querySelector(".documents-notice");
    setHtml(workspaceNotice, "<strong>Draft-safe workflow:</strong> Preview never consumes a number and never includes the private signature. Finalize consumes the number shown in the confirmation dialog and freezes the snapshot.");

    const settingsNotice = $("settingsWorkspace")?.querySelector(".documents-notice");
    setHtml(settingsNotice, "<strong>Numbering safety:</strong> real series are active. Cuenta de Cobro uses <code>samuel:CC</code>; international Invoice uses <code>samuel:INV</code>. TEST series remain available through the test issuer.");

    const sequenceList = $("sequenceList");
    const card = sequenceList?.closest(".documents-card");
    if (card) {
      const chip = card.querySelector(".documents-chip");
      if (chip && /real locked/i.test(chip.textContent || "")) {
        setText(chip, "Real active");
        chip.classList.add("is-safe");
      }
      const help = card.querySelector(".documents-help");
      if (help && /planning only|bootstrap remains disabled/i.test(help.textContent || "")) {
        setText(help, "Real CC and Invoice sequences are active. Run the production health check below before investigating any numbering concern.");
      }
    }
  }

  function syncSequenceRows() {
    const rows = $("sequenceList")?.querySelectorAll(".sequence-item") || [];
    for (const row of rows) {
      const title = row.querySelector("strong")?.textContent?.trim() || "";
      if (title !== "samuel:CC" && title !== "samuel:INV") continue;
      const state = row.lastElementChild;
      if (state && /LOCKED/i.test(state.textContent || "")) setText(state, "ACTIVE");
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
    if (launch && /Finalize TEST/i.test(launch.textContent || "")) setText(launch, "Finalize…");

    const dialog = $("finalizeDialog");
    if (!dialog) return;
    const card = dialog.querySelector(".documents-finalize-card");
    const eyebrow = card?.querySelector(".eyebrow");
    const warning = card?.querySelector(".documents-finalize-warning");
    const confirm = $("confirmFinalize");
    const mode = finalizationMode();

    if (mode === "real") {
      setText(eyebrow, "REAL document issue");
      setText(warning, "This consumes the REAL number shown above and freezes the snapshot. That number is never reused, including if PDF rendering later fails.");
      if (confirm && /Finalize TEST document|Finalize document|Issue REAL document/.test(confirm.textContent || "")) {
        setText(confirm, "Issue REAL document");
      }
    } else if (mode === "test") {
      setText(eyebrow, "TEST document issue");
      setText(warning, "This consumes a TEST number and freezes the snapshot. It does not affect the real CC or Invoice sequence.");
      if (confirm && /Finalize TEST document|Finalize document|Issue REAL document/.test(confirm.textContent || "")) {
        setText(confirm, "Finalize TEST document");
      }
    } else {
      setText(eyebrow, "Document issue");
      setText(warning, "Review the prospective number and document details carefully before finalizing.");
      if (confirm && /Finalize TEST document/.test(confirm.textContent || "")) setText(confirm, "Finalize document");
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
