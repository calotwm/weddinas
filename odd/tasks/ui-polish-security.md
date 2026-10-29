# UI polish and security hardening

Objective: make the couple portal and planner admin more comfortable, attractive and professional with the weddinas.com brand, and harden security before presenting it.
Branch: `feat/client-portal` · Delivery: ask-on-risk · Test runner: `npx vitest run`

## Specs

- S1. "mejoremos el UI y las funciones, usemos las tipografias y y los colores, fijate de uqe todo quede mucho mas comodo a la vista ya sea la de pareja o la de admin" — restyle couple portal, public page and admin with the existing weddinas.com palette and fonts (see client-portal S5); improve readability, spacing, hierarchy, feedback and mobile layout. Assumption: "funciones" means usability improvements to existing features (save feedback, copy buttons, search/stats in admin, confirmations), no new domain features.
- S2. "decis de sumar un boton chiquito en la pag principal para entrar como admin asi no vas a la direccion?" — small, discreet admin entry link on the home page pointing to `/admin/login`.
- S3. "chequea tambien cors y cuestiones de seguridad" — review CORS and security; fix concrete issues found (headers, session lifetime and revocation, login brute force, unsafe URL rendering, lost updates on concurrent writes, vulnerable dependencies).
- S4. "quiero poder presentarlo mas atractivo y profesional" — presentation-ready look across all screens.
- S5. "Ah y fijate de poner su logo como favicon pq esta el de next js jaja" — replace the Next.js favicon with the Weddinas logo.

## Tasks

- [x] T1 [S3] security hardening: headers/CSP, expiring and revocable sessions, login rate limit, safe CSS URLs, serialized writes, dependency audit — inline — `dcd27ce`, `1c8868c` (RED: missing modules + lost-update test fails without lock; GREEN: 21 tests; verifier PASS)
- [x] T2 [S2,S5] favicon + admin entry link on home — inline — `3deda58`
- [x] T3 [S1,S4] couple portal and public page UI polish — inline — `33107a1`, `584adb5`
- [x] T4 [S1,S4] admin UI polish and usability (search, stats, labels, copy code, confirmations) — inline — `41ef345`

Route evidence: one parent, sequential units sharing files (actions, components); no Writer trigger reason. T1 names high-risk item 2 (security) → independent verifier after its checks.

## Log

- L1 (2026-10-29) User request: "Bien, mejoremos el UI y las funciones, usemos las tipografias y y los colores, fijate de uqe todo quede mucho mas comodo a la vista ya sea la de pareja o la de admin, decis de sumar un boton chiquito en la pag principal para entrar como admin asi no vas a la direccion? chequea tambien cors y cuestiones de seguridad, quiero poder presentarlo mas atractivo y profesional"
- L2 (2026-10-29) User: "Ah y fijate de poner su logo como favicon pq esta el de next js jaja"
- L3 Security review findings: CORS OK (no API routes, Next sends no CORS headers, server actions check Origin vs Host). Issues: no security headers; session tokens never expire and survive logout/code regeneration/admin code rotation; no login rate limit; cover URL interpolated into inline CSS; read-modify-write races in `PortalService.mutate`; `sharp` high CVEs (fix available), `postcss` inside next (needs breaking upgrade, build-time only). `src/app/favicon.ico` overrides `metadata.icons`.
- L4 Verification: `npx vitest run` 21 passed; `tsc` clean; `next build` OK. Prod-mode probes: security headers present, X-Robots-Tag on /boda, admin login wrong/right, couple session rejected after code hash change, forged cookie → 307, RSC request to admin page without session leaks nothing, admin rate limit blocks even the right code. Independent verifier: PASS, advisories (spoofable x-real-ip if proxy does not overwrite it, prune cost — fixed in `1c8868c`, global admin lockout by design, logout does not revoke server-side). Screenshots (desktop 1366, mobile 390) reviewed for all screens.
- L5 Found and fixed pre-existing bug: brand fonts never applied (next/font variables on <body>, Tailwind theme tokens on :root). Remaining audit items: postcss inside next and vitest deps need major upgrades (build/dev only).
