import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../admin/dashboard.css", import.meta.url), "utf8");
const dashboardJs = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const financeJs = readFileSync(new URL("../admin/finance-page.js", import.meta.url), "utf8");
const editorShell = readFileSync(new URL("../admin/editor/admin-shell.js", import.meta.url), "utf8");

function orderFor(selectorFragment) {
  const escaped = selectorFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}[\\s\\S]*?order:\\s*(-?\\d+);`));
  assert.ok(match, `missing navigation order rule for ${selectorFragment}`);
  return Number(match[1]);
}

test("Admin primary workspaces keep one visual order across shells", () => {
  const dashboard = orderFor('a[href="/admin/"]');
  const finance = orderFor('a[href="/admin/finance/"]');
  const calendar = orderFor('a[href="/admin/calendar/"]');
  const editor = orderFor('a[href="/admin/editor/"]');
  const inbox = orderFor('a[href^="https://mail.google.com/"]');

  assert.deepEqual([dashboard, finance, calendar, editor, inbox], [-50, -40, -30, -20, -10]);
});

test("relative Calendar links used by Dashboard, Finance and Editor are covered", () => {
  assert.match(css, /a\[href="\.\/calendar\/"\]/);
  assert.match(css, /a\[href="\.\.\/calendar\/"\]/);
  assert.match(dashboardJs, /calendarLink\.href = "\.\/calendar\/"/);
  assert.match(financeJs, /calendarLink\.href = "\/admin\/calendar\/"/);
  assert.match(editorShell, /calendar\.href = "\.\.\/calendar\/"/);
});
