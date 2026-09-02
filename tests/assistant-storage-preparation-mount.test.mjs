import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../public-form-rate-limit.js", import.meta.url), "utf8");

test("Admin storage preparation endpoint is explicitly mounted before public runtime", () => {
  assert.match(
    source,
    /import\s*\{\s*handleAssistantStoragePreparationApi\s*\}\s*from\s*["']\.\/assistant-admin-storage-preparation\.js["']/
  );
  assert.match(source, /path === ["']\/api\/admin\/assistant\/storage-prepare["']/);
  assert.match(source, /handleAssistantStoragePreparationApi\(request, env, \{[\s\S]*?verifyAdmin: verifyAdminViaExistingApi[\s\S]*?\}\)/);

  const preparationIndex = source.indexOf('/api/admin/assistant/storage-prepare');
  const publicLimitIndex = source.indexOf('const limited = await enforcePublicFormRateLimit');
  const appFetchIndex = source.indexOf('appWorker.fetch(preparedLead.request, env)');

  assert.ok(preparationIndex >= 0);
  assert.ok(publicLimitIndex > preparationIndex);
  assert.ok(appFetchIndex > preparationIndex);
});

test("storage preparation route is not included in public form rate limit config", () => {
  const configBlock = source.match(/const PUBLIC_FORM_LIMITS = \{[\s\S]*?\n\};/);
  assert.ok(configBlock);
  assert.equal(configBlock[0].includes('/api/admin/assistant/storage-prepare'), false);
});
