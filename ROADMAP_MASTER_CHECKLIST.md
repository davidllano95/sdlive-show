# SD.Live — Master Backlog Reconciliation

> **Purpose:** preserve the complete historical/future feature checklist without turning old notes into automatic work. This file is a companion to `PROJECT_STATUS.md`, not a replacement for Current State, Active Gate or architectural invariants.
>
> **Authority:** code + verified production behavior → schema/config → `PROJECT_STATUS.md` → `README.md` → this reconciliation / prompts / benchmark notes.
>
> **Rule:** a checked item here means evidence exists elsewhere in the repo/production. A pending item remains backlog/future work unless `PROJECT_STATUS.md` explicitly promotes it to **F — Active Gate / Approved Work**.

Last reconciliation: **2026-08-21 — America/Bogota**  
Runtime production baseline checked against: `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`; P2.8 Home media closeout is production-smoked and closed. P3.0 public/SEO/performance audit is now closed as an evidence checkpoint. Query GitHub live for the current `main` HEAD because docs-only commits may advance HEAD without changing the runtime baseline.

## Legend

- ✅ **A / done:** implemented and evidenced.
- 🟡 **B / partial:** useful implementation exists; remaining scope is listed.
- ⏳ **D / backlog/future:** wanted/documented, not active merely because it appears here.
- 🚧 **F / active gate:** explicitly approved current work in `PROJECT_STATUS.md`.
- ❓ **UNKNOWN:** must be investigated; never assume.

## Current Active Gate

🚧 **F — P3.1 Consent Mode parity across every public GTM page.** Reuse the existing Home `analytics-consent.js`/default-denied contract and extend it to every public HTML surface that loads GTM. The contract must be established before GTM, must not create a second consent system, and must receive automated coverage plus private-window production smoke. **P3.2** is the next P0 candidate: strip hidden staging/placeholder markup from the public Home response while preserving static/Admin preview source.

---

## 1. Base actual

**Status: ✅ A — operating baseline.**

- ✅ `/admin/` Dashboard.
- ✅ `/admin/editor/` Site Editor.
- ✅ Dashboard/Editor navigation shell and Admin V6.4 baseline.
- ✅ Cloudflare Access as real Admin barrier; Workspace identity is external configuration.
- ✅ Worker JWT validation.
- ✅ D1 connected.
- ✅ Hero Draft / Published / revision history.
- ✅ COL / INT preview.
- ✅ EN / ES.
- ✅ Desktop / Mobile.
- ✅ Select / Interact.
- ✅ Collapsible left/right panels + Focus Mode.
- ✅ SD.Live visible wordmark treatment with floating dot where appropriate.
- ✅ Tests/CI, Visual Safeguards and automatic publish failsafe are now also part of the baseline.

Do not rebuild this base from scratch.

## 2. Finish the visual CMS / Site Editor

**Status: 🟡 B overall; Global Select is now ✅ A.**

Already implemented:

- ✅ Published CMS is connected to the public Home for Hero, Trusted, Testimonials, About, Services, International, Selected Work, Rental presentation and Contact presentation according to each section's scope.
- ✅ Draft / Published / revisions extend beyond Hero to the current CMS-owned Home sections.
- ✅ Global Select cross-section/page-aware routing is merged in PR #36 and production-smoked for same-section exact item, cross-section routing, non-card control routing and Interact mode. Rental INT manual click is N/A because Rental is hidden by design; regression coverage retains INT→COL recovery for a selectable target.
- ✅ Reorder exists in several collection editors (Trusted, Testimonials, Services/Work where implemented), but not yet as one generic layout system.
- ✅ Media scale controls exist for applicable images/logos; this is not generic card/block resize.

Still pending / future:

- ⏳ Drag & drop.
- ⏳ Generic card/block reordering where a section does not already own ordering.
- ⏳ Snap-to-grid.
- ⏳ Resize of cards/blocks/layout boxes.
- ⏳ Visual spacing / gap / padding / alignment controls.
- ⏳ Independent Desktop/Mobile layout configuration.
- ⏳ Show/Hide by device.
- ⏳ Show/Hide by COL/INT as a generic Editor capability.
- ⏳ Undo / Redo.
- ⏳ Revision rollback from UI.
- ⏳ Full-page Draft transaction/state rather than only section-scoped Drafts.
- ⏳ Template Library.
- ⏳ Editor access to useful hidden/staging mockups that remain in code.
- ⏳ Duplicate blocks/cards.
- ⏳ Create blocks from approved templates.
- ⏳ Autosave Draft without auto-Publish.
- ⏳ Change comparison before Publish.
- ⏳ Scheduled Publish / scheduled visibility.
- ⏳ Keyboard shortcuts.
- ⏳ Draft preview/share links.

## 3. Header and visual navigation

**Status: ⏳ D.**

- ⏳ Reorder header elements.
- ⏳ Configure spacing among logo, nav, languages, Show Day/Live Mode and other controls.
- ⏳ Show/hide header buttons and CTAs.
- ⏳ Show/hide Show Day / Live Mode.
- ⏳ Show/hide WhatsApp.
- ⏳ Desktop/Mobile-specific behavior.
- ⏳ Configure destination for each nav link.
- ⏳ Per-link scroll offset / landing position.
- ⏳ Add/remove menu items from Admin.
- ⏳ Premium/context presets such as Normal / Show Day / Minimal.

## 4. Floating buttons and controls

**Status: ⏳ D.**

- ⏳ Move WhatsApp, Rental/cart, Show Day/Live controls and Back to Top.
- ⏳ Independent Mobile position.
- ⏳ Bottom/side offsets.
- ⏳ Reordering when several controls coexist.
- ⏳ Show/Hide by page/market/device.
- ⏳ iPhone safe-area preview to avoid notch/home-indicator conflicts.
- ⏳ **P3.0 finding:** public landings do not consistently include the Home WhatsApp CTA. Add it as a shared conversion-consistency improvement when promoted, preserving destination/tracking/safe-area behavior.

## 5. Media Library + Cloudflare R2

**Status: ✅/🟡 A/B — core library exists; Home migration/closeout is verified and P2.8 is closed; advanced DAM remains future work.**

Already implemented / verified:

- ✅ R2 bucket `sdlive-media-production`.
- ✅ `media.sdlive.show` custom domain.
- ✅ Authenticated image upload.
- ✅ Reusable Media Library panel.
- ✅ Folders/categories in the current library.
- ✅ Search by file/key.
- ✅ Reuse existing assets via `Use`/logical refs.
- ✅ Delete control exists; safe reference/soft-delete policy still needs hardening before large-scale cleanup.
- ✅ Trusted/Supported Brand logos.
- ✅ Testimonials logo media.
- ✅ About and Selected Work bridges.
- ✅ Rental equipment imagery.
- ✅ PNG/JPEG/WebP upload; no automatic transcoding pipeline yet.
- ✅ Saved Draft checks confirmed R2 media for About, Selected Work, Testimonials, Rental and Trusted.
- ✅ Public production checks confirmed managed media for those same Home areas resolves via `media.sdlive.show`.
- ✅ Selected Work's saved unpublished Draft was visually compared with live, published deliberately and passed the automatic Failsafe.
- ✅ **P2.8 closed:** the four temporary Home legacy-media migrator scripts/loaders and migration-only tests were retired in PR #37; Media Library, section bridges/controls and all critical GitHub/static fallbacks were preserved. CI passed and post-merge production smoke confirmed Editor, Select/Interact, Safeguards 9/9 and R2 media remained healthy.

Still pending / future:

- ⏳ OG/social images as first-class CMS media.
- ⏳ Rich tags beyond current folder model.
- ⏳ Alt-text metadata at Library level (section editors already expose alt where applicable).
- ⏳ Crop / focal point.
- ⏳ **Responsive delivery pipeline:** P3.0 Lighthouse found roughly 1.4 MB image-delivery savings on Mobile. Generate appropriate variants (for example small/medium/large widths as evidence supports), use `srcset`/`sizes`, and preserve original/master media; do not optimize manually image-by-image.
- ⏳ Modern WebP/AVIF output only if pipeline/cost/browser evidence justifies it.
- ⏳ Static header-logo PNG optimization can be handled separately from R2 because those assets are code-owned, but preserve visual identity and Show Day variants.
- ⏳ Detect unused/orphaned media safely.
- ⏳ Reference-aware delete / soft delete / rollback.
- ⏳ **remove.bg opt-in upload processing:** when explicitly promoted, evaluate `https://www.remove.bg/api#remove-background` so each authenticated upload may ask whether to remove background. API key server-side only; preserve/identify original, version processed result in R2, surface failure cleanly, and re-check pricing/credits/privacy/file limits before implementation. Never remove backgrounds silently.
- ⏳ Optional later cleanup of duplicate/original GitHub assets only after a separate consumer/reference audit proves each asset safe to remove. **Migrator retirement does not authorize this.**

## 6. Trusted By

**Status: ✅/🟡 A/B.**

Already implemented:

- ✅ Dynamic CMS content.
- ✅ Add/delete/reorder clients.
- ✅ R2 upload/replace/reuse of logos.
- ✅ EN/ES content where applicable.
- ✅ Exact Select routing.
- ✅ Scale control for media.
- ✅ WLive protection.
- ✅ Published edge rendering + fallback.
- ✅ Legacy migration completed and production R2 reference verified.

Still pending if desired as generic layout capabilities:

- ⏳ Duplicate client/card action.
- ⏳ Snap-to-grid / arbitrary layout resize.
- ⏳ Generic COL/INT visibility control per item.
- ⏳ P3.0 accessibility: use an accessible contrast token for `TRUSTED BY` rather than globally changing the muted token.

## 7. Brands Supported Through

**Status: ✅/🟡 A/B.**

Already implemented:

- ✅ Add/remove/reorder supported-brand items through the Trusted model.
- ✅ R2 logo management.
- ✅ Reveal association between company/client and supported brands.
- ✅ Desktop hover behavior.
- ✅ Mobile tap behavior.
- ✅ Placement controls and production parity/safeguards.
- ✅ Production R2 media reference verified during Home closeout.

Still pending only if promoted later:

- ⏳ Generic duplicate action.
- ⏳ Snap-to-grid / freeform resize beyond existing placement/scale controls.
- ⏳ Generic market visibility per supported-brand item.

## 8. Portfolio / Selected Work / Highlight Projects

**Status: 🟡 B.**

Already exists:

- ✅ Selected Work public section.
- ✅ Core Work CMS Draft/Published/revisions.
- ✅ Work media bridge to reusable Media Library.
- ✅ Managed Work media verified on R2 in Saved Draft and production during Home closeout.

Future deeper Portfolio/Projects scope:

- ⏳ Decide final Portfolio / Highlight Projects information model rather than creating a second parallel Work system.
- ⏳ Audit/reuse the three hidden future project slots only if still useful.
- ⏳ Images/video.
- ⏳ Credits.
- ⏳ Role.
- ⏳ Client/production company.
- ⏳ Year.
- ⏳ Rich description.
- ⏳ Tags such as Theatre / Sound Design / Broadcast / Live / Post.
- ⏳ Featured / Hidden.
- ⏳ Discipline filters.
- ⏳ Extended case studies.
- ⏳ Before/After.
- ⏳ Embedded QLab/audio/video examples where rights/performance allow.
- ⏳ **P3.0 language continuity fix:** the current EN Wonderlust/Work CTA to “Explore live and broadcast audio” resolves to a Spanish landing. Correct destination/translation without duplicating pages unnecessarily.

## 9. Raw vs Mixed

**Status: 🟡 B.**

- ✅ UI/runtime concept exists.
- ⏳ Replace placeholder `[AUDIO_RAW].mp3` / `[AUDIO_MIXED].mp3` with real authorized audio.
- ⏳ Manage Raw/Mixed pairs from Admin.
- ⏳ Real waveform.
- ⏳ Sample-accurate switching if technically justified.
- ⏳ Multiple examples.

## 10. Testimonials

**Status: ✅ A for CMS; editorial growth remains optional.**

- ✅ Current schema/default contains real testimonial content rather than the old two mockup placeholders.
- ✅ Full Admin management: logo, name, role/company, quote, order, visibility, featured.
- ✅ Add/delete/reorder.
- ✅ R2 media; legacy migration completed and production reference verified.
- ✅ Draft/Published/revisions + public edge rendering.

Future editorial work may add more real testimonials; do not recreate placeholders merely for visual balance.

## 11. Contact form

**Status: ✅/🟡 A/B.**

Resolved:

- ✅ Display-only/mail-client flow is no longer the operating contact path.
- ✅ Visitor submits directly to backend.
- ✅ Lead + consent stored in D1.
- ✅ Notification routes to `hello@sdlive.show`.
- ✅ Turnstile anti-spam.
- ✅ Public success/error UI.
- ✅ Contact presentation CMS edits copy without owning submission logic.

Pending:

- 🚧 **P3.1:** ensure every public page that loads GTM establishes the same Consent Mode/default-denied contract before GTM; this is analytics/privacy shell work, not Contact submission logic.
- ⏳ P3.0 accessibility finding: correct Turnstile container semantics/ARIA compatibility without breaking widget render/action.
- ⏳ Explicit/verifiable rate limiting.
- ⏳ Optional automatic confirmation email to visitor; design copy/deliverability before enabling.
- ⏳ Future CRM conversion/association when CRM exists.

## 12. Rental request

**Status: ✅/🟡 A/B.**

Resolved:

- ✅ Request is backend-submitted; no mail-client workflow is required.
- ✅ Equipment selection, rental data and consent are persisted by the existing request flow.
- ✅ Rental notifications route only to `rental@sdlive.show`.
- ✅ Server-side pricing/quote calculation exists.
- ✅ Cart/items/quantities/totals/form smoke passed after P2.6.
- ✅ Rental presentation CMS deliberately does not own transactional IDs/pricing.
- ✅ Rental managed media migration completed and public R2 reference verified.

Pending:

- ⏳ Reject a request with **0 equipment + 0 services** in both frontend and backend; service-only requests remain valid when at least one service is selected.
- ⏳ Future CRM Lead/Rental Request relationship once source-of-truth is designed.
- ⏳ Automatic PDF quotation, validity, approval workflow.
- ⏳ Real-time availability.
- ⏳ Inventory/calendar double-booking prevention.
- ⏳ Clearer wording that the cart is a **quote request, not checkout**, to reduce lead abandonment.
- ⏳ Compatibility guidance: WING → recommend DL32; LV1 Classic → recommend StageGrid 4000, with UX approved before implementation and no silent auto-add.
- ⏳ Rental Admin item creation + validated backend-owned pricing rules (fixed/per-day/multi-day/quantity/pair/bundle/conditional rules).
- ⏳ Protect against pricing-copy drift between static/JSON-LD presentation and backend-owned pricing through shared-source/test strategy; do not create a second browser/CMS pricing engine.

## 13. Equipment Rental service card

**Status: 🟡 B / existing intent behavior verified, copy/navigation polish may remain.**

- ✅ Public direct `/#rental` intent is handled by runtime and can reveal the required Rental surface even for INT visitors.
- ⏳ Confirm/standardize all service-card destinations and labels so no dead CTA remains.
- ⏳ Keep INT behavior deliberate; Rental remains hidden by default without direct intent.

## 14. Basic CRM

**Status: ⏳ D — dashboard module is Planned/Soon, not implemented.**

- ⏳ Lead pipeline New → Contacted → Quoted → Confirmed → Lost.
- ⏳ Clients / contacts / companies.
- ⏳ Notes / history.
- ⏳ Source: Web / Email / Referral / LinkedIn / etc.
- ⏳ Lead → Quote → Project → Invoice relationship.
- ⏳ AppSheet evaluation only after source-of-truth mapping.
- ⏳ Follow-up reminders.
- ⏳ Kanban pipeline.

## 15. AppSheet integration

**Status: ⏳ D.**

- ⏳ Integrate relevant personal AppSheet data with SD.Live Admin only after ownership rules are explicit.
- ⏳ Work/jobs, clients, events and payments where useful.
- ⏳ Avoid unnecessary duplication.
- ⏳ Define source of truth per datum before sync.
- ⏳ Potential AppSheet client → CRM import.
- ⏳ Potential confirmed Lead → event/project creation.

## 16. Automatic Show Day Mode

**Status: 🟡 B — manual Show Day exists; automation does not.**

- ⏳ Connect Google Calendar/AppSheet/project calendar source.
- ⏳ Detect show/event today.
- ⏳ Auto-enable Show Day Mode.
- ⏳ Auto-disable after event.
- ⏳ Configurable activation window (for example 3h before → 2h after).
- ⏳ Manual Admin override.
- ⏳ P3.0 accessibility finding: improve contrast of the Show Day Mode control using a local accessible token, not a global muted-color change.

## 17. Calendar

**Status: ⏳ D.**

- ⏳ Native Admin calendar.
- ⏳ Google Calendar integration.
- ⏳ AppSheet events.
- ⏳ Projects.
- ⏳ Rental availability.
- ⏳ Date/equipment conflict detection.
- ⏳ Client availability link if valuable.

## 18. Projects

**Status: ⏳ D — Admin module planned, not implemented.**

- ⏳ Client, show, role, dates, venue, contacts, notes, files.
- ⏳ Rental association.
- ⏳ Quote association.
- ⏳ Calendar association.
- ⏳ Pre-show / show-day / wrap checklist.

## 19. Quote automation

**Status: ⏳ D.**

- ⏳ Create quote from Rental request or Lead.
- ⏳ Equipment, services, transport, VAT, days, discounts/rules.
- ⏳ PDF and numbering.
- ⏳ Send to client.
- ⏳ Status Draft / Sent / Viewed / Accepted / Rejected.
- ⏳ Online acceptance.
- ⏳ Accepted quote → Project automation.

Do not create a second pricing engine; Rental backend pricing remains authoritative until a deliberate schema/evaluator migration is approved.

## 20. Inbox / Google Workspace

**Status: 🟡/⏳ B/D.**

- ✅ Gmail/Workspace operation exists externally.
- ⏳ Native Admin Inbox.
- ⏳ General / Rental / Projects / Billing categories.
- ⏳ Reply using correct alias.
- ⏳ Email → Lead / Rental Request / Project.
- ⏳ Automatic association with CRM client only after CRM/source-of-truth exists.

## 21. SD.Live email addresses

**Status: 🟡 B + external verification.**

- ✅ Main site config uses `hello@sdlive.show`.
- ✅ Rental notifications use `rental@sdlive.show` exclusively.
- ⏳ Run a final repository/content audit for stale personal-email references before considering cleanup permanently closed.
- ⏳ Verify operational aliases before automating: `hello@`, `info@`, `rental@`, `projects@`, `billing@`, `facturas@`.
- ⏳ Evaluate `noreply@` only for real automated notification use.
- ⏳ DMARC after Workspace/email stabilization.
- ⏳ `quotes@` only if it adds operational value.

## 22. Login / Owner Access

**Status: ✅/⏳ A/D.**

- ✅ Real Admin security is Cloudflare Access.
- ✅ Worker validates Access/JWT.
- ✅ No current repo search result for the old `Owner Access` mockup; it is also explicitly forbidden from restoration by project invariants.
- ⏳ Optional discreet Login/Admin link placement if useful.
- ⏳ Prefer footer/direct URL rather than prominent public nav unless a business reason appears.

## 23. Private portfolio / CV for recruiters and clients

**Status: ⏳ D.**

- ⏳ Private, noindex, non-public-navigation Portfolio/CV pages.
- ⏳ Variants: Sound Design / Live Audio / Theatre / AV-Systems / Production / General CV.
- ⏳ **Canonical editable HTML CV:** build the master CV as maintainable HTML coherent with SD.Live visual/editorial language, responsive and print-friendly, with controlled PDF export. Keep content factual and easy to fork into application-specific variants.
- ⏳ Share only when needed.
- ⏳ Revocable links / expiry / access limits.
- ⏳ Open tracking only with privacy/consent implications understood.
- ⏳ Recipient-specific label such as `Portfolio prepared for [Company]`.
- ⏳ Downloadable CV PDF.
- ⏳ Save an application-specific version.
- ⏳ Do not publish/index the canonical CV by default without a deliberate visibility decision.

## 24. Data Studio / business analytics

**Status: ⏳ D.**

- ⏳ Decide Admin dashboard vs Looker Studio vs hybrid.
- ⏳ Potential sources: website analytics, Leads, CRM, Rental, Projects, AppSheet, NextPay26, revenue, clients, quotes, conversions.
- ⏳ Revenue by client/service.
- ⏳ Lead→quote and quote→booked conversion.
- ⏳ Equipment utilization.
- ⏳ COL vs INT markets.
- ⏳ Projects by country/city.
- ⏳ Revenue forecast.

Do not build before source-of-truth and sufficient real data exist.

## 25. Web analytics

**Status: 🟡/🚧 B/F.**

- ✅ GTM + GA4 base exists.
- ✅ Home establishes Consent Mode/default denied before GTM and exposes the Privacy & analytics choice.
- 🚧 **P3.1:** `/en/`, `/es-co/`, Theatre, public service/Rental landings and 404 (where they load GTM) must receive the same consent contract before GTM. Reuse the existing implementation.
- ✅ `generate_lead`, WhatsApp and Email events are documented as validated/observed in GA4 Realtime; do not repeat the old initial validation from zero unless regression evidence appears.
- ⏳ Separate internal/testing traffic once active debugging no longer requires it.
- ⏳ Confirm one real form submission → one `generate_lead` if duplicate-firing integrity has not been explicitly closed.
- ⏳ Keep validating event parameters (`lead_type`, `market`, page context) when tracking changes.
- ⏳ Review Key Events vs microconversions.
- ⏳ Funnel session/source → lead → qualified → closed once downstream CRM stages exist.
- ⏳ Portfolio/Raw-vs-Mixed interaction measurement when those surfaces become business-relevant.
- ⏳ Reporting on which projects/pages produce inquiries.

Permanent troubleshooting rule: **observe → test → confirm → correct → retest. Do not edit/publish GTM merely because a result is absent from DebugView; validate normal production traffic in Realtime first.**

Current pre-marketing warning remains: historical development traffic is contaminated by testing and must not be interpreted as reliable acquisition performance until internal traffic/data integrity work is complete.

## 26. SEO

**Status: 🟡 B; P3.0 audit checkpoint ✅ closed.**

Already implemented / verified base:

- ✅ Canonicals/hreflang/robots/sitemap/JSON-LD/OG and redirects for current architecture.
- ✅ Existing EN/ES-COL and rental/service landings.
- ✅ Google sitemap Success with 7 discovered URLs during P3.0.
- ✅ Google URL Inspection checked all seven; 6/7 indexed at audit time, and `/audio-eventos-streaming-teatro-bogota` passed Live Test + indexing request.
- ✅ Google Manual Actions and Security Issues: no issues detected during audit.
- ✅ Bing sitemap Success with 7 URLs; all 7 were already submitted 2026-08-18.
- ✅ Tested Bing Live URLs were indexable; Home and Bogotá services were re-submitted 2026-08-21.
- ✅ Bing Site Scan: 7/7 pages, 0 errors, 1 scanner warning, 0 notices.
- ✅ Bing “missing alt” scanner warning reviewed as **non-actionable**: exactly seven intentional decorative `alt=""` instances (six header logo fragments inside aria-hidden brand graphics + mirrored aria-hidden PA image). Do not add redundant alt text to silence scanner.

Pending / follow-up:

- ⏳ **Bing indexation recheck:** revisit Bing after **7–14 days from 2026-08-21**, approximately **2026-08-28 through 2026-09-04**. Check URL Inspection, Site Explorer/Indexed URLs and sitemap crawl state before calling the current lack of aggregate data a technical fault.
- ⏳ Do not repeatedly re-submit the same seven URLs while no new evidence exists; distinguish Bing crawl/report latency from an actual indexability issue.
- ⏳ Google: revisit the one requested Bogotá services URL after a reasonable processing period; do not request indexing repeatedly.
- ⏳ Titles / meta descriptions / schema / canonical / OG review after architecture/content changes.
- ⏳ Internal-linking audit.
- ⏳ Performance / Core Web Vitals: Search Console had insufficient field/CrUX data, so use lab evidence for optimization without declaring a field failure.
- ⏳ SEO controls from Admin when page model is ready.
- ⏳ Ongoing Search Console / Bing Webmaster / indexing monitoring and discoverability review.
- ⏳ Measure queries/impressions/CTR/countries/landing pages when data volume becomes useful.
- ⏳ `sitemap.xml` `lastmod` is static while Home CMS can Publish independently; design maintenance/automation only when it accurately reflects meaningful updates.

Candidate commercial queries to research, **not automatic page-generation instructions**:

- `alquiler sonido bogota`
- `sonido eventos corporativos bogota`
- `alquiler consolas bogota`
- `behringer wing bogota`

For each: establish real offer, search intent, existing URL overlap, operational capacity, evidence and CTA before creating/changing a page.

## 27. SEO / alternative public pages

**Status: 🟡 B; P3.0 audit ✅ completed, fixes remain individually prioritized.**

- ✅ Current public landings participated in sitemap/Search Console/Bing audit.
- ✅ No broad routing/HTTPS/canonical failure was found.
- ⏳ Fix EN Work CTA that currently leads to a Spanish landing.
- ⏳ Add/standardize WhatsApp on public landings where appropriate, preserving tracking and responsive safe areas.
- ⏳ Maintain consistent Consent Mode shell via P3.1 before GTM across all public pages.
- ⏳ Continue visual consistency polish only from specific evidence; no redesign by default.
- ⏳ All relevant public pages should participate in Show Day Mode when the shared/runtime architecture supports it; define behavior before broad rollout.

## 28. Hidden/staging content in code

**Status: 🟡/P0 next gate.**

- ✅ Hidden/staging content has historically included Sound for Picture, Raw vs Mixed, Future Projects, Behind the Console / Field Notes and prior testimonial mockups.
- ✅ Testimonials are no longer treated as hidden mockup content; they now have a real CMS.
- ✅ P3.0 proved `#contentStaging` placeholder copy is still present in the **public/indexable Home HTML response** despite `hidden`/`aria-hidden`; visually hidden is not equivalent to absent from crawler-visible HTML.
- ⏳ **P3.2 candidate:** strip staging from the public Home response at edge/runtime while preserving `index.html` source/static Admin preview if the Editor still needs it.
- ⏳ Add regression that public `/` does not contain staging identifiers/copy such as `contentStaging` / `Future picture project`, while Admin preview contract remains intact.
- ⏳ Audit the remaining hidden/staging blocks against current code before moving anything.
- ⏳ Migrate reusable, approved patterns to Template Library when that system exists.
- ⏳ Do not leave valuable content indefinitely as manual hidden HTML.
- ⏳ Do not publish Sound for Picture or any placeholder merely because it exists in source.

## 29. AI chatbot

**Status: ⏳ D, cost/privacy/reliability-gated.**

- ⏳ **Dapta.ai is the current named candidate** (`https://dapta.ai`); re-check the provider's current free tier/limits at implementation time rather than treating “free” as a permanent invariant.
- ⏳ Review embed/API capabilities, privacy/data processing, branding, analytics/consent and operational reliability before adding third-party scripts.
- ⏳ Start from owned FAQ/knowledge/content sources.
- ⏳ Services / Rental / general availability / Portfolio knowledge.
- ⏳ Never invent price, availability, projects or capabilities; deterministic site/backend sources remain authoritative.
- ⏳ Preserve a clear human handoff to Contact/Rental.
- ⏳ Conversation → Lead only when CRM exists or via an explicitly designed current form handoff.
- ⏳ Rental configuration recommendation only when compatibility/pricing sources are reliable.
- If recurring cost or data/privacy risk has no clear return: do not implement.

## 30. System / infrastructure

**Status: 🟡 B.**

- ✅ Public/API health endpoint exists.
- ✅ D1/R2/Access/Turnstile foundational integrations exist.
- ✅ **Verified cache baseline:** `worker-entry.js::transformHomeResponse()` sets `Cache-Control: no-store` for public root HTML and `Vary: Accept-Language, Cookie` while CMS/HTMLRewriter rendering occurs per request.
- ✅ P3.0 Lighthouse lab showed roughly 10 ms TTFB in the measured runs, while Mobile LCP remained poor; therefore current evidence does **not** support treating `no-store` as the main current LCP cause.
- ⏳ **Home edge-cache optimization:** still valid future architecture work, but measure real TTFB/D1/Worker impact first; compare bounded `public` TTL + `stale-while-revalidate` against publish-triggered selective invalidation/purge. Preserve EN/ES, COL/INT behavior, variants, Admin preview, failsafe, Draft ≠ Published and acceptable Publish freshness.
- ✅ P3.0 verified no existing IndexNow implementation in repo and Cloudflare **Crawler Hints is OFF**.
- ⏳ **IndexNow/Crawler Hints:** evaluate Crawler Hints together with future cache/invalidation so change signals are reliable; avoid adding a parallel manual IndexNow API/key solely because Bing crawl is currently slow.
- ⏳ **Mobile critical render path:** Lighthouse identified render-blocking first-party CSS/consent/language bootstrap + Google Fonts and a Hero `<h1>` LCP render delay. Optimize incrementally; preserve default-denied consent, first-paint language and Visual Safeguards.
- ⏳ Admin-visible Worker health.
- ⏳ D1 status.
- ⏳ R2 status/usage and threshold warnings.
- ⏳ Last Publish / last deploy.
- ⏳ Error/observability surface.
- ⏳ Backups/export.
- ⏳ Admin audit log: who changed what and when.
- ⏳ Rollback from UI.
- ⏳ Cloudflare security review/testing: document what the current free tier provides, what paid tiers/features would materially add, and do not buy/enable products without evidence/approval.
- ⏳ Security testing/hardening: rate limits, CSP/Referrer-Policy/Permissions-Policy, Access/JWT validation boundaries, form abuse, dependency/runtime review, backups and incident recovery.
- ⏳ Remove public `deploy-test.txt` in a later cleanup if no longer needed.

## 31. Settings

**Status: ⏳ D.**

- ⏳ Brand settings.
- ⏳ Contact info.
- ⏳ Workspace aliases.
- ⏳ WhatsApp/social links.
- ⏳ Default COL/INT.
- ⏳ Show Day.
- ⏳ Rental defaults/config.
- ⏳ SEO defaults.
- ⏳ Notifications.

## 32. Premium / additional Admin capabilities

**Status: ⏳ D unless individually promoted later.**

- ⏳ Global Search / Command Palette (`⌘K`).
- ⏳ Activity Center.
- ⏳ Automation Center (for example Rental Request → Lead → notification → draft quote).
- ⏳ Optional Client Portal.
- ⏳ Generic Share Links for Portfolio/CV/quotes/docs/previews.
- ⏳ Draft preview links.
- ⏳ Campaign-specific site variants without duplicating the site.
- ⏳ Keyboard shortcuts.
- ⏳ Autosave Draft without auto-Publish.
- ⏳ Change comparison before Publish.
- ⏳ Scheduled Publish / visibility.
- ⏳ Global Admin notifications.
- ⏳ Exportable CMS/CRM/config backups.
- ⏳ Dark Audit Mode for broken links, missing images, stale emails, placeholders and incomplete SEO.
- ⏳ Role-based access if another operator needs limited Admin permissions.
- ⏳ Admin PWA for iPhone/Mac if useful.
- ⏳ QR generator for portfolio/contact/rental/private pages.
- ⏳ UTM/link builder for LinkedIn/QR/CV/email attribution.

---

# Cross-cutting requirements preserved from the historical backlog

## P3.0 public production integrity

**Status: ✅ A — audit/evidence gate closed 2026-08-21.**

- ✅ Inventory actual public routes/canonicals/aliases from repo, redirects and sitemap.
- ✅ Verify HTTP status/redirects/404 and relevant internal links.
- ✅ Audit COL/INT, EN/ES and Desktop/Mobile behavior on applicable routes.
- ✅ Audit CTAs, WhatsApp, Contact/Rental flows, stale-email/routing context and dead ends.
- ✅ Audit canonical/hreflang/robots/sitemap/meta robots/indexability/orphans/duplicates.
- ✅ Audit public visual consistency without assuming a redesign is required.
- ✅ Measure performance/TTFB/Lighthouse baseline and record the Home `no-store` condition.
- ✅ Search Console URL Inspection all 7 sitemap URLs; 6 indexed, 1 live-indexable and submitted.
- ✅ Bing sitemap/submission/Live URL/Site Scan audit; 7/7 scan with no actionable technical SEO error.
- ✅ Classify findings P0/P1/P2 before implementation.

**Classified P0:** Consent Mode parity; public Home staging removal.  
**P1-HIGH:** mobile critical rendering; responsive image delivery.  
**P1:** accessibility, language CTA continuity, WhatsApp landings, Rental empty-request/RFQ clarity, pricing drift protection.  
**P2:** sitemap lastmod maintenance, deploy-test cleanup, experimental agentic diagnostics.

## P3.1 Consent Mode parity

**Status: 🚧 F — active.**

- 🚧 Inventory every public HTML file/route that loads GTM.
- 🚧 Reuse the existing `analytics-consent.js`; do not build a parallel banner/consent manager.
- 🚧 Ensure default-denied state executes before GTM on every in-scope page.
- 🚧 Cover Home, EN/ES landings, Theatre, services/Rental landings and 404 as applicable; inspect Privacy separately.
- 🚧 Add automated regression for coverage + ordering.
- 🚧 Private-window production smoke after merge.

## COL vs INT production validation

**Status: 🟡 B after P3.0.**

- Existing COL/INT runtime and Admin preview exist; Rental visibility has been exercised during CMS smoke.
- ✅ P3.0 confirmed direct `#rental` intent can expose the necessary Rental surface for INT even though Rental remains hidden by default.
- ⏳ Add an Admin diagnostic that exposes detected market and reason/source if this can be done without privacy-hostile fingerprinting.
- ⏳ Continue checking new public pages/components for market parity as they are added.

## Commercial strategy / ROI

**Status: ⏳ D strategy stream.**

- ⏳ Use SD.Live actively for national/international client acquisition.
- ⏳ Measurable funnel, useful market/service landing pages, real CTAs/forms, CRM/follow-up/case studies, SEO, outreach and UTMs.
- ⏳ Evaluate best traffic channels based on audience/ROI: LinkedIn/social platforms, partnerships/referrals, targeted outreach, educational content, tutorials, podcast only if distribution/business case is credible.
- Never add a channel because it is fashionable; define expected audience, cost, metric and conversion path first.

## Legacy personal-site coherence

**Status: ⏳ D external.**

- ⏳ Audit `https://samueldavidllano.carrd.co` against current `sdlive.show`: positioning, biography, roles/services, links, contact destinations, visual identity and calls to action.
- ⏳ Decide deliberately what should be updated, retained, redirected or retired; avoid two public identities making contradictory claims.
- ⏳ Do not rewrite/redirect the Carrd merely because SD.Live exists; inspect its current purpose/traffic first.

## Canonical HTML CV

**Status: ⏳ D professional deliverable.**

- ⏳ Build a maintainable HTML source for the CV, coherent with SD.Live but optimized for recruitment/readability rather than copying the marketing site wholesale.
- ⏳ Responsive + print stylesheet + predictable PDF export.
- ⏳ Factual source content, reusable sections and application-specific variants.
- ⏳ Default private/noindex strategy until a public CV decision is made.

## Content / Journal / educational authority

**Status: ⏳ D.**

When real content and editorial capacity exist, evaluate restoring Journal/Insights with useful original material such as:

- professional audio field insights;
- technical explainers/tutorials/training;
- briefs/guides for marketing professionals buying AV/audio services;
- responsible analysis of Suno/AI and AI-assisted audio production;
- production notes/case-study lessons from real authorized work.

Do not mass-generate generic SEO articles.

## Technical Audio Training as a service

**Status: ⏳ D — approved backlog item, not yet published.**

- Define actual curriculum/audience/delivery format/market/capacity/pricing/evidence first.
- Then decide whether it belongs in Services and whether a dedicated useful page is warranted.

## Rental inventory + calendar

**Status: ⏳ D.**

- Inventory quantities/availability must eventually connect to calendar/project/rental data to prevent double booking.
- This depends on a deliberate source-of-truth and conflict model.

## Search-engine indexing

**Status: 🟡 B / monitored external state.**

- ✅ Technical discoverability base exists.
- ✅ P3.0 verified current sitemap/canonical/indexability state across the seven intended URLs.
- ✅ Google: 6/7 indexed at audit time; seventh Live Test passed and indexing was requested.
- ✅ Bing: sitemap Success/discovered 7; all 7 submitted; tested Live URLs indexable; Site Scan 7/7 with 0 errors.
- ⏳ **Bing follow-up mandatory:** re-check **7–14 days after 2026-08-21**, target **2026-08-28 to 2026-09-04**. Review Home + one landing in URL Inspection, Site Explorer Indexed URLs/All URLs, and sitemap crawl state.
- ⏳ If Bing still shows known/discovered but not crawled while Live URL remains indexable, treat crawler/report latency as a plausible explanation and investigate evidence before code changes.
- ⏳ Avoid repeated URL submissions without new evidence.
- ⏳ Continue Google Search Console / Bing Webmaster coverage and indexed-vs-canonical analysis over time.
- ⏳ Include organic search metrics in future reporting only after data becomes trustworthy.

## Home HTML cache / performance optimization

**Status: ⏳ D; current `no-store` condition is ✅ evidenced.**

- ✅ `worker-entry.js::transformHomeResponse()` explicitly sets `Cache-Control: no-store` and `Vary: Accept-Language, Cookie` on public root HTML.
- ✅ P3.0 lab TTFB was roughly 10 ms in tested Lighthouse runs, so current evidence does not make cache the primary Mobile LCP bottleneck.
- ⏳ Measure real TTFB/Worker/D1 cost over time and determine whether caching materially helps visitors/cost.
- ⏳ Evaluate simple bounded edge/shared caching such as a short TTL + `stale-while-revalidate` versus a more robust Publish-triggered purge/invalidation path.
- ⏳ Cache keys/variants must safely respect language/cookies and actual COL/INT behavior; admin/preview/authenticated surfaces must not be shared-cached.
- ⏳ Publish/failsafe correctness must remain stronger than performance gains; define rollback before implementation.
- ⏳ Confirm current Cloudflare plan/API capabilities and any recurring cost before choosing purge architecture.
- ✅ Cloudflare **Crawler Hints currently OFF** and no IndexNow implementation found in repo during P3.0.
- ⏳ Evaluate Crawler Hints/IndexNow together with the future cache/invalidation architecture; do not add a manual parallel API just to compensate for Bing's current crawl delay.

## Mobile performance / critical rendering

**Status: ⏳ D/P1-high from P3.0 evidence.**

- ✅ Mobile Lighthouse runs: Performance 61 and 66 under Slow 4G/Moto G Power emulation; Desktop 96.
- ✅ Mobile LCP element is Hero `<h1>`; render delay dominates observed LCP breakdown while TTFB is low.
- ✅ Total payload around 4.4 MB in audit; image delivery estimated ~1.4 MB savings.
- ⏳ Optimize responsive image delivery via pipeline/variants/`srcset`/`sizes`.
- ⏳ Review render-blocking CSS/fonts and early consent/language scripts incrementally; preserve privacy default-denied and first-paint language behavior.
- ⏳ Preserve Visual Safeguards rather than deleting safeguards to chase a score.
- ⏳ Re-run Mobile/Desktop Lighthouse after each material optimization and await CrUX field data before declaring real-user CWV results.

## Accessibility

**Status: ⏳ D/P1 from P3.0 evidence.**

- ✅ Lighthouse Accessibility score 89 reproduced Mobile/Desktop.
- ⏳ Consent banner: correct incompatible/unnamed dialog semantics while keeping preference UX non-blocking as designed.
- ⏳ Contact/Rental Turnstile containers: remove prohibited generic-div `aria-label` pattern and use compatible accessible structure without breaking Turnstile.
- ⏳ Local contrast fixes for `TRUSTED BY`, footer `SITE`/`CONNECT`, and Show Day Mode; avoid globally brightening `--color-muted`.
- ⏳ Footer heading order: replace/adjust `h4` semantic level for `SITE` while preserving styling.
- ✅ Bing's seven empty-alt instances are intentional decorative images and are **not** an accessibility defect; keep `alt=""`/aria-hidden semantics unless the underlying role changes.

## CMS image background removal

**Status: ⏳ D external integration.**

- ⏳ `remove.bg` is the named API candidate.
- ⏳ UI must ask per upload; no silent/automatic processing.
- ⏳ API secret server-side only; never expose it in browser code/GitHub.
- ⏳ Define original + processed object ownership/versioning in R2 and how Undo/Replace behaves.
- ⏳ Review external image-data processing/privacy, pricing/credits, format/dimension limits and failure handling at implementation time.

## Code audit / optimization without regression

**Status: ⏳ D quality stream.**

- Audit code for cleanup, organization, performance and fluidity **without changing approved behavior merely for elegance**.
- Apply Change Safety Gate first.
- Refactor incrementally with tests/CI, production smoke and rollback path.
- Monolith decomposition is allowed only with measurable maintainability/performance benefit and no parallel architecture.

## Rental quote clarity

**Status: ⏳ D/P1 conversion improvement.**

- Make it unmistakable that the Rental cart is a **request for quotation**, not payment/checkout, so pricing does not scare away or lose a lead.
- Reject completely empty requests at frontend + backend while preserving legitimate service-only inquiries.
- Measure conversion/friction before and after when analytics maturity allows.

## Cybersecurity / Cloudflare evaluation

**Status: ⏳ D + external.**

- Perform a practical security audit/test plan around the actual stack.
- Document Cloudflare protections currently available on the active/free plan versus paid options relevant to SD.Live.
- Only recommend paid protection if risk/benefit justifies recurring cost.

---

# GA4 / GTM P1 tracking-integrity checkpoint

This preserves the detailed analytics handoff while reconciling it with later confirmed state.

## Confirmed / do not restart from zero

- ✅ GA4 is implemented through GTM.
- ✅ GTM Measurement ID was matched to the GA4 web stream during prior troubleshooting.
- ✅ GA4 Google Tag exists on Initialization / All Pages.
- ✅ `generate_lead` tag/trigger exists and reached GA4 during validation.
- ✅ `lead_type` and `market` were observed on validated lead events.
- ✅ WhatsApp and Email tracking are now documented in the operational roadmap as validated/observed in GA4 Realtime.
- ✅ No reason to assume tags are unpublished merely because normal traffic is absent from DebugView.
- ✅ P3.0 identified Consent Mode parity as a **public-page shell issue**, not evidence that the already-validated Home GA4 events need to be rebuilt.

## Remaining integrity work

- 🚧 P3.1: apply existing consent default-denied before GTM across every public GTM page.
- ⏳ If not yet explicitly evidenced, execute one controlled production form submission and verify exactly one `generate_lead` for duplicate-firing integrity.
- ⏳ Validate required parameters when tags/forms change.
- ⏳ Separate developer/internal traffic after active debugging.
- ⏳ Review which events are Key Events; generic `page_view`/`scroll` are not business conversions.
- ⏳ Treat `qualify_lead`, `close_convert_lead` and revenue attribution as downstream capabilities that depend on CRM/business-state implementation rather than fabricating those outcomes in GA4.
- ⏳ Build trustworthy attribution/funnel reporting only after internal traffic and downstream source-of-truth are ready.

## Troubleshooting rule

Do not modify GTM without evidence. Work one test at a time:

**observe → test → confirm → correct → retest**.

Use GTM Preview/DebugView for debug sessions; use **GA4 Realtime** to validate normal live traffic. Do not repeat already-confirmed tests unless there is regression evidence.

---

# Reconciliation conclusion

Nothing in this checklist is an instruction to implement all items. Its purpose is to ensure the historical backlog cannot disappear or be mistaken for Current State.

Current work order remains controlled by `PROJECT_STATUS.md`. At this checkpoint:

1. P2.6 is closed and production-smoked.
2. P2.7 Global Select + permanent change-safety policy is closed, merged and production-smoked.
3. Home CMS R2 closeout inventory is complete: current managed media for Trusted/About/Selected Work/Testimonials/Rental was verified in Saved Draft and public production.
4. P2.8 Home media-migrator cleanup is closed: PR #37 merged at `4a8c425bc016acad78ef15d07dd8a7a4792bbc73`, CI passed and post-merge smoke confirmed Editor controls, Select/Interact, Safeguards 9/9 and R2 media remained healthy while GitHub/static fallbacks were preserved.
5. ✅ **P3.0 audit is closed:** Google/Bing/search/performance/accessibility evidence is recorded and findings are classified.
6. 🚧 **P3.1 is the only F — Active Gate:** Consent Mode parity across every public GTM page, reusing the existing Home contract.
7. **P3.2** is the next P0 candidate: remove staging placeholders from the public Home HTML response while preserving Admin/static preview.
8. **Bing must be re-checked 7–14 days after 2026-08-21 (target 2026-08-28–2026-09-04)** before escalating the current crawl/report delay.
9. Future integrations — Home edge cache + Crawler Hints/IndexNow, Carrd coherence, canonical HTML CV, Dapta.ai candidate assistant and remove.bg upload option — remain **D**, not implementation instructions, until explicitly promoted.