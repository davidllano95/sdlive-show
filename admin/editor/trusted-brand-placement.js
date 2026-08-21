(() => {
  if (window.SDLIVE_TRUSTED_BRAND_PLACEMENT) return;
  window.SDLIVE_TRUSTED_BRAND_PLACEMENT = true;

  const editorBody = document.getElementById("editorBody");
  const iframe = document.getElementById("sitePreview");
  const trustedSectionButton = document.querySelector('[data-section="trustedTitle"]');
  const discardButton = document.getElementById("discardChanges");

  if (!editorBody || !iframe || !trustedSectionButton) return;

  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const MEDIA_PUBLIC_PREFIX = "https://media.sdlive.show/";
  const PLACEMENTS = ["auto", "left", "center", "right"];

  const placementBySource = new Map();
  const lastSourceByInput = new WeakMap();

  let editorDecorateQueued = false;
  let previewObserver = null;
  let previewResizeObserver = null;
  let bridgeWrite = false;

  injectStyles();

  async function fetchJson(url) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store"
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function normalizePlacement(value) {
    const placement = String(value || "auto").toLowerCase();
    return PLACEMENTS.includes(placement) ? placement : "auto";
  }

  function isSupportedBrandPath(path) {
    return /^clients\.\d+\.reveal\.items\.\d+\.src$/.test(String(path || ""));
  }

  function placementPathFor(sourcePath) {
    return String(sourcePath || "").replace(/\.src$/, ".placement");
  }

  function collectDraftPlacements(draft) {
    placementBySource.clear();

    (draft?.clients || []).forEach((client) => {
      (client.reveal?.items || []).forEach((item) => {
        if (item?.type !== "logo" || !item.src) return;
        placementBySource.set(item.src, normalizePlacement(item.placement));
      });
    });
  }

  async function loadPlacementContext() {
    try {
      const trusted = await fetchJson("/api/admin/content/trusted");
      collectDraftPlacements(trusted?.entry?.draft);
      queueDecorate();
      applyPreviewPlacements();
    } catch (error) {
      console.warn("Trusted brand placement unavailable", error);
    }
  }

  function sourceForPreviewImage(image) {
    const logical = image?.dataset?.cmsMediaSource;
    if (logical) return logical;

    const raw = image?.getAttribute("src") || "";
    if (raw.startsWith(MEDIA_PUBLIC_PREFIX)) {
      return `${LOGICAL_MEDIA_PREFIX}${raw.slice(MEDIA_PUBLIC_PREFIX.length)}`;
    }

    return raw;
  }

  function gridItemForImage(image) {
    const tile = image.closest(".supported-brand-tile");
    if (tile?.parentElement?.classList.contains("supported-reveal-logos")) {
      return tile;
    }

    if (image.parentElement?.classList.contains("supported-reveal-logos")) {
      return image;
    }

    return null;
  }

  function countGridColumns(grid, win) {
    const template = String(win.getComputedStyle(grid).gridTemplateColumns || "").trim();
    if (!template || template === "none") return 1;

    const repeated = template.match(/^repeat\(\s*(\d+)\s*,/i);
    if (repeated) return Math.max(1, Number(repeated[1]) || 1);

    return Math.max(
      1,
      template
        .split(/\s+/)
        .filter((token) => token && !token.startsWith("[")).length
    );
  }

  function gridSpan(target, win, columns) {
    const previous = target.style.gridColumn;
    target.style.removeProperty("grid-column");

    const computed = win.getComputedStyle(target);
    const values = [computed.gridColumnStart, computed.gridColumnEnd];
    let span = 1;

    values.some((value) => {
      const match = String(value || "").match(/span\s+(\d+)/i);
      if (!match) return false;
      span = Math.max(1, Number(match[1]) || 1);
      return true;
    });

    if (previous) target.style.gridColumn = previous;
    return Math.min(Math.max(1, span), columns);
  }

  function applyGridPlacement(target, placement, win) {
    const grid = target?.parentElement;
    if (!grid?.classList.contains("supported-reveal-logos")) return;

    target.style.removeProperty("grid-column");

    if (placement === "auto") {
      target.removeAttribute("data-cms-brand-placement");
      return;
    }

    const columns = countGridColumns(grid, win);
    const span = gridSpan(target, win, columns);

    let start = 1;
    if (placement === "center") {
      start = Math.floor((columns - span) / 2) + 1;
    } else if (placement === "right") {
      start = columns - span + 1;
    }

    start = Math.max(1, Math.min(start, Math.max(1, columns - span + 1)));
    target.style.gridColumn = `${start} / span ${span}`;
    target.dataset.cmsBrandPlacement = placement;
  }

  function applyPreviewPlacements() {
    let doc;
    let win;

    try {
      doc = iframe.contentDocument;
      win = iframe.contentWindow;
    } catch {
      return;
    }

    const section = doc?.querySelector(".trusted-wrap");
    if (!section || !win) return;

    section.querySelectorAll(".supported-reveal-logos img").forEach((image) => {
      const source = sourceForPreviewImage(image);
      const target = gridItemForImage(image);
      if (!source || !target) return;

      applyGridPlacement(
        target,
        normalizePlacement(placementBySource.get(source)),
        win
      );
    });
  }

  function bindPreviewObservers() {
    previewObserver?.disconnect();
    previewResizeObserver?.disconnect();
    previewObserver = null;
    previewResizeObserver = null;

    let section;
    try {
      section = iframe.contentDocument?.querySelector(".trusted-wrap");
    } catch {
      return;
    }

    if (!section) return;

    previewObserver = new MutationObserver(() => {
      window.requestAnimationFrame(applyPreviewPlacements);
    });
    previewObserver.observe(section, { childList: true, subtree: true });

    if (typeof ResizeObserver === "function") {
      previewResizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(applyPreviewPlacements);
      });
      previewResizeObserver.observe(section);
    }

    applyPreviewPlacements();
  }

  function setDraftPathThroughBoundInput(proxy, path, value) {
    if (!proxy || !path) return false;

    const originalPath = proxy.dataset.trustedPath;
    const originalValue = proxy.value;

    bridgeWrite = true;
    try {
      proxy.dataset.trustedPath = path;
      proxy.value = String(value);
      proxy.dispatchEvent(new Event("input"));
    } finally {
      // The first synthetic input is enough to update the Trusted draft and
      // rebuild the preview. Dispatching a second input after restoring the
      // source field caused the carousel continuity guard to capture the new
      // animation at time zero and overwrite the phase saved before the edit.
      proxy.dataset.trustedPath = originalPath;
      proxy.value = originalValue;
      bridgeWrite = false;
    }

    return true;
  }

  function refreshButtons(row, placement) {
    row.querySelectorAll("button[data-placement]").forEach((button) => {
      const active = button.dataset.placement === placement;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function buildPlacementControl(sourceInput) {
    const sourcePath = sourceInput.dataset.trustedPath || "";
    const placementPath = placementPathFor(sourcePath);
    const source = sourceInput.value.trim();

    const row = document.createElement("div");
    row.className = "trusted-brand-placement";
    row.dataset.placementFor = sourcePath;

    const label = document.createElement("span");
    label.textContent = "Brand position";

    const controls = document.createElement("div");
    controls.className = "trusted-brand-placement__controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Brand position inside this client");

    const labels = {
      auto: "Auto",
      left: "Left",
      center: "Center",
      right: "Right"
    };

    PLACEMENTS.forEach((placement) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "trusted-brand-placement__button";
      button.dataset.placement = placement;
      button.textContent = labels[placement];

      button.addEventListener("click", () => {
        const currentSource = sourceInput.value.trim();
        if (currentSource) {
          placementBySource.set(currentSource, placement);
        }

        refreshButtons(row, placement);
        setDraftPathThroughBoundInput(sourceInput, placementPath, placement);
        window.requestAnimationFrame(applyPreviewPlacements);
      });

      controls.appendChild(button);
    });

    row.append(label, controls);
    refreshButtons(row, normalizePlacement(placementBySource.get(source)));

    sourceInput.addEventListener("input", () => {
      if (bridgeWrite || !isSupportedBrandPath(sourceInput.dataset.trustedPath)) return;

      const previousSource = lastSourceByInput.get(sourceInput) || "";
      const nextSource = sourceInput.value.trim();

      if (
        previousSource &&
        nextSource &&
        !placementBySource.has(nextSource) &&
        placementBySource.has(previousSource)
      ) {
        placementBySource.set(nextSource, placementBySource.get(previousSource));
      }

      lastSourceByInput.set(sourceInput, nextSource);
      refreshButtons(row, normalizePlacement(placementBySource.get(nextSource)));
      window.requestAnimationFrame(applyPreviewPlacements);
    });

    lastSourceByInput.set(sourceInput, source);
    return row;
  }

  function refreshExistingControl(field, sourceInput) {
    const row = field.querySelector(".trusted-brand-placement");
    if (!row) return false;

    const source = sourceInput.value.trim();
    lastSourceByInput.set(sourceInput, source);
    refreshButtons(row, normalizePlacement(placementBySource.get(source)));
    return true;
  }

  function decoratePlacementFields() {
    editorDecorateQueued = false;
    if (!trustedSectionButton.classList.contains("is-active")) return;

    editorBody
      .querySelectorAll('input[data-trusted-path$=".src"]')
      .forEach((sourceInput) => {
        const sourcePath = sourceInput.dataset.trustedPath || "";
        if (!isSupportedBrandPath(sourcePath)) return;

        const field = sourceInput.closest(".field");
        if (!field) return;

        if (refreshExistingControl(field, sourceInput)) return;
        field.appendChild(buildPlacementControl(sourceInput));
      });
  }

  function queueDecorate() {
    if (editorDecorateQueued) return;
    editorDecorateQueued = true;
    window.requestAnimationFrame(decoratePlacementFields);
  }

  const editorObserver = new MutationObserver(() => {
    queueDecorate();
    window.setTimeout(bindPreviewObservers, 0);
  });
  editorObserver.observe(editorBody, { childList: true, subtree: true });

  trustedSectionButton.addEventListener("click", () => {
    window.setTimeout(() => {
      void loadPlacementContext();
      bindPreviewObservers();
      queueDecorate();
    }, 140);
  });

  iframe.addEventListener("load", () => {
    window.setTimeout(bindPreviewObservers, 200);
  });

  document.addEventListener(
    "click",
    (event) => {
      if (event.target === discardButton) {
        window.setTimeout(() => void loadPlacementContext(), 200);
      }
    },
    true
  );

  function injectStyles() {
    if (document.getElementById("trusted-brand-placement-styles")) return;

    const style = document.createElement("style");
    style.id = "trusted-brand-placement-styles";
    style.textContent = `
      .trusted-brand-placement {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 9px;
        padding-top: 9px;
        border-top: 1px solid rgba(255,255,255,.07);
      }

      .trusted-brand-placement > span {
        flex: 0 0 auto;
        color: rgba(255,255,255,.68);
        font-size: 10px;
      }

      .trusted-brand-placement__controls {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 4px;
        min-width: 0;
        flex: 1 1 auto;
        max-width: 230px;
      }

      .trusted-brand-placement__button {
        min-height: 28px;
        padding: 5px 7px;
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 6px;
        background: rgba(255,255,255,.035);
        color: rgba(255,255,255,.64);
        font: inherit;
        font-size: 10px;
      }

      .trusted-brand-placement__button:hover {
        border-color: rgba(160,137,229,.42);
        color: rgba(255,255,255,.92);
      }

      .trusted-brand-placement__button.is-active {
        border-color: rgba(160,137,229,.72);
        background: rgba(160,137,229,.16);
        color: #fff;
      }
    `;

    document.head.appendChild(style);
  }
})();
