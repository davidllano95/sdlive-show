const AVAILABILITY_ADMIN_RUNTIME_VERSION = "20260901-3";

export function applyAvailabilityAdminRuntime(response) {
  const contentType = response?.headers?.get("content-type") || "";
  if (!response || !response.ok || !contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/admin/availability-admin.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-admin/>` +
          `<link rel="stylesheet" href="/admin/availability-live-mode-parity.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-admin-parity/>` +
          `<script defer src="/admin/availability-admin.js?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-admin></script>`,
          { html: true }
        );
      }
    })
    .transform(response);
}
