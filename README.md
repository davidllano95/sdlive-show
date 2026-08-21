# SD.Live

Production website and back-office for **SD.Live — Creative Audio**.

Production: `https://sdlive.show`  
Public media: `https://media.sdlive.show`

The public site is a vanilla HTML/CSS/JS frontend served by Cloudflare Workers Static Assets. Dynamic APIs, CMS publishing, forms and edge rendering run in Cloudflare Workers. D1 stores structured CMS content and R2 stores editor-managed media.

For current progress, roadmap, invariants and the next gate, read **`PROJECT_STATUS.md` first**.

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
- **API Worker:** `worker.js` plus section APIs such as `trusted-api.js` and `testimonials-api.js`.
- **Visual safeguard layer:** `visual-safeguards.css` + `visual-safeguards.js`, injected on the public Home by `worker-router.js` and controllable/diagnosable from the Editor.
- **Admin:** `/admin/` behind Cloudflare Access.
- **Analytics:** GTM + GA4 with consent gating.
- **Forms:** Turnstile + D1 + Resend.
- **Languages:** EN / ES with persisted preference and server-side first-paint resolution.
- **Markets:** Colombia / International behavior.

## Content ownership

```text
GitHub
  code, CSS/JS, critical branding and static fallback assets

D1
  Draft/Published text, ordering, associations and media metadata

R2
  editor-managed logos, photos and other replaceable content imagery
```

Critical branding such as the primary SD.Live logo, favicon/app icons and essential fallbacks remain versioned with the code. CMS-managed media is migrated progressively to R2.

## CMS state

### Hero

Hero Draft/Published is fully connected to production. Published content is rendered at the Cloudflare edge before first paint, with the static HTML as fallback if D1 is unavailable or invalid.

### Trusted By / Brands Supported Through

**Production milestone completed.** Trusted By now has:

- Draft and Published state in D1;
- client/reveal editing, ordering and WLive protection;
- Upload/Replace of Trusted and Supported Brand media through authenticated R2 upload;
- visual logo scaling and Supported Brand placement metadata;
- migrated Trusted By / Supported Brands media served from `media.sdlive.show`;
- Published → public Home server-side rendering with static fallback;
- Draft isolation from the public site;
- EN/ES switching without rebuilding the live carousel;
- carousel pause/play, arrows, mobile swipe and stable hover behavior;
- production-validated `Save Draft ≠ live` and `Publish = live` semantics.

### Testimonials

**Implemented in P2.3; production smoke remains the rollout gate until the PR is deployed.** The Testimonials block follows the same established CMS contract:

- schema/default seed based on the current Manuel Matamoros / WLive testimonial;
- Draft, Published and revision history in D1;
- EN/ES heading, name, role/company and quote editing;
- add, delete and reorder testimonials;
- per-testimonial public visibility and featured-card controls;
- exact Select-from-preview routing in the Admin;
- optional company/partner logo Upload/Replace/Remove through authenticated R2 upload;
- visual logo scaling stored as metadata rather than derivative images;
- Published → public Home edge SSR using only `published_json`;
- static public markup as fallback when Published content is missing or invalid;
- Admin iframe isolated from Published SSR so the working Draft stays local.

The rollout gate is the same one already proven on Trusted: visual EN/ES + Desktop/Mobile smoke, then verify `Save Draft ≠ live` and `Publish = live` in production.

## Visual safeguards / aesthetic invariants

Established production aesthetics are a **site contract**, not incidental CSS. CMS/editor work must preserve them unless a visual change is explicitly approved.

The public Home loads `visual-safeguards.css` + `visual-safeguards.js` after the main styling path. This small guard layer intentionally reasserts only critical stable behaviors that are especially vulnerable to DOM rebuilds, stacking-context changes or section CMS work:

- glass surfaces;
- aurora ambience;
- reveal-on-scroll motion;
- Trusted and Testimonials card sheen/highlight;
- Trusted carousel motion;
- Supported Brand reveal motion;
- established primary/ghost CTA hover treatments.

The previous live-carousel stability workaround had explicitly suppressed the Trusted hover sheen to avoid a Safari compositor hitch. That suppression is removed. The protected sheen now sweeps by animating `background-position` rather than translating a child layer, preserving the established highlight while avoiding the transformed-child interaction that could disturb the moving marquee.

The Site Editor exposes a **Safeguards** panel with live diagnostics, per-layer protection state and **Restore all defaults**. Editor toggles affect preview protection only; they are not saved into a content Draft. Production always loads the safeguard layer enabled by default. The runtime also restores its stylesheet/root guard state if a CMS rebuild removes them accidentally.

Automated tests lock the guard assets, public injection, Editor control panel and critical selectors/keyframes. Future CMS PRs should extend the guard registry/tests when they introduce another established visual system that must survive content reconstruction.

This is a failsafe for the known class of CSS/DOM/editor regressions; it does not replace visual smoke testing and cannot guarantee recovery from arbitrary broken JavaScript or a completely failed deployment.

## R2 media rules

- Bucket: `sdlive-media-production`.
- Storage class: **Standard**.
- Public domain: `https://media.sdlive.show`.
- Public Development URL / `r2.dev`: disabled.
- Admin uploads go through authenticated Worker endpoints.
- Public reads use the custom domain/CDN directly rather than proxying each image through a Worker.
- Upload keys are versioned for long-lived immutable caching.
- Visual resize/position belongs in D1/CSS metadata; moving a slider does not create a new R2 object.
- Do not enable paid media products or extra R2 features unless explicitly approved.

Trusted media is already migrated. Testimonials now has its own R2 upload folder for editable logos. Later media migrations should happen section-by-section: Portfolio / Selected Work, Rental imagery, Insights/blog and other content that becomes CMS-managed. GitHub originals should only be removed after production validation and only when they are not required as critical fallbacks.

## Important files

- `index.html` — main public Home shell and static fallback content.
- `styles.css` — main public styles.
- `visual-safeguards.css` / `visual-safeguards.js` — self-healing baseline for established visual contracts.
- `script.js` — primary public UI/runtime behavior.
- `worker-router.js` — top-level Worker router; section SSR, public visual safeguards, and Trusted/Testimonials/media API routing.
- `worker-entry.js` — Hero edge rendering and base routing.
- `worker.js` — base CMS/admin APIs, Contact, Rental, D1 and email logic.
- `trusted-edge.js` — validates and renders Published Trusted By at the edge.
- `trusted-published-runtime.js` — small public runtime for CMS Trusted placement/language stability.
- `trusted-api.js` / `trusted-content.js` — Trusted Draft/Published API and schema/default content.
- `testimonials-edge.js` — validates and renders Published Testimonials at the edge.
- `testimonials-api.js` / `testimonials-content.js` — Testimonials Draft/Published API and schema/default content.
- `media-api.js` — authenticated R2 media status/upload API.
- `trusted-marquee-interactions.js` — Trusted carousel controls/mobile interactions.
- `admin/editor/` — protected visual editor, including `testimonials-editor.js` and `visual-safeguards-editor.js`.
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
- `GET /api/content/testimonials`
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
- Established production aesthetics are protected visual contracts; CMS/editor changes must preserve them unless an explicit redesign is approved.
- The public Home must keep the visual safeguard layer enabled; Editor preview may inspect/toggle individual protection layers but those controls are not content state.
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
```

Do not treat a feature-branch deployment as production. `sdlive.show` represents the active `main` deployment unless Cloudflare explicitly exposes a preview URL.

After a material milestone is completed, update `PROJECT_STATUS.md` and this README when architecture or operation changed.

## Current next gate

**P2.3 production validation.**

Deploy the completed Testimonials CMS block, validate the restored Trusted sheen + visual safeguards first, then validate Testimonials in EN/ES and Desktop/Mobile and confirm `Save Draft ≠ live` / `Publish = live`. After that, move to Services in the next larger implementation block.

Non-blocking Editor polish remains in backlog, including the small left-navigation alignment offset when jumping to Trusted By.
