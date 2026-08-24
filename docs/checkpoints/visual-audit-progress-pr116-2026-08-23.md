# SD.Live — visual audit progress checkpoint through PR #116

**Date:** 2026-08-23 — America/Bogota  
**Status:** ACTIVE HANDOFF / CURRENT CHECKPOINT  
**Verified `main`:** `a48a92c0c6f0d0c38765b04e0833db692456c3e9` — PR #116

## Active gate

The active gate remains the **post-integration detailed visual audit**. Do not jump to unrelated CRM, Finance write-back, Calendar edit/workflow or other feature milestones until the public + Admin audit is sufficiently complete and P0/P1 findings are closed.

Normal mode still requires later visual verification where the current automatic Show Day state prevents a direct production check.

## Closed visual work since the previous checkpoint

### Rental quote drawer — PR #107 + PR #108

The Rental drawer was clarified as a quotation/request flow rather than ecommerce checkout while preserving backend-owned pricing and `rental@sdlive.show` routing.

Copy now consistently uses concepts such as:

- Rental quote / Cotización;
- Build your request / Arma tu solicitud;
- Review quote / Revisar solicitud;
- Request rental quote / Solicitar cotización;
- Estimated quote total / Estimado de cotización;
- explicit note that the estimate is not a payment and does not confirm availability/reservation.

PR #108 restored the original shopping-cart icon after the temporary request/document icon was rejected visually.

Verified production QA while automatic Show Day was active:

- mobile / ES / Show Day — PASS;
- desktop / ES / Show Day — PASS;
- mobile / EN / Show Day — PASS;
- desktop / EN / Show Day — PASS.

Normal-mode Rental QA remains pending until normal mode is available or a future Admin-only Show Day override exists.

### Show Day documentation + future override — PR #109

Roadmap documentation was reconciled to the actual dynamic Show Day architecture:

- D1 Site Schedule + America/Bogota date is authoritative;
- visitor-facing manual Show Day toggle remains removed;
- future Admin-only override is backlog only, recommended `Auto / Force On / Force Off`;
- future override must not mutate canonical `REGISTRO` dates or persisted Site Schedule blocks;
- dynamic favicon and prepaint/no-color-pop remain future polish.

### Future Testimonials + generic Editor reordering — PR #110

Recorded, not active:

- testimonial cards should have consistent visual geometry;
- long quotes should use accessible progressive disclosure rather than forcing one huge card;
- repeatable Editor collections should converge on a consistent reorder interaction across Testimonials, Trusted By/client cards, Supported Brands, Services, Selected Work, eligible Rental presentation collections and future lists;
- Draft → Published semantics and IDs/source ownership must remain intact.

### Trusted By / dark client-logo contrast — PRs #111–#116

User identified **Anima Producciones** and **Sonique** as the two dark client marks with poor contrast.

The first two attempted treatments used a neutral plate and then a luminous plate/halo. Both were rejected visually. Those treatments were completely removed in PR #114.

Final accepted solution:

- PR #115 applied `filter: brightness(0) invert(1)` to Anima + Sonique during Show Day only;
- user production QA confirmed the result looked very good;
- PR #116 removed the Show Day condition so **Anima + Sonique render white in both normal and Show Day modes**;
- original Cloudflare R2 media remains untouched;
- no other client logos are affected;
- no plate, border, gradient or glow remains.

Show Day mobile production QA after PR #116 — **PASS**.

Normal-mode appearance remains to be rechecked when automatic Show Day is inactive, but the CSS treatment is deliberately mode-independent.

## Future external-platform evaluation recorded — PR #113

Dedicated roadmap note:

- `docs/roadmap/future-crm-ai-vendors-2026-08-23.md`

Candidates:

- **Attio** — future CRM candidate;
- **Dapta.ai** — future AI chatbot/agent candidate.

These are evaluation candidates only. Before adoption, re-check current pricing, APIs/webhooks, privacy/data processing, vendor lock-in/export, operational reliability and total recurring cost.

Permanent source-of-truth guardrails remain:

- Google Sheets `REGISTRO` remains operations/finance persistence + formula owner unless a separately approved migration changes that;
- formula-owned Sheets columns are never written by a CRM integration;
- AppSheet SD.Live Track remains mobile/offline workflow until deliberately replaced;
- D1 Site Schedule remains website-presentation state.

## New future Calendar UX backlog — Agenda scope toggle

Recorded now, **NOT ACTIVE**:

Admin Calendar **Agenda mode** should eventually expose a simple toggle between:

- **Full Month** — show every effective Agenda item in the selected month, including past items;
- **Current + Future** — hide items whose effective end is before today and show ongoing + future items.

Rules for future implementation:

- evaluate “today” in **America/Bogota**;
- this is a presentation/filter control only;
- do not delete or mutate historical `REGISTRO` rows, Site Schedule blocks or AppSheet records;
- ongoing multi-day work remains visible in Current + Future;
- selected default should be decided during implementation rather than assumed now;
- desktop/mobile behavior should be coherent and accessible.

## What remains open in the active visual audit

1. **Public normal-mode matrix** — later verify Rental and permanent-white Anima/Sonique treatment when automatic Show Day is no longer active.
2. **Remaining public route-family review** — desktop + mobile, EN/ES, COL/INT where applicable.
3. **Admin visual audit** — deliberate desktop + mobile review of:
   - `/admin/`;
   - `/admin/finance/`;
   - `/admin/calendar/`;
   - `/admin/calendar/site-schedule/`;
   - `/admin/editor/`.
4. Preserve P2/P3 findings without using them to reorder unrelated roadmap milestones.

## Resume instruction

Read current `main`, `PROJECT_STATUS.md`, `docs/roadmap/post-integration-visual-audit-2026-08-23.md` and this checkpoint. Continue the visual audit one manual QA action at a time. Do not reopen Rental/Trusted fixes already verified unless regression evidence appears.
