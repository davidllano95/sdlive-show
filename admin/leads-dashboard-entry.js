(() => {
  function leadNavButton() {
    return [...document.querySelectorAll(".app-nav__item")]
      .find((item) =>
        item.tagName === "BUTTON" &&
        item.querySelector("span")?.textContent?.trim() === "Leads"
      );
  }

  function activateSidebarEntry() {
    const button = leadNavButton();
    if (!button) return;

    const link = document.createElement("a");
    link.className = "app-nav__item";
    link.href = "/admin/leads/";
    link.innerHTML = button.innerHTML;

    const status = link.querySelector("small");
    if (status) status.textContent = "Lead Core";

    button.replaceWith(link);
  }

  function activateDashboardCard() {
    const cards = [...document.querySelectorAll(".workspace-grid .module.is-coming")];
    const card = cards.find(
      (item) => item.querySelector("h4")?.textContent?.trim() === "Leads / CRM"
    );

    if (!card) return;

    const link = document.createElement("a");
    link.className = "module";
    link.href = "/admin/leads/";
    link.dataset.workspace = "leads";
    link.innerHTML = card.innerHTML;

    const status = link.querySelector(".module-status");
    if (status) {
      status.textContent = "Live · Read-only";
      status.classList.add("is-live");
    }

    const description = link.querySelector("p");
    if (description) {
      description.textContent = "Review Contact and Rental enquiries captured by Lead Core in D1 before human follow-up.";
    }

    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "→";
    link.appendChild(arrow);

    card.replaceWith(link);
  }

  activateSidebarEntry();
  activateDashboardCard();
})();
