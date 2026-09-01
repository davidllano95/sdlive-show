import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const edge = await readFile(new URL("../availability-admin-edge.js", import.meta.url), "utf8");
const runtime = await readFile(new URL("../admin/availability-compact-layout.js", import.meta.url), "utf8");
const css = await readFile(new URL("../admin/availability-compact-layout.css", import.meta.url), "utf8");

test("Availability loads the compact disclosure runtime after the existing controls", () => {
  assert.match(edge, /availability-compact-layout\.css/);
  assert.match(edge, /availability-compact-layout\.js/);
  assert.ok(edge.indexOf("availability-next-window-admin.js") < edge.indexOf("availability-compact-layout.js"));
});

test("Availability keeps status and next window visible while operational controls move into one disclosure", () => {
  assert.match(runtime, /availabilityAdminManage/);
  assert.match(runtime, /Manage availability/);
  assert.match(runtime, /body\.append\(force, temporary\)/);
  assert.match(runtime, /body\.append\(schedule\)/);
  assert.doesNotMatch(runtime, /availability-admin-card__head/);
  assert.doesNotMatch(runtime, /availabilityNextWindowAdmin/);
});

test("Expanded Availability controls use compact card density and Show Day-sized actions", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(css, /height:\s*35px/);
  assert.match(css, /border-radius:\s*10px/);
  assert.match(css, /@media \(max-width:\s*560px\)/);
});
