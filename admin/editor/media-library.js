(() => {
  if (window.SDLIVE_MEDIA_LIBRARY) return;
  window.SDLIVE_MEDIA_LIBRARY = true;

  const toastStack = document.getElementById("toastStack");
  const folders = ["all", "clients", "brands", "testimonials", "about", "portfolio", "rental", "insights", "uploads"];
  let overlay = null;
  let grid = null;
  let status = null;
  let searchInput = null;
  let folderSelect = null;
  let uploadInput = null;
  let uploadButton = null;
  let currentOptions = {};
  let items = [];
  let loading = false;
  let searchTimer = 0;

  function showToast(title, detail = "", type = "success") {
    if (!toastStack) return;
    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;
    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);
    if (detail) toast.append(document.createTextNode(` ${detail}`));
    toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4800);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      const error = new Error(data?.detail || data?.error || `Request failed (${response.status})`);
      error.payload = data;
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function findMediaNavButton() {
    return [...document.querySelectorAll(".app-nav__item")]
      .find((element) => element.querySelector("span")?.textContent?.trim() === "Media") || null;
  }

  function enableMediaNav() {
    const button = findMediaNavButton();
    if (!button) return;
    button.disabled = false;
    button.classList.remove("is-disabled");
    button.id = "openMediaLibrary";
    button.title = "Open reusable R2 media library";
    if (button.dataset.mediaLibraryBound === "true") return;
    button.dataset.mediaLibraryBound = "true";
    button.addEventListener("click", () => open());
  }

  function injectStyles() {
    if (document.getElementById("sdlive-media-library-styles")) return;
    const style = document.createElement("style");
    style.id = "sdlive-media-library-styles";
    style.textContent = `
      .media-library-overlay{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:24px;background:rgba(4,5,9,.78);backdrop-filter:blur(10px)}
      .media-library-overlay[hidden]{display:none}
      .media-library-panel{width:min(1120px,96vw);max-height:min(820px,92vh);display:grid;grid-template-rows:auto auto minmax(0,1fr);overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:#0b0c12;box-shadow:0 28px 90px rgba(0,0,0,.55)}
      .media-library-head,.media-library-toolbar{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
      .media-library-head{justify-content:space-between}
      .media-library-head h2{margin:0;font-size:15px}.media-library-head p{margin:3px 0 0;color:rgba(244,245,247,.46);font-size:10px}
      .media-library-actions{display:flex;align-items:center;gap:8px}
      .media-library-toolbar{flex-wrap:wrap}.media-library-toolbar input[type="search"],.media-library-toolbar select{min-height:36px;border:1px solid rgba(255,255,255,.1);border-radius:8px;background:#10121a;color:inherit;padding:7px 9px;font:inherit;font-size:11px}.media-library-toolbar input[type="search"]{flex:1 1 240px}.media-library-toolbar select{flex:0 0 150px}
      .media-library-button{border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.05);color:inherit;padding:8px 10px;font:inherit;font-size:10px;cursor:pointer}.media-library-button:hover:not(:disabled){border-color:rgba(160,137,229,.55);background:rgba(160,137,229,.12)}.media-library-button:disabled{opacity:.4;cursor:not-allowed}.media-library-button.is-primary{border-color:rgba(160,137,229,.55);background:rgba(160,137,229,.16)}.media-library-button.is-danger{color:#ff9a82}
      .media-library-status{margin-left:auto;color:rgba(244,245,247,.46);font-size:10px}
      .media-library-grid{overflow:auto;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;align-content:start}
      .media-library-card{min-width:0;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.025)}
      .media-library-thumb{aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden;background:#07080d}.media-library-thumb img{width:100%;height:100%;object-fit:contain}.media-library-meta{display:grid;gap:4px;padding:10px}.media-library-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;color:rgba(244,245,247,.86)}.media-library-sub{font-size:9px;color:rgba(244,245,247,.42)}.media-library-card-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:5px}.media-library-card-actions .media-library-button{padding:6px 7px;font-size:9px}
      .media-library-empty{grid-column:1/-1;padding:48px 20px;text-align:center;color:rgba(244,245,247,.45);font-size:11px}
      @media(max-width:700px){.media-library-overlay{padding:8px}.media-library-panel{width:100%;max-height:96vh}.media-library-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.media-library-status{width:100%;margin-left:0}}
    `;
    document.head.appendChild(style);
  }

  function createOverlay() {
    if (overlay) return;
    injectStyles();
    overlay = document.createElement("div");
    overlay.className = "media-library-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="media-library-panel" role="dialog" aria-modal="true" aria-labelledby="mediaLibraryTitle">
        <div class="media-library-head">
          <div><h2 id="mediaLibraryTitle">Media Library</h2><p>Reusable CMS media stored in Cloudflare R2.</p></div>
          <div class="media-library-actions"><button type="button" class="media-library-button" data-media-refresh>Refresh</button><button type="button" class="media-library-button" data-media-close>Close</button></div>
        </div>
        <div class="media-library-toolbar">
          <input type="search" placeholder="Search file name or R2 key" data-media-search />
          <select data-media-folder aria-label="Media folder"></select>
          <button type="button" class="media-library-button is-primary" data-media-upload>Upload</button>
          <input type="file" accept="image/png,image/jpeg,image/webp" data-media-file hidden />
          <span class="media-library-status" data-media-status role="status" aria-live="polite"></span>
        </div>
        <div class="media-library-grid" data-media-grid></div>
      </section>`;
    document.body.appendChild(overlay);
    grid = overlay.querySelector("[data-media-grid]");
    status = overlay.querySelector("[data-media-status]");
    searchInput = overlay.querySelector("[data-media-search]");
    folderSelect = overlay.querySelector("[data-media-folder]");
    uploadInput = overlay.querySelector("[data-media-file]");
    uploadButton = overlay.querySelector("[data-media-upload]");

    folders.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder;
      option.textContent = folder === "all" ? "All folders" : folder;
      folderSelect.appendChild(option);
    });

    overlay.querySelector("[data-media-close]").addEventListener("click", close);
    overlay.querySelector("[data-media-refresh]").addEventListener("click", () => void load());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay && !overlay.hidden) close();
    });
    searchInput.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => void load(), 220);
    });
    folderSelect.addEventListener("change", () => void load());
    uploadButton.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", () => {
      const [file] = uploadInput.files || [];
      uploadInput.value = "";
      if (file) void upload(file);
    });
  }

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Media reference copied.", value);
    } catch {
      showToast("Could not copy media reference.", value, "error");
    }
  }

  function render() {
    if (!grid) return;
    grid.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "media-library-empty";
      empty.textContent = loading ? "Loading media…" : "No media matches this view.";
      grid.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "media-library-card";
      const thumb = document.createElement("div");
      thumb.className = "media-library-thumb";
      const image = document.createElement("img");
      image.src = item.url;
      image.alt = item.originalName || item.key;
      image.loading = "lazy";
      thumb.appendChild(image);
      const meta = document.createElement("div");
      meta.className = "media-library-meta";
      const name = document.createElement("div");
      name.className = "media-library-name";
      name.title = item.key;
      name.textContent = item.originalName || item.key.split("/").pop();
      const sub = document.createElement("div");
      sub.className = "media-library-sub";
      sub.textContent = `${item.folder} · ${formatBytes(item.size)}`;
      const actions = document.createElement("div");
      actions.className = "media-library-card-actions";

      if (typeof currentOptions.onSelect === "function") {
        const use = document.createElement("button");
        use.type = "button";
        use.className = "media-library-button is-primary";
        use.textContent = "Use";
        use.addEventListener("click", () => {
          currentOptions.onSelect(item);
          close();
        });
        actions.appendChild(use);
      }

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "media-library-button";
      copy.textContent = "Copy ref";
      copy.addEventListener("click", () => void copyText(item.logicalPath));

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "media-library-button is-danger";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => void removeItem(item));
      actions.append(copy, remove);
      meta.append(name, sub, actions);
      card.append(thumb, meta);
      grid.appendChild(card);
    });
  }

  async function load() {
    if (loading) return;
    loading = true;
    items = [];
    render();
    status.textContent = "Loading…";
    try {
      const params = new URLSearchParams({ limit: "200" });
      const folder = folderSelect.value;
      const search = searchInput.value.trim();
      if (folder && folder !== "all") params.set("folder", folder);
      if (search) params.set("search", search);
      const data = await fetchJson(`/api/admin/media/library?${params}`);
      items = data.items || [];
      status.textContent = `${items.length} item${items.length === 1 ? "" : "s"}${data.truncated ? " · first page" : ""}`;
    } catch (error) {
      status.textContent = "Library unavailable";
      showToast("Could not load Media Library.", error.message, "error");
    } finally {
      loading = false;
      render();
    }
  }

  async function upload(file) {
    const folder = folderSelect.value === "all"
      ? (currentOptions.folder || "uploads")
      : folderSelect.value;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      showToast("Unsupported image.", "Use PNG, JPEG or WebP.", "error");
      return;
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      showToast("Image too large.", "Maximum upload size is 5 MB.", "error");
      return;
    }
    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading…";
    try {
      const form = new FormData();
      form.set("folder", folder);
      form.set("file", file);
      await fetchJson("/api/admin/media/upload", { method: "POST", body: form });
      folderSelect.value = folder;
      searchInput.value = "";
      showToast("Media uploaded to R2.", "It is now reusable from the library.");
      await load();
    } catch (error) {
      showToast("Upload failed.", error.message, "error");
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = "Upload";
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete ${item.originalName || item.key.split("/").pop()} from R2?\n\nDeletion is blocked automatically if Draft or Published CMS content still references it.`)) return;
    try {
      await fetchJson("/api/admin/media/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key })
      });
      showToast("Media deleted from R2.");
      await load();
    } catch (error) {
      const refs = error.payload?.references || [];
      const detail = refs.length
        ? `${refs.length} CMS reference${refs.length === 1 ? "" : "s"} still use this media.`
        : error.message;
      showToast("Media was not deleted.", detail, "error");
    }
  }

  function open(options = {}) {
    createOverlay();
    currentOptions = options || {};
    overlay.hidden = false;
    searchInput.value = "";
    folderSelect.value = folders.includes(currentOptions.folder) ? currentOptions.folder : "all";
    void load();
    window.setTimeout(() => searchInput.focus(), 0);
  }

  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    currentOptions = {};
  }

  injectStyles();
  enableMediaNav();
  const navObserver = new MutationObserver(enableMediaNav);
  navObserver.observe(document.body, { childList: true, subtree: true });

  window.SDLiveMediaLibrary = { open, close, refresh: load };
})();
