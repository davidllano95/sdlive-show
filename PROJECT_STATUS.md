# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-07 — America/Bogota** |
| GitHub `main` | **`d4d036bed5203d655dff8ff875f7188868845176` · PR #253** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant operational** |
| Active Gate | **Finance third-party operational closeout: one bounded production `Marcar pagado` smoke** |
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
- **Only approved Finance write exception:** PR #253 may record a real third-party payment by writing only `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero`, after server-side re-read/revalidation.
- Generic Finance write-back remains blocked.
- Rental pricing/quote logic = backend authoritative.
- Availability = D1 Availability Core, no AI-owned truth.
- Leads = one Lead Core D1 source of truth.
- Assistant does not read/write Finance and does not create a second Rental catalog/Lead store.
- Public traffic must never migrate D1 schema.
- Owner phone/secrets/tokens stay server-side.
- Assistant uses OpenAI Responses API + strict Structured Outputs + `store:false`.
- Assistant session remains stateless/sealed; no full-transcript persistence.
- Privacy consent remains explicit and product-owned.

# Current Active Gate — Finance third-party operational closeout

Detailed handoff:

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

Merged commits:

- #249 `c2b2ff1eb977d0d2d0c532abc3fbf65a61c9bd5e`
- #250 `4dcf3fe90f50fbaf77f41227f9b8b4ce4c6db1bf`
- #251 `b312b4e7f47ff5526f1bace8325aa85e4a4a1b02`
- #252 `b02bda1406ba152884aa9b4b2976c7cd9141aba4`
- #253 `d4d036bed5203d655dff8ff875f7188868845176`

## Current third-party semantics

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

### Mark paid

Endpoints:

- `GET /api/admin/finance/third-party/obligations`
- `POST /api/admin/finance/third-party/mark-paid`

The POST re-reads both tables, recalculates eligibility/balance server-side, writes only physical `PAGO_TERCEROS!J:K`, re-reads, then verifies the obligation is no longer pending.

## Exact next action

Run **one** representative production smoke of PR #253 if a safe obligation is available:

1. confirm one item is `Listo para pagar`;
2. use `Marcar pagado` once;
3. verify it disappears from the operational queue/card;
4. verify `Valor pagado tercero` and `Fecha pago tercero` changed in Sheets/AppSheet after sync;
5. verify the AppSheet `Terceros` tab does not show the fully paid item.

If there is no safe real/test obligation, do not manufacture production data only for the smoke; document it as deferred.

After pass/defer: move to the **2026 PILA estimator**.

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
- Finance third-party schema/ledger/reconciliation implementation through PR #253, except the pending representative production write smoke.

# Priority after PILA

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.

# Exact continuation point

**Inspect current `main` at/after `d4d036bed5203d655dff8ff875f7188868845176`. Do one bounded production smoke of Finance third-party `Marcar pagado` if a safe obligation exists. If it passes—or is explicitly deferred for lack of a safe item—start exact-source verification and implementation planning for the 2026 PILA estimator. Do not redesign AppSheet/Sheets without concrete regression evidence.**
