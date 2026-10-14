# SD.Live Work — creative multimedia portfolio

**Selected:** 2026-10-14 · **Status:** ACTIVE DISCOVERY / ARCHITECTURE  
**Separate follow-up:** SD.Live CV Master web page.  
**Out of scope:** SD.Live Patch (paused/preserved), Finance, REGISTRO, Rental booking changes.

## Product goal

Publish compelling evidence of actual creative and technical work. This is a portfolio, **not** a library of engineering documentation or a marketing flyer. Audience includes creative directors, productions, producers, employers and technical collaborators.

Public entry: `/work` (actual locale URL strategy must be verified against existing routing).

## First-class content

- **Project:** a complete production, with role, credits, collaborators, dates/context where appropriate, production video, photo galleries, audio, QLab/programming screenshots and short creative/technical narrative.
- **Piece:** an independent sound-design excerpt, soundscape, QLab sequence, AV treatment, experiment, reel or other compact work. It has its own public identity and may optionally link to one or more Projects later, without copying its media.

Projects and Pieces share a mixed editorial gallery; filters such as Sound Design, Live Audio, Broadcast and AV may be used when genuinely supported. Individual detail pages should support different block combinations, not demand empty irrelevant fields.

## Publishing and media requirements

- Admin create/edit, Draft vs Published, Featured, order/cover, optional bilingual English/Spanish text and SEO metadata.
- Flexible ordered blocks: rich short text, embedded production videos (YouTube/Vimeo where appropriate), audio players, screenshots/photos/gallery, captions, credits and links.
- Accessible responsive design; playback should be intentional, usable on mobile, and not autoplay unexpectedly.
- Preserve credit, copyright and publication-permission controls. No unauthorized production media or sensitive QLab/network detail exposed by default.
- Reuse existing CMS / media assets rather than building a second unrelated publishing system.
- Respect existing access boundary (Cloudflare Access) for writes and D1/R2 storage ownership. Do not change current published Selected Work behavior until new flow has tests and a safe migration.
- Media API currently caps uploads at 5 MB; video/audio delivery model, storage budgets, thumbnails and supported codecs must be assessed before expanding limits.

## Initial code findings to validate

- Public homepage has existing Selected Work content.
- `admin/editor/core-sections-editor.js` edits current `work` section.
- `admin/editor/media-library.js` has reusable `portfolio` folder.
- `media-api.js` currently defines `MAX_UPLOAD_BYTES = 5 * 1024 * 1024`.
These are foundations, not evidence of a ready-to-use multi-entry portfolio CMS.

## Phases / gates

1. **Audit / contract:** trace CMS read/write, public routes, data shape, media delivery and permission/security assumptions. Decide Project/Piece IDs, optional relations and blocks.
2. **First vertical slice:** one Project + one independent Piece, authored as drafts, published to working public detail pages and shown in /work. Avoid changing existing homepage work rendering prematurely.
3. **Media & editorial UX:** galleries, audio player, embeds, captions, credits, ordering, mobile, bilingual, preview, featured linking.
4. **Integration:** selected entries surfaced on Home and associated with CV experience, with explicit editorial links rather than automatic claims.

Acceptance requires successful CI plus representative production smoke. Do not infer deployment from a merge alone.

## Next separate scope — SD.Live CV

Public `/cv` presents the user's professional **Master CV** as an editorial, readable web résumé, not a promotional landing page. Provide an explicitly maintained PDF download and relevant manually curated links to published Work entries. Preserve truthful professional experience; consider role-specific derived CVs only as a later enhancement.

## Immediate next action

Finish the focused audit of existing Selected Work CMS schemas/editor and Media Library. Present a minimal content/data contract and first vertical slice before runtime or schema changes. Preserve Patch's existing progress and do not silently start it.
