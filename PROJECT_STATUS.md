# SD.Live — estado maestro, roadmap y handoff

> **Fuente de verdad operativa del proyecto.** Resume estado verificable, gate activo, invariantes y punto exacto de continuación. El detalle histórico/futuro vive en `ROADMAP_MASTER_CHECKLIST.md`, checkpoints y specs bajo `docs/`.

| Campo | Valor |
|---|---|
| Última reconciliación | **2026-09-26 — America/Bogota** |
| GitHub `main` base del gate | **`f5e0054a84cebf238542cbde08793d995f9059c4` · PR #259** |
| Producción | `https://sdlive.show` |
| Estado macro | **Finance/Calendar/Site Schedule/Show Day/Admin/Rental/Availability/Lead Core/Assistant operational** |
| Active Gate | **SD.Live Documents v1 — signed document registry/generator** |
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

Runtime: `inspect current main → short branch → implement → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only: `branch → docs → CI → PR → CI green → squash merge`. No production smoke para docs-only.

El owner autorizó el 2026-09-26 que, para este repo/workstream, los PRs dentro del scope aprobado pueden hacer **squash merge sin pedir una autorización adicional por PR** una vez revisados y con CI verde.

Esto **no** autoriza acciones productivas sensibles silenciosas. Creación/preparación de D1/R2, bootstrap de series reales y smokes que consuman números reales siguen siendo pasos separados y explícitos.

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

# Current Active Gate — SD.Live Documents v1

Canonical implementation contract:

`docs/roadmap/sdlive-documents-v1.md`

Historical precursor:

`docs/roadmap/future-finance-document-generator-2026-08-25.md`

## Goal

Build an Admin-side document registry/generator that produces professional, already-signed PDFs with editable drafts, immutable finalized snapshots and deterministic numbering.

Initial document kinds:

- `cc-co-es` — Cuenta de cobro · Colombia · Español;
- `invoice-intl-en` — Invoice · International · English.

Future Quote/Cotización kinds reuse the same engine; they are not part of v1.

## Adopted product decisions

- Legal issuer in v1 = **Samuel David Llano Muñoz**.
- Optional/discreet `sd•live · Creative Audio` visual branding may be tested, but never replaces or obscures the legal issuer and must be removable without schema changes.
- Every draft field remains editable before finalize.
- Final documents always include the issuer signature automatically.
- Draft preview consumes no number and exposes no signature bytes.
- Cuenta de cobro adopts one **global series per issuer** from Documents v1 onward: `samuel:CC`, intended first real number `21`.
- Historical Cuenta de cobro numbering remains unchanged as legacy; no renumbering.
- Invoice continues the existing global series: `samuel:INV`, intended first real number `19` (`Invoice No. 0019`).
- Reissue with PO receives a new number and a `supersedes` relation; new Documents records no longer use the legacy `.5` convention.
- `VOID`/voided documents keep their number and artifact; issued numbers are never reused.
- Historical imports never consume new-series numbers.

## Architecture boundary

- Documents may **read** REGISTRO for prefill but performs zero Google Sheets writes.
- Billed document amount prefills from `Valor bruto`, not owner-management metrics.
- Documents gets its own D1 (`DOCS_DB`) and private R2 bucket (`DOCS_BUCKET`); it must not use `CMS_DB` or public `MEDIA_BUCKET`.
- Finalized snapshot is immutable and must contain everything necessary to reproduce the issued document.
- Number assignment + snapshot freeze are atomic/idempotent.
- Final PDF failure never releases an assigned number; artifact generation can retry from the frozen snapshot.
- Signature/PDF assets are private and streamed only through authenticated Admin routes in v1.
- Future Rental Quotes consume existing authoritative backend pricing rather than duplicating it.

## Documents PR sequence

1. **PR 0 — docs / Active Gate**: implementation contract + roadmap promotion. No runtime smoke.
2. **PR 1 — storage foundation**: dedicated D1/R2 bindings, explicit preparation/preflight, schema/triggers, fail-closed guards. Real Cloudflare resource IDs required before bindings are committed.
3. **PR 2 — domain + numbering**: money/line/snapshot logic, kinds registry, atomic sequence/finalize storage semantics and concurrency tests.
4. **PR 3 — profiles/signature/sequences**: issuer/client settings, private signature upload, test sequences/bootstrap UI/API.
5. **PR 4 — editor/preview/templates**: drafts, registry/editor UI, Cuenta de cobro + Invoice draft rendering.
6. **PR 5 — finalize/signed PDF**: Browser renderer, signed PDF/private storage/download/void/retry/events; smoke with test series only.
7. **PR 6 — Finance integration**: read-only REGISTRO prefill + linked-document reads.
8. **PR 7 — reissue/PO/registry completion**.
9. **PR 8 — approved legacy import** after the working product is stable.

Production-sensitive steps are not implicit merge side effects. In particular, real sequence bootstrap (`samuel:CC=21`, `samuel:INV=19`) occurs only after the test-series finalize smoke.

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
- ✅ PR #259 — Finance closeout/roadmap reconciled; PILA returned to optional backlog.

Merged closeout commits:

- #255 `5a0f7cc263930c134ecc0733427ac1812c5ed739`
- #256 `e2a19fd1a4ae54e5c9c5a41a86164c17262a427b`
- #257 `08a6b9ab021b562a5054edf1e7f130c20ceb45f4`
- #258 `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`
- #259 `f5e0054a84cebf238542cbde08793d995f9059c4`

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

`Third parties` opens on demand and contains:

- reconciliation by name;
- obligations workflow;
- registered paid history.

The registered payment history is based on physical `PAGO_TERCEROS` payment facts. Current schema stores cumulative `Valor pagado tercero` plus one `Fecha pago tercero` per obligation, so this is **not** an append-only event log of every partial payment.

# Known non-blocking Finance debt

These are backlog items, not active regressions:

1. Some Sheet dashboard helper sections use fixed client filters and can omit newly added clients.
2. Sheet monthly chart ranges are fixed to January–March and should become dynamic before treating them as full-year visualization.
3. `PENDIENTES` represents a narrower collection workflow subset than total owner receivable; labels/semantics must keep that distinction clear.
4. Data-quality REVIEW can preserve raw cash facts rather than silently correcting them.
5. Third-party payment history is cumulative-per-obligation, not event-level partial-payment history.

# PILA — backlog / research candidate only

A Colombian PILA estimator is **not the selected next gate**.

If explicitly selected later:

- research and verify the then-current legal/operational rules before coding;
- version parameters by contribution year;
- keep it planning/estimator-only unless future scope explicitly changes that;
- do not infer statutory contribution treatment solely from management fields such as `Cobro terceros` or owner cash;
- preserve Finance source-of-truth boundaries.

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

# Later backlog after Documents v1 selection

Documents is the active implementation workstream. Other candidates remain backlog and do not displace it automatically:

- Finance cleanup/debt listed above.
- Rental real-time availability + double-booking protection.
- Mobile Rental Cart total/sticky summary.
- Quote/Cotización kinds on the shared Documents foundation.
- Calendar/Projects workflow additions.
- SD.Live Patch.
- CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.
- PILA estimator research/planning when explicitly selected.

# Exact continuation point

**PR 0 is the active step. Add/reconcile the SD.Live Documents v1 contract and Active Gate docs, merge after green CI under the owner's standing merge authorization, then inspect the resulting `main` and begin PR 1 storage foundation. Before PR 1 commits real Cloudflare bindings, obtain the actual D1/R2 resource IDs. Do not create/prepare production storage or bootstrap real document sequences as an implicit merge side effect.**
