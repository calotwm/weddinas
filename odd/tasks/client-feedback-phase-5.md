# Client feedback, phase 5 (second review round)

Objective: apply the agency's second review of the couple and team portals, plus an RSVP bridge from their Elementor invitation forms.
Branch: `feat/client-feedback-phase-5` · Delivery: ask-on-risk (user: "segui con lo que se pueda mejorar") · Test runner: `npx vitest run` · UI copy in Spanish (rioplatense "ustedes" for the couple, "vos" for the team), code/comments in English.

## Specs

Couple portal
- S1. Propuestas: "Ancho de cuadro: Se podrá ver más grande y que quede fijado la columna de la izquierda y la fila de arriba de todo?" — comparison table uses the full page width (out of the max-w-3xl card) and keeps the first column and the header row fixed while scrolling.
- S2. Propuestas: "Seleccionar: Pueden seleccionar como un botón "Elegir" con la que quieran avanzar o las finalistas?" — the couple's approve button reads "Elegir" (same effect as approving today); a "Finalista" toggle marks shortlisted proposals (visible to the team, reversible, does not change the status).
- S3. Proveedores: "Botón descargar: Que no aparezcan los adjuntos y que no haya página en blanco" — printed vendor sheets omit attachments and produce no blank pages.
- S4. Proveedores: "Botón ver más: Que después se pueda poner botón "ver menos"".
- S5. Presupuesto: "Gráfico de torta: Que se vea graficamente cuanto pagaron y cuanto falta. No los proveedores".
- S6. Presupuesto: "Botón $ o USD: Dejar solo "USD dólares"" — remove the currency switch; totals in USD.
- S7. Presupuesto: "Flete/Viáticos: Agregar item de si está inlcuido o no" — each budget item records whether freight/travel expenses are included (sí / no / sin dato).
- S8. Presupuesto: "Diferencia entre pagos al 100% y los que queda saldo: Agregar una linea o algo distintivo más allá de los que ya están pagos se van para abajo".
- S9. Presupuesto: "Carga de presupuesto: Que se pueda adjuntar el comprobante de pago/recibos/etc" — a payment can carry a receipt file (image or PDF), couple and team.
- S10. Presupuesto: "Monto pago: Se puede anexar con lo que figura como "pago" en el "brief/proveedores"?" — the brief's "Pago" for a vendor shows what the budget says for that rubro (paid / paid of total) without manual typing.
- S11. Notificaciones: "Se puede poner como icono arriba al lado de la flechita "salir"?" — bell icon with unread count in the header next to "Salir".
- S12. Temas del mes: "Portal de novios: Que no se pueda cargar desde el de ellos. Solo ver y darle check".
- S13. Fotos familiares: "Foto - Que figure más grande"; "Aclaraciones - Agregar un cuadro de texto para aclaraciones y que como ejemplo figure "Color de vestido, rasgo en especial"".
- S14. Estética General: "Tipografía títulos", "Tipografía textos", "Colores", "Ideas".
- S15. Estética Web: "Opciones de web:" Opción 1 https://invitaciones.weddinas.com/clariymati/ · Opción 2 https://invitaciones.weddinas.com/luygaston/ · Opción 3 https://invitaciones.weddinas.com/evelynygabrieles/ · Opción 4 https://invitaciones.weddinas.com/anitayfran/ ; "Desplegable con estas opciones:"
  - Bienvenida: Nuestra boda | Nuestro casamiento | Bienvenidos | Nos casamos | Nada | Otra opción (escribirla)
  - Nombres: Apodo y Apodo | Nombre y Nombre | Nombre y apellido y Nombre y apellido | Otra opción (Escribirla)
  - Fecha: XX.XX.XX | XX/XX/XX | XX|XX|XX | XX-XX-XX
  - Frase para la web: Escribir una frase que quieran | Nada
  - Código de vestimenta: Formal | Informal | Elegante | Elegante sport | Otra opción (Acá se puede profundizar en colores a utilizar, blanco exclusivo novia, recomendación de calzado)
  - Frase regalos: Queres hacernos un regalo? | Nos ayudas con la luna de miel? | Otra opción (Escribirla)
  - Regalos (Aclarar cuentas, recomendamos cambiar el alias para que quede algo relacionado a la boda): Cuenta en $ y dólares + Sobre el día del evento | Cuenta en $ | Cuenta en dólares | Nada | Otra opción (escribirla)
  - Instagram: Cuenta de la boda | Hashtag | Nada | Otra opción (Escribirla)
  - Canciones: Poner link spotify | Agregarlo en la parte de confirmación | Nada | Otra opción (Escribirla)
  - Mensaje a novios: Agregarlo en la parte de confirmación | Nada | Otra opción (Escribirla)
- S16. Timing: "Que solo les aparezca como queda y no para agregar/sacar" — couple sees timing read-only.
- S17. Lista: "Sacar: Viaja".
- S18. Lista: "Vincular: Se podría vincular de alguna manera lo que a nosotras nos llega de confirmados en wordpress de cada listado acá?" — RSVP webhook from the Elementor form (Nombre y apellido, asistencia, menú, canción, mensaje) with a per-couple secret token; matches guests by name, unmatched answers listed for manual assignment.
- S19. Lista: "Mesas: Una vez que se elige dónde va cada invitado por mesa se podría filtrar de alguna manera las mesas como para ver como te quedaron?"
- S20. Lista: "Invitados: Que figure invitados confirmados/invitados totales en números. No en porcentajes".

Team portal
- S21. Proveedores (top): "Si en brief agregamos otra opción pueda figurar acá. O sea si ya hay solo 1 casamiento que coinicida por ejemplo con "Fuegos artificiales" que aparezca acá".
- S22. Invitados: "En vez de "Bodas que ya fueron" que diga "Bodas realizadas"".
- S23. Nueva propuesta: "Modificar "presupuesto" a "presupuesto destinado"".
- S24. Propuestas: "Botón para nosotras editar esas propuestas por encima".
- S25. Brief: "Que se puedan agregar otras opciones más allá de las que aparecen en el desplegable" — custom rubros by name.
- S26. Brief: "Figura lo de los colores pero cuando se pone no aparece en color eso" — the team's line-state control shows its color.
- S27. Presupuesto: "Poder cargar comprobantes de pago" (see S9); "Poder agregar en las opciones "intermedio" por si hay algun pago que se realiza en el medio"; "Dejar aclarado asi como esta lo del indec. Que es el dolar blue intermedio entre compra/venta de dolarhoy".
- S28. Temas del mes WhatsApp text: "Sacar año y que figure así:" `Hola X y X! Cómo están?` / `Les enviamos los temas de este mes:` / `*Pendientes:*` / `* ` / `*Temas para ver:*` / `* ` / blank / `Lo pueden ver en el portal: LINK` / `Cualquier otra cosa nos avisan!`; "Enviar por whatsapp: Que siempre figure esa opción".
- S29. Música y fotos familiares: "Poder editarla nosotras también".

Answered without code: PDFs of proposals go to the proposal's attachments (already); proposal accepted → brief (already automatic); timing like theirs (phase 4, not yet published); import (phase 4, not yet published); carátula pending her image.

## Tasks

- [ ] T1 [S1-S4, S11-S13, S16, S17, S19, S20, S29] couple portal tweaks + team edits music/family — delegated writer (worktree)
- [ ] T2 [S5-S10, S27] budget — delegated writer (worktree)
- [ ] T3 [S14, S15] estética general + web — delegated writer (worktree)
- [ ] T4 [S21-S26, S28] team admin — delegated writer (worktree)
- [ ] T5 [S18] RSVP webhook — inline after merge — Risk item 2 (public endpoint), independent verifier
- [ ] T6 merge, suite, build, smoke

Route evidence: T1-T4 are independent units with mostly disjoint surfaces, each several files / 100+ lines, launched together (Writer trigger a). Shared files (`src/core/couple.ts`, `src/core/portal-service.ts`) are append-only per unit; the parent merges.

## Log

- L1 (2026-11-11) User pasted the agency's second review (Canela) and: "me paso eso entra a las paginas no tienen acceso ni nada y chequea"; then "uso la publicada, segui con lo que se pueda mejorar, te sirve seguir usando elementor o meh".
- L2 Invitation pages: WordPress + Elementor Pro; RSVP form "Form invitación asistencia" fields: Nombre y apellido (`form_fields[name]`), asistencia select, menú select, canción text, mensaje text. Decision: keep Elementor, bridge via webhook.
