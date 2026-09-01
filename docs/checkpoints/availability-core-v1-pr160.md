# Availability Core v1 — PR #160

Status: MERGED / PRODUCTION SMOKE PARTIAL

PR #160 (`d75868075d77096476e86ef222e7b0f224e9871d`) introduced the first Availability Core runtime slice:

- D1-backed availability profile, temporary override and travel-state schema;
- deterministic precedence: manual override → travel timezone → weekly schedule;
- public privacy-safe `GET /api/availability`;
- authenticated Admin quick controls for Auto / Available / Limited / Away;
- bilingual EN/ES WhatsApp availability popover;
- status-driven glow on the existing floating WhatsApp CTA;
- public WhatsApp username privacy hardening in shared SEO runtime.

Production observation after merge:

- popover: PASS on mobile;
- bilingual/runtime state path: visually present through the popover;
- glow: NEEDS POLISH — not perceptible enough on mobile, while state delivery itself is working.

The mobile glow should be corrected as a visual-only follow-up without changing resolver logic, D1 ownership, Calendar, Show Day, Finance, Rental or AI scope.
