# SD.Live — post-integration visual audit + stabilization

**Created:** 2026-08-23 — America/Bogota  
**Updated:** 2026-08-25 — America/Bogota  
**Status:** **ACTIVE**  
**Current merged baseline:** through PR #122 (`55201d339c42806a9d5233949251bdcf54399423`).  
**Current batch:** `fix/public-audit-closeout` — public-site closeout before resuming Admin audit.

## Purpose

Recent work materially changed connected public/Admin surfaces: Calendar, Site Schedule, automatic Show Day, website-only Location, shared Home-style headers, mobile Calendar/Agenda, Footer, Rental quote UX and Admin workspace separation.

Functional smoke does not equal visual coherence. This audit treats **desktop and mobile as separate first-class layouts** and requires both **normal and Show Day** states before stabilization can close.

## Audit execution method — locked 2026-08-25

To avoid patch-on-patch churn and forgotten findings:

1. inspect a coherent surface/block;
2. **record findings while auditing — do not fix each finding immediately**;
3. finish the surface/block audit;
4. reconcile findings against current `main` so stale/already-fixed items are removed;
5. fix the remaining findings in one coherent batch with tests;
6. run one production smoke for the merged runtime batch;
7. continue to the next audit block.

A P0 that prevents the audit from continuing may still justify an immediate exception. Otherwise the batch rule above is the default.

## Sequencing — locked

1. ~~Google OAuth Sheets write authorization~~ **PASS**;
2. ~~controlled Calendar create → Google Sheet → AppSheet smoke~~ **PASS** after PR #99 row-safety hardening;
3. ~~Site Schedule source-list ongoing/future cleanup~~ **PASS — PR #100**;
4. **detailed public + Admin visual audit — ACTIVE**;
5. fix P0/P1 visual regressions before closing stabilization;
6. preserve P2/P3 findings explicitly and implement them in coherent order;
7. only after audit closeout continue controlled Calendar edit/workflow actions and unrelated roadmap items.

Valid future ideas may be recorded during the audit but do not become active automatically.

## Current progress snapshot

### Closed / verified during the audit

- **PR #101:** Privacy + Cookie preferences moved to bottom legal footer area.
- **PR #102:** footer logo follows Show Day; dot blinks with header cadence and respects reduced motion.
- **PR #103:** desktop footer layout rebalanced.
- **PR #104:** branded `SD.Live` copyright point restored without stray literal period.
- **PR #105:** mobile Show Day Location spacing +2 px; production user QA PASS.
- **PR #107:** Rental drawer reframed as quotation/request flow, not ecommerce checkout.
- **PR #108:** original shopping-cart icon restored after visual review.
- **PR #115/#116:** Anima Producciones + Sonique accepted white treatment; no plate/glow/gradient and R2 originals unchanged.
- **PR #118:** authenticated Admin Visual QA override (`Auto / Force On / Force Off`) added and production-smoked PASS; override remains separate from Site Schedule/REGISTRO/AppSheet and expires at Bogotá day-end.
- **PR #120:** mobile header subtitle/Location keeps accepted +2 px spacing in both normal and Show Day; normal `Creative Audio` user QA PASS.
- **PR #121:** `/theatre-sound-design-audio-post` secondary service cards no longer force square geometry/bottom-pinned lists; desktop user QA PASS.
- **PR #122:** Admin primary navigation visual order normalized to `Dashboard → Finance → Calendar → Site Editor → Inbox`; merged with CI green. Full Admin audit remains open.

### Public route/header matrix — REVIEWED

Representative manual QA completed across the current public route families with deliberate `Force Off` / `Force On` where applicable:

- Home/shared-header behavior — normal + Show Day observations completed during the audit;
- `/theatre-sound-design-audio-post` — mobile + desktop, normal + Show Day header PASS; desktop service-card correction PASS;
- `/audio-eventos-streaming-teatro-bogota` — mobile + desktop, normal + Show Day header PASS;
- `/alquiler-sonido-wing-midas-dl32-bogota` — mobile + desktop, normal + Show Day header PASS;
- `/en/` — mobile + desktop, normal + Show Day PASS;
- `/es-co/` — mobile + desktop, normal + Show Day PASS;
- `/en/audio-equipment-rental-bogota.html` — mobile + desktop, normal + Show Day PASS;
- Anima Producciones + Sonique — normal mobile + desktop PASS; accepted Show Day treatment already PASS.

This closes the previously pending normal-mode Rental and Anima/Sonique visual verification.

## Public-site closeout batch — ACTIVE before Admin audit resumes

Current `main` was reconciled against the visual-audit/roadmap findings before making further Admin changes. The following still-current public findings are being closed together on `fix/public-audit-closeout`:

### Visual / continuity / accessibility

- increase contrast **locally** for `TRUSTED BY` without globally changing the muted token;
- increase contrast **locally** for footer `SITE / CONNECT` labels;
- correct footer label semantics without changing their visual hierarchy;
- keep the non-blocking analytics-consent UX but replace the unnamed/incompatible dialog semantics with a named region;
- remove invalid generic `aria-label` usage from Contact/Rental Turnstile container divs;
- correct the English Wonderlust / Selected Work CTA so EN does not route into an ES landing;
- expose the existing WhatsApp contact control consistently on public SEO/service landings and respect device safe areas;
- promote the already-recorded testimonial geometry/long-copy finding into this public closeout: consistent card behavior plus keyboard/touch-accessible `Read more / Leer más` disclosure only when the quote actually overflows.

### Rental integrity findings promoted into the same closeout

These are not pricing changes; they prevent public audit debt from remaining hidden:

- reject a Rental request when **zero equipment and zero services** are selected;
- preserve valid **service-only** Rental requests;
- add CI protection that asserts browser estimate pricing and backend-owned Worker pricing remain identical.

**Invariant:** Rental pricing math, inventory limits, backend ownership and `rental@sdlive.show` routing must not change in this closeout.

After this batch merges and receives one production smoke, public-site closeout is considered ready and the audit resumes with Admin only.

## Admin visual audit — OPEN

Still required as a full block, using the new record-first/batch-fix method:

- `/admin/` Dashboard, including Visual QA Show Day control;
- `/admin/finance/` Finance;
- `/admin/calendar/` Calendar / Operations;
- `/admin/calendar/site-schedule/` Site Schedule;
- `/admin/editor/` Site Editor.

Do **not** fix each new Admin finding while walking these pages. Record all findings first, reconcile them against `main`, then implement one coherent Admin stabilization batch.

## Preserved future Editor / card-system backlog — RECORDED, NOT ACTIVE

### Generic Editor collection/card reordering

Reordering should become a consistent first-class Editor capability across meaningful repeatable collections, including:

- Testimonials;
- Trusted By/client cards;
- Supported Brands;
- Services;
- Selected Work/project cards;
- CMS-owned Rental presentation collections;
- future repeatable card/list collections.

Preserve Draft → Published, item IDs, media ownership and backend-owned/transactional fields. Prefer explicit drag handles and/or accessible move up/down controls rather than making entire cards accidentally draggable.

## Future Calendar UX backlog discovered during audit — RECORDED, NOT ACTIVE

Admin Calendar **Agenda mode** should eventually expose a toggle between:

- **Full Month** — every effective Agenda item in the selected month, including past items;
- **Current + Future** — ongoing + future only, hiding items whose effective end is before today.

Future implementation rules:

- evaluate today in **America/Bogota**;
- presentation/filter only;
- do not delete/mutate historical `REGISTRO`, AppSheet or Site Schedule data;
- ongoing multi-day work remains visible;
- default option is TBD during implementation;
- desktop/mobile behavior and accessibility must be deliberate.

## Future Show Day concurrency backlog — RECORDED, NOT ACTIVE

The current automatic resolver can detect multiple active Show Day blocks (`activeCount`) but the public header exposes only one Location. Current ordering is deterministic but is not an explicit business-priority rule.

Observed real case: a Rental and a separate artist/show can occur on the same day.

Preferred future direction:

- explicit presentation priority such as **Primary / Secondary** for Show Day blocks;
- the header uses the active Primary block;
- Secondary activity remains represented in Calendar/Site Schedule without competing for the public header;
- if more than one Primary block is active simultaneously, Admin should surface a clear conflict instead of resolving it silently by technical sort order;
- do not solve this by showing multiple cramped Locations in the public header;
- preserve Site Schedule as the website-only presentation source and never write this priority into REGISTRO/AppSheet unless a future architecture decision explicitly changes ownership.

## Public site — visual checklist

For each applicable route inspect:

- shared Home-style header structure;
- canonical SD.Live logo sizing/alignment/contrast;
- Location behavior;
- navigation order, spacing, hover/focus states and destinations;
- EN/ES controls and persistence;
- CTA placement/state;
- mobile menu behavior and scroll locking;
- header/hero spacing;
- typography hierarchy and line breaks;
- section/card spacing, borders and glass surfaces;
- footer consistency;
- WhatsApp and Rental floating controls/safe areas;
- horizontal overflow/clipping;
- anchor offsets;
- keyboard focus on desktop;
- touch feedback and no hover-only critical interactions on mobile.

### Show Day-specific checks

- no visitor-facing manual Show Day toggle;
- `Auto` remains the canonical default and follows Site Schedule;
- Admin-only Force On/Force Off never mutates Site Schedule, REGISTRO or AppSheet;
- forced state visibly behaves like the corresponding public state and expires automatically;
- ON AIR/Location coherent across Home + secondary pages;
- complete red/orange Show Day palette without accidental mixed normal accents;
- readable buttons/borders/links/controls;
- language changes preserve Show Day state;
- footer and secondary routes remain visually part of the same system.

Approved low-priority polish to observe but not prioritize now:

- normal-violet → Show Day-red startup pop;
- static normal favicon during Show Day.

## Admin / Control Center audit

Shared checks:

- shared violet Admin tokens consistent;
- semantic colors only for status;
- workspace navigation alignment/active state;
- responsive width/centering;
- panel spacing/radii/elevation;
- button hierarchy and disabled/loading/error states;
- text contrast/muted labels;
- no horizontal overflow;
- safe-area/sticky-element collisions;
- keyboard focus order;
- mobile tap targets;
- loading/empty/error/offline states.

### Dashboard Visual QA specific

Desktop and mobile separately:

- `Auto / Force On / Force Off` hierarchy and selected state;
- Force On Location field visibility and validation;
- Apply button loading/saved/error feedback;
- current/effective mode summary clarity;
- expiry copy is understandable;
- no accidental horizontal overflow or collisions;
- returning to Auto is obvious and safe.

### Calendar / Operations specific

Desktop and mobile separately:

- month-grid proportions/date readability;
- multi-day/effective blocks across week boundaries;
- event truncation/overflow;
- today state;
- `Next` hierarchy;
- Calendar/Agenda selector;
- month navigation;
- create form validation/layout;
- modal/sheet scrolling;
- long client/project/role strings;
- multiple events/day.

### Site Schedule specific

- source-work density/search;
- selected-work state/source-range summary;
- segment cards/add-remove;
- date inputs;
- Show Day + Location hierarchy/validation;
- Save / Use REGISTRO dates;
- overlap/outside-range/backwards/missing-Location errors;
- saved state after reload;
- mobile editing without horizontal scroll.

## Device / language matrix

Desktop minimums: ~1440, ~1280, ~1024 px.  
Mobile minimums: iPhone-class ~390–393, larger ~430, narrow ~360 where useful.

At minimum compare Safari + Chrome where available. Review EN/ES, COL/INT and normal/Show Day branches where supported; the purpose is branch coverage, not mechanical screenshot multiplication.

## Severity rubric

- **P0:** blocks use, hides critical controls/data, severe overlap/broken navigation/inaccessible UI.
- **P1:** major brand/layout regression, route/header inconsistency, mobile unusability, major overflow or misleading state.
- **P2:** noticeable alignment/spacing/typography/UX clarity defect reducing polish but not blocking workflow.
- **P3:** small cosmetic refinement.

P0/P1 must close before audit completion. P2/P3 remain tracked and can be grouped later.

## Exit criteria

The audit closes only when:

- all current public route families are deliberately reviewed desktop + mobile;
- normal + Show Day branches are reviewed where applicable;
- EN/ES + COL/INT conditional branches receive representative validation;
- all current Admin workspaces are deliberately reviewed desktop + mobile;
- all P0/P1 findings are fixed and re-smoked;
- P2/P3 findings are preserved explicitly;
- no source-of-truth boundary is weakened to solve a visual issue.

## Current continuation

Finish `fix/public-audit-closeout`, merge only with CI green, then perform exactly one representative public production smoke. After that, resume the **Admin visual audit as one record-first block**. Do not return to piecemeal Admin fixes until the full Admin finding set has been collected and reconciled.
