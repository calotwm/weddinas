# Weddinas · Client portal

Per-couple portal for [weddinas.com](https://weddinas.com) clients.

- **Couples** log in at `/` with their access code and get a dashboard: countdown, proposals to approve or reject, progress reports, a checklist, and an editor for their public page.
- **Guests** see the couple's public page at `/boda/<slug>`: countdown, story, venue, schedule, dress code and gifts.
- **Planner team** manages every couple at `/admin`: create couples (generates the access code), regenerate codes, publish proposals and reports.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. In development an empty database is seeded with a demo couple:

| What | Value |
| --- | --- |
| Couple access code | `DEMO-BODA` |
| Admin code (`/admin/login`) | `weddinas-admin` |
| Public page | `/boda/sofia-y-martin` |

## Configuration

Set these in `.env.local` (or the host's environment). In production `SESSION_SECRET` and `ADMIN_CODE` are required.

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | HMAC key for the session cookie |
| `ADMIN_CODE` | Code for the planner admin |
| `DATA_FILE` | Path of the JSON database (default `data/db.json`) |

## Architecture

```
src/core     domain + use cases (PortalService), no framework code
src/infra    adapters (JsonCoupleRepository)
src/server   wiring: service container, session cookie helpers
src/app      Next.js routes and server actions
```

Access codes are stored as SHA-256 hashes; the plain code is shown once to the planner. Server actions read the couple id from the signed session cookie, never from form data.

The JSON file adapter is for the prototype only: serverless hosts (Vercel) have a read-only filesystem. For production implement `CoupleRepository` (`src/core/ports.ts`) against a database such as Postgres/Supabase.

## Tests

```bash
npm test
```
