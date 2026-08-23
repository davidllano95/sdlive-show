# SD.Live Site Schedule + automatic Show Day

**Date:** 2026-08-23 — America/Bogota  
**Status:** **CLOSED / PRODUCTION PASS**.

## Decision

Website calendar presentation is a separate operational layer from finance/AppSheet persistence.

- Google Sheets `REGISTRO` remains the persistent operations/finance source of truth.
- AppSheet **SD.Live Track** remains the mobile/offline workflow client.
- D1 Site Schedule stores only website presentation overrides for existing Calendar events.
- A REGISTRO range may be split into multiple non-overlapping website blocks without altering `Fecha trabajo`, `Fecha fin`, finance formulas or AppSheet.
- Admin Calendar consumes the website blocks when an override exists; `?view=source` preserves untouched REGISTRO source dates for the Site Schedule editor.

## Storage architecture

The initial implementation attempted to reuse CMS entry/revision tables. Production save failed because Site Schedule is not editorial CMS content and the persistence contract did not match the CMS schema.

The final production architecture uses its own D1 table:

- `site_schedule_state`.

This is still inside the existing `CMS_DB` D1 database binding, but it is a separate application-state table and **not** a Finance mirror or CMS content entry.

Production save succeeded after the dedicated store was introduced.

## Per-block controls

Each Site Schedule block owns:

- Start date;
- End date;
- explicit `Show Day` opt-in;
- website-only `Location`.

Rules:

- blocks stay inside the original REGISTRO source range;
- blocks cannot overlap;
- `Location` is validated and required when `Show Day` is enabled;
- block dates, Show Day and Location never write back to AppSheet or Google Sheets.

## Automatic Show Day

Public Show Day no longer depends on a visitor-operated/session-scoped button.

- Public status endpoint: `GET /api/site/showday-status`.
- Today is evaluated in `America/Bogota`.
- Show Day activates only when today falls inside a Site Schedule block whose `Show Day` switch is enabled and whose Location is present.
- Public payload is minimal and does not expose client/project/private finance data.
- D1/status failure fails closed to normal mode.
- Public runtime refreshes status periodically and updates the existing `showday-active` visual contract.
- Legacy public `#showdayToggle` is removed at the edge.
- Location appears publicly only while Show Day is active.

## Shared public header contract

The first production smoke of the theatre landing showed that Show Day itself worked, but the page still used the older simplified SEO header. The requested contract was that **all public pages should look and behave like the Home header so the whole site feels continuous**.

PR #96 fixed this at the edge instead of duplicating header markup across every landing.

Secondary/SEO pages now receive the Home header structure, including:

- SD.Live Home logo treatment;
- ON AIR state;
- Location below the logo;
- original Home navigation menus;
- EN/ES control;
- Start Project CTA;
- mobile navigation behavior.

Theatre landing production QA passed after the change.

## Brand rule

This feature follows the permanent SD.Live palette contract:

- Site Schedule Admin UI reuses the shared Admin `--accent` / `--accent-rgb` tokens and semantic status tokens.
- Public Show Day reuses the existing canonical `--showday-accent`, `--showday-accent-rgb` and related public design tokens.
- No independent module palette was introduced.

## Security / source-of-truth boundary

- Admin Site Schedule mutations remain behind the existing Cloudflare Access-backed Admin verifier.
- Site Schedule uses D1 only for website presentation state.
- No generic Finance Phase 3 write-back is opened.
- Site Schedule split blocks, Show Day state and Location never write to Sheets/AppSheet.
- Controlled Calendar create to REGISTRO remains a separate path.
- Controlled Calendar create is currently blocked only by Google OAuth Sheets write authorization, not by Site Schedule.

## Production QA — PASS

The real RENT source range Aug 4–28 was configured as four Site Schedule blocks:

- Aug 4–9;
- Aug 14–17;
- Aug 20–24;
- Aug 27–28.

Verified one step at a time:

1. `Site schedule` launcher opens from Calendar — PASS.
2. RENT source event loads with canonical source range and editable block — PASS.
3. Four non-overlapping blocks can be entered — PASS.
4. Initial D1 save failed and was diagnosed; dedicated `site_schedule_state` store introduced — fixed.
5. Site Schedule save then returned `Saved. Admin Calendar and automatic Show Day now use these blocks.` — PASS.
6. Admin Calendar shows four RENT blocks with real gaps — PASS.
7. `Next` follows the effective current block — PASS.
8. With all Show Day switches OFF, Home stays normal and the legacy manual button is absent — PASS.
9. Enabling Show Day on the active block activates public Show Day automatically — PASS.
10. Configured Location appears correctly — PASS.
11. Theatre landing receives Show Day state but initially had a separate SEO header — issue found.
12. PR #96 unified secondary headers with Home; theatre landing visual QA — PASS.

## Relevant PRs

- PR #93 — Site Schedule + automatic Show Day implementation.
- PR #94 — first D1 compatibility correction; production save still failed.
- PR #95 — dedicated Site Schedule D1 store; production save PASS.
- PR #96 — shared Home header on secondary public pages; production theatre landing PASS.

## Approved low-priority polish

These are explicitly **not blockers** for this milestone or the next OAuth gate:

### Dynamic Show Day favicon

Add a Show Day favicon variant and switch it automatically from the same authoritative Show Day state.

### Eliminate startup color popping

Current active Show Day can first-paint in normal violet and then turn red after the status request resolves. Future hardening should resolve/inject active Show Day state before visible paint, preferably at the edge, while failing closed to normal mode.

The favicon improvement should use the same prepaint decision so favicon and page visual state do not disagree.

## Next gate

Site Schedule / Show Day is closed.

Continue the existing Calendar controlled-create OAuth gate:

1. re-authorize the existing Google OAuth client with Sheets write scope;
2. retry one controlled Admin Calendar create;
3. verify the row in Google Sheets;
4. sync AppSheet and verify the same persisted record;
5. only then close controlled-create PASS.

See `docs/checkpoints/calendar-create-oauth-write-gate-2026-08-23.md`.
