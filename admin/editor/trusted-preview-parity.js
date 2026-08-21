(() => {
  if (window.SDLIVE_TRUSTED_PREVIEW_PARITY) return;
  window.SDLIVE_TRUSTED_PREVIEW_PARITY = true;

  const iframe = document.getElementById("sitePreview");
  const stage = document.getElementById("previewStage");

  if (!iframe || !stage) return;

  const STYLE_ID = "sdlive-trusted-preview-parity";

  function installParity() {
    let doc;

    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }

    if (!doc?.documentElement) return;

    doc.documentElement.dataset.sdliveAdminDevice =
      stage.dataset.device || "desktop";

    if (doc.getElementById(STYLE_ID)) return;

    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /*
       * The Admin desktop iframe can be physically narrower than a real
       * desktop viewport because the sidebar and inspector share the screen.
       * Reassert the published desktop Wonderlust layout so editing it is
       * visually faithful even when the iframe itself crosses a mobile
       * media-query breakpoint.
       */
      html[data-sdlive-admin-device="desktop"]
      .supported-reveal-logos--wonderlust {
        grid-template-columns: repeat(15, minmax(0, 1fr));
        gap: 12px;
      }

      html[data-sdlive-admin-device="desktop"]
      .supported-reveal-logos--wonderlust .supported-brand-tile {
        height: 72px;
        padding: 8px 12px;
        grid-column: span 3;
        width: auto;
        justify-self: stretch;
      }

      html[data-sdlive-admin-device="desktop"]
      .supported-reveal-logos--wonderlust .supported-brand-tile--featured {
        height: 92px;
        grid-column: span 5;
      }

      html[data-sdlive-admin-device="desktop"]
      .supported-reveal-logos--wonderlust .supported-brand-tile img {
        height: 54px;
      }

      html[data-sdlive-admin-device="desktop"]
      .supported-reveal-logos--wonderlust .supported-brand-tile--featured img {
        height: 76px;
      }

      html[data-sdlive-admin-device="desktop"]
      .supported-reveal-logos--wonderlust
      .supported-brand-tile:last-child:not(.supported-brand-tile--featured) {
        width: auto;
        grid-column: span 3;
        justify-self: stretch;
      }
    `;

    (doc.head || doc.documentElement).appendChild(style);
  }

  const stageObserver = new MutationObserver(() => {
    window.requestAnimationFrame(installParity);
  });
  stageObserver.observe(stage, {
    attributes: true,
    attributeFilter: ["data-device"]
  });

  iframe.addEventListener("load", () => {
    window.setTimeout(installParity, 80);
  });

  installParity();
})();
