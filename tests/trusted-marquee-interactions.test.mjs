import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
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

test("Trusted By editor transport script remains valid browser JavaScript", async () => {
  const source = await readFile(
    new URL("../admin/editor/trusted-preview-controls.js", import.meta.url),
    "utf8"
  );

  assert.doesNotThrow(() => new Function(source));
  assert.match(source, /Show previous companies/);
  assert.match(source, /Pause company movement/);
  assert.match(source, /Show next companies/);
});

test("mobile interaction module stays explicitly coarse-pointer only", async () => {
  const source = await readFile(
    new URL("../trusted-marquee-interactions.js", import.meta.url),
    "utf8"
  );

  assert.match(source, /\(hover: none\) and \(pointer: coarse\)/);
  assert.match(source, /touchAction = "pan-y"/);
  assert.match(source, /event\.pointerType === "mouse"/);
});
