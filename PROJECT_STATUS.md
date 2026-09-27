# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-26 — America/Bogota** |
| GitHub `main` | **`45afe5fe05deb96c8c9b5b72b274e7f459f4cd09` · PR #258** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant operational** |
| Active Gate | **Ningún gate de implementación seleccionado; revisar backlog y escoger siguiente workstream** |
| PILA | **Backlog / research candidate; NO es el siguiente gate por defecto** |
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

Runtime: `inspect current main → short branch → implement → tests/CI → PR → CI green → ask owner authorization → squash merge → exactly one representative production smoke`.

Docs-only: `branch → docs → CI → PR → CI green → ask owner authorization → squash merge`. No production smoke para docs-only.

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
- Raw/full transaction facts (`Valor bruto`, `Valor Recibido`) remain available even when management analytics derive owner-only economics.
- Owner-management semantics do not automatically determine legal/tax/PILA treatment.
- Rental pricing/quote logic = backend authoritative.
- Availability = D1 Availability Core, no AI-owned truth.
- Leads = one Lead Core D1 source of truth.
- Assistant does not read/write Finance and does not create a second Rental catalog/Lead store.
- Public traffic must never migrate D1 schema.
- Owner phone/secrets/tokens stay server-side.
- Assistant uses OpenAI Responses API + strict Structured Outputs + `store:false`.
- Assistant session remains stateless/sealed; no full-transcript persistence.
- Privacy consent remains explicit and product-owned.

# Finance owner-money + third-party operations — CLOSED / PASS

Latest consolidated closeout:

`docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md`

Third-party write-path closeout:

`docs/checkpoints/handoff-finance-third-party-closed-2026-09-26.md`

Owner-money/history roadmap:

`docs/roadmap/finance-owner-money-and-third-party-history-2026-09-26.md`

Historical third-party/PILA roadmap:

`docs/roadmap/finance-third-party-pila-2026-09-05.md`

## Completed sequence

- ✅ PR #249 — structured `Cobro terceros` parent field through Finance read contract.
- ✅ PR #250 — pre-collection third-party obligation semantics/card.
- ✅ PR #251 — physical `PAGO_TERCEROS` ledger integration + selected-year/monthly reconciliation backend.
- ✅ PR #252 — visible COP reconciliation by third-party name: `Deuda`, `Cobrado`, `Pagado`.
- ✅ PR #253 — operational obligations queue + bounded Admin Finance `Marcar pagado` action.
- ✅ AppSheet `Terceros` owner-verified to hide fully paid debt and show outstanding obligations.
- ✅ AppSheet proportional calculation corrected so monetary values no longer depend on rounded `Tasa retención calc`.
- ✅ PR #255 — normalized third-party payable/payment precision and production regression coverage.
- ✅ Representative production `Marcar pagado` smoke — PASS on 2026-09-26.
- ✅ PR #256 — third-party smoke documented and owner-money audit gate opened.
- ✅ Sheets/AppSheet audit — raw/full facts preserved; owner reporting layer implemented without rewriting historical facts.
- ✅ PR #257 — owner-attributable management metrics + full transaction facts + registered third-party payment history.
- ✅ Production visual smoke of #257 — PASS.
- ✅ PR #258 — `Overview` / `Third parties` Finance tabs; Overview default, third-party operational UI on demand.
- ✅ Production visual smoke of #258 — PASS.

Merged closeout commits:

- #255 `5a0f7cc263930c134ecc0733427ac1812c5ed739`
- #256 `e2a19fd1a4ae54e5c9c5a41a86164c17262a427b`
- #257 `08a6b9ab021b562a5054edf1e7f130c20ceb45f4`
- #258 `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`

## Canonical management semantics

For a valid parent:

- `invoiceGross = Valor bruto`
- `thirdPartyGross = Cobro terceros`
- `ownerGenerated = invoiceGross - thirdPartyGross`

For a valid paid parent:

- `bankReceived = Valor Recibido`
- `factor = bankReceived / invoiceGross`
- `thirdPartyPayable = thirdPartyGross * factor`
- `ownerCashReceived = bankReceived - thirdPartyPayable`

Child payable uses the same full factor:

- `childPayable = Bruto tercero * factor`
- `childDebt = childPayable - Valor pagado tercero`

Displayed percentage fields may be rounded for presentation, but monetary calculations use the full ratio.

## Raw/full facts vs management view

Persisted/raw transaction facts remain intact for reconciliation, accounting and later tax/legal review:

- `Valor bruto`
- `Valor Recibido`
- `Cobro terceros`
- dates/currency/work context

Owner-facing performance views use owner-attributable economics instead of silently treating third-party pass-through as owner revenue.

Finance Admin also keeps **Full transaction facts** visible separately.

## Third-party operational UX

Finance Admin defaults to `Overview`.

`Third parties` opens on demand and contains the third-party-specific operational material:

- reconciliation by name;
- obligations workflow;
- registered paid history.

The registered payment history is based on physical `PAGO_TERCEROS` payment facts. Current schema stores cumulative `Valor pagado tercero` plus one `Fecha pago tercero` per obligation, so this is **not** an append-only event log of every partial payment.

## Sheets/AppSheet reporting state

- `OWNER_FINANCE` is a derived reporting layer, not an AppSheet operational table.
- `REGISTRO` historical facts/schema were preserved during owner-money reporting changes.
- owner-facing Sheet dashboard/pivots use owner generated / owner cash / owner receivable as appropriate.
- full transaction totals remain available in a reconciliation block.
- AppSheet owner-money work only removed the stale `Valid If` from `Neto estimado tercero calc`; the direct full-ratio App formula remains.

# Known non-blocking Finance debt

These are backlog items, not active regressions:

1. Some Sheet dashboard helper sections use fixed client filters and can omit newly added clients.
2. Sheet monthly chart ranges are fixed to January–March and should become dynamic before treating them as full-year visualization.
3. `PENDIENTES` represents a narrower collection workflow subset than total owner receivable; labels/semantics must keep that distinction clear.
4. Data-quality REVIEW can legitimately preserve raw cash facts rather than silently correcting them; at the 2026-09-26 audit, row `154d9a77` had received cash above gross with no third-party allocation.
5. Third-party payment history is cumulative-per-obligation, not event-level partial-payment history.

# PILA — backlog / research candidate only

A Colombian PILA estimator is **not the selected next gate**.

If explicitly selected later:

- research and verify the then-current legal/operational rules before coding;
- version parameters by contribution year;
- keep it planning/estimator-only unless a future scope explicitly changes that;
- do not infer statutory contribution treatment solely from management fields such as `Cobro terceros` or owner cash;
- preserve Finance source-of-truth boundaries.

Older PILA-specific notes are historical planning material, not approval to start implementation automatically.

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
- Finance general dashboard foundation.
- Finance third-party schema/ledger/reconciliation/payment operations through PR #255 with production write smoke PASS.
- Finance owner-money semantics + full transaction reconciliation + paid-third-party history through PR #257 with smoke PASS.
- Finance third-party tab UX through PR #258 with smoke PASS.

# Candidate next workstreams — owner selection required

No ordering is approved yet.

- Finance cleanup/debt listed above.
- Rental real-time availability + double-booking protection.
- Mobile Rental Cart total/sticky summary.
- Rental quote/PDF automation + shared Finance Document Generator foundation.
- Calendar/Projects workflow additions.
- SD.Live Patch.
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.
- PILA estimator research/planning, only if explicitly selected.

# Exact continuation point

**Inspect current `main` at/after `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`. Finance owner-money and third-party operations/UX are CLOSED/PASS. There is no approved next implementation gate. Review the reconciled backlog with the owner, select one bounded workstream, then create a short-lived runtime branch. Do not automatically start PILA.**
