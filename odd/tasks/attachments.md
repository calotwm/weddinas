# Attachments and cover photo

Objective: let the team attach images/PDFs to brief vendor blocks, proposals and reports for the couple to see, and let couples upload a cover photo for their public page.
Branch: `feat/ipc-latest-month` (continues the open branch) · Delivery: ask-on-risk · Test runner: `npx vitest run`

## Specs

- S1. "hay data inconclusa, por ejemplo en dj dice pack salon dice pack salon contratado.png y no esta la foto, podemos hacer que se vea en caso de que se adjunten archivos?" — brief blocks hold attachments (JPG, PNG, WebP, PDF); the couple sees them in Proveedores for confirmed blocks unless marked internal; the example couple gets its Drive files attached to their blocks.
- S2. "dale la opcion a los novios de subir una foto para su pagina" — couples upload/replace/remove a cover photo in "Nuestra página"; the public page `/boda/<slug>` shows it (public URL, only the current cover).
- S3. "tmb que en propuestas y donde sea necesario los de weddinas puedan subir archivos para que lo vean los novios" — the team attaches files to proposals and reports; the couple sees them in Propuestas and Reportes.
- Constraints (assumption, from the existing upload rules): content sniffed by bytes, no SVG/HTML; images ≤ 5 MB, PDFs ≤ 10 MB; served only to that couple or the team except the current cover photo; deleting a block, proposal, report or attachment deletes its files.

## Tasks

- [x] T1 [S1–S3] core: Attachment type, PDF detection, store, service methods, file cleanup — inline — `b7cd546` (RED 8 → GREEN)
- [x] T2 [S1, S3] admin upload/remove UI on brief blocks, proposals, reports; couple views — inline — `494e031` (e2e: uploads, internal hidden, couple 200 / anon, other couple 404, files deleted with proposal)
- [x] T3 [S2] cover photo upload in Nuestra página + public route — inline — `b7cd546`, `494e031` (e2e: public 200, old cover deleted, unknown slug 404)
- [ ] T4 [S1] attach the example couple's Drive files in production — inline
- [ ] T5 independent verifier (security, item 2), deploy

Route evidence: one parent; units share upload store, service and actions, so no parallel-writer reason. Risk item 2 (file upload/serving, one new public route).

## Log

- L1 (2026-11-02) User: "consulta hay data inconclusa, por ejemplo en dj dice  pack salon dice pack salon contratado.png y no esta la foto, podemos hacer que se vea en caso de que se adjunten archivos?. dale la opcion a los novios de subir una foto para su pagina, tmb que en propuestas y donde sea necesario los de weddinas puedan subir archivos para que lo vean los novios"
- L2 Context: Drive zip holds the referenced files (DJ "Pack contratado.png", payment receipts, invoices and quotes as PDF, Save the Date). Internal folders (Seguros, IMPRIMIR) are not attached.
- L3 (2026-11-02) Independent verifier: security PASS; blocker fixed: images attached as documents were allowed up to 10 MB (now 5 MB, test RED→GREEN). Advisories applied: server action body limit 25 MB → 12 MB with an 11 MB per-upload check; sandbox CSP dropped (browsers block PDFs in sandboxed documents); event blocks with only shared files now visible; cover orphan cleanup. Checks: vitest 65, tsc, eslint 0, build ok.
