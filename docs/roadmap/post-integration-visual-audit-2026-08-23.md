# SD.Live — post-integration visual audit + stabilization

**Created:** 2026-08-23 — America/Bogota  
**Updated:** 2026-08-25 — America/Bogota  
**Status:** **ACTIVE — Admin audit is the current block**  
**Current verified runtime baseline:** PR #141 · `159abff630188399ea9455ed4fe8911758f1fdf3`  
**Immediate manual gate:** resume Admin audit at `/admin/` desktop.

## Purpose

The integration work materially changed public and private surfaces: Finance, Calendar, controlled create, Site Schedule, automatic Show Day, shared public headers, Rental, Testimonials and Admin navigation. Functional tests are necessary but do not prove visual/workflow coherence.

This audit treats desktop and mobile as separate first-class layouts. Public findings are largely stabilized; the remaining required coherent audit block is Admin.

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
4. ~~Representative public route/header audit + public stabilization batches~~ **IMPLEMENTED / final ledger smoke still tracked in #124**.
5. **Admin visual audit desktop + mobile — ACTIVE NEXT BLOCK**.
6. Reconcile and fix Admin P0/P1 plus approved current requirements in one coherent stabilization batch.
7. Preserve P2/P3 and future ideas explicitly.
8. Only after stabilization continue controlled Calendar edit/workflow or unrelated roadmap modules.

## Public audit — merged work

### Shared/public system

- PR #101 — Privacy/Cookie controls moved into the bottom legal footer area.
- PR #102 — footer logo follows Show Day and dot animation cadence.
- PR #103 — desktop footer rebalanced.
- PR #104 — branded SD.Live copyright point restored.
- PR #105/#120 — accepted mobile subtitle/Location +2px spacing in Show Day and normal modes.
- PR #118 — Admin-only Show Day Visual QA override `Auto / Force On / Force Off`, separate from canonical Site Schedule/REGISTRO/AppSheet, expiring at Bogotá day-end.
- PR #121 — Theatre secondary cards use natural content height.
- PR #122 — shared Admin nav visual order normalized to `Dashboard → Finance → Calendar → Site Editor → Inbox`.

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

Issue #124 remains the final public representative-smoke ledger for the later Testimonials/PA/Misi/Wonderlust refinements. Do not overclaim full closure without explicit acceptance.

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

## Admin visual audit — ACTIVE

Use issue #126 as the live finding ledger. Do not patch findings one by one.

Manual sequence, exactly one action at a time:

1. `/admin/` desktop;
2. `/admin/` mobile;
3. `/admin/finance/` desktop;
4. `/admin/finance/` mobile;
5. `/admin/calendar/` desktop;
6. `/admin/calendar/` mobile;
7. `/admin/calendar/site-schedule/` desktop;
8. `/admin/calendar/site-schedule/` mobile;
9. `/admin/editor/` desktop;
10. `/admin/editor/` mobile.

### Shared Admin checks

- shared violet Admin tokens and semantic-status colors;
- navigation order, active state and cross-workspace consistency;
- responsive width/centering;
- panel/card spacing, radii and elevation;
- loading/empty/error/offline states;
- text contrast and muted labels;
- no horizontal overflow;
- safe-area/sticky collisions;
- keyboard focus order;
- mobile tap targets;
- long client/project/role strings;
- consistent EN/ES where the workspace supports it.

### Dashboard Visual QA

- `Auto / Force On / Force Off` hierarchy and selected state;
- Force On Location validation;
- Apply loading/saved/error feedback;
- effective/source summary clarity;
- expiry copy;
- no mobile overflow/collisions.

### Finance

Finance runtime itself is now production PASS. During the audit inspect visual/workflow quality only unless a new runtime regression appears:

- top queues and drilldowns;
- LiventX signing card + external portal CTA;
- Data quality dialogs;
- Aging;
- analytics layout;
- calculator;
- bilingual state;
- desktop/mobile modal scrolling and tap targets;
- loading/error states must remain bounded and must not freeze the Admin shell.

### Calendar / Operations

- month-grid proportions/date readability;
- multi-day blocks across week boundaries;
- truncation/overflow;
- today state;
- `Next` hierarchy;
- Calendar/Agenda selector;
- month navigation;
- controlled create layout/validation;
- multiple events/day.

### Site Schedule

- source-work density/search;
- selected source range;
- segments/add/remove;
- date inputs;
- Show Day + Location hierarchy;
- Save / Use REGISTRO dates;
- overlap/outside-range/backwards/missing-Location errors;
- saved state after reload;
- mobile editing without horizontal scroll.

### Site Editor

- Select/Interact and inspector routing;
- Draft/Publish/failsafe feedback;
- Media Library;
- section editors and preview parity;
- mobile inspector/preview behavior;
- known mandatory requirements below.

## Known mandatory Admin/CMS findings — issue #126

These are **required current findings**, not optional future polish, but should be implemented with the final Admin batch after the coherent audit unless they become blocking.

### Global logo/image scale to 250%

Wherever the CMS exposes a managed **logo or image**, scale controls must support up to **250%** consistently. Explicitly includes:

- Testimonials;
- Trusted By/client logos;
- Supported Brands;
- Services / Selected Work / Rental media where applicable;
- future repeatable collections exposing image/logo controls.

Use a shared/reusable scale contract. Do not mutate source image files just to achieve visual scale.

### Persistent card/collection reordering

Repeatable CMS cards/collections must have a clear persistent reorder workflow:

- explicit drag handle where appropriate;
- accessible move up/down controls for keyboard/touch;
- stable item IDs;
- Draft → Published semantics preserved;
- media/source ownership preserved;
- backend-owned transactional fields untouched;
- Preview and Published order must match saved CMS order.

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

## Exit criteria

The audit closes only when:

- current public representative smoke debt is explicitly resolved or consciously deferred with evidence;
- all current Admin workspaces are deliberately reviewed desktop + mobile;
- all P0/P1 findings are fixed and re-smoked;
- required current Admin items in #126 are reconciled and implemented or explicitly re-scoped by the user;
- P2/P3/future ideas are preserved;
- no source-of-truth boundary was weakened to solve UI problems.

## Exact continuation

1. Finance recovery through PR #141 is **production-smoked PASS**; do not repeat that smoke.
2. Resume the Admin record-first sequence at **`/admin/` desktop**.
3. Add every Admin finding to issue #126; do not branch/fix each item individually.
4. Continue the remaining 10-surface sequence one manual action at a time.
5. After all Admin surface/device checks, reconcile #126 against current `main` and implement one coherent Admin stabilization batch.
