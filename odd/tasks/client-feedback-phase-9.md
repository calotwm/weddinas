# Client feedback, phase 9 (Canela: estética, invitados, timing, presupuesto, brief, propuestas, descargas)

Objective: apply Canela's sixth round (WhatsApp "CAMBIOS APP" list).
Branch: `feat/client-feedback-phase-9` (base `bc50cbb`) · Delivery: ask-on-risk · Test runner: `npx vitest run` · UI copy in Spanish, code/comments in English.

## Specs

Estética
- S1. "Cambiar nombre papelería por elementos gráficos"

Invitados
- S2. "Que se puedan ver bien todos los campos"
- S3. "Agregar columna lista A lista B y que la lista B quede en un apartado abajo"
- S4. "Necesitaríamos que se haga un descargable de mesas ordenadas de principal en adelante"
- S5. "Que aparezca en la lista de invitados un resumen arriba de todo con restricciones"

Timing
- S6. "Que respete este orden y que se pueda ir cargando así tal cual como este: <sheet> q que sea primero horario, + horas + minutos + duración + actividad + descripción + agregar 4 columnas por default (solo para equipo) y que podamos cargar o sacar más columnas + que podamos agregar cosas que solo vea el equipo (A veces hay sorpresas para los novios)" — reference sheet (Nat y Yayi): `Horario | Horas | Minutos | Duración | Actividad | Descripción`; Horas/Minutos are the duration split, Duración its text ("30 min", "1h 30m").
- S7. "Que sea horario sin am y pm. Reloj 24 hs"
- S8. "Que se pueda ocultar la columna horas y minutos"

Presupuesto
- S9. "Cuando no esta completo el campo “Proveedor” cuando cargamos un nuevo item que aparezcan arriba de todos: Estimados en amarillo - Pendientes a pagar en rojo - Pago al 100% en verde" — assumption: items without vendor are "Estimados" (yellow) and go first, then items with a balance (red), then fully paid ones (green).
- S10. "Que se puedan cargar más archivos en “comprobante” y que se llame “archivos de pago”"
- S11. "Que se pueda agregar en “editar” un pago adicional que no va a ser abonado en el momento y que queda por pagar en el saldo"

Brief
- S12. "Opciones de estado: Pendiente y Confirmado" — assumption: stored searching/deciding/na read as Pendiente (read-time mapping, no stored data rewritten).

Propuestas
- S13. "Que se pueda modificar el cuadro comparativo en las filas y columnas"
- S14. "Que se pueda armar un cuadro comparativo de cero"
- S15. "Que se pueda elegir al costado también en las distintas opciones"

Descargas
- S16. "Que todo lo que se descargue figure el logo de Weddinas arriba" — logo: `Logos-Finales-PNG-09.png` (user's Downloads).

Portada
- S17. "Se podrá hacer de alguna manera que la foto que se cargue para la portada se pueda seleccionar en qué parte van las caras? ... tipo en facebook cuando tenias la portada que podías elegir que parte de la foto se viera. Sino pasarnos la medida del rectángulo para poder armarlo en canva"

## Tasks

- [ ] T1 S1 inline
- [ ] T2 S16 inline
- [ ] T3 S12 inline
- [ ] T4 S9-S11 inline
- [ ] T5 S2-S5 inline
- [ ] T6 S6-S8 inline
- [ ] T7 S13-S15 inline
- [ ] T8 S17 inline

Route evidence: no Writer trigger (units depend on shared couple model/service; worked inline in order).

## Log

- L1 (2026-11-26) user: pasted Canela's list (above) + "Logos-Finales-PNG-09 ese es el logo ta en descargas".
- L2 Timing reference sheet fetched as CSV (shared by link); columns confirmed as in S6.
- L3 Engram mirror pending: project resolution was ambiguous (armado-pdf / bibliotheca) in the previous session.
