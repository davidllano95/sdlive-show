const SHOWDAY_RUNTIME_VERSION = "20260823-1";

export function applyShowDayRuntime(response) {
  const contentType = response?.headers?.get("content-type") || "";
  if (!response || !response.ok || !contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/showday-runtime.css?v=${SHOWDAY_RUNTIME_VERSION}" data-sdlive-showday-runtime/>` +
          `<script defer src="/showday-runtime.js?v=${SHOWDAY_RUNTIME_VERSION}" data-sdlive-showday-runtime></script>`,
          { html: true }
        );
      }
    })
    .on("#showdayToggle", {
      element(element) {
        element.remove();
      }
    })
    .transform(response);
}
