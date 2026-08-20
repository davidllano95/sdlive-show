(() => {
  if (window.SDLIVE_TRUSTED_PREVIEW_CONTROLS) return;
  window.SDLIVE_TRUSTED_PREVIEW_CONTROLS = true;

  const iframe = document.getElementById("sitePreview");
  const trustedSectionButton = document.querySelector(
    '[data-section="trustedTitle"]'
  );
  const previewMeta = document.querySelector(".preview-meta");

  if (!iframe || !trustedSectionButton || !previewMeta) return;

  const style = document.createElement("style");
  style.textContent = `
    .trusted-preview-transport {
      display: none;
      align-items: center;
      gap: 6px;
      margin-inline: auto 8px;
      padding: 4px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 10px;
      background: rgba(8,10,16,.72);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .trusted-preview-transport.is-visible {
      display: inline-flex;
    }
    .trusted-preview-transport button {
      min-width: 34px;
      min-height: 30px;
      padding: 5px 9px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 7px;
      background: rgba(255,255,255,.04);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .trusted-preview-transport button:hover {
      border-color: rgba(160,137,229,.6);
      background: rgba(160,137,229,.12);
    }
    .trusted-preview-transport button[data-role="pause"] {
      min-width: 72px;
    }
  `;
  document.head.appendChild(style);

  const toolbar = document.createElement("div");
  toolbar.className = "trusted-preview-transport";
  toolbar.setAttribute("aria-label", "Trusted By preview controls");

  const previous = document.createElement("button");
  previous.type = "button";
  previous.textContent = "←";
  previous.title = "Show previous companies";
  previous.setAttribute("aria-label", "Show previous companies");

  const pause = document.createElement("button");
  pause.type = "button";
  pause.dataset.role = "pause";
  pause.textContent = "Pause";
  pause.title = "Pause company movement";
  pause.setAttribute("aria-label", "Pause company movement");

  const next = document.createElement("button");
  next.type = "button";
  next.textContent = "→";
  next.title = "Show next companies";
  next.setAttribute("aria-label", "Show next companies");

  toolbar.append(previous, pause, next);

  const metaRight = previewMeta.querySelector(".meta-right");
  previewMeta.insertBefore(toolbar, metaRight || null);

  function marquee() {
    try {
      return iframe.contentDocument?.querySelector("[data-marquee]") || null;
    } catch {
      return null;
    }
  }

  function primaryAnimation(target) {
    const track = target?.querySelector?.(".trusted-track");
    if (!track) return null;

    return track.getAnimations().find((animation) => {
      const duration = Number(
        animation.effect?.getComputedTiming?.().duration
      );
      return Number.isFinite(duration) && duration > 0;
    }) || null;
  }

  function fallbackShift(target, direction) {
    const animation = primaryAnimation(target);
    if (!animation) return false;

    const duration = Number(
      animation.effect?.getComputedTiming?.().duration
    );
    if (!Number.isFinite(duration) || duration <= 0) return false;

    const current = Number(animation.currentTime) || 0;
    const delta = duration * 0.08 * (direction < 0 ? -1 : 1);
    animation.currentTime =
      ((current + delta) % duration + duration) % duration;
    return true;
  }

  function fallbackPause(target, shouldPause) {
    if (!target) return false;

    target.dataset.interactionPaused = shouldPause ? "true" : "false";

    try {
      const update = iframe.contentWindow?.updateTrustedMarqueePlayback;
      if (typeof update === "function") {
        update(target);
        return true;
      }
    } catch {
      // Fall through to direct Web Animations control.
    }

    target
      .querySelector?.(".trusted-track")
      ?.getAnimations?.()
      .forEach((animation) => {
        if (shouldPause) animation.pause();
        else animation.play();
      });

    return true;
  }

  function getApi() {
    try {
      return iframe.contentWindow?.SDLiveTrustedMarquee || null;
    } catch {
      return null;
    }
  }

  function isPaused(target) {
    const api = getApi();
    if (api?.isPaused) return Boolean(api.isPaused(target));
    return target?.dataset?.interactionPaused === "true";
  }

  function syncPauseLabel() {
    const target = marquee();
    const paused = isPaused(target);
    pause.textContent = paused ? "Play" : "Pause";
    pause.title = paused
      ? "Resume company movement"
      : "Pause company movement";
    pause.setAttribute(
      "aria-label",
      paused ? "Resume company movement" : "Pause company movement"
    );
    pause.setAttribute("aria-pressed", String(paused));
  }

  function shift(direction) {
    const target = marquee();
    if (!target) return;

    const api = getApi();
    if (api?.shift) {
      api.shift(target, direction);
    } else {
      fallbackShift(target, direction);
    }
  }

  function togglePause() {
    const target = marquee();
    if (!target) return;

    const nextPaused = !isPaused(target);
    const api = getApi();

    if (api?.setPaused) {
      api.setPaused(target, nextPaused);
    } else {
      fallbackPause(target, nextPaused);
    }

    syncPauseLabel();
  }

  function syncVisibility() {
    const active = trustedSectionButton.classList.contains("is-active");
    toolbar.classList.toggle("is-visible", active);
    toolbar.setAttribute("aria-hidden", String(!active));

    if (active) {
      window.setTimeout(syncPauseLabel, 100);
    }
  }

  previous.addEventListener("click", () => shift(-1));
  next.addEventListener("click", () => shift(1));
  pause.addEventListener("click", togglePause);

  trustedSectionButton.addEventListener("click", () => {
    window.setTimeout(syncVisibility, 0);
  });

  document.querySelectorAll("[data-section]").forEach((button) => {
    if (button === trustedSectionButton) return;
    button.addEventListener("click", () => {
      window.setTimeout(syncVisibility, 0);
    });
  });

  iframe.addEventListener("load", () => {
    window.setTimeout(() => {
      syncVisibility();
      syncPauseLabel();
    }, 160);
  });

  const observer = new MutationObserver(syncVisibility);
  observer.observe(trustedSectionButton, {
    attributes: true,
    attributeFilter: ["class"]
  });

  syncVisibility();
})();
