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
- [ ] T2 S5, S7, S9, S10 inline (payments)
- [ ] T3 S6, S8 inline (item form)
- [ ] T4 S3 inline
- [ ] T5 S11 inline
- [ ] T6 S12 inline
- [ ] T7 S14 inline
- [ ] T8 S2, S13: deploy phase 9 + 10 (user decision)

Route evidence: no Writer trigger (all units share the couple model and service; inline in order).

## Log

- L1 (2026-11-27) user: pasted Canela's list (above) + "Tambien te agrego para que en temas del mes se pueda modificar una vez que le das a agregar que haya un lapiz al lado del boton "cambiar mes""
- L2 Engram mirror pending (project resolution ambiguous, as in phase 9).
