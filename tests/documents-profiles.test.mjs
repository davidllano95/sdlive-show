import test from "node:test";
import assert from "node:assert/strict";

import {
  TEST_SEQUENCE_CONFIRMATION,
  documentsProfilesPolicy,
  normalizeClientProfile,
  normalizeIssuerProfile
} from "../documents-profiles.js";
import { documentsProfilesApiPolicy, handleDocumentsProfilesApi } from "../documents-admin-profiles-api.js";

test("issuer profile normalization keeps reusable legal defaults out of code", () => {
  const profile = normalizeIssuerProfile({
    id: "samuel",
    legalName: "Example Legal Name",
    idType: "CC",
    idNumber: "123",
    vatLabel: "No responsable de IVA",
    addresses: [{ text: "Example address" }],
    bank: { currency: "COP", accountType: "Savings" },
    brandLabel: "sd•live · Creative Audio"
  });
  assert.equal(profile.id, "samuel");
  assert.equal(profile.brandLabel, "sd•live · Creative Audio");
  assert.deepEqual(profile.addresses, [{ text: "Example address" }]);
  assert.equal(profile.active, true);
});

test("client profile normalization supports jurisdiction-aware defaults without becoming CRM", () => {
  const profile = normalizeClientProfile({
    id: "client-liventx",
    displayName: "Example client",
    legalName: "Example Client S.A.S.",
    taxIdType: "NIT",
    taxId: "x",
    defaultCurrency: "COP",
    poPolicy: "line",
    paymentTermsDays: 30,
    financeAliases: ["Example"]
  });
  assert.equal(profile.poPolicy, "line");
  assert.equal(profile.paymentTermsDays, 30);
  assert.deepEqual(profile.financeAliases, ["Example"]);
  assert.throws(() => normalizeClientProfile({ displayName: "x", legalName: "x", defaultCurrency: "EUR" }), /invalid_client_currency/);
});

test("profile policy keeps signatures private and real bootstrap explicitly gated", () => {
  const policy = documentsProfilesPolicy();
  assert.equal(policy.signatureBucketPrivateOnly, true);
  assert.equal(policy.signaturePublicUrlReturned, false);
  assert.equal(policy.signatureBytesReturnedBySettings, false);
  assert.equal(policy.testSequenceEndpointCanCreateRealSeries, false);
  assert.equal(policy.writesGoogleSheets, false);
  assert.equal(policy.usesCmsDb, false);
  assert.equal(policy.usesMediaBucket, false);

  const api = documentsProfilesApiPolicy();
  assert.equal(api.adminOnly, true);
  assert.equal(api.settingsReturnsSignatureBytes, false);
  assert.equal(api.settingsReturnsSignaturePublicUrl, false);
  assert.equal(api.realSequenceBootstrapExposed, true);
  assert.equal(api.productionBootstrapRequiresReadyPreflight, true);
  assert.match(api.productionBootstrapConfirmation, /^BOOTSTRAP_/);
  assert.equal(api.testEnsureConfirmation, TEST_SEQUENCE_CONFIRMATION);
});

test("Documents profiles API requires authenticated Admin", async () => {
  const response = await handleDocumentsProfilesApi(
    new Request("https://sdlive.show/api/admin/documents/settings"),
    {},
    { verifyAdmin: async () => null }
  );
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { ok: false, error: "Unauthorized" });
});
