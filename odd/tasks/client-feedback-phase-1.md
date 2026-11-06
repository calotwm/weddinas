# Client feedback, phase 1 (quick wins from "Sistema Weddinas.pdf")

Objective: ship the client's requested changes that need no further answer from her; the rest waits on her (see Log L2).
Branch: `feat/client-feedback-phase-1` · Delivery: ask-on-risk · Test runner: `npx vitest run`

## Specs

- S1. Acceso: "Borrar logos de abajo en acceso que no se pueden tocar ni sirven para nada" — remove the four non-clickable feature icons under the login card.
- S2. "Logos para los títulos de arriba: Musica con loguito de nota musical o auriculares - Presupuesto con signo $".
- S3. Reportes: "Que se pase a llamar Notificaciones y aparezca con el numerito de cosas sin abrir como en las redes sociales" — the couple nav shows "Notificaciones" with an unread count; opening the page marks them read. Notifications = presented proposals and existing reports (assumption, since the team side drops "reporte", S8).
- S4. Resumen: "Cambiar el ultimo reportes del resumen principal x 'pagos pendientes' (del mes en curso)"; "Sacar del resumen: La parte de la pag web". Assumption: a budget item gets an optional "próximo vencimiento" date set by the team; the card lists items with a balance due this month or overdue.
- S5. Presupuesto: "Sumar gráfico de torta", "Moneda ($ y USD)", "Botón para desglose de cada rubro (que lo lleve abajo a donde esta cuando lo clickea)", "Los cuadrados que estan pagos al 100% que se vayan abajo de todo", "Sumar alerta de pago por realizarse" (alert for items due within 7 days or overdue).
- S6. Propuestas (equipo): "Al momento de estar armando un cuadro que figure como borrador (y no les aparezca a los novios) y despues tener un boton de 'presentar' para que recien ahi les aparezca".
- S7. Propuestas (novios): "Que aparezca en propuesta arriba a la derecha 'nuevo' subido hace X cantidad de días"; "Todo lo que vayamos presentando puede quedar abajo de la otra".
- S8. Panel: "Sacar 'reporte'"; "Sacar Nueva Pareja y agregar un + abajo de todas las parejas"; "Parejas: Que aparezca por fecha".
- S9. Música: "Hace falta apretar el botón de guardar canciones cada vez que se agrega una? Sentimos que no va a ser cómodo para los novios" — save automatically.
- S10. Proveedores: "En todos que figure: 1. Pago 2. Cantidad de horas 3. Cantidad de personas confirmadas 4. Servicio 5. Fletes 6. Deposito de garantia 7. Contrato 8. Detalle del servicio 9. Documentos"; "Espacio: Mobiliario, Impuestos musicales, Canon"; "Catering: Dentro del detalle dejar todos los pasos gastronómicos habituales ... y que en cada sección haya un 'Ver mas'" (Recepción, Bocaditos fríos y calientes, Islas, Plato principal, Postre, Mesa dulce, Torta de bodas, Café, Fin de fiesta gastronómico, Mantelería, Vinos y champagne, Adicionales, Aclaraciones, Vianda proveedores, Degustación). Existing blocks gain the missing fields without losing data. "Documentos" = the block's attachments.

## Tasks

- [x] T1 [S1, S2] access icons, nav icons — inline — `b81e6c3`
- [x] T2 [S3, S8] notifications + unread badge; drop report form; "+" new couple — inline — `b81e6c3`, `63eeb64`, `d8d9925`
- [x] T3 [S6, S7] proposal drafts, Presentar, "Nuevo" badge — inline — `63eeb64`, `d8d9925`
- [x] T4 [S4, S5] due date, pending payments card, budget chart/anchors/order/alert — inline — `63eeb64`, `d8d9925`
- [x] T5 [S9] music autosave — inline — `b81e6c3`
- [x] T6 [S10] vendor fields and catering steps — inline — `e13fa9c` (Risk item 1: independent verifier)

## Log

- L1 (2026-11-06) "bancexplicame que es lo que falta de ella tipo las preugntas de lo que faltan decime que pidio y que falta, lo que se pueda hacer hacelo" — over the client's PDF "Sistema Weddinas.pdf".
- L2 Waiting on the client: cuadro refe Pauli (comparison table), Excel sample, Estética vs public page, guest list data, Timing sample, brief per-line color meaning, Civil section, reminder days, access code format, WhatsApp route, checklist "carátula" month template, vendor titles "Espacio, Catering... Looks...", what shows "pagado".
- L3 Parejas are already sorted by wedding date (`listCouples`), S8 date order needs no change.
- L4 Evidence: RED 7 failing → GREEN 88 tests; tsc, eslint and `next build` clean. Playwright smoke on a copy of the demo data: access icons gone, draft hidden from the couple, Presentar shows it with "Nuevo · subida hoy", unread badge 1 → cleared on opening, paid item sorted last, home "Pagos pendientes" lists the item due 10 nov, budget alert + $/USD switch, music autosave persists after reload, no page errors. Nav fits "Notificaciones" at 1280 and 390 px.
- L5 Not done in phase 1 ("pagado" word): no "Pagado" text exists in the brief catalog; it probably comes from the detail the team typed. Waiting on the client to say where she sees it.
- L6 Verifier on e13fa9c: no blockers, 4/4 PASS (no loss, idempotent, form round-trip, couple view). Advisory: a block storing both an old and a new label shows two rows with the same label; data kept.
