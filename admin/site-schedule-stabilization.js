(() => {
  if (window.SDLiveSiteScheduleStabilization) return;
  window.SDLiveSiteScheduleStabilization = true;

  const layout = document.querySelector(".schedule-layout");
  const browser = document.querySelector(".schedule-browser");
  const editor = document.querySelector(".schedule-editor");
  const eventList = document.getElementById("eventList");
  const form = document.getElementById("scheduleForm");
  if (!layout || !browser || !editor || !eventList || !form) return;

  const MOBILE_QUERY = "(max-width: 700px)";
  const media = window.matchMedia(MOBILE_QUERY);

  const back = document.createElement("button");
  back.type = "button";
  back.className = "site-schedule-mobile-back";
  back.textContent = "← Choose work";
  editor.insertBefore(back, editor.firstChild);

  function selectedEvent() {
    return eventList.querySelector(".schedule-event.is-selected");
  }

  function enterEditing() {
    if (!media.matches || form.hidden) return;
    document.body.classList.add("site-schedule-mobile-editing");
    window.requestAnimationFrame(() => {
      editor.scrollIntoView({ behavior: "smooth", block: "start" });
      back.focus({ preventScroll: true });
    });
  }

  function leaveEditing({ focusSelection = true } = {}) {
    document.body.classList.remove("site-schedule-mobile-editing");
    if (!media.matches) return;
    window.requestAnimationFrame(() => {
      browser.scrollIntoView({ behavior: "smooth", block: "start" });
      if (focusSelection) selectedEvent()?.focus({ preventScroll: true });
    });
  }

  back.addEventListener("click", () => leaveEditing());

  eventList.addEventListener("click", (event) => {
    if (!event.target.closest(".schedule-event")) return;
    window.setTimeout(enterEditing, 40);
  });

  eventList.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.target.closest(".schedule-event")) return;
    window.setTimeout(enterEditing, 40);
  });

  const formObserver = new MutationObserver(() => {
    if (form.hidden) leaveEditing({ focusSelection: false });
  });
  formObserver.observe(form, { attributes: true, attributeFilter: ["hidden"] });

  media.addEventListener?.("change", () => {
    if (!media.matches) document.body.classList.remove("site-schedule-mobile-editing");
  });
})();
