(() => {
  function init() {
    const section = document.querySelector(".availability-temporary");
    if (!section || document.getElementById("availabilityTemporaryApply")) return false;

    const controls = Array.from(section.querySelectorAll("button[data-mode]"));
    const controlsRow = section.querySelector(".availability-admin-card__controls");
    const durationSelect = section.querySelector("#availabilityDuration");
    if (!controls.length || !controlsRow || !durationSelect) return false;

    let selectedMode = controls.find((button) => button.classList.contains("is-active"))?.dataset.mode || "auto";
    let dirty = false;
    let allowCanonicalClick = false;

    const apply = document.createElement("button");
    apply.type = "button";
    apply.id = "availabilityTemporaryApply";
    apply.className = "availability-admin-card__apply availability-temporary__apply";
    apply.textContent = "Apply status";

    const feedback = document.createElement("small");
    feedback.className = "availability-admin-section__feedback availability-temporary__apply-feedback";
    feedback.id = "availabilityTemporaryApplyFeedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");

    function syncDisabled() {
      apply.disabled = controls.every((button) => button.disabled);
    }

    function setSelection(mode, { markDirty = true } = {}) {
      selectedMode = ["auto", "available", "limited", "away"].includes(mode) ? mode : "auto";
      controls.forEach((button) => {
        const selected = button.dataset.mode === selectedMode;
        button.classList.toggle("is-active", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
      if (markDirty) {
        dirty = true;
        feedback.textContent = "Not applied yet.";
      }
    }

    section.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-mode]");
      if (!button || !section.contains(button)) return;
      if (allowCanonicalClick) {
        allowCanonicalClick = false;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      if (button.disabled) return;
      setSelection(button.dataset.mode);
    }, true);

    section.addEventListener("input", (event) => {
      if (!event.target.closest(".availability-temporary-timer")) return;
      dirty = true;
      feedback.textContent = "Not applied yet.";
    });

    apply.addEventListener("click", () => {
      if (apply.disabled) return;
      const target = controls.find((button) => button.dataset.mode === selectedMode);
      if (!target || target.disabled) return;

      dirty = false;
      feedback.textContent = "Applying…";
      allowCanonicalClick = true;
      target.click();

      window.setTimeout(() => {
        if (!dirty && feedback.textContent === "Applying…") feedback.textContent = "Applied.";
      }, 450);
    });

    const controlObserver = new MutationObserver(() => {
      syncDisabled();
      if (dirty) return;
      const active = controls.find((button) => button.getAttribute("aria-pressed") === "true");
      if (active) selectedMode = active.dataset.mode || "auto";
    });
    controls.forEach((button) => controlObserver.observe(button, {
      attributes: true,
      attributeFilter: ["disabled", "aria-pressed", "class"]
    }));

    controlsRow.append(apply);
    controlsRow.after(feedback);
    syncDisabled();
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
