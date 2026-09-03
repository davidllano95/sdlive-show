# SD.Live Assistant rollout — final production closeout

Date: **2026-09-03 — America/Bogota**

Runtime baseline at closeout:

`c52a06603c0a6b5cd0cc4425cca11f69cce693d7` — PR #244.

## Final disposition

**CLOSED / PRODUCTION PASS.**

The public SD.Live Assistant is enabled in production and its functional rollout is complete. Reopen only for a concrete regression or an explicitly approved product enhancement.

Public kill switch remains `ASSISTANT_PUBLIC_ENABLED`.

## Architecture at closeout

`Public site / widget → /api/assistant → request security → Turnstile → dedicated rate limit → sealed stateless session → OpenAI Responses API + Structured Outputs → deterministic server tools → Lead Core D1 → deterministic handoff → Resend → human follow-up`

Hard boundaries remain:

- OpenAI Responses API only;
- strict Structured Outputs;
- `store:false`;
- no `previous_response_id` dependency;
- no full transcript persistence;
- sealed AES-GCM structured session;
- no Finance reads/writes;
- no invented or negotiated prices;
- no Availability promise without deterministic backend truth;
- no second Rental catalog/pricing source;
- no inferred privacy consent;
- no public schema migration;
- no owner phone/secrets/provider-body exposure.

## Final UX/runtime lineage

Key rollout fixes after the backend/public-widget foundation:

- **#231** — Safari post-turn recovery.
- **#235** — Turnstile once per Assistant session.
- **#236** — Assistant redesigned as branded messaging interface.
- **#237** — SD.Live palette + vertical layout correction; removed inherited section padding issue.
- **#238** — Turnstile moved into chat as inline Security check with persistent Verified confirmation; official Assistant avatar direction.
- **#239** — corrected Assistant avatar asset to the official SD.Live icon.
- **#240** — deterministic persistence for `venue=TBD` / equivalent unconfirmed-venue statements.
- **#241** — Enter sends; Shift+Enter creates newline; IME-safe behavior.
- **#242** — hardened consent → Lead boundary with deterministic summary/date normalization when structured model slots are incomplete.
- **#243** — server-owned Rental fail-closed responses for rejected selections.
- **#244** — safe recovery when a valid Rental result is followed by a repeated model `check_rental`, without executing the tool twice or exposing an internal loop error.

## Production acceptance evidence

### 1. Public/session behavior — PASS

Production theatre scenario:

- Bogotá;
- October 17, 2026;
- sound design + FOH;
- venue explicitly `TBD`;
- rehearsal October 16, 2–8 PM;
- 8 wireless mics;
- QLab playback;
- 4 PM call / 8 PM performance.

Verified:

- first provider turn succeeds;
- second turn retains prior theatre/Bogotá context;
- after #240, `venue=TBD` remains accepted as authoritative and is not re-asked;
- Enter sends successfully;
- no stale sending state blocks later turns.

### 2. Turnstile/security UX — PASS

Verified in Safari desktop and mobile:

- new Assistant session requires Turnstile;
- security check appears as an inline chat system message;
- successful verification remains visible as `Verified — you can continue` / localized equivalent;
- after a valid sealed session exists, repeated visible Turnstile challenges are not required;
- rate limiting/backend verification remain in place;
- no Cloudflare block occupies the composer after session establishment.

### 3. Desktop widget UX — PASS

Verified:

- compact top chat header;
- SD.Live Assistant title/subtitle;
- official SD.Live symbol as avatar;
- site design-token palette rather than old lime/olive styling;
- one central conversation scroll region;
- consent card appears inside the conversation flow;
- composer remains anchored at the bottom;
- no clipping of Data authorization actions.

### 4. Mobile UX — PASS

Verified on iPhone/Safari:

- full-screen mobile presentation is readable;
- header, avatar, close control, chat and composer do not overlap;
- Security check/Verified state is visible;
- composer/footer remain accessible;
- Spanish localization works;
- a Spanish Availability query completes successfully.

### 5. Privacy consent — PASS

User supplied name + email + explicit follow-up intent.

Expected and observed:

- Assistant did **not** infer consent;
- `Data authorization` appeared in chat;
- policy link and both `Cancel` / `Authorize & send` actions were fully visible;
- no Lead was created before explicit authorization.

### 6. Lead capture / persistence — PASS

After one explicit `Authorize & send`, production returned:

`Your request was saved and is available for SD.Live follow-up.`

Admin verification showed exactly one QA Assistant Lead:

- Lead: **#26**
- Name: **Samuel**
- Email: `samuel.qa@example.com`
- Source: **Assistant**
- Service: **Theatre**
- Status: **New**
- Date: **2026-10-17**
- City: **Bogotá**
- Venue: **TBD**
- Preferred contact: **Email**

This Lead is an intentional QA artifact; do not treat its placeholder email as a real customer contact.

### 7. Consent persistence / idempotency — PASS

The successful capture path requires Lead + `privacy_consents` + `assistant_effect_reservations` completion through the server-owned persistence boundary.

Observed reload test:

- page reloaded after successful capture;
- Admin still contained only Samuel Lead #26;
- no duplicate Samuel Lead appeared.

Disposition: consent persistence and effect idempotency accepted for rollout closeout.

### 8. Resend / human handoff — PASS

Gmail verification confirmed the notification email reached `hello@sdlive.show`:

Subject:

`[SD.Live Lead] Theatre — Samuel`

Sender displayed as SD.Live Assistant. Notification contained the structured theatre request details.

### 9. Deterministic Availability — PASS

Assistant query:

`Are you available right now, and what is the best way to reach you?`

Assistant answered that SD.Live was currently available and WhatsApp was the best contact method.

Public Availability widget independently showed:

- **AVAILABLE NOW**
- **Message me on WhatsApp.**

The two surfaces matched exactly enough to accept deterministic Availability behavior.

### 10. Rental deterministic boundary — PASS

#### Over-limit item

Query requested **3 Waves LV1 Classic** units for October 17, 2026.

Observed response:

- current Rental catalog supports up to **2**;
- Assistant refused to confirm 3;
- no price invented;
- no inventory availability invented.

#### Unknown item

Query requested **Yamaha DM7**.

Observed response:

- no catalog match;
- no silent substitution to another console;
- no price invented;
- no availability invented;
- clarification/human review offered.

#### Known valid item

Query requested **Behringer WING**.

Observed response:

- WING recognized as a current Rental catalog item;
- price not quoted by the Assistant check;
- inventory availability not claimed;
- separate quote/review required.

Disposition: Rental boundary is deterministic/fail-closed for current rollout scope.

### 11. Existing public form continuity — PASS

Contact production smoke confirmation:

`Message received. Thanks for reaching out.`

Rental production smoke confirmation:

`Quote request received. I'll contact you with availability and the final rental quote.`

No regression was observed in the pre-existing public Contact/Rental flows.

## CI at final runtime baseline

PR #244 merged as:

`c52a06603c0a6b5cd0cc4425cca11f69cce693d7`

`main` Tests #668: **PASS**.

## Superseded/closed Assistant work

Preparatory PRs #192–#212 remain CLOSED WITHOUT MERGE / superseded. Old #213, #215, #216 and temporary #218 remain closed/superseded. Do not reopen them.

## Next operational workstream

**PR #191 — Add authenticated WhatsApp owner control for Availability.**

PR #191 is still OPEN/UNMERGED, but its branch is stale relative to the completed Assistant rollout. Do not merge it directly.

Exact continuation:

1. inspect #191 diff against current `main`;
2. reconstruct only still-valid bounded WhatsApp owner-control behavior on a fresh branch;
3. preserve webhook signature verification, exact owner/phone-number-id allowlisting, D1 message-id idempotency, in-flight duplicate protection and canonical Availability write path;
4. complete Meta/Cloudflare onboarding/secrets;
5. CI green → squash merge → one production smoke;
6. document #191 closeout before moving to Rental real-time availability/double-booking protection.
