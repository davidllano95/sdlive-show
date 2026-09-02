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

Current runtime baseline:

`bf93bbbf9f707abea22105753c9d424b82a68b27` — PR #231.

Assistant milestones:

- Availability Core v1 — CLOSED/PASS.
- Lead Core through PR #190 — CLOSED/PASS.
- Assistant storage — CLOSED/PASS in production.
- Assistant backend PR #225 — MERGED / CI PASS / deployed.
- Assistant runtime configuration — PASS; no missing/invalid bindings.
- `ASSISTANT_PUBLIC_ENABLED=true` in production.
- Assistant public widget PR #228 — MERGED / deployed; launcher visible and Turnstile verifies.
- SD.Live Forms Turnstile Siteverify — PRODUCTION PASS.
- First real OpenAI Assistant turn — PASS after API credits were added.
- PR #231 — MERGED / PR CI PASS / `main` CI PASS; fixes Safari Turnstile refresh deadlock between turns.
- Current manual gate — Safari second-turn/session-continuity smoke.

Canonical Lead statuses: `new`, `contacted`, `quoted`, `confirmed`, `lost`.

Relevant Lead sources: `contact`, `rental`, `assistant`.

Service categories: `live`, `theatre`, `sound_design`, `systems`, `rental`, `other`.

## Current Active Gate — Assistant second turn/session continuity

The Assistant is public. The first real turn already passed. The remaining immediate gate comes from a Safari-specific post-turn deadlock observed before PR #231:

- browser still showed Turnstile `Success!`;
- the token had already been consumed internally;
- Send stayed disabled;
- `Enviando…` remained visible;
- a second turn could not be submitted.

PR #231 replaced `turnstile.reset(widgetId)` with a full `turnstile.remove(widgetId)` + container rebuild + fresh widget/token, and clears stale sending status on success/error/network failure.

The first CI run (#631) failed only because a legacy contract test still asserted `turnstile.reset(widgetId)`. The assertion was updated to the new required contract; PR Tests #632 passed and `main` Tests #633 passed after squash merge.

Security boundaries were not relaxed.

### One manual smoke now

In Safari, run one successful first turn, then confirm:

- `Enviando…` clears;
- Turnstile visibly regenerates;
- Send becomes available again;
- this second turn can be sent:

`The show is October 17, 2026. Venue is still TBD. I need sound design and FOH, with rehearsal on October 16 from 2–8 PM. What else do you need?`

The answer must retain **theatre show + Bogotá** from the first turn without requiring the user to repeat it.

If this passes: `SESSION CONTINUITY = PASS`, then finish the remaining Assistant E2E gates before starting another milestone.

## Turnstile warning — dispositioned PASS

Cloudflare previously displayed `Siteverify isn't being called for SD.Live Forms`.

Code inspection established that Contact/Rental send `turnstileToken`, the Worker calls Cloudflare Siteverify, validates `hostname === "sdlive.show"`, validates the expected action (`contact` / `rental`), and rejects failed verification before Lead persistence.

A real production Contact token submitted without privacy consent returned:

`{"ok":false,"error":"Privacy consent is required"}`

Because privacy validation occurs after Turnstile validation, this proves the live request passed server-side Siteverify and reached the later consent gate. No Lead was intentionally created.

**Disposition:** treat the dashboard warning as stale/incomplete detection/association unless later runtime evidence contradicts this proof.

## Assistant public widget

PR #228 reconstructed the widget cleanly on current `main` rather than merging obsolete #215 lineage. It provides:

- Contact-section launcher only;
- desktop modal / mobile bottom sheet;
- EN/ES runtime copy;
- in-memory conversation only;
- sealed session token;
- Turnstile required per browser operation;
- current `/api/assistant` wire contract;
- server-owned explicit privacy consent actions;
- deterministic human fallbacks without owner-phone exposure.

Known non-blocking visual debt: the launcher/widget still uses green/olive tones that should later be aligned with the current violet SD.Live palette. Keep this after functional E2E closeout.

## Open PR state / work order

Obsolete preparatory Assistant PRs #192–#212 are CLOSED WITHOUT MERGE. Old #213, #215, #216 and temporary #218 are also closed/superseded and must not be reopened.

After #231 merge, exactly one operational PR remains open:

- **#191 — authenticated WhatsApp owner control for Availability.** It is the next workstream **after the Assistant rollout is fully closed**. Its old branch must be reverified/reconstructed on then-current `main` before merge; Meta/Cloudflare onboarding remains part of activation.

Current order:

1. finish Assistant second-turn/session continuity and remaining E2E gates;
2. close/document Assistant rollout;
3. resume #191;
4. continue prioritized roadmap backlog.

## SD.Live Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries:

- public kill switch remains reversible;
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

1. Run the Safari second-turn/session-continuity smoke for PR #231.
2. If PASS, finish the remaining Assistant E2E gates: explicit consent, exactly one Assistant Lead, idempotency/effects, handoff/notification, deterministic pricing/Availability boundaries, Contact/Rental continuity and mobile smoke if needed.
3. Close/document Assistant rollout.
4. Resume PR #191 as the next operational workstream.

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-assistant-rollout-2026-09-02.md` — latest Assistant rollout checkpoint.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled work order and backlog.
