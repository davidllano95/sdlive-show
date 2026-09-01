(() => {
  const ENDPOINT = "/api/admin/availability";
  const REFRESH_MS = 60000;
  let node = null;
  let timer = 0;
  let refreshTimer = 0;
  let busy = false;

  function build() {
    const card = document.getElementById("availabilityAdminCard");
    if (!card || document.getElementById("availabilityNextWindowAdmin")) return false;
    const head = card.querySelector(".availability-admin-card__head");
    if (!head) return false;

    node = document.createElement("div");
    node.className = "availability-next-window-admin";
    node.id = "availabilityNextWindowAdmin";
    node.hidden = true;
    node.innerHTML = `
      <span>Next service window</span>
      <strong id="availabilityNextWindowAdminValue"></strong>
    `;
    head.after(node);
    return true;
  }

  function render(data) {
    if (!node) return;
    const effective = data?.effective || {};
    const next = data?.nextHumanWindow || null;
    const value = node.querySelector("#availabilityNextWindowAdminValue");

    if (effective.status !== "away" || !next?.startsAt || !next?.labelEn) {
      node.hidden = true;
      if (value) value.textContent = "";
      return;
    }

    node.hidden = false;
    if (value) {
      value.textContent = `${next.labelEn}${next.timeZone ? ` · ${next.timeZone}` : ""}`;
    }
  }

  async function refresh() {
    if (busy || !node) return;
    busy = true;
    try {
      const response = await fetch(ENDPOINT, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) return;
      const data = await response.json().catch(() => null);
      if (data?.ok) render(data);
    } catch {
      // The main Availability card already owns Admin error presentation.
    } finally {
      busy = false;
    }
  }

  function queueRefresh() {
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, 120);
  }

  function bindRefreshSignals() {
    const card = document.getElementById("availabilityAdminCard");
    if (!card) return;
    const targets = [
      card.querySelector(".availability-admin-card__status"),
      card.querySelector(".availability-admin-card__meta"),
      card.querySelector("#availabilityForceFeedback"),
      card.querySelector("#availabilityTemporaryMeta"),
      card.querySelector("#availabilityScheduleFeedback"),
      card.querySelector("#availabilityTravelFeedback"),
      card.querySelector("#availabilityTravelMeta")
    ].filter(Boolean);

    const observer = new MutationObserver(queueRefresh);
    targets.forEach((target) => observer.observe(target, {
      childList: true,
      characterData: true,
      subtree: true
    }));

    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }

  function init() {
    if (!build()) return;
    bindRefreshSignals();
    refresh();
    refreshTimer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener("pagehide", () => {
      window.clearInterval(refreshTimer);
      window.clearTimeout(timer);
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    queueMicrotask(init);
  }
})();
