import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const browserSource = readFileSync(new URL("../script.js", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../worker.js", import.meta.url), "utf8");

function extractObject(source, constantName) {
  const marker = `const ${constantName} = `;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${constantName}`);

  const objectStart = source.indexOf("{", start + marker.length);
  assert.notEqual(objectStart, -1, `missing object for ${constantName}`);

  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const literal = source.slice(objectStart, index + 1);
        const value = vm.runInNewContext(`(${literal})`);
        return JSON.parse(JSON.stringify(value));
      }
    }
  }

  assert.fail(`unterminated object for ${constantName}`);
}

test("browser estimate rates stay identical to backend-owned rental rates", () => {
  const browserPricing = extractObject(browserSource, "RENTAL_PRICING");
  const serverPricing = extractObject(serverSource, "RENTAL_SERVER_PRICING");

  assert.deepEqual(browserPricing, serverPricing);
  assert.equal(serverPricing.rates.lv1ClassicSolo.dayOne, 2700000);
  assert.equal(serverPricing.rates.lv1StageGridBundle.dayOne, 3000000);
  assert.equal(serverPricing.rates.stageGrid4000.dayOne, 500000);
});
