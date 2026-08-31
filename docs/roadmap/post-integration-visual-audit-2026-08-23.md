# SD.Live — post-integration visual audit + stabilization

**Created:** 2026-08-23 — America/Bogota  
**Updated:** 2026-08-31 — America/Bogota  
**Status:** **CLOSED/PASS — Admin + public representative smoke completed**  
**Current verified runtime baseline:** PR #154 · `aacc0a60af70b9b85c8c61eb74216f1db6d329f3`  
**Immediate gate:** none. Select the next roadmap module deliberately before starting new runtime work.

## Purpose

The integration work materially changed public and private surfaces: Finance, Calendar, controlled create, Site Schedule, automatic Show Day, shared public headers, Rental, Testimonials and Admin navigation. Functional tests are necessary but do not prove visual/workflow coherence.

This audit treated desktop and mobile as separate first-class layouts. Both the Admin block and the representative public block are now CLOSED/PASS.

## Audit execution method — LOCKED

To avoid patch-on-patch churn and forgotten findings:

1. inspect a coherent surface/block;
2. **record findings while auditing — do not fix each finding immediately**;
3. finish the surface/block audit;
4. reconcile findings against current `main` so stale/already-fixed items drop out;
5. fix the remaining findings in one coherent batch with tests;
6. run exactly one representative production smoke for the merged runtime batch;
7. continue to the next block.

A P0/P1 that blocks use or prevents the audit from continuing may justify immediate repair. Runtime regressions introduced by a just-merged batch also qualify for immediate hotfix.

## Locked sequence

1. ~~Google OAuth Sheets write authorization~~ **PASS**.
2. ~~Controlled Calendar create → Google Sheet → AppSheet E2E~~ **PASS**.
3. ~~Site Schedule source cleanup~~ **PASS**.
4. ~~Representative public route/header audit + public stabilization batches~~ **PASS / issue #124 closed**.
5. ~~Admin visual audit desktop + mobile~~ **PASS**.
6. ~~Reconcile/fix Admin requirements in one coherent stabilization batch~~ **PASS / issue #126 closed**.
7. ~~Google Calendar production acceptance including Site Schedule projection + collection reminders~~ **PASS through PR #150**.
8. ~~Representative public production closeout~~ **PASS through PR #154**.
9. **Select the next roadmap module deliberately.** `SD.Live Patch` is eligible but not automatically active.

## Public audit — merged work

### Shared/public system

- PR #101 — Privacy/Cookie controls moved into the bottom legal footer area.
- PR #102 — footer logo follows Show Day and dot animation cadence.
- PR #103 — desktop footer rebalanced.
- PR #104 — branded SD.Live copyright point restored.
- PR #105/#120 — accepted mobile subtitle/Location +2px spacing in Show Day and normal modes.
- PR #118 — Admin-only Show Day Visual QA override `Auto / Force On / Force Off`, separate from canonical Site Schedule/REGISTRO/AppSheet, expiring at Bogotá day-end.
- PR #121 — Theatre secondary cards use natural content height.
- PR #122 — earlier shared Admin nav normalization; the final stabilization order is `Dashboard → Calendar → Finance → Inbox`, with Site Editor desktop-only and Media Library Editor-owned.

### Public closeout / accessibility / Rental integrity

PR #123 grouped the remaining public closeout findings:

- local readable contrast for Trusted/footer labels without changing global muted text;
- footer heading semantics;
- analytics consent named-region semantics;
- Turnstile container semantics cleanup;
- English Wonderlust/Selected Work CTA continuity;
- WhatsApp CTA on public SEO/service landings with safe-area spacing;
- Rental rejects `0 equipment + 0 services` while preserving valid service-only requests;
- CI browser/backend Rental pricing parity guard;
- initial accessible Testimonials progressive disclosure.

### Testimonials / PA / Supported Brands refinements

- PR #125 — first testimonial shrink correction, BetaThree PA reduction, stable mobile Misi/Wonderlust Supported Brands grids.
- PR #127 — synchronized progressive expansion: the active testimonial defines the visible expansion target for its peers.
- PR #129 — short testimonials terminate naturally instead of stretching to a large empty height; `Read less / Leer menos` preserves reader viewport; BetaThree PA behaves like one item in a hypothetical three-card desktop grid instead of a full-width hero.
- PR #131 — changing EN ↔ ES while Testimonials are expanded preserves the active expansion coherently, recalculates translated height and uses the existing global language scroll restoration instead of jumping to another page section.
- PR #152 — final public closeout batch: retained testimonial glow, restored Trusted By mobile luminosity, aligned BetaThree left, Misi mobile Supported Brands side-by-side, Wonderlust mobile layout three per row with single remainder centered.
- PR #153 — testimonial sheen pacing made independent of expanded card height; Rental editor image framing controls reliably served fresh.
- PR #154 — PA editor treats the two visible BetaThree units as one canonical CMS media composition; one image/scale/X/Y control updates both together.

### Final public production acceptance — PASS

Issue #124 is closed as completed. User verification on 2026-08-31 confirmed:

- Testimonials synchronized reveal/collapse remains correct; short cards end naturally; glow remains visible; sheen pacing is consistent open/closed and across the full expanded quote.
- BetaThree PA remains at the accepted desktop proportion/alignment; user adjusted the paired composition in CMS, saved and published it, then confirmed the live result on desktop and mobile.
- Misi Supported Brands is side-by-side on mobile.
- Wonderlust Supported Brands is three items per row on mobile, with a single remainder centered on the next row.
- Trusted By cards retain visible glow/luminosity on mobile.

The public post-integration visual audit is historical/completed. Reopen only if a new regression is observed.

## Finance blocking regression — CLOSED/PASS

Finance work was allowed as an immediate exception because it became a blocking Admin regression.

Recent Finance sequence:

- PR #132 — `Por facturar` uses canonical `Fecha fin`: only end `< today` becomes invoice-ready; end today/future/invalid stays Workflow blocked; legacy missing end may fall back to start.
- PR #133 — Finance resolves canonical fields by header name rather than assuming fixed physical column positions.
- PR #134 — ambiguous Google dates no longer produce false negative payment durations; LiventX ready-to-sign queue + monthly day-20 review added.
- PR #135 — direct LiventX supplier/signing portal CTA to `https://proveedores.aoscentral.com`.
- PR #137/#139/#140 — connection/timeouts/cache/Worker routing were hardened while the visible `Connecting…` regression was investigated.
- **PR #141 — root cause found and fixed:** `finance-liventx-portal-link.js` had a DOM-wide `MutationObserver`; its callback rewrote text/attributes inside the same observed subtree, creating a mutation → callback → mutation loop capable of saturating Safari's main thread. When the main thread froze, connection timeouts could not fire, which made the browser freeze appear to be a Google Sheets hang.

PR #141 removed the observer, moved portal-link synchronization to explicit click/keyboard/language events, made updates idempotent, cache-busted the runtime and expanded Finance freeze tests to prevent reintroduction of this pattern.

**Production smoke #141: PASS. Finance loads and remains responsive. This blocking exception is closed.**

## Admin stabilization — CLOSED/PASS

The 10-surface Admin audit is complete and issue #126 is closed as completed.

The stabilization batch delivered the reconciled current requirements instead of patching audit findings one-by-one. The final Google Calendar acceptance required PRs #146–#150; the last root cause was a stale V1 Site Schedule reader in Google reconciliation while Admin/Show Day had already moved to V2 `site_schedule_state`.

Final production verification on 2026-08-31 confirmed:

- Google sync reads the same Site Schedule V2 store as Admin/Show Day;
- `RENT` is four blocks and its broad parent is removed;
- `JPN - Cubo Colsubsidio` and `N. Jade` block projections exist;
- monthly day-5/day-19 09:00 Bogotá collection reminders are present and transparent;
- manual/recurring Google events are never edited/deleted by reconciliation;
- no Google → REGISTRO/AppSheet/Site Schedule reverse write exists.

Current Admin requirements implemented in this gate include shared typography/navigation/mobile shell, 50–250% managed-media scaling where applicable, persistent collection ordering, bounded header-nav CMS controls, Rental presentation ordering/media/grid behavior, LiventX cycle presentation, Calendar mobile hierarchy and Site Schedule responsive workflow.

Issue #126 is historical/completed. Reopen only for a genuine regression, not to continue future roadmap work.

## Future Calendar Agenda filter — RECORDED, NOT ACTIVE

Agenda should eventually expose:

- **Full Month** — all effective items in selected month, including past;
- **Current + Future** — ongoing + future only.

Rules: America/Bogota today boundary; presentation/filter only; never mutate/delete historical REGISTRO/AppSheet/Site Schedule data; ongoing multi-day remains visible.

## Future Show Day concurrency — RECORDED, NOT ACTIVE

Current resolver can detect more than one active Show Day block but header exposes a single Location. Future preferred model:

- Site Schedule presentation priority **Primary / Secondary**;
- public header uses active Primary;
- Secondary remains in Calendar/Site Schedule;
- >1 simultaneous Primary surfaces an Admin conflict;
- do not cram multiple Locations into the header;
- ownership remains website-only Site Schedule state.

Low-priority polish: Show Day favicon and authoritative prepaint to remove normal-violet → red startup pop.

## Future Finance Document Generator — RECORDED, NOT ACTIVE

See `docs/roadmap/future-finance-document-generator-2026-08-25.md`.

Target shared engine:

- Cuenta de cobro;
- Cotización;
- Factura / invoice draft;
- reuse existing SD.Live Track / Finance / Rental / future client/project data;
- branded PDF preview/export;
- revisions/status lifecycle;
- no second finance source of truth;
- no representation of a locally generated PDF as DIAN-valid electronic invoicing without explicit compliant architecture/provider integration.

## Severity rubric

- **P0:** blocks use, hides critical controls/data, severe overlap/broken navigation/inaccessible UI.
- **P1:** major brand/layout/workflow regression, mobile unusability, major overflow or misleading state.
- **P2:** noticeable alignment/spacing/typography/UX clarity defect.
- **P3:** small cosmetic refinement.

P0/P1 must close before stabilization completes. P2/P3 remain explicitly tracked.

## Exit criteria — MET

The Admin portion and the representative public portion have both met exit criteria. Source-of-truth boundaries were preserved, issue #126 is completed, issue #124 is completed, and the final runtime baseline is production-verified through PR #154.

No remaining stabilization debt in this roadmap blocks selection of the next module.

## Exact continuation

1. Admin stabilization through **PR #150 is production-smoked PASS**; issue #126 is closed.
2. Public stabilization through **PR #154 is production-smoked PASS**; issue #124 is closed.
3. Finance recovery through PR #141 remains PASS; do not repeat that smoke without a regression.
4. **No audit/stabilization gate is active. Select the next roadmap module deliberately.** `SD.Live Patch` may be prioritized, but no future module is implicitly active.
5. Generic Finance Phase 3 write-back remains blocked; integration-gated items still require verified sources/targets before implementation.
