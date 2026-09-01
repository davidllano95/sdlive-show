(() => {
  const ENDPOINT = "/api/admin/availability";
  let card = null;
  let statusNode = null;
  let metaNode = null;
  let errorNode = null;
  let durationSelect = null;
  let controls = [];
  let busy = false;

  function labelFor(status) {
    return {
      available: "Available",
      limited: "Limited",
      away: "Away"
    }[status] || "Available";
  }

  function formatExpiry(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function setBusy(next) {
    busy = next;
    controls.forEach((control) => { control.disabled = next; });
    if (durationSelect) durationSelect.disabled = next;
  }

  function render(data) {
    const effective = data?.effective || {};
    const override = data?.override || {};
    const profile = data?.profile || {};
    const status = ["available", "limited", "away"].includes(effective.status)
      ? effective.status
      : "available";

    statusNode.innerHTML = `<i aria-hidden="true"></i>${labelFor(status)}`;
    const source = effective.source === "manual-override"
      ? `Manual until ${formatExpiry(effective.nextTransition) || "expiry"}`
      : effective.source === "weekly-schedule"
        ? "Auto · weekly schedule"
        : "Auto · schedule not configured";
    metaNode.textContent = source;

    card.dataset.status = status;
    card.querySelectorAll("button[data-mode]").forEach((button) => {
      const mode = button.dataset.mode;
      const active = mode === "auto"
        ? override.mode === "auto"
        : override.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (!profile.configured && override.mode === "auto") {
      metaNode.title = "Auto preserves the current Available behavior until a weekly schedule is configured.";
    } else {
      metaNode.removeAttribute("title");
    }
  }

  async function load() {
    try {
      const response = await fetch(ENDPOINT, { headers: { Accept: "application/json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not load Availability");
      errorNode.hidden = true;
      render(data);
    } catch (error) {
      errorNode.textContent = error.message || "Could not load Availability";
      errorNode.hidden = false;
    }
  }

  async function save(mode) {
    if (busy) return;
    setBusy(true);
    errorNode.hidden = true;
    const payload = mode === "auto"
      ? { mode: "auto" }
      : { mode, durationMinutes: Number(durationSelect.value) || 120 };

    try {
      const response = await fetch(ENDPOINT, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || "Could not save Availability");
      render(data);
    } catch (error) {
      errorNode.textContent = error.message || "Could not save Availability";
      errorNode.hidden = false;
    } finally {
      setBusy(false);
    }
  }

  function buildCard() {
    const metrics = document.querySelector(".metrics");
    if (!metrics || document.getElementById("availabilityAdminCard")) return false;

    card = document.createElement("article");
    card.className = "metric availability-admin-card";
    card.id = "availabilityAdminCard";
    card.innerHTML = `
      <div class="availability-admin-card__head">
        <div>
          <span>Availability</span>
          <strong class="availability-admin-card__status"><i aria-hidden="true"></i>Checking</strong>
          <small class="availability-admin-card__meta">Reading SD.Live Availability Core…</small>
        </div>
      </div>
      <div class="availability-admin-card__controls" aria-label="Availability quick controls">
        <button type="button" data-mode="auto">Auto</button>
        <button type="button" data-mode="available">Available</button>
        <button type="button" data-mode="limited">Limited</button>
        <button type="button" data-mode="away">Away</button>
        <select aria-label="Override duration" id="availabilityDuration">
          <option value="60">1 hour</option>
          <option value="120" selected>2 hours</option>
          <option value="240">4 hours</option>
          <option value="480">8 hours</option>
        </select>
      </div>
      <small class="availability-admin-card__error" hidden></small>
    `;

    metrics.append(card);
    statusNode = card.querySelector(".availability-admin-card__status");
    metaNode = card.querySelector(".availability-admin-card__meta");
    errorNode = card.querySelector(".availability-admin-card__error");
    durationSelect = card.querySelector("#availabilityDuration");
    controls = Array.from(card.querySelectorAll("button[data-mode]"));
    controls.forEach((button) => button.addEventListener("click", () => save(button.dataset.mode)));
    return true;
  }

  function init() {
    if (!buildCard()) return;
    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
