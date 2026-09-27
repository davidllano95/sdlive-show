(() => {
  let loading = false;

  async function refresh() {
    if (loading || !window.SDLiveFinanceThirdPartyHistory?.renderPayload) return;
    loading = true;
    try {
      const response = await fetch("/api/admin/finance/dashboard", {
        credentials: "same-origin",
        cache: "no-store"
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json")) throw new Error("Unexpected response");
      const data = await response.json();
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.detail || data?.error || `Request failed (${response.status})`);
      }
      window.SDLiveFinanceThirdPartyHistory.renderPayload(data);
    } catch (error) {
      console.warn("[SD.Live] Third-party payment history unavailable", String(error?.message || error));
    } finally {
      loading = false;
    }
  }

  const startupTimer = setInterval(() => {
    if (!document.getElementById("financeOverview")) return;
    clearInterval(startupTimer);
    refresh();
  }, 50);
  setTimeout(() => clearInterval(startupTimer), 10000);

  document.addEventListener("click", (event) => {
    if (!event.target?.closest?.("[data-third-party-pay]")) return;
    // The mark-paid runtime revalidates and writes asynchronously. Refresh history
    // after the bounded action window so a successful fact write appears without
    // requiring a page reload. A cancelled/failed action only causes a read.
    setTimeout(refresh, 1800);
  });

  window.SDLiveFinanceThirdPartyHistoryLoader = { refresh };
})();
