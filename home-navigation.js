(() => {
  if (window.SDLIVE_HOME_NAVIGATION) return;
  window.SDLIVE_HOME_NAVIGATION = true;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function loadHeroContentBinding() {
    import("/cms-hydration.js?v=20260820-1")
      .then(() => import("/hero-content.js?v=20260820-1"))
      .catch((error) => {
        // Static Hero content remains the intentional fallback.
        console.warn(
          "[SD.Live] CMS hydration or Hero binding could not be loaded; using static fallback.",
          error
        );
      });
  }

  function isHomeArrowTarget(target) {
    return Boolean(target?.closest?.("#backToTop"));
  }

  function cleanHomeUrl() {
    if (
      window.location.pathname !== "/" ||
      window.location.search ||
      window.location.hash
    ) {
      window.history.replaceState(window.history.state, "", "/");
    }
  }

  function goHomeTop() {
    cleanHomeUrl();
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth"
    });
  }

  function handleActivation(event) {
    if (!isHomeArrowTarget(event.target)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    goHomeTop();
  }

  function init() {
    const button = document.getElementById("backToTop");
    if (!button) return;

    button.dataset.canonicalHomeBound = "true";
    button.setAttribute("data-site-navigation", "home-top");

    document.addEventListener("click", handleActivation, true);

    document.addEventListener(
      "pointerup",
      (event) => {
        if (!isHomeArrowTarget(event.target)) return;
        cleanHomeUrl();
      },
      true
    );
  }

  loadHeroContentBinding();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
