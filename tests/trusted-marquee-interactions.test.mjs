import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  isTrustedMarqueePaused,
  setTrustedMarqueePaused,
  stepDuration,
  wrapAnimationTime
} from "../trusted-marquee-interactions.js";

test("wrapAnimationTime keeps marquee time inside one animation cycle", () => {
  assert.equal(wrapAnimationTime(70_000, 68_000), 2_000);
  assert.equal(wrapAnimationTime(-2_000, 68_000), 66_000);
  assert.equal(wrapAnimationTime(12_000, 68_000), 12_000);
});

test("stepDuration advances the carousel by a bounded fraction", () => {
  assert.equal(stepDuration(68_000), 5_440);
  assert.equal(stepDuration(10_000, 0.2), 2_000);
  assert.equal(stepDuration(10_000, 0.8), 5_000);
  assert.equal(stepDuration(0), 0);
});

test("explicit pause is stored separately from transient hover state", () => {
  let paused = 0;
  let played = 0;
  const animation = {
    pause() { paused += 1; },
    play() { played += 1; }
  };
  const marquee = {
    dataset: { interactionPaused: "false" },
    ownerDocument: { defaultView: {} },
    querySelector() {
      return {
        getAnimations() { return [animation]; }
      };
    }
  };

  assert.equal(setTrustedMarqueePaused(marquee, true), true);
  assert.equal(marquee.dataset.manualPaused, "true");
  assert.equal(isTrustedMarqueePaused(marquee), true);
  assert.equal(paused, 1);

  // A transient hover handler may clear interactionPaused, but explicit Pause
  // remains independently identifiable and can be restored by the guard.
  marquee.dataset.interactionPaused = "false";
  assert.equal(isTrustedMarqueePaused(marquee), true);

  assert.equal(setTrustedMarqueePaused(marquee, false), true);
  assert.equal(marquee.dataset.manualPaused, "false");
  assert.equal(isTrustedMarqueePaused(marquee), false);
  assert.equal(played, 1);
});

test("Trusted By editor transport script remains valid browser JavaScript", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-preview-controls.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /Carousel/);
  assert.match(source, /Show previous companies/);
  assert.match(source, /Pause company movement/);
  assert.match(source, /Show next companies/);
  assert.match(source, /manualPaused/);
});

test("mobile interaction module stays explicitly coarse-pointer only", async () => {
  const source = await readFile(
    new URL("../trusted-marquee-interactions.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /\(hover: none\) and \(pointer: coarse\)/);
  assert.match(source, /touchAction = "pan-y"/);
  assert.match(source, /event\.pointerType === "mouse"/);
  assert.match(source, /sdliveManualPauseGuard/);
  assert.match(source, /manualPaused/);
});
