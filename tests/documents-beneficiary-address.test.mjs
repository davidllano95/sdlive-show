import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { renderInvoice } from "../documents-templates/invoice-intl-en.v1.js";

const hardening = readFileSync(new URL("../admin/documents/settings-hardening.js", import.meta.url), "utf8");

test("issuer bank settings persist an optional beneficiary address independently and place it last", () => {
  assert.match(hardening, /issuerBeneficiaryAddress/);
  assert.match(hardening, /Beneficiary address \(optional\)/);
  assert.match(hardening, /bank\.beneficiaryAddress \|\| ""/);
  assert.match(hardening, /beneficiaryAddress:\s*\$\("issuerBeneficiaryAddress"\)\.value\.trim\(\)/);
  assert.ok(hardening.indexOf('field("issuerBankAddress", "Bank address")') < hardening.indexOf('field("issuerBeneficiaryAddress", "Beneficiary address (optional)")'));
});

test("international invoice renders beneficiary address only when supplied and after bank address", () => {
  const base = {
    issuer: { legalName: "Test Issuer", email: "test@example.com" },
    client: { legalName: "Test Client" },
    currency: "USD",
    lines: [{ kind: "professional_service", description: "Service", quantity: 1, unitMinor: 10000, amountMinor: 10000 }],
    totalMinor: 10000,
    showBankDetails: true
  };

  const withAddress = renderInvoice({
    ...base,
    bankDetails: {
      beneficiaryAddress: "123 Beneficiary Ave, Madrid",
      bankName: "Test Bank",
      accountNumber: "1234",
      bankAddress: "1 Bank Street"
    }
  }, { mode: "draft" });
  assert.match(withAddress, /Beneficiary Address/);
  assert.match(withAddress, /123 Beneficiary Ave, Madrid/);
  assert.ok(withAddress.indexOf("Bank Address") < withAddress.indexOf("Beneficiary Address"));

  const withoutAddress = renderInvoice({
    ...base,
    bankDetails: { bankName: "Test Bank", accountNumber: "1234" }
  }, { mode: "draft" });
  assert.doesNotMatch(withoutAddress, /Beneficiary Address/);
});
