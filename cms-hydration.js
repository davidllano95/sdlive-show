(() => {
  if (window.SDLIVE_CMS_HYDRATION) return;

  window.SDLIVE_CMS_HYDRATION = true;

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
