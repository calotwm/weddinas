# Client feedback, phase 10 (Canela: archivos, timing, planos, presupuesto, música, brief, portada, temas del mes)

Objective: apply Canela's seventh round. Branch: `feat/client-feedback-phase-10` (stacked on `feat/client-feedback-phase-9`, not merged nor deployed) · Delivery: ask-on-risk · Test runner: `npx vitest run` · UI copy in Spanish, code/comments in English.

## Specs

General
- S1. "Que se pueda adjuntar cualquier tipo de archivo en todos lados (.xlsx .doc .pdf , etc)" — accepted: PDF, JPG/PNG/WebP, Word, Excel, PowerPoint (new and old), CSV, text. HTML/SVG/programs stay rejected (they could run in the browser).

Timing
- S2. "Sigue sin respetar nuestro timing" — phase 9 (column order Horario, Horas, Minutos, Duración, Actividad, Descripción) is not deployed yet.
- S3. "Que se pueda poner enter"

Planos
- S4. "Hay alguna manera que se pueda insertar el plano de ceremonia para que lo armen directamente en la app? Si no se puede que sea para insertar un excel en vez de un pdf" — done through S1 (plans take Excel); an in-app plan builder is not built.

Presupuesto
- S5. "Cuando ponemos "Adicional" no se suma al total y se resta como si se hubiera pagado un adelanto del total. Se tiene que sumar al total y restar ese mismo número"
- S6. "Poder agregar más rubros"
- S7. "En Registrar pago que en el desplegable este tambien "Viáticos" y "Fletes""
- S8. "Nuevo item que se pueda agregar más fletes y aclarar de que es ese flete"
- S9. "En registrar pago se pueda cargar pagos para más adelante y se especifique la fecha para pagarlo (Parecido a cuando registras nuevo item)"
- S10. "Que te deje poner monto 0"

Música
- S11. "Sigue figurando "Tanda" abajo de canción de cierre. Tiene que ir donde están "Infables" y "Prohibidas" y "Link a su playlist""

Brief
- S12. "Siguen apareciendo desordenados algunos. Los estamos modificando nosotras manualmente pero si necesitaría que una vez que terminemos con las modificaciones el modelo quede bien"

Portada del contador
- S13. "Se podra hacer lo que puse arriba?" — the phase 9 cover focus picker (not deployed yet).

Temas del mes
- S14. "en temas del mes se pueda modificar una vez que le das a agregar que haya un lapiz al lado del boton "cambiar mes""

## Tasks

- [x] T1 S1, S4 inline · 372411f
- [x] T2 S5, S7, S9, S10 inline · b45faf3
- [x] T3 S6, S8 inline · ab17918
- [x] T4 S3 inline · 432a82a
- [x] T5 S11 inline · ee7a366
- [ ] T6 S12 pending: question to the user (L4)
- [x] T7 S14 inline · 4d414cb
- [ ] T8 S2, S13: deploy phase 9 + 10 (user decision)

Route evidence: no Writer trigger (all units share the couple model and service; inline in order).

## Log

- L1 (2026-11-27) user: pasted Canela's list (above) + "Tambien te agrego para que en temas del mes se pueda modificar una vez que le das a agregar que haya un lapiz al lado del boton "cambiar mes""
- L2 Engram mirror pending (project resolution ambiguous, as in phase 9).
- L3 Assumptions: S5/S7 Adicional, Viáticos and Fletes payments add to the total and count as paid (balance unchanged); an "adicional/flete por pagar" is settled with its «Pagado» button (becomes a payment of its kind); S9 planned payments count nothing as paid, planned extras add to the balance, their date feeds the next due date and alerts; S6 "+ Nuevo rubro…" in the item form creates (or reuses) a custom brief rubro; S8 fletes of a new item are "flete por pagar" charges with their purpose; S11 7 couples had a custom moment "Tandas" (Fiesta): it leaves the list and its text shows in the new Tandas field, moved into `tandas` on the next save (read-time, no stored rewrite).
- L4 S12 unclear: which blocks/fields are out of order, and what "el modelo" is (no brief template exists; new couples get the catalog order). Asked the user.
- L5 Checks: vitest 504 tests, tsc, eslint, next build OK. Not deployed. Independent verifier not run.
