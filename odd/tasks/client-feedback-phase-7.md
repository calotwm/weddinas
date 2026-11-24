# Client feedback, phase 7 (Canela, brief/budget/downloads round)

Objective: apply Canela's fourth round of feedback to the team brief, budget and downloads.
Branch: `feat/client-feedback-phase-7` (base `9330905`) · Delivery: ask-on-risk · Test runner: `npx vitest run` · UI copy in Spanish ("vos" for the team), code/comments in English.

## Specs

Brief
- S1. "Brief: Que haya una cruz para sacar las columnas" — user clarified: the field rows ("creo que a la fila de campo"). Each field row gets an × that removes it.
- S2. "Brief: Que haya un botón para poder mover las columnas" — field rows can be moved up/down.
- S3. "Brief ceremonia: Que quede el título de la persona que se contrató como en la parte de proveedores" — assumption: the Ceremonia block gets the Proveedor/Contacto inputs, and its header shows "· <name>" like vendor rubros.
- S4. "Brief estados: No se actualizan. Hay que darle guardar y ahí volver a cargar la web".
- S5. "Brief estados: A veces cuando ponemos confirmado queda confirmado en el titulo pero en el estado queda “para decidir"".
- S6. "Brief: Se puede sacar el botón de guardar y que quede guardado cuando se escribe?" — the block saves itself while typing; no "Guardar" button.
- S7. "Brief subir archivos: Tira error en algunos casos" — assumption (no repro given): oversized picks reach the server-action body limit and fail with an opaque error; the form checks sizes/types before sending and names the file that cannot go.

Presupuesto
- S8. "Presupuesto: Se puede poner como para elegir más de un rubro?" — user accepted (L5): the item shows as "Espacio + Catering", counts once in the totals, and its payment shows in the brief "Pago" line of each selected rubro.

Descargas
- S9. "Descargas: Poder descargar los proveedores por separado también" — the downloads page links each confirmed vendor's own sheet (`proveedores?rubro=<key>`).

Segunda tanda (WhatsApp, 2026-11-24)
- S10. "En la parte de proveedores a cargo estaría bueno que sea un despegable - Weddinas - Cane - Nat - More - Pauli - Belu - Abru".
- S11. "que en la parte de brief se pueda agregar una columna por default que diga equipo y no sea visible para novios nada de esa columna y que haya un apartado asi como tenemos Parejas Proveedores Pagos Invitados Civil Pendiente donde diga "Comisiones" y traiga lo que dice cada columna por pareja" — user chose (L11): a default "Equipo" row in every vendor rubro, team-only, and a "Comisiones" nav section listing it per couple.
- S12. "Y no nos lleva a nada el apartado de "Parejas" donde dice: "Propuestas respondidas" o "Propuestas sin responder"".

- S13. "Y en la parte de canciones agregaria que este "Tandas" en el apartado que aparece "Infaltables para la fiesta" y "Prohibidas" — both portals (shared music form).

## Tasks

- [x] T1 [S1-S6] brief block + ideas autosave (debounced, serialized, never reset), row × / ↑↓, ceremony "Contratado" + Contacto — inline — `88403ab` — Risk: none
- [x] T2 [S7] attachment pick check before upload (count, type incl. HEIC hint, per-type size, 11 MB total) — inline — `876feb8`, RED→GREEN 7 tests — Risk: none
- [x] T3 [S9] per-vendor links on Descargas (`proveedores?rubro=`) — inline — `b18346f` — Risk: none
- [x] T4 [S8] budget item with optional `extraCategories` (main `category` kept, no migration), checkboxes "También es de otro rubro", combined row in totals, payment/receipts/confirmed guests per rubro — inline — `2c5f20e`, RED→GREEN 7 tests — Risk: item 1 (new optional persisted field) — verifier PASS (L7); advisory fixed in `3b72371`

- [x] T5 [S10] "A cargo" select with TEAM_OWNERS (+ legacy value kept as option) — inline — `555eb6a` — Risk: none
- [x] T6 [S12] /admin/propuestas (?estado=respondidas), counters link there, couple page anchor #propuestas — inline — `07ae170`, RED→GREEN 2 tests — Risk: none
- [x] T8 [S13] optional `tandas` on Music, textarea in the Infaltables/Prohibidas card, shown in the summary and music download — inline — `3c94529`, RED→GREEN 1 test — Risk: item 1 (new optional persisted field) — independent verifier deferred to feature end (verification timing rule)
- [x] T7 [S11] TEAM_FIELD "Equipo" row on every vendor rubro (load-time), hidden via `coupleFields` from the couple portal and vendor sheets, /admin/comisiones in the nav; also fixes T1: `withCatalogFields` kept re-sorting/re-adding catalog rows on load, so moves/removals were undone on reload — now stored order is kept and removals are remembered in `removedFields` — inline — `3c74713`, RED→GREEN 5 tests — Risk: items 1 (persisted normalization + new optional field) and 2 (team data hidden from the couple)
- [x] T9 final independent verifier (risk items 1, 2): PASS, no blockers → main fast-forwarded to `8653e59`, pushed, deployed to Railway

Route evidence: one parent, inline; no unit has a writer reason (each ≤ ~150 lines, sequential).

## Log

- L1 (2026-11-24) "claude me recuperas la sesion de weddinas que es la web de wedding planers que hicimos para hacer estos cambios que pidio canela" + pasted list (S1-S9 quote it verbatim).
- L2 (2026-11-24) User on S1/S2: "creo que a la fila de campo".
- L3 Map: S4/S5 root cause is the same as phase 6 S13 — React 19 resets the action form and the uncontrolled `<select defaultValue>` keeps its mount value while the header chip shows the saved status. `updateBriefBlock` already stores `fields` in the order sent, so remove/move need no model change. The vendor sheet already supports `?rubro=`.
- L4 T1-T3 inline: suite 386/386, tsc + eslint clean, `next build` OK. Not exercised in a browser (needs admin login + data).
- L5 (2026-11-24) User on S8 proposal: "si es lo que dijo ella si".
- L6 T4 inline: suite 393/393 (budget sheet test updated for the new `categories` row field), tsc + eslint clean, build OK. RDD off (global), no native review.
- L7 Verifier on 2c5f20e: PASS on backward compatibility, clearing/validation, single count + anchors, other readers; suite 395/395, tsc clean. Advisory: a removed custom main rubro moved into extras was rejected → fixed `3b72371` with test. Pre-existing advisory: sheet refresh (`replaceSheetData`) replaces budget items, dropping app-set extras like any other app edit.
- L8 Found while typechecking: `2c5f20e` edited `downloads.test.ts` fixtures with a non-BudgetItem key (vitest passed, tsc failed) → fixed `75f016d`.
- L9 (2026-11-24) Second batch pasted (S10-S12) plus Canela's question "Nosotras podemos ir modificando o esperamos a que terminen ustedes para hacerlo?". S11 asked to the user: whether "columna" means a default team-only field row "Equipo" in every vendor rubro (their word for rows, L2) aggregated per couple in "Comisiones".
- L10 (2026-11-24) User: "Y en la parte de canciones agregaria que este "Tandas" en el apartado que aparece "Infaltables para la fiesta" y "Prohibidas te sumo lo ultimo". Suite 397/397, tsc + eslint + build OK. S11 question still unanswered.
- L11 (2026-11-24) User: "subi todo lo que falta, hace lo primero y fue" — option 1 for S11, and push/deploy everything.
- L12 Found while building T7: `withCatalogFields` (load-time) rebuilt catalog rows in catalog order and re-added missing ones, undoing T1's move/remove after reload. Fixed in `3c74713`; two existing tests updated to the kept-order expectation. Suite 402/402, tsc + eslint + build OK.
- L13 Final verifier on 9330905..8653e59: PASS (old stored shapes load without loss and are idempotent over 3 load/save cycles; row moves/removals survive reload; Equipo never rendered for the couple or vendor sheets, server components only; autosave serialized; new pages behind requireAdmin); 402/402, tsc, eslint clean. Advisories: a brief page left open from before the deploy saves without the Equipo row once and marks it removed (re-add by name); renaming a required row records the old label as removed.
- L14 (2026-11-24) main fast-forwarded and pushed (9330905..8653e59), `railway up` deploy complete; prod / 200, /admin, /admin/comisiones, /admin/propuestas 307 to login. Not browser-tested logged in.
- L15 (2026-11-24) User: "Y queriendo cargar una propuesta me tira esto  Entre el cuadro y los archivos pesan mas de 11 mb suma el resto desde la propuesta, se puede cambiar?". Limits centralized in `src/core/upload-limits.ts`: 40 MB per upload request (bodySizeLimit 41mb), 20 MB per PDF, images and Excel stay 5 MB — `17da788`, suite 402/402, deployed; prod probe: a 30 MB multipart POST reached Next (logs: "Failed to find Server Action", not a body-size error, no proxy 413).
