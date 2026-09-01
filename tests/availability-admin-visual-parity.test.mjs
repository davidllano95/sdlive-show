import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboardCss = await readFile(new URL("../admin/dashboard.css", import.meta.url), "utf8");
const availabilityCss = await readFile(new URL("../admin/availability-live-mode-parity.css", import.meta.url), "utf8");
const edge = await readFile(new URL("../availability-admin-edge.js", import.meta.url), "utf8");

const compact = (value) => value.replace(/\s+/g, "").toLowerCase();

test("Availability Admin uses the established Live Mode QA visual language", () => {
  const live = compact(dashboardCss);
  const availability = compact(availabilityCss);

  assert.ok(live.includes(".showday-control{margin:0 027px;background:linear-gradient(135deg,rgba(var(--accent-rgb),.08),transparent48%),var(--panel)}"));
  assert.ok(availability.includes("background:linear-gradient(135deg,rgba(var(--accent-rgb),.08),transparent48%),var(--panel)"));

  assert.ok(live.includes(".showday-mode-togglebutton.is-selected{background:rgba(var(--accent-rgb),.16)"));
  assert.ok(availability.includes("background:rgba(var(--accent-rgb),.16)!important"));

  assert.ok(live.includes("border-radius:999px;background:var(--panel2)"));
  assert.ok(availability.includes("border-radius:999px;background:var(--panel2)"));

  assert.match(edge, /availability-live-mode-parity\.css/);
});

test("Availability Force Mode stays usable as one compact row on mobile", () => {
  assert.match(availabilityCss, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(availabilityCss, /\.availability-force \.availability-admin-card__apply[\s\S]*grid-column:\s*1 \/ -1/);
});
