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

## Current state — 2026-09-02

Runtime baseline before this docs-only reconciliation:

`d1db8019deadc5d84fba9604de7a36f64658aba7` — PR #229.

Current Assistant milestones:

- Availability Core v1 — CLOSED/PASS.
- Lead Core through PR #190 — CLOSED/PASS.
- Assistant storage — CLOSED/PASS in production.
- Assistant backend PR #225 — MERGED / CI PASS / deployed.
- Assistant runtime configuration — PASS; no missing or invalid bindings.
- Assistant public widget PR #228 — MERGED / CI PASS / deployed but hidden while the public kill switch is OFF.
- SD.Live Forms Turnstile Siteverify path — **PRODUCTION PASS** through a non-destructive Contact probe.

Canonical Lead statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`.

Relevant Lead sources: `contact`, `rental`, `assistant`.

Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

## Current Active Gate — final Assistant public enablement

The Assistant backend, storage, runtime bindings and public widget are ready. The public Assistant remains intentionally **OFF** because `ASSISTANT_PUBLIC_ENABLED` is absent/false.

Authenticated readiness is green:

- `readyForRuntimeConfiguration:true`;
- all runtime dependencies ready;
- `missingBindings:[]`;
- `invalidBindings:[]`;
- `publicExposure.enabled:false`.

`readyForPublicEnablement:false` is expected while the kill switch is OFF.

### Turnstile warning — dispositioned PASS

Cloudflare had displayed:

`Siteverify isn't being called for SD.Live Forms`

Code inspection already established that Contact/Rental send `turnstileToken`, the Worker calls Cloudflare Siteverify, validates `hostname === "sdlive.show"`, validates the expected action (`contact` / `rental`), and rejects failed verification before Lead persistence.

A real production Contact token was then submitted through the live endpoint while privacy consent was intentionally omitted. The server returned:

`{"ok":false,"error":"Privacy consent is required"}`

Because privacy validation occurs after successful Turnstile validation, this result proves the live request passed the server-side Siteverify boundary and reached the later consent gate. No Lead was intentionally created by this probe.

**Disposition:** the dashboard warning is treated as stale/incomplete Cloudflare detection/association, not an SD.Live missing-Siteverify implementation defect. Reopen only if later runtime evidence contradicts this production proof.

## Assistant public widget

PR #228 reconstructed the widget cleanly on current `main` rather than merging obsolete #215 lineage. It provides:

- Contact-section launcher only;
- desktop modal / mobile bottom sheet;
- EN/ES runtime copy;
- in-memory conversation only;
- sealed session token;
- explicit Turnstile token/reset per browser operation;
- current `/api/assistant` wire contract;
- server-owned explicit privacy consent actions;
- deterministic human fallbacks without owner-phone exposure;
- rendering only when `ASSISTANT_PUBLIC_ENABLED=true` and the site key is valid.

Production flag-OFF smoke PASS: the widget is hidden while disabled.

## Open PR state / work order

The obsolete preparatory Assistant PRs **#192–#212 are CLOSED WITHOUT MERGE**; their validated scope was superseded by the final integrated Assistant backend in #225. Old #213, #215, #216 and temporary #218 are also closed/superseded and must not be reopened.

After cleanup, the repository has exactly **one open operational PR**:

- **#191 — authenticated WhatsApp owner control for Availability.** This is the next workstream after the Assistant public rollout is closed. Its old branch must be reverified/reconstructed on the then-current `main` before merge; Meta/Cloudflare onboarding remains part of activation.

This ordering is deliberate:

1. finish Assistant public enablement + one representative E2E + closeout;
2. resume #191 WhatsApp owner control;
3. then continue prioritized roadmap backlog.

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
- no Finance reads/writes by the Assistant;
- explicit privacy consent only;
- no public schema migration;
- no owner phone/secrets/provider bodies exposed.

## Change workflow

Runtime:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only:

`branch → docs → tests/CI → PR → CI green → squash merge`.

No production smoke for docs-only PRs. Manual QA with the owner: **one action at a time**.

## Exact continuation

1. Explicitly set production `ASSISTANT_PUBLIC_ENABLED=true`.
2. Run one controlled representative Assistant E2E, one manual action at a time, covering a normal conversation through explicit consent and one real QA Lead/handoff while checking deterministic Availability/Rental behavior and no duplicate Lead.
3. Confirm Contact/Rental still operate normally.
4. Close/document the Assistant rollout.
5. Resume PR #191 as the next operational workstream.

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-assistant-rollout-2026-09-02.md` — latest Assistant rollout checkpoint.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order and backlog.
