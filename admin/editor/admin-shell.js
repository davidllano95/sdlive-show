(() => {
  const shell = document.getElementById("editorBackoffice");
  const collapse = document.getElementById("collapseAdminSidebar");

  if (!shell || !collapse) return;

  function safeStorageGet(key) {
    try {
      return window.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage?.setItem(key, value);
    } catch {
      // Sidebar preference is non-critical.
    }
  }

  function ensureFinanceNav() {
    const nav = shell.querySelector(".app-nav");
    const editorLink = nav?.querySelector('a[href="./"]');
    if (!nav || !editorLink || nav.querySelector('a[href="../finance/"]')) return;

    const finance = document.createElement("a");
    finance.className = "app-nav__item";
    finance.href = "../finance/";
    finance.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4V5Zm2 2v10h12V7H6Zm1.5 7.5h2V16h-2v-1.5Zm3.5-3h2V16h-2v-4.5Zm3.5-3h2V16h-2V8.5Z"/></svg>
      <span>Finance</span>
      <small>SD.Live Track</small>
    `;
    nav.insertBefore(finance, editorLink);
  }

  ensureFinanceNav();

  const collapsed =
    safeStorageGet("sdlive-admin-dashboard-collapsed") === "true";

  shell.classList.toggle("is-collapsed", collapsed);
  collapse.textContent = collapsed ? "Expand" : "Collapse";

  collapse.addEventListener("click", () => {
    const next = !shell.classList.contains("is-collapsed");
    shell.classList.toggle("is-collapsed", next);

    safeStorageSet(
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
        "./media-library.js?v=20260821-1",
        "sdlive-media-library"
      );
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
        "./trusted-brand-placement.js?v=20260820-2",
        "sdlive-trusted-brand-placement"
      );
      loadEditorScript(
        "./trusted-preview-parity.js?v=20260820-2",
        "sdlive-trusted-preview-parity"
      );
      loadEditorScript(
        "./testimonials-editor.js?v=20260820-1",
        "sdlive-testimonials-editor"
      );
      loadEditorScript(
        "./core-sections-bootstrap.js?v=20260821-1",
        "sdlive-core-sections-bootstrap"
      );
      loadEditorScript(
        "./core-sections-editor.js?v=20260821-1",
        "sdlive-core-sections-editor"
      );
      loadEditorScript(
        "./core-media-library-bridge.js?v=20260821-1",
        "sdlive-core-media-library-bridge"
      );
      loadEditorScript(
        "./presentation-sections-editor.js?v=20260821-1",
        "sdlive-presentation-sections-editor"
      );
      loadEditorScript(
        "./visual-safeguards-editor.js?v=20260821-3",
        "sdlive-visual-safeguards-editor"
      );
      loadEditorScript(
        "./safeguards-status-placement.js?v=20260821-1",
        "sdlive-safeguards-status-placement"
      );
      loadEditorScript(
        "./editor-resilience.js?v=20260821-3",
        "sdlive-editor-resilience"
      );
      loadEditorScript(
        "./automatic-failsafe.js?v=20260821-1",
        "sdlive-automatic-failsafe"
      );
      loadEditorScript(
        "./publish-progress.js?v=20260821-1",
        "sdlive-publish-progress"
      );
    },
    { once: true }
  );
})();
