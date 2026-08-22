# SD.Live

Production website and back-office for **SD.Live — Creative Audio**.

Production: `https://sdlive.show`  
Public media: `https://media.sdlive.show`

Operational documentation dates use **America/Bogota** unless a timestamp is explicitly labelled UTC. GitHub API timestamps may cross the calendar-day boundary relative to Bogotá. Do not conflate the live `main` HEAD with the **runtime production baseline**: documentation-only commits may advance `main` without changing deployed runtime behavior. Query GitHub for the current HEAD when resuming work instead of treating a hard-coded docs SHA as perpetual HEAD.

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
- **VISION** — strategic direction, not an implementation commitment.

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

**First-paint / anti-popping invariant:** the public Home must not visibly paint stale static CMS copy and then replace it with Published content. Edge SSR is the preferred path; the existing client hydration path remains a resilience fallback for non-SSR/static shells and Admin isolation. Performance work may skip redundant `hero-content.js` / `cms-hydration.js` loading when `data-server-rendered="true"`, but must not delete the fallback, blank the document to hide transitions, or reintroduce static→CMS flash/popping.

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

**P2.8 CLOSED and production-smoked 2026-08-21.** Before cleanup, About, Selected Work, Testimonials, Rental and Trusted/Supported Brands were checked from the public site and their managed images/logos resolved through `media.sdlive.show`. About, Testimonials, Rental and Trusted had no unpublished media change; Selected Work had a saved unpublished Draft, was visually compared with live, published deliberately and finished with the automatic Failsafe green. PR #37 then removed only the four temporary migration scripts/UI and migration-only tests. Post-merge smoke confirmed: migration panels absent, normal Upload/Replace/Media Library controls intact, Global Select intact, Interact intact, Safeguards **9/9 healthy**, and the public About image still resolving through `media.sdlive.show`. Critical static/GitHub fallbacks remain in place. Runtime production baseline commit after P2.8: `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`.

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

These requirements are preserved but are **not active work until explicitly prioritized**. The detailed status/subtasks live in `ROADMAP_MASTER_CHECKLIST.md` and dedicated roadmap specs where linked.

### Site Editor / layout

- Drag & drop, generic reorder, snap-to-grid, card/block resize, spacing/gap/padding/alignment, independent Desktop/Mobile layout, show/hide by device/market, Undo/Redo, revision rollback, full-page Draft, templates, hidden-staging access, duplicate/create blocks, autosave Draft, change comparison, scheduled Publish/visibility, shortcuts and Draft share/preview links.
- Header visual management: reorder/spacing, link targets, scroll offsets, menu items, Show Day/Live Mode/WhatsApp visibility and contextual header presets.
- Floating-control positioning, page/device visibility, ordering and iPhone safe-area preview.
- **Hash/scroll-restoration polish:** refreshing a Home URL that retains `#rental` can visibly pass through top → Rental → the browser-restored prior scroll position because `initMarket()` currently forces `scrollIntoView()` while the browser restores history. Fix separately without hiding the document, disabling native restoration globally, or harming LCP. Safari can additionally show a brief native top→restored-position flash without a hash; treat that separately from CMS content popping.

### Media / content systems

- R2 Media Library hardening: reference-safe delete/soft-delete, unused-media detection, richer tags, Library-level alt metadata, crop/focal point, optional automatic WebP/AVIF only if justified, OG/social image management and later reference-aware cleanup of duplicate originals/fallbacks where proven safe.
- Portfolio/Selected Work deeper model: Highlight Projects, credits, role, client, year, tags, featured/hidden, video, filters, case studies, before/after and authorized QLab/audio/video examples.
- Raw vs Mixed: real audio pairs, Admin management, waveform, sample-accurate switching if justified and multiple examples.
- Remaining hidden/staging content should be audited and moved into real CMS/templates only when content/scope is approved; Testimonials are already a real CMS and Sound for Picture must not be published merely because placeholder markup exists.
- **Optional background removal during CMS upload:** evaluate `remove.bg` API integration (`https://www.remove.bg/api#remove-background`) so an authenticated Editor upload can ask whether to remove the background. This must be opt-in per image, keep API credentials server-side, preserve/identify the original, respect R2 versioning/fallbacks, surface third-party failure cleanly and verify current pricing/credits/privacy/file limits before implementation. Never remove a background silently.

### Rental / Contact

- **Rental compatibility recommendations:** WING should recommend the appropriate Midas DL32 stagebox; LV1 Classic should recommend StageGrid 4000. Exact UX must be approved and equipment must never be silently auto-added.
- **Rental item creation + pricing rules:** future Rental Admin can add items and validated fixed/per-day/multi-day/quantity/pair/bundle/conditional pricing rules while the backend remains the source of truth.
- Make Rental unmistakably a **request for quotation, not checkout**, to reduce lead abandonment.
- Equipment Rental service card → `#rental` with a deliberate INT fallback/behavior.
- Inventory/calendar availability and double-booking prevention, PDF quote/validity/approval, delivery/logistics and future CRM relationship.
- Contact automatic visitor confirmation email is optional future work; Turnstile/D1/direct backend/email notification already exist. Explicit rate limiting remains security backlog.

### Business back-office / professional identity

- CRM pipeline, clients/contacts/companies, notes/history/source and Lead → Quote → Project → Invoice.
- AppSheet integration only after per-field source-of-truth is defined.
- Automatic Show Day from Calendar/AppSheet with configurable window and manual override.
- Admin Calendar, Projects, quote automation, native Workspace Inbox and correct-alias replies.
- Private recruiter/client Portfolio/CV variants with noindex/share controls.
- **Editable HTML CV:** create a canonical CV/resume in HTML that is visually and editorially coherent with SD.Live, easy to maintain, responsive/print-friendly and suitable for controlled PDF export or application-specific variants. Do not make it public/indexable by default without a deliberate publishing decision.
- **Legacy personal-site coherence audit:** review `https://samueldavidllano.carrd.co` against current SD.Live positioning, bio, services, links, visual identity and calls to action; decide deliberately what should remain, be updated, redirect, or be retired so both public identities do not contradict each other.
- Business analytics/Data Studio/Looker or hybrid only when reliable source data exists.
- Settings module, Admin audit log, backups/export, rollback, activity/automation center, Client Portal, generic share links, role-based access, Admin PWA, QR generator and UTM/link builder are future/optional capabilities.

### AI / conversational integrations

- **Availability-Aware Contact Widget — Medium-High backlog:** after the current active gate closes and is explicitly reprioritized, resolve owner availability server-side from one D1 `availability_state` source of truth using expiring manual override → travel mode → default `America/Bogota` weekly schedule. Owner WhatsApp commands must require exact `env.OWNER_WHATSAPP_NUMBER`; unavailable state may swap the existing WhatsApp bubble for a future lead-qualification AI widget. The bot must never own or invent pricing/catalog data and must write leads into the existing `leads` table. Full proposed scope and acceptance criteria: `docs/roadmap/availability-aware-contact-widget.md`.
- **Dapta.ai candidate assistant:** evaluate a future SD.Live website assistant using `https://dapta.ai`. Before implementation, re-verify the provider's current free/paid limits, embed/API capabilities, privacy/data processing, branding constraints and operational reliability. The assistant may guide visitors toward Services, Contact and Rental, but must never invent pricing, availability, project claims or technical capability; deterministic site/backend sources remain authoritative and human handoff must stay available.

### Performance / edge caching

- **Verified current condition:** `worker-entry.js::transformHomeResponse()` explicitly sets `Cache-Control: no-store` on the public root HTML while the Home performs CMS reads and HTMLRewriter rendering per request. This is a legitimate future performance opportunity, not an instruction to change headers blindly.
- P3.0 lab evidence showed Home TTFB around **10 ms** in Lighthouse while Mobile LCP remained poor, so cache is **not the primary demonstrated cause of the current mobile LCP**. Keep cache optimization evidence-driven and subordinate to the critical-rendering/image work unless later measurements change that conclusion.
- Evaluate a short shared-cache strategy (for example a bounded TTL with `stale-while-revalidate`) versus publish-triggered selective invalidation/purge. Measure real TTFB/D1 impact before and after.
- Any cache design must preserve correct EN/ES behavior, the existing `Vary: Accept-Language, Cookie` contract, COL/INT behavior, Admin preview isolation, automatic publish failsafe semantics, Draft ≠ Published, and immediate-enough Publish behavior. Do not cache authenticated/admin responses or create a stale-content correctness regression.
- Treat active Publish invalidation as the more robust long-term option only after the exact Cloudflare cache/purge mechanism, cost, keys/variants and rollback path are proven. `no-store` remains the safe baseline until that design is approved.
- **IndexNow / Cloudflare Crawler Hints:** Bing showed no existing IndexNow configuration and Cloudflare Crawler Hints is currently OFF. Evaluate Crawler Hints together with the future Home cache/invalidation design rather than adding a parallel manual IndexNow key/API now. Re-check current Cloudflare/Bing behavior at implementation time.

### Analytics / SEO / acquisition

- GA4/GTM base and `generate_lead`/WhatsApp/Email validation already exist. Remaining integrity work includes internal-traffic separation, explicit duplicate-firing proof if not closed, Key Event hygiene and downstream funnel attribution once CRM stages exist.
- Permanent analytics rule: **observe → test → confirm → correct → retest**. Do not edit GTM solely because normal traffic is absent from DebugView; use Realtime for live traffic validation.
- P3.0 external audit completed across Google Search Console, Bing Webmaster/Site Scan and PageSpeed/Lighthouse. Sitemap discovery is healthy on both engines; Google had **6/7 URLs indexed** at audit time and the remaining Bogotá services landing passed Live Test and was submitted for indexing. Bing knew/submitted all 7 URLs but had not populated aggregate Site Explorer/indexed coverage yet; Live URL tests passed on tested pages and Site Scan completed **7/7 pages, 0 errors**.
- **Bing follow-up required:** re-check Bing indexation/coverage after a reasonable processing window, target **7–14 days after the 2026-08-21 audit** (roughly 2026-08-28 through 2026-09-04) before treating the current “discovered/not yet crawled / no Site Explorer data” state as a technical problem. Do not repeatedly re-submit the same URLs in the meantime unless new evidence appears.
- Bing's single Site Scan warning for “missing alt” was reviewed as **non-actionable**: the 7 instances are intentionally empty `alt=""` on decorative/aria-hidden images (six header-logo animation fragments plus the mirrored second PA image). Do not add redundant alt text merely to silence the scanner.
- Final Colombia/international SEO audit, Core Web Vitals, internal linking, Search Console/Bing index coverage and future SEO controls in Admin remain ongoing quality streams; do not call CWV a field failure while Search Console lacks sufficient CrUX data.
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

## P3.0 audit closeout — 2026-08-21 America/Bogota

P3.0 is **closed as an evidence/audit gate**. The audit did not uncover a general routing, HTTPS, sitemap or search-engine block, but it did produce a prioritized correction queue.

**P0 confirmed in production at audit time:**

- Consent Mode/default-denied contract was present on Home but missing from other public HTML pages that loaded GTM directly; **closed in P3.1**.
- Hidden `#contentStaging` placeholder copy was present in the public/indexable Home HTML response despite being visually hidden; **closed in P3.2 at the public response layer while preserving the Admin/static staging source**.

**P1 / high-value findings:**

- Mobile Lighthouse performance is reproducibly weak under throttled lab conditions (61/66 in two runs) while Desktop was 96; Mobile LCP is the Hero `<h1>`, with render delay dominating and TTFB around 10 ms.
- Image delivery has roughly 1.4 MB estimated savings; oversized header PNGs and large R2 logos/images should be solved through responsive variants/`srcset`/pipeline, not manual one-off compression.
- Accessibility score was 89: consent-banner semantics/name, Turnstile ARIA compatibility, localized contrast fixes and footer heading order are actionable.
- EN Work CTA currently leads to a Spanish landing; WhatsApp is absent from public landings; Rental permits an empty request and should read unmistakably as RFQ rather than checkout; pricing copy duplicates backend-owned rates and needs drift protection, not a second pricing engine.

**P2 / maintenance findings:** static sitemap `lastmod`, public `deploy-test.txt`, and experimental Agentic Browsing diagnostics.

Search-engine state and the Bing follow-up are recorded in the SEO/acquisition register above and in the master roadmap.

## P3.1 + P3.2 production closeout — 2026-08-21 America/Bogota

Both P0 corrections raised by P3.0 are **closed and production-smoked**.

**P3.1 — Consent Mode parity:** PR #41 added the existing `analytics-consent.js` bootstrap before GTM on every current public GTM page that was missing it and added regression coverage for future HTML pages. Squash merge: `2d7a934d776c1af1ffcaaf847afab7c6fa55d91d`. Production smoke passed: a fresh private `/en/` visit showed the consent banner; **Necessary only** persisted after reload and across Theatre; a fresh private `/es-co/` visit showed the Spanish banner; **Permitir analítica** persisted after reload and across Rental; the 404 respected the saved choice.

**P3.2 — Public staging strip:** PR #42 removes `#contentStaging` only from the transformed public Home response while leaving `index.html` staging intact for the isolated Admin preview. Squash merge/runtime baseline: `d4e3a28140664b96fc5d74578cef0442baa1a191`. Production View Source returned no `Future picture project` and no `contentStaging`; `/admin/editor/` continued loading normally and Safeguards `Run check` remained **9/9 healthy**. Sound for Picture remains unpublished/inert staging.

Current runtime production baseline after these P0 closeouts: **`d4e3a28140664b96fc5d74578cef0442baa1a191`**.

## P3.3 production closeout — 2026-08-22 America/Bogota

**P3.3 — Mobile critical rendering path is CLOSED as an evidence-driven optimization gate.** The goal was not to chase a Lighthouse score at any cost; it was to remove proven redundant work while preserving privacy, server-resolved language, CMS first-paint correctness and established visual behavior.

- The first experiment (PR #44) moved `site-consistency.css` and `visual-safeguards.css` out of the blocking path. Two-run measurement showed no attributable benefit, so it was reverted through PR #45 rather than accumulating complexity.
- PR #46, squash merge `d52ca8d80c4e9fd3caa5f6be1aaae423e00c0840`, stops `home-navigation.js` from importing `hero-content.js` → `cms-hydration.js` when the Hero already has `data-server-rendered="true"`. The fallback remains intact for static/non-edge shells and Admin isolation. Production smoke showed no CMS content popping, and the redundant hydration chain disappeared from the public SSR Home dependency tree.
- Historical reason for `cms-hydration.js`: it protects against the earlier static→CMS replacement flash/popping. **Do not delete this fallback merely because SSR can skip it on the normal public path.** Any future rendering optimization must test cold-load/reload for stale-content flash, Hero blanking and page popping.
- PR #47, squash merge `49d09a8598d0a4c3c42de7b1dedacf763a26a91b`, keeps a tiny Consent Mode `default: denied` bootstrap synchronous before GTM on public `/`, while deferring the full existing consent manager/UI. Banner presence and Necessary-only persistence passed production smoke; `analytics-consent.js` disappeared from Lighthouse render blockers.
- P3.0 Mobile baseline was 61/66 Performance with LCP 14.8/10.2 s. The final two post-#47 runs were **75 / LCP 5.4 s** and **73 / LCP 6.0 s**, with FCP 2.7 s in both and Hero element render delay about **810/670 ms**. Lighthouse remains variable, so preserve these as lab evidence rather than field-CWV claims.
- TTFB remained around 10 ms in LCP breakdowns, reinforcing that Home `no-store` caching is not the demonstrated primary LCP cause.
- The remaining repeated high-value opportunity is responsive image delivery (~1.4 MB estimated savings); that belongs to the separate P3.4 gate rather than being mixed into P3.3.
- Separate navigation polish discovered during smoke: refresh with retained `#rental` can race our explicit `scrollIntoView()` against browser history restoration, producing top → Rental → prior position. This is **not CMS popping** and must be fixed independently without document blanking or LCP regression.

Runtime production baseline after the accepted P3.3 changes: **`49d09a8598d0a4c3c42de7b1dedacf763a26a91b`**.

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
- `docs/roadmap/availability-aware-contact-widget.md` — proposed Medium-High availability-aware WhatsApp/AI contact roadmap item; backlog, not active by existence alone.
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
- Public CMS first paint must not reintroduce static→Published flash/popping; SSR may skip redundant hydration but fallback resilience remains required.
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

**P3.0 Public Production Integrity + Commercial/SEO Audit, P3.1 Consent Mode parity, P3.2 public staging strip and P3.3 Mobile critical rendering path are CLOSED and production-smoked/evidenced.**

- **P3.1 — Consent Mode parity:** CLOSED via PR #41 / `2d7a934d...`; consent default-denied/bootstrap precedes GTM across the current public GTM page set, with private-session EN/ES/Rental/404 smoke passing.
- **P3.2 — public Home staging strip:** CLOSED via PR #42 / `d4e3a281...`; public View Source no longer exposes `contentStaging`/`Future picture project`, while Admin preview remains normal and Safeguards stays 9/9 healthy.
- **P3.3 — Mobile critical rendering path:** CLOSED via measured/reversible experiments. PR #46 skips redundant Hero hydration only when SSR is already authoritative; PR #47 defers the full Home consent UI after a synchronous default-denied bootstrap. Final post-#47 Mobile runs were 75/LCP 5.4 s and 73/LCP 6.0 s with no CMS content popping.

The next narrow gate is **F — P3.4 Responsive image/media delivery pipeline**, focused on the repeated ~1.4 MB Mobile image-delivery opportunity through variants/`srcset`/`sizes` while preserving masters and current CMS/R2 ownership. Do not solve it by manually compressing assets one by one.

The **Availability-Aware Contact Widget** is a **Medium-High backlog item after the current active gate**, above general CRM/calendar/quote-automation backlog work, and is not part of P3.4. See `docs/roadmap/availability-aware-contact-widget.md`.

The Bing indexation recheck remains required for **2026-08-28 through 2026-09-04**. Do not repeatedly resubmit the same URLs before that window without new evidence.

The future Carrd coherence audit, editable HTML CV, Dapta.ai assistant, remove.bg upload option, Home cache optimization and Cloudflare Crawler Hints/IndexNow remain backlog/future integrations and are **not automatically part of P3.4**. Sound for Picture remains inert staging until real content/scope is explicitly approved.