(() => {
  if (window.SDLIVE_CORE_MEDIA_MIGRATION) return;
  window.SDLIVE_CORE_MEDIA_MIGRATION = true;

  const editorBody = document.getElementById("editorBody");
  const toastStack = document.getElementById("toastStack");
  if (!editorBody) return;

  const LOGICAL_PREFIX = "assets/media/";
  const MAX_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
  const DEFINITIONS = {
    about: {
      folder: "about",
      label: "About",
      collect(draft) {
        return draft?.image?.src
          ? [{ path: "image.src", source: draft.image.src, folder: "about" }]
          : [];
      }
    },
    work: {
      folder: "portfolio",
      label: "Selected Work",
      collect(draft) {
        return (draft?.items || [])
          .map((item, index) => item?.image?.src
            ? { path: `items.${index}.image.src`, source: item.image.src, folder: "portfolio" }
            : null)
          .filter(Boolean);
      }
    }
  };

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

  function activeSection() {
    const value = document.querySelector(".section-link.is-active[data-section]")?.dataset.section || "";
    return value === "travel" ? "international" : value;
  }

  function isLegacySource(source) {
    const value = String(source || "").trim().replace(/^\//, "");
    return value.startsWith("assets/") && !value.startsWith(LOGICAL_PREFIX);
  }

  function getAtPath(object, path) {
    return String(path || "").split(".").reduce((value, key) => value == null ? undefined : value[key], object);
  }

  function setAtPath(object, path, value) {
    const parts = String(path || "").split(".");
    let cursor = object;
    parts.forEach((key, index) => {
      if (index === parts.length - 1) cursor[key] = value;
      else cursor = cursor[key];
    });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function extensionType(path) {
    const value = String(path || "").split("?")[0].toLowerCase();
    if (value.endsWith(".png")) return "image/png";
    if (value.endsWith(".jpg") || value.endsWith(".jpeg")) return "image/jpeg";
    if (value.endsWith(".webp")) return "image/webp";
    return "";
  }

  function fileNameFor(source) {
    return String(source || "").split("?")[0].split("/").filter(Boolean).pop() || "legacy-media";
  }

  async function readLegacyFile(source) {
    const normalized = String(source || "").replace(/^\//, "");
    const response = await fetch(new URL(`/${normalized}`, window.location.origin), {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Could not read ${normalized} (${response.status})`);
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

  async function uploadLegacy(source, folder) {
    const file = await readLegacyFile(source);
    const form = new FormData();
    form.set("folder", folder);
    form.set("file", file, file.name);
    const data = await fetchJson("/api/admin/media/upload", {
      method: "POST",
      body: form
    });
    return `${LOGICAL_PREFIX}${data.media.key}`;
  }

  async function snapshot(section) {
    const data = await fetchJson(`/api/admin/content/${section}`);
    const draft = clone(data.entry?.draft || {});
    const definition = DEFINITIONS[section];
    const references = definition.collect(draft)
      .filter((item) => isLegacySource(item.source));
    return { draft, references };
  }

  async function migrate(section, button, status) {
    if (busy || !DEFINITIONS[section]) return;
    busy = true;
    button.disabled = true;
    button.textContent = "Checking…";
    status.textContent = "Reading saved Draft…";

    try {
      const { draft, references } = await snapshot(section);
      if (!references.length) {
        status.textContent = "No legacy media remains in the saved Draft.";
        showToast(`${DEFINITIONS[section].label} media is already on R2.`);
        return;
      }

      const unique = new Map();
      references.forEach((item) => {
        if (!unique.has(item.source)) unique.set(item.source, item);
      });

      const approved = window.confirm(
        `Copy ${unique.size} ${DEFINITIONS[section].label} media file${unique.size === 1 ? "" : "s"} from GitHub assets to R2?\n\nThe migrator will save only the Draft references. Production will not change until you Publish.`
      );
      if (!approved) return;

      const migrated = new Map();
      let index = 0;
      for (const item of unique.values()) {
        index += 1;
        button.textContent = `Migrating ${index}/${unique.size}…`;
        status.textContent = item.source;
        migrated.set(item.source, await uploadLegacy(item.source, item.folder));
      }

      references.forEach((item) => {
        const current = getAtPath(draft, item.path);
        if (!isLegacySource(current)) return;
        setAtPath(draft, item.path, migrated.get(item.source));
      });

      button.textContent = "Saving Draft…";
      status.textContent = "Writing R2 references to D1 Draft…";
      await fetchJson(`/api/admin/content/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft })
      });

      showToast(
        `${DEFINITIONS[section].label} media migrated to R2.`,
        "The Draft was saved; production is unchanged until Publish. Reloading the Editor now."
      );
      status.textContent = `${unique.size} copied to R2 · Draft saved`;
      window.setTimeout(() => window.location.reload(), 950);
    } catch (error) {
      status.textContent = "Migration stopped · Published content unchanged";
      showToast("Media migration failed.", error.message, "error");
    } finally {
      busy = false;
      button.disabled = false;
      if (button.isConnected) button.textContent = "Check legacy media";
    }
  }

  async function updatePanel(panel, section) {
    if (busy || !panel?.isConnected) return;
    const button = panel.querySelector("[data-core-media-migrate]");
    const status = panel.querySelector("[data-core-media-migration-status]");
    if (!button || !status) return;
    try {
      const { references } = await snapshot(section);
      button.textContent = references.length
        ? `Migrate legacy media (${references.length})`
        : "Check legacy media";
      status.textContent = references.length
        ? `${references.length} GitHub asset reference${references.length === 1 ? "" : "s"} in saved Draft`
        : "Saved Draft is already using R2 media.";
    } catch (error) {
      status.textContent = `Could not inspect Draft · ${error.message}`;
    }
  }

  function decorate() {
    decorateQueued = false;
    const section = activeSection();
    if (!DEFINITIONS[section]) return;
    if (!editorBody.children.length) return;
    let panel = editorBody.querySelector("[data-core-media-migration]");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "core-media-migration";
      panel.setAttribute("data-core-media-migration", "true");
      panel.innerHTML = `
        <div class="core-media-migration__copy">
          <strong>R2 migration</strong>
          <span data-core-media-migration-status>Checking saved Draft…</span>
        </div>
        <button type="button" class="core-mini-button" data-core-media-migrate>Check legacy media</button>`;
      editorBody.prepend(panel);
      const button = panel.querySelector("[data-core-media-migrate]");
      const status = panel.querySelector("[data-core-media-migration-status]");
      button.addEventListener("click", () => void migrate(section, button, status));
    }
    void updatePanel(panel, section);
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    window.requestAnimationFrame(decorate);
  }

  function injectStyles() {
    if (document.getElementById("core-media-migration-styles")) return;
    const style = document.createElement("style");
    style.id = "core-media-migration-styles";
    style.textContent = `
      .core-media-migration{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px;padding:10px 11px;border:1px solid rgba(160,137,229,.18);border-radius:9px;background:rgba(160,137,229,.045)}
      .core-media-migration__copy{display:grid;gap:2px;min-width:0}.core-media-migration__copy strong{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:rgba(255,255,255,.88)}.core-media-migration__copy span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;color:rgba(255,255,255,.48)}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  const observer = new MutationObserver(queueDecorate);
  observer.observe(editorBody, { childList: true, subtree: true });
  document.querySelectorAll(".section-link[data-section]").forEach((button) => {
    button.addEventListener("click", () => window.setTimeout(queueDecorate, 180));
  });
  queueDecorate();
})();
