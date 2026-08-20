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

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      if (document.querySelector('script[data-sdlive-trusted-editor]')) {
        return;
      }

      const script = document.createElement("script");
      script.src = "./trusted-editor.js?v=20260820-1";
      script.dataset.sdliveTrustedEditor = "true";
      document.body.appendChild(script);
    },
    { once: true }
  );
})();
