(() => {
  "use strict";

  if (window.SDLiveDocumentsPreviewFitUx) return;
  window.SDLiveDocumentsPreviewFitUx = true;

  const VIEWPORT_WIDTH = 960;
  const VIEWPORT_HEIGHT = 1120;
  let resizeObserver = null;
  let raf = 0;

  function installStyles() {
    if (document.getElementById("documentsDraftPreviewFitStyles")) return;
    const style = document.createElement("style");
    style.id = "documentsDraftPreviewFitStyles";
    style.textContent = `
      .documents-draft-preview-stage{position:relative;width:100%;overflow:hidden;background:#eef0f5}
      .documents-draft-preview-stage #draftPreview{display:block;max-width:none!important;min-height:0!important;border:0;margin:0;background:#eef0f5;transform-origin:top left}
    `;
    document.head.appendChild(style);
  }

  function ensureStage() {
    const frame = document.getElementById("draftPreview");
    if (!frame) return null;
    let stage = frame.parentElement;
    if (!stage?.classList.contains("documents-draft-preview-stage")) {
      stage = document.createElement("div");
      stage.className = "documents-draft-preview-stage";
      frame.before(stage);
      stage.appendChild(frame);
    }
    return { frame, stage };
  }

  function fit() {
    raf = 0;
    const pair = ensureStage();
    if (!pair) return;
    const { frame, stage } = pair;
    const availableWidth = Math.max(1, stage.clientWidth);
    const scale = Math.min(1, availableWidth / VIEWPORT_WIDTH);

    frame.style.width = `${VIEWPORT_WIDTH}px`;
    frame.style.height = `${VIEWPORT_HEIGHT}px`;
    frame.style.transform = `scale(${scale})`;
    stage.style.height = `${Math.ceil(VIEWPORT_HEIGHT * scale)}px`;
  }

  function queueFit() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(fit);
  }

  function install() {
    installStyles();
    const pair = ensureStage();
    if (!pair) return;
    if (!resizeObserver && typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(queueFit);
      resizeObserver.observe(pair.stage);
    }
    queueFit();
  }

  install();
  window.addEventListener("resize", queueFit, { passive: true });
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("#registryList .registry-row, #newDraft, #documentsTab")) queueFit();
  }, true);
})();
