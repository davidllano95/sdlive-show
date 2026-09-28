# SD.Live Documents v1 — PDF filename contract

**Status:** V1 REQUIRED CONTRACT  
**Applies to:** Cuenta de Cobro and Invoice finalized PDF downloads  
**Introduced after:** Documents v1 visual baseline through PR #295

## Rule

Every downloaded/finalized PDF filename must include both:

1. the document display number; and
2. the client legal/display name stored on the finalized document.

Canonical format:

`<DOCUMENT NUMBER> - <CLIENT>.pdf`

Examples:

- `TEST-INV-0004-B - Test-Co.pdf`
- `TEST-CC-3 - LIVENT-X-S.A.S.pdf`
- production equivalents must follow the same rule after real series are enabled.

## Sanitization

Filename components are filesystem-safe representations of the stored values:

- trim whitespace;
- normalize Unicode accents to their ASCII base where possible;
- replace whitespace and unsupported punctuation with `-`;
- preserve letters, digits, `.`, `_`, and `-`;
- trim leading/trailing dashes;
- cap each component to a bounded length.

The client is not optional for the filename. If a finalized row lacks a usable client name, filename construction must fail closed with `document_client_name_required_for_filename` rather than silently producing a client-less artifact name.

## Where this is enforced

- `documents-pdf-artifacts.js` — authenticated PDF response / `Content-Disposition` filename.
- `admin/documents/pdf-artifact-ux.js` — explicit `Download PDF` anchor filename.
- `tests/documents-pdf-artifacts.test.mjs` — backend regression coverage.

Both backend and frontend must remain aligned. A future filename-format change must update both and add/adjust regression coverage in the same PR.

## Non-goals

This naming contract does **not** change:

- immutable PDF bytes;
- snapshot hashes;
- template version (`@1` remains the same);
- R2 private object keys;
- document numbering;
- correction/revision numbering (`-B`, `-C`, etc.);
- registry identity.

It is a download/presentation contract only.
