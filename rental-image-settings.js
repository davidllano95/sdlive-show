(() => {
  const STORAGE_KEY = "sdlive-rental-image-settings-v1";

  const PRODUCTS = {
    wing: { label: "Behringer WING", src: "assets/equipment/display/behringer-wing.webp", frameClass: "equipment-card-visual", target: '[data-rental-item="wing"] .equipment-card-visual > img', container: '[data-rental-item="wing"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 230 } },
    flow8: { label: "Behringer FLOW 8", src: "assets/equipment/display/behringer-flow-8.webp", frameClass: "equipment-card-visual", target: '[data-rental-item="flow8"] .equipment-card-visual > img', container: '[data-rental-item="flow8"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 230 } },
    lv1: { label: "LV1 Classic", src: "assets/equipment/display/lv1-classic.webp", frameClass: "equipment-card-visual equipment-card-visual--lv1", target: '[data-rental-item="lv1"] .equipment-card-visual > img', container: '[data-rental-item="lv1"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 230 } },
    dl32: { label: "Midas DL32", src: "assets/equipment/display/midas-dl32.webp", frameClass: "equipment-card-visual", target: '[data-rental-item="dl32"] .equipment-card-visual > img', container: '[data-rental-item="dl32"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 260 } },
    stageGrid: { label: "StageGrid 4000", src: "assets/equipment/display/stagegrid-4000.webp", frameClass: "equipment-card-visual equipment-card-visual--stagegrid", target: '[data-rental-item="stageGrid"] .equipment-card-visual > img', container: '[data-rental-item="stageGrid"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 260 } },
    handhelds: { label: "AKG WP-300", src: "assets/equipment/display/akg-wp300.webp", frameClass: "equipment-card-visual equipment-card-visual--wireless", target: '[data-rental-item="handhelds"] .equipment-card-visual > img', container: '[data-rental-item="handhelds"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 260 } },
    headsets: { label: "Phenyx Pro PTU-71-2B", src: "assets/equipment/display/phenyx-ptu-71-2b.webp", frameClass: "equipment-card-visual equipment-card-visual--kit", target: '[data-rental-item="headsets"] .equipment-card-visual > img', container: '[data-rental-item="headsets"] .equipment-card-visual', defaults: { x: 0, y: 0, scale: 1, height: 260 } },
    pa: { label: "BetaThree BT-1500 PA", src: "assets/equipment/beta-three-bt1500.webp", mode: "pair", frameClass: "equipment-card-visual equipment-card-visual--pa", target: '[data-rental-item="pa"] .equipment-pa-pair', container: '[data-rental-item="pa"] .equipment-card-visual', defaults: { x: 0, y: -42, scale: 1, height: 560 } },
    labeler: { label: "Event labeler", src: "assets/equipment/display/event-labeler.webp", frameClass: "equipment-tool-visual equipment-tool-visual--photo equipment-tool-visual--light-photo", target: '[data-rental-item="labeler"] .equipment-tool-visual > img', container: '[data-rental-item="labeler"] .equipment-tool-visual', defaults: { x: 0, y: -52, scale: 1, height: 250 } },
    videoServer: { label: "Video server", src: "assets/equipment/display/video-server.webp", frameClass: "equipment-tool-visual equipment-tool-visual--photo equipment-tool-visual--video-photo", target: '[data-rental-item="videoServer"] .equipment-tool-visual > img', container: '[data-rental-item="videoServer"] .equipment-tool-visual', defaults: { x: 0, y: -44, scale: 1, height: 250 } },
    monitor: { label: "Portable monitor", src: "assets/equipment/display/portable-monitor.webp", frameClass: "equipment-tool-visual equipment-tool-visual--photo equipment-tool-visual--monitor-photo", target: '[data-rental-item="monitor"] .equipment-tool-visual > img', container: '[data-rental-item="monitor"] .equipment-tool-visual', defaults: { x: 0, y: 0, scale: 1, height: 250 } }
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const defaults = () => Object.fromEntries(
    Object.entries(PRODUCTS).map(([key, product]) => [key, clone(product.defaults)])
  );

  function read() {
    const base = defaults();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      Object.entries(saved || {}).forEach(([key, value]) => {
        if (!base[key] || !value || typeof value !== "object") return;
        base[key] = { ...base[key], ...value };
      });
    } catch {
      // Corrupt or unavailable storage: fall back to defaults.
    }
    return base;
  }

  function write(settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Preview still works for the current page even if storage is blocked.
    }
  }

  function buildCSS(settings = read(), { includeComment = true } = {}) {
    const lines = [];
    if (includeComment) {
      lines.push("/* SD.Live Rental Image Editor — generated overrides */");
      lines.push("/* Paste this block at the end of styles.css for deployment. */");
    }

    Object.entries(PRODUCTS).forEach(([key, product]) => {
      const value = { ...product.defaults, ...(settings[key] || {}) };
      const x = Number(value.x) || 0;
      const y = Number(value.y) || 0;
      const scale = Math.max(0.2, Number(value.scale) || 1);
      const height = Math.max(100, Number(value.height) || product.defaults.height);
      lines.push(`${product.container} { height: ${height}px !important; }`);
      lines.push(`${product.target} { transform: translate(${x}px, ${y}px) scale(${scale}) !important; transform-origin: center center !important; }`);
    });

    return `${lines.join("\n")}\n`;
  }

  function apply(settings = read(), doc = document) {
    if (!doc?.head) return;
    let style = doc.getElementById("sdlive-rental-image-overrides");
    if (!style) {
      style = doc.createElement("style");
      style.id = "sdlive-rental-image-overrides";
      doc.head.appendChild(style);
    }
    style.textContent = buildCSS(settings, { includeComment: false });
  }

  function resetProduct(key) {
    const settings = read();
    if (PRODUCTS[key]) settings[key] = clone(PRODUCTS[key].defaults);
    write(settings);
    return settings;
  }

  function resetAll() {
    const settings = defaults();
    write(settings);
    return settings;
  }

  window.SDLIVE_RENTAL_IMAGE_SETTINGS = {
    STORAGE_KEY,
    PRODUCTS,
    defaults,
    read,
    write,
    buildCSS,
    apply,
    resetProduct,
    resetAll
  };

  const init = () => apply();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
