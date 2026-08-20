export function begin(element) {
  if (!element) return;
  element.dataset.cmsState = "loading";
}

export function complete(element) {
  if (!element) return;
  element.dataset.cmsState = "ready";
}

export function fail(element) {
  if (!element) return;
  element.dataset.cmsState = "ready";
}
