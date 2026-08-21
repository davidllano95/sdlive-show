import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Safeguards run state is rendered beside Run check instead of appended to the summary", async () => {
  const [placement, shell] = await Promise.all([
    source("admin/editor/safeguards-status-placement.js"),
    source("admin/editor/admin-shell.js")
  ]);

  assert.doesNotThrow(() => new Function(placement));
  assert.match(placement, /data-guard-run-status/);
  assert.match(placement, /insertAdjacentElement\("afterend", status\)/);
  assert.match(placement, /checked now · run/);
  assert.match(placement, /normalizeSummary/);
  assert.match(placement, /Running visual diagnostics/);
  assert.match(placement, /MutationObserver/);
  assert.match(shell, /safeguards-status-placement\.js\?v=20260821-1/);
  assert.ok(
    shell.indexOf("visual-safeguards-editor.js") <
      shell.indexOf("safeguards-status-placement.js")
  );
});
