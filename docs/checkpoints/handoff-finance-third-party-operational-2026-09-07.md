# Finance third-party operational handoff — 2026-09-07

**Status:** MERGED / CI PASS / APPSHEET OPEN-DEBT VIEW PASS / PRODUCTION WRITE SMOKE PENDING  
**Current `main` at handoff:** `d4d036bed5203d655dff8ff875f7188868845176`  
**Scope:** structured third-party money in Google Sheets + AppSheet + private Finance Admin.  
**Next gate:** one representative production smoke of the new `Marcar pagado` Finance action, then the 2026 PILA estimator.

## Source-of-truth boundary

The 2026-08-22 source-of-truth checkpoint remains historical evidence, but Finance now has one deliberately narrow write exception.

- Google Sheets remains Finance persistence.
- `REGISTRO` remains the parent work/payment table.
- `PAGO_TERCEROS` is the physical child ledger for third-party obligations/payments.
- AppSheet **SD.Live Track** remains the primary mobile/offline workflow UI.
- `/admin/finance/` remains read-only for general Finance data and analytics.
- The only approved Finance write-back is the explicit third-party payment fact action from PR #253, which may update only physical `PAGO_TERCEROS` columns:
  - `J = Valor pagado tercero`
  - `K = Fecha pago tercero`
- No derived third-party values are persisted by Finance.
- Generic Finance write-back, D1 Finance mirroring and bidirectional sync remain blocked.

## Canonical third-party physical table

Google Sheets tab: `PAGOS_TERCEROS`  
AppSheet table: `PAGO_TERCEROS`

Physical headers:

1. `ID tercero`
2. `Trabajo ID`
3. `Tercero`
4. `Bruto tercero`
5. `Moneda` *(legacy derived physical)*
6. `Valor bruto trabajo` *(legacy derived physical)*
7. `Valor recibido cliente` *(legacy derived physical)*
8. `Tasa retención` *(legacy derived physical)*
9. `Neto estimado tercero` *(legacy derived physical)*
10. `Valor pagado tercero`
11. `Fecha pago tercero`
12. `Saldo tercero` *(legacy derived physical)*
13. `Estado tercero` *(legacy derived physical)*
14. `Notas`

The seven legacy derived physical fields remain present for compatibility but are not authoritative. Current AppSheet logic uses Virtual Columns with ` calc` technical names and Finance recomputes derived values from persisted facts.

Persisted facts treated as authoritative by Finance:

- `ID tercero`
- `Trabajo ID`
- `Tercero`
- `Bruto tercero`
- `Valor pagado tercero`
- `Fecha pago tercero`
- `Notas`

## Completed milestones

### PR #249 — structured parent field

Squash commit: `c2b2ff1eb977d0d2d0c532abc3fbf65a61c9bd5e`

- Added `REGISTRO.Cobro terceros` through the Finance read contract.
- Preserved COP/USD separation.
- Reused the established proportional-retention model.
- Added invalid-allocation visibility instead of silent clamping.

### PR #250 — obligations before collection

Squash commit: `4dcf3fe90f50fbaf77f41227f9b8b4ce4c6db1bf`

- Every valid `Cobro terceros > 0` became a registered obligation even before client payment.
- Finance card became `Obligaciones a terceros`.
- Preserved the existing pass-through calculator and avoided a duplicate calculation model.

### PR #251 — child ledger + selected-year reconciliation

Squash commit: `b312b4e7f47ff5526f1bace8325aa85e4a4a1b02`

- Reads `REGISTRO` plus physical `PAGO_TERCEROS!A:N`.
- Ignores stale legacy derived values and recomputes child/parent state.
- Adds selected-year/monthly reconciliation data.
- Keeps COP/USD isolated.
- Preserves `admin-stabilization-worker.js` as the stable deploy entry.

### PR #252 — COP third-party reconciliation by name

Squash commit: `b02bda1406ba152884aa9b4b2976c7cd9141aba4`

The visible reconciliation was simplified into the operational view the owner requested:

- **Tercero**
- **Deuda a terceros** = current balance still owed
- **Cobrado de terceros** = proportional third-party amount only after the parent work is actually paid and `Valor Recibido` is valid
- **Pagado a terceros** = persisted actual third-party payments
- **COP only** in this reconciliation section
- unassigned parent amount remains visible as `Sin desglose`

### PR #253 — operational obligations + mark paid

Squash commit: `d4d036bed5203d655dff8ff875f7188868845176`

Operational card logic:

- obligations do not appear before the parent reaches collection workflow;
- 🟠 `Esperando pago del cliente` when the invoice/workflow is complete but the client has not paid;
- 🟢 `Listo para pagar` when the parent is `Pagado`, `Valor Recibido` is valid and a positive third-party balance remains;
- fully paid third-party rows disappear from the operational queue;
- `Sin desglose` remains visible but cannot be marked paid until assigned to a child row.

Finance endpoints:

- `GET /api/admin/finance/third-party/obligations`
- `POST /api/admin/finance/third-party/mark-paid`

`mark-paid` safety contract:

- Access/Admin authentication required;
- browser receives an opaque action reference rather than raw third-party row identity;
- Worker re-reads `REGISTRO` + `PAGO_TERCEROS` before writing;
- current balance and eligibility are recalculated server-side;
- write is rejected unless the obligation is still `ready_to_pay`;
- only `PAGO_TERCEROS!J:K` are written;
- payment date uses America/Bogota current date;
- Worker re-reads after the write and verifies that the obligation is no longer pending.

GitHub Actions and Cloudflare build were green before merge.

## AppSheet current operational state

The AppSheet `Terceros` tab is intended to show **only debt that is still owed**.

Owner-verified on 2026-09-07:

- fully paid third-party work no longer remains visible in the `Terceros` tab;
- open/partial debt remains visible;
- no additional Google Sheets schema change was required for this UX fix.

Do not rework the third-party Virtual Column formulas merely to change this tab. If the view regresses, first verify the actual View source/Slice and evaluate one concrete row before changing calculation formulas.

## Important AppSheet objects to preserve

Existing working actions:

- `Agregar tercero` on `REGISTRO`
- `Registrar pago` on `PAGO_TERCEROS`
- `Marcar tercero pagado` on `PAGO_TERCEROS`

`Marcar tercero pagado` remains the AppSheet equivalent of the Finance Admin fact-write action. Finance and AppSheet must continue recording the same two physical facts rather than maintaining separate payment state.

## Canonical proportional-retention rule

For a parent work with:

- `invoiceGross = Valor bruto`
- `bankReceived = Valor Recibido`
- `thirdPartyGross = Cobro terceros`

when valid:

- `factor = bankReceived / invoiceGross`
- third-party collected/payable amount = `thirdPartyGross * factor`
- own cash = `bankReceived - third-party payable`

For each child:

- child estimated net = `Bruto tercero * factor`
- current child debt = `child estimated net - Valor pagado tercero`

Before a valid `Valor Recibido` exists, the current obligation uses the third-party gross as the management balance reference. Legal/tax treatment is not inferred from this tracking model.

## Remaining gates

### Gate 1 — production smoke for PR #253

Run exactly one representative Admin Finance smoke before declaring the operational write path CLOSED/PASS:

1. identify/create a safe obligation that reaches `Listo para pagar`;
2. verify displayed amount/status;
3. use `Marcar pagado` once;
4. verify the row disappears from the operational card/queue;
5. verify physical `Valor pagado tercero` and `Fecha pago tercero` changed in Sheets/AppSheet after sync;
6. verify the AppSheet `Terceros` tab no longer shows the fully paid debt;
7. do not repeat the write test unnecessarily.

If no safe real/test obligation is available, do not fabricate production data only to satisfy the smoke; document the deferred smoke and continue only with explicitly approved work.

### Gate 2 — 2026 PILA estimator

After Gate 1 is closed or explicitly deferred, implement the browser-local/year-versioned PILA estimator already specified in:

`docs/roadmap/finance-third-party-pila-2026-09-05.md`

The estimator must remain a planning tool and must not write to Google Sheets, AppSheet or D1.

## Do not reopen without evidence

- third-party table migration to Virtual Columns;
- parent/child source-of-truth ownership;
- COP-only reconciliation-by-name requirement;
- stable Worker deploy-entry architecture;
- pass-through proportional-retention math;
- generic Finance write-back prohibition.

## Exact continuation

**Start by inspecting current `main` and confirming PR #253 is deployed. Perform one bounded production smoke of the third-party `Marcar pagado` path if a safe obligation is available. If it passes, mark the operational third-party milestone CLOSED/PASS and move to the 2026 PILA estimator. Do not redesign AppSheet/Sheets unless the smoke reveals a concrete mismatch.**
