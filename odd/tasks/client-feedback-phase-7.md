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
- S8. "Presupuesto: Se puede poner como para elegir más de un rubro?" — pending product decision (how a multi-rubro item counts in totals and briefs).

Descargas
- S9. "Descargas: Poder descargar los proveedores por separado también" — the downloads page links each confirmed vendor's own sheet (`proveedores?rubro=<key>`).

## Tasks

- [x] T1 [S1-S6] brief block + ideas autosave (debounced, serialized, never reset), row × / ↑↓, ceremony "Contratado" + Contacto — inline — `88403ab` — Risk: none
- [x] T2 [S7] attachment pick check before upload (count, type incl. HEIC hint, per-type size, 11 MB total) — inline — `876feb8`, RED→GREEN 7 tests — Risk: none
- [x] T3 [S9] per-vendor links on Descargas (`proveedores?rubro=`) — inline — `b18346f` — Risk: none
- [ ] T4 [S8] budget multi-rubro — blocked on product decision

Route evidence: one parent, inline; no unit has a writer reason (each ≤ ~150 lines, sequential).

## Log

- L1 (2026-11-24) "claude me recuperas la sesion de weddinas que es la web de wedding planers que hicimos para hacer estos cambios que pidio canela" + pasted list (S1-S9 quote it verbatim).
- L2 (2026-11-24) User on S1/S2: "creo que a la fila de campo".
- L3 Map: S4/S5 root cause is the same as phase 6 S13 — React 19 resets the action form and the uncontrolled `<select defaultValue>` keeps its mount value while the header chip shows the saved status. `updateBriefBlock` already stores `fields` in the order sent, so remove/move need no model change. The vendor sheet already supports `?rubro=`.
- L4 T1-T3 inline: suite 386/386, tsc + eslint clean, `next build` OK. Not exercised in a browser (needs admin login + data).
