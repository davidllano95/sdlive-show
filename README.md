# SD.Live

Production website and back-office for **SD.Live — Creative Audio**.

Production: `https://sdlive.show`  
Public media: `https://media.sdlive.show`

The public site is a vanilla HTML/CSS/JS frontend served by Cloudflare Workers Static Assets. Dynamic APIs, CMS publishing, forms and edge rendering run in Cloudflare Workers. D1 is the structured-content database and R2 is the storage layer for editor-managed media.

For current progress, roadmap, invariants and the next gate, read **`PROJECT_STATUS.md` first**.

## Current architecture

- **Frontend:** vanilla HTML, CSS and JavaScript.
- **Hosting/runtime:** Cloudflare Workers + Static Assets.
- **Database:** Cloudflare D1 binding `CMS_DB` → `sdlive-cms-production`.
- **Media storage:** Cloudflare R2 binding `MEDIA_BUCKET` → `sdlive-media-production`.
- **Public media domain:** `media.sdlive.show`.
- **Worker router:** `worker-router.js`.
- **Base Worker / edge renderer:** `worker-entry.js`.
- **API Worker:** `worker.js`.
- **Admin:** `/admin/` behind Cloudflare Access.
- **Analytics:** GTM + GA4 with consent gating.
- **Forms:** Turnstile + D1 + Resend.
- **Languages:** EN / ES with persisted preference.
- **Markets:** Colombia / International behavior.

## Content ownership

The project deliberately separates code, structured content and media:

```text
GitHub
  code, CSS/JS, critical branding/fallback assets

D1
  text, ordering, visibility, associations and media metadata

R2
  editor-managed logos, photos and content imagery
```

Critical branding such as the primary SD.Live logo, favicon/app icons and essential fallback assets remain versioned with the code. Media that should be replaceable from the Editor is migrated progressively to R2.

The first migration target is **Trusted By + Supported Brands**. Later migrations include Portfolio / Selected Work, Rental imagery, Testimonials imagery where applicable, Insights/blog thumbnails and other CMS-managed images. Do not mass-migrate everything in one change; validate each section in production before removing GitHub duplicates.

## R2 media rules

- Bucket: `sdlive-media-production`.
- Storage class: **Standard**.
- Public domain: `https://media.sdlive.show`.
- Public Development URL / `r2.dev`: disabled.
- Admin uploads go through authenticated Worker endpoints.
- Public image delivery should use the custom domain/CDN directly rather than proxying every read through a Worker endpoint.
- Upload keys are versioned so long-lived immutable caching is safe.
- Visual resize/position belongs in D1/CSS metadata; do not create a new R2 object for each slider adjustment.
- Keep files reasonably optimized and avoid unnecessary duplicate originals.
- Do not enable paid media products or extra R2 features unless explicitly approved.

## Hero CMS flow

Published Hero content is server-rendered at the Cloudflare edge before first paint:

```text
GET /
  ↓
worker-entry.js
  ↓
read Published Hero from D1
  ↓
HTMLRewriter injects CMS copy into index.html
  ↓
initial HTML reaches the browser already resolved
```

This avoids client-side text swapping and layout popping while preserving the static Hero as a fallback if D1 is unavailable or returns invalid content.

The language preference is mirrored to a cookie so the Worker can render the correct language before first paint. `localStorage` remains supported for browser-side behavior and migration.

## Trusted By CMS state

Trusted By / Brands Supported Through already has its own Draft/Published model in D1 and Editor controls. Draft changes do not affect the public Home. Published content is stored in D1 but is **not yet bound to the public Home**.

Current Trusted editor UX includes reorder controls, fast carousel arrows, persistent Pause/Play, mobile swipe and Select-to-client inspector navigation.

The next gate is to add **Upload / Replace + visual logo scaling**, migrate Trusted By media to R2, and then connect Published Trusted By to the public Home with SSR/fallback.

## Important files

- `index.html` — main public Home shell and static fallback content.
- `styles.css` — main public styles.
- `script.js` — primary public UI/runtime behavior.
- `worker-router.js` — routes Trusted/media APIs before delegating to the base Worker.
- `worker-entry.js` — edge HTML rendering and base routing.
- `worker.js` — CMS/admin APIs, Contact, Rental, D1 and email logic.
- `trusted-api.js` — Trusted By Draft/Published API.
- `trusted-content.js` — Trusted By schema/default content.
- `media-api.js` — authenticated R2 media status/upload API.
- `hero-content.js` — Hero client resilience and Admin-preview isolation.
- `trusted-marquee-interactions.js` — Trusted carousel controls/mobile interactions.
- `admin/editor/` — protected visual editor.
- `PROJECT_STATUS.md` — master roadmap and handoff.

## Critical routes / endpoints

Public:

- `/`
- `/en/`
- `/es-co/`
- `/theatre-sound-design-audio-post`
- `/privacy`
- SEO/service/rental landings in the repository

API:

- `GET /api/health`
- `GET /api/content/hero`
- `GET /api/content/trusted`
- Admin content endpoints under `/api/admin/...`
- Admin media status/upload endpoints under `/api/admin/media/...`
- `POST /api/contact`
- `POST /api/rental`

## Operational invariants

- Brand spelling is exactly **SD.Live**.
- Descriptor is **Creative Audio**.
- Canonical tagline: **Creative Audio. Technical systems. Built for the show.**
- Visible `SD.Live` mentions should use the floating-dot wordmark when appropriate; metadata/machine strings stay literal.
- WLive remains visible.
- Rental is Colombia-first and hidden by default for International visitors.
- Rental notifications go **only to `rental@sdlive.show`**.
- General Contact notifications go to `hello@sdlive.show`.
- Rental pricing is server-side.
- Cloudflare Access is the real Admin access layer.
- GTM is for consent/analytics/events, not navigation, branding or layout.
- GitHub is source-of-truth for code, D1 for structured CMS content, R2 for editor-managed media.
- Do not restore Netlify, the old Owner Access mockup, `site-runtime`, or GTM-driven navigation.

## Tests

```text
npm test
```

The test suite uses Node's built-in test runner and GitHub Actions runs it on pull requests and main.

## Development workflow

Use short-lived branches from current `main`:

```text
main
  ↓
feature/fix/docs branch
  ↓
Pull Request
  ↓
checks + deploy validation
  ↓
Squash and merge
  ↓
production smoke test
```

Do not treat a feature-branch deployment as production. `sdlive.show` represents the active `main` deployment unless Cloudflare explicitly exposes a preview URL.

After a material milestone is completed, update `PROJECT_STATUS.md` and update this README when architecture or operation changes. Do not create documentation commits for every micro-fix.

## Current next gate

**P2.1.2 — Trusted By media integration.**

Add Upload / Replace and visual logo scaling in the Editor, migrate Trusted By + Supported Brands media to R2, validate Draft/Publish behavior, then bind Published Trusted By to the public Home using the established SSR/fallback pattern.