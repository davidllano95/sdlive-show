# Finance third-party payments closeout — 2026-09-26

**Status:** CLOSED / CI PASS / APPSHEET ALIGNMENT PASS / PRODUCTION WRITE SMOKE PASS  
**Current `main` at closeout:** `5a0f7cc263930c134ecc0733427ac1812c5ed739` · PR #255  
**Scope:** structured third-party money in Google Sheets + AppSheet + private Finance Admin.  
**Next gate:** audit Finance ownership semantics (owner money vs pass-through money) before implementing the 2026 PILA estimator.

## Closeout summary

The operational third-party payment path is now production-verified.

- AppSheet `Neto estimado tercero calc` now calculates directly from the full proportional factor:
  - `[Bruto tercero] * [Valor recibido cliente calc] / [Valor bruto trabajo calc]`
  - it no longer uses the displayed/rounded `Tasa retención calc` as an intermediate monetary input.
- PR #255 fixed the Admin Finance operational path so monetary balances are normalized before queue eligibility and `mark-paid` persistence.
- Regression coverage includes the production case:
  - parent gross `900000`
  - parent received `893106`
  - child gross `450000`
  - canonical child payable `446553`
  - previous AppSheet result from rounded percentage: `446535`
- PR #255 also prevents zero-value phantom obligations caused by floating-point residue.
- The production `Marcar pagado` smoke passed after merge.

## Source-of-truth boundary preserved

- Google Sheets remains Finance persistence.
- `REGISTRO` remains the parent work/payment table.
- `PAGO_TERCEROS` remains the physical child ledger.
- AppSheet remains the primary mobile/offline workflow UI.
- General Finance Admin remains read-only.
- The only approved Finance write exception remains the third-party payment fact action:
  - `PAGO_TERCEROS.J = Valor pagado tercero`
  - `PAGO_TERCEROS.K = Fecha pago tercero`
- No derived third-party values are persisted by Finance.
- Generic Finance write-back, D1 Finance mirroring and bidirectional sync remain blocked.

## Canonical management math

For a parent work with valid values:

- `invoiceGross = Valor bruto`
- `bankReceived = Valor Recibido`
- `thirdPartyGross = Cobro terceros`
- `factor = bankReceived / invoiceGross`
- `thirdPartyPayable = thirdPartyGross * factor`
- `ownCashReceived = bankReceived - thirdPartyPayable`

For each third-party child:

- `childPayable = Bruto tercero * factor`
- `childDebt = childPayable - Valor pagado tercero`

Displayed percentage fields may be rounded for presentation, but monetary calculations must use the full ratio rather than the rounded percentage.

## Production smoke result

Representative production smoke: **PASS**.

Verified owner outcome:

1. a real obligation was available in `Listo para pagar`;
2. `Marcar pagado` executed successfully;
3. the operational flow behaved as expected after the rounding fix;
4. AppSheet and Admin were aligned on the canonical proportional amount.

Do not repeat this write smoke without a concrete regression.

## New Finance ownership-semantics gate

Before PILA, audit the distinction between:

1. **transaction/reporting totals** — full invoice gross and full bank cash received, including amounts collected on behalf of third parties; and
2. **owner economics** — the portion actually attributable to SD.Live / Samuel after the proportional third-party payable is removed.

Desired management semantics:

- owner-facing `generated`, `received`, averages, charts and business-performance metrics should represent money economically attributable to the owner;
- full `Valor bruto` and full `Valor Recibido` must remain persisted and available for reconciliation, banking records, accounting/tax review and statutory reporting where applicable;
- do not silently reinterpret legal/tax treatment from the management field `Cobro terceros`;
- preserve separate raw/full totals alongside owner-only derived metrics rather than destroying the original transaction facts.

Current code requires audit because core Finance metrics still use full `Valor Neto` / `Valor Recibido` in several places, while the third-party subsystem already exposes `ownCashReceived` separately.

## Next exact action

1. inspect Google Sheets + AppSheet formulas/physical columns for `Valor bruto`, `Valor Neto`, `Valor Recibido`, `Cobro terceros` and any owner-income derived fields;
2. compare those semantics against Finance Admin `generated`, `received`, client concentration, receivables and tax-reserve bases;
3. define one canonical owner-money calculation without changing persisted raw/full transaction facts;
4. implement deterministic tests and a bounded Finance Admin change if the audit confirms mismatch;
5. only after this ownership gate is closed, continue the 2026 PILA estimator.
