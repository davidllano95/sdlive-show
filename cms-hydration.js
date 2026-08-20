(() => {
  if (window.SDLIVE_CMS_HYDRATION) return;
  window.SDLIVE_CMS_HYDRATION = true;

  const pending = new Set();

  function begin(element) {
    if (!element) return;
    pending.add(element);
    element.dataset.cmsState = "loading";
  }

  function complete(element) {
    if (!element) return;
    pending.delete(element);
    element.dataset.cmsState = "ready";
  }

  function fail(element) {
    if (!element) return;
    pending.delete(element);
    element.dataset.cmsState = "ready";
  }

  window.SDLIVE_CMS_HYDRATION = {
    begin,
    complete,
    fail
  };
})();
