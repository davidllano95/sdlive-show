(() => {
  if (window.SDLiveCalendarGoogleIntegration) return;
  window.SDLiveCalendarGoogleIntegration = true;

  const actions = document.querySelector(".calendar-welcome__actions");
  if (!actions) return;

  const syncButton = document.createElement("button");
  syncButton.type = "button";
  syncButton.className = "button button--ghost calendar-google-sync";
  syncButton.textContent = "Sync Google Calendar";

  const status = document.createElement("div");
  status.className = "calendar-google-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.innerHTML = '<i aria-hidden="true"></i><span>sam@sdlive.show · work projection + reminders overlay</span>';

  const createButton = document.getElementById("openCreateWork");
  if (createButton) actions.insertBefore(syncButton, createButton);
  else actions.prepend(syncButton);
  actions.appendChild(status);

  function setStatus(text, state = "") {
    status.classList.remove("is-ok", "is-warning", "is-error", "is-working");
    if (state) status.classList.add(state);
    const span = status.querySelector("span");
    if (span) span.textContent = text;
  }

  async function postSync() {
    syncButton.disabled = true;
    syncButton.textContent = "Syncing…";
    setStatus("Syncing REGISTRO → sam@sdlive.show…", "is-working");
    try {
      const response = await fetch("/api/admin/calendar/google-sync", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) {
        const detail = data?.googleCalendar?.message || data?.error || `Sync failed (${response.status})`;
        throw new Error(detail);
      }

      const parts = [
        `${data.created || 0} created`,
        `${data.updated || 0} updated`,
        `${data.unchanged || 0} unchanged`
      ];
      if (data.failed) parts.push(`${data.failed} failed`);
      if (data.capped) parts.push("more changes remain");
      setStatus(`Google Calendar synced · ${parts.join(" · ")}`, data.failed || data.capped ? "is-warning" : "is-ok");
      syncButton.textContent = data.capped ? "Continue sync" : "Sync Google Calendar";

      if (!data.capped && !data.failed) {
        window.setTimeout(() => window.location.reload(), 700);
      }
    } catch (error) {
      setStatus(error?.message || "Google Calendar sync unavailable", "is-error");
      syncButton.textContent = "Retry Google sync";
    } finally {
      syncButton.disabled = false;
    }
  }

  syncButton.addEventListener("click", postSync);
})();
