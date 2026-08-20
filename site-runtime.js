(() => {
  if (window.SDLIVE_SITE_RUNTIME) return;
  window.SDLIVE_SITE_RUNTIME = true;

  const RUNTIME_STYLESHEET = "/site-runtime.css?v=20260819-3";

  function ensureRuntimeStylesheet() {
    if (document.querySelector('link[data-sdlive-site-runtime]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = RUNTIME_STYLESHEET;
    link.dataset.sdliveSiteRuntime = "";
    document.head.appendChild(link);
  }

  function bindCanonicalHomeArrow() {
    if (document.documentElement.dataset.siteRuntimeArrowBound === "true") return;
    document.documentElement.dataset.siteRuntimeArrowBound = "true";

    /*
      Capture at document level so this runs before legacy target listeners.
      This makes the behavior identical on desktop and touch browsers.
    */
    document.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest?.("#backToTop");
        if (!button) return;

        event.preventDefault();
        event.stopImmediatePropagation();

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
      },
      true
    );
  }

  function polishTheatreLayout() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/theatre-sound-design-audio-post") return;

    const grid = document.querySelector(".seo-service-section .seo-content-grid");
    if (!grid || grid.dataset.theatreUnified === "true") return;

    const cards = Array.from(grid.querySelectorAll(":scope > .seo-content-card"));
    if (cards.length < 4) return;

    const [theatre, audioPost, production, international] = cards;

    grid.dataset.theatreUnified = "true";
    grid.classList.add("theatre-service-layout");

    theatre.classList.add("theatre-service-primary");
    const theatreIndex = theatre.querySelector(".service-index");
    const theatreHeading = theatre.querySelector("h2");
    const theatreParagraph = theatre.querySelector("p");
    const theatreList = theatre.querySelector("ul");

    if (theatreIndex) theatreIndex.textContent = "01 / THEATRE SOUND DESIGN";
    if (theatreHeading) theatreHeading.textContent = "Theatre Sound Design";
    if (theatreParagraph) {
      theatreParagraph.textContent =
        "Creative and technical theater sound for live productions, built around the story, the venue and the way the show needs to run from rehearsal through performance.";
    }

    if (theatreList) {
      theatreList.insertAdjacentHTML(
        "beforebegin",
        '<p class="theatre-scope-intro">The theatre sound workflow can include:</p>'
      );
      theatreList.innerHTML = `
        <li>Sound effects, atmospheres and transitions</li>
        <li>Playback design and QLab programming</li>
        <li>System and console programming</li>
        <li>RF, FOH, monitors and cue workflow</li>
        <li>Rehearsal support, documentation and technical handoff</li>
      `;
    }

    /* The old Production card duplicated the same theatre service. */
    production.remove();

    audioPost.classList.add("theatre-support-panel", "theatre-support-panel--post");
    const postIndex = audioPost.querySelector(".service-index");
    if (postIndex) postIndex.textContent = "02 / AUDIO POST";

    international.classList.add(
      "theatre-support-panel",
      "theatre-support-panel--international"
    );
    const internationalIndex = international.querySelector(".service-index");
    if (internationalIndex) internationalIndex.textContent = "03 / INTERNATIONAL";
  }

  function init() {
    ensureRuntimeStylesheet();
    bindCanonicalHomeArrow();
    polishTheatreLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
