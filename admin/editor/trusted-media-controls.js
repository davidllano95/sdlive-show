(() => {
  if (window.SDLIVE_TRUSTED_MEDIA_CONTROLS) return;
  window.SDLIVE_TRUSTED_MEDIA_CONTROLS = true;

  const editorBody = document.getElementById("editorBody");
  const iframe = document.getElementById("sitePreview");
  const trustedSectionButton = document.querySelector('[data-section="trustedTitle"]');
  const toastStack = document.getElementById("toastStack");
  const discardButton = document.getElementById("discardChanges");

  if (!editorBody || !iframe || !trustedSectionButton) return;

  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const DEFAULT_PUBLIC_BASE = "https://media.sdlive.show";
  const MAX_LOGO_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  const SCALE_MIN = 0.5;
  const SCALE_MAX = 1.8;
  const SCALE_STEP = 0.05;

  let mediaStatus = null;
  let previewObserver = null;
  let editorDecorateQueued = false;
  let bridgeWrite = false;
  const scaleBySource = new Map();

  injectStyles();

  function clampScale(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, numeric));
  }

  function scaleLabel(value) {
    return `${Math.round(clampScale(value) * 100)}%`;
  }

  function publicBase() {
    return String(mediaStatus?.publicBase || DEFAULT_PUBLIC_BASE).replace(/\/+$/, "");
  }

  function logicalMediaPath(key) {
    return `${LOGICAL_MEDIA_PREFIX}${String(key || "").replace(/^\/+/, "")}`;
  }

  function publicMediaUrl(source) {
    if (!String(source || "").startsWith(LOGICAL_MEDIA_PREFIX)) return source;
    return `${publicBase()}/${String(source).slice(LOGICAL_MEDIA_PREFIX.length)}`;
  }

  function mediaKind(source) {
    if (!source) return "No image";
    if (String(source).startsWith(LOGICAL_MEDIA_PREFIX)) return "R2 media";
    if (String(source).startsWith("assets/")) return "GitHub asset";
    return "Custom source";
  }

  function showToast(title, detail = "", type = "success") {
    if (!toastStack) return;

    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;

    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);

    if (detail) toast.append(document.createTextNode(` ${detail}`));

    toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4200);
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    }

    return data;
  }

  function collectScale(image) {
    if (!image?.src) return;
    scaleBySource.set(image.src, clampScale(image.scale ?? 1));
  }

  function collectDraftScales(draft) {
    scaleBySource.clear();

    (draft?.clients || []).forEach((client) => {
      collectScale(client.logo);
      (client.reveal?.items || []).forEach((item) => {
        if (item.type === "collaboration") collectScale(item.image);
        else collectScale(item);
      });
    });
  }

  async function loadMediaContext() {
    try {
      const [status, trusted] = await Promise.all([
        fetchJson("/api/admin/media/status"),
        fetchJson("/api/admin/content/trusted")
      ]);

      mediaStatus = status;
      collectDraftScales(trusted?.entry?.draft);
      queueDecorate();
      applyPreviewMedia();
    } catch (error) {
      mediaStatus = { configured: false, publicBase: DEFAULT_PUBLIC_BASE };
      queueDecorate();
      console.warn("Trusted media controls unavailable", error);
    }
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
      proxy.dataset.trustedPath = originalPath;
      proxy.value = originalValue;
      bridgeWrite = false;
    }

    return true;
  }

  function scaleForSource(source) {
    return clampScale(scaleBySource.get(source) ?? 1);
  }

  function updatePreviewImage(image, source) {
    if (!image || !source) return;

    image.style.scale = String(scaleForSource(source));

    if (String(source).startsWith(LOGICAL_MEDIA_PREFIX)) {
      image.dataset.cmsMediaSource = source;
      const resolved = publicMediaUrl(source);
      if (image.getAttribute("src") !== resolved) image.setAttribute("src", resolved);
    }
  }

  function applyPreviewMedia() {
    let doc;
    try {
      doc = iframe.contentDocument;
    } catch {
      return;
    }

    const section = doc?.querySelector(".trusted-wrap");
    if (!section) return;

    section.querySelectorAll("img").forEach((image) => {
      const source = image.dataset.cmsMediaSource || image.getAttribute("src") || "";
      if (!source) return;

      if (source.startsWith(LOGICAL_MEDIA_PREFIX) || scaleBySource.has(source)) {
        updatePreviewImage(image, source);
      }
    });
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

    previewObserver = new MutationObserver(() => {
      window.requestAnimationFrame(applyPreviewMedia);
    });

    previewObserver.observe(section, { childList: true, subtree: true });
    applyPreviewMedia();
  }

  function mediaFolderForPath(path) {
    return path.includes(".reveal.items.") ? "brands" : "clients";
  }

  function mediaNounForPath(path) {
    return path.includes(".image.src") ? "image" : "logo";
  }

  function statusText(source) {
    if (!mediaStatus) return "Checking R2…";
    if (!mediaStatus.configured) return "R2 unavailable";
    return mediaKind(source);
  }

  async function uploadForField({ sourceInput, folder, button, status, fileInput }) {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      showToast("Unsupported image.", "Use PNG, JPEG or WebP.", "error");
      return;
    }

    if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
      showToast("Image is too large.", "Maximum size is 5 MB.", "error");
      return;
    }

    const previousSource = sourceInput.value.trim();
    const previousScale = scaleForSource(previousSource);
    const originalButtonText = button.textContent;

    button.disabled = true;
    button.textContent = "Uploading…";
    status.textContent = "Uploading to R2…";

    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("folder", folder);

      const data = await fetchJson("/api/admin/media/upload", {
        method: "POST",
        body: form
      });

      const logicalSource = logicalMediaPath(data.media.key);
      scaleBySource.set(logicalSource, previousScale);

      sourceInput.value = logicalSource;
      sourceInput.dispatchEvent(new Event("input", { bubbles: true }));

      status.textContent = "R2 media · save draft to keep";
      button.textContent = "Replace";
      applyPreviewMedia();

      showToast(
        "Media uploaded.",
        "Preview updated. Save Draft to keep this reference."
      );
    } catch (error) {
      status.textContent = statusText(previousSource);
      button.textContent = originalButtonText;
      showToast("Upload failed.", error.message, "error");
    } finally {
      button.disabled = false;
    }
  }

  function buildMediaTools(sourceInput) {
    const path = sourceInput.dataset.trustedPath || "";
    if (!path.endsWith(".src")) return null;

    const source = sourceInput.value.trim();
    const noun = mediaNounForPath(path);
    const folder = mediaFolderForPath(path);
    const scalePath = path.replace(/\.src$/, ".scale");

    const tools = document.createElement("div");
    tools.className = "trusted-media-tools";
    tools.dataset.mediaPath = path;

    const top = document.createElement("div");
    top.className = "trusted-media-tools__top";

    const status = document.createElement("span");
    status.className = "trusted-media-tools__status";
    status.textContent = statusText(source);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp";
    fileInput.hidden = true;

    const upload = document.createElement("button");
    upload.type = "button";
    upload.className = "trusted-mini-button trusted-media-upload";
    upload.textContent = source ? "Replace" : "Upload";
    upload.disabled = !mediaStatus?.configured;
    upload.title = `Upload or replace ${noun} in R2`;
    upload.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      void uploadForField({ sourceInput, folder, button: upload, status, fileInput });
    });

    top.append(status, upload, fileInput);

    const scaleRow = document.createElement("div");
    scaleRow.className = "trusted-media-scale";

    const scaleTitle = document.createElement("span");
    scaleTitle.textContent = `${noun === "logo" ? "Logo" : "Image"} size`;

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(SCALE_MIN);
    range.max = String(SCALE_MAX);
    range.step = String(SCALE_STEP);
    range.value = String(scaleForSource(source));
    range.setAttribute("aria-label", `${noun} size`);

    const output = document.createElement("output");
    output.textContent = scaleLabel(range.value);

    range.addEventListener("input", () => {
      const currentSource = sourceInput.value.trim();
      const nextScale = clampScale(range.value);
      output.textContent = scaleLabel(nextScale);

      if (currentSource) scaleBySource.set(currentSource, nextScale);

      setDraftPathThroughBoundInput(sourceInput, scalePath, nextScale);
      applyPreviewMedia();
    });

    sourceInput.addEventListener("input", () => {
      if (bridgeWrite) return;
      const nextSource = sourceInput.value.trim();
      const nextScale = scaleForSource(nextSource);
      range.value = String(nextScale);
      output.textContent = scaleLabel(nextScale);
      status.textContent = statusText(nextSource);
      upload.textContent = nextSource ? "Replace" : "Upload";
      window.requestAnimationFrame(applyPreviewMedia);
    });

    scaleRow.append(scaleTitle, range, output);
    tools.append(top, scaleRow);

    const note = document.createElement("p");
    note.className = "trusted-media-tools__note";
    note.textContent = "PNG/JPEG/WebP · max 5 MB · resizing does not create another file.";
    tools.appendChild(note);

    return tools;
  }

  function refreshExistingTools(field, sourceInput) {
    const tools = field.querySelector(".trusted-media-tools");
    if (!tools) return false;

    const source = sourceInput.value.trim();
    const status = tools.querySelector(".trusted-media-tools__status");
    const upload = tools.querySelector(".trusted-media-upload");
    const range = tools.querySelector('.trusted-media-scale input[type="range"]');
    const output = tools.querySelector(".trusted-media-scale output");

    if (status) status.textContent = statusText(source);
    if (upload) {
      upload.disabled = !mediaStatus?.configured;
      upload.textContent = source ? "Replace" : "Upload";
    }
    if (range) range.value = String(scaleForSource(source));
    if (output) output.textContent = scaleLabel(scaleForSource(source));

    return true;
  }

  function decorateMediaFields() {
    editorDecorateQueued = false;

    if (!trustedSectionButton.classList.contains("is-active")) return;

    editorBody
      .querySelectorAll('input[data-trusted-path$=".src"]')
      .forEach((sourceInput) => {
        const field = sourceInput.closest(".field");
        if (!field) return;

        const help = field.querySelector(".field-help");
        if (help) {
          help.textContent = "Source reference. Upload/Replace stores new media in R2.";
        }

        if (refreshExistingTools(field, sourceInput)) return;

        const tools = buildMediaTools(sourceInput);
        if (tools) field.appendChild(tools);
      });
  }

  function queueDecorate() {
    if (editorDecorateQueued) return;
    editorDecorateQueued = true;
    window.requestAnimationFrame(decorateMediaFields);
  }

  const editorObserver = new MutationObserver(() => {
    queueDecorate();
    window.setTimeout(bindPreviewObserver, 0);
  });

  editorObserver.observe(editorBody, { childList: true, subtree: true });

  trustedSectionButton.addEventListener("click", () => {
    window.setTimeout(() => {
      void loadMediaContext();
      bindPreviewObserver();
      queueDecorate();
    }, 120);
  });

  iframe.addEventListener("load", () => {
    window.setTimeout(bindPreviewObserver, 180);
  });

  document.addEventListener(
    "click",
    (event) => {
      if (event.target === discardButton) {
        window.setTimeout(() => void loadMediaContext(), 180);
      }
    },
    true
  );

  function injectStyles() {
    if (document.getElementById("trusted-media-controls-styles")) return;

    const style = document.createElement("style");
    style.id = "trusted-media-controls-styles";
    style.textContent = `
      .trusted-media-tools {
        display: grid;
        gap: 9px;
        margin-top: 9px;
        padding: 10px;
        border: 1px solid rgba(160,137,229,.18);
        border-radius: 9px;
        background: rgba(160,137,229,.045);
      }

      .trusted-media-tools__top,
      .trusted-media-scale {
        display: flex;
        align-items: center;
        gap: 9px;
      }

      .trusted-media-tools__top {
        justify-content: space-between;
      }

      .trusted-media-tools__status {
        min-width: 0;
        color: rgba(255,255,255,.62);
        font-size: 10px;
        letter-spacing: .04em;
      }

      .trusted-media-upload {
        flex: 0 0 auto;
        border-color: rgba(160,137,229,.38);
      }

      .trusted-media-scale > span {
        flex: 0 0 62px;
        color: rgba(255,255,255,.68);
        font-size: 10px;
      }

      .trusted-media-scale input[type="range"] {
        min-width: 0;
        flex: 1 1 auto;
        accent-color: #a089e5;
      }

      .trusted-media-scale output {
        flex: 0 0 38px;
        color: #d9ccff;
        font-size: 10px;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      .trusted-media-tools__note {
        margin: 0;
        color: rgba(255,255,255,.42);
        font-size: 9px;
        line-height: 1.35;
      }
    `;

    document.head.appendChild(style);
  }

  if (trustedSectionButton.classList.contains("is-active")) {
    void loadMediaContext();
    window.setTimeout(bindPreviewObserver, 120);
    queueDecorate();
  }
})();
