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

## Security

- Sessions expire (couples 30 days, admin 12 hours) and are bound to the credential used to log in: regenerating a couple's code or changing `ADMIN_CODE` logs out every existing session.
- Logins are rate limited in memory (couples: 10 attempts per IP per 15 min; admin: 5 per IP and 30 in total per 15 min). Use a shared store if the app runs on more than one instance.
- Every admin page and action checks the admin session itself; layouts are not re-run on client navigation.
- `next.config.ts` sets CSP, HSTS, frame, referrer and permissions headers, and `noindex` for `/admin`, `/portal` and `/boda`.
- No API routes or CORS headers are exposed; server actions only accept same-origin requests.

The JSON file adapter is for the prototype only: serverless hosts (Vercel) have a read-only filesystem. For production implement `CoupleRepository` (`src/core/ports.ts`) against a database such as Postgres/Supabase.

## Tests

```bash
npm test
```
