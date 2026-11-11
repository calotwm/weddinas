# Client feedback, phase 4 (match the agency's own spreadsheets)

Objective: make Invitados and Timing match the agency's Excel files (example couple folder), import the guest list from that Excel, and keep the uploaded comparison .xlsx downloadable.
Branch: `feat/client-feedback-phase-4` · Delivery: ask-on-risk (user: "dale y segui con lo que falta") · Test runner: `npx vitest run` · UI copy in Spanish (rioplatense "ustedes" for the couple, "vos" for the team), code/comments in English.

## Specs

- S1. Guest list like "Lista de invitados - <pareja>.xlsx", sheet "Lista", header row `N | APELLIDO | NOMBRE | EDAD | RSVP | MESA | MENÚ | COMBI | MUSICA | MENSAJE | RELACIÓN | INVITADO | VIAJA | TELEFONO` (header is not on row 1: a summary block "Composición invitado" / "Confirmaciones" / "Invitados por mesa" sits above it). Observed values: EDAD `Adulto/Teen/Niño/Bebe`; RSVP `Si/No/Enviado` (blank = not sent); MESA `PRINCIPAL` or numbers; MENÚ `Sin restriccion/Celíaco/Vegetariano/Alergia a crustáceos…`; COMBI `No/Si (ida y vuelta)…`; RELACIÓN `Familia/Amigos/Amigos de familia`; INVITADO = which partner (`Anita/Fran`); VIAJA `Si/No`. Guests gain: apellido, edad (adulto/teen/niño/bebé), invitado de (partner), combi, viaja, teléfono; status gains "Enviado" (invitation sent, no answer) next to confirmado / pendiente / no viene; "restricción" is shown as "Menú"; "grupo" is shown as "Relación". Existing guests keep working (new fields optional). The summary shows the same blocks as her sheet: composición por edad, confirmaciones (Sí / No / Enviado / sin enviar) and invitados por mesa.
- S2. Import the guest list from that Excel (team and couple): upload the .xlsx, find the header row by its labels anywhere in the first rows of the first sheet that has them, map columns by label (accent/case/space-insensitive), skip empty rows, and either add to or replace the current list (the user chooses; replace asks for confirmation). Columns MUSICA and MENSAJE are ignored. Unknown values in EDAD/RSVP stay empty/pending. Limits: .xlsx up to 5 MB, up to 1000 guests. Reuses the server-only exceljs already in the project.
- S3. Timing like "Timing - <pareja>.xlsx": sheet "Timing" `Horario | Horas | Minutos | Duración | Actividad | Descripción` and sheet "Timing proveedores" `Horario | Rubro | Empresa | Contacto`. Timing items show their duration (from the next item's time, e.g. "1 h", "30 min", "1 h 30 min"; the last item shows none); labels read Horario / Actividad / Descripción. A second list "Timing proveedores" (horario, rubro, empresa, contacto) edited by the team and visible to the couple, in the same page and home card.
- S4. Keep the comparison .xlsx downloadable (phase 3 L3): the uploaded file is also stored as an attachment of the proposal, visible to the team only (internal), shown with a file icon, not as an image. Requires accepting .xlsx in the file store (signature check: ZIP "PK\x03\x04" plus an xlsx workbook entry), risk item 2.

## Tasks

- [ ] T1 [S1, S2] guests like her Excel + import — delegated writer (worktree)
- [ ] T2 [S4] xlsx attachments for comparison tables — delegated writer (worktree) — Risk item 2 (upload validation)
- [ ] T3 [S3] timing durations + vendor timing — inline
- [ ] T4 merge, suite, build, smoke, independent verifier for S4 (item 2) and the exceljs dependency (item 5, owed from phase 3)

Route evidence: T1 (model, parser, import action, forms, summary; several files, 300+ lines) and T2 (upload validation, store, attachment view, comparison action) are independent units running in parallel with the inline T3 (Writer trigger a). Shared files (`src/core/couple.ts`, `src/core/portal-service.ts`) are append-only per unit; the parent merges.

## Log

- L1 (2026-11-11) User: "dale y segui con lo que falta" (after phase 3: merge, push, then continue with what is left: Invitados/Timing like her spreadsheets, keep the comparison .xlsx downloadable).
- L2 Phase 3 merged and pushed: main `750035c`.
