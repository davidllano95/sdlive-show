# SD.Live

Production website and private Control Center for **SD.Live — Creative Audio**.

- Production: `https://sdlive.show`
- Public media: `https://media.sdlive.show`
- Operational timezone: **America/Bogota** unless explicitly labelled otherwise.

The public site is vanilla HTML/CSS/JS served through Cloudflare Workers + Static Assets. Workers own dynamic APIs, CMS publishing, forms and edge rendering. D1 stores structured CMS/application state, R2 stores editor-managed media, Google Sheets `REGISTRO` remains the operations/finance persistence source of truth, AppSheet **SD.Live Track** remains the mobile/offline workflow client, and Cloudflare Access protects Admin.

## Source precedence

When docs disagree, use:

1. current GitHub `main` + verified production behavior;
2. current schema/configuration;
3. latest dated handoff/checkpoint;
4. `PROJECT_STATUS.md`;
5. this README;
6. `ROADMAP_MASTER_CHECKLIST.md` for historical/future backlog;
7. older prompts/ideas/references.

**Stability > novelty.** `UNMERGED != PRODUCTION`, and `CI PASS != PRODUCTION SMOKE PASS`.

## Current state — 2026-09-02

Current verified runtime `main` before this docs-only reconciliation:

`6ef4c1990a8e4903b38f6fefb334d307634119f8`

This is squash-merged PR #228, **Integrate gated Assistant public widget on current main**. PR CI PASS and post-merge `main` Tests #626 PASS.

### Closed / production-verified

- Finance read-only integration and `/admin/finance/` — operational / production-smoked PASS.
- Admin Calendar + controlled create + multi-day operations — CLOSED/PASS.
- Site Schedule + automatic Show Day + Location — CLOSED/PASS.
- Admin Show Day `Auto / Force On / Force Off` — CLOSED/PASS.
- Admin desktop/mobile stabilization — CLOSED/PASS.
- Public post-integration visual stabilization — CLOSED/PASS.
- Rental image-editor parity — CLOSED/PASS through PR #157.
- Availability Core v1 — CLOSED/PASS.
- Lead Core Admin workflow through PR #190 — CLOSED/PASS.
- Assistant Lead physical schema migration — CLOSED/PASS in production.
- Assistant storage gate (`leads`, `privacy_consents`, idempotency) — CLOSED/PASS in production.
- Assistant backend PR #225 — MERGED / CI PASS / deployed.
- Assistant runtime configuration — PASS in production with all dependencies ready.
- Assistant public widget PR #228 — MERGED / CI PASS / deployed but hidden because the public kill switch remains OFF.

Canonical Lead Core statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`.

Relevant Lead sources: `contact`, `rental`, `assistant`.

Canonical service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

## Current Active Gate — Turnstile runtime verification before public enablement

The Assistant backend and widget are now deployed, but the public Assistant remains **OFF**.

The authenticated production readiness probe after runtime configuration returned:

- `readyForRuntimeConfiguration: true`
- all `dependencies.*.ready: true`
- `missingBindings: []`
- `invalidBindings: []`
- `publicExposure.enabled: false`
- `readyForPublicEnablement: false` only because `ASSISTANT_PUBLIC_ENABLED` remains OFF

Production smoke after PR #228 also PASS: with the public flag OFF, the Assistant launcher/widget is not rendered publicly.

Do **not** enable `ASSISTANT_PUBLIC_ENABLED` yet.

### Turnstile warning — mandatory final security gate

Cloudflare Turnstile displays this warning for the existing **SD.Live Forms** widget:

`Siteverify isn't being called for SD.Live Forms`

Repository inspection confirms the existing Contact/Rental implementation does contain a real server-side Siteverify path:

- browser obtains the Turnstile token and includes `turnstileToken` in Contact/Rental payloads;
- `worker.js` posts the token to Cloudflare `/turnstile/v0/siteverify`;
- server requires `hostname === "sdlive.show"`;
- Contact requires Turnstile action `contact`;
- Rental requires Turnstile action `rental`;
- failed Turnstile verification returns before Lead creation.

Therefore the warning is **not explained by missing Siteverify code**. It is still unresolved at runtime: we must prove that a real production token from the existing widget reaches Siteverify and is associated correctly before calling the warning a false positive or enabling the Assistant publicly.

The next verification must be non-destructive: generate a valid Contact Turnstile token, let the server verify it, then intentionally fail later request validation so no Lead is created.

### Assistant widget — PR #228

PR #228 is the clean reconstruction of the old #215 widget scope on current `main`.

It includes:

- Contact-section launcher; no second persistent floating CTA;
- desktop modal / mobile bottom sheet;
- EN/ES runtime copy;
- in-memory-only conversation and sealed session token;
- explicit Turnstile render/reset per browser operation;
- current `/api/assistant` request contract;
- server-owned privacy consent prompt/actions;
- deterministic email/WhatsApp fallback without owner phone exposure;
- rendering only when both `ASSISTANT_PUBLIC_ENABLED=true` and a valid `ASSISTANT_TURNSTILE_SITE_KEY` are present.

Old PR #215 is **CLOSED WITHOUT MERGE / superseded by #228**. Do not reopen it.

### Superseded / held Assistant work

- #213 — CLOSED WITHOUT MERGE; superseded by #225.
- #215 — CLOSED WITHOUT MERGE; superseded by #228.
- #216 — CLOSED WITHOUT MERGE; superseded by #224.
- #218 — CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY; do not reopen.
- #191 — separate Availability owner WhatsApp workstream; do not touch unless explicitly reprioritized.

## SD.Live Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries:

- `ASSISTANT_PUBLIC_ENABLED` OFF unless exactly `true`;
- OpenAI Responses API with strict Structured Outputs and `store:false`;
- sealed AES-GCM stateless structured session; no full transcript persistence/provider conversation state;
- no impersonation of Samuel;
- no invented/negotiated prices;
- no Availability promise without deterministic backend truth;
- no second Rental catalog/pricing source;
- no Finance writes;
- explicit privacy consent only;
- no public schema migration;
- no owner phone/secrets/provider bodies exposed.

## Change workflow

Runtime changes:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only changes:

`branch → docs → tests/CI → PR → CI green → squash merge`.

No production smoke for docs-only PRs. Manual QA with the owner: **one action at a time**.

## Exact continuation

1. Keep `ASSISTANT_PUBLIC_ENABLED` OFF.
2. Perform one non-destructive production validation proving a real token from **SD.Live Forms** reaches server-side Siteverify without creating a Lead.
3. Re-check/disposition the Cloudflare Siteverify warning.
4. Only when that security gate is clean, explicitly enable `ASSISTANT_PUBLIC_ENABLED=true`.
5. Perform final Assistant E2E one manual action at a time, including normal reply, deterministic Availability/Rental behavior, consent, exactly one Lead, notification, duplicate protection, mobile/desktop and EN/ES.

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-assistant-rollout-2026-09-02.md` — latest Assistant rollout checkpoint.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled backlog and rollout checklist.
