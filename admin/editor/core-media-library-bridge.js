(() => {
  if (window.SDLIVE_CORE_MEDIA_LIBRARY_BRIDGE) return;
  window.SDLIVE_CORE_MEDIA_LIBRARY_BRIDGE = true;

  const editorBody = document.getElementById("editorBody");
  const saveDraftButton = document.getElementById("saveDraft");
  const toastStack = document.getElementById("toastStack");
  if (!editorBody) return;

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
      throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
    }
    return data;
  }

  function activeSection() {
    return document.querySelector(".section-link.is-active[data-section]")?.dataset.section || "";
  }

  function setAtPath(object, path, value) {
    const parts = path.split(".");
    let cursor = object;
    parts.forEach((key, index) => {
      if (index === parts.length - 1) cursor[key] = value;
      else cursor = cursor[key];
    });
  }

  function mediaTargets(section) {
    const blocks = [...editorBody.querySelectorAll(".core-media-block")];
    if (section === "about") {
      return blocks.slice(0, 1).map((block) => ({ block, path: "image.src", folder: "about" }));
    }
    if (section === "work") {
      return blocks.map((block, index) => ({ block, path: `items.${index}.image.src`, folder: "portfolio" }));
    }
    return [];
  }

  async function applyLibraryItem(section, path, item) {
    if (saveDraftButton && !saveDraftButton.disabled) {
      showToast(
        "Save Draft before choosing library media.",
        "This prevents the library from overwriting unsaved Editor changes.",
        "error"
      );
      return;
    }

    try {
      const data = await fetchJson(`/api/admin/content/${section}`);
      const draft = JSON.parse(JSON.stringify(data.entry?.draft || {}));
      setAtPath(draft, path, item.logicalPath);
      await fetchJson(`/api/admin/content/${section}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft })
      });
      showToast(
        "Media selected from R2 Library.",
        "Draft reference saved. Production remains unchanged until Publish. Reloading Editor."
      );
      window.setTimeout(() => window.location.reload(), 850);
    } catch (error) {
      showToast("Could not use library media.", error.message, "error");
    }
  }

  function decorate() {
    decorateQueued = false;
    const section = activeSection();
    if (!window.SDLiveMediaLibrary || !["about", "work"].includes(section)) return;

    mediaTargets(section).forEach(({ block, path, folder }) => {
      if (block.querySelector("[data-core-library-button]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "core-mini-button";
      button.setAttribute("data-core-library-button", "true");
      button.textContent = "Choose from library";
      button.addEventListener("click", () => {
        if (saveDraftButton && !saveDraftButton.disabled) {
          showToast(
            "Save Draft first.",
            "Choose-from-library works from the saved Draft so no unsaved changes are lost.",
            "error"
          );
          return;
        }
        window.SDLiveMediaLibrary.open({
          folder,
          onSelect: (item) => void applyLibraryItem(section, path, item)
        });
      });
      block.appendChild(button);
    });
  }

  function queueDecorate() {
    if (decorateQueued) return;
    decorateQueued = true;
    window.requestAnimationFrame(decorate);
  }

  const observer = new MutationObserver(queueDecorate);
  observer.observe(editorBody, { childList: true, subtree: true });
  document.querySelectorAll(".section-link[data-section]").forEach((button) => {
    button.addEventListener("click", () => window.setTimeout(queueDecorate, 180));
  });
  queueDecorate();
})();
