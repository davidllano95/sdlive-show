const AVAILABILITY_ADMIN_RUNTIME_VERSION = "20260901-6";
const ADMIN_CONTROL_CLUSTER_VERSION = "20260901-2";
const ADMIN_CONTROL_FINAL_POLISH_VERSION = "20260901-1";
const AVAILABILITY_TEMPORARY_TIMER_VERSION = "20260901-3";

export function applyAvailabilityAdminRuntime(response) {
  const contentType = response?.headers?.get("content-type") || "";
  if (!response || !response.ok || !contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<link rel="stylesheet" href="/admin/availability-admin.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-admin/>` +
          `<link rel="stylesheet" href="/admin/availability-live-mode-parity.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-admin-parity/>` +
          `<link rel="stylesheet" href="/admin/availability-travel-admin.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-travel-admin/>` +
          `<link rel="stylesheet" href="/admin/availability-next-window-admin.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-next-window-admin/>` +
          `<link rel="stylesheet" href="/admin/availability-compact-layout.css?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-compact-layout/>` +
          `<link rel="stylesheet" href="/admin/admin-control-cluster.css?v=${ADMIN_CONTROL_CLUSTER_VERSION}" data-sdlive-admin-control-cluster/>` +
          `<link rel="stylesheet" href="/admin/admin-control-final-polish.css?v=${ADMIN_CONTROL_FINAL_POLISH_VERSION}" data-sdlive-admin-control-final-polish/>` +
          `<link rel="stylesheet" href="/admin/availability-temporary-timer.css?v=${AVAILABILITY_TEMPORARY_TIMER_VERSION}" data-sdlive-availability-temporary-timer/>` +
          `<script defer src="/admin/availability-admin.js?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-admin></script>` +
          `<script defer src="/admin/availability-travel-admin.js?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-travel-admin></script>` +
          `<script defer src="/admin/availability-next-window-admin.js?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-next-window-admin></script>` +
          `<script defer src="/admin/availability-compact-layout.js?v=${AVAILABILITY_ADMIN_RUNTIME_VERSION}" data-sdlive-availability-compact-layout></script>` +
          `<script defer src="/admin/admin-control-cluster.js?v=${ADMIN_CONTROL_CLUSTER_VERSION}" data-sdlive-admin-control-cluster></script>` +
          `<script defer src="/admin/admin-control-final-polish.js?v=${ADMIN_CONTROL_FINAL_POLISH_VERSION}" data-sdlive-admin-control-final-polish></script>` +
          `<script defer src="/admin/availability-temporary-timer.js?v=${AVAILABILITY_TEMPORARY_TIMER_VERSION}" data-sdlive-availability-temporary-timer></script>`,
          { html: true }
        );
      }
    })
    .transform(response);
}
