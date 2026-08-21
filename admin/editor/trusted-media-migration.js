(() => {
  if (window.SDLIVE_TRUSTED_MEDIA_MIGRATION) return;
  window.SDLIVE_TRUSTED_MEDIA_MIGRATION = true;

  const editorBody = document.getElementById("editorBody");
  const trustedSectionButton = document.querySelector('[data-section="trustedTitle"]');
  const toastStack = document.getElementById("toastStack");

  if (!editorBody || !trustedSectionButton) return;

  const LOGICAL_MEDIA_PREFIX = "assets/media/";
  const LEGACY_PREFIXES = ["assets/clients/", "assets/brands/"];
  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  const MAX_BYTES = 5 * 1024 * 1024;

  let busy = false;
  let decorateQueued = false;

  function showToast(title, detail = "", type = "success") {
    if (!toastStack) return;

    const toast = document.createElement("div");
    toast.className = `toast is-${type}`;

    const strong = document.createElement("strong");
    strong.textContent = title;
    toast.appendChild(strong);

    if (detail) toast.append(document.createTextNode(` ${detail}`));
    toastStack.appendChild(toast);
    window.setTimeout(() => toast.remove(), 5200);
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

  function isLegacyTrustedSource(source) {
    const value = String(source || "").trim().replace(/^\//, "");
    return LEGACY_PREFIXES.some((prefix) => value.startsWith(prefix));
  }

  function sourceInputs() {
    return Array.from(
      editorBody.querySelectorAll('input[data-trusted-path$=".src"]')
    );
  }

  function legacyInputs() {
    return sourceInputs().filter((input) => isLegacyTrustedSource(input.value));
  }

  function folderForPath(path) {
    return String(path || "").includes(".reveal.items.") ? "brands" : "clients";
  }

  function extensionType(path) {
    const normalized = String(path || "").split("?")[0].toLowerCase();
    if (normalized.endsWith(".png")) return "image/png";
    if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) return "image/jpeg";
    if (normalized.endsWith(".webp")) return "image/webp";
    return "";
  }

  function fileNameFor(source) {
    const clean = String(source || "").split("?")[0];
    const name = clean.split("/").filter(Boolean).pop();
    return name || "trusted-media";
  }

  function logicalMediaPath(key) {
    return `${LOGICAL_MEDIA_PREFIX}${String(key || "").replace(/^\/+/, "")}`;
  }

  async function loadLegacyAsset(source) {
    const normalized = String(source || "").replace(/^\//, "");
    const assetUrl = new URL(`/${normalized}`, window.location.origin);
    const response = await fetch(assetUrl.toString(), {
      credentials: "same-origin",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Could not read ${normalized} (${response.status})`);
    }

    const blob = await response.blob();
    const contentType = String(blob.type || response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase() || extensionType(normalized);

    if (!ALLOWED_TYPES.has(contentType)) {
      throw new Error(`${normalized} is not PNG, JPEG or WebP`);
    }

    if (blob.size <= 0 || blob.size > MAX_BYTES) {
      throw new Error(`${normalized} exceeds the 5 MB media limit`);
    }

    return new File([blob], fileNameFor(normalized), { type: contentType });
  }

  async function uploadLegacySource(source, folder) {
    const file = await loadLegacyAsset(source);
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("folder", folder);

    const data = await fetchJson("/api/admin/media/upload", {
      method: "POST",
      body: form
    });

    return logicalMediaPath(data.media.key);
  }

  function preserveScaleAndReplace(input, nextSource) {
    const tools = input.closest(".field")?.querySelector(".trusted-media-tools");
    const range = tools?.querySelector('.trusted-media-scale input[type="range"]');
    const currentScale = range?.value || "1";

    input.value = nextSource;
    input.dispatchEvent(new Event("input", { bubbles: true }));

    if (range) {
      range.value = currentScale;
      range.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async function migrateLegacyMedia(button, status) {
    if (busy) return;

    const inputs = legacyInputs();
    if (!inputs.length) {
      showToast("Trusted media is already on R2.");
      decorate();
      return;
    }

    const unique = new Map();
    inputs.forEach((input) => {
      const source = input.value.trim().replace(/^\//, "");
      if (!unique.has(source)) {
        unique.set(source, {
          source,
          folder: folderForPath(input.dataset.trustedPath)
        });
      }
    });

    const approved = window.confirm(
      `Copy ${unique.size} Trusted By media file${unique.size === 1 ? "" : "s"} from GitHub assets to R2?\n\nThis updates only the current unsaved Draft references. Review the preview, then use Save Draft to keep them.`
    );
    if (!approved) return;

    busy = true;
    button.disabled = true;
    const originalText = button.textContent;
    const migrated = new Map();

    try {
      let index = 0;
      for (const entry of unique.values()) {
        index += 1;
        button.textContent = `Migrating ${index}/${unique.size}…`;
        status.textContent = entry.source;
        migrated.set(
          entry.source,
          await uploadLegacySource(entry.source, entry.folder)
        );
      }

      inputs.forEach((input) => {
        const source = input.value.trim().replace(/^\//, "");
        const nextSource = migrated.get(source);
        if (!nextSource) return;
        preserveScaleAndReplace(input, nextSource);
      });

      status.textContent = `${unique.size} migrated · Save Draft to keep`;
      showToast(
        "Trusted media copied to R2.",
        "Review the preview, then click Save Draft. The public Home has not changed."
      );
    } catch (error) {
      status.textContent = "Migration stopped · Draft references unchanged";
      showToast("Media migration failed.", error.message, "error");
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = originalText;
      window.setTimeout(decorate, 0);
    }
  }

  function decorate() {
    decorateQueued = false;
    if (!trustedSectionButton.classList.contains("is-active")) return;

    const toolbar = editorBody.querySelector(".trusted-collection-toolbar");
    if (!toolbar) return;

    let panel = editorBody.querySelector(".trusted-media-migration");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "trusted-media-migration";

      const copy = document.createElement("div");
      copy.className = "trusted-media-migration__copy";

      const title = document.createElement("strong");
      title.textContent = "R2 migration";

      const status = document.createElement("span");
      status.className = "trusted-media-migration__status";

      copy.append(title, status);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "trusted-mini-button trusted-media-migration__button";
      button.addEventListener("click", () => void migrateLegacyMedia(button, status));

      panel.append(copy, button);
      toolbar.insertAdjacentElement("afterend", panel);
    }

    const button = panel.querySelector(".trusted-media-migration__button");
    const status = panel.querySelector(".trusted-media-migration__status");
    const count = legacyInputs().length;

    if (button) {
      button.textContent = count ? `Migrate legacy media (${count})` : "Legacy media migrated";
      button.disabled = busy || count === 0;
    }

    if (status && !busy) {
      status.textContent = count
        ? `${count} current GitHub asset reference${count === 1 ? "" : "s"}`
        : "All current Trusted media references use R2 or a non-legacy source.";
    }
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    window.requestAnimationFrame(decorate);
  }

  const observer = new MutationObserver(queueDecorate);
  observer.observe(editorBody, { childList: true, subtree: true });

  trustedSectionButton.addEventListener("click", () => {
    window.setTimeout(queueDecorate, 160);
  });

  function injectStyles() {
    if (document.getElementById("trusted-media-migration-styles")) return;

    const style = document.createElement("style");
    style.id = "trusted-media-migration-styles";
    style.textContent = `
      .trusted-media-migration {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: -3px 0 14px;
        padding: 10px 11px;
        border: 1px solid rgba(160,137,229,.18);
        border-radius: 9px;
        background: rgba(160,137,229,.045);
      }

      .trusted-media-migration__copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .trusted-media-migration__copy strong {
        color: rgba(255,255,255,.88);
        font-size: 10px;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .trusted-media-migration__status {
        overflow: hidden;
        color: rgba(255,255,255,.48);
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .trusted-media-migration__button {
        flex: 0 0 auto;
        border-color: rgba(160,137,229,.42);
      }
    `;

    document.head.appendChild(style);
  }

  injectStyles();
  queueDecorate();
})();
