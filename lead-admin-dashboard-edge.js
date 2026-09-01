const LEAD_ADMIN_NAV_VERSION = "20260901-1";

export function applyLeadAdminNavigationRuntime(response) {
  const contentType = response?.headers?.get("content-type") || "";
  if (!response || !response.ok || !contentType.includes("text/html")) return response;

  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(
          `<script defer src="/admin/leads-dashboard-entry.js?v=${LEAD_ADMIN_NAV_VERSION}" data-sdlive-lead-admin-nav></script>`,
          { html: true }
        );
      }
    })
    .transform(response);
}
