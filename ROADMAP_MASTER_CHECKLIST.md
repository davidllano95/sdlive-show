# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve one explicit work order and durable backlog without allowing historical branches or notes to override live project state.
>
> **Authority:** current GitHub `main` + verified production behavior → current schema/config → latest checkpoint → `PROJECT_STATUS.md` → `README.md` → this checklist → older docs/prompts.

Last reconciliation: **2026-09-26 — America/Bogota**

Current `main` at handoff:

`45afe5fe05deb96c8c9b5b72b274e7f459f4cd09` — PR #258.

## Legend

- ✅ **DONE / CLOSED / PASS** — merged and, when runtime-relevant, production-verified.
- 🟢 **MERGED / CI PASS** — merged but smoke state stated separately.
- 🚧 **ACTIVE GATE** — current approved work.
- 🟡 **OPEN / UNMERGED** — prepared work, not production.
- 🧪 **TEMP VALIDATION ONLY** — proof branch/PR; not for merge.
- ⏳ **BACKLOG** — future work; does not displace Active Gate.
- ⛔ **BLOCKED** — intentionally not allowed yet.

**UNMERGED != PRODUCTION. CI PASS != PRODUCTION SMOKE PASS.**

# Current Active Gate

There is **no approved runtime implementation gate** at this reconciliation point.

Finance owner-money semantics, third-party payment operations/history and the new Finance tabs are CLOSED/PASS through PR #258.

Next action is a product/backlog review with the owner, then selection of one bounded workstream.

# Finance — owner money + third-party milestone

✅ **CLOSED / PASS.**

Consolidated handoff:

`docs/checkpoints/handoff-finance-owner-money-closeout-2026-09-26.md`

Earlier write-path closeout:

`docs/checkpoints/handoff-finance-third-party-closed-2026-09-26.md`

Owner-money/history roadmap:

`docs/roadmap/finance-owner-money-and-third-party-history-2026-09-26.md`

## Completed Finance sequence

1. [x] `REGISTRO.Cobro terceros` structured parent field.
2. [x] Canonical proportional third-party allocation reused consistently.
3. [x] `PAGO_TERCEROS` physical child ledger integrated.
4. [x] Derived third-party values recomputed from persisted facts / AppSheet VCs rather than stale physical derived columns.
5. [x] Reconciliation by third-party name with `Deuda`, `Cobrado`, `Pagado`.
6. [x] Operational `Esperando pago del cliente` / `Listo para pagar` states.
7. [x] Narrow Admin `Marcar pagado` write to physical `PAGO_TERCEROS!J:K` with server-side revalidation.
8. [x] AppSheet `Terceros` hides fully paid debt.
9. [x] Rounded-rate monetary bug removed from AppSheet calculation.
10. [x] PR #255 precision regression fixed; representative production write smoke PASS.
11. [x] Owner-money audit completed across Sheets/AppSheet/Admin.
12. [x] `OWNER_FINANCE` derived Sheet reporting layer added without rewriting raw/historical facts.
13. [x] Owner-facing Sheet dashboard/pivots changed to owner generated / owner cash / owner receivable semantics.
14. [x] Full billed and bank-received facts retained separately for reconciliation/accounting/tax review.
15. [x] PR #257 made owner money primary in Finance Admin and added registered third-party paid history.
16. [x] PR #257 production visual smoke PASS.
17. [x] PR #258 added `Overview` / `Third parties` Finance tabs; default clean Overview.
18. [x] PR #258 production visual smoke PASS.

Closeout commits:

- #255 → `5a0f7cc263930c134ecc0733427ac1812c5ed739`
- #256 → `e2a19fd1a4ae54e5c9c5a41a86164c17262a427b`
- #257 → `08a6b9ab021b562a5054edf1e7f130c20ceb45f4`
- #258 → `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`

## Canonical Finance management model

For a valid work row:

- `ownerGenerated = Valor bruto - Cobro terceros`

For a valid paid row:

- `factor = Valor Recibido / Valor bruto`
- `thirdPartyPayable = Cobro terceros * factor`
- `ownerCashReceived = Valor Recibido - thirdPartyPayable`

Raw/full transaction facts remain intact and available separately.

Management semantics do **not** automatically decide statutory tax or PILA treatment.

## Third-party history limitation

Current physical schema stores cumulative `Valor pagado tercero` plus one `Fecha pago tercero` per obligation. The Admin history therefore represents registered cumulative paid facts per obligation, **not** an append-only event log of every partial payment.

# Finance cleanup / debt

⏳ **BACKLOG — not currently blocking.**

- Some Google Sheets dashboard helper areas use fixed client filters and may omit newly added clients.
- Sheet monthly graph ranges are fixed to January–March and should become dynamic before relying on them as full-year views.
- `PENDIENTES` is intentionally narrower than total owner receivable; labels must continue to make collection workflow vs all outstanding receivables distinct.
- Data-quality REVIEW rows should preserve raw cash facts unless the underlying source is corrected explicitly.
- Event-level partial-payment history would require an intentional physical-ledger redesign; do not infer it from the current cumulative J/K model.

# Candidate next workstreams — no approved order

The owner has not selected the next runtime gate yet. The following are candidates, **not a ranking**:

- ⏳ Finance cleanup/debt listed above.
- ⏳ Rental real-time availability + double-booking protection.
- ⏳ Mobile Rental Cart total visibility / sticky summary.
- ⏳ Rental quote/PDF + shared Finance Document Generator foundation.
- ⏳ Calendar/Projects workflow additions.
- ⏳ SD.Live Patch.
- ⏳ Basic CRM beyond current Lead Core.
- ⏳ Admin Inbox / Workspace association.
- ⏳ Data Studio / business analytics.
- ⏳ SEO/indexation monitoring.
- ⏳ Mobile critical-render performance.
- ⏳ Accessibility remediation.
- ⏳ CMS advanced layout/DAM/editor capabilities.
- ⏳ Canonical HTML CV/private portfolio.
- ⏳ Security/Cloudflare periodic evaluation.
- ⏳ PILA estimator research/planning, only if explicitly selected.

# PILA estimator

⏳ **BACKLOG / RESEARCH CANDIDATE ONLY.**

PILA is no longer the automatic next milestone.

If selected later:

- research current Colombian legal/operational rules again at implementation time;
- version rules by contribution year;
- keep the first scope planning/estimator-only unless explicitly expanded;
- do not automatically map `Cobro terceros`, owner cash or other management fields to statutory contribution income;
- preserve Google Sheets/AppSheet/D1 boundaries;
- unsupported legal scenarios must fail clearly rather than guess.

The older `docs/roadmap/finance-third-party-pila-2026-09-05.md` is retained as historical planning material, not current execution order.

# WhatsApp owner control

🟢 **CODE MERGED / ROLLOUT PAUSED.**

PR #246 merged as:

`4fc02a565317c802c07fed78e6d25bd231eeb70b`.

The bounded verified-owner WhatsApp Availability architecture is in `main`, but Meta/Cloudflare onboarding, activation and production owner-number smoke are intentionally not active. Do not restart rollout unless explicitly requested.

Old PR #191 remains superseded historical source material and must not be merged.

# Closed foundations

✅ Availability Core v1.  
✅ Lead Core through PR #190.  
✅ Assistant storage/backend/runtime/public widget/full production E2E.  
✅ Existing Contact/Rental Turnstile Siteverify disposition.  
✅ Calendar controlled create + multi-day.  
✅ Site Schedule / automatic Show Day / Location.  
✅ Show Day Admin force control.  
✅ Admin stabilization.  
✅ Public visual stabilization.  
✅ Rental image-editor parity.  
✅ Finance general dashboard foundation.  
✅ Finance third-party operational path through PR #255 + production write smoke.  
✅ Finance owner-money/full-transaction/history through PR #257 + production visual smoke.  
✅ Finance third-party tabs through PR #258 + production visual smoke.

# Source-of-truth boundaries

## Finance

- Google Sheets = Finance persistence.
- `REGISTRO` = parent operations/work/payment table.
- `PAGO_TERCEROS` = physical child obligation/payment ledger.
- AppSheet SD.Live Track = primary mobile/offline workflow.
- General Finance Admin analytics = read-only.
- Approved exception: explicit third-party payment action may write only `PAGO_TERCEROS.J = Valor pagado tercero` and `K = Fecha pago tercero` after fresh server-side validation.
- No derived values are persisted by Finance Admin.
- ⛔ Generic Finance write-back remains BLOCKED.
- ⛔ D1 Finance mirror remains BLOCKED.
- ⛔ Bidirectional Finance sync remains BLOCKED.
- Assistant has no Finance read/write path.

## Rental

- backend pricing/quote logic is authoritative;
- Assistant cannot become a second Rental catalog/pricing engine;
- unknown/ambiguous item resolution fails closed;
- catalog quantity limits fail closed;
- inventory availability remains unknown unless a deterministic backend says otherwise;
- cart is request for quotation, not checkout.

## Availability

- D1 Availability Core is authoritative;
- AI consumes it as a deterministic tool;
- WhatsApp owner control uses the canonical parser/write path;
- public WhatsApp traffic must not migrate D1 schema;
- Travel/private timezone data is not public business context;
- public owner-phone leakage is prohibited.

## Assistant session/privacy

- no transcript persistence;
- structured slots only;
- AES-GCM sealed browser token;
- no provider-side conversation-state dependency;
- explicit product-owned consent only;
- Lead + consent + idempotency effect persisted atomically;
- retry returns existing completed Lead rather than duplicate PII.

# Non-negotiable workflow

- Never write directly to `main`.
- One short branch per coherent change.
- Tests/CI before merge.
- Ask owner authorization before merge.
- Squash merge.
- Exactly one representative production smoke for runtime changes.
- No production smoke for docs-only.
- One manual QA action at a time.

# Exact continuation

**Inspect current `main` at/after `45afe5fe05deb96c8c9b5b72b274e7f459f4cd09`. Finance owner-money and third-party operations/history/tabs are CLOSED/PASS. There is no selected next implementation gate. Review the candidate backlog with the owner, choose one bounded workstream, and only then open a runtime branch. Do not automatically start PILA.**
