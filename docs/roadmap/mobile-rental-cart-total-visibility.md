# Mobile Rental Cart — total visibility

Status: BACKLOG / NOT ACTIVE

## Problem

On mobile, the Rental quote-request drawer can become long enough that the visitor does not immediately understand that the estimated total is located farther down the scrollable content. This creates ambiguity around price visibility and can make the drawer feel incomplete before the user reaches the bottom.

## UX goal

Make the estimated total continuously understandable on small screens without turning the quote-request flow into checkout and without moving pricing authority out of the existing backend-owned Rental logic.

## Candidate solutions to evaluate when promoted

1. Sticky bottom summary inside the Rental drawer showing the current estimate and a clear `View summary` / `Review request` affordance.
2. Compact persistent total row that remains visible while the item list scrolls and expands into the full summary near the end.
3. Initial mobile cue such as `Estimated total below` only if testing shows a sticky summary is visually too heavy.

Preferred direction for evaluation: a sticky/mobile summary bar because it preserves context while scrolling and makes the price discoverable without requiring a second floating control.

## Guardrails

- The cart remains a quote request, not checkout.
- Backend-owned pricing and existing quote math remain authoritative.
- COP/USD and current Rental pricing rules are not redesigned as part of this UX task.
- No duplicated browser pricing engine.
- Preserve current cart icon, selection, quantities, form submission and Rental notification flow.
- Must work with iPhone safe areas and not collide with WhatsApp or other floating controls.
- EN/ES copy must remain synchronized.

## Acceptance when eventually implemented

- On a representative mobile viewport, a visitor can identify the current estimated total without scrolling to the very end.
- The full detailed summary remains available and consistent with the persistent mobile total.
- Changing quantities/items updates the visible total immediately.
- The UI still clearly communicates that this is a quote request.
- No pricing parity regression and no change to backend transactional ownership.
