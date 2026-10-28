# Client portal (weddinas.com)

Objective: per-couple portal (access code login, dashboard, public wedding page) plus planner admin, styled after weddinas.com.
Branch: `feat/client-portal` · Delivery: ask-on-risk · Test runner: `npx vitest run`

## Specs

- S1. "cada pareja tiene un portal que entra con un codigo" — each couple logs in with a unique access code; codes are stored hashed and shown to the planner only on creation/regeneration.
- S2. "desde un dashboard propio puedan cargar informacion para que se vea en los links" — couple dashboard edits public info (names, date, venue, story, schedule, dress code, gifts, cover photo) rendered at a public link `/boda/<slug>`.
- S3. "reportes, propuestas, cuentas regresivas y demás" — dashboard shows countdown to the wedding, planner reports, and proposals the couple can approve/reject with a comment.
- S4. "tengo +30 parejas activas" — planner admin (protected by `ADMIN_CODE`) lists couples, creates couples, regenerates codes, publishes reports and proposals per couple.
- S5. "armalo en base al diseño de su web" — palette and typography from weddinas.com (#2B635A, #0A8983, #78C1B0, #FFD3BD, #C6541A, #273835; Questrial body). MADE Mirage / Roustel are personal-use fonts, so Google Fonts substitutes are used (assumption).
- S6. Storage behind a repository port; prototype adapter is a local JSON file (assumption: production needs a DB adapter, e.g. Postgres/Supabase).

## Tasks

- T1 [S1,S6] core domain, access codes, sessions, JSON repository + tests — inline — done (RED: missing modules; GREEN: 14 tests)
- T2 [S2,S3,S5] couple portal: login, dashboard, public page — inline — pending
- T3 [S4] planner admin — inline — pending

## Log

- L1 (2026-10-28) User request: "conecta este trabajo a mi repo calotwm/weddinas, tenemos que hacer para esta pagina https://weddinas.com/ esto una especie de web tipo portal para mis clientes. Organizo casamientos y tengo +30 parejas activas y me gustaria que cada uno tenga su portal con reportes, propuestas, cuentas regresivas y demás., pense en algo tipo que cada pareja tiene un portal que entra con un codigo y que desde un dashboard propio puedan cargar informacion para que se vea en los links, armalo en base al diseño de su web y lo vemos"
- L2 Stack: Next.js 15 App Router + TypeScript + Tailwind 4, server actions, HMAC-signed session cookie (node crypto), Vitest for core.
