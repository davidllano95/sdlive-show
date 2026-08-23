import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboard = readFileSync(new URL("../admin/dashboard.js", import.meta.url), "utf8");

test("mobile Admin defers Finance until explicit user action", () => {
  assert.match(dashboard, /matchMedia\("\(max-width: 900px\)"\)/);
  assert.match(dashboard, /Load Finance Dashboard/);
  assert.match(dashboard, /button\?\.addEventListener\("click", \(\) => \{/);
  assert.match(dashboard, /loadFinanceModule\(\)/);
});

test("desktop Admin continues loading Finance automatically", () => {
  assert.match(dashboard, /if \(isCompactAdmin\(\)\) \{/);
  assert.match(dashboard, /showFinanceLauncher\(\)/);
  assert.match(dashboard, /else \{\s*loadFinanceModule\(\);\s*\}/s);
});
