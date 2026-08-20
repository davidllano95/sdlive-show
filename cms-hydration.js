(() => {
  if (window.SDLIVE_CMS_HYDRATION) return;
  window.SDLIVE_CMS_HYDRATION = true;

  const style = document.createElement("style");
  style.textContent = `
    [data-cms-state="loading"] {
      visibility: hidden;
    }

    [data-cms-state="ready"] {
      visibility: visible;
    }
  `;
  document.head.appendChild(style);

  function begin(element) {
    if (!element) return;
    element.dataset.cmsState = "loading";
  }

  function complete(element) {
    if (!element) return;
    element.dataset.cmsState = "ready";
  }

  function fail(element) {
    if (!element) return;
    element.dataset.cmsState = "ready";
  }

  window.SDLIVE_CMS_HYDRATION = {
    begin,
    complete,
    fail
  };
})();
