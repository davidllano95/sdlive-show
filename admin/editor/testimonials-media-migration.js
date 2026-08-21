(() => {
  if (window.SDLIVE_TESTIMONIALS_MEDIA_MIGRATION) return;
  window.SDLIVE_TESTIMONIALS_MEDIA_MIGRATION = true;
  const editorBody = document.getElementById("editorBody");
  const toastStack = document.getElementById("toastStack");
  const sectionButton = document.querySelector('.section-link[data-section="testimonials"]');
  if (!editorBody || !sectionButton) return;

  const LOGICAL_PREFIX = "assets/media/";
  const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
  const MAX = 5 * 1024 * 1024;
  let busy = false;
  let queued = false;

  function toast(title, detail = "", type = "success") {
    if (!toastStack) return;
    const node = document.createElement("div"); node.className = `toast is-${type}`;
    const strong = document.createElement("strong"); strong.textContent = title; node.appendChild(strong);
    if (detail) node.append(document.createTextNode(` ${detail}`)); toastStack.appendChild(node);
    setTimeout(() => node.remove(), 5200);
  }
  async function json(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    return data;
  }
  function legacy(source) {
    const value = String(source || "").replace(/^\//, "");
    return value.startsWith("assets/") && !value.startsWith(LOGICAL_PREFIX);
  }
  function typeFor(path) {
    const value = String(path).split("?")[0].toLowerCase();
    if (value.endsWith(".png")) return "image/png";
    if (value.endsWith(".jpg") || value.endsWith(".jpeg")) return "image/jpeg";
    if (value.endsWith(".webp")) return "image/webp";
    return "";
  }
  async function readAsset(source) {
    const clean = String(source).replace(/^\//, "");
    const response = await fetch(`/${clean}`, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read ${clean} (${response.status})`);
    const blob = await response.blob();
    const type = String(blob.type || response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() || typeFor(clean);
    if (!ALLOWED.has(type)) throw new Error(`${clean} is not PNG, JPEG or WebP`);
    if (blob.size <= 0 || blob.size > MAX) throw new Error(`${clean} exceeds the 5 MB limit`);
    return new File([blob], clean.split("/").pop() || "testimonial-media", { type });
  }
  async function upload(source) {
    const file = await readAsset(source);
    const form = new FormData(); form.set("folder", "testimonials"); form.set("file", file, file.name);
    const data = await json("/api/admin/media/upload", { method: "POST", body: form });
    return `${LOGICAL_PREFIX}${data.media.key}`;
  }
  async function snapshot() {
    const data = await json("/api/admin/content/testimonials");
    const draft = JSON.parse(JSON.stringify(data.entry?.draft || {}));
    const published = JSON.parse(JSON.stringify(data.entry?.published || {}));
    const refs = (draft.items || []).map((item, index) => item?.logo?.src ? { index, source: item.logo.src } : null).filter((item) => item && legacy(item.source));
    return { draft, published, refs };
  }
  function refsOf(content) { return (content?.items || []).map((item) => item?.logo?.src || ""); }
  async function migrate(button, status) {
    if (busy) return; busy = true; button.disabled = true;
    try {
      const before = await snapshot();
      if (!before.refs.length) { status.textContent = "Saved Draft is already using R2 media."; toast("Testimonials media is already on R2."); return; }
      if (!confirm(`Copy ${before.refs.length} Testimonials logo reference${before.refs.length === 1 ? "" : "s"} from GitHub assets to R2?\n\nOnly Draft references will be saved. Published must remain unchanged until Publish.`)) return;
      const migrated = new Map(); let index = 0;
      for (const ref of before.refs) {
        index += 1; button.textContent = `Migrating ${index}/${before.refs.length}…`; status.textContent = ref.source;
        if (!migrated.has(ref.source)) migrated.set(ref.source, await upload(ref.source));
        before.draft.items[ref.index].logo.src = migrated.get(ref.source);
      }
      button.textContent = "Saving Draft…"; status.textContent = "Writing R2 references to Draft only…";
      const saved = await json("/api/admin/content/testimonials", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: before.draft }) });
      if (JSON.stringify(refsOf(saved.entry?.published)) !== JSON.stringify(refsOf(before.published))) throw new Error("Draft isolation check failed: Published references changed unexpectedly");
      status.textContent = `${before.refs.length} migrated · Draft saved · Published unchanged`;
      toast("Testimonials media migrated to R2.", "Draft isolation verified. Publish separately when ready.");
      setTimeout(() => location.reload(), 1100);
    } catch (error) { status.textContent = "Migration stopped"; toast("Testimonials media migration failed.", error.message, "error"); }
    finally { busy = false; button.disabled = false; if (button.isConnected) button.textContent = "Check legacy media"; }
  }
  async function refresh(panel) {
    if (busy || !panel?.isConnected) return;
    const button = panel.querySelector("[data-testimonials-media-migrate]"); const status = panel.querySelector("[data-testimonials-media-status]");
    try {
      const { refs } = await snapshot();
      button.textContent = refs.length ? `Migrate legacy media (${refs.length})` : "Check legacy media";
      status.textContent = refs.length ? `${refs.length} GitHub logo reference${refs.length === 1 ? "" : "s"} in saved Draft` : "Saved Draft is already using R2 media.";
    } catch (error) { status.textContent = `Could not inspect Draft · ${error.message}`; }
  }
  function decorate() {
    queued = false;
    if (!sectionButton.classList.contains("is-active") || !editorBody.children.length) return;
    let panel = editorBody.querySelector("[data-testimonials-media-migration]");
    if (!panel) {
      panel = document.createElement("div"); panel.className = "core-media-migration"; panel.dataset.testimonialsMediaMigration = "true";
      panel.innerHTML = `<div class="core-media-migration__copy"><strong>R2 migration</strong><span data-testimonials-media-status>Checking saved Draft…</span></div><button class="core-mini-button" type="button" data-testimonials-media-migrate>Check legacy media</button>`;
      editorBody.prepend(panel);
      panel.querySelector("[data-testimonials-media-migrate]").addEventListener("click", () => void migrate(panel.querySelector("[data-testimonials-media-migrate]"), panel.querySelector("[data-testimonials-media-status]")));
    }
    void refresh(panel);
  }
  function queue() { if (queued) return; queued = true; requestAnimationFrame(decorate); }
  new MutationObserver(queue).observe(editorBody, { childList: true });
  sectionButton.addEventListener("click", () => setTimeout(queue, 180));
  queue();
})();
