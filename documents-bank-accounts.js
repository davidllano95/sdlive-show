// Payment profiles are issuer-scoped and stored in the existing private bank_json column.
// Legacy single-account bank objects remain readable for already-created documents.
const CURRENCIES = new Set(["COP", "USD"]);
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const DETAILS = ["beneficiary", "beneficiaryAddress", "bankName", "routingNumber",
  "accountType", "accountNumber", "bankAddress"];

function plain(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function clean(value, max = 240) {
  return value == null ? "" : String(value).trim().slice(0, max);
}

export function normalizeIssuerBank(value) {
  if (!plain(value)) throw new Error("invalid_issuer_bank");
  if (!Object.hasOwn(value, "accounts")) return value; // Legacy profile, untouched.
  if (!Array.isArray(value.accounts) || value.accounts.length > 40) throw new Error("invalid_bank_accounts");
  const ids = new Set();
  const defaults = new Set();
  const accounts = value.accounts.map((entry) => {
    if (!plain(entry)) throw new Error("invalid_bank_account");
    const id = clean(entry.id, 80);
    const currency = clean(entry.currency, 10).toUpperCase();
    if (!ID.test(id) || ids.has(id)) throw new Error("invalid_bank_account_id");
    if (!CURRENCIES.has(currency)) throw new Error("invalid_bank_account_currency");
    const account = {
      id,
      alias: clean(entry.alias, 100),
      currency,
      active: entry.active !== false,
      isDefault: entry.isDefault === true
    };
    for (const key of DETAILS) account[key] = clean(entry[key], 300);
    if (!account.bankName || !account.accountNumber) throw new Error("bank_account_details_required");
    if (account.isDefault && account.active) {
      if (defaults.has(currency)) throw new Error("duplicate_default_bank_account");
      defaults.add(currency);
    }
    ids.add(id);
    return account;
  });
  return { ...value, accounts };
}

export function bankAccountsForCurrency(issuer, currency) {
  const bank = plain(issuer?.bank) ? issuer.bank : (plain(issuer?.bankDetails) ? issuer.bankDetails : {});
  return Array.isArray(bank.accounts)
    ? bank.accounts.filter((account) => account.active !== false && account.currency === currency)
    : [];
}

export function defaultBankAccount(issuer, currency) {
  const accounts = bankAccountsForCurrency(issuer, currency);
  return accounts.find((account) => account.isDefault) || accounts[0] || null;
}

export function selectedBankDetails(draft, issuer, currency) {
  const bank = plain(issuer?.bank) ? issuer.bank : (plain(issuer?.bankDetails) ? issuer.bankDetails : {});
  if (Object.hasOwn(draft, "bankAccountId")) {
    if (draft.bankAccountId == null || draft.bankAccountId === "") return null;
    const account = Array.isArray(bank.accounts)
      ? bank.accounts.find((item) => item.id === draft.bankAccountId)
      : null;
    if (!account) throw new Error("bank_account_not_found");
    if (account.active === false) throw new Error("bank_account_inactive");
    if (account.currency !== currency) throw new Error("bank_account_currency_mismatch");
    return Object.fromEntries(DETAILS.map((key) => [key, clean(account[key], 300)]));
  }
  // Historical drafts created before account selection was introduced.
  if (plain(draft.bankDetails)) return Object.fromEntries(DETAILS.map((key) => [key, clean(draft.bankDetails[key], 300)]));
  if (plain(issuer?.bankDetails)) return Object.fromEntries(DETAILS.map((key) => [key, clean(issuer.bankDetails[key], 300)]));
  if (DETAILS.some((key) => clean(bank[key]))) return Object.fromEntries(DETAILS.map((key) => [key, clean(bank[key], 300)]));
  return null;
}
