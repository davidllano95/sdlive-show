# SD.Live

Production website and back-office for **SD.Live — Creative Audio**.

Production: `https://sdlive.show`  
Public media: `https://media.sdlive.show`

The public site is a vanilla HTML/CSS/JS frontend served by Cloudflare Workers Static Assets. Dynamic APIs, CMS publishing, forms and edge rendering run in Cloudflare Workers. D1 stores structured CMS content and R2 stores editor-managed media.

For current progress, active gates, evidence, architectural invariants and the classified roadmap, read **`PROJECT_STATUS.md` first**. For the reconciled historical/future feature inventory, then read **`ROADMAP_MASTER_CHECKLIST.md`**. The repository and production behavior remain authoritative over planning prose.

## Authority and precedence

When sources conflict, use this order:

1. **Current code + behavior that can be verified in production.**
2. **Current schema, migrations and deployed configuration.**
3. **`PROJECT_STATUS.md` — operational current state / active gate / roadmap.**
4. **This README.**
5. **`ROADMAP_MASTER_CHECKLIST.md`** for preserved backlog detail.
6. Prompts, ideas, benchmark notes and external references.

A prompt, benchmark or future-vision document never silently overrides an existing working feature, invariant or source-of-truth. A conflicting change requires an explicit decision and a safe migration plan.

The project distinguishes planning levels:

- **CURRENT STATE** — demonstrable in the repository and/or production.
- **ROADMAP / ACTIVE GATES** — approved and prioritized work.
- **BACKLOG** — wanted work preserved for later prioritization.
- **FUTURE INTEGRATION** — documented possibility; not authorized by its presence alone.
- **VISION** — strategic direction; not an implementation commitment.

`PROJECT_STATUS.md` uses classifications **A–F**. `F` means **Active Gate / Approved Work** and is distinct from `D` Future Integration.

## Permanent AI / change-safety rule

Before modifying an existing system, first establish where it lives, who consumes it, what persists, what public/API/SEO/visual behavior depends on it, what tests/fallbacks exist, and whether the change can be incremental and reversible. If any important answer is unknown, **investigate first; do not assume**.

When a future improvement is approved or requested during work on SD.Live, record it in **both this README and the roadmap (`PROJECT_STATUS.md` and/or its detailed companion `ROADMAP_MASTER_CHECKLIST.md`)** before the current documentation checkpoint is closed. Future ideas do not become active work unless explicitly prioritized.

## Current architecture

- **Frontend:** vanilla HTML, CSS and JavaScript.
- **Hosting/runtime:** Cloudflare Workers + Static Assets.
- **Database:** Cloudflare D1 binding `CMS_DB` → `sdlive-cms-production`.
- **Media storage:** Cloudflare R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- **Public media domain:** `media.sdlive.show`.
- **Worker router:** `worker-router.js`.
- **Hero edge renderer / base Worker:** `worker-entry.js`.
- **Trusted By edge renderer:** `trusted-edge.js`, applied by `worker-router.js`.
- **Testimonials edge renderer:** `testimonials-edge.js`, applied by `worker-router.js`.
- **Core Home CMS:** About, Services, International and Selected Work use `core-sections-*` models/APIs/edge binding.
- **Presentation CMS:** Rental and Contact use `home-presentation-*` models/APIs/targeted edge patching.
- **API Worker:** `worker.js` plus section-specific APIs.
- **Visual safeguard layer:** `visual-safeguards.css` + `visual-safeguards.js`, injected on the public Home by `worker-router.js` and controllable/diagnosable from the Editor.
- **Editor Select resilience:** `admin/editor/editor-resilience.js` routes visual Select to the owning CMS section/item and must remain global as the Editor expands.
- **Admin:** `/admin/` behind Cloudflare Access.
- **Analytics:** GTM + GA4 with consent gating.
- **Forms:** Turnstile + D1 + Resend.
- **Languages:** EN / ES with persisted preference and server-side first-paint resolution.
- **Markets:** Colombia / International behavior.

## Source-of-truth matrix

| Concern | Source of truth |
|---|---|
| Code, CSS/JS, critical branding, fallbacks | GitHub `main` |
| Structured CMS Draft/Published content | D1 |
| Public CMS content | D1 `published_json` after validation |
| Editor-managed media binary | R2 |
| Editor-managed media metadata/references | D1 |
| Rental pricing and quote calculation | Backend pricing logic; never presentation CMS copy |
| Public analytics | GA4/GTM after consent |
| Admin access | Cloudflare Access |
| Future CRM / Lead→Quote→Project→Invoice ownership | **TBD until explicitly designed; do not duplicate sources** |

Critical branding such as the primary SD.Live logo, favicon/app icons and essential fallbacks remain versioned with the code. Home CMS-managed media has completed its R2 migration/production-reference verification; intentional GitHub fallback originals remain versioned unless a later reference-aware cleanup explicitly proves they are safe to remove.

## CMS state

### Hero

Hero Draft/Published is fully connected to production. Published content is rendered at the Cloudflare edge before first paint, with static HTML as fallback if D1 is unavailable or invalid.

### Trusted By / Brands Supported Through

**Production milestone completed.** Trusted By has Draft/Published state, ordering, WLive protection, R2 media, placement/scale metadata, server-side Published rendering, Draft isolation, EN/ES stability and production-validated `Save Draft ≠ live` / `Publish = live` semantics.

### Testimonials

**P2.3 completed and validated in production.** Testimonials has D1 Draft/Published/revisions, EN/ES editing, add/delete/reorder, visibility/featured controls, optional R2 logos, edge SSR/fallback and production-validated Draft isolation. The current default schema contains real testimonial content rather than the old pair of balancing mockups.

### About / Services / International / Selected Work

**P2.4 implemented.** These sections use the shared core Home CMS contract with Draft/Published/revisions, validated edge rendering, static fallback and visual editors. About and Work integrate with R2/Media Library for editable media.

### Reusable Media Library

**P2.5 implemented; Home legacy-media closeout completed in P2.8.** The Editor has a reusable R2 Media Library and section bridges. It currently supports folder filtering, search, upload, reuse/copy-reference and delete controls. Reference-aware delete/soft-delete and orphan cleanup remain future hardening. PR #37 retired the temporary Trusted, Testimonials, About/Work and Rental migration scripts/UI after Draft/Published and production R2 references were verified. Media Library, section bridges/controls and critical GitHub/static fallbacks remain intact.

### Rental / Contact

**P2.6 implemented and production-smoked.** Rental presentation copy/media and Contact copy/labels use D1 Draft/Published without taking ownership of transactional logic. Rental pricing, stock behavior, preset composition, cart IDs, quote math and email routing remain system-owned. Rental and Testimonials legacy media migration was validated as Draft-only; Rental cart behavior and Contact/Turnstile remained intact. PR #35 corrected the Rental D1 market key to `col` after the first production smoke exposed the invalid `colombia` value.

### Home media R2 closeout

**P2.8 CLOSED and production-smoked 2026-08-21.** Before cleanup, About, Selected Work, Testimonials, Rental and Trusted/Supported Brands were checked from the public site and their managed images/logos resolved through `media.sdlive.show`. About, Testimonials, Rental and Trusted had no unpublished media change; Selected Work had a saved unpublished Draft, was visually compared with live, published deliberately and finished with the automatic Failsafe green. PR #37 then removed only the four temporary migration scripts/UI and migration-only tests. Post-merge smoke confirmed: migration panels absent, normal Upload/Replace/Media Library controls intact, Global Select intact, Interact intact, Safeguards **9/9 healthy**, and the public About image still resolving through `media.sdlive.show`. Critical static/GitHub fallbacks remain in place. Production merge commit: `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`.

## Global Select invariant

**Select is an Editor contract, not a section-specific convenience.** In Select mode, clicking an editable visual element must route to its owning page/section and the closest exact CMS item, even when another section is currently active. The inspector must open automatically when necessary.

For every new CMS section or page, smoke testing must include:

- Select while already inside that section;
- Select while another section is active;
- exact item routing for cards/collection items;
- correct market/page routing when the content requires it;
- no accidental interaction/navigation while Select mode is active.

**P2.7 is merged and production-smoked.** The implementation extends the existing `editor-resilience.js` rather than creating a parallel Select system. Current Home routing includes Hero, Trusted, About, Services, International, Work, Testimonials, Rental and Contact. Production smoke passed same-section exact-item routing, cross-section routing, non-card Services filter routing and Interact mode. Rental is intentionally absent in the INT preview, so that manual click case is not applicable; automated regression coverage preserves the INT→COL recovery path for a selectable Rental target.

## Visual safeguards / aesthetic invariants

Established production aesthetics are a **site contract**, not incidental CSS. CMS/editor work must preserve them unless a visual change is explicitly approved.

The public Home loads `visual-safeguards.css` + `visual-safeguards.js` after the main styling path. The guard layer protects glass surfaces, aurora ambience, reveal-on-scroll motion, Trusted/Testimonial sheen, Trusted carousel motion, Supported Brand reveal motion and established CTA hover treatments.

The guard registry is deliberately extensible. **Any future CMS/editor change that makes an already-approved aesthetic behavior vulnerable to reconstruction must add that behavior to the guard registry and its regression tests in the same PR.**

The Site Editor exposes a **Safeguards** panel with live diagnostics, per-layer protection state and **Restore all defaults**. Editor toggles affect preview protection only; they are not saved into a content Draft. Production loads the safeguard layer enabled by default.

Automated tests lock guard assets, public injection, Editor controls and critical visual contracts. This visual failsafe does not replace production smoke testing and cannot recover from arbitrary broken JavaScript or a failed deployment.

## R2 media rules

- Bucket: `sdlive-media-production`.
- Storage class: **Standard**.
- Public domain: `https://media.sdlive.show`.
- Public Development URL / `r2.dev`: disabled.
- Admin uploads go through authenticated Worker endpoints.
- Public reads use the custom domain/CDN directly rather than proxying every image through a Worker.
- Upload keys are versioned for long-lived immutable caching.
- Visual resize/position belongs in D1/CSS metadata; moving a slider does not create a new R2 object.
- Do not enable paid media products or extra R2 features unless explicitly approved.
- The four Home legacy-media migrators were retired in P2.8 after production-reference verification; they are not permanent Editor UX and should not be restored without a new migration need.
- **Do not equate migrator retirement with deleting fallback assets.** Duplicate/original GitHub assets may only be removed through a separate reference-aware cleanup after critical fallbacks and all consumers are proven safe.

## Back-office reality

The Site Editor/CMS and reusable Media Library are live. Dashboard modules labelled Leads/CRM, Rental Admin, Projects, Calendar, Analytics and SEO remain planned/disabled unless `PROJECT_STATUS.md` explicitly marks a component implemented. Public Rental/forms and existing D1 data are not equivalent to a complete Rental Admin or CRM.

This distinction is mandatory for coding agents: **do not infer implementation from labels, future diagrams or prompts. Evidence is required.**

## Approved future improvements register

These requirements are preserved but are **not active work until explicitly prioritized**. The detailed status/subtasks live in `ROADMAP_MASTER_CHECKLIST.md`.

### Site Editor / layout

- Drag & drop, generic reorder, snap-to-grid, card/block resize, spacing/gap/padding/alignment, independent Desktop/Mobile layout, show/hide by device/market, Undo/Redo, revision rollback, full-page Draft, templates, hidden-staging access, duplicate/create blocks, autosave Draft, change comparison, scheduled Publish/visibility, shortcuts and Draft share/preview links.
- Header visual management: reorder/spacing, link targets, scroll offsets, menu items, Show Day/Live Mode/WhatsApp visibility and contextual header presets.
- Floating-control positioning, page/device visibility, ordering and iPhone safe-area preview.

### Media / content systems

- R2 Media Library hardening: reference-safe delete/soft-delete, unused-media detection, richer tags, Library-level alt metadata, crop/focal point, optional automatic WebP/AVIF only if justified, OG/social image management and later reference-aware cleanup of duplicate originals/fallbacks where proven safe.
- Portfolio/Selected Work deeper model: Highlight Projects, credits, role, client, year, tags, featured/hidden, video, filters, case studies, before/after and authorized QLab/audio/video examples.
- Raw vs Mixed: real audio pairs, Admin management, waveform, sample-accurate switching if justified and multiple examples.
- Remaining hidden/staging content should be audited and moved into real CMS/templates only when content/scope is approved; Testimonials are already a real CMS and Sound for Picture must not be published merely because placeholder markup exists.

### Rental / Contact

- **Rental compatibility recommendations:** WING should recommend the appropriate Midas DL32 stagebox; LV1 Classic should recommend StageGrid 4000. Exact UX must be approved and equipment must never be silently auto-added.
- **Rental item creation + pricing rules:** future Rental Admin can add items and validated fixed/per-day/multi-day/quantity/pair/bundle/conditional pricing rules while the backend remains the source of truth.
- Make Rental unmistakably a **request for quotation, not checkout**, to reduce lead abandonment.
- Equipment Rental service card → `#rental` with a deliberate INT fallback/behavior.
- Inventory/calendar availability and double-booking prevention, PDF quote/validity/approval, delivery/logistics and future CRM relationship.
- Contact automatic visitor confirmation email is optional future work; Turnstile/D1/direct backend/email notification already exist. Explicit rate limiting remains security backlog.

### Business back-office

- CRM pipeline, clients/contacts/companies, notes/history/source and Lead → Quote → Project → Invoice.
- AppSheet integration only after per-field source-of-truth is defined.
- Automatic Show Day from Calendar/AppSheet with configurable window and manual override.
- Admin Calendar, Projects, quote automation, native Workspace Inbox and correct-alias replies.
- Private recruiter/client Portfolio/CV variants with noindex/share controls.
- Business analytics/Data Studio/Looker or hybrid only when reliable source data exists.
- Settings module, Admin audit log, backups/export, rollback, activity/automation center, Client Portal, generic share links, role-based access, Admin PWA, QR generator and UTM/link builder are future/optional capabilities.

### Analytics / SEO / acquisition

- GA4/GTM base and `generate_lead`/WhatsApp/Email validation already exist. Remaining integrity work includes internal-traffic separation, explicit duplicate-firing proof if not closed, Key Event hygiene and downstream funnel attribution once CRM stages exist.
- Permanent analytics rule: **observe → test → confirm → correct → retest**. Do not edit GTM solely because normal traffic is absent from DebugView; use Realtime for live traffic validation.
- Final Colombia/international SEO audit, Core Web Vitals, internal linking, alt/media audit, Search Console/Bing/index coverage and future SEO controls in Admin.
- Candidate queries such as `alquiler sonido bogota`, `sonido eventos corporativos bogota`, `alquiler consolas bogota` and `behringer wing bogota` require real-offer/intention/URL-overlap research before any page is created.
- Audit public landing visual consistency, EN/ES/hreflang/COL-INT behavior, orphan pages and future Show Day behavior across pages.
- Analyze acquisition channels by ROI/audience: social/LinkedIn, referrals/partners, targeted outreach, tutorials/training and podcast only if a credible distribution/business case exists.
- Restore Journal/Insights only with real editorial value: professional-audio insights, AV briefs for marketing teams, technical education and responsible Suno/AI/audio-production analysis. No mass AI filler.
- **Technical Audio Training** is an approved backlog service concept: define curriculum, audience, delivery, market, capacity, evidence and pricing before publishing.

### Platform / quality / security

- Code cleanup/optimization is a quality stream: audit and refactor incrementally with tests, smoke and rollback; never change approved behavior just for elegance.
- COL vs INT needs an explicit full production audit and ideally a privacy-respecting Admin diagnosis of detected market/reason.
- Worker/D1/R2/publish/deploy/error observability, backups, threshold warnings and safe media cleanup.
- Security hardening: verifiable rate limiting, CSP/Referrer-Policy/Permissions-Policy, abuse testing and incident/backup discipline.
- Evaluate Cloudflare free-vs-paid security capabilities against actual SD.Live risk before enabling recurring-cost products.
- Main public contact config uses `hello@sdlive.show` and Rental uses `rental@sdlive.show`; perform a final stale-personal-email audit and verify Workspace aliases/DMARC before automation.

## SEO / content safety rules

The intended sequence is:

**real offering → useful page → SEO**

Never invert it into:

**keyword → artificial page → generated filler**.

Do not infer commercial intent from a single keyword. Before creating an SEO page, establish the real service, operator/capability, market, operational capacity, evidence/portfolio, CTA, search intent and whether an existing URL already satisfies that intent. If no real offer exists behind the page, **do not create it**.

Do not create mass service/product/project/article pages merely to fill a sitemap or chase keywords.

## Competitive / benchmark references

These sites are **learning references only**. They are never templates or requirements, and SD.Live must not copy their design, copy, images or branding. When a future design/structure decision materially relates to these references, consult the live references first and ask before adopting a comparable pattern.

- `https://www.mediacoustix.com/` — professional authority, service framing, storytelling and SEO learning.
- `https://www.aerislatam.com` — engineering, case studies, projects and integration learning.
- `https://www.adlib.co.uk` — case studies, production, rental and technical documentation learning.
- `https://www.cohesionaudio.com` — technical projects and equipment-association learning.
- `https://www.worldtouraudio.com` — rental, staffing and engineering learning.
- `https://wonderlust.live/` — interaction/brand-expression reference; consult before related visual/structural changes.
- `https://www.wlive.co` — brand/context reference; WLive also remains valid visible SD.Live content.

## Future evolution roadmap

`PROJECT_STATUS.md` contains the classified **Future Evolution — SD.Live 2.0** roadmap. `ROADMAP_MASTER_CHECKLIST.md` preserves the complete reconciled historical backlog and explicitly marks what is already done versus partial/pending.

Those items are **future integrations/backlog, not immediate instructions**, unless explicitly promoted to **F — Active Gate**. The roadmap also records deferred/not-recommended ideas such as full rewrites, mass AI content, doorway/location pages, duplicate pricing/CMS systems and copying competitor design/branding.

## Important files

- `index.html` — main public Home shell and static fallback content.
- `styles.css` — main public styles.
- `visual-safeguards.css` / `visual-safeguards.js` — self-healing baseline for established visual contracts.
- `script.js` — primary public UI/runtime behavior and Rental client-side behavior.
- `worker-router.js` — top-level Worker router and section SSR/API routing.
- `worker-entry.js` — Hero edge rendering and base routing.
- `worker.js` — base CMS/admin APIs, Contact, Rental, D1 and email logic.
- `core-sections-content.js` / `core-sections-api.js` / `core-sections-edge.js` — About/Services/Work/International CMS.
- `home-presentation-content.js` / `home-presentation-api.js` / `home-presentation-edge.js` — Rental/Contact presentation CMS.
- `trusted-edge.js`, `trusted-api.js`, `trusted-content.js` — Trusted CMS.
- `testimonials-edge.js`, `testimonials-api.js`, `testimonials-content.js` — Testimonials CMS.
- `media-api.js` / `admin/editor/media-library.js` — authenticated R2 media and reusable Media Library.
- `admin/editor/editor-resilience.js` — global Select routing/resilience layer.
- `admin/editor/automatic-failsafe.js` — automatic publish verification.
- `admin/editor/visual-safeguards-editor.js` — visual diagnostics/restore panel.
- `PROJECT_STATUS.md` — operational current state, active gate, evidence and roadmap policy.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled historical/future feature inventory; preservation layer, not automatic work authorization.

## Critical routes / endpoints

Public:

- `/`
- `/en/`
- `/es-co/`
- `/theatre-sound-design-audio-post`
- `/privacy`
- SEO/service/rental landings in the repository

API includes:

- `GET /api/health`
- `GET /api/content/hero`
- `GET /api/content/trusted`
- `GET /api/content/testimonials`
- core/presentation public content endpoints
- Admin content endpoints under `/api/admin/...`
- Admin media endpoints under `/api/admin/media/...`
- `POST /api/contact`
- `POST /api/rental`

## Operational invariants

- Brand spelling is exactly **SD.Live**.
- Descriptor is **Creative Audio**.
- Canonical tagline: **Creative Audio. Technical systems. Built for the show.**
- Visible `SD.Live` mentions should use the floating-dot wordmark when appropriate; metadata/machine strings stay literal.
- WLive remains visible.
- **Stability > novelty.** Preserve and extend working architecture by default.
- Established production aesthetics are protected visual contracts.
- Global Select must route to the owning CMS section/item and is part of every CMS smoke test.
- Rental is Colombia-first and hidden by default for International visitors.
- Rental notifications go **only to `rental@sdlive.show`**.
- General Contact notifications go to `hello@sdlive.show`.
- Rental pricing is server-side/backend-owned.
- Cloudflare Access is the real Admin access layer.
- GTM is for consent/analytics/events, not navigation, branding or layout.
- GitHub is source-of-truth for code; D1 for structured CMS content; R2 for editor-managed media.
- Do not restore Netlify, the old Owner Access mockup, `site-runtime`, or GTM-driven navigation.
- Do not replace a working implementation because a future vision describes a different architecture.
- Unknown implementation details must be investigated, never invented.

## Tests

```text
npm test
```

The test suite uses Node's built-in test runner and GitHub Actions runs it on pull requests and `main`.

## Development workflow

```text
main
  ↓
short-lived feature/fix/docs branch
  ↓
Pull Request
  ↓
CI + deploy validation
  ↓
Squash and merge
  ↓
production smoke test
  ↓
close milestone/update evidence
```

Do not treat a feature-branch deployment as production. `sdlive.show` represents the active `main` deployment unless Cloudflare explicitly exposes a preview URL.

After a material milestone, update `PROJECT_STATUS.md`, this README and, when the backlog itself changes, `ROADMAP_MASTER_CHECKLIST.md`. A future improvement may be bundled into the active block's documentation update rather than causing a separate deployment, but it must not be lost.

## Current gate status

**No feature gate is active after P2.8 closeout.**

P2.8 — Home CMS media-migrator retirement — is closed on production:

- PR #37 squash-merged to `main` at `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`;
- PR CI passed after stale migration-specific assertions were updated to the new permanent-state contract;
- Editor smoke: no temporary `R2 migration` panel, normal Media Library/Upload/Replace intact;
- Global Select and Interact mode remain normal;
- Safeguards `Run check` reports **9/9 healthy**;
- public About media still resolves via `media.sdlive.show` after cleanup;
- critical static/GitHub fallbacks were not removed.

The next implementation must be chosen deliberately from `ROADMAP_MASTER_CHECKLIST.md` and explicitly promoted to **F — Active Gate** before code changes begin. Sound for Picture remains inert staging until real content/scope is explicitly approved.
