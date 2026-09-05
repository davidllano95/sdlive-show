# Finance structured third-party amounts + PILA calculator — 2026-09-05

**Status:** ACTIVE DESIGN / IMPLEMENTATION GATE  
**Scope:** SD.Live Track `REGISTRO` + AppSheet capture + read-only Finance dashboard analytics + local PILA estimator.  
**Source-of-truth boundary:** Google Sheets `REGISTRO` remains persistent Finance storage; AppSheet remains the mobile/offline writer; `/admin/finance/` remains read-only against Finance data.

## Why

Third-party pass-through amounts are now common enough to become structured per-job data instead of existing only as ad-hoc calculator inputs or Notes.

The existing Finance pass-through calculator already models an invoice containing gross amounts that belong to third parties and proportionally allocates retentions. This milestone must **extend that established model rather than create a second pass-through definition**.

A separate browser-local PILA estimator is also required in the Finance workspace for Colombian independent-worker social-security planning.

## 1. New persistent `REGISTRO` field

Add one optional physical numeric field:

- canonical header: `Cobro terceros`
- AppSheet display label: `Cobro por terceros (bruto)`
- semantic: the gross portion of `Valor bruto` that was billed/charged to the client on behalf of third parties;
- currency: always the same row currency from `Moneda`;
- blank is equivalent to zero;
- valid value: `0 <= Cobro terceros <= Valor bruto`.

Current source schema ends at `Fecha fin` in column AB, so the initial physical placement is expected to be column AC. Finance code must continue resolving fields by normalized header name rather than depending on the physical position.

Do not change the meaning of existing persisted columns solely to fit this feature. In particular, `Valor bruto`, `Valor Recibido`, `Valor Neto`, payment dates/status and existing formulas/workflows remain authoritative under their current contracts.

### AppSheet capture

After the Sheet column exists and AppSheet regenerates the `REGISTRO` structure:

- type must be numeric, not Notes/text;
- optional by default;
- add it immediately after `Valor bruto` in `Nuevo Trabajo`;
- also expose it in `Pago_Form` so an existing job can be reconciled when payment details are captured;
- standard Edit may continue to edit the field;
- validation must reject negatives and values greater than `Valor bruto`;
- no new Bot or workflow mutation is required for this field.

## 2. Canonical derived pass-through math

Reuse the existing Finance pass-through proportional-retention model.

For a paid row with:

- `invoiceGross = Valor bruto`
- `bankReceived = Valor Recibido`
- `thirdPartyGross = Cobro terceros`

when the values are valid and `invoiceGross > 0`:

- `totalRetention = invoiceGross - bankReceived`
- `retentionRate = totalRetention / invoiceGross`
- `ownGross = invoiceGross - thirdPartyGross`
- `thirdPartyRetention = thirdPartyGross * retentionRate`
- `thirdPartyPayable = thirdPartyGross - thirdPartyRetention`
- `ownCashReceived = bankReceived - thirdPartyPayable`

Invariant:

`ownCashReceived + thirdPartyPayable = bankReceived`

This is the same management allocation already used by the existing browser-local pass-through calculator.

## 3. Finance dashboard presentation

Preserve COP and USD separation everywhere.

Add structured analytics that distinguish at minimum:

- total client billing / `Valor bruto`;
- own gross share = total billing - third-party gross;
- third-party gross collected;
- raw bank receipt / `Valor Recibido`;
- third-party net payable after proportional retention allocation;
- own cash received after pass-through;
- existing total retentions/fees.

The dashboard must not silently redefine an existing KPI without a migration note. Prefer explicit labels such as `Banco recibido` and `Flujo propio` where the distinction matters.

### Annual reconciliation

Provide annual/monthly totals useful for bookkeeping/accountant review:

- billed gross;
- own gross component;
- third-party gross component;
- bank received;
- own cash after pass-through;
- third-party payable;
- retentions/fees.

`Cobro terceros` must **not** be presented as automatically taxable income or automatically excluded from tax income. Its legal/tax ownership depends on the underlying invoicing/mandate/reimbursement arrangement. Finance should present the structured facts and reconciliation, not make a tax-filing determination.

The existing ad-hoc pass-through calculator remains useful for one-off reconciliation and should share the same math/terminology. Do not create another competing pass-through calculator.

## 4. Colombian PILA estimator in Finance

Build a separate read-only/browser-local calculator in `/admin/finance/`. It must not write to Google Sheets, AppSheet or D1.

### Rules source/version

Rules must be parameterized by year and cite/display the source version used. Initial implementation targets **2026** using current UGPP/Ministerio de Salud operational guidance.

2026 baseline parameters:

- SMMLV: COP 1,750,905;
- maximum IBC: 25 SMMLV = COP 43,772,625;
- health: 12.5% of IBC;
- pension: 16% of IBC;
- Fondo de Solidaridad Pensional: apply the current 2026 operational thresholds when the IBC reaches the applicable SMMLV ranges;
- ARL: selected risk class and applicable payer/obligation rules;
- CCF: optional 0.6% or 2% when selected.

### Required calculation modes

At minimum support:

1. `Prestación de servicios personales`
   - monthly gross contract income excluding IVA;
   - no cost deduction / presumption-of-costs deduction;
   - IBC base = 40% of applicable monthly gross, subject to current minimum/maximum rules.

2. `Cuenta propia / contrato diferente a prestación de servicios`
   - monthly gross income excluding IVA;
   - deductible costs according to the selected legally supported method;
   - net income first, then minimum 40% for IBC, subject to current obligation/minimum/maximum rules.

The first version may explicitly exclude special partial-week/partial-month schemes, pensioners, special regimes and dependent-plus-independent edge cases unless their rules are deliberately implemented and tested. The UI must say when a scenario is outside supported scope rather than guess.

### PILA result

Show at minimum:

- income used;
- deductible costs / cost method when applicable;
- net income;
- calculated IBC and any minimum/maximum adjustment;
- health;
- pension;
- Fondo de Solidaridad Pensional when applicable;
- ARL and whether it is included in the user's payable total;
- optional CCF;
- estimated total payable by the user.

The calculator is an **estimate/planning tool**, not a PILA operator and not legal/tax advice. Final payment should be checked against the authorized PILA operator/UGPP rules for the contribution period.

### Interaction with `Cobro terceros`

Do not automatically include or exclude `Cobro terceros` from the statutory PILA base merely because it is tracked in Finance. The legal treatment depends on the real arrangement.

The dashboard may offer the month's structured own-income figures as a suggested/pre-fill reference, but the calculator must clearly identify the amount being treated as `ingreso sujeto a cotización` and allow the user to confirm the legally applicable base.

## 5. Guardrails

- Google Sheets `REGISTRO` remains the only persistent Finance source of truth.
- AppSheet remains the writer for the new per-job field.
- Finance Admin remains read-only; no generic Finance write-back.
- No D1 Finance mirror.
- Preserve COP/USD separation.
- Do not parse `Notas` to infer third-party amounts.
- Do not expose `Notas`, `NUM CONTACTO` or internal IDs just to support these analytics.
- Reuse existing pass-through math and add regression tests rather than fork it.
- Version PILA legal parameters by contribution year; do not hardcode a supposedly permanent SMMLV or rate set into presentation code.

## 6. Safe implementation order

1. Add `Cobro terceros` to Google Sheets `REGISTRO` after `Fecha fin` and verify existing formulas/records are unchanged.
2. Regenerate the AppSheet `REGISTRO` column structure; configure numeric type, validation and forms; smoke one blank and one populated record.
3. Extend Finance read contract from the Sheet to include the structured field while keeping normalized-header mapping and privacy boundaries.
4. Add canonical derived pass-through analytics + tests; integrate into Finance dashboard without changing old KPI semantics silently.
5. Add annual/monthly reconciliation views.
6. Implement the year-versioned 2026 PILA estimator + deterministic unit tests against official-rule examples.
7. Run full tests, deploy, and production-smoke Finance desktop/mobile.

No Finance production code should assume the new Sheet field exists until steps 1–2 are complete and verified.
