# SD.Live

Production website and back-office for **SD.Live — Creative Audio**.

Production: `https://sdlive.show`

The public site is a vanilla HTML/CSS/JS frontend served by Cloudflare Workers Static Assets. Dynamic APIs, CMS publishing, forms and edge rendering run in the Cloudflare Worker with D1 as the application database.

For current progress, roadmap, invariants and the next gate, read **`PROJECT_STATUS.md` first**.

## Current architecture

- **Frontend:** vanilla HTML, CSS and JavaScript.
- **Hosting/runtime:** Cloudflare Workers + Static Assets.
- **Database:** Cloudflare D1 binding `CMS_DB` → `sdlive-cms-production`.
- **Worker entry:** `worker-entry.js`.
- **API Worker:** `worker.js`.
- **Admin:** `/admin/` behind Cloudflare Access.
- **Analytics:** GTM + GA4 with consent gating.
- **Forms:** Turnstile + D1 + Resend.
- **Languages:** EN / ES with persisted preference.
- **Markets:** Colombia / International behavior.

## Hero CMS flow

The Home Hero is the first production CMS block.

Published content is **server-rendered at the Cloudflare edge before first paint**:

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

## Important files

- `index.html` — main public Home shell and static fallback content.
- `styles.css` — main public styles.
- `script.js` — primary public UI/runtime behavior.
- `worker-entry.js` — edge HTML rendering + routing wrapper.
- `worker.js` — CMS/admin APIs, Contact, Rental, D1 and email logic.
- `hero-content.js` — Hero client resilience path and Admin-preview isolation.
- `cms-hydration.js` — hydration/fallback state utility.
- `home-navigation.js` — Home navigation and Hero binding loader.
- `analytics-consent.js` — analytics consent bootstrap before GTM.
- `privacy-consent.js` — privacy UI/authorization behavior.
- `admin/` — protected back office.
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
- Admin Hero endpoints under `/api/admin/...`
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
- Do not restore Netlify, the old Owner Access mockup, `site-runtime`, or GTM-driven navigation.

## Development workflow

Use short-lived branches from current `main`:

```text
main
  ↓
feature/fix/docs branch
  ↓
Pull Request
  ↓
checks + Cloudflare preview/deploy validation
  ↓
Squash and merge
  ↓
production smoke test
```

Do not treat a feature-branch deployment as production. `sdlive.show` represents the active `main` deployment unless Cloudflare explicitly exposes a preview URL.

After a material milestone is completed, update `PROJECT_STATUS.md`. Do not create documentation commits for every micro-fix.

## Current next gate

**P1.4 — tests mínimos + CI.**

Before expanding CMS editing to Trusted By, Testimonials, Services or Portfolio, add a lightweight automated test layer covering Hero Published/fallback behavior, language resolution, Admin-preview isolation and critical API regressions.
