# SD.Live Track — Admin read-only finance integration closeout

**Date:** 2026-08-22 — America/Bogota  
**Control Center:** Step 6 — Finance integration Phase 2  
**Result:** CLOSED / PASS  

## Production evidence

The private finance integration is live behind the existing Cloudflare Access Admin boundary.

Validated production flow:

`Cloudflare Access → Worker → OAuth 2.0 refresh-token exchange → Google Sheets API → SD.Live Track REGISTRO → /admin`

### Health endpoint

`GET /api/admin/finance/health`

Production smoke returned:

- `ok: true`
- source `google-sheets`
- access `read-only`
- range `REGISTRO!A1:AA1`
- schema valid with 27 physical columns

The endpoint does not return finance values, OAuth credentials or tokens.

### Summary endpoint

`GET /api/admin/finance/summary`

Production smoke read the bounded range `REGISTRO!A1:AA3000` and reconciled 57 persisted records.

Observed snapshot during closeout:

- 57 total persisted records
- 3 pending invoice / `Pendiente Envio` records — COP 5,600,000 gross
- 4 collectible receivables — COP 1,150,000 net
- 6 workflow-blocked receivables — COP 2,490,000 net
- 44 paid records
- received: COP 19,822,164 + USD 23,922.27
- recorded fees: COP 52,014 + USD 5.99
- unsupported currencies: 0
- current collectible aging bucket: 0–30 days, 4 accounts

The four current collection-priority records were rendered oldest-first and matched the API response.

The classification reconciled all 57 records at the smoke checkpoint:

`44 paid + 3 pending invoice + 4 collectible + 6 workflow-blocked = 57`

## Admin UI

The `/admin/` dashboard now includes a live **SD.Live Track · Read-only — Finance overview** containing:

- To invoice
- Collectible now
- Workflow blocked
- Received
- Aging
- Collection priority
- live source/status indicator

COP and USD remain separated. Monetary API output is normalized to two decimal places so floating-point artifacts such as `5.990000000000009` are not exposed.

Finance loading is isolated from the CMS dashboard health path so a Google/finance outage does not make the rest of Admin appear unavailable.

## Security / privacy closeout

Phase 2 remains within the approved guardrails:

- Admin-only, behind Cloudflare Access
- Google OAuth scope is read-only Sheets access
- Worker uses the configured fixed finance spreadsheet rather than accepting arbitrary spreadsheet IDs from clients
- no Google Sheets/AppSheet write endpoint
- no D1 finance mirror
- no bidirectional sync
- no public finance endpoint
- `NUM CONTACTO` omitted from the first dashboard/API summary
- Notes omitted
- internal row IDs omitted
- OAuth client secret, refresh token and access tokens never returned to the browser

## Source-of-truth status

No ownership changed during Phase 2:

- Google Sheets `REGISTRO` remains persistent finance storage and formula owner.
- AppSheet remains field/offline capture and workflow owner.
- `/admin` is a read-only consultation/control surface.

## Next sequencing rule

Step 6 is closed. Finance Phase 3 write-back remains blocked until the read-only dashboard has been trusted in real use and an explicit draft-first/idempotent write contract is approved.

While that observation period runs, the documented availability/WhatsApp track remains eligible for explicit promotion, and finance reminder-delivery hardening remains a separate notification-only backlog item.
