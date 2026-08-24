# SD.Live — post-integration visual audit + stabilization

**Created:** 2026-08-23 — America/Bogota  
**Updated:** 2026-08-23 — America/Bogota  
**Status:** **ACTIVE**  
**Current verified runtime:** through PR #116 (`a48a92c0c6f0d0c38765b04e0833db692456c3e9`).

## Purpose

Recent work materially changed connected public/Admin surfaces: Calendar, Site Schedule, automatic Show Day, website-only Location, shared Home-style headers, mobile Calendar/Agenda, Footer, Rental quote UX and Admin workspace separation.

Functional smoke does not equal visual coherence. This audit treats **desktop and mobile as separate first-class layouts** and requires both **normal and Show Day** states before stabilization can close.

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

### Closed during the audit

- **PR #101:** Privacy + Cookie preferences moved to bottom legal footer area.
- **PR #102:** footer logo follows Show Day; dot blinks with header cadence and respects reduced motion.
- **PR #103:** desktop footer layout rebalanced.
- **PR #104:** branded `SD.Live` copyright point restored without stray literal period.
- **PR #105:** mobile Show Day Location spacing +2 px; production user QA PASS.

### Rental quote drawer — CLOSED for currently testable Show Day matrix

**PR #107:** reframed the Rental drawer as a **quotation/request flow**, not ecommerce checkout.

Key UX contract:

- Rental quote / Cotización;
- Build your request / Arma tu solicitud;
- Review quote / Revisar solicitud;
- Request rental quote / Solicitar cotización;
- Estimated quote total / Estimado de cotización;
- explicit note that estimate is not payment and does not confirm availability/reservation.

Backend pricing/quote ownership and `rental@sdlive.show` routing remain unchanged.

**PR #108:** restored the original shopping-cart icon after the temporary request/document icon was rejected.

Verified automatic Show Day QA:

- mobile / ES — PASS;
- desktop / ES — PASS;
- mobile / EN — PASS;
- desktop / EN — PASS.

Normal-mode Rental verification remains explicitly pending because Show Day is currently automatic and active.

### Trusted By / dark client-logo contrast — CLOSED for accepted treatment

User identified **Anima Producciones** and **Sonique** as the problematic dark marks.

History:

- PR #111: neutral plate attempt;
- PR #112: plate + glow refinement;
- user rejected the visual direction;
- PR #114: removed plate/gradient/glow completely;
- PR #115: applied `brightness(0) invert(1)` only to Anima + Sonique in Show Day; user QA PASS;
- PR #116: made the accepted white treatment mode-independent.

Final contract:

- Anima + Sonique render white in normal + Show Day;
- original Cloudflare R2 assets remain untouched;
- no other client logos are affected;
- no plate, border, gradient or glow remains.

Show Day mobile production QA after PR #116 — PASS. Normal-mode visual verification remains pending when normal mode becomes observable.

### Documentation/future backlog captured during audit

- **PR #109:** reconciled Show Day docs to dynamic Site Schedule architecture; future authenticated Admin override recommended `Auto / Force On / Force Off`, reversible and ideally TTL-based.
- **PR #110:** recorded consistent testimonial card geometry/long-copy handling and generic Editor collection reordering.
- **PR #113:** recorded **Attio** as future CRM candidate and **Dapta.ai** as future AI chatbot/agent candidate with pricing/integration/source-of-truth evaluation guardrails.

These are not active milestones.

## Current open findings

### Remaining public matrix — OPEN

Continue deliberate route-family checks across:

- `/`;
- `/en/`;
- `/es-co/`;
- `/theatre-sound-design-audio-post`;
- `/audio-eventos-streaming-teatro-bogota`;
- current Rental/service landing variants present in the repository.

Required branches where applicable:

- desktop + mobile;
- normal + Show Day;
- EN/ES;
- COL/INT.

Do not falsely mark normal-mode checks PASS while automatic Show Day prevents observing normal mode.

### Admin visual audit — OPEN

Still required for:

- `/admin/` Dashboard;
- `/admin/finance/` Finance;
- `/admin/calendar/` Calendar / Operations;
- `/admin/calendar/site-schedule/` Site Schedule;
- `/admin/editor/` Site Editor.

Admin audit remains first-class and cannot be skipped because more public mobile QA has already occurred.

## Preserved future Editor / card-system backlog — RECORDED, NOT ACTIVE

### Testimonials — consistent geometry + long-copy handling

- testimonial cards should present consistent visual geometry;
- long quotes must remain fully accessible;
- preferred direction: restrained preview/line clamp + obvious **Read more / Leer más** progressive disclosure;
- expansion must work keyboard/touch, preserve focus and avoid destructive layout jumps;
- EN/ES text-length differences must be handled naturally;
- do not force every card to the height of the single longest quote if progressive disclosure provides a better layout.

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

Continue the remaining public matrix one manual QA action at a time, then the mandatory Admin desktop/mobile audit. Rental Show Day and the accepted Anima/Sonique treatment are closed; do not reopen them without regression evidence. Normal-mode-specific checks remain pending until normal mode is observable.
