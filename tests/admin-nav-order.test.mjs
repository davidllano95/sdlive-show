import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboardCss = readFileSync(new URL("../admin/dashboard.css", import.meta.url), "utf8");
const navigationCss = readFileSync(new URL("../admin/navigation.css", import.meta.url), "utf8");
const css = `${dashboardCss}\n${navigationCss}`;
const dashboardJs = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");
const stabilization = readFileSync(new URL("../admin/admin-stabilization.js", import.meta.url), "utf8");
const financeJs = readFileSync(new URL("../admin/finance-page.js", import.meta.url), "utf8");
const editorShell = readFileSync(new URL("../admin/editor/admin-shell.js", import.meta.url), "utf8");

function orderFor(selectorFragment) {
  const escaped = selectorFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...css.matchAll(new RegExp(`${escaped}[\\s\\S]*?order:\\s*(-?\\d+);`, "g"))];
  assert.ok(matches.length, `missing navigation order rule for ${selectorFragment}`);
  return Number(matches.at(-1)[1]);
}

test("Admin primary workspaces keep one visual order across shells", () => {
  const dashboard = orderFor('a[href="/admin/"]');
  const finance = orderFor('a[href="/admin/finance/"]');
  const documents = orderFor('a[href="/admin/documents/"]');
  const calendar = orderFor('a[href="/admin/calendar/"]');
  const editor = orderFor('a[href="/admin/editor/"]');
  const inbox = orderFor('a[href^="https://mail.google.com/"]');

  assert.deepEqual(
    [dashboard, finance, documents, calendar, editor, inbox],
    [-50, -40, -35, -30, -20, -10]
  );
});

test("Calendar and Documents links are normalized across operational Admin shells", () => {
  assert.match(dashboardJs, /calendarLink\.href = "\.\/calendar\/"/);
  assert.match(financeJs, /calendarLink\.href = "\/admin\/calendar\/"/);
  assert.match(stabilization, /label: "Documents"/);
  assert.match(stabilization, /href: "\/admin\/documents\/"/);
  assert.match(stabilization, /label: "Calendar"/);
  assert.match(editorShell, /documents\.href = "\.\.\/documents\/"/);
  assert.match(editorShell, /calendar\.href = "\.\.\/calendar\/"/);
});
