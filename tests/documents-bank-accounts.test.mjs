import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  normalizeIssuerBank,
  bankAccountsForCurrency,
  defaultBankAccount,
  selectedBankDetails
} from "../documents-bank-accounts.js";
import { buildFinalSnapshot } from "../documents-domain.js";

const account = (id, currency, extra = {}) => ({
  id, currency, bankName: "Bank " + id, accountNumber: "123456" + id,
  beneficiary: "Issuer", active: true, isDefault: false, ...extra
});
const issuer = {
  id: "samuel", legalName: "Issuer", idNumber: "123",
  bank: normalizeIssuerBank({
    beneficiary: "Legacy",
    bankName: "Legacy Bank",
    accountNumber: "legacy-account",
    accounts: [
      account("cop-1", "COP", { isDefault: true }),
      account("cop-2", "COP"),
      account("usd-1", "USD", { isDefault: true }),
      account("usd-off", "USD", { active: false })
    ]
  })
};

test("issuer stores multiple currencies and a default per currency", () => {
  assert.deepEqual(bankAccountsForCurrency(issuer, "COP").map(a => a.id), ["cop-1", "cop-2"]);
  assert.deepEqual(bankAccountsForCurrency(issuer, "USD").map(a => a.id), ["usd-1"]);
  assert.equal(defaultBankAccount(issuer, "COP").id, "cop-1");
  assert.equal(defaultBankAccount(issuer, "USD").id, "usd-1");
  assert.equal(defaultBankAccount(issuer, "EUR"), null);
});

test("rejects duplicate ids, duplicate active defaults, unknown currency and incomplete accounts", () => {
  const wrap = accounts => normalizeIssuerBank({ accounts });
  assert.throws(() => wrap([account("a", "COP"), account("a", "USD")]), /invalid_bank_account_id/);
  assert.throws(() => wrap([account("a", "COP", {isDefault: true}), account("b", "COP", {isDefault: true})]), /duplicate_default_bank_account/);
  assert.throws(() => wrap([account("a", "EUR")]), /invalid_bank_account_currency/);
  assert.throws(() => wrap([account("a", "COP", {bankName: ""})]), /bank_account_details_required/);
});

test("explicit account must belong to issuer, be active and match document currency", () => {
  assert.equal(selectedBankDetails({ bankAccountId: "cop-2" }, issuer, "COP").accountNumber, "123456cop-2");
  assert.throws(() => selectedBankDetails({bankAccountId: "cop-1"}, issuer, "USD"), /bank_account_currency_mismatch/);
  assert.throws(() => selectedBankDetails({bankAccountId: "usd-off"}, issuer, "USD"), /bank_account_inactive/);
  assert.throws(() => selectedBankDetails({bankAccountId: "other"}, issuer, "COP"), /bank_account_not_found/);
  assert.equal(selectedBankDetails({bankAccountId: null}, issuer, "COP"), null);
});

test("legacy bank details remain available only for drafts without an explicit account choice", () => {
  assert.equal(selectedBankDetails({}, { bank: { bankName: "Existing", accountNumber: "987" } }, "COP").accountNumber, "987");
  assert.equal(selectedBankDetails({}, issuer, "COP").bankName, "Legacy Bank");
  assert.equal("accounts" in selectedBankDetails({}, issuer, "COP"), false);
});

test("finalized payment snapshot contains only the selected account, never the issuer account catalog", async () => {
  const result = await buildFinalSnapshot({
    document: {
      id: "doc-test", status: "draft", kind_id: "cc-co-es",
      doc_type: "cc", issuer_id: "samuel", currency: "COP"
    },
    draft: {
      kindId: "cc-co-es", currency: "COP", issueCity: "Bogotá", issueDate: "2026-10-21",
      lines: [{ id: "line", description: "Service", quantity: 1, amountMinor: 10000 }],
      usesCostsDeductions: false, showBankDetails: true, bankAccountId: "cop-2"
    },
    issuer,
    client: { legalName: "Client", taxId: "123" },
    signatureAsset: { id: "signature", sha256: "sha" },
    numberContext: { seriesKey: "test:CC", number: 1, displayNumber: "TEST-1" },
    finalizedAt: "2026-10-21T12:00:00Z"
  });
  assert.equal(result.snapshot.payment.bankDetails.accountNumber, "123456cop-2");
  assert.equal("bank" in result.snapshot.issuer, false);
  assert.equal("bankDetails" in result.snapshot.issuer, false);
  assert.doesNotMatch(result.snapshotJson, /123456cop-1|123456usd-1/);
});

test("admin UI exposes per-issuer bank management and currency-filtered document selection", () => {
  const editor = readFileSync(new URL("../admin/documents/editor.js", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../admin/documents/settings-hardening.js", import.meta.url), "utf8");
  const html = readFileSync(new URL("../admin/documents/index.html", import.meta.url), "utf8");
  assert.match(settings, /issuerBankAdd/);
  assert.match(settings, /issuerBankPicker/);
  assert.match(settings, /issuerBankCurrency/);
  assert.match(editor, /account.currency === currency && account.active !== false/);
  assert.match(html, /id="draftBankAccount"/);
});
