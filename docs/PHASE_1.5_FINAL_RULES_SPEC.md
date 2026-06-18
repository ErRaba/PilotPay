# SPEC EJECUTABLE — Fase 1.5: Reglas finales por claim + cierre de Anonymous

**Fecha:** 2026-06-18
**Fase:** 1.5 — Endurecimiento final (cliente + reglas + datos + Auth Console)
**Estado:** 🟡 **DISEÑO LISTO — NO ejecutar.** Requiere aprobación + gates GO/NO-GO por paso.
**Riesgo:** 🔴 **ALTO** — evento **global** que toca **4 planos a la vez** (cliente, reglas RTDB, datos RTDB, Auth Console). Afecta a todos los dispositivos.
**Depende de:** 1.25 ✅ · 1.4 ✅ (cliente Auth-only) · 1.3 absorbida aquí · R-B PASS(delta) · baseline reglas `6d36713` · backup RTDB `pre-1.5-2026-06-18.json` ✅.

---

## 1. Objetivo exacto
Cerrar **R2** (pass en claro) y **R3** (aislamiento cross-user) a nivel sistema:
- Reglas RTDB **por claim** (`auth.token.code`/`role`), **sin tolerancia anónima**.
- **Purgar `pass`** de `pilotpay/usuarios`.
- **Deshabilitar Anonymous Auth** (Console).
- Cliente operando **solo con token Auth** (sin anónimo en ningún punto).

## 2. Alcance
- **Cliente:** `getAuthToken()` Auth-only; retirar bootstrap `fbSignIn()` anónimo; garantizar cero accesos Firebase pre-sesión.
- **Reglas:** claim-based sin anon; añadir `deletedUsers/$userId/.validate`; relajar `usuarios.$code.validate` (sin exigir `pass`).
- **Datos:** purgar campo `pass` de `pilotpay/usuarios/{code}`.
- **Auth Console:** deshabilitar proveedor Anonymous.

## 3. Fuera de alcance
- ❌ Rama raíz **`/usuarios` duplicada** (fuera de `/pilotpay`) → **solo investigar/documentar** (§14); **no borrar** en 1.5 salvo autorización separada.
- ❌ Admin 2.0 / alta de usuarios (`crearUsuarioLocal`, "+ Dar acceso") — sigue diferido.
- ❌ Parser/Dashboard/Historial/P4 (salvo que `getAuthToken` los afecte indirectamente; ver §9).
- ❌ Custom Auth / backend (fase de identidad futura).

## 4. Estado inicial verificado (2026-06-18)
- 1.25 + 1.4 publicadas; cliente **Auth-only** en producción (`247644d`).
- Claims: **ESH `{code:ESH, role:admin}`**, **BZP `{code:BZP, role:user}`** (verificado).
- **Anonymous Auth = ENABLED.**
- **`usuarios.$code.validate` = ACTIVO** (exige `pass`; byte-idéntico repo).
- **R-B = PASS con delta menor:** falta `deletedUsers/$userId/.validate`.
- Baseline reglas desplegadas: `docs/PHASE_1.5_DEPLOYED_RULES_BASELINE.md` (`6d36713`).
- Backup RTDB: `C:\pilotpay-backups\pilotpay-rtdb-pre-1.5-2026-06-18.json` (validado; nodos usuarios/historicos/perfiles/permisos/deletedUsers presentes).
- **Hallazgo crítico de cliente:** `getAuthToken()` (`index.html:7173`) tras el embudo E1 hace **`await fbSignIn(); return _fbToken;`** → **fallback anónimo en CUALQUIER llamada** sin sesión Auth coincidente. `fbSignIn()` anónimo también en bootstrap `DOMContentLoaded` (`7714`). ⇒ deshabilitar Anonymous **rompería** el cliente actual salvo refactor.

## 5. Cambios necesarios en CLIENTE (`frontend/index.html`)
> Objetivo: el cliente **nunca** necesita token anónimo. Es **prerequisito** del cierre de Anonymous.

| ID | Ubicación | Cambio |
|---|---|---|
| **C1** | `getAuthToken()` `~7173–7186` | **Eliminar el fallback anónimo** (`await fbSignIn(); return _fbToken;`). Nuevo contrato: si hay sesión Auth (`PilotPayAuth.isAvailable()`) → `return await PilotPayAuth.getToken()`; **si no → `return null`** (sin anónimo). Relajar la condición del embudo a "sesión Auth disponible" (mantener el guard `getSession().code===currentUser` cuando `currentUser` exista). |
| **C2** | `DOMContentLoaded` `~7714` | **Eliminar** `await fbSignIn();` (bootstrap anónimo). Conservar `PilotPayAuth.restoreSession()` (`7712`). |
| **C3** | (verificación) | Confirmar **cero llamadas `fb*` pre-login**. 1.4 ya retiró `loadUsersFromFirebase` pre-login; la carga puntual `usuarios/{u}` ocurre **post-Auth**. Verificar que ningún otro `fbGet/fbSet/fbUpdate` se ejecuta sin sesión. |
| **C4** | `fbSignIn()` `~7124` | Tras C1/C2 queda **sin callers** → **eliminar** (o dejar guardada y marcada como muerta). Recomendado: eliminar. |
| **C5** | (verificación) | P4 sink y `fbGet/fbSet/fbUpdate` enrutan por `getAuthToken` → tras C1 obtienen **token Auth (post-login)** o **null**. Verificar que P4 con `null` encola/espera (no rompe). |

**Compatibilidad intermedia:** el cliente C1–C5, con Anonymous **aún habilitado** y reglas **aún `auth!=null`**, funciona (post-login usa token Auth → `auth!=null` OK; pre-login no hace I/O). → permite desplegar cliente **antes** de tocar reglas/Anonymous.

## 6. Cambios necesarios en REGLAS (`firebase-database.rules.json`)
> Patrón: **claim manda; SIN tolerancia anónima** (`auth.token.code == null` ya no se acepta). Claims `code`/`role` confirmados en los tokens Auth.

| ID | Nodo | Regla final (resumen) |
|---|---|---|
| **R1** | `usuarios` | parent `.read`: `role==='admin'` (panel admin); `.write`: `role==='admin'`. `$code.read`: `code===$code || role==='admin'`. |
| **R2** | `usuarios.$code.validate` | **Relajar:** quitar `pass` de `hasChildren([...])` y el `child('pass').isString()` → exigir solo `name`,`funcion`,`nivel`,`base`. |
| **R3** | `perfiles.$code` | `.read`/`.write`: `code===$code || role==='admin'`. |
| **R4** | `permisos` | parent `.read`: `role==='admin'`; `.write`: `role==='admin'`. `$code.read`: `code===$code || role==='admin'`. |
| **R5** | `historicos.$userId` | `.read`/`.write`: `code===$userId || role==='admin'` (mantener `.validate` de monthly/auditorias/deletedAuditorias). |
| **R6** | `deletedUsers` | `.read`/`.write`: `role==='admin'`. **Añadir `$userId.validate`** (del repo: `userId`,`deletedAt`(number),`deletedBy`). |
| **R7** | `solicitudes` | `.read`/`.write`: `auth != null` (ya solo Auth tras cierre de Anonymous) **o** escopar por claim si se rediseña la key — **mantener `auth != null` en 1.5**. |
| **R8** | `rutas` | `.read`/`.write`: `role==='admin'` (retirado; solo admin) **o** `auth != null` — **mantener `auth != null`** (sin código cliente). |
| **R9** | root + `pilotpay` | deny-by-default (sin cambios). |

> El JSON final exacto se materializa en el paso de ejecución a partir del baseline `6d36713`, **conservando textualmente** los `.validate` de `historicos/*` (Q8 de 1.3).

## 7. Cambios necesarios en DATOS (RTDB)
| ID | Acción |
|---|---|
| **D1** | **Purgar `pass`** de cada `pilotpay/usuarios/{code}` (PATCH `pass: null`). **Acoplamiento:** requiere R2 (validate sin `pass`) **ya desplegado**, o el PATCH sería denegado. |
| **D2** | **NO tocar** la rama raíz `/usuarios` duplicada (§14). |

## 8. Orden exacto recomendado
> Secuencia diseñada para que **ningún paso rompa** el anterior. Cada paso con su gate.

1. **CLIENTE** (C1–C5): implementar → `npm run sync` → validar en local/staging → **merge + push** (publica cliente Auth-only). *(Anonymous sigue ON, reglas siguen auth!=null → no rompe.)*
2. **Smoke producción** ESH/BZP con cliente Auth-only (Anonymous aún ON) → confirmar que **no se usa anónimo** (Network: tokens Auth) y que P4/lecturas funcionan.
3. **REGLAS** (R1–R9): desplegar claim-based + `deletedUsers/$userId/.validate` + **relajar validate(pass)** (R2). *(Cliente ya manda claims → OK. Cualquier sesión anónima residual queda denegada — por eso el cliente va primero.)*
4. **Validación reglas** multi-dispositivo (ver §11).
5. **PURGA `pass`** (D1) — tras R2 desplegado.
6. **DESHABILITAR Anonymous Auth** (Console) — último candado. *(Cliente ya Auth-only; reglas ya claim.)*
7. **Validación final** + ventana de observación.

## 9. Riesgos
| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| 1 | Clientes cacheados antiguos (anónimos) **denegados** al desplegar reglas (paso 3) | 🔴 | Cliente Auth-only en todos los dispositivos **antes** (paso 1–2); cache-busting; solo 2 usuarios → coordinar re-login |
| 2 | `getAuthToken` mal refactorizado → P4/lecturas sin token → fallos | 🔴 | C5 + smoke paso 2; P4 con `null` debe encolar, no romper |
| 3 | Purga `pass` con `validate(pass)` aún activo → **denegada** | 🟠 | Orden estricto: R2 (relajar) **antes** de D1 |
| 4 | Purga irreversible de datos | 🟠 | **Backup RTDB** `pre-1.5` validado; rollback D1 desde backup |
| 5 | Primer login offline (ya no soportado desde 1.4) + sin anónimo | 🟡 | Documentado; Auth requiere red en primer login |
| 6 | Claims ausentes/incorrectos en algún token | 🟠 | Verificados ESH/BZP; re-confirmar antes de paso 3 |
| 7 | Rama raíz `/usuarios` duplicada con datos reales | 🟡 | **No tocar**; investigar (§14) |
| 8 | Deshabilitar Anonymous rompe algún flujo no detectado | 🔴 | Hacerlo **último** (paso 6), tras smoke con cliente+reglas ya activos |

## 10. Gates GO/NO-GO
**GO para ejecutar** requiere TODOS:
- Spec aprobada · backup RTDB validado (✅) · baseline reglas guardado (✅) · claims re-confirmados.
- Ventana coordinada con ESH/BZP disponibles para re-login y smoke en los 3 dispositivos.
**NO-GO si:** claims incorrectos · cliente Auth-only no validado en producción (paso 2) · sin disponibilidad para validar multi-dispositivo · dudas sin resolver sobre `/usuarios` raíz que puedan afectar.

**Gates intra-secuencia:** cada paso (1→7) solo avanza si el anterior PASA su validación; ante cualquier FAIL → detener y rollback del paso.

## 11. Validaciones post-deploy
- **Cliente (paso 2):** ESH/BZP login Auth; Network solo tokens Auth (sin `signInAnonymously`); P4 `?p4=1` OK; sin lecturas pre-login.
- **Reglas (paso 4):**
  - BZP (user): lee/escribe **solo** `historicos/BZP`, `perfiles/BZP`, `permisos/BZP`; **denegado** `historicos/ESH` (R3 cerrado).
  - ESH (admin): panel admin lee `usuarios`/`permisos` parent + `historicos` de otros.
  - `deletedUsers`: escritura solo admin; tombstone con forma válida acepta, malformada rechaza.
- **Purga (paso 5):** `usuarios/{code}.pass` ausente; edición/guardado de usuario sigue OK (sin pass).
- **Anonymous off (paso 6):** intento de `signInAnonymously` (REST) **falla**; app sigue OK con Auth.
- **No regresión:** Dashboard, Parser, Historial, P4 (sin 4xx con token Auth).

## 12. Rollback
- **Cliente (C1–C5):** `git revert <sha-1.5-cliente>` + push → vuelve a Auth-only-con-fallback-anónimo (1.4). (Si ya se deshabilitó Anonymous, re-habilitar en Console para que el fallback funcione.)
- **Reglas:** re-desplegar el **baseline `6d36713`** (`PHASE_1.5_DEPLOYED_RULES_BASELINE.md`) → estado pre-1.5 exacto.
- **Datos (`pass`):** restaurar `pilotpay/usuarios` (y/o nodos afectados) desde `pre-1.5-2026-06-18.json`.
- **Anonymous:** re-habilitar proveedor en Console.
- **Orden de rollback:** inverso al deploy (Anonymous ON → reglas baseline → datos → cliente revert).

## 13. Plan de pruebas ESH/BZP
| Caso | ESH (admin) | BZP (user) |
|---|---|---|
| Login Auth online | entra; `getSession().code='ESH', role='admin'` | entra; `code='BZP', role='user'` |
| Acceso propio | historicos/perfiles/permisos ESH OK | historicos/perfiles/permisos BZP OK |
| Aislamiento | (admin ve todo) | **denegado** leer `historicos/ESH` |
| Panel admin | lista usuarios + permisos parent OK | sin panel admin |
| Edición usuario | guardar sin pass OK | n/a |
| P4 (`?p4=1`) | inspectMonthly/pull OK | inspectMonthly/pull OK |
| Anonymous off | `signInAnonymously` falla; app OK | idem |
| Multi-dispositivo | PC/iPhone/iPad | PC/iPhone/iPad |

## 14. Decisión sobre `/usuarios` raíz duplicado
- **Hallazgo:** el export RTDB contiene, además de `/pilotpay/usuarios`, una rama **`/usuarios` a nivel raíz** (fuera de `/pilotpay`).
- **Acción en 1.5:** **investigar y documentar** (¿datos reales? ¿artefacto? ¿escritura errónea histórica?). Las reglas finales mantienen deny-by-default en root → `/usuarios` raíz queda **inaccesible** a clientes (bloqueado), lo cual es seguro.
- **NO borrar** dentro de 1.5. Si se confirma que es basura, su borrado se hará en una acción **separada y autorizada**, con backup.

## 15. Estimación
| Bloque | Esfuerzo |
|---|---|
| Cliente C1–C5 + testing local | ~1 día |
| Smoke producción cliente (paso 2) | ~0,5 día |
| Diseño JSON final de reglas + revisión | ~0,5 día |
| Deploy reglas + validación multi-dispositivo | ~0,5–1 día |
| Purga `pass` + validación | ~0,5 día |
| Deshabilitar Anonymous + validación final | ~0,5 día |
| **Total** | **~3–4 días**, en ventana coordinada |

## 16. Veredicto final
> ## ✅ **GO para EJECUTAR 1.5 cuando la spec esté aprobada** — condicionado a los gates §10 y a la **ejecución estrictamente secuencial** del §8 (cliente → reglas → purga → Anonymous), con validación por paso y rollback por capa disponible.

Evidencia de diseño completa; backups y baseline listos. El mayor riesgo es operativo (evento global de 4 planos): se mitiga con el orden secuencial, los 2 usuarios conocidos y el rollback por capa. **Esta spec no ejecuta nada.**

---

**FIN DE LA SPEC 1.5 — No ejecutar sin aprobación y autorización por paso.**
