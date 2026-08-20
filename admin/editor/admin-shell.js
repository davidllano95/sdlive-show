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
    script.setAttribute(`data-${datasetKey}`, "true");
    document.body.appendChild(script);
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      loadEditorScript(
        "./trusted-editor.js?v=20260820-1",
        "sdlive-trusted-editor"
      );
      loadEditorScript(
        "./trusted-preview-controls.js?v=20260820-1",
        "sdlive-trusted-preview-controls"
      );
    },
    { once: true }
  );
})();
