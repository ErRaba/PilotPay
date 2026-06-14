# FASE 1.25 — INFORME DE CIERRE (COMPLETION REPORT)

**Fecha:** 2026-06-13
**Fase:** 1.25 — Integración cliente de Auth (solo código, cero reglas)
**Estado:** ✅ **COMPLETADA**
**Rama:** `pilotpay-4-security-phase-0` (local, **sin push**)
**Plan base:** `PHASE_1.25_CLIENT_AUTH_INTEGRATION_PLAN.md` (D5 `b6223eb`)

---

## 1. ESTADO FINAL
**Fase 1.25: COMPLETADA.** El cliente intenta Auth primero, cae a legacy, usa el token Auth en toda la
E/S (incluido P4) cuando hay sesión Auth coincidente, escopa la lectura de permisos por rol, limpia caché
en logout y pausa el envío de analytics. **Sin tocar ni una regla de Firebase ni producción.**

## 2. COMMITS FUNCIONALES
| Commit | SHA | Qué hace |
|---|---|---|
| **E1** | `30602f6` | Carga `pilotPayAuth.js`, `restoreSession()` en arranque, **embudo `getAuthToken()`** con guard `currentUser` (token Auth solo si `isAvailable() && currentUser && getSession().code===currentUser`) |
| **E2** | `ec6f00f` | **Doble login** en `doLogin()`: Auth primario + legacy fallback; `signOut()` en `doLogout()`; D-1..D-5 (signOut legacy, bloqueado/temporal ambas rutas, `session.code===u`, carga anónima USERS intacta, guard `USERS[u]` anti-crash) |
| **E3b** | `05c8a04` | **Pausa de analytics**: flag `pilotpay_analytics_enabled` (default OFF) gatea `uploadBatch()` → cero escrituras a `pilotpay/analytics`, cero `console.error`; buffer local intacto |
| **E3a** | `2581ea8` | **Permisos role-aware**: admin lee nodo entero, user lee `permisos/{currentUser}`; `doLogout` limpia `pilotpay_perms_cache` + `pilotpay_admin_perms` (P3/Opción A) |

## 3. DOCUMENTOS DE SOPORTE
| Doc | SHA | Contenido |
|---|---|---|
| D8 | `74650fa` | Diseño E2 (doble login) |
| D9 | `55590e9` | Spec ejecutable E2 + auditoría (hallazgo A2-1 → D-5) |
| D10 | `9cd5518` | Go/No-Go E2 (GO WITH CONDITIONS) |
| D11 | `3543dc5` | Diseño E3 (permisos + analytics) + mapa funcional |
| D12 | `6a9bb5e` | Spec ejecutable E3b (pausa analytics) |
| D13 | `68aef2a` | Auditoría caché permisos → decisión P3 (Opción A) |
| D14 | `794569e` | Spec ejecutable E3a (role-aware + limpieza caché) |
(Previos: D5 `b6223eb` plan 1.25; D7 `25dd639` spec E1.)

## 4. VALIDACIONES REALIZADAS
**E1 (local):** app carga, `PilotPayAuth=object`, login legacy ESH/BZP, embudo dormido (anónimo sin sesión), token Auth con sesión sembrada por harness, P4 5/5/5/5 tras pull, anti-A-1 (`loadUsersFromFirebase` no degrada).
**E2 (local):** Auth ESH/BZP OK, legacy ESH/BZP OK, contraseña incorrecta, **D-5 (USERS[u] ausente → error sin crash)**, P4/sync HTTP 200 en modo Auth y legacy, logout limpia `pilotpay_auth_session`, dashboard/historial/consola OK, sin mezcla de identidades. (Go/No-Go: GO WITH CONDITIONS, condiciones cumplidas.)
**E3b (local):** app carga, consola sin `[Analytics] Upload failed`, sin PATCH a `pilotpay/analytics`, call-sites no rompen, buffer local intacto.
**E3a (local):** ESH admin Auth/legacy panel completo, BZP user Auth/legacy lee solo su nodo (`GET permisos/BZP`), logout limpia ambas cachés, sin permisos → fallback `USERS[u]`, Dashboard/Variables/Auditoría/Convenio/Biblioteca sin regresión, consola limpia.

## 5. RIESGOS ELIMINADOS O REDUCIDOS
- **Preparación de identidad:** el cliente ya autentica con Email/Password (Auth) y sincroniza con el token Auth — base para R1/R2/R5 (su eliminación efectiva es 1.4/1.5).
- **Ruido/escrituras inútiles:** analytics dejó de escribir a un path denegado y de ensuciar la consola (E3b).
- **Aislamiento de permisos (cliente):** el usuario solo lee/cachea sus permisos; el admin conserva la vista completa (E3a) — alineado con las reglas por claim de 1.3.
- **Contaminación de caché entre usuarios:** logout limpia las cachés de permisos (P3).
- **Robustez del login:** doble login con fallback → ningún usuario pierde acceso aunque Auth falle; guard D-5 evita crash de `showWelcome`.

## 6. RIESGOS TODAVÍA NO ELIMINADOS
- ⚠️ **Contraseñas legacy en RTDB** (`pilotpay/usuarios/{code}/pass`, texto plano) — se borran en **Fase 1.4**.
- ⚠️ **Reglas Firebase no endurecidas** — siguen en `auth != null`; el aislamiento por claim llega en **Fase 1.3**. R3 (cross-user) sigue abierto.
- ⚠️ **Anonymous Auth habilitado** — se deshabilita en **Fase 1.5**. R1 (cadena key→anon) sigue abierto.
- ⚠️ **`DEFAULT_USERS` con `pass` hardcodeado** (`index.html`) — backdoor si Firebase no responde; se retira en **Fase 1.4**.
- ⚠️ **Producción aún NO tiene Fase 1.25** — todo vive en la rama de seguridad local, sin push.
- (Menores) buffer analytics local sin cifrar (Fase 3); `pilotpay_ck_ctx` global no escopado (deuda aparte); 2 cuentas Auth huérfanas (`tiendaseloy@`, `eloyaviation@`, excepción documentada).

## 7. QUÉ NO SE TOCÓ
Reglas Firebase · producción (`avatars-redesign`) · lógica de cálculo (nómina/IRPF/auditoría) · P4/sync (solo hereda el embudo de token) · parsers PDF · UX/dashboard/welcome/login visual · Biblioteca Normativa · `userAdmin.js` · `savePermsToFirebase`/`getUserPerms` · esquemas de datos, storage keys, IDB stores, paths Firebase.

## 8. ESTADO DE PRODUCCIÓN
- **`avatars-redesign`** (rama que sirve GitHub Pages): intacta en **`3290d33`** (única acción previa: retirada de `migrate.html`, G4).
- **`pilotpay-4-security-phase-0`** (rama de seguridad): contiene toda la Fase 1.25, **sin push**.
- La app pública sigue funcionando con el login legacy de siempre; **ningún usuario ha visto cambios**.

## 9. ROLLBACK GLOBAL DE FASE 1.25
Revertir en **orden inverso** (cada uno es independiente y reversible):
```
git revert 2581ea8   # E3a (permisos role-aware + caché logout)
git revert 05c8a04   # E3b (pausa analytics)
git revert ec6f00f   # E2  (doble login)
git revert 30602f6   # E1  (embudo token + restoreSession + carga pilotPayAuth.js)
```
Tras revertir los 4, `index.html` y `pilotPayAnalytics.js` vuelven al estado pre-1.25 (login legacy puro,
token anónimo, analytics como antes). `pilotPayAuth.js` (C3) y el CLI quedan como infraestructura inerte
(no cargada). **Sin reglas/datos/producción que revertir. Punto de no retorno: NINGUNO en toda la Fase 1.25.**

## 10. CHECKLIST DE ENTRADA A FASE 1.3
- [ ] Fase 1.25 revisada y aceptada (este informe).
- [ ] Decidir estrategia de publicación a producción del cliente 1.25 (¿antes o junto a las reglas 1.3?).
- [ ] Diseño de **reglas transitorias por claim** (`auth.token.code === $userId || (auth.token.code == null && auth != null)`), incluyendo:
  - [ ] `historicos/{code}` por claim (cierra R3 para migrados).
  - [ ] `permisos/{code}` por claim + **lectura del parent para rol admin** (nota A3-10 de E3a).
  - [ ] `perfiles/{code}`, `usuarios`, `solicitudes`, `deletedUsers`, `analytics` (decidir).
- [ ] Verificar reglas desplegadas actuales vs repo antes de cambiarlas (como en G1).
- [ ] Backup RTDB previo al despliegue de reglas.
- [ ] Plan de rollback de reglas (re-desplegar `firebase-database.rules.json` actual).
- [ ] Cache-busting + verificación multi-dispositivo del cliente 1.25 en producción **antes** de endurecer reglas.
- [ ] Confirmar que ESH/BZP entran por Auth en producción (no solo local).

## 11. ADVERTENCIA SOBRE FASE 1.3
**Fase 1.3 es el PRIMER cambio global de reglas Firebase del roadmap.** A diferencia de 1.25 (cliente,
local, reversible sin impacto), un despliegue de reglas es **inmediato y afecta a todos los dispositivos a la
vez**. Una regla mal escrita puede **denegar sync o acceso a todos** simultáneamente. Riesgo **superior** al
de cualquier paso de 1.25. Las reglas transitorias deben **tolerar el token anónimo** (`auth.token.code == null`)
para no romper a los usuarios no migrados mientras Anonymous siga habilitado (hasta 1.5).

## 12. RECOMENDACIÓN
Antes de implementar Fase 1.3, producir —como en cada paso de 1.25— el ciclo completo de **diseño → spec
ejecutable → go/no-go**, específico para **reglas transitorias**:
1. **Diseño** de las reglas objetivo y transitorias por nodo.
2. **Spec ejecutable** con el JSON exacto, diff vs `firebase-database.rules.json`, y matriz de
   acceso (migrado/no-migrado/admin × cada path).
3. **Go/No-Go** con plan de despliegue (orden, ventana, rollback de reglas, validación post-deploy multi-dispositivo).
Y decidir explícitamente la **publicación del cliente 1.25 a producción** antes (recomendado) de tocar reglas,
para que el cliente ya validado esté online cuando las reglas se endurezcan.

---

**FIN DEL INFORME DE CIERRE — Fase 1.25 COMPLETADA. No implementar Fase 1.3 hasta diseño/spec/go-no-go aprobados.**
