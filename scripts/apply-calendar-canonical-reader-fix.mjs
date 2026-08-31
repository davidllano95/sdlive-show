import { readFile, writeFile } from "node:fs/promises";

const targetUrl = new URL("../site-schedule-google-projection.js", import.meta.url);
let source = await readFile(targetUrl, "utf8");

const importNeedle = 'import { fetchGoogleAccessToken } from "./finance-api.js";\n';
const importReplacement = `${importNeedle}import { normalizeCalendarRows } from "./calendar-api.js";\n`;
if (!source.includes('import { normalizeCalendarRows } from "./calendar-api.js";')) {
  if (!source.includes(importNeedle)) throw new Error("Finance import anchor not found");
  source = source.replace(importNeedle, importReplacement);
}

const readerStart = source.indexOf("  const index = new Map();", source.indexOf("async function readRegistroRows"));
const readerEnd = source.indexOf("\n}\n\nasync function listGoogleEvents", readerStart);
if (readerStart < 0 || readerEnd < 0) throw new Error("REGISTRO reader anchors not found");

const canonicalReader = `  const headers = values[0];\n  const index = new Map();\n  headers.forEach((header, position) => {\n    const key = normalizeHeader(header);\n    if (key && !index.has(key)) index.set(key, position);\n  });\n  const fieldIndex = Object.fromEntries(\n    [\"Fecha trabajo\", \"Fecha fin\", \"Cliente\", \"Proyecto / Show\", \"Rol\", \"Moneda\", \"Estado\", \"ID\"]\n      .map((field) => [field, index.get(normalizeHeader(field))])\n  );\n  const idIndex = fieldIndex.ID;\n\n  return values.slice(1).map((row) => {\n    if (!Number.isInteger(idIndex)) return null;\n    const id = clean(row?.[idIndex]);\n    if (!id) return null;\n    const normalized = normalizeCalendarRows([row], fieldIndex).events[0] || null;\n    return normalized ? { id, ...normalized } : null;\n  }).filter(Boolean);`;

source = source.slice(0, readerStart) + canonicalReader + source.slice(readerEnd);

if (!source.includes("    sourceEvents: sourceEvents.length,")) {
  const diagnosticNeedle = "    legacyMatchedOverrides,\n    created: 0,";
  if (!source.includes(diagnosticNeedle)) throw new Error("Sync diagnostic anchor not found");
  source = source.replace(
    diagnosticNeedle,
    "    legacyMatchedOverrides,\n    sourceEvents: sourceEvents.length,\n    created: 0,"
  );
}

await writeFile(targetUrl, source);

const testUrl = new URL("../tests/site-schedule-canonical-reader.test.mjs", import.meta.url);
await writeFile(testUrl, `import test from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport { readFile } from \"node:fs/promises\";\n\ntest(\"Site Schedule Google sync reuses the canonical Calendar row normalizer\", async () => {\n  const source = await readFile(new URL(\"../site-schedule-google-projection.js\", import.meta.url), \"utf8\");\n  assert.match(source, /import \\{ normalizeCalendarRows \\} from \\"\\.\\/calendar-api\\.js\\";/);\n  assert.match(source, /normalizeCalendarRows\\(\\[row\\], fieldIndex\\)\\.events\\[0\\]/);\n  assert.match(source, /sourceEvents:\\s*sourceEvents\\.length/);\n  assert.doesNotMatch(source, /const startDate = sheetDateToIso\\(at\\(row, \\"Fecha trabajo\\"\\)\\)/);\n});\n`);
