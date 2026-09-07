# Finance structured third-party amounts + PILA calculator — 2026-09-05

**Updated:** 2026-09-07 — America/Bogota  
**Status:** THIRD-PARTY OPERATIONAL MODULE MERGED / APPSHEET OPEN-DEBT TAB PASS / PRODUCTION WRITE SMOKE PENDING / PILA NEXT  
**Scope:** SD.Live Track `REGISTRO` + `PAGO_TERCEROS` + AppSheet + private Finance Admin + local PILA estimator.  

## Current source-of-truth boundary

- Google Sheets remains Finance persistence.
- `REGISTRO` remains the parent work/payment table.
- `PAGO_TERCEROS` is the physical child ledger for third-party obligations/payments.
- AppSheet remains the primary mobile/offline workflow writer.
- `/admin/finance/` remains read-only for general Finance data/analytics.
- One explicit, narrow write exception is now approved: PR #253 may record a real third-party payment by writing only physical `PAGO_TERCEROS` columns `J = Valor pagado tercero` and `K = Fecha pago tercero` after server-side revalidation.
- No derived third-party value may be written from Finance.
- Generic Finance write-back, D1 Finance mirroring and bidirectional sync remain blocked.

Detailed handoff:

`docs/checkpoints/handoff-finance-third-party-operational-2026-09-07.md`

## Milestones completed

### ✅ Parent structured field

`REGISTRO.Cobro terceros` is live and AppSheet exposes it as `Cobro por terceros (bruto)` with numeric validation. It represents the gross portion of `Valor bruto` billed/charged on behalf of third parties.

Rule:

`0 <= Cobro terceros <= Valor bruto`

Blank is equivalent to zero for Finance analytics.

### ✅ Canonical proportional-retention model

For a paid parent row with valid values:

- `invoiceGross = Valor bruto`
- `bankReceived = Valor Recibido`
- `thirdPartyGross = Cobro terceros`
- `factor = bankReceived / invoiceGross`
- `thirdPartyPayable = thirdPartyGross * factor`
- `ownGross = invoiceGross - thirdPartyGross`
- `ownCashReceived = bankReceived - thirdPartyPayable`

Invariant:

`ownCashReceived + thirdPartyPayable = bankReceived`

This is the same management allocation used by the existing browser-local pass-through calculator. Do not fork this math into a competing model.

### ✅ Third-party child ledger

Google Sheets physical tab: `PAGOS_TERCEROS`  
AppSheet table: `PAGO_TERCEROS`

Finance reads `PAGO_TERCEROS!A:N`, treats only persisted facts as authoritative and ignores the seven legacy derived physical columns when recomputing current state.

Authoritative child facts:

- `ID tercero`
- `Trabajo ID`
- `Tercero`
- `Bruto tercero`
- `Valor pagado tercero`
- `Fecha pago tercero`
- `Notas`

Current AppSheet derived fields use Virtual Columns with ` calc` technical names. Do not restore App formulas into the legacy physical derived columns merely for dashboard convenience.

### ✅ Selected-year/monthly reconciliation backend

PR #251 added selected-year/monthly reconciliation data for:

- billed gross;
- own gross component;
- third-party gross component;
- bank received;
- own cash after pass-through;
- estimated third-party payable;
- actual third-party payments by payment date;
- fees/retentions;
- COP/USD kept separate.

Legal/tax treatment is not inferred from `Cobro terceros`.

### ✅ Visible reconciliation simplified to owner requirement

PR #252 changed the visible reconciliation into a COP-only by-third-party table:

- **Tercero**
- **Deuda a terceros** = current balance still owed
- **Cobrado de terceros** = proportional third-party amount only after the parent work is actually paid and `Valor Recibido` is valid
- **Pagado a terceros** = persisted actual payments

Unassigned third-party amount remains visible as `Sin desglose` rather than disappearing.

### ✅ Operational obligations card + bounded payment action

PR #253 changed `Obligaciones a terceros` into an operational queue:

- before collection workflow: hidden from the operational queue;
- 🟠 `Esperando pago del cliente`: invoice/workflow complete but client not yet paid;
- 🟢 `Listo para pagar`: parent is `Pagado`, `Valor Recibido` is valid and positive third-party debt remains;
- fully paid obligations disappear;
- `Sin desglose` can be shown but cannot be marked paid.

Admin endpoints:

- `GET /api/admin/finance/third-party/obligations`
- `POST /api/admin/finance/third-party/mark-paid`

The POST path:

1. verifies Admin access;
2. receives an opaque action reference;
3. re-reads `REGISTRO` + `PAGO_TERCEROS`;
4. recalculates current eligibility and balance server-side;
5. writes only `Valor pagado tercero` + `Fecha pago tercero` when still `ready_to_pay`;
6. re-reads and verifies the obligation is no longer pending.

### ✅ AppSheet `Terceros` tab operational filter

Owner-verified on 2026-09-07: the `Terceros` tab now shows only debt still owed; fully paid items disappear. No new Sheet schema was required.

If this view regresses, diagnose the View source/Slice and one concrete row before modifying Virtual Column formulas.

## Merged Finance PR sequence

- #249 → `c2b2ff1eb977d0d2d0c532abc3fbf65a61c9bd5e`
- #250 → `4dcf3fe90f50fbaf77f41227f9b8b4ce4c6db1bf`
- #251 → `b312b4e7f47ff5526f1bace8325aa85e4a4a1b02`
- #252 → `b02bda1406ba152884aa9b4b2976c7cd9141aba4`
- #253 → `d4d036bed5203d655dff8ff875f7188868845176`

## Current gate — production smoke of PR #253

Before declaring third-party operations CLOSED/PASS, run exactly one representative production smoke if a safe obligation is available:

1. verify one item reaches `Listo para pagar`;
2. use `Marcar pagado` once;
3. verify it disappears from the operational card/queue;
4. verify `PAGO_TERCEROS.Valor pagado tercero` and `Fecha pago tercero` changed;
5. sync AppSheet and verify the fully paid debt is absent from the `Terceros` tab.

Do not create unnecessary production data solely for the smoke. If no safe obligation is available, record the smoke as explicitly deferred.

# Next milestone — Colombian PILA estimator

Build a separate browser-local/year-versioned calculator in `/admin/finance/`. It must not write to Google Sheets, AppSheet or D1.

## Rules source/version

Rules must be parameterized by contribution year and display the source version used. Initial implementation targets **2026** using current UGPP/Ministerio de Salud operational guidance.

2026 baseline parameters already identified for implementation/verification:

- SMMLV: COP 1,750,905;
- maximum IBC: 25 SMMLV = COP 43,772,625;
- health: 12.5% of IBC;
- pension: 16% of IBC;
- Fondo de Solidaridad Pensional: use the current 2026 operational thresholds after exact verification;
- ARL: selectable risk class and applicable payer/obligation rules;
- CCF: optional 0.6% or 2% when selected.

Before coding the final FSP table or 2026 own-account rules, verify the exact current legal/operational source. Decree 0379 of 2026 must be considered for the post-effective-date rules already identified in research.

## Required calculation modes

### 1. Prestación de servicios personales

- monthly gross contract income excluding IVA;
- no cost deduction/presumption-of-costs deduction;
- IBC base = 40% of applicable monthly gross, subject to current minimum/maximum rules.

### 2. Cuenta propia / contrato diferente a prestación de servicios

- monthly gross income excluding IVA;
- deductible costs according to the selected legally supported method;
- net income first, then minimum 40% for IBC, subject to current obligation/minimum/maximum rules.

The first version may explicitly exclude unsupported special scenarios rather than guess.

## PILA output

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

The calculator is an estimate/planning tool, not a PILA operator and not legal/tax advice.

## Interaction with third-party money

Do **not** automatically include or exclude `Cobro terceros` from the statutory PILA base merely because it is tracked in Finance. The legal treatment depends on the actual arrangement.

Finance may offer structured own-income figures as a suggested reference, but the user must confirm the amount treated as `ingreso sujeto a cotización`.

## Guardrails

- Google Sheets/AppSheet remain source of truth for Finance facts.
- No D1 Finance mirror.
- Preserve COP/USD separation except where a feature is intentionally scoped COP-only (current by-third-party reconciliation).
- Do not parse `Notas` to infer amounts.
- Do not expose `Notas`, `NUM CONTACTO` or raw internal IDs in Admin payloads merely to support analytics/actions.
- Reuse canonical pass-through math.
- Generic Finance write-back remains blocked; PR #253's J/K fact-write path is the only approved exception.
- PILA parameters must be versioned by contribution year.

## Safe implementation order

1. ✅ `REGISTRO.Cobro terceros` live in Sheets/AppSheet.
2. ✅ Finance read contract extended and tested.
3. ✅ Parent obligation semantics/card implemented.
4. ✅ `PAGO_TERCEROS` child ledger and VC migration completed.
5. ✅ Selected-year/monthly reconciliation backend implemented.
6. ✅ Visible COP reconciliation by third-party name implemented.
7. ✅ Operational orange/green obligations queue + bounded `Marcar pagado` write action merged.
8. ✅ AppSheet `Terceros` tab hides fully paid debt.
9. ⏳ One representative production smoke of #253 write path, or explicitly defer if no safe obligation exists.
10. ⏳ Verify exact 2026 PILA legal parameters/FSP/current rules.
11. ⏳ Implement year-versioned PILA estimator + deterministic tests.
12. ⏳ Production smoke Finance desktop/mobile for the PILA milestone.

## Exact continuation

**Inspect current `main`, confirm #253 deployment, then run one bounded `Marcar pagado` production smoke if a safe obligation exists. Once that passes (or is explicitly deferred), begin exact-source verification for the 2026 PILA estimator. Do not redesign AppSheet/Sheets without a concrete regression.**
