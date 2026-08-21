(() => {
  if (window.SDLIVE_TRUSTED_PREVIEW_PARITY) return;
  window.SDLIVE_TRUSTED_PREVIEW_PARITY = true;

  const iframe = document.getElementById("sitePreview");
  const stage = document.getElementById("previewStage");

  if (!iframe || !stage) return;

  const STYLE_ID = "sdlive-trusted-preview-parity";
  let previewObserver = null;
  let parityQueued = false;

  function normalizeWonderlustTiles(doc) {
    doc
      .querySelectorAll(".supported-reveal-logos--wonderlust")
      .forEach((grid) => {
        Array.from(grid.querySelectorAll(":scope > img")).forEach((image) => {
          const tile = doc.createElement("span");
          tile.className = "supported-brand-tile";

          if (image.style.gridColumn) {
            tile.style.gridColumn = image.style.gridColumn;
            image.style.removeProperty("grid-column");
          }

          if (image.dataset.cmsBrandPlacement) {
            tile.dataset.cmsBrandPlacement = image.dataset.cmsBrandPlacement;
            delete image.dataset.cmsBrandPlacement;
          }

          grid.insertBefore(tile, image);
          tile.appendChild(image);
        });
      });
  }

  function installParity() {
    parityQueued = false;

    let doc;

    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }

    if (!doc?.documentElement) return;

    doc.documentElement.dataset.sdliveAdminDevice =
      stage.dataset.device || "desktop";

    // The published Wonderlust markup wraps every brand logo in a
    // `.supported-brand-tile`. The CMS preview builder historically only
    // wrapped items with a non-empty tileClass, leaving most of Wonderlust's
    // second row as bare grid images. Normalize the Admin preview DOM so its
    // structure matches production before applying desktop parity styles.
    normalizeWonderlustTiles(doc);

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
        width: 100%;
        height: 54px;
        object-fit: contain;
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

  function queueParity() {
    if (parityQueued) return;
    parityQueued = true;
    window.requestAnimationFrame(installParity);
  }

  function bindPreviewObserver() {
    previewObserver?.disconnect();
    previewObserver = null;

    let section;

    try {
      section = iframe.contentDocument?.querySelector(".trusted-wrap");
    } catch {
      return;
    }

    if (!section) return;

    previewObserver = new MutationObserver(queueParity);
    previewObserver.observe(section, {
      childList: true,
      subtree: true
    });

    queueParity();
  }

  const stageObserver = new MutationObserver(queueParity);
  stageObserver.observe(stage, {
    attributes: true,
    attributeFilter: ["data-device"]
  });

  iframe.addEventListener("load", () => {
    window.setTimeout(() => {
      installParity();
      bindPreviewObserver();
    }, 80);
  });

  installParity();
  bindPreviewObserver();
})();
