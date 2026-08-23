# SD.Live Calendar create — OAuth write-permission gate

**Date:** 2026-08-23 — America/Bogota  
**Status:** BLOCKED on Google Sheets OAuth write permission; create implementation itself reached the Sheets write boundary successfully.

## Production smoke result

The first controlled Admin create smoke was attempted from `/admin/calendar/` after PR #89 merged.

Pre-write UI checks passed:

- `+ New work` opens correctly;
- `Fecha fin` defaults to `Fecha trabajo`;
- end-before-start is blocked client-side.

The first real create attempt returned:

> Google Sheets write permission is not authorized for this connection yet.

No production row was created by that attempt.

## Diagnosis

The existing Google OAuth connection is sufficient for the established read-only Finance/Calendar APIs but does not currently authorize Google Sheets writes. The controlled Calendar create endpoint correctly stops at the authorization boundary instead of falling back to another datastore.

The next gate is to re-authorize the existing Google OAuth client with a Sheets write-capable scope (`https://www.googleapis.com/auth/spreadsheets`) and replace only the refresh token used by the Worker connection if required. Do not change spreadsheet source of truth, client identity, D1 architecture, or generic Finance Phase 3 permissions as part of this authorization step.

## Constraints preserved

- Google Sheets `REGISTRO` remains the operational/finance persistence source of truth.
- AppSheet SD.Live Track remains the mobile/offline workflow client.
- Calendar/Operations write access is the separately authorized controlled path only.
- Generic Finance Phase 3 write-back remains blocked.
- Formula-owned columns remain non-writable by Admin create.
- Calendar browser read payload remains sanitized and excludes Notes, phone, persisted IDs and OAuth secrets.

## Continuation

1. Upgrade the Google Sheets OAuth authorization to include write capability.
2. Re-run exactly one controlled `QA Admin / CREATE SMOKE` create from Admin.
3. Verify the new row in Google Sheets.
4. Sync AppSheet and verify the same persisted row appears there.
5. Only then close Admin create PASS and proceed toward edit/workflow actions.
