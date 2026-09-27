(() => {
  "use strict";

  if (window.SDLiveDocumentsPdfArtifactUx) return;
  window.SDLiveDocumentsPdfArtifactUx = true;

  const FINALIZE_WARNING_COPY = "This consumes a TEST number and freezes the snapshot. Real CC/INV series remain locked. The signed PDF is generated automatically from the frozen snapshot; artifact failure never releases the number and can be retried.";

  function patchFinalizeCopy() {
    const warning = document.querySelector(".documents-finalize-warning");
    if (warning && warning.textContent !== FINALIZE_WARNING_COPY) {
      warning.textContent = FINALIZE_WARNING_COPY;
    }

    const saveState = document.getElementById("draftSaveState");
    if (saveState && /Finalized\s*·\s*PDF pending/i.test(saveState.textContent || "")) {
      saveState.textContent = "Finalized · signed PDF generation requested";
    }

    const notices = document.querySelectorAll("#documentsWorkspace .documents-notice");
    for (const notice of notices) {
      if (/Finalize is intentionally unavailable until PR 5/i.test(notice.textContent || "")) {
        notice.innerHTML = "<strong>TEST artifact stage:</strong> Draft preview remains number/signature safe. TEST Finalize now freezes the snapshot, consumes only a TEST number and generates the signed PDF privately. Real CC/INV series remain locked.";
      }
    }
  }

  patchFinalizeCopy();
  const observer = new MutationObserver(patchFinalizeCopy);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
