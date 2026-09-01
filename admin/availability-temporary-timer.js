(() => {
  const MIN_MINUTES = 15;
  const MAX_MINUTES = 1440;

  function clampDuration(value) {
    const minutes = Number.isFinite(value) ? Math.round(value) : 120;
    return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes));
  }

  function setSelectMinutes(select, minutes) {
    const safeMinutes = clampDuration(minutes);
    let option = Array.from(select.options).find((item) => Number(item.value) === safeMinutes);
    if (!option) {
      option = document.createElement("option");
      option.value = String(safeMinutes);
      option.textContent = `${safeMinutes} minutes`;
      option.dataset.timerCustom = "true";
      select.append(option);
    }
    select.value = String(safeMinutes);
    return safeMinutes;
  }

  function splitMinutes(total) {
    const safe = clampDuration(total);
    return {
      hours: Math.floor(safe / 60),
      minutes: safe % 60
    };
  }

  function buildTimer(select) {
    if (!select || select.dataset.timerEnhanced === "true") return;
    select.dataset.timerEnhanced = "true";
    select.hidden = true;

    const shell = document.createElement("div");
    shell.className = "availability-temporary-timer";
    shell.setAttribute("role", "group");
    shell.setAttribute("aria-label", "Temporary status timer");

    const label = document.createElement("span");
    label.className = "availability-temporary-timer__label";
    label.textContent = "For";

    const hours = document.createElement("input");
    hours.type = "number";
    hours.inputMode = "numeric";
    hours.min = "0";
    hours.max = "24";
    hours.step = "1";
    hours.setAttribute("aria-label", "Temporary status hours");

    const hoursUnit = document.createElement("span");
    hoursUnit.className = "availability-temporary-timer__unit";
    hoursUnit.textContent = "h";

    const minutes = document.createElement("input");
    minutes.type = "number";
    minutes.inputMode = "numeric";
    minutes.min = "0";
    minutes.max = "59";
    minutes.step = "15";
    minutes.setAttribute("aria-label", "Temporary status minutes");

    const minutesUnit = document.createElement("span");
    minutesUnit.className = "availability-temporary-timer__unit";
    minutesUnit.textContent = "min";

    const hint = document.createElement("small");
    hint.className = "availability-temporary-timer__hint";
    hint.textContent = "15 min–24 h · starts when you choose a status";

    function renderFromSelect() {
      const current = splitMinutes(Number(select.value) || 120);
      hours.value = String(current.hours);
      minutes.value = String(current.minutes);
    }

    function readVisibleMinutes() {
      let hourValue = Math.max(0, Math.min(24, Number(hours.value) || 0));
      let minuteValue = Math.max(0, Math.min(59, Number(minutes.value) || 0));
      if (hourValue >= 24) minuteValue = 0;
      return hourValue * 60 + minuteValue;
    }

    function syncCanonicalValue() {
      return setSelectMinutes(select, readVisibleMinutes());
    }

    function commit() {
      const safe = syncCanonicalValue();
      const split = splitMinutes(safe);
      hours.value = String(split.hours);
      minutes.value = String(split.minutes);
    }

    function syncDisabled() {
      const disabled = Boolean(select.disabled);
      hours.disabled = disabled;
      minutes.disabled = disabled;
      shell.classList.toggle("is-disabled", disabled);
    }

    [hours, minutes].forEach((input) => {
      input.addEventListener("input", syncCanonicalValue);
      input.addEventListener("change", commit);
      input.addEventListener("blur", commit);
    });

    shell.append(label, hours, hoursUnit, minutes, minutesUnit, hint);
    select.after(shell);
    renderFromSelect();
    syncDisabled();

    new MutationObserver(syncDisabled).observe(select, {
      attributes: true,
      attributeFilter: ["disabled"]
    });
  }

  function init() {
    const select = document.getElementById("availabilityDuration");
    if (!select) return false;
    buildTimer(select);
    return true;
  }

  if (!init()) document.addEventListener("DOMContentLoaded", init, { once: true });
})();
