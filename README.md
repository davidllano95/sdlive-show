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

GitHub `main` head at this handoff:

`a5bffc66e711af23f2df01cd440aa0d43344d632`.

Last verified runtime baseline:

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

## Current Active Gate — #246 WhatsApp owner control for Availability

The old PR #191 has been inspected and is now **historical source material only**. Do not merge its stale branch directly.

The live implementation work is:

- PR **#246 — Rebuild verified-owner WhatsApp Availability control**;
- branch `feature/whatsapp-owner-control-current-main-20260903`;
- head at handoff `fd4a00929b3bd02c5cc3da0b7338bf90faea911c`;
- **OPEN / UNMERGED / CI RED**;
- GitHub Actions **Tests #673 = FAILURE** in `Run tests`;
- because it is unmerged, #246 has not changed production.

#246 reconstructs the bounded feature on current architecture while preserving:

- raw-body Meta webhook HMAC SHA-256 verification;
- exact owner sender + `phone_number_id` allowlisting;
- durable D1 message-id idempotency / reply retry behavior;
- existing transport-neutral Availability owner parser;
- canonical `handleAvailabilityApi` write path;
- hard `WHATSAPP_OWNER_CONTROL_ENABLED` kill switch;
- Access-protected storage preparation/readiness;
- **no public D1 DDL**;
- fail-closed behavior if required schema is missing;
- server-side owner phone/token/app-secret handling;
- deterministic confirmations through Meta Cloud API;
- no AI and no Finance/Contact/Rental/Calendar/Show Day/Assistant scope expansion.

Do **not** configure Meta/Cloudflare rollout yet. The next step is to inspect Tests #673, recover the exact failing assertions, fix only those contracts, and require green CI before merge.

After green CI: squash merge #246 → verify `main` CI → storage preparation/readiness with kill switch OFF → Meta/Cloudflare onboarding → callback verification/subscription → readiness → enable flag → exactly one representative production smoke → return Availability to AUTO. Close #191 without merge as superseded only after #246 is validated/merged.

Detailed checkpoint:

`docs/checkpoints/handoff-whatsapp-owner-control-pr246-2026-09-03.md`

## Work order after #246

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

**Resume PR #246 exactly where it is: CI is red at Tests #673. Extract the exact failing assertions, fix only those contracts on `feature/whatsapp-owner-control-current-main-20260903`, rerun CI, and do not merge or touch Meta/Cloudflare rollout configuration until CI is green.**

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-whatsapp-owner-control-pr246-2026-09-03.md` — current WhatsApp owner-control handoff.
- `docs/roadmap/whatsapp-owner-control.md` — #246 architecture and rollout contract.
- `docs/checkpoints/handoff-assistant-rollout-closeout-2026-09-03.md` — final Assistant rollout closeout.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order and backlog.
