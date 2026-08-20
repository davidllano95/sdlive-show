(() => {
  if (window.SDLIVE_HOME_NAVIGATION) return;
  window.SDLIVE_HOME_NAVIGATION = true;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

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

    // Prevent the analytics-consent compatibility layer from binding navigation.
    button.dataset.canonicalHomeBound = "true";
    button.setAttribute("data-site-navigation", "home-top");

    // Document capture wins over legacy target listeners on desktop and mobile Safari.
    document.addEventListener("click", handleActivation, true);

    // Pointer activation cleans the address bar before Safari synthesizes the click.
    document.addEventListener(
      "pointerup",
      (event) => {
        if (!isHomeArrowTarget(event.target)) return;
        cleanHomeUrl();
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
