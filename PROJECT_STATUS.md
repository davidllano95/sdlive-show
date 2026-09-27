# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-26 — America/Bogota** |
| GitHub `main` | **`5a0f7cc263930c134ecc0733427ac1812c5ed739` · PR #255** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant operational** |
| Active Gate | **Finance ownership semantics: owner money vs third-party pass-through money** |
| Next Gate | **2026 PILA estimator in Finance** |
| WhatsApp owner control | **PR #246 merged; Meta/Cloudflare rollout intentionally paused** |
| Bloqueado | **Generic Finance write-back / D1 Finance mirror / bidirectional sync** |

## Precedencia

1. GitHub `main` + comportamiento verificado en producción;
2. schema/config actual;
3. checkpoint/handoff fechado más reciente;
4. este archivo;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. docs/prompts históricos.

**Stability > novelty.** `MERGED` no implica `PRODUCTION SMOKE PASS`; `CI PASS` no implica producción verificada; `UNMERGED` significa no producción.

## Workflow obligatorio

Runtime: `inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only: `branch → docs → CI → PR → squash merge`. No production smoke para docs-only.

QA manual con owner: **una sola acción por vez**.

# Architectural invariants

- GitHub `main` = code truth.
- Cloudflare Access = barrera real del Admin.
- Google Sheets = Finance persistence.
- `REGISTRO` = parent work/payment table.
- `PAGO_TERCEROS` = physical child ledger for third-party obligations/payments.
- AppSheet SD.Live Track = primary mobile/offline Finance workflow.
- D1 is not a Finance mirror.
- General Finance Admin remains read-only.
- **Only approved Finance write exception:** third-party `Marcar pagado` may record a real payment by writing only `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero`, after server-side re-read/revalidation.
- Generic Finance write-back remains blocked.
- Raw/full transaction facts (`Valor bruto`, `Valor Recibido`) must remain available even when management analytics derive owner-only economics.
- Do not infer legal/tax treatment solely from `Cobro terceros`.
- Rental pricing/quote logic = backend authoritative.
- Availability = D1 Availability Core, no AI-owned truth.
- Leads = one Lead Core D1 source of truth.
- Assistant does not read/write Finance and does not create a second Rental catalog/Lead store.
- Public traffic must never migrate D1 schema.
- Owner phone/secrets/tokens stay server-side.
- Assistant uses OpenAI Responses API + strict Structured Outputs + `store:false`.
- Assistant session remains stateless/sealed; no full-transcript persistence.
- Privacy consent remains explicit and product-owned.

# Finance third-party payments — CLOSED / PASS

Latest closeout:

`docs/checkpoints/handoff-finance-third-party-closed-2026-09-26.md`

Historical handoff:

`docs/checkpoints/handoff-finance-third-party-operational-2026-09-07.md`

Roadmap:

`docs/roadmap/finance-third-party-pila-2026-09-05.md`

## Completed sequence

- ✅ PR #249 — structured `Cobro terceros` parent field through Finance read contract.
- ✅ PR #250 — pre-collection third-party obligation semantics/card.
- ✅ PR #251 — physical `PAGO_TERCEROS` ledger integration + selected-year/monthly reconciliation backend.
- ✅ PR #252 — visible COP reconciliation by third-party name: `Deuda`, `Cobrado`, `Pagado`.
- ✅ PR #253 — operational obligations queue + bounded Admin Finance `Marcar pagado` action.
- ✅ AppSheet `Terceros` tab owner-verified to hide fully paid debt and show only outstanding obligations.
- ✅ AppSheet proportional calculation corrected so monetary values no longer depend on rounded `Tasa retención calc`.
- ✅ PR #255 — normalized third-party payable/payment precision and added production regression coverage.
- ✅ Representative production `Marcar pagado` smoke — PASS on 2026-09-26.

Merged commits:

- #249 `c2b2ff1eb977d0d2d0c532abc3fbf65a61c9bd5e`
- #250 `4dcf3fe90f50fbaf77f41227f9b8b4ce4c6db1bf`
- #251 `b312b4e7f47ff5526f1bace8325aa85e4a4a1b02`
- #252 `b02bda1406ba152884aa9b4b2976c7cd9141aba4`
- #253 `d4d036bed5203d655dff8ff875f7188868845176`
- #255 `5a0f7cc263930c134ecc0733427ac1812c5ed739`

## Canonical third-party semantics

For a valid paid parent:

- `invoiceGross = Valor bruto`
- `bankReceived = Valor Recibido`
- `factor = bankReceived / invoiceGross`
- `thirdPartyPayable = Cobro terceros * factor`
- `ownCashReceived = bankReceived - thirdPartyPayable`

Child payable uses the same full factor:

- `childPayable = Bruto tercero * factor`
- `childDebt = childPayable - Valor pagado tercero`

Displayed percentage fields may be rounded for presentation, but monetary calculations must use the full ratio.

### Reconciliation section

**COP only**, grouped by third-party name:

- `Tercero`
- `Deuda a terceros` = current balance still owed
- `Cobrado de terceros` = proportional third-party amount after the parent is actually paid with valid `Valor Recibido`
- `Pagado a terceros` = persisted actual third-party payments

Unassigned amount remains visible as `Sin desglose`.

### Operational card

- not in collection workflow → hidden;
- 🟠 `Esperando pago del cliente` → workflow complete, client not paid;
- 🟢 `Listo para pagar` → parent `Pagado`, valid `Valor Recibido`, positive third-party balance;
- fully paid → disappears;
- `Sin desglose` cannot be marked paid.

Endpoints:

- `GET /api/admin/finance/third-party/obligations`
- `POST /api/admin/finance/third-party/mark-paid`

The POST re-reads both tables, recalculates eligibility/balance server-side, writes only physical `PAGO_TERCEROS!J:K`, re-reads, then verifies the obligation is no longer pending.

# Current Active Gate — Finance ownership semantics

The third-party write flow is closed. Before PILA, verify that management analytics distinguish **money that actually belongs to the owner** from **full transaction/bank totals that include third-party pass-through money**.

Desired model:

- `Valor bruto` and full `Valor Recibido` remain persisted as raw/full transaction facts;
- full billed/received totals remain available for bank reconciliation, accounting/tax review and statutory reporting where applicable;
- owner-facing management metrics (`generated`, `received`, monthly average, charts, revenue concentration and similar business-performance views) should represent money economically attributable to the owner after the canonical proportional third-party payable is removed;
- do not erase or overwrite full transaction facts to achieve owner-only analytics;
- do not automatically decide statutory tax/PILA treatment from `Cobro terceros`.

Current code requires audit because several core Finance views still use full `Valor Neto` / `Valor Recibido`, while the third-party subsystem separately computes `ownCashReceived`.

A dedicated read-only **Paid to third parties** history view is also required. It must remain separate from the current obligations queue and show persisted payments even after fully paid obligations disappear. Minimum fields: third-party name, payment date, amount paid, currency, client and project/show. Canonical detail and acceptance criteria live in `docs/roadmap/finance-owner-money-and-third-party-history-2026-09-26.md`.

## Exact next action

1. audit Google Sheets + AppSheet formulas and persisted/virtual fields for `Valor bruto`, `Valor Neto`, `Valor Recibido`, `Cobro terceros` and third-party-derived values;
2. compare those semantics with Finance Admin `generated`, `received`, Top Clients, receivables, averages/charts and tax-reserve bases;
3. define one canonical owner-money metric while preserving full/raw transaction totals separately;
4. add the read-only paid-to-third-parties historical view from `PAGO_TERCEROS` persisted payment facts;
5. implement deterministic tests and a bounded Finance Admin change only after the audit confirms the exact mismatch;
6. after this ownership gate passes, start the 2026 PILA estimator.

# Next Gate — 2026 PILA estimator

Browser-local/year-versioned planning calculator in `/admin/finance/`.

Hard boundaries:

- no Sheet/AppSheet/D1 writes;
- exact current 2026 rules/FSP thresholds must be verified before coding final parameters;
- support personal-services and own-account/different-contract modes as specified in the Finance roadmap;
- do not automatically include or exclude `Cobro terceros` from statutory PILA income;
- clearly label estimator/planning status and unsupported scenarios.

# WhatsApp owner control — merged, rollout paused

PR #246 was merged as `4fc02a565317c802c07fed78e6d25bd231eeb70b`.

Its security/architecture contract remains valid, but Meta/Cloudflare onboarding and live owner-number activation are **not the active workstream**. Do not restart rollout unless explicitly requested.

The old PR #191 remains superseded historical source material and must not be merged.

# Closed modules — do not reopen without regression

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/widget/full E2E rollout.
- SD.Live Forms Turnstile Siteverify disposition.
- Calendar controlled create + multi-day.
- Site Schedule / automatic Show Day / Location.
- Show Day Admin force control.
- Admin stabilization.
- Public visual stabilization.
- Rental image-editor parity.
- Finance general read-only dashboard foundation.
- Finance third-party schema/ledger/reconciliation/payment operations through PR #255 with production smoke PASS.

# Priority after PILA

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.

# Exact continuation point

**Inspect current `main` at/after `5a0f7cc263930c134ecc0733427ac1812c5ed739`. Finance third-party payment operations are CLOSED/PASS. Audit owner-money vs pass-through-money semantics across Sheets/AppSheet/Admin, preserving full/raw transaction totals, and add a read-only historical view of actual third-party payments by name/date/work. Only after that audit is reconciled should the 2026 PILA estimator begin.**
