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

Current verified `main` before this docs-only follow-up:

`5b709f5cb3a7923d25ac1f8062ae3458b02fc806`

This is squash-merged PR #226, **Refresh Assistant rollout docs after backend deployment**. Runtime code remains the backend integrated by PR #225; post-merge CI on `main` is PASS.

### Closed / production-smoked

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
- Assistant backend integration PR #225 — MERGED / CI PASS / deployed with public kill switch OFF.

Canonical Lead Core statuses:

- `new`
- `contacted`
- `quoted`
- `confirmed`
- `lost`

Relevant Lead sources:

- `contact`
- `rental`
- `assistant`

Canonical service categories:

- `live`
- `theatre`
- `sound_design`
- `systems`
- `rental`
- `other`

## Current Active Gate — Assistant runtime readiness verification

The Assistant backend is deployed and the public Assistant remains **OFF**.

The first authenticated production runtime-readiness probe reported:

- `readyForRuntimeConfiguration: false`
- `readyForPublicEnablement: false`
- `ASSISTANT_PUBLIC_ENABLED`: disabled / defaults OFF
- rate limiter: ready
- D1 binding: ready
- notification configuration: ready
- Turnstile server secret: ready

It identified four missing bindings:

- `ASSISTANT_SESSION_KEY`
- `ASSISTANT_TURNSTILE_SITE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_ASSISTANT_MODEL`

As of the latest owner action on 2026-09-02, all four have been entered in Cloudflare, but this is **owner-reported configuration only until a new authenticated readiness probe verifies them**.

Do **not** enable `ASSISTANT_PUBLIC_ENABLED` yet.

### Turnstile warning to investigate before public enablement

Cloudflare Turnstile currently displays this warning for the existing **SD.Live Forms** widget:

`Siteverify isn't being called for SD.Live Forms`

This must be investigated before final Assistant public enablement. Do not assume yet whether it is a Cloudflare detection false positive or a real server-side validation gap. Verify the actual Contact/Rental Turnstile token-validation path and, if necessary, fix it without weakening the Assistant's separate Turnstile boundary.

### Storage gate — CLOSED/PASS

Production storage preflight is fully ready:

- `leads.canInsertAssistantLead: true`
- `privacyConsents.canRecordAssistantConsent: true`
- `idempotency.ready: true`
- `readyForAssistantLeadCapture: true`

The physical Lead migration preserved existing IDs/data and legacy `project` Lead type while adding `assistant` and making email nullable. Privacy now accepts `assistant`, and canonical `assistant_effect_reservations` exists.

### Superseded PRs

- #213 — CLOSED WITHOUT MERGE; superseded by final backend PR #225.
- #216 — CLOSED WITHOUT MERGE; superseded by final storage preparation PR #224.
- #218 — CLOSED WITHOUT MERGE / TEMP VALIDATION ONLY; do not reopen.

### PR #215 — public widget

- OPEN / DRAFT / UNMERGED.
- Built on the older #213 lineage and must be reverified/rebased onto current `main` before integration.
- Must remain unmerged until runtime readiness is fully green with public flag OFF.
- Must be merged with public flag OFF, followed by explicit enablement and final E2E.

### PR #191 — WhatsApp owner control

- OPEN / separate Availability workstream.
- Do not touch unless explicitly reprioritized.

## SD.Live Assistant architecture

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries:

- public kill switch `ASSISTANT_PUBLIC_ENABLED`, OFF unless exactly `true`;
- OpenAI Responses API with strict Structured Outputs and `store:false`;
- sealed AES-GCM stateless structured session; no transcript persistence/provider conversation state;
- Assistant cannot impersonate Samuel;
- no invented or negotiated prices;
- no Availability promise without deterministic backend truth;
- no second Rental catalog/pricing source;
- no Finance reads/writes unless deliberately designed later;
- explicit privacy consent only;
- no public schema migration;
- no owner phone/secrets/provider bodies exposed.

## Source-of-truth matrix

| Concern | Source of truth |
|---|---|
| Code/CSS/JS/critical branding/fallbacks | GitHub `main` |
| Structured CMS Draft/Published | D1 |
| Public CMS content | validated D1 Published |
| Editor-managed media binary | R2 |
| Rental pricing / quote calculation | backend pricing logic |
| Public analytics | GA4/GTM after consent |
| Admin access | Cloudflare Access |
| Operations/finance persistence + formulas | Google Sheets `REGISTRO` |
| Offline capture/workflow | AppSheet SD.Live Track |
| Finance Admin analytics | read-only Worker view over Sheets/API |
| Website-only Calendar presentation overrides | D1 `site_schedule_state` |
| Google Calendar secondary projection / read-only overlay | `sam@sdlive.show` |
| Automatic public Show Day | Site Schedule + America/Bogota date |
| Availability / reachability | D1 Availability Core |
| Leads | SD.Live Lead Core in D1 |
| Assistant runtime state | sealed SD.Live-owned structured session, not provider-side conversation state |

## Change workflow

Runtime changes:

`inspect current main → short branch → implement/update → tests/CI → PR → CI green → squash merge → exactly one representative production smoke`.

Docs-only changes:

`branch → docs → tests/CI → PR → CI green → squash merge`.

No production smoke for docs-only PRs.

Manual QA with the owner: **one action at a time**.

## Exact continuation

1. Run one authenticated `GET /api/admin/assistant/readiness` now that the four runtime bindings have been entered.
2. Require `readyForRuntimeConfiguration:true`, all runtime dependencies ready, `missingBindings:[]`, `invalidBindings:[]`, while `publicExposure.enabled:false`.
3. Investigate the Cloudflare **SD.Live Forms / Siteverify** warning before final public enablement; determine whether Contact/Rental token verification is actually reaching Siteverify.
4. Reverify/rebase #215 onto current `main`, run CI, and merge the widget while the flag remains OFF.
5. Only after widget integration PASS and the Turnstile warning has been dispositioned, explicitly enable `ASSISTANT_PUBLIC_ENABLED=true`.
6. Perform final Assistant E2E one manual action at a time.

## Relevant docs

- `PROJECT_STATUS.md` — master current state and exact continuation.
- `docs/checkpoints/handoff-assistant-rollout-2026-09-02.md` — latest Assistant rollout checkpoint.
- `docs/checkpoints/handoff-availability-v1-closeout-2026-09-01.md` — Availability closeout.
- `docs/roadmap/availability-aware-contact-widget.md` — Availability/Assistant contract.
- `ROADMAP_MASTER_CHECKLIST.md` — reconciled backlog and rollout checklist.
