# Client feedback, phase 6 (third review round, "Modificaciones.pdf")

Objective: apply the agency's third review (Canela, Modificaciones.pdf) to the couple and team portals.
Branch: `feat/client-feedback-phase-6` (base `21a7845`) · Delivery: ask-on-risk · Test runner: `npx vitest run` · UI copy in Spanish (rioplatense "ustedes" for the couple, "vos" for the team), code/comments in English.

## Specs

Propuestas
- S1. "Nos gustaría que quede así con cada proveedor: *Nosotras cargamos un cuadro comparativo en la IA y nos salió así. Nos gustaría que cuando vamos a "Nueva propuesta" en nuestro portal se pueda cargar el excel, subir los pdfs y que se transforme en este estilo de comparativo y que tenga el botón para elegir en cada proveedor" — reference image: title "Cuadro comparativo · Catering", one column per vendor (Softies, Caruchef, Nantes, U Catering) each with an "Elegir" button under the vendor name ("Elegida" filled on the chosen one, whose column is tinted), row labels on the left (Formato, Precio por adulto, Precio por niño, Menú (subtotal), Bebidas, Isla de recepción, Precocktel, Flete, Total final, Total en USD, Seña agosto, Degustación). The "Nueva propuesta" form accepts the Excel and the PDFs in one go.
- S2. "Lo que modificaría es que aparezca todo centrado y más marcado con líneas las divisiones".

Presupuesto
- S3. "Solo el equipo puede modificar fletes y viáticos. NO novios" (reverts the couple freight control of `e0fc28a`).
- S4. "Hacer la división de pago al 100% más grande. Quizás que figure de punta a punta el cuadrado de pago 100%".
- S5. "Seleccionar archivo de comprobante y que se cargue automáticamente en el brief" — a payment receipt shows in that rubro's brief block without extra steps.
- S6. "Espacio + Catering + Barra + Ambientación: Que se pueda agregar cuantos invitados fueron confirmados (Solo en portal" — assumption: the team records the confirmed guest count on those rubros' budget items; the couple sees it.

Temas del mes
- S7. "Que los novios NO puedan dar check" (reverts phase 5 S12's couple check).
- S8. "Lo ya realizado de meses anteriores que tenga un despliegue de "ver más"".
- S9. "Que esté en borrador en el portal equipo hasta que demos el ok" — new topics are drafts the couple does not see until the team publishes them.

Estética
- S10. "Que se puedan sumar hasta 20 fotos en inspiración".
- S11. "Sumar como el cuadrado de carga de inspiración uno que diga "Papelería" y que diga "Una vez que se elijan los diseños van a figurar aca"" — assumption: the team uploads the stationery designs; the couple sees them, or that text while empty.

Invitados
- S12. "Boton para descargar".
- S13. "Botón confirmado no funciona. Nos vuelve a figurar como "Pendiente"".
- S14. "Que se traslade la refe de colores a cuando elegis la opción del desplegable" — the status select shows the status color.
- S15. "Sumar al lado de los invitados numero 1, 2, 3".
- S16. "Se puede sumar un checkbox cuando se pone "descargar" como para que nosotras podamos tomar lista desde la app?" — assumption: the downloaded list has a checkbox column, and the team can tick arrivals in the app.

Brief
- S17. "Que esté bien formulado para que en todos salga el pago desde presupuesto".

Timing
- S18. "Que aparezca en el portal de los novios la imagen de nuestro excel".
- S19. "Que aparezca en el portal de equipo el link para cargar nuestro excel" — assumption: the team stores the link to their timing Excel (shown in the team portal) and uploads its image (shown to the couple).

Panel equipo
- S20. "Sumar al lado de parejas, proveedores, pagos, invitados, civil uno que diga "Pendientes" y que te filtre los pendientes de: Weddinas / Novios / Proveedores" — built on the brief line states.
- S21. "Se puede tener un usuario por persona del equipo? Si es asi te digo los mails:" canela@, natasha@, morena@, paula@, administracion@weddinas.com — open: login method pending the user's decision.

General
- S22. "Portal novios no descargar nada".
- S23. "Portal equipo poder descargar todo en pdf".
- S24. "Armar un nuevo apartado en ambos portales que se llame "Planos" donde podamos cargar - PLAN A - PLAN B - UBICACIÓN CEREMONIA. Carga equipo, no novios".
- S25. "Cómo se sube la foto de la pareja para que quede de portada en el contador?" — today only the couple can, from the unlinked "Mi página"; the team gets a cover upload on the couple's page.

## Tasks

- [x] T1 [S1, S2] proposals comparison with per-vendor Elegir — delegated writer (worktree) — `8ac7095`, `b8a7919`
- [x] T2 [S3-S6, S17] budget + brief payment — delegated writer (worktree) — `a32627d`; team vendor sheet uses briefPaymentDetail after merge
- [x] T3 [S7-S9, S20] month topics drafts/no check + Pendientes tab — delegated writer (worktree) — `3cc2d89` (publish = all drafts at once)
- [x] T4 [S12-S16] guests: status bug, numbers, colored select, download link, in-app "Llegó" — delegated writer (worktree) — `01275fa`
- [x] T5 [S10, S11, S18, S19, S24, S25] team uploads shown to the couple: 20 photos, Papelería, timing image + link, Planos, cover — delegated writer (manual worktree) — `a398fa6`
- [x] T6 [S22, S23] downloads: none for the couple, team PDFs (proveedores, invitados with "Llegó" box, presupuesto, timing, familia, música) — delegated writer (manual worktree) — `970eb94`
- [x] T7 [S21] team users: email + own password, scrypt hashes in ADMIN_USERS, shared code until set — inline — `ba60530` — Risk item 2
- [ ] T8 merge, suite, tsc, lint, build, verifier

Route evidence: T1-T6 are independent units, each several files / 100+ lines, launched together (Writer trigger a). Shared files (`src/core/couple.ts`, `src/core/portal-service.ts`, action files) are append-only per unit; the parent merges.

## Log

- L1 (2026-11-13) "buenas, te dejo las correcciones que hizo para q las hagas, esta en descargas se llama modificaciones y es un pdf, decime que son y hacelas"
- L2 Explorer map: comparison Excel import exists (`uploadComparison`, `ComparisonTableView`); guest status revert is the React 19 form reset + uncontrolled `<select defaultValue>` (guests.tsx); team auth is one shared ADMIN_CODE; no team downloads; checklist has no draft concept; only "pending owner" concept is the brief LineState; cover photo upload lives on the unlinked couple "Mi página".
- L3 User decision (S21): "Mail + clave propia (Recommended)" — each member logs in with email + own password; only scrypt hashes in ADMIN_USERS (Railway); shared ADMIN_CODE keeps working until ADMIN_USERS is set.
- L4 Writers T1-T4 ran in tool worktrees created from 21a7845 (main) instead of d26890f; they read the doc by absolute path / fast-forwarded. T5/T6 worktree creation failed twice in the tool, so the parent created manual worktrees (.claude/worktrees/phase6-t5, phase6-t6).
- L5 Merges: conflicts in src/app/portal/proveedores/page.tsx (kept T2 receipts, dropped the couple download link) and parejas/[id]/tabs.tsx (kept Planos and Descargas). Seam: suite 331/331, tsc clean after removing stale .next/types, eslint src clean. S13 root cause confirmed by T4: React 19.1 uncontrolled <select defaultValue> keeps its mount default after the server-action form reset; fixed by keying the row form by its saved values; updateGuest now keeps travels/arrived.
- L6 Writer decisions to surface: choosing a comparison vendor overwrites the brief vendor; T3 publishes all drafts at once; presupuesto sheet totals per currency; team "Llegó" is in-app, printed sheet has an empty box.
- L7 T7 inline: suite 339/339, tsc + eslint clean.
