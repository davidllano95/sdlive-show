(() => {
  if (window.SDLiveAdminStabilizationCms) return;
  window.SDLiveAdminStabilizationCms = true;

  const editorBody = document.getElementById("editorBody");
  const iframe = document.getElementById("sitePreview");
  if (!editorBody || !iframe) return;

  const SCALE_MIN = 0.5;
  const SCALE_LEGACY_MAX = 1.8;
  const SCALE_MAX = 2.5;
  const nativeFetch = window.fetch.bind(window);
  const displayBySource = new Map();

  function clamp(value, min, max, fallback = 1) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
  }

  function walk(value, visitor) {
    if (!value || typeof value !== "object") return;
    visitor(value);
    if (Array.isArray(value)) value.forEach((item) => walk(item, visitor));
    else Object.values(value).forEach((item) => walk(item, visitor));
  }

  function storageSafe(value) {
    const clone = value == null ? value : JSON.parse(JSON.stringify(value));
    walk(clone, (node) => {
      if (typeof node.src !== "string") return;
      const desired = clamp(node.displayScale ?? node.scale, SCALE_MIN, SCALE_MAX);
      node.displayScale = desired;
      node.scale = Math.min(SCALE_LEGACY_MAX, desired);
      displayBySource.set(node.src, desired);
    });
    return clone;
  }

  function editorFriendly(value) {
    const clone = value == null ? value : JSON.parse(JSON.stringify(value));
    walk(clone, (node) => {
      if (typeof node.src !== "string") return;
      const desired = clamp(node.displayScale ?? node.scale, SCALE_MIN, SCALE_MAX);
      node.displayScale = desired;
      node.scale = desired;
      displayBySource.set(node.src, desired);
    });
    return clone;
  }

  function isManagedAdminContent(url) {
    let path = "";
    try { path = new URL(String(url), window.location.href).pathname; } catch { return false; }
    return /^\/api\/admin\/content\/(?:about|work|testimonials|trusted)(?:\/|$)/.test(path);
  }

  window.fetch = async function stabilizedFetch(input, init = {}) {
    const url = typeof input === "string" || input instanceof URL ? String(input) : input?.url || "";
    if (!isManagedAdminContent(url)) return nativeFetch(input, init);

    let nextInit = init;
    if (typeof init?.body === "string" && String(init?.headers?.["Content-Type"] || init?.headers?.["content-type"] || "").includes("application/json")) {
      try {
        const parsed = JSON.parse(init.body);
        if (parsed?.draft) {
          nextInit = { ...init, body: JSON.stringify({ ...parsed, draft: storageSafe(parsed.draft) }) };
        }
      } catch {}
    }

    const response = await nativeFetch(input, nextInit);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("application/json")) return response;

    try {
      const data = await response.clone().json();
      if (data?.entry?.draft) data.entry.draft = editorFriendly(data.entry.draft);
      if (data?.entry?.published) data.entry.published = editorFriendly(data.entry.published);
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };

  window.SDLiveMediaPresentationV2 = {
    get(source) { return displayBySource.get(String(source || "")) ?? 1; },
    set(source, scale) {
      if (!source) return;
      displayBySource.set(String(source), clamp(scale, SCALE_MIN, SCALE_MAX));
    },
    storageSafe,
    editorFriendly
  };

  function activeSection() {
    return document.querySelector(".section-link.is-active")?.dataset.section || "";
  }

  function sourceNear(element) {
    const testimonial = element.closest(".testimonials-media-block")?.querySelector(".testimonials-media-source")?.textContent?.trim();
    if (testimonial) return testimonial;
    const coreBlock = element.closest(".core-editor-item, .editor-section")?.querySelector(".core-media-block code")?.textContent?.trim();
    if (coreBlock && coreBlock !== "No image") return coreBlock;
    const trusted = element.closest(".field")?.querySelector('input[data-trusted-path$=".src"]')?.value?.trim();
    return trusted || "";
  }

  function desiredForRange(range) {
    const source = sourceNear(range);
    return clamp(displayBySource.get(source) ?? (range.max === "250" ? Number(range.value) / 100 : Number(range.value)), SCALE_MIN, SCALE_MAX);
  }

  function previewImageForRange(range) {
    let doc;
    try { doc = iframe.contentDocument; } catch { return null; }
    if (!doc) return null;

    const section = activeSection();
    if (section === "about" && range.closest(".editor-section")?.querySelector(".core-media-block")) {
      return doc.querySelector("#about .about-photo img");
    }
    if (section === "work") {
      const key = range.closest(".core-editor-item")?.dataset.coreEditorKey || "";
      const id = key.startsWith("work:") ? key.slice(5) : "";
      return id ? doc.querySelector(`#work [data-work-id="${CSS.escape(id)}"] img`) : null;
    }
    if (section === "testimonials") {
      const id = range.closest(".testimonials-collection-item")?.dataset.testimonialEditorId || "";
      return id ? doc.querySelector(`#testimonials [data-testimonial-id="${CSS.escape(id)}"] img.testimonial-company-logo`) : null;
    }
    if (section === "trustedTitle") {
      const source = sourceNear(range);
      if (!source) return null;
      return [...doc.querySelectorAll(".trusted-wrap img")].find((img) => {
        const logical = img.dataset.cmsMediaSource || "";
        const raw = img.getAttribute("src") || "";
        return logical === source || raw === source || raw.endsWith(`/${source.replace(/^assets\//, "")}`);
      }) || null;
    }
    return null;
  }

  function applyExtendedPreview(range) {
    const source = sourceNear(range);
    const desired = range.max === "250"
      ? clamp(Number(range.value) / 100, SCALE_MIN, SCALE_MAX)
      : clamp(Number(range.value), SCALE_MIN, SCALE_MAX);
    if (source) displayBySource.set(source, desired);
    const image = previewImageForRange(range);
    if (image) image.style.scale = String(desired);
  }

  function bridgeTrustedDisplayScale(range) {
    const field = range.closest(".field");
    const sourceInput = field?.querySelector('input[data-trusted-path$=".src"]');
    const source = sourceInput?.value?.trim() || "";
    if (!sourceInput || !source) return;
    const path = sourceInput.dataset.trustedPath || "";
    if (!path.endsWith(".src")) return;
    const desired = clamp(Number(range.value), SCALE_MIN, SCALE_MAX);
    displayBySource.set(source, desired);

    const oldPath = sourceInput.dataset.trustedPath;
    const oldValue = sourceInput.value;
    sourceInput.dataset.trustedPath = path.replace(/\.src$/, ".displayScale");
    sourceInput.value = String(desired);
    sourceInput.dispatchEvent(new Event("input", { bubbles: true }));
    sourceInput.dataset.trustedPath = oldPath;
    sourceInput.value = oldValue;
  }

  function normalizeRanges() {
    editorBody.querySelectorAll('.field input[type="range"]').forEach((range) => {
      if (range.dataset.scale250Bound === "true") return;
      const isCore = Boolean(range.closest(".core-editor-item, .editor-section")?.querySelector(".core-scale-value"));
      const isTestimonial = Boolean(range.closest(".testimonials-media-block"));
      const isTrusted = Boolean(range.closest(".trusted-media-tools"));
      if (!isCore && !isTestimonial && !isTrusted) return;

      range.dataset.scale250Bound = "true";
      if (isTestimonial) {
        range.max = "250";
        const desired = clamp(displayBySource.get(sourceNear(range)) ?? Number(range.value) / 100, SCALE_MIN, SCALE_MAX);
        range.value = String(Math.round(desired * 100));
        const value = range.closest(".field")?.querySelector("label span:last-child");
        if (value) value.textContent = `${Math.round(desired * 100)}%`;
      } else {
        range.max = "2.5";
        const desired = clamp(displayBySource.get(sourceNear(range)) ?? Number(range.value), SCALE_MIN, SCALE_MAX);
        range.value = String(desired);
        const output = range.closest(".trusted-media-scale")?.querySelector("output");
        if (output) output.textContent = `${Math.round(desired * 100)}%`;
        const coreValue = range.closest(".field")?.querySelector(".core-scale-value");
        if (coreValue) coreValue.textContent = `${Math.round(desired * 100)}%`;
      }

      range.addEventListener("input", () => {
        if (isTrusted) bridgeTrustedDisplayScale(range);
        window.requestAnimationFrame(() => applyExtendedPreview(range));
      }, true);
    });
  }

  function swapHeroCards(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex > 3) return;
    const fields = ["value.en", "value.es", "label.en", "label.es"];
    fields.forEach((suffix) => {
      const from = editorBody.querySelector(`[data-edit-path="stats.${fromIndex}.${suffix}"]`);
      const to = editorBody.querySelector(`[data-edit-path="stats.${toIndex}.${suffix}"]`);
      if (!from || !to) return;
      const temp = from.value;
      from.value = to.value;
      to.value = temp;
      from.dispatchEvent(new Event("input", { bubbles: true }));
      to.dispatchEvent(new Event("input", { bubbles: true }));
    });
    decorateHeroCards();
  }

  function decorateHeroCards() {
    if (activeSection() !== "hero") return;
    const cards = [...editorBody.querySelectorAll(".stat-editor")];
    if (cards.length !== 4) return;
    cards.forEach((card, index) => {
      let actions = card.querySelector(".hero-stat-order-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "hero-stat-order-actions";
        const title = card.querySelector(".stat-editor-title");
        title?.appendChild(actions);
      }
      actions.replaceChildren();
      const up = document.createElement("button"); up.type = "button"; up.textContent = "↑"; up.title = "Move capability up"; up.disabled = index === 0;
      const down = document.createElement("button"); down.type = "button"; down.textContent = "↓"; down.title = "Move capability down"; down.disabled = index === 3;
      up.addEventListener("click", () => swapHeroCards(index, index - 1));
      down.addEventListener("click", () => swapHeroCards(index, index + 1));
      actions.append(up, down);
    });
  }

  function injectStyles() {
    if (document.getElementById("admin-stabilization-cms-style")) return;
    const style = document.createElement("style");
    style.id = "admin-stabilization-cms-style";
    style.textContent = `
      .stat-editor-title{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .hero-stat-order-actions{display:flex;gap:4px}.hero-stat-order-actions button{appearance:none;width:28px;height:26px;border:1px solid var(--border);border-radius:6px;background:rgba(255,255,255,.04);color:var(--soft);cursor:pointer}.hero-stat-order-actions button:disabled{opacity:.28;cursor:default}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => {
      normalizeRanges();
      decorateHeroCards();
    });
  });
  observer.observe(editorBody, { childList: true, subtree: true });
  normalizeRanges();
  decorateHeroCards();
})();
