(() => {
  function init() {
    const card = document.getElementById("availabilityAdminCard");
    if (!card || document.getElementById("availabilityAdminManage")) return;
    const force = card.querySelector(".availability-force");
    const temporary = card.querySelector(".availability-temporary");
    const travel = card.querySelector(".availability-travel");
    const schedule = card.querySelector(".availability-schedule");
    if (!force || !temporary || !schedule) return;

    const details = document.createElement("details");
    details.className = "availability-admin-manage";
    details.id = "availabilityAdminManage";

    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.className = "availability-admin-manage__label";
    const title = document.createElement("strong");
    title.textContent = "Manage availability";
    const note = document.createElement("small");
    note.textContent = "Force mode · temporary status · travel · service hours";
    label.append(title, note);

    const chevron = document.createElement("span");
    chevron.className = "availability-admin-manage__chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";
    summary.append(label, chevron);

    const body = document.createElement("div");
    body.className = "availability-admin-manage__body";

    force.before(details);
    details.append(summary, body);
    body.append(force, temporary);
    if (travel) body.append(travel);
    body.append(schedule);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    queueMicrotask(init);
  }
})();
