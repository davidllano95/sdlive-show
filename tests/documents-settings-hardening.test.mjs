import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [hardening, stabilization] = await Promise.all([
  readFile(new URL("../admin/documents/settings-hardening.js", import.meta.url), "utf8"),
  readFile(new URL("../admin/admin-stabilization.js", import.meta.url), "utf8")
]);

test("Documents settings hardening is loaded only through the Admin path extension", () => {
  assert.match(stabilization, /path\.startsWith\("\/admin\/documents"\)/);
  assert.match(stabilization, /settings-hardening\.css/);
  assert.match(stabilization, /settings-hardening\.js/);
});

test("issuer settings expose and persist the private bank profile plus active state", () => {
  for (const id of [
    "issuerBankBeneficiary",
    "issuerBankName",
    "issuerRoutingNumber",
    "issuerAccountType",
    "issuerAccountNumber",
    "issuerBankAddress",
    "issuerActive"
  ]) assert.match(hardening, new RegExp(id));

  assert.match(hardening, /bank:\s*\{/);
  assert.match(hardening, /active:\s*\$\("issuerActive"\)\.checked/);
  assert.match(hardening, /primaryAddressPayload\(current, address\)/);
});

test("client settings keep canonical IDs and default document kind without erasing hidden profile metadata", () => {
  assert.match(hardening, /Profile ID/);
  assert.match(hardening, /clientDefaultKind/);
  assert.match(hardening, /defaultKindId:\s*\$\("clientDefaultKind"\)\.value \|\| null/);
  assert.match(hardening, /email:\s*current\?\.email \|\| null/);
  assert.match(hardening, /phone:\s*current\?\.phone \|\| null/);
  assert.match(hardening, /contactName:\s*current\?\.contactName \|\| null/);
  assert.match(hardening, /financeAliases:\s*Array\.isArray\(current\?\.financeAliases\)/);
  assert.match(hardening, /notes:\s*current\?\.notes \|\| null/);
});

test("inactive issuers cannot be selected for new drafts", () => {
  assert.match(hardening, /filter\(\(issuer\) => issuer\.active !== false\)/);
  assert.match(hardening, /if \(!activeIds\.has\(option\.value\)\) option\.remove\(\)/);
  assert.match(hardening, /issuer\.id === "samuel" && issuer\.active !== false/);
});

test("hardening owns profile submits without touching signatures, sequences or finalization", () => {
  assert.match(hardening, /stopImmediatePropagation\(\)/);
  assert.match(hardening, /}, true\);/);
  assert.doesNotMatch(hardening, /signatures\/upload/);
  assert.doesNotMatch(hardening, /sequences\/test-ensure/);
  assert.doesNotMatch(hardening, /finalize/i);
});
