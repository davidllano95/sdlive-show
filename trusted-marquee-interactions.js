const MOBILE_POINTER_QUERY = "(hover: none) and (pointer: coarse)";
const SWIPE_THRESHOLD_PX = 8;
const CLICK_SUPPRESS_MS = 420;
const DEFAULT_STEP_FRACTION = 0.08;

function animationFor(marquee) {
  const track = marquee?.querySelector?.(".trusted-track");
  if (!track) return null;

  return track
    .getAnimations()
    .find((animation) => {
      const duration = Number(
        animation.effect?.getComputedTiming?.().duration
      );
      return Number.isFinite(duration) && duration > 0;
    }) || null;
}

function animationDuration(animation) {
  const duration = Number(
    animation?.effect?.getComputedTiming?.().duration
  );
  return Number.isFinite(duration) && duration > 0
    ? duration
    : 0;
}

export function wrapAnimationTime(value, duration) {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  return ((value % duration) + duration) % duration;
}

export function stepDuration(duration, fraction = DEFAULT_STEP_FRACTION) {
  const safeDuration = Number(duration);
  const safeFraction = Number(fraction);

  if (!Number.isFinite(safeDuration) || safeDuration <= 0) return 0;
  if (!Number.isFinite(safeFraction) || safeFraction <= 0) return 0;

  return safeDuration * Math.min(safeFraction, 0.5);
}

function applyPlaybackState(marquee) {
  if (!marquee) return false;

  const manuallyPaused = marquee.dataset.manualPaused === "true";
  if (manuallyPaused) {
    marquee.dataset.interactionPaused = "true";
  }

  const view = marquee.ownerDocument?.defaultView;
  if (typeof view?.updateTrustedMarqueePlayback === "function") {
    view.updateTrustedMarqueePlayback(marquee);
  } else {
    const shouldPause =
      manuallyPaused ||
      marquee.dataset.interactionPaused === "true";

    marquee
      .querySelector?.(".trusted-track")
      ?.getAnimations?.()
      .forEach((animation) => {
        if (shouldPause) animation.pause();
        else animation.play();
      });
  }

  return true;
}

function setInteractionPaused(marquee, paused) {
  if (!marquee) return false;

  marquee.dataset.interactionPaused = paused ? "true" : "false";
  return applyPlaybackState(marquee);
}

export function setTrustedMarqueePaused(marquee, paused) {
  if (!marquee) return false;

  // Trusted By preview can rebuild the marquee from Draft content after this
  // module first initializes. Binding here guarantees every newly-created
  // marquee gets the authoritative manual-pause guard before Pause is applied.
  bindManualPauseGuard(marquee);

  marquee.dataset.manualPaused = paused ? "true" : "false";
  marquee.dataset.interactionPaused = paused ? "true" : "false";
  return applyPlaybackState(marquee);
}

export function isTrustedMarqueePaused(marquee) {
  return marquee?.dataset?.manualPaused === "true";
}

export function shiftTrustedMarquee(marquee, direction = 1) {
  const animation = animationFor(marquee);
  if (!animation) return false;

  const duration = animationDuration(animation);
  if (!duration) return false;

  const current = Number(animation.currentTime) || 0;
  const delta = stepDuration(duration) * (direction < 0 ? -1 : 1);
  animation.currentTime = wrapAnimationTime(current + delta, duration);
  return true;
}

function moveAnimationByPixels(marquee, deltaX) {
  const animation = animationFor(marquee);
  if (!animation) return false;

  const duration = animationDuration(animation);
  const set = marquee.querySelector(".trusted-set");
  const setWidth = Number(set?.getBoundingClientRect?.().width) || 0;

  if (!duration || setWidth <= 0) return false;

  const current = Number(animation.currentTime) || 0;
  const timeDelta = (-deltaX / setWidth) * duration;
  animation.currentTime = wrapAnimationTime(
    current + timeDelta,
    duration
  );

  return true;
}

function enforceManualPause(marquee) {
  if (!isTrustedMarqueePaused(marquee)) return;

  marquee.dataset.interactionPaused = "true";
  marquee
    .querySelector?.(".trusted-track")
    ?.getAnimations?.()
    .forEach((animation) => animation.pause());
}

function bindManualPauseGuard(marquee) {
  if (!marquee || marquee.dataset.sdliveManualPauseGuard === "true") return;

  marquee.dataset.sdliveManualPauseGuard = "true";
  const region = marquee.closest?.(".trusted-wrap") || marquee;

  const restoreIfNeeded = () => {
    queueMicrotask(() => enforceManualPause(marquee));
  };

  // Existing desktop hover/reveal handlers use interactionPaused as a transient
  // state. When the user explicitly pressed Pause in the editor, those transient
  // handlers must never be allowed to resume playback on pointer/focus exit.
  region.addEventListener("pointerout", restoreIfNeeded);
  region.addEventListener("focusout", restoreIfNeeded);

  // Some hover paths resume through a delayed close timer. Watching the transient
  // pause attribute makes manual Pause authoritative even when that timer fires
  // after pointerout/focusout has already completed.
  const pauseObserver = new MutationObserver(() => {
    if (!isTrustedMarqueePaused(marquee)) return;

    if (marquee.dataset.interactionPaused !== "true") {
      enforceManualPause(marquee);
      return;
    }

    marquee
      .querySelector?.(".trusted-track")
      ?.getAnimations?.()
      .forEach((animation) => animation.pause());
  });

  pauseObserver.observe(marquee, {
    attributes: true,
    attributeFilter: ["data-interaction-paused"]
  });
}

function bindMobileSwipe(marquee) {
  if (!marquee || marquee.dataset.sdliveSwipeBound === "true") return;

  const view = marquee.ownerDocument?.defaultView;
  if (!view?.matchMedia?.(MOBILE_POINTER_QUERY).matches) return;

  marquee.dataset.sdliveSwipeBound = "true";
  marquee.style.touchAction = "pan-y";
  marquee.style.webkitUserSelect = "none";

  const gesture = {
    pointerId: null,
    startX: 0,
    lastX: 0,
    dragged: false,
    wasPaused: false,
    suppressClickUntil: 0
  };

  const finishGesture = (event) => {
    if (gesture.pointerId == null || event.pointerId !== gesture.pointerId) {
      return;
    }

    if (gesture.dragged) {
      gesture.suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
    }

    const revealOpen = Boolean(
      (marquee.closest(".trusted-wrap") || marquee)
        .querySelector(".supported-reveal.is-active")
    );

    if (gesture.wasPaused) {
      enforceManualPause(marquee);
    } else if (!revealOpen) {
      setInteractionPaused(marquee, false);
    }

    try {
      marquee.releasePointerCapture?.(gesture.pointerId);
    } catch {
      // The browser may already have released capture.
    }

    gesture.pointerId = null;
    marquee.dataset.touchDragging = "false";
  };

  marquee.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" || gesture.pointerId != null) return;

    gesture.pointerId = event.pointerId;
    gesture.startX = event.clientX;
    gesture.lastX = event.clientX;
    gesture.dragged = false;
    gesture.wasPaused = isTrustedMarqueePaused(marquee);

    setInteractionPaused(marquee, true);
    marquee.dataset.touchDragging = "false";

    try {
      marquee.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is an enhancement, not a requirement.
    }
  });

  marquee.addEventListener(
    "pointermove",
    (event) => {
      if (gesture.pointerId == null || event.pointerId !== gesture.pointerId) {
        return;
      }

      const totalX = event.clientX - gesture.startX;
      const deltaX = event.clientX - gesture.lastX;
      gesture.lastX = event.clientX;

      if (!gesture.dragged && Math.abs(totalX) >= SWIPE_THRESHOLD_PX) {
        gesture.dragged = true;
        marquee.dataset.touchDragging = "true";
      }

      if (!gesture.dragged) return;

      moveAnimationByPixels(marquee, deltaX);
      event.preventDefault();
    },
    { passive: false }
  );

  marquee.addEventListener("pointerup", finishGesture);
  marquee.addEventListener("pointercancel", finishGesture);

  // A swipe that ends over a card must not also trigger the existing
  // touch tap-to-open supported-brands behavior.
  marquee.addEventListener(
    "click",
    (event) => {
      if (Date.now() > gesture.suppressClickUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );
}

export function initTrustedMarqueeInteractions(root = document) {
  root
    .querySelectorAll?.("[data-marquee]")
    .forEach((marquee) => {
      bindManualPauseGuard(marquee);
      bindMobileSwipe(marquee);
    });
}

if (typeof window !== "undefined") {
  window.SDLiveTrustedMarquee = {
    shift: shiftTrustedMarquee,
    setPaused: setTrustedMarqueePaused,
    isPaused: isTrustedMarqueePaused,
    init: initTrustedMarqueeInteractions
  };

  const init = () => initTrustedMarqueeInteractions(document);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
}
