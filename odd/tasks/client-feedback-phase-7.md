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
- S11. "que en la parte de brief se pueda agregar una columna por default que diga equipo y no sea visible para novios nada de esa columna y que haya un apartado asi como tenemos Parejas Proveedores Pagos Invitados Civil Pendiente donde diga "Comisiones" y traiga lo que dice cada columna por pareja" — pending: what "columna" means here (see L9).
- S12. "Y no nos lleva a nada el apartado de "Parejas" donde dice: "Propuestas respondidas" o "Propuestas sin responder"".

## Tasks

- [x] T1 [S1-S6] brief block + ideas autosave (debounced, serialized, never reset), row × / ↑↓, ceremony "Contratado" + Contacto — inline — `88403ab` — Risk: none
- [x] T2 [S7] attachment pick check before upload (count, type incl. HEIC hint, per-type size, 11 MB total) — inline — `876feb8`, RED→GREEN 7 tests — Risk: none
- [x] T3 [S9] per-vendor links on Descargas (`proveedores?rubro=`) — inline — `b18346f` — Risk: none
- [x] T4 [S8] budget item with optional `extraCategories` (main `category` kept, no migration), checkboxes "También es de otro rubro", combined row in totals, payment/receipts/confirmed guests per rubro — inline — `2c5f20e`, RED→GREEN 7 tests — Risk: item 1 (new optional persisted field) — verifier PASS (L7); advisory fixed in `3b72371`

- [x] T5 [S10] "A cargo" select with TEAM_OWNERS (+ legacy value kept as option) — inline — `555eb6a` — Risk: none
- [x] T6 [S12] /admin/propuestas (?estado=respondidas), counters link there, couple page anchor #propuestas — inline — `07ae170`, RED→GREEN 2 tests — Risk: none
- [ ] T7 [S11] "Equipo" team-only column/row + "Comisiones" section — blocked on L9 question

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
