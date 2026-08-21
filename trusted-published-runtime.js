(() => {
  const section = document.querySelector(
    '.trusted-wrap[data-content-source="cms-ssr"][data-server-rendered="true"]'
  );

  if (!section) return;

  let frame = 0;

  function countGridColumns(grid) {
    const template = String(
      window.getComputedStyle(grid).gridTemplateColumns || ""
    ).trim();

    if (!template || template === "none") return 1;

    const repeated = template.match(/^repeat\(\s*(\d+)\s*,/i);
    if (repeated) return Math.max(1, Number(repeated[1]) || 1);

    return Math.max(
      1,
      template
        .split(/\s+/)
        .filter((token) => token && !token.startsWith("[")).length
    );
  }

  function gridSpan(target, columns) {
    const previous = target.style.gridColumn;
    target.style.removeProperty("grid-column");

    const computed = window.getComputedStyle(target);
    const values = [computed.gridColumnStart, computed.gridColumnEnd];
    let span = 1;

    values.some((value) => {
      const match = String(value || "").match(/span\s+(\d+)/i);
      if (!match) return false;
      span = Math.max(1, Number(match[1]) || 1);
      return true;
    });

    if (previous) target.style.gridColumn = previous;
    return Math.min(Math.max(1, span), columns);
  }

  function applyPlacement(target) {
    const placement = String(target.dataset.cmsBrandPlacement || "auto");
    const grid = target.parentElement;

    if (!grid?.classList.contains("supported-reveal-logos")) return;

    target.style.removeProperty("grid-column");
    if (placement === "auto") return;

    const columns = countGridColumns(grid);
    const span = gridSpan(target, columns);

    let start = 1;
    if (placement === "center") {
      start = Math.floor((columns - span) / 2) + 1;
    } else if (placement === "right") {
      start = columns - span + 1;
    }

    start = Math.max(
      1,
      Math.min(start, Math.max(1, columns - span + 1))
    );

    target.style.gridColumn = `${start} / span ${span}`;
  }

  function applyAllPlacements() {
    frame = 0;
    section
      .querySelectorAll("[data-cms-brand-placement]")
      .forEach(applyPlacement);
  }

  function schedule() {
    if (frame) return;
    frame = window.requestAnimationFrame(applyAllPlacements);
  }

  function stablePrepareMarqueesForLanguageChange() {
    return Array.from(document.querySelectorAll("[data-marquee]")).flatMap((marquee) => {
      if (!marquee.classList.contains("is-ready")) return [];

      const track = marquee.querySelector(".trusted-track");
      const animation = track?.getAnimations?.()[0];
      if (!track || !animation || animation.currentTime === null) return [];

      const state = {
        marquee,
        track,
        currentTime: animation.currentTime,
        wasPaused: animation.playState === "paused"
      };

      // Language changes only alter localized text. Trusted cards have fixed
      // widths, so rebuilding the three marquee sets is unnecessary and drops
      // direct hover listeners from the cloned sets. Freeze in place instead.
      animation.pause();
      return [state];
    });
  }

  function stableRestoreMarqueesAfterLanguageChange(states) {
    states.forEach(({ marquee, track, currentTime, wasPaused }) => {
      const animation = track?.getAnimations?.()[0];
      if (!animation) return;

      animation.currentTime = currentTime;

      if (wasPaused) {
        animation.pause();
        return;
      }

      if (typeof window.updateTrustedMarqueePlayback === "function") {
        window.updateTrustedMarqueePlayback(marquee);
        return;
      }

      const shouldPlay =
        marquee.dataset.inViewport !== "false" &&
        marquee.dataset.interactionPaused !== "true";

      if (shouldPlay) animation.play();
      else animation.pause();
    });
  }

  function installLanguageMarqueeStability() {
    if (
      typeof window.prepareMarqueesForLanguageChange !== "function" ||
      typeof window.restoreMarqueesAfterLanguageChange !== "function"
    ) {
      return;
    }

    window.prepareMarqueesForLanguageChange =
      stablePrepareMarqueesForLanguageChange;
    window.restoreMarqueesAfterLanguageChange =
      stableRestoreMarqueesAfterLanguageChange;
  }

  function installStableCarouselHoverPaint() {
    if (document.getElementById("trusted-live-hover-stability")) return;

    const style = document.createElement("style");
    style.id = "trusted-live-hover-stability";
    style.textContent = `
      .trusted-wrap[data-content-source="cms-ssr"]
      .trusted-marquee .client-strip-card:hover::after {
        animation: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  }

  window.addEventListener("resize", schedule, { passive: true });

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(schedule);
    section
      .querySelectorAll(".supported-reveal-logos")
      .forEach((grid) => observer.observe(grid));
  }

  installLanguageMarqueeStability();
  installStableCarouselHoverPaint();
  schedule();
})();
