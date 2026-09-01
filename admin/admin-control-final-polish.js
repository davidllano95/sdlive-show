(() => {
  let attempts = 0;
  const MAX_ATTEMPTS = 10;

  function polishChevrons() {
    const cluster = document.getElementById("adminControlCluster");
    if (!cluster) return false;

    const chevrons = cluster.querySelectorAll(".availability-admin-manage__chevron");
    if (!chevrons.length) return false;

    chevrons.forEach((chevron) => {
      chevron.textContent = "";
      chevron.dataset.cssChevron = "true";
    });
    return true;
  }

  function init() {
    if (polishChevrons()) return;
    attempts += 1;
    if (attempts < MAX_ATTEMPTS) window.setTimeout(init, 50);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
