# Client feedback, phase 2 (rest of "Sistema Weddinas.pdf" that needs no client answer)

Objective: ship the remaining client requests that can be built now; open questions go to the client (Log L3).
Branch: `feat/client-feedback-phase-2` · Delivery: ask-on-risk (user asked to merge to main and push) · Test runner: `npx vitest run` · UI copy in Spanish (rioplatense "ustedes" for the couple, "vos" for the team, as in the existing pages), code/comments in English.

## Specs

Client quotes are verbatim from the PDF; user decisions are from L1/L2.

- S1. Access code: "Código que sea fácil para cada pareja. Por ej: DELFIYJUANCHO ... en ese caso pondremos el del año del casamiento, por ej DELFIYJUANCHO27". User: "el codigo facil es ese format". New and regenerated codes = first name of partner A + "Y" + first name of partner B + 2-digit wedding year, uppercase, without accents or symbols (Delfi & Juancho, 2027 → `DELFIYJUANCHO27`); if taken, append a digit (`DELFIYJUANCHO272`…). Existing codes (XXXX-XXXX) keep working. Login stays case/space/accent-insensitive.
- S2. "Pago (sacar palabra 'pagado')" — user: "saca la palabra pagado si la encontras". Only where it labels a vendor's payment (Proveedores); budget totals keep "Pagado".
- S3. Checklist: "Que vaya cargada la carátula del mes (con división de pendientes del mes pasado y lo que es a ver este mes)" — user: "la caratula mes a mes asi como la pidio". Tasks get an optional month; the team loads them per month for each couple; the couple's checklist and home card split "Pendientes de meses anteriores" / "Este mes" / "Próximos meses" (tasks without month listed apart).
- S4. Notificaciones: user "reportes hacer lo que pidio" — besides presented proposals (phase 1), the couple is notified automatically when a vendor becomes confirmed in the brief.
- S5. Estética replaces "Página web": "Cambiar la parte de página web por 'Estética' en donde puedan dejar: Tipografías que les gustan, Fotos de los novios, Código de vestimenta que van a querer dejar para los invitados, Paleta de colores para la boda"; team side "Estetica: Tener editable". User: "Supongo que dice que saquemos la pag web de invitados" — remove every link to the guest page and "Nuestra página" from the couple portal and team panel; keep the `/boda/<slug>` route working for links already shared (assumption until the client confirms, see L3).
- S6. Timing: "Sumar un cuadradito más en el resumen principal: ... Timing"; "Timing: Tener editable" (team). Couple and team edit an ordered list (hora, momento, nota); home card shows it.
- S7. Invitados: "Lista de invitados (en donde figure el % de cuantos van confirmados) y que figuren las mesas y restricciones"; team "Invitados: Poder tener un pantallazo de todos las listas de invitados juntas". Guests: nombre, grupo, estado (confirmado / pendiente / no viene), mesa, restricción alimentaria. Home card: % confirmados, mesas, restricciones. Team: per couple tab + global page.
- S8. Propuestas: "Una vez elegida una propuesta, que se limpie de propuestas y quede unicamente en proveedores contratados la propuesta elegida (las que no fueron elegidas, pueden desaparecer)" — proposals get an optional rubro; approving one hides the other pending ones of that rubro from the couple and confirms that brief block with the proposal as vendor.
- S9. "Sumar comentarios en propuestas para que nos puedan dejar preguntas o aclaraciones los novios" — a comment thread per proposal, couple and team.
- S10. "notificaciones cuando los novios ven las propuestas" — record when the couple first sees each presented proposal; the team sees "Vista el …".
- S11. Panel: "Agregar arriba Titulos: Parejas - proveedores - pagos - listas/invitaciones - civil"; "Pagos: Poder tener en algún lado todos los pagos de las parejas juntos"; global Proveedores (all vendors across couples), Civil (each couple's civil data from the brief).
- S12. "Crear Alertas para tareas pendientes" — team home alert list: proposals unanswered 7+ days, payments due in 7 days or overdue, checklist tasks of past months still open.
- S13. "Editar el texto que se les envía a los novios cuando le compartimos la web por primera vez" — the team edits the welcome message template (placeholders for names, link, code), stored server-side.
- S14. "Queremos que se puedan descargar adjunto la parte de proveedores x separado y todo junto. Al igual que la parte de música y familia" — printable pages with a "Descargar PDF" button (browser print to PDF).
- S15. Música: "Poder crear nuevas secciones o sacarlas (editable)" — couple and team add/remove their own moments and hide default ones.

## Tasks

- [x] T1 [S1, S2, S3, S14, S15] unit D — delegated writer — `f279580`, `09a0238`, `10c53c8` (S2: no fixed "pagado" text in Proveedores, nothing changed)
- [x] T2 [S5, S6, S7] unit A — delegated writer — `0cf7e3e`, `a2e382f`, `188675c`
- [x] T3 [S4, S8, S9, S10] unit B — delegated writer — `c4dae56`, `4794336`
- [x] T4 [S11, S12, S13] unit C — delegated writer (manual worktree) — `988b9c3`, `e957801`, `4746666`
- [x] T5 merge, fixes, suite, build, smoke, verifier on S1 — inline — `72c0638` (merge tidy), first-name cap, login maxLength fix

Route evidence: four independent units with disjoint behavior, each several files and 300+ lines, launched together (Writer trigger a); shared files (`src/core/couple.ts`, `src/core/portal-service.ts`, nav/tabs) are append-only per unit and merged by the parent.

## Log

- L1 (2026-11-06) "amergea rama y pushea y suma todo lo que se puede hacer ahora, el codigo facil es ese format, saca la palabra pagado si la encontras, la caratula mes a mes asi como la pidio, reportes hacer lo que pidio, los botones de sacar supongo q es pq sumamos info de la cuenta regresivas propuestas etc, en el login de los novios, saquemoslo, Supongo que dice que saquemos la pag web de invitados, armame las preguntas de lo que falta asi le mando"
- L2 Phase 1 merged and pushed: main `a59cac5`. Login feature icons were already removed in phase 1.
- L3 Still for the client: cuadro refe Pauli and Excel sample (comparison table + Excel import), brief per-line status color meaning, reminder days and channel, WhatsApp route, vendor titles ("Espacio, Catering... Looks..."), confirm the guest page goes away, where "pagado" shows.
- L4 Evidence: 153 tests, tsc, eslint and `next build` clean. Smoke on a copy of the demo data: 25 admin and portal routes 200, /portal/reportes redirects, no /boda links left in the portal, new couple Delfi & Juancho gets DELFIYJUANCHO27, login works with "delfi y juancho 27" and the old DEMO-BODA. The smoke found the login input capped at 12 characters (easy codes failed in the browser); fixed to 40.
- L5 Verifier on S1: PASS 6/6; advisory fixed (first names capped at 12 so codes fit the 40-char login). Remaining advisory: regenerating twice alternates between ...27 and ...272.
- L6 (2026-11-06) User: "siga nomas vos ya le mande a la clienta" — questions sent to the client, including the WhatsApp proposal: store the couple's number and show an "Avisar por WhatsApp" button (wa.me with a prefilled message) when the team presents something.
