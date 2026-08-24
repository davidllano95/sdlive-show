# SD.Live — visual audit continuation checkpoint

**Date:** 2026-08-23 — America/Bogota  
**Status:** ACTIVE HANDOFF  
**Main verified through:** PR #105

## What is already closed

- Finance Phase 2 read-only Admin — CLOSED/PASS.
- Dedicated Finance workspace — CLOSED/PASS.
- AppSheet multi-day source model — PASS.
- Admin Calendar read-only — CLOSED/PASS.
- Site Schedule + automatic Show Day + Location — CLOSED/PASS.
- Shared Home-style header on secondary public pages — PASS.
- Google OAuth Sheets write authorization — PASS.
- Controlled Admin create — CLOSED/PASS after PR #99 row-safety fix + end-to-end Sheet/AppSheet smoke.
- Site Schedule ongoing/future source selector — PASS in PR #100.

## Visual audit already completed/fixed

- PR #101: Privacy + Cookie preferences moved to bottom footer legal area.
- PR #102: footer logo follows Show Day; dot blinks.
- PR #103: footer desktop balance improved.
- PR #104: branded copyright `SD.Live` point restored without stray literal period.
- PR #105: mobile Show Day Location spacing +2 px; user QA = A/PASS.

## Current audit focus

Continue the required visual audit in the existing sequence. Do not start unrelated milestones simply because another idea exists.

### Next open finding — Rental quotation drawer/header

On mobile the Rental drawer header is too tall and currently reads like four stacked lines:

- `Carrito de alquiler`
- `Arma tu`
- `solicitud de`
- `alquiler`

The drawer should be compacted and the whole UX should communicate clearly that the user is **requesting a rental quote/cotización**, not purchasing equipment in an ecommerce checkout.

Constraints:

- backend remains owner of rental pricing/quote math;
- notification remains `rental@sdlive.show`;
- do not change inventory IDs, source-of-truth or persistence to solve copy/layout;
- maintain existing SD.Live public palette and Show Day behavior;
- inspect mobile first, then desktop/normal mode parity before closing.

### Other open visual findings

- Verify at least two low-contrast Trusted By/supported-brand marks across mobile + desktop and normal + Show Day before applying a minimal brand-safe contrast fix.
- Full public route matrix still needs completion.
- Admin visual audit still needs deliberate desktop + mobile review for Dashboard, Finance, Calendar, Site Schedule and Editor.

## Priority discipline

- Current gate = **visual audit**.
- Fix findings as they are reached in this audit.
- P0/P1 close before audit closure.
- P2/P3 stay explicitly tracked and are implemented in coherent sequence.
- Do not use a visual finding to reorder unrelated Finance/CRM/Calendar roadmap milestones.
- One manual smoke/action at a time.

## Still-open non-visual follow-ups

- Issue #83: billing/reminders use day after canonical `Fecha fin`.
- AppSheet-specific workflow/date-display corrections must be diagnosed from actual AppSheet config; do not invent expressions.
- Generic Finance Phase 3 write-back remains BLOCKED.
- Controlled Calendar edit/workflow actions come only after stabilization PASS.
- Dynamic Show Day favicon + no-pop prepaint remain approved low-priority polish.

## Source-of-truth reminders

- GitHub `main` = code truth.
- Google Sheets `REGISTRO` = operations/finance persistence + formula owner.
- AppSheet SD.Live Track = mobile/offline workflow.
- D1 Site Schedule = website-only presentation state.
- Cloudflare Access = Admin security boundary.
- Public Home header = visual/navigation contract for secondary public pages.

## Resume instruction

Read `PROJECT_STATUS.md`, this checkpoint, and `docs/roadmap/post-integration-visual-audit-2026-08-23.md`, inspect current `main`, then continue the Rental quotation drawer/header finding without reopening closed milestones.