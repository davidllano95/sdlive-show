# SD.Live — handoff after Admin stabilization / PR #150

**Date:** 2026-08-31 — America/Bogota  
**Runtime baseline:** `main` after PR #150 = `f5f527db3a95aaea4cde02febf147f0113e8f356`  
**Admin stabilization:** **CLOSED / production-smoked PASS**  
**Issue #126:** **CLOSED / completed**  
**Remaining separate visual-smoke debt:** public issue #124.

## Source precedence

`current main + verified production → current schema/config → this handoff → PROJECT_STATUS → README → historical roadmaps`.

## Verified architecture

- GitHub `main` = code truth.
- Google Sheets `REGISTRO` = operations/finance persistence + formulas.
- AppSheet SD.Live Track = mobile/offline workflow.
- Finance Admin remains read-only; generic Finance Phase 3 write-back is blocked.
- D1 `site_schedule_state` = website-only Site Schedule / automatic Show Day truth.
- Google Calendar `sam@sdlive.show` = secondary work/site-schedule projection + read-only manual/recurring overlay.
- Google Calendar never becomes a reverse-write source for REGISTRO/AppSheet/Site Schedule.
- R2 = managed site media; Rental pricing/quote math remains backend-owned.
- Cloudflare Access = Admin security boundary.

## Final Google Calendar acceptance

The final user sync returned **6 created**. Direct inspection of `sam@sdlive.show` showed those missing Site Schedule projections were created correctly.

### RENT — REGISTRO ID `1b01796e`

The former broad Aug 4–28 projection is gone. It is now four Site Schedule blocks:

1. `segment_1`: Aug 4–9, Show Day disabled;
2. `segment_2`: Aug 14–17, Show Day disabled;
3. `segment_3`: Aug 20–23, Show Day enabled, Location `RENT • Bogota`;
4. `segment_4`: Aug 27–28, Show Day disabled, Location `RENT • Bogota`.

### Other created Site Schedule projections

- `JPN - Cubo Colsubsidio`: Aug 28, Show Day enabled, Location `Juan Pablo Navarrete • Bogota`, REGISTRO ID `9fd9f746`.
- `N. Jade`: Sep 6–21, Show Day enabled, Location `NCL Jade • Alaska`, REGISTRO ID `7d3ed5ba`.
- A separate `N. Jade` per-diem REGISTRO record on Sep 21 (`7acf0766`) remains a legitimate distinct broad work event and is not the Site Schedule parent above.

These four RENT blocks + JPN + N. Jade explain the **6 created** production result.

### Collection reminders

Recurring Google Calendar reminders are present and transparent:

- day 5, 09:00 America/Bogota — `SD.Live · Se abre ventana de cobro`;
- day 19, 09:00 America/Bogota — `SD.Live · Cierra ventana de cobro`.

## Root cause of the final Site Schedule projection failure

Production diagnostics showed `sourceEvents: 62` but `projectedBlocks: 0`, while browser-side Admin APIs proved that the REGISTRO `eventKey` and D1 override key matched exactly.

The actual architecture had diverged:

- Admin Calendar decoration and automatic Show Day already used `site-schedule-store-v2.js` / D1 `site_schedule_state`;
- Google reconciliation still imported `readSiteSchedule()` from legacy `site-schedule-api.js` and therefore read the old V1 CMS representation.

PR #150 changed Google reconciliation to `readSiteScheduleV2()` and updated projection tests to the real V2 D1 contract. CI passed and the next production sync produced the expected six block events.

## Stabilization status

Issue #126 now records the accepted Admin scope as completed: shared Admin shell/readability/navigation, Editor CMS presentation contracts, Rental presentation stabilization, Finance LiventX visual cycle, Calendar mobile hierarchy, Site Schedule responsive editing, Google integration and production acceptance.

Preserve the Finance PR #141 regression rule: do not introduce DOM-wide MutationObservers into Finance runtimes.

## Exact continuation

1. Do **not** repeat the Admin stabilization smoke unless a new regression appears.
2. Public issue #124 remains the separate representative-smoke ledger for public refinements. Finish it or explicitly defer it with evidence.
3. After #124 is resolved/deferred, choose the next roadmap module deliberately. `SD.Live Patch` is now eligible for prioritization but is not automatically active.
4. Keep Inbox unread count integration-gated until Gmail auth/source is deliberately designed; do not fake it.
5. Keep Finance → AppSheet deep links gated until exact current SD.Live Track targets are verified.
6. Generic Finance Phase 3 write-back remains blocked.

## New-chat rule

A new conversation should read current `main`, `PROJECT_STATUS.md`, this checkpoint, `README.md`, issue #126 (completed) and issue #124 (if still open). It should treat Admin stabilization + Google Calendar production acceptance as PASS and should not reopen the OAuth/Site Schedule debugging sequence.
