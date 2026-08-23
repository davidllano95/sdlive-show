# SD.Live

Production website and private back-office for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone for documentation: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Dynamic APIs, CMS publishing, forms and edge rendering run in Workers. D1 stores structured CMS/application data, R2 stores editor-managed media, and Cloudflare Access protects the Admin.

For project state, use this precedence:

1. current code + verifiable production behavior;
2. current schema/configuration;
3. `PROJECT_STATUS.md` — operational current state and active gate;
4. this README;
5. `ROADMAP_MASTER_CHECKLIST.md` — preserved historical/future backlog detail;
6. prompts, ideas and external references.

The dedicated Control Center sequence is documented in `docs/roadmap/sdlive-control-center.md`.

## Permanent change-safety rule

Before modifying an existing system, establish where it lives, who consumes it, what persists, which APIs/public/SEO/visual behavior depends on it, which tests/fallbacks exist, and whether the change can be incremental and reversible. If an important answer is unknown, investigate first.

Do not replace a working source of truth merely because a future vision describes a different architecture. **Stability > novelty.**

## Current architecture

### Public site

- **Frontend:** vanilla HTML/CSS/JavaScript.
- **Hosting/runtime:** Cloudflare Workers + Static Assets.
- **Worker router:** `worker-router.js`.
- **Hero/base edge renderer:** `worker-entry.js`.
- **API Worker:** `worker.js` plus section-specific modules.
- **Analytics:** GTM + GA4 with consent gating.
- **Forms:** Turnstile + D1 + Resend.
- **Languages:** EN / ES with server-resolved first paint and persisted preference.
- **Markets:** Colombia / International behavior.

### CMS / media

- **Database:** D1 binding `CMS_DB` → `sdlive-cms-production`.
- **Media storage:** R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- **Public media domain:** `media.sdlive.show`.
- **Hero:** Draft/Published/revisions with edge first-paint rendering.
- **Trusted By / Supported Brands:** D1/R2 + edge rendering.
- **Testimonials:** D1/R2 + edge rendering.
- **Core Home CMS:** About, Services, International and Selected Work.
- **Presentation CMS:** Rental and Contact presentation only; transactional logic remains system-owned.
- **Reusable Media Library:** R2-backed Editor library.
- **Visual safeguards:** `visual-safeguards.css` + `visual-safeguards.js` with Editor diagnostics.
- **Global Select:** `admin/editor/editor-resilience.js` routes visual selection to the owning CMS section/item.

### Private Admin / Control Center

All Admin workspaces remain behind the same Cloudflare Access boundary.

- **`/admin/` — Dashboard.** Lightweight operational overview, CMS/system health and workspace navigation. It must not auto-boot heavy Finance analytics.
- **`/admin/finance/` — Finance.** Dedicated **SD.Live Track** analytics workspace. This is the scalable home for cash, production, receivables, collection performance, fees, Tax Reserve planning and later finance-specific capabilities.
- **`/admin/editor/` — Site Editor.** Visual CMS/editor workspace.
- **Inbox:** currently bridges to Google Workspace/Gmail.
- **Leads/CRM, Rental Admin, Projects, Calendar, Analytics and SEO:** planned unless `PROJECT_STATUS.md` explicitly says otherwise.

The Finance workspace separation was approved after production QA showed that the Dashboard and Finance both work on iPhone when their startup work is isolated. Evidence: `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md`.

## Source-of-truth matrix

| Concern | Source of truth |
|---|---|
| Code, CSS/JS, critical branding, fallbacks | GitHub `main` |
| Structured CMS Draft/Published content | D1 |
| Public CMS content | validated D1 `published_json` |
| Editor-managed media binary | R2 |
| Editor-managed media metadata/references | D1 |
| Rental pricing / quote calculation | backend pricing logic; never presentation CMS copy |
| Public analytics | GA4/GTM after consent |
| Admin access | Cloudflare Access |
| Current finance persistence / formulas | Google Sheets `REGISTRO` |
| Finance offline capture/workflows | AppSheet **SD.Live Track** |
| Finance Admin analytics | read-only Worker view over the underlying Google Sheet/API |
| Finance Tax Reserve configuration | private D1 setting; planning reserve only, not taxes owed |
| Future CRM / Lead→Quote→Project→Invoice ownership | TBD before implementation |
| Future owner availability | D1 `availability_state` only if that feature is implemented |

### Finance non-negotiables

Control Center Steps 1–6 are closed. The finance system was audited and the decision is **repair + integrate, not rewrite**.

- AppSheet remains the offline field-capture/workflow surface.
- Google Sheets `REGISTRO` remains the current finance persistence/formula owner.
- `ID` is the durable AppSheet-generated record key; `_RowNumber` is not an integration identity.
- The Admin reads the underlying Sheet/API server-side with read-only scope.
- COP and USD remain separate; no implicit FX conversion.
- LiventX workflow blocking remains part of collection logic.
- No browser-facing Finance route exposes Notes, `NUM CONTACTO`, internal row IDs or OAuth credentials/tokens.
- No D1 finance mirror or second financial source of truth.
- **Finance Phase 3 write-back remains blocked** until the read-only workspace earns real-use trust and a draft-first/idempotent write contract is explicitly approved.

Evidence:

- `docs/audits/nextpay26-repair-vs-rewrite-2026-08-22.md`
- `docs/checkpoints/sdlive-track-source-of-truth-2026-08-22.md`
- `docs/checkpoints/sdlive-track-admin-finance-readonly-2026-08-22.md`
- `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md`

## CMS and public-site invariants

### Draft / Published

- `Save Draft` never changes production.
- Public CMS content uses Published, never Draft.
- `Publish` is the deliberate promotion action.
- Static content remains a fallback where the architecture requires it.

### First-paint / anti-popping

Published Home CMS copy should be resolved at the edge before visible first paint. `cms-hydration.js` remains a resilience fallback for non-SSR/static/Admin paths. Performance work may skip redundant hydration only when server-rendered content is already authoritative; do not blank the document or reintroduce static→CMS flash.

### Global Select

Select is an Editor contract, not a section-specific convenience. Every new CMS/page must test same-section selection, cross-section selection, exact collection-item routing and no accidental interaction while Select mode is active.

### Visual safeguards

Established production aesthetics are contracts. If a CMS/editor change reconstructs an approved visual behavior, extend the safeguard registry and regression tests in the same change rather than accepting silent visual degradation.

### Rental / Contact

- Rental is Colombia-first and hidden by default for International visitors unless direct intent requires it.
- Rental notifications go **only to `rental@sdlive.show`**.
- General Contact notifications go to `hello@sdlive.show`.
- Rental pricing/quote math remains backend-owned.
- Rental presentation CMS may edit presentation, not transactional IDs, pricing or quote math.

## Media / R2 rules

- Bucket: `sdlive-media-production`.
- Storage class: Standard.
- Public domain: `https://media.sdlive.show`.
- `r2.dev` remains disabled.
- Admin uploads use authenticated Worker endpoints.
- Public reads use the custom media domain/CDN.
- Upload keys are versioned for long-lived caching.
- Visual scale/position belongs in D1/CSS metadata; moving a slider does not create a new binary.
- Responsive public delivery uses Cloudflare Image Transformations while preserving R2/code-owned masters as authoritative fallbacks.
- Do not delete critical GitHub/static originals merely because managed media also exists in R2.
- Reference-safe delete/orphan cleanup remains future hardening.

## Current production milestones

- P0 baseline: closed.
- Hero CMS + first paint: closed.
- Trusted / Testimonials / Core Home / Rental & Contact CMS: closed.
- Reusable Media Library + Home R2 closeout: closed.
- Global Select + Visual Safeguards + automatic publish failsafe: closed.
- P3.0 public/SEO audit: closed.
- P3.1 Consent Mode parity: closed.
- P3.2 public staging strip: closed.
- P3.3 mobile critical rendering: closed.
- P3.4 responsive image delivery: closed; final lab evidence reached Mobile Performance 90 / LCP 3.1 s with ~58 KiB residual image-delivery savings.
- Security baseline: closed; CSP/browser headers + independent Contact/Rental Worker rate limits are live.
- Finance audit / SD.Live Track rename / source mapping: closed.
- Finance Phase 2 read-only integration: closed and production-reconciled.
- 2026-08-23 Admin Finance freeze hardening: desktop confirmed responsive after removing the Finance i18n global DOM observer.
- 2026-08-23 mobile isolation QA: base Admin and Finance each confirmed responsive when loaded separately.
- **Current implementation milestone:** dedicated `/admin/finance/` workspace + lightweight `/admin/` Dashboard; production smoke required after merge.

## Approved future improvements register

These are preserved requirements/backlog, **not automatic work**. `PROJECT_STATUS.md` controls current priority and `ROADMAP_MASTER_CHECKLIST.md` preserves the detailed checklist.

### Control Center / business operations

- Phase 2 Finance real-use observation before any write-back.
- Finance Phase 3: draft-first/write-once rental→finance automation only with explicit mapping, idempotency, duplicate protection and rollback.
- CRM pipeline, clients/contacts/companies, notes/history and Lead → Quote → Project → Invoice only after source-of-truth design.
- Native Admin Calendar, Projects, Rental Admin and quote automation when their ownership/contracts are defined.
- Automatic Show Day from approved Calendar/AppSheet/project source with manual override.
- Finance reminder delivery hardening: reuse approved reminder rules; notification channels must not become a second finance state engine.
- Private/noindex Portfolio/CV variants and a canonical editable HTML CV.
- Business analytics / Looker Studio or Admin reporting only when reliable downstream data exists.

### Availability / AI

- **Availability-Aware Contact Widget:** eligible independent track, not automatically active. If implemented, D1 `availability_state` is authoritative; owner WhatsApp commands require exact owner authorization; AI may qualify leads only and never owns/invents pricing, rental catalog, availability or finance data. Spec: `docs/roadmap/availability-aware-contact-widget.md`.
- **Dapta.ai candidate assistant:** future evaluation only after re-checking current pricing, API/embed capabilities, privacy, reliability and human handoff.

### Site Editor / layout

- Drag/drop, generic reorder, snap-to-grid, resize, spacing/alignment, independent Desktop/Mobile layout, show/hide by market/device, undo/redo, revision rollback, full-page Draft, templates, autosave Draft, change comparison, scheduled Publish/visibility, shortcuts and shareable Draft previews.
- Header visual management: order/spacing, links/offsets/menu items and visibility of Show Day/WhatsApp/CTAs.
- Floating-control positioning and iPhone safe-area preview.
- Hash/history scroll-restoration polish without blanking the document or harming LCP.

### Media / content

- R2 reference-safe delete/soft-delete, unused-media detection, richer tags, Library-level alt metadata, crop/focal point and OG/social images.
- Optional `remove.bg` processing only per-user opt-in, server-side credentials, preserved original/fallback, versioned R2 result and current cost/privacy review.
- Deeper Portfolio/Selected Work model: credits, role, client, year, tags, featured/hidden, video/case studies and authorized before/after media.
- Raw vs Mixed real authorized audio + Admin management.
- Journal/Insights only with real editorial value; no mass AI filler.
- Technical Audio Training only after real curriculum/audience/capacity/pricing/evidence is defined.

### Rental / conversion

- Make Rental unmistakably a **request for quotation, not checkout**.
- Reject completely empty Rental requests while preserving service-only inquiries.
- Compatibility guidance such as WING → DL32 and LV1 Classic → StageGrid 4000; never silently auto-add equipment.
- Future Rental Admin item creation + validated backend-owned pricing rules.
- Inventory/calendar availability, double-booking prevention, PDF quote/validity/approval and delivery/logistics.

### SEO / analytics / platform

- Re-check Bing indexation in the documented processing window rather than repeatedly resubmitting unchanged URLs.
- Continue GSC/Bing/GA4 integrity work and internal-traffic separation before acquisition conclusions.
- EN/ES/market continuity and internal linking audits as architecture evolves.
- Home HTML cache optimization only after measuring real benefit and preserving language/cookie variants, Draft/Published and Publish freshness.
- Evaluate Crawler Hints/IndexNow with future cache/invalidation design, not as a parallel reflex.
- Incremental code cleanup/observability/backups/security testing only with evidence, tests and rollback.
- Legacy `samueldavidllano.carrd.co` coherence audit before deciding update/redirect/retirement.

## Important files

### Public/runtime

- `index.html` — public Home shell + static fallbacks.
- `styles.css` — primary public styles.
- `script.js` — primary public UI/runtime and Rental client behavior.
- `worker-router.js` — top-level routing/edge composition.
- `worker-entry.js` — Hero/base edge rendering.
- `worker.js` — base Admin/CMS APIs, Contact, Rental, D1/email logic.
- `public-form-rate-limit.js` — public form abuse-control wrapper.
- `security-headers.js` / `_headers` — CSP/browser security contract.
- `visual-safeguards.css` / `visual-safeguards.js` — visual contract protection.

### Admin

- `admin/index.html` / `admin/dashboard.js` — lightweight Dashboard.
- `admin/finance/index.html` / `admin/finance-page.js` — dedicated Finance workspace shell/bootstrap.
- `admin/finance-dashboard.js` / `.css` — Finance analytics UI.
- `admin/finance-dashboard-i18n.js` / `.css` — Finance EN/ES layer.
- `admin/editor/` — Site Editor workspace.
- `admin/editor/editor-resilience.js` — Global Select routing/resilience.
- `admin/editor/automatic-failsafe.js` — publish verification.
- `admin/editor/media-library.js` — reusable R2 Media Library.

### Documentation

- `PROJECT_STATUS.md` — current operational state and active gate.
- `ROADMAP_MASTER_CHECKLIST.md` — preserved detailed backlog/history.
- `docs/roadmap/sdlive-control-center.md` — Control Center sequencing.
- `docs/checkpoints/admin-finance-workspace-separation-2026-08-23.md` — Finance workspace architecture decision.

## Critical routes / endpoints

### Public

- `/`
- `/en/`
- `/es-co/`
- `/theatre-sound-design-audio-post`
- `/privacy`
- current service/Rental landings in the repository

### Private Admin

- `/admin/`
- `/admin/finance/`
- `/admin/editor/`

### APIs include

- `GET /api/health`
- public CMS content endpoints
- Admin content/media endpoints under `/api/admin/...`
- `GET /api/admin/finance/health`
- `GET /api/admin/finance/summary`
- `GET /api/admin/finance/dashboard`
- private Finance settings endpoint(s) used by the Tax Reserve UI
- `POST /api/contact`
- `POST /api/rental`

## Brand / operational invariants

- Brand spelling is exactly **SD.Live**.
- Descriptor: **Creative Audio**.
- Canonical tagline: **Creative Audio. Technical systems. Built for the show.**
- Visible `SD.Live` mentions use the floating-dot wordmark where appropriate; metadata/machine strings remain literal.
- WLive remains visible.
- Cloudflare Access is the real Admin barrier; never restore a visual/mock login as security.
- GTM is analytics/consent/events only, never navigation/branding/layout.
- Do not restore Netlify, the old Owner Access mockup, `site-runtime`, or GTM-driven navigation.
- GitHub = code; D1 = structured CMS/application state; R2 = editor-managed media; Finance ownership is explicitly separate as documented above.

## Tests

```text
npm test
```

The repository uses Node's built-in test runner and GitHub Actions runs CI on pull requests and `main`.

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
squash merge
  ↓
production smoke
  ↓
close milestone / update evidence
```

Do not treat a feature-branch deployment as production. `sdlive.show` represents the active `main` deployment unless Cloudflare explicitly exposes a preview URL.

## Current gate

**Control Center Steps 1–6 are CLOSED.** Finance Phase 2 remains read-only and in real-use observation; Phase 3 write-back is still blocked.

**Current F hardening gate:** finish and production-smoke the dedicated Finance workspace architecture:

- `/admin/` stays lightweight and must not load Finance analytics runtime;
- `/admin/finance/` owns SD.Live Track Finance analytics;
- `/admin/editor/` remains isolated as the Site Editor;
- validate desktop + iPhone navigation, Finance render, year selector and EN/ES after merge.

After this smoke, return to normal Phase 2 observation rather than starting write-back automatically. Availability/WhatsApp remains eligible as the explicit independent track but is not active by default.
