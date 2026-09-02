# SD.Live Assistant rollout checkpoint — 2026-09-02

## Authority

This checkpoint records the verified rollout state after Assistant storage preparation, final backend integration, production runtime configuration, public-widget integration, Siteverify proof, first real provider turn and PR #231 Turnstile refresh merge on 2026-09-02 America/Bogota.

Source precedence:

1. current GitHub `main` + verified production behavior;
2. current schema/config;
3. latest checkpoint;
4. `PROJECT_STATUS.md`;
5. `README.md`;
6. `ROADMAP_MASTER_CHECKLIST.md`;
7. older docs.

`UNMERGED != PRODUCTION` and `CI PASS != PRODUCTION SMOKE PASS`.

## Current runtime baseline

`bf93bbbf9f707abea22105753c9d424b82a68b27` — squash merge of PR #231.

Current state:

- Availability Core v1 PASS;
- Lead Core PASS;
- Assistant storage PASS;
- backend #225 merged/deployed;
- runtime bindings/readiness PASS;
- `ASSISTANT_PUBLIC_ENABLED=true`;
- authenticated readiness returned `readyForPublicEnablement:true` and `publicExposure.enabled:true`;
- widget #228 merged/deployed and public launcher visible;
- Assistant Turnstile loads/verifies;
- SD.Live Forms Siteverify production proof PASS;
- first real OpenAI Assistant turn PASS after API credits were added;
- Safari second-turn deadlock found;
- PR #231 merged with PR CI PASS and `main` CI PASS;
- production Safari second-turn/session-continuity smoke still pending.

## Availability / Lead Core / storage

Availability Core v1 remains CLOSED/PASS. Do not reopen without regression.

Lead Core remains CLOSED/PASS with statuses `new`, `contacted`, `quoted`, `confirmed`, `lost` and relevant sources `contact`, `rental`, `assistant`.

Assistant storage remains CLOSED/PASS:

- Assistant Lead insert supported;
- email nullable;
- Privacy accepts `assistant`;
- idempotency storage ready;
- `readyForAssistantLeadCapture:true`;
- no final FK violations/stale migration objects.

Relevant final storage PRs: #223 and #224. Old #216 is closed/superseded.

## Assistant backend — PR #225

PR #225 is MERGED / CI PASS / DEPLOYED.

It provides approved EN/ES knowledge/system policy, strict structured output, deterministic Availability/Rental boundaries, sealed stateless session, explicit consent, Turnstile, dedicated rate limiting, idempotent Lead capture, deterministic Resend handoff, OpenAI Responses API with `store:false`, public `POST /api/assistant` behind a reversible kill switch and Admin-only runtime readiness.

Old #213 is closed/superseded.

## Production runtime readiness — PASS / PUBLIC ENABLED

Cloudflare production is configured with the required Assistant bindings/secrets. Final authenticated readiness after activation returned:

- `readyForRuntimeConfiguration:true`;
- `readyForPublicEnablement:true`;
- `publicExposure.enabled:true`;
- `missingBindings:[]`;
- `invalidBindings:[]`;
- OpenAI/session/Turnstile/rate limit/D1/notification all ready.

`ASSISTANT_PUBLIC_ENABLED=true` is the current production configuration.

## Assistant widget — PR #228

Old draft #215 was not merged because it depended on obsolete lineage. Only the intended widget scope was reconstructed on current `main` and integrated through #228.

Included:

- Contact-section launcher;
- desktop modal / mobile bottom sheet;
- EN/ES;
- no local/session storage or transcript persistence;
- sealed session token only;
- Turnstile required per operation;
- current backend/browser contract;
- server-owned explicit privacy consent actions;
- deterministic human fallback without owner-phone exposure.

Production evidence after public activation:

- launcher visible;
- modal opens;
- Assistant Turnstile loads and verifies.

Known non-blocking visual debt: widget/launcher still use green/olive tones that should later be aligned with the current violet SD.Live palette. Do not mix this polish into the functional E2E gate.

Old #215 is CLOSED WITHOUT MERGE / superseded by #228.

## SD.Live Forms Turnstile warning — DISPOSITIONED PASS

Cloudflare displayed for the existing **SD.Live Forms** widget:

`Siteverify isn't being called for SD.Live Forms`

Code evidence confirmed Contact/Rental submit `turnstileToken`, the Worker calls Cloudflare Siteverify, keeps `TURNSTILE_SECRET_KEY` server-side, validates `hostname === "sdlive.show"`, validates the expected `contact`/`rental` action and exits before Lead persistence if verification fails.

A fresh production Contact token was submitted to live `/api/contact` with privacy consent deliberately omitted. The endpoint returned:

`{"ok":false,"error":"Privacy consent is required"}`

Because privacy validation is downstream of Turnstile verification, reaching the privacy error proves the live token passed server-side Siteverify. No Lead was created.

Disposition: stale/incomplete Cloudflare dashboard detection/association unless future production behavior contradicts the verified path.

## First real Assistant provider turn — PASS

Initial public E2E attempts returned the bounded fallback because the OpenAI API account had no usable credits/balance.

After credits were added, the first real turn succeeded with the prompt:

`I'm planning a small theatre show in Bogotá next month. What information do you need from me?`

The Assistant returned a bounded request for date(s), venue, requested support, rehearsal/show schedule, technical requirements and optional follow-up contact details.

This established one-turn end-to-end operation of the public route, browser Turnstile, provider call, structured output and bounded policy.

## Safari second-turn bug

A second turn was then prepared:

`The show is October 17, 2026. Venue is still TBD. I need sound design and FOH, with rehearsal on October 16 from 2–8 PM. What else do you need?`

It could not be submitted in Safari because after the first response:

- Turnstile still visually displayed `Success!`;
- the internal token had already been consumed/cleared;
- Send remained disabled;
- status remained `Enviando…`;
- the typed second message stayed in the textarea.

Root cause in widget behavior: token cleanup called `turnstile.reset()` and cleared internal token state, but Safari could leave the old visual success state while no valid token was available. The UI also failed to clear stale sending status on all completion paths.

## PR #231 — Fix Assistant Turnstile refresh between turns

PR #231 is **MERGED / PR CI PASS / MAIN CI PASS**.

Branch: `fix/assistant-turnstile-refresh-20260902`.

Squash merge: `bf93bbbf9f707abea22105753c9d424b82a68b27`.

Fix:

- after each consumed token call `window.turnstile.remove(widgetId)` instead of `reset()`;
- set `widgetId = null`;
- clear the Turnstile container;
- recreate security immediately while the modal remains open;
- clear stale status on API success, API error and network failure;
- add regression coverage for the Safari-visible deadlock.

### CI failure disposition

Initial Tests #631 failed during `Run tests`.

The failing contract was an old assertion in `tests/assistant-public-widget.test.mjs` requiring:

`window.turnstile.reset(widgetId)`

That assertion was obsolete because the bug fix intentionally replaced reset with full widget removal/recreation. It was not evidence of an `OPENAI_*` exposure issue and no security protection was relaxed.

The contract assertion was updated to require:

`window.turnstile.remove(widgetId)`

Then:

- Tests #632 PASS on PR head;
- PR merged;
- Tests #633 PASS on `main` at `bf93bbbf9f707abea22105753c9d424b82a68b27`.

Browser security contract remains intact: each Assistant request requires Turnstile, the sealed session token is the only reusable conversation state sent back, and backend/OpenAI bindings are not exposed to the browser.

## Open PR cleanup / next workstream

Assistant preparation PRs #192–#212 remain CLOSED WITHOUT MERGE / superseded. Old #213, #215, #216 and temporary #218 remain closed/superseded.

After #231 merge exactly one operational PR remains open:

- **#191 — authenticated WhatsApp owner control for Availability**.

It remains intentionally **NEXT AFTER Assistant closeout**, not concurrent. Do not merge its old branch directly. Reconstruct/reverify it against then-current `main` and preserve signed webhook verification, owner allowlisting, idempotency and the canonical Availability write path.

## Current active gate — Safari session continuity

Do not start #191 yet.

Run exactly one manual Safari smoke now:

1. open the public Assistant;
2. send a successful first turn;
3. verify `Enviando…` clears;
4. verify Turnstile visibly regenerates for a new token;
5. verify Send becomes available;
6. send:

`The show is October 17, 2026. Venue is still TBD. I need sound design and FOH, with rehearsal on October 16 from 2–8 PM. What else do you need?`

Acceptance: response must retain prior **theatre show** and **Bogotá** context without requiring those facts again.

If successful, record:

`SESSION CONTINUITY = PASS`

Then continue the remaining Assistant E2E within the same milestone:

- explicit privacy consent;
- exactly one `source=assistant`, `status=new` Lead;
- consent persistence;
- Admin visibility;
- idempotency/effect replay safety;
- Resend/handoff behavior;
- deterministic Availability/Rental boundaries;
- no invented prices/current inventory claims;
- existing Contact/Rental continuity;
- mobile smoke if applicable;
- closeout documentation.

## Hard boundaries

- no impersonation;
- no invented/negotiated prices;
- no AI-owned Availability;
- no invented Rental availability;
- no second Rental pricing source;
- no Finance reads/writes by Assistant;
- explicit product-owned consent only;
- no full transcript persistence;
- no public owner phone/secrets;
- no public schema migration;
- no provider-owned conversation source of truth.

## Exact continuation

**PR #231 is merged and green. The next action is one Safari second-turn/session-continuity smoke. If it passes, finish the remaining Assistant E2E gates and close the Assistant milestone before resuming #191.**
