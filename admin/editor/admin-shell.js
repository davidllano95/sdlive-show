(() => {
  const shell = document.getElementById("editorBackoffice");
  const collapse = document.getElementById("collapseAdminSidebar");

  if (!shell || !collapse) return;

  const collapsed =
    localStorage.getItem("sdlive-admin-dashboard-collapsed") === "true";

  shell.classList.toggle("is-collapsed", collapsed);
  collapse.textContent = collapsed ? "Expand" : "Collapse";

  collapse.addEventListener("click", () => {
    const next = !shell.classList.contains("is-collapsed");
    shell.classList.toggle("is-collapsed", next);

    localStorage.setItem(
      "sdlive-admin-dashboard-collapsed",
      String(next)
    );

    collapse.textContent = next ? "Expand" : "Collapse";
  });

  function loadEditorScript(src, datasetKey) {
    if (document.querySelector(`script[data-${datasetKey}]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.setAttribute(`data-${datasetKey}`, "true");
    document.body.appendChild(script);
  }

  function loadEditorStylesheet(href, datasetKey) {
    if (document.querySelector(`link[data-${datasetKey}]`)) {
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute(`data-${datasetKey}`, "true");
    document.head.appendChild(link);
  }

  loadEditorStylesheet(
    "./editor-ux.css?v=20260820-1",
    "sdlive-editor-ux"
  );

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      loadEditorScript(
        "./trusted-editor.js?v=20260820-1",
        "sdlive-trusted-editor"
      );
      loadEditorScript(
        "./trusted-preview-controls.js?v=20260820-4",
        "sdlive-trusted-preview-controls"
      );
      loadEditorScript(
        "./trusted-select-bridge.js?v=20260820-4",
        "sdlive-trusted-select-bridge"
      );
      loadEditorScript(
        "./trusted-media-controls.js?v=20260820-1",
        "sdlive-trusted-media-controls"
      );
      loadEditorScript(
        "./trusted-brand-placement.js?v=20260820-1",
        "sdlive-trusted-brand-placement"
      );
      loadEditorScript(
        "./trusted-preview-parity.js?v=20260820-1",
        "sdlive-trusted-preview-parity"
      );
    },
    { once: true }
  );
})();
