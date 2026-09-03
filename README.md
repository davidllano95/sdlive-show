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
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older prompts/ideas/references.

**Stability > novelty.** `UNMERGED != PRODUCTION`, and `CI PASS != PRODUCTION SMOKE PASS`.

## Current state — 2026-09-03

Current runtime baseline:

`c52a06603c0a6b5cd0cc4425cca11f69cce693d7` — PR #244.

### Closed/PASS

- Availability Core v1.
- Lead Core through PR #190.
- Assistant storage/backend/runtime/public widget.
- Public Assistant activation (`ASSISTANT_PUBLIC_ENABLED=true`).
- Assistant full production E2E rollout.
- SD.Live Forms Turnstile Siteverify disposition.
- Existing Contact and Rental form continuity after Assistant rollout.

Canonical Lead statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`.

Relevant Lead sources: `contact`, `rental`, `assistant`.

Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

## Assistant rollout — CLOSED / PRODUCTION PASS

The Assistant is public and the rollout is complete. Final evidence is recorded in:

`docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md`

Production acceptance covered:

- Safari multi-turn continuity;
- deterministic persistence of `venue=TBD`;
- Enter sends / Shift+Enter newline;
- SD.Live-branded desktop messaging shell;
- mobile layout and Spanish interaction;
- Turnstile inline security state and once-per-session behavior;
- explicit privacy consent with no inference;
- one QA Assistant Lead (#26) persisted and visible in Admin;
- privacy consent persistence and atomic idempotency effect;
- Resend/handoff notification to `hello@sdlive.show`;
- reload retry without duplicate Lead;
- deterministic Availability matching the public `AVAILABLE NOW / WhatsApp` state;
- Rental fail-closed behavior for over-limit, unknown and known catalog items;
- no invented Rental price or inventory claim;
- Contact and Rental forms still submit normally.

Recent rollout PRs include #231, #235, #236–#244. The current widget uses the site palette and official SD.Live symbol; the old green/olive visual debt is closed.

## SD.Live Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries:

- public kill switch remains reversible;
- OpenAI Responses API with strict Structured Outputs and `store:false`;
- sealed AES-GCM stateless structured session; no full transcript persistence/provider conversation state;
- Turnstile required to establish a new Assistant session; authenticated sealed session handles later turns;
- no impersonation of Samuel;
- no invented/negotiated prices;
- no Availability promise without deterministic backend truth;
- no second Rental catalog/pricing source;
- no Finance reads/writes by the Assistant;
- explicit privacy consent only;
- no public schema migration;
- no owner phone/secrets/provider bodies exposed.

## Current Active Gate — #191 WhatsApp owner control for Availability

PR #191 remains open and unmerged. It is now the next operational workstream.

Do **not** merge the existing old branch directly. Reconstruct/reverify the bounded scope on current `main`, preserving:

- Meta webhook HMAC signature verification;
- exact owner sender + `phone_number_id` allowlisting;
- D1 message-id idempotency / in-flight duplicate protection;
- existing transport-neutral Availability parser;
- canonical Availability write path;
- server-side owner phone/token/app-secret handling;
- deterministic confirmations through Meta Cloud API.

Meta/Cloudflare onboarding and secrets must be completed before activation. Then: CI green → squash merge → one representative production smoke.

## Work order after #191

1. Rental real-time availability + double-booking protection.
2. Mobile Rental Cart total/sticky summary.
3. Rental quote/PDF automation + shared Finance Document Generator foundation.
4. Calendar/Projects workflow additions.
5. SD.Live Patch.
6. CRM/Admin Inbox/analytics/SEO/performance/accessibility/CMS advanced backlog.

## Turnstile Forms warning — dispositioned PASS

Contact/Rental send `turnstileToken`; the Worker verifies Cloudflare Siteverify, hostname and expected action before downstream consent/Lead behavior. A production probe reached the downstream privacy-consent gate, proving Siteverify had passed. Treat the old Cloudflare dashboard warning as stale/incomplete detection unless future runtime evidence contradicts it.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only:

`branch → docs → tests/CI → PR → CI green → squash merge`.

No production smoke for docs-only PRs. Manual QA with the owner: **one action at a time**.

## Exact continuation

**Assistant rollout is closed. Inspect PR #191 against current `main`, reconstruct only the still-valid WhatsApp owner-control scope on a fresh branch, and do not merge the stale branch directly.**

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md` — final Assistant rollout closeout.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order and backlog.
