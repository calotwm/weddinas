# Planner workspace (migrate Drive + Trello workflow into the portal)

Objective: replace the per-couple Google Drive folder (Excel briefs, budget, songs, family photos) and the Trello model with portal features, starting with what the client asked for in the meeting.
Branch: `feat/planner-workspace` · Delivery: ask-on-risk · Test runner: `npx vitest run`

## Specs

- S1. "claude, mira aca es como tiene organizado todo, podemos migrar esto, sumar las funciones necesarias y configurarlo todo para que quede bien?" — migrate the example couple folder's workflow (Drive "Ejemplo pareja": INTERNO Brief, Presupuesto, Elección de canciones, Fotos familiares, Lista de invitados, Timing, Trello "MODELO CASAMIENTOS", mockup "IDEA - Portal de novios Weddinas.html") into the portal. Real couple data is never seeded or committed; demo data is invented.
- S2. "archivos eleccion de canciones foyos familiares" — couple-side "Música" (song per moment with the sheet's moments and Estado `Elegida / Pendiente / No aplica`, plus playlist link, infaltables, prohibidas) and "Fotos familiares" (groups per side with people, relation, optional reference photo); the team sees both in the admin.
- S3. "brief de detalles puntuales con la info detallado" — team-side brief: general event data plus one block per vendor category (catalog from the INTERNO Brief: Proveedor, Pago, Detalle/Aclaraciones per field, Equipo owner, status), editable in the admin; the couple sees a read-only summary of confirmed vendors.
- S4. "que tenga presupuestos que puedan ser usd y pesos y q los pesos se ajusten al ipc del dia" — budget items per category in USD or ARS with payments (Seña / Saldo / Adicional / IVA); ARS balances marked "Se ajusta por IPC" are updated with the latest published INDEC IPC (monthly index; shown with its month) from the item's base month; "Congelado" balances are not adjusted; totals shown in both currencies at a shown dollar quote. Couple sees budget and payments read-only.
- S5. "todo eso son notas q tuvimos en reunion, vos mandale como creas" — the agent decides scope order and design; later stages (Postgres + user/password login, task template from Trello, guests/RSVP, timing, documents, comments/notifications) follow after S2–S4.

## Tasks

- [x] T1 [S4] money core: IPC + dollar quote adapters (datos.gob.ar series `148.3_INIVELNAL_DICI_M_26`, dolarapi.com), cached; pure adjust/convert math with tests — inline — `0923b90` (RED: missing modules; GREEN: money 8 + budget 6 tests)
- [x] T2 [S4] budget & payments: domain, admin editor, couple read view — inline — `0923b90`, `1a2bdcc` (planner tests RED 9/9 → GREEN; e2e: payment registered from admin)
- [x] T3 [S3] brief: category catalog, admin editor, couple summary — inline — `0923b90`, `1a2bdcc` (e2e: rubro added from admin)
- [x] T4 [S2] music: couple editor, admin view — inline — `0923b90`, `1a2bdcc` (e2e: song saved from portal)
- [x] T5 [S2] family photos with image upload (stored next to DATA_FILE, served only to that couple/admin) — inline — `fb6941e`, `1a2bdcc` (upload tests RED→GREEN 6; e2e: upload ok, file route couple 200 / admin 200 / anonymous, other couple, traversal 404; replaced photo deleted); independent verifier: security PASS
- [x] T6 [S1] portal navigation for the new sections; demo data; docs — inline — `0923b90`, `1a2bdcc` (screens at 390 and 1366)
- [ ] T7 [S5] next stages (Postgres, user/password login, Trello task template, guests, timing, documents, comments) — pending, separate plan

Route evidence: one parent; units share the Couple aggregate, service and admin page, so no parallel-writer reason. T5 touches file upload/serving (security, item 2) → independent verifier after its checks.

## Log

- L1 (2026-10-30) User request: "claude, mira aca es como tiene organizado todo, podemos migrar esto, sumar las funciones necesarias y configurarlo todo para que quede bien? https://drive.google.com/drive/folders/1dEowevr-49ipQaQe45Wy3GlRqVQXRH5f?usp=sharing"
- L2 (2026-10-30) User: "son fotos videos briefs en excel(importante)"
- L3 (2026-10-30) User: "sisi, por eso te lo pase asi le metemos todo, [15:33, 30/10/2026] Calo/Camilo Seifar: archivos eleccion de canciones foyos familiares [15:33, 30/10/2026] Calo/Camilo Seifar: brief de detalles puntuales con la info detallado, que tenga presupuestos que puedan ser usd y pesos y q los pesos se ajusten al ipc del dia. todo eso son notas q tuvimos en reunion, vos mandale como creas"
- L4 Analysis: folder mapped by two read-only explorers (structure only, no PII). Brief = ~30 vendor categories on one template; couple fills only songs, guests and family photos; money always AR$+USD with Seña/Saldo and Congelado/IPC. IPC source verified: latest published index is 2026-08 (monthly, ~2 months lag). Decision: features from the meeting first (S2–S4) on the existing JSON adapter; Postgres + password login moved to T7 because nothing in S2–S4 needs them.
- L5 (2026-10-30) T1–T6 done. Checks: vitest 50 passed, tsc clean, eslint 0 warnings, next build ok. e2e via headless Chrome on dev server (scratch DATA_FILE). Script bug found and fixed (x-forwarded-host header made Next reject server actions as cross-origin, confirming its CSRF guard). Admin couple page split into tabs (General, Brief, Pagos, Música, Familia); portal nav now 9 sections (3-column grid on phones, one row on desktop with short labels).
- L6 (2026-10-30) Independent verifier: security PASS (auth on all actions/pages, sniffing, size, traversal, cleanup). Blockers fixed: B1 changing an item's currency with payments dropped them from totals → now refused (test RED→GREEN); B2 couple saw unconfirmed vendors and internal Aclaraciones → portal shows only confirmed blocks and details. Advisories fixed: old photo delete no longer rolls back the new one; IPC history fetched from 2016 (limit 1000). Checks: vitest 51, tsc, eslint 0, build ok.
- Next: deploy to Railway; T7 needs its own plan.
