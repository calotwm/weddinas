# Client feedback, phase 8 (Canela: payments, music, guests, timing, brief PDF)

Objective: apply Canela's fifth round (WhatsApp list + "Cambios Web - Portal Weddinas.pdf").
Branch: `feat/client-feedback-phase-8` (base `f467881`) · Delivery: ask-on-risk · Test runner: `npx vitest run` · UI copy in Spanish ("vos" for the team), code/comments in English.

## Specs

Pagos / presupuesto
- S1. "Que figure en el presupuesto solo el valor del que tiene precio fijo en nuestro presu viejo. Que NO tome el de la formula." — Decided (L7): in the old Presupuesto sheets each row has one typed price and the other currency is a formula over the row's TC (`=D8*E8`, `=C6/E6`). The import must take the typed (fixed) price, never the converted one, and the already-imported couples in production must be corrected without touching items the team edited after the import.
- S2. "Si un pago esta al 100% la propuesta pero faltan viaticos. No tiene que ir para bajo junto con el resto que estan al 100% pago." — assumption: an item with viáticos ("Fletes / viáticos: Sí") gets a "Viáticos pagos" check; until it is ticked the item is not fully paid (stays up, brief does not say "Pago al 100%").

Genérica
- S3. "Se va cerrando cada poco tiempo la pag. Por que?" — cause: the admin session is a fixed 12 h cookie with no renewal. Fix: sliding session, renewed on activity.
- S4. "Que los guardar sea automatico" — forms that still have a Guardar button save on their own (estética, web options, guest rows, timing rows, timing link, budget item, budget quote/guests). Create/add forms keep their button.

Música
- S5. "Hay que sumar el enter en los espacios a completar" — song and note inputs accept Enter (multi-line).
- S6. "Sacar artista directamente y que sea mas grande el espacio a completar del que queda".
- S7. "Colores: Verde para elegida y amarillo para pendiente. Borrar el "No aplica"" — stored "na" songs read as pending.
- S8. "Sumar rayitas de arrastre tambien en la parte de canciones" — drag handles reorder song rows.
- S9. PDF: "En Canciones (Fiesta), eliminar la sección "Tandas", ya que esa información ya figura más abajo." — remove the phase 7 Tandas textarea from the UI (stored text is kept, not shown).

Estética
- S10. "Eliminar nombre del color. que solo quede color y numero de color".

Timing
- S11. "Ya con el link del excel que ponemos arriba queremos que se vaya la foto de abajo pero que se baje todo lo que es timing ahi" — remove the "Imagen del timing" card (admin and portal); the schedule moves up.
- S12. "Si se puede hacer lo del link que ese sea el que se pueda descargar" — assumption: the Excel link becomes a "Descargar timing" button for the couple (portal timing) and the team (Google Sheets links download as .xlsx).

Invitados
- S13. "Sacar lo de "pegar una lista"".
- S14. "Que se pueda filtrar : Sin mesa, sin menu, sin combi, sin telefono y sin edad. Que toda la informacion sea filtrable".
- S15. "Orden del listado: Apellido, nombre, edad, RSVP, mesa, menu, combi, telefono, notas" — guests get a new "Notas" field.
- S16. "Sacar relación y poner en mas datos".
- S17. "No funciona el check de llego poner al lado del numero y falta conteo de cuantos faltan ingresar y cuantos ingresaron".
- S18. "Orden de nuestro listado para enviar listado: Apellido, nombre, edad, mesa, menu".
- S19. "Que tambien se sume el invitado aunque no este en la lista cuadno llegue al wordpress" — an RSVP that matches no guest creates the guest.
- S20. "Sacar el boton de "Cambiar link (el anterior deja de andar)"".

Brief (PDF)
- S21. "Basarnos en el brief de "Agus y Ventu" para que todos los brief figure lo mismo" — the catalog rubros take that brief's rows and order (from the production backup); every stored brief is reshaped once (TEMPLATE_VERSION): written rows kept, empty rows outside the template dropped.
- S22. "Permitir arrastrar y soltar filas para reordenarlas, en lugar de moverlas con flechas."
- S23. "Agregar Ceremonia como un proveedor independiente." — assumption: a new core vendor rubro "Ceremonia" (key `ceremonia-proveedor`), separate from the Ceremonia event block.
- S24. "Cambiar el proveedor "Combis" por "Autos y Combis"."
- S25. "Permitir modificar títulos, especialmente en "Show de Ceremonia", ya que en algunos casos corresponde a Ceremonia y Recepción." — every block's title is editable per couple.
- S26. "Eliminar la fila "Proveedor" de todos los rubros." — Decided (L7): "proveedor dice de todos los rubros, cualquier cosa hacelo y hace un backup por si lo quiere devuelta". The "Proveedor" row exists in 216 production rubros (the old sheets' row, kept by the import); drop it from every rubro: its name fills an empty header vendor and any other text moves to the first row. Backup of the removed rows kept outside the repo (weddinas-backups/proveedor-rows-2026-11-26.json).
- S27. "Eliminar la fila "Contrato" de todos los proveedores." — also removed from stored briefs.
- S28. "Eliminar el estado "En búsqueda"." — stored "searching" reads as "Para decidir".
- S29. "En Invitación, eliminar la opción "Confirmación"." — the "Confirmaciones" row, also from stored briefs.
- S30. "Aclaraciones: Permitir utilizar Enter para generar saltos de línea y escribir contenido en distintos párrafos."
- S31. "Fila Equipo: Ocultar el campo de "Aclaraciones". Dejar únicamente el primer campo para completar."
- S32. "A Cargo (Equipo): Agregar "Novios" como opción dentro del desplegable."
- S33. "Catering: En Recepción, mostrar las palabras "Fríos" y "Calientes" en negrita tanto en nuestro portal como en el de los novios."

Portal de los novios (PDF)
- S34. "Invitación: Mostrar únicamente "Save The Date" e "Invitación Digital". Hacer visible el Save The Date. Hacer visible el link de la web." — assumption: the couple sees the Invitaciones block with just those two rows whenever they have content, and links are clickable.
- S35. "Civil: No figura en el portal de los novios. Revisar su visualización." — cause: event blocks only show once "Confirmado". Fix: event blocks show when they have content.

Comentarios (PDF)
- S36. "Incorporar comentarios con menciones (@). Que al mencionar a una integrante del equipo le llegue una notificación. Que cada persona pueda identificar fácilmente qué tareas tiene pendientes. Evaluar reemplazar las flechas de desplazamiento por un botón de "Comentarios" que permita realizar menciones específicas." — Decided (L7): "las menciones que sea en la web tipo cuando te figura una notificacion en el teams web y que tenga un sonido". In-app notification in the team panel (badge + list, like Teams web) with a sound; no email.

Integraciones (PDF)
- S37. "Vincular las selecciones de DJ y Técnica con la solapa Música. Vincular las selecciones de los Shows con la solapa Música." — assumption: the DJ block and the show blocks show the Música choices (read-only, linked to the tab).
- S38. "Diseños de Papelería y Detalles: Vincularlos con los diseños cargados en la sección Estética." — assumption: the Papelería block shows the stationery designs uploaded in Estética.

## Tasks

- [x] T1 S22-S25,S27-S35 brief + portal — delegated (parallel writer, worktree) · b9e51b8, 5549c2f
- [x] T2 S5-S10 music + estética — delegated (parallel writer, worktree) · 6c1ff16, ac634c4
- [x] T3 S13-S20 guests — delegated (parallel writer, worktree) · 8d5fcbc, 0049923
- [x] T4 S2 budget viáticos — inline · 499bec5
- [x] T5 S3 sliding session — inline (Risk: item 2) · 4b17ec8
- [x] T6 S11-S12 timing — inline · 09477e9
- [~] T7 S4 autosave — timing rows, web options, budget dollar/guests (a5054b4, ab95607); guests rows (T2/T3); estética (T2). Still with a button: budget item edit, timing sheet link, proposals, welcome message, WhatsApp, portal family/public page.
- [x] T8 S37-S38 integrations — inline (assumption: show-intervención ↔ Comidas, show-fiesta ↔ Fiesta) · ab95607
- [x] T10 S21 template — inline · 9bf46dc (probe on a production backup copy: 23 couples, 602 blocks, 0 texts lost, idempotent; 1339 empty rows dropped)
- [x] T11 S1 fixed price in the sheet import + production correction — inline (Risk: item 1, stored data) · 66d3ebb
- [x] T12 S26 drop the "Proveedor" row (217 rows in production, carried over by the import) — inline · f8a411d
- [x] T13 S36 comments with @mentions + in-app bell with sound and Menciones page — inline · 92426b9

## Log

- L1 (2026-11-25) User: "buenas hay que suamr cosas," + pasted WhatsApp list (Pagos, Generica, Musica, General, Estetica, Timing, Invitados) + "C:\Users\cseifar\Downloads\Cambios Web - Portal Weddinas.pdf" (quoted in Specs).
- L2 Route: three independent units with disjoint surfaces (brief, music/estética, guests) go to parallel writers in worktrees; the rest inline.
- L3 Merged T1-T3 cleanly; seam check: vitest 49 files / 443 tests, tsc and eslint clean.
- L4 Production build OK. Independent verifier: no blockers; S2-S3, S5-S20, S22-S25, S27-S35, S37-S38 PASS; S4 PARTIAL (budget item, timing link keep a button). Advisories: old items with viáticos "No incluido" now read as owing until "Viáticos pagos" is ticked; artist dropped when the title already contains it; printed guest list lost N°/Estado/Llegó. Fixed: first renewal on the first activity after loading (9fa8418).
- L5 (2026-11-25) User: "vos mandale ya fue" / "proba de vuelta, vos tenes los usuarios maestro los hiciste vos fijate si estan localmente o subidos". Railway SSH timed out; backup fetched from /admin/backup with a team session signed with the production SESSION_SECRET (read only).
- L6 (2026-11-25) User: "subi todo esto y dsps hace lo que falta tmb suma un buscador en el brief y revisa que el codigo no este tipo plagado de cosas que quizas podrian mejorarse, comentame lo que en cuentres despues de subir y sumar el buscador en el breif". main fast-forwarded and pushed; Railway deploy 6ac84c38 SUCCESS (phase 8), then brief search 3e98a1c deployed 075574b6 SUCCESS. Code review findings reported to the user (easy access codes derivable from the public page; swallowed errors in portal/timing actions; settings.json read-modify-write; unserialized createCouple; sync full-file reads).
- L7 (2026-11-26) User: "proveedor dice de todos los rubros, cualquier cosa hacelo y hace un backup por si lo quiere devuelta, las menciones que sea en la web tipo cuando te figura una notificacion en el teams web y que tenga un sonido, 1 es eso, hace el coambio lo del precio pq esta pasando eso". Evidence for S1: in the 23 source workbooks the converted column is a formula over the same row's TC cell (e.g. ARS `D8*E8` with USD typed 10250); the importer summed the converted value whenever the item currency differed from the typed one.
- L8 T11-T13: vitest 53 files / 460 tests, tsc, eslint and next build clean. S1 plan on a production backup copy: 67 imported items took a converted price; 60 are still exactly as imported and get corrected through the team-only /admin/budget-corrections endpoint (applies only when the item still matches the import); 7 were edited by the team and are left for review. S26 probe: 217 rows removed, 22 header vendors filled, 0 texts lost, idempotent.
