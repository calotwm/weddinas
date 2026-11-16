# Weddinas · Client portal

Per-couple portal for [weddinas.com](https://weddinas.com) clients.

- **Couples** log in at `/` with their access code and get a dashboard: countdown, proposals to approve or reject, confirmed vendors, budget and payments, progress reports, a checklist, song choices per moment, family photos for the photographers, and an editor for their public page.
- **Guests** see the couple's public page at `/boda/<slug>`: countdown, story, venue, schedule, dress code and gifts.
- **Planner team** manages every couple at `/admin`: create couples (generates the access code), regenerate codes, publish proposals and reports, and per couple keep the **brief** (event data plus one block per vendor category, as in the Excel brief), the **budget** (items in ARS or USD with their payments) and see the couple's music and family photos.

### Files

- The team attaches PDFs and images to each brief block (optionally "solo equipo"), proposal and report; the couple sees the shared ones in Proveedores (confirmed blocks), Propuestas and Reportes. Deleting a block, proposal, report or file deletes it from disk.
- Couples upload a cover photo for their public page in "Nuestra página" (or paste a link).

### Budget, IPC and dollar

- Each budget item is in ARS or USD. ARS balances marked "Se ajusta por IPC" are updated with the latest published INDEC IPC (via [datos.gob.ar](https://datos.gob.ar), series `148.3_INIVELNAL_DICI_M_26`) from the month the amount was agreed; the newest month is added from its monthly variation at [argly.com.ar](https://argly.com.ar) (`/v1/ipc`), which publishes it weeks before datos.gob.ar; "Congelado" and USD items never change. The IPC is monthly and published with a lag, so the page shows which month it used.
- Totals are shown in both currencies with the couple's reference dollar (blue, oficial, MEP…) from [dolarapi.com](https://dolarapi.com). A payment in the other currency stores the exchange rate of that day.
- Both sources are cached in memory (IPC 12 h, dollar 30 min); if they are down the portal keeps working without adjustment.

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

### Backup

**Mi cuenta** (`/admin/cuenta`) has **Descargar backup**: it downloads the couples database (`DATA_FILE`, a JSON array of couples) as `weddinas-backup-<date>.json`. Only a valid team session gets the file; anyone else gets 404. Uploaded photos and `settings.json` are not included. To restore, replace `DATA_FILE` on the volume with the downloaded file while the app is stopped.

### Importing couples

The admin home has **Importar desde las planillas**: upload one JSON file per couple (shape: `CoupleImport` in `src/core/couple-import.ts`) and the couple is created with brief, budget and payments, songs, family and ideas, and its access code is shown once. The import is rehearsed in memory first, so an invalid file stores nothing. The JSON is built from the Drive spreadsheets outside the repo; real couple data is never committed.

The JSON files can be built from the downloaded spreadsheets with the migration CLI (`src/core/sheet-migration.ts` holds the sheet-to-app mapping):

```bash
npx vite-node scripts/migrate-couples.mts <data-dir> <out-dir>
```

- `<data-dir>` holds `manifest.json` (an array of `{ name, year, dir, files: { brief: "brief.xlsx", presupuesto, invitados, timing, canciones, "fotos-familiares" }, missing: [...] }`) and one folder per couple with its `.xlsx` files.
- `<out-dir>` must be outside the repository. It receives one `<dir>.json` per couple, ready for **Importar desde las planillas**, and `report.md` with each couple's names, wedding date, counts (brief blocks, custom rubros, budget items, payments, guests, timing, songs, family) and every warning to review.
- Each file is also rehearsed on an in-memory repository; a file the upload would reject shows up in the report instead of stopping the run. A couple without a wedding date in its brief gets no file.

A couple already in the platform is updated, not imported again: its admin page has **Actualizar desde planillas**, which takes the same JSON file and replaces the brief, budget and payments, guests, timing, vendor timing, songs, family, ideas, wedding date and venue (sections missing from the file stay as they are). Proposals, reports, tasks, files, the access code and the links stay. Family photos and payment receipts carry over to the same member (side and name) or payment (rubro, vendor, date, amount and currency). A file for another couple (different names) or an invalid file changes nothing.

**Eliminar pareja**, on the same page, deletes the couple and its uploaded files after a confirmation. It cannot be undone: download a backup first.

## Configuration

Set these in `.env.local` (or the host's environment). In production `SESSION_SECRET` is required, plus `ADMIN_USERS` or `ADMIN_CODE`.

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | HMAC key for the session cookie |
| `ADMIN_USERS` | One login per team member: `email=hash` entries separated by commas or new lines. Build each entry with `node scripts/hash-team-password.mjs <email> <password>` (only the hash is stored). When set, the shared `ADMIN_CODE` stops working. Members change their own password at `/admin/cuenta` (stored hashed in `settings.json`); writing a new hash for a member here resets it |
| `ADMIN_CODE` | Shared code for the planner admin, used while `ADMIN_USERS` is empty |
| `DATA_FILE` | Path of the JSON database (default `data/db.json`). Uploaded photos are stored in an `uploads` folder next to it |

## Architecture

```
src/core     domain + use cases (PortalService), no framework code
src/infra    adapters (JsonCoupleRepository, LocalFileStore, PublicRatesProvider)
src/server   wiring: service container, session cookie helpers
src/app      Next.js routes and server actions
```

Access codes are stored as SHA-256 hashes; the plain code is shown once to the planner. Server actions read the couple id from the signed session cookie, never from form data.

## Security

- Sessions expire (couples 30 days, admin 12 hours) and are bound to the credential used to log in: regenerating a couple's code or changing `ADMIN_CODE` logs out every existing session; removing a member from `ADMIN_USERS` or changing their password logs out that member, and setting `ADMIN_USERS` logs out every shared-code session.
- Logins are rate limited in memory (couples: 10 attempts per IP per 15 min; admin: 5 per IP and 30 in total per 15 min). Use a shared store if the app runs on more than one instance.
- Every admin page and action checks the admin session itself; layouts are not re-run on client navigation.
- `next.config.ts` sets CSP, HSTS, frame, referrer and permissions headers, and `noindex` for `/admin`, `/portal` and `/boda`.
- No API routes or CORS headers are exposed; server actions only accept same-origin requests.
- Uploads are accepted only when their bytes are JPEG, PNG or WebP (photos, up to 5 MB) or also PDF (attachments, up to 10 MB); never SVG or HTML. They are saved under a generated id and served by `/archivos/<couple>/<file>` only to that couple or the admin (404 otherwise) with their exact type and `nosniff`. (A `sandbox` CSP is not used: browsers refuse to show PDFs in a sandboxed document.) The one public file is a couple's current cover photo, at `/boda/<slug>/portada`.

The JSON file adapter is for the prototype only: serverless hosts (Vercel) have a read-only filesystem. For production implement `CoupleRepository` (`src/core/ports.ts`) against a database such as Postgres/Supabase.

## Tests

```bash
npm test
```
