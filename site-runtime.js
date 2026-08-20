(() => {
  if (window.SDLIVE_SITE_RUNTIME) return;
  window.SDLIVE_SITE_RUNTIME = true;

  const RUNTIME_STYLESHEET = "/site-runtime.css?v=20260819-1";

  function ensureRuntimeStylesheet() {
    if (document.querySelector('link[data-sdlive-site-runtime]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = RUNTIME_STYLESHEET;
    link.dataset.sdliveSiteRuntime = "";
    document.head.appendChild(link);
  }

  function takeOwnershipOfHomeArrow() {
    const existing = document.getElementById("backToTop");
    if (!existing) return null;

    if (existing.dataset.siteRuntimeOwned === "true") return existing;

    const button = existing.cloneNode(true);
    button.dataset.siteRuntimeOwned = "true";
    existing.replaceWith(button);

    const updateVisibility = () => {
      button.classList.toggle("is-visible", window.scrollY > 520);
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();

      /* Clean the address bar without navigating, then keep the physical scroll. */
      if (location.pathname !== "/" || location.search || location.hash) {
        history.replaceState(history.state, "", "/");
      }

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth"
      });
    });

    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();

    return button;
  }

  function alignFloatingActions(button) {
    const whatsapp = document.getElementById("whatsappFloat");
    if (!button || !whatsapp) return;

    const sync = () => {
      const whatsappRect = whatsapp.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      if (!whatsappRect.width || !buttonRect.width) return;

      /* Use the rendered positions so mobile safe areas / CSS overrides cannot drift. */
      const whatsappCenterX = whatsappRect.left + whatsappRect.width / 2;
      const right = Math.max(
        0,
        window.innerWidth - whatsappCenterX - buttonRect.width / 2
      );

      button.style.right = `${right}px`;
    };

    requestAnimationFrame(sync);
    window.addEventListener("resize", sync, { passive: true });
    window.addEventListener("orientationchange", () => requestAnimationFrame(sync));

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", sync, { passive: true });
    }
  }

  function polishTheatreLayout() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/theatre-sound-design-audio-post") return;

    document.body.classList.add("theatre-page-polish");
  }

  function init() {
    ensureRuntimeStylesheet();
    const homeArrow = takeOwnershipOfHomeArrow();
    alignFloatingActions(homeArrow);
    polishTheatreLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
