# SD.Live — handoff after public post-integration audit closeout

**Date:** 2026-08-31 — America/Bogota  
**Runtime baseline:** `main` after PR #154 = `aacc0a60af70b9b85c8c61eb74216f1db6d329f3`  
**Admin stabilization:** **CLOSED / PASS**  
**Public post-integration visual audit:** **CLOSED / PASS**  
**Issue #126:** **CLOSED / completed**  
**Issue #124:** **CLOSED / completed**

## Source precedence

`current main + verified production → current schema/config → this handoff → PROJECT_STATUS → README → historical roadmaps`.

## Final public acceptance

The representative public smoke was completed on desktop and mobile after PRs #152–#154.

### Testimonials

Accepted behavior:

- long-copy progressive disclosure remains synchronized;
- short testimonials end naturally without large dead space;
- collapsing the active quote preserves reader position;
- active/expanded cards retain glow;
- sheen/reflection pacing is independent from card height, so open/closed and top/bottom of the longest quote feel consistent.

### Rental / PA

Accepted behavior:

- BetaThree card keeps the reduced one-card-in-three-grid desktop proportion and left alignment;
- PA is a visible two-unit composition;
- CMS stores one canonical `pa.image` presentation source;
- Replace / Library, image size, horizontal position and vertical position control both visible units together;
- user adjusted the PA framing in Site Editor, saved Draft, published, and confirmed the live result is correct on desktop and mobile.

### Trusted By / mobile

Accepted behavior:

- Misi Supported Brands stays side-by-side rather than stacked;
- Wonderlust uses three items per row, with a single remainder centered on the next row;
- Trusted By cards retain visible glow/luminosity on touch/mobile.

## Relevant closeout PRs

- **#152** — public closeout batch: testimonial glow, Trusted By mobile luminosity, BetaThree left alignment, Misi/Wonderlust mobile grouping.
- **#153** — testimonial height-independent sheen pacing + reliable fresh Rental framing controls.
- **#154** — PA pair media synchronization in Rental CMS preview, with one canonical media/framing control for both units.

Issue #124 was reconciled with all checks complete and closed as `completed` after the final mobile acceptance.

## Existing accepted Admin/operations state

Do not reopen prior gates absent a new regression:

- Finance PR #141: production-smoked PASS; DOM-wide Finance MutationObservers remain prohibited.
- Admin issue #126: CLOSED/PASS.
- Calendar controlled create: PASS.
- Site Schedule V2 + automatic Show Day: PASS.
- Google Calendar projection to `sam@sdlive.show`: PASS through PR #150.
- REGISTRO/AppSheet remain operations truth; no Google reverse write.
- Finance generic Phase 3 write-back remains blocked.

## Exact continuation

There is now **no active stabilization gate**.

The next action is to select one roadmap module deliberately before implementation begins. Current eligible examples include:

- **SD.Live Patch** — documented patch-sheet / signal-flow / show-documentation workspace;
- Calendar Agenda `Full Month` vs `Current + Future` filter;
- controlled Calendar edit/workflow actions;
- Finance Document Generator;
- Rental availability / double-booking / advanced quote workflow;
- Show Day Primary/Secondary concurrency + later favicon/prepaint polish;
- integration-gated Inbox unread count, Finance → AppSheet deep links, Attio CRM or Dapta.ai only after their sources/targets are verified.

`SD.Live Patch` is documented and eligible for prioritization, but is **not automatically active** until explicitly selected.

## New-chat rule

A new conversation should read current `main`, `PROJECT_STATUS.md`, this checkpoint, `README.md`, and the relevant roadmap spec for the module selected next. It should treat issues #124 and #126 as historical/completed and must not restart their smoke/audit sequences unless a new regression is reported.
