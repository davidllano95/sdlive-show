(() => {
  let attempts = 0;
  const MAX_ATTEMPTS = 8;

  function compactShowDay(panel) {
    if (!panel || panel.querySelector("#showDayAdminManage")) return;
    const head = panel.querySelector(".showday-control__head");
    const intro = panel.querySelector(".showday-control__intro");
    const row = panel.querySelector(".showday-control__row");
    const meta = panel.querySelector(".showday-control__meta");
    if (!head || !intro || !row || !meta) return;

    const details = document.createElement("details");
    details.className = "availability-admin-manage showday-admin-manage";
    details.id = "showDayAdminManage";

    const summary = document.createElement("summary");
    const label = document.createElement("span");
    label.className = "availability-admin-manage__label";

    const title = document.createElement("strong");
    title.textContent = "Manage Show Day";
    const note = document.createElement("small");
    note.textContent = "Auto · Force On · Force Off";
    label.append(title, note);

    const chevron = document.createElement("span");
    chevron.className = "availability-admin-manage__chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";
    summary.append(label, chevron);

    const body = document.createElement("div");
    body.className = "availability-admin-manage__body showday-admin-manage__body";

    head.after(details);
    details.append(summary, body);
    body.append(intro, row, meta);
    panel.dataset.compactControl = "true";
  }

  function buildCluster() {
    const metrics = document.querySelector(".metrics");
    const availability = document.getElementById("availabilityAdminCard");
    const showDay = document.getElementById("showDayQaControl");
    if (!metrics || !availability || !showDay) return false;

    compactShowDay(showDay);

    let cluster = document.getElementById("adminControlCluster");
    if (!cluster) {
      cluster = document.createElement("section");
      cluster.className = "admin-control-cluster";
      cluster.id = "adminControlCluster";
      cluster.setAttribute("aria-label", "Operational controls");
      metrics.after(cluster);
    }

    if (availability.parentElement !== cluster) cluster.append(availability);
    if (showDay.parentElement !== cluster) cluster.append(showDay);
    return true;
  }

  function init() {
    if (buildCluster()) return;
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) window.setTimeout(init, 40);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
