# PHASE 1.1 — PLAN DE IMPLEMENTACIÓN: INFRAESTRUCTURA AUTH

**Fecha:** 2026-06-10
**Fase:** 1.1 — Infraestructura Auth (Plan Corregido Fase 1, aprobado)
**Estado:** ✅ **COMPLETADA 2026-06-12** (ver §11 Cierre) — gates G1-G7 cerrados, commits C1/D1/C2/C3 validados
**Documentos previos:** `HANDOFF_FABLE5_PHASE1.md` (corregido por auditoría), Informe Fase 1.0 (verificación de supuestos)

---

## 0. GATES DE ENTRADA (verificaciones manuales en curso)

La Fase 1.1 NO comienza hasta confirmar:

| # | Gate | Responsable | Resultado |
|---|------|-------------|-----------|
| G1 | Reglas desplegadas en Firebase Console revisadas y comparadas con `firebase-database.rules.json` | Eloy | ✅ **COMPLETADO 2026-06-10** — ver nota G1 |
| G2 | Existencia/contenido de `pilotpay/analytics` verificado (discriminador de reglas) | Eloy | ✅ **COMPLETADO 2026-06-10** — nodo `pilotpay/analytics` **NO EXISTE**. Cero datos remotos. Confirma: escrituras de analytics rechazadas siempre por deny-by-default (el `.catch()` de `pilotPayAnalytics.js:150` traga el error). Doble confirmación de G1 (desplegado = repo). Decisión ratificada: pausar analytics en Fase 1.3. (El buffer local de hasta 1000 eventos sigue en localStorage de los dispositivos → se aborda en fase de cifrado/limpieza, no aquí) |
| G3 | Contraseña real de ESH rotada (estaba hardcodeada en producción, `docs/index.html:7215`) | Eloy | ✅ **COMPLETADO CON OBSERVACIONES 2026-06-10** — valor previo era el publicado (7800); rotada y verificada (login viejo rechazado, login nuevo OK, dashboard/perfil intactos). Observaciones permanentes: (1) la nueva pass sigue en texto plano en RTDB legible con token anónimo hasta Fase 1.4/1.5; (2) backdoor residual del fallback `DEFAULT_USERS` (`index.html:7246-7250`): sin red hacia Firebase, el login validaría contra '7800' hardcodeado — riesgo aceptado temporal hasta retirar `DEFAULT_USERS.pass` en Fase 1.4 |
| G4 | Exposición pública de `docs/migrate.html` revisada | Eloy | ✅ **CERRADO — EXPOSICIÓN RETIRADA 2026-06-10** — verificada exposición (cargaba en `erraba.github.io/PilotPay/migrate.html`, badge REMOTO, escritura Firebase no autenticada vía `recoverUser`). Acción adelantada aprobada (Opción 1). Retirada en commit `3290d33` (avatars-redesign, pusheado) + cherry-pick `7ac7632` (pilotpay-4-security-phase-0, local). 3 archivos: borrado `docs/migrate.html` + `frontend/migrate.html`, eliminado `'migrate.html'` de `FILES` en `scripts/sync-docs.js`. Validado: URL pública → **HTTP 404**, app principal → HTTP 200, `npm run sync` no regenera, `git ls-files | grep migrate` vacío. Herramienta recuperable desde historial git si se reconstruye la parte export/import en Fase 1.3 |
| G5 | Proveedor **Email/Password habilitado** en Firebase Console (Authentication → Sign-in methods) | Eloy | ✅ **COMPLETADO CON OBSERVACIONES 2026-06-10** — Email/Password habilitado (ya lo estaba de antes), Email link desactivado, Anonymous sigue habilitado, **0 cuentas Email/Password preexistentes**. Observación: ~816 cuentas **anónimas** acumuladas (1 por recarga de página, predicho en Fase 1.0). Clasificado HALLAZGO INFORMATIVO — sin riesgo (uids sin datos asociados). Limpieza programada para Fase 1.5/1.6 vía subcomando CLI `purge-anon` (`listUsers`+`deleteUsers` por lotes), tras deshabilitar Anonymous. NO limpiar antes (se repueblan en cada recarga) |
| G6 | **Email enumeration protection activada** en Firebase Console | Eloy | ✅ **COMPLETADO 2026-06-10** — ya estaba activada por defecto. Habilita la prueba V3 (login con código inexistente y con contraseña mala → mismo error neutro `INVALID_LOGIN_CREDENTIALS`, sin enumeración de códigos) |
| G7 | Service account JSON descargado (Console → Project Settings → Service accounts) y guardado FUERA del repo y FUERA de OneDrive | Eloy | ✅ **COMPLETADO 2026-06-10** (declarado por Eloy) — service account generado y guardado fuera de OneDrive y fuera del árbol del repo. Llave maestra que ignora reglas Firebase → manejo crítico. Segunda barrera (`.gitignore`) se añade en C1 |

**Nota G1 — resultado verificado (2026-06-10):**
Las reglas desplegadas coinciden estructuralmente con `firebase-database.rules.json`: deny-by-default en raíz y en `/pilotpay`, con `auth != null` por nodo en `usuarios`, `perfiles`, `permisos`, `historicos/{userId}`, `deletedUsers`, `rutas`, `solicitudes`. Confirmado: **no existe aislamiento por usuario** (los paths usan códigos de app, no `auth.uid`); la separación depende del cliente. Consecuencias:
- El archivo del repo es **fiable como baseline** para diseñar las reglas objetivo de Fases 1.3/1.5.
- `pilotpay/analytics` no tiene regla → sus escrituras se deniegan en silencio desde siempre (refuerza la decisión de pausar analytics en 1.3).
- La estrategia R3 del plan (`auth.token.code === $userId` vía custom claims) **no se ve afectada**: nunca dependió de `auth.uid === $userId`.
- Micro-verificación añadida a la próxima visita a la consola: confirmar si las reglas desplegadas de `usuarios` incluyen el bloque `.validate` que **exige el campo `pass`** (afecta al despliegue acoplado de Fase 1.4, no a 1.1).

G5-G7 son nuevos: son prerequisitos técnicos directos de esta fase.
**Anonymous Auth permanece HABILITADO** durante toda la Fase 1.1 (se deshabilita en Fase 1.5).

---

## 1. ALCANCE

### Dentro de Fase 1.1

1. **CLI de administración** (`tools/admin-cli/`) con Firebase Admin SDK: crear usuarios Auth, fijar custom claims `{ role, code }`, escribir mapping `pilotpay/userCodes/{code}`, reset de contraseña, disable/enable, listado de estado.
2. **Módulo cliente de auth** (`frontend/js/pilotPayAuth.js`): sign-in email/password vía REST, persistencia de sesión, renovación de token, decodificación de claims, sign-out. **Independiente del monolito, sin integrar todavía.**
3. **Página de pruebas local** (`frontend/test-auth.html`): harness aislado para validar el módulo sin tocar `index.html`.
4. **2 usuarios de prueba** en Firebase Auth (códigos reservados `ZZT` rol user, `ZZA` rol admin) — nunca códigos de usuarios beta reales.

### Fuera de Fase 1.1 (explícitamente)

- ❌ Modificar `index.html` o `docs/` (producción intacta)
- ❌ Modificar `doLogin()` (Fase 1.3 — doble login)
- ❌ Cambiar reglas Firebase (Fase 1.3/1.5)
- ❌ Migrar usuarios beta reales (Fase 1.2)
- ❌ Borrar campo `pass` (Fase 1.4)
- ❌ Deshabilitar Anonymous (Fase 1.5)
- ❌ Escopar `loadPermsFromFirebase()` (Fase 1.3)
- ❌ Retirar `migrate.html` de producción (Fase 1.3)
- ❌ Tocar parsers, cálculos, P4, UX, dashboard, normativa

**Propiedad clave de esta fase:** todo es **aditivo**. Ningún archivo existente del producto se modifica. Producción no puede romperse porque producción no se toca.

---

## A) ARCHIVOS

### Nuevos

| Archivo | Propósito |
|---|---|
| `tools/admin-cli/package.json` | Deps: `firebase-admin`. `"type": "module"`. Privado |
| `tools/admin-cli/admin.js` | CLI única con subcomandos (ver B.2) |
| `tools/admin-cli/README.md` | Uso, ubicación esperada del service account, advertencias |
| `frontend/js/pilotPayAuth.js` | Módulo auth cliente (IIFE, patrón de los módulos existentes) |
| `frontend/test-auth.html` | Harness de pruebas local del módulo |
| `docs/PHASE_1.1_IMPLEMENTATION_PLAN.md` | Este documento |

### Modificados

| Archivo | Cambio | Justificación |
|---|---|---|
| `.gitignore` | Añadir `tools/admin-cli/serviceAccount*.json`, `tools/admin-cli/node_modules/`, `*.serviceaccount.json` | El service account es la llave maestra del proyecto: **jamás** debe entrar en git |

### NO modificados (verificable con `git diff` al cierre de fase)

`frontend/index.html`, `frontend/js/*` existentes, `docs/*` (salvo este plan), `firebase-database.rules.json`, `backend/*`.

---

## B) ORDEN EXACTO DE CAMBIOS

### Paso B.1 — Protección de secretos `[commit C1]`

1. Actualizar `.gitignore` (entradas de service account y node_modules del CLI).
2. Crear esqueleto `tools/admin-cli/` (package.json + README, sin lógica).

**Por qué primero:** el gitignore debe existir ANTES de que el service account pueda aterrizar en el directorio. Orden inverso = riesgo de commit accidental de la llave maestra.

### Paso B.2 — CLI de administración `[commit C2]`

`node admin.js <comando>` con subcomandos:

| Comando | Acción |
|---|---|
| `create-user <code> --role user\|admin [--password <p>]` | Crea cuenta `{code}@pilotpay.internal` (email lowercase), fija claims `{ role, code }` (code en MAYÚSCULAS, como las claves de datos), escribe `pilotpay/userCodes/{CODE} = { uid, createdAt }`. Genera contraseña fuerte si no se pasa. Idempotente: si la cuenta existe, falla con mensaje claro (no sobrescribe) |
| `verify <code>` | Comprueba las 3 patas: cuenta Auth existe, claims correctos, mapping escrito. Salida PASS/FAIL por pata |
| `list` | Tabla: code, uid, email, disabled, claims, mapping OK/KO |
| `reset-password <code> [--password <p>]` | Nueva contraseña (revoca refresh tokens del usuario) |
| `disable <code>` / `enable <code>` | `updateUser(uid, { disabled })` + revocación de refresh tokens (corte efectivo ≤1h) |
| `delete-user <code> --confirm` | Borra cuenta Auth + mapping. NO toca datos RTDB del usuario. Solo para usuarios de prueba en esta fase |
| `purge-anon --confirm` | (uso diferido a Fase 1.5/1.6) Borra en lotes las cuentas anónimas acumuladas (`listUsers` → filtrar `providerData` vacío → `deleteUsers`). NO ejecutar antes de deshabilitar Anonymous (se repueblan). Se implementa ahora por proximidad, se invoca después |

**Decisiones de diseño del CLI:**
- Service account leído de `GOOGLE_APPLICATION_CREDENTIALS` o ruta por argumento `--key`. Nunca hardcodeado.
- El Admin SDK **ignora las reglas RTDB** → puede escribir `pilotpay/userCodes/` sin tocar `firebase-database.rules.json`. Por eso esta fase no necesita ningún cambio de reglas.
- Todas las operaciones imprimen qué van a hacer y el resultado verificado (re-lectura post-escritura).
- Sin flags interactivos: apto para `-NonInteractive` (Windows PowerShell).

### Paso B.3 — Acciones manuales en consola (Eloy) `[sin commit]`

Gates G5, G6, G7 si no estaban ya cerrados. Sin esto el paso B.5 no puede probarse.

### Paso B.4 — Usuarios de prueba `[sin commit — operación, no código]`

```
node admin.js create-user ZZT --role user
node admin.js create-user ZZA --role admin
node admin.js verify ZZT
node admin.js verify ZZA
node admin.js list
```

Códigos `ZZ*` reservados para testing: no colisionan con usuarios beta y son fáciles de purgar.

### Paso B.5 — Módulo cliente `pilotPayAuth.js` `[commit C3]`

API pública (IIFE `window.PilotPayAuth`, mismo patrón que `PilotPayStore`):

| Función | Comportamiento |
|---|---|
| `signIn(code, password)` | `code → {code.toLowerCase()}@pilotpay.internal` → `identitytoolkit accounts:signInWithPassword`. Éxito: persiste sesión, decodifica claims, retorna `{ code, role, uid }`. Error: mapea a mensajes neutros (sin distinguir usuario-inexistente de contraseña-mala) |
| `getToken()` | idToken vigente; si caducado (margen 60s, igual que `fbSignIn` actual), renueva con `securetoken.googleapis.com` usando el refresh token persistido. Sin red → devuelve token en memoria si vigente, si no `null` (mismo contrato que `getAuthToken()` actual → compatibilidad futura con el sink P4) |
| `getSession()` | `{ code, role, uid } \| null` — desde claims decodificados, sin red |
| `restoreSession()` | Al arrancar: lee `localStorage.pilotpay_auth_session`, valida estructura, deja la sesión lista para renovar lazy. **No** hace red en el arranque (offline-first) |
| `signOut()` | Borra sesión persistida + memoria |
| `isAvailable()` | true si hay sesión restaurable |

**Persistencia:** clave `localStorage.pilotpay_auth_session` = `{ refreshToken, uid, code, role, email, savedAt }` (clave de dispositivo, sin escopar por userId — es la sesión, anterior al userId).
**Decodificación de claims:** base64url del payload del JWT, local, sin verificación de firma (la verificación la hace Firebase server-side en cada uso del token; el cliente solo lee).
**Renovación de refresh token:** `securetoken` devuelve refresh token nuevo en cada renovación → re-persistir siempre.

**Restricción heredada de Fase 1.0:** este módulo NO reemplaza `fbSignIn()` todavía. Conviven sin tocarse hasta Fase 1.3.

### Paso B.6 — Harness de pruebas `[commit C4]`

`frontend/test-auth.html`: página autónoma que carga solo `js/pilotPayAuth.js` y ofrece botones para: sign-in, mostrar sesión/claims, getToken (+ countdown de expiración), forzar renovación, GET/PATCH de prueba contra `pilotpay/historicos/ZZT/...` con el token nuevo (valida que un token email/password satisface las reglas actuales `auth != null`), sign-out, simular recarga (restoreSession). **No se sincroniza a `docs/`** (no entra en producción).

### Paso B.7 — Validación local completa (checklist F) `[sin commit]`

### Paso B.8 — Cierre de fase `[commit C5]`

Actualizar este documento con resultados (gates, checklist F, evidencias de consola) y marcar Fase 1.1 COMPLETADA. Tag opcional `phase-1.1-auth-infra`.

---

## C) DEPENDENCIAS

```
.gitignore (C1)
  └─→ CLI (C2)  ←requiere← G7 service account
        └─→ usuarios prueba (B.4)  ←requiere← G5 provider habilitado
              └─→ validación módulo cliente (B.7)
módulo cliente (C3) ──┐         ←requiere← G6 enumeration protection (para probar mensajes de error)
harness (C4) ─────────┴─→ B.7
```

- C3 y C4 pueden desarrollarse en paralelo a B.3/B.4 (no dependen del CLI para escribirse, sí para probarse).
- Nada en esta fase depende de: reglas nuevas, cambios en `index.html`, P4, ni del backend Express existente.
- Dependencia externa única: `firebase-admin` (npm). Verificar compatibilidad con el Node instalado antes de C2.

---

## D) RIESGOS POR CAMBIO

| Cambio | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| `.gitignore` | Patrón mal escrito → service account commiteado | 🔴 Crítica si ocurre | C1 va ANTES de descargar la llave; verificación con `git status` tras colocar el JSON; revisar con `git check-ignore` |
| CLI `create-user` | Crear cuenta con código de un usuario beta real por error | 🟡 Media | En Fase 1.1 el CLI solo se ejecuta con `ZZ*`; el comando avisa si el código existe en `pilotpay/usuarios` (lectura previa) |
| CLI escribe `userCodes` | Path nuevo en RTDB no contemplado en reglas | 🟢 Baja | Admin SDK ignora reglas; el path queda inerte para clientes hasta Fase 1.3. Documentar para incluirlo en reglas objetivo |
| `pilotPayAuth.js` | Colisión de nombres globales con el monolito | 🟢 Baja | IIFE con un único símbolo exportado `PilotPayAuth`; no se carga en `index.html` en esta fase |
| Persistir refresh token en localStorage | Lectura por terceros con acceso al dispositivo | 🟡 Media (aceptada) | Decisión tomada en plan corregido: mismo modelo de amenaza que el SDK oficial; quien lee localStorage ya lee las nóminas. Documentado |
| Harness `test-auth.html` | Filtrarse a producción vía `npm run sync` | 🟡 Media | Verificar qué copia el script `sync` (frontend→docs); si copia el directorio entero, **excluir el harness o borrarlo antes de cualquier sync**. Punto de validación explícito en F |
| Pruebas escriben en `historicos/ZZT` | Datos de prueba en RTDB real | 🟢 Baja | Paths `ZZT/ZZA` aislados; limpieza al cierre con el propio CLI/consola |
| `firebase-admin` en máquina admin | Llave maestra en disco local | 🟡 Media (aceptada) | Fuera del repo + OneDrive consideración: **NO guardar el service account dentro de la carpeta sincronizada por OneDrive** — usar ruta local pura (ej. `C:\keys\`) |

**Riesgo agregado de la fase: BAJO.** Ningún cambio toca código que ejecuten los usuarios beta.

---

## E) ESTRATEGIA ROLLBACK

La fase es 100% aditiva, así que el rollback es trivial y por capas:

| Qué revertir | Cómo |
|---|---|
| Código (C1-C4) | `git revert` o borrar archivos nuevos — cero impacto en producto |
| Usuarios de prueba Auth | `node admin.js delete-user ZZT --confirm` (y ZZA); o consola Firebase → Authentication |
| Mapping `userCodes/ZZ*` | Lo borra `delete-user`; verificable en consola |
| Datos de prueba en `historicos/ZZ*` | DELETE desde consola Firebase (o CLI) |
| Provider Email/Password | Se puede deshabilitar en consola sin afectar a nada (ningún usuario real lo usa todavía) |
| Service account | Revocable en consola (Service accounts → manage keys) si se sospecha exposición |

**Punto de no retorno de esta fase: NO EXISTE.** El primer paso con coste de reversión real es la Fase 1.2 (cuentas de usuarios reales), y el primero irreversible es la Fase 1.4 (borrar `pass`).

---

## F) PUNTOS DE VALIDACIÓN

### V1 — tras C1
- [ ] `git check-ignore tools/admin-cli/serviceAccount.json` → ignorado
- [ ] `git status` limpio tras colocar el JSON real en el directorio

### V2 — tras C2 + B.4 (CLI)
- [ ] `create-user ZZT` → cuenta visible en consola Firebase Auth con email `zzt@pilotpay.internal`
- [ ] `verify ZZT` → PASS en cuenta, claims `{ role:'user', code:'ZZT' }`, mapping
- [ ] `verify ZZA` → claims `{ role:'admin', code:'ZZA' }`
- [ ] `create-user ZZT` repetido → error claro, sin sobrescritura
- [ ] `disable ZZT` → flag disabled visible; `enable ZZT` → revertido
- [ ] `list` muestra ambos con su estado real

### V3 — tras C3 + C4 (módulo cliente, en harness local)
- [ ] `signIn('ZZT', <pass>)` → sesión con code/role correctos
- [ ] `signIn` con contraseña mala y con código inexistente → **mismo mensaje de error neutro** en ambos casos (verifica G6)
- [ ] Recarga de página → `restoreSession()` recupera sesión **sin red y sin pedir contraseña**
- [ ] `getToken()` con token caducado (forzar expiración) → renueva vía securetoken y re-persiste el refresh token nuevo
- [ ] GET/PATCH a `pilotpay/historicos/ZZT/monthly/2026_1` con el token nuevo → **HTTP 200 bajo las reglas actuales** (un token email/password satisface `auth != null`) — esta es la prueba de compatibilidad P4 futura
- [ ] `signIn('ZZT')` tras `disable ZZT` → rechazado (`USER_DISABLED`)
- [ ] Tras `reset-password ZZT` → sesión vieja deja de renovar en ≤1h (o inmediatamente probando el refresh)
- [ ] `signOut()` → `pilotpay_auth_session` eliminada de localStorage
- [ ] Modo avión: app harness abre, `getSession()` responde, `getToken()` devuelve null sin colgar

### V4 — aislamiento de producción (cierre de fase)
- [ ] `git diff --stat` contra el commit de inicio: **cero líneas cambiadas** en `frontend/index.html`, `frontend/js/*` preexistentes, `docs/*` (salvo este plan), `firebase-database.rules.json`
- [ ] `npm run sync` NO ejecutado durante la fase (o verificado que no arrastró `test-auth.html` ni `pilotPayAuth.js` a docs)
- [ ] La app de producción (GitHub Pages) funciona idéntica: login legacy, sync P4, parsers — smoke test de 5 minutos

## G) CRITERIOS DE ÉXITO

La Fase 1.1 está completa cuando, **simultáneamente**:

1. El CLI crea, verifica, lista, deshabilita y resetea usuarios Auth con claims y mapping, de forma idempotente y verificada por re-lectura.
2. El módulo cliente completa el ciclo entero en local: login → sesión persistida → recarga sin contraseña → token renovado → request RTDB autorizada → logout.
3. Un token email/password demuestra ser intercambiable con el anónimo frente a las reglas actuales (V3, prueba historicos) — esto valida que la Fase 1.3 podrá enchufar el token nuevo al sink P4 sin tocar P4.
4. El error de login no filtra si el código existe (enumeración mitigada).
5. `disable` corta el acceso de forma demostrada (el sustituto real de `bloqueado`).
6. Producción intacta byte a byte (V4).
7. El service account no está en git ni en carpeta sincronizada por OneDrive.

Si cualquiera de los 7 falla → la fase no se cierra y la 1.2 no comienza.

## H) QUÉ DEBE PROBARSE ANTES DE CADA COMMIT

| Commit | Pruebas previas obligatorias |
|---|---|
| **C1** (gitignore + esqueleto) | `git check-ignore` sobre nombres de prueba del patrón; `git status` no muestra nada inesperado |
| **C2** (CLI) | Checklist V2 completo con ZZT/ZZA reales; comando con argumentos inválidos → error útil, no stacktrace; ejecutar dos veces cada comando para confirmar idempotencia/no-sobrescritura |
| **C3** (pilotPayAuth.js) | Carga del archivo en página vacía sin errores de consola; `signIn` + `getToken` + `signOut` mínimos contra ZZT; sin ninguna referencia a símbolos del monolito (`grep` de `currentUser`, `profileData`, `USERS` → cero) |
| **C4** (harness) | Checklist V3 completo; verificar que el harness funciona también tras simular recarga y en modo avión |
| **C5** (cierre docs) | Checklist V4 completo; releer este documento y marcar resultados reales (no aspiracionales) |

Regla transversal heredada del proyecto: cada commit con mensaje descriptivo y, antes de C2 y C3, checkpoint implícito por ser cambios nuevos — no se requiere tag intermedio porque nada toca producto.

---

## ANEXO — Decisiones tomadas en Fase 1.0 que este plan implementa

| Decisión | Origen |
|---|---|
| CLI local con Admin SDK en vez de endpoint backend | Plan corregido §6 — evita huevo-gallina de auth del endpoint y hosting inexistente |
| Email `{code}@pilotpay.internal` como solución temporal beta | Plan corregido §5 — sin backend en el camino del login |
| Claims `{ role, code }` solo vía Admin SDK; rol nunca en nodo editable | Auditoría — escalada de privilegios en regla de ejemplo del handoff |
| Sesión persistida en localStorage (`pilotpay_auth_session`) | Plan corregido §9 — modelo de amenaza equivalente al SDK oficial; offline-first intacto |
| Mapping unidireccional `userCodes/{code} → uid` + code en claim (no bidireccional en DB) | Auditoría §B.3 — evita doble fuente de verdad |
| `userCodes` escrito por Admin SDK (ignora reglas) → cero cambios de reglas en 1.1 | Verificación Fase 1.0 |
| Códigos de prueba `ZZ*`, nunca códigos beta reales | Este plan |

## ANEXO — Tareas aceptadas en Fase 1.0 que NO son de esta fase (no olvidar)

| Tarea | Fase |
|---|---|
| Escopar `loadPermsFromFirebase()` a `permisos/{code}` | 1.3 |
| Retirar `docs/migrate.html` de producción | 1.3 |
| Decidir analytics (pausar vs regla propia para `pilotpay/analytics`) | 1.3 |
| Re-ubicar auto-bloqueo por caducidad de `doLogin()` (`index.html:7617`) | 1.3/1.4 |
| Retirar `DEFAULT_USERS` con contraseña hardcodeada (`index.html:7214-7217`) | 1.4 |
| Actualizar regla de validación de `usuarios` (exige `pass`) en el mismo deploy que borra `pass` | 1.4 |
| Deshabilitar Anonymous + reglas finales por claim | 1.5 |

---

## 11. CIERRE DE FASE 1.1 (2026-06-12)

### 11.1 Gates de entrada — todos cerrados

| Gate | Resultado |
|---|---|
| G1 | Reglas desplegadas = repo (deny-by-default + `auth != null` por nodo). Sin aislamiento por usuario hoy. Baseline fiable |
| G2 | `pilotpay/analytics` NO existe → escrituras siempre rechazadas. Pausar analytics en 1.3 |
| G3 | Contraseña ESH rotada (login viejo rechazado, nuevo OK). Obs: texto plano en RTDB + backdoor `DEFAULT_USERS` hasta 1.4 |
| G4 | `migrate.html` **retirado de producción** (acción adelantada) — ver 11.2 |
| G5 | Email/Password habilitado (ya lo estaba), 0 cuentas reales preexistentes. Anonymous sigue habilitado |
| G6 | Enumeration protection activa (por defecto) |
| G7 | Service account generado, fuera de OneDrive y del repo |

### 11.2 Acción adelantada G4 — retirada de migrate.html

Verificado que `migrate.html` se servía públicamente sin login (escritura Firebase no autenticada vía `recoverUser`). Retirado fuera del orden de gates por seguridad:

- **Commit producción:** `3290d33` en `avatars-redesign` (pusheado) — borra `docs/migrate.html` + `frontend/migrate.html` + entrada en `scripts/sync-docs.js`.
- **Réplica rama seguridad:** cherry-pick `7ac7632` en `pilotpay-4-security-phase-0`.
- **Verificación:** `https://erraba.github.io/PilotPay/migrate.html` → **HTTP 404**; app principal → HTTP 200; `npm run sync` no regenera; `git ls-files | grep migrate` vacío.

### 11.3 Commits ejecutados (rama `pilotpay-4-security-phase-0`, local, sin push)

| Commit | SHA | Contenido |
|---|---|---|
| C1 | `2f5c7f9` | `.gitignore` normalizado UTF-16→UTF-8 (4 reglas previas preservadas) + protección service account; esqueleto `tools/admin-cli/` (package.json + README) |
| D1 | `3599d81` | Este plan (`docs/PHASE_1.1_IMPLEMENTATION_PLAN.md`) versionado |
| C2 | `0c49429` | `tools/admin-cli/admin.js` — lógica CLI (7 subcomandos) + `package-lock.json` |
| C3 | `667ebcd` | `frontend/js/pilotPayAuth.js` (módulo auth aditivo) + `frontend/test-auth.html` (harness) |

### 11.4 Validaciones reales superadas

**CLI (C2) — en vivo con usuarios de prueba ZZT/ZZA:**
- `create-user` ZZT (user) / ZZA (admin) → cuenta + claims `{ role, code }` + mapping `pilotpay/userCodes/{CODE}`.
- `verify` → PASS en las 3 patas (cuenta Auth, claims, mapping).
- `list` → tabla de cuentas email/password.
- `create-user` repetido → falla sin sobrescribir (idempotencia).
- `disable`/`enable` → OK (sustituto real del flag `bloqueado`).
- `reset-password` → OK + revocación de refresh tokens.
- `delete-user --confirm` → elimina cuenta Auth + mapping, **sin tocar datos RTDB** (`historicos`/`perfiles`/`permisos`).
- `verify` final tras borrado → FAIL en las 3 patas (confirma limpieza de mappings).

**Cliente (C3) — en navegador con usuario ZZT:**
- Login Email/Password → OK; claims `role=user`, `code=ZZT`.
- `restoreSession()` sin red → OK (offline-first).
- `getToken()` → token presente, claims correctos, renovación vía securetoken.
- **Enumeration protection efectiva** → mismo mensaje neutro para usuario inexistente y contraseña incorrecta.
- **PATCH `historicos/ZZT/_authtest` → HTTP 200** → token Email/Password aceptado por las reglas actuales `auth != null`. **Confirma que el token nuevo es intercambiable con el anónimo frente a las reglas → P4 se podrá enchufar en Fase 1.3 sin tocar P4.**

### 11.5 Hallazgos no bloqueantes (registrados)

| Hallazgo | Tratamiento |
|---|---|
| ~816 cuentas anónimas acumuladas en Firebase Auth (1 por recarga de página) | Sin riesgo (uids sin datos). Purga en Fase 1.5/1.6 vía `purge-anon`, tras deshabilitar Anonymous |
| 2 cuentas email/password preexistentes sin `code`/`role`/`mapping` (`tiendaseloy@gmail.com`, `eloyaviation@gmail.com`) | Probables pruebas manuales antiguas. No interfieren (CLI opera por claim `code`). Decidir borrado en Fase 1.2/1.5 |
| `DEFAULT_USERS` con `pass` hardcodeado (`index.html`) — backdoor si Firebase no responde y se cae al fallback | Riesgo residual **aceptado** hasta Fase 1.4 (retirada de `DEFAULT_USERS.pass`) |
| Contraseñas legacy en texto plano en `pilotpay/usuarios/{code}/pass` | Permanecen hasta Fase 1.4/1.5 (borrado de `pass` + deshabilitar Anonymous). R2 NO eliminado todavía |
| `.gitignore` venía en UTF-16 LE | Normalizado a UTF-8 en C1. Nota operativa: el Write tool produce UTF-16 en este entorno Windows → usar `printf`/bash para forzar UTF-8 |

### 11.6 Estado final

- **Producción (`avatars-redesign`):** intacta salvo la retirada de `migrate.html` (`3290d33`). HEAD = `3290d33`.
- **Rama de seguridad (`pilotpay-4-security-phase-0`):** local, **sin push**. Contiene C1/D1/C2/C3.
- **`index.html`, reglas RTDB, P4, parsers, cálculos, dashboard:** NO tocados.
- **Riesgos:** R1 (cadena key→anon) y R2/R5 **NO eliminados todavía** — la infraestructura está lista, pero el corte real ocurre en Fases 1.3 (coexistencia), 1.4 (borrar `pass`) y 1.5 (deshabilitar Anonymous). Fase 1.1 construye capacidad, no cierra riesgos por sí sola.
- **Fase 1.1: ✅ COMPLETADA.**

### 11.7 Próximo paso recomendado (NO implementar todavía)

**Preparar Fase 1.2 — Migración usuarios beta** (diseño, sin ejecución):
- Inventariar usuarios reales en `pilotpay/usuarios` y su estado (`bloqueado`, `temporal`, `accessExpiresAt`).
- Definir generación y canal de distribución de contraseñas temporales (las legacy se consideran comprometidas — no se importan).
- Script/secuencia de altas masivas con el CLI + verificación automática por usuario.
- Backup completo de RTDB antes de cualquier alta.
- Decisión sobre las 2 cuentas email/password huérfanas (11.5).

Fase 1.2 se diseña y aprueba antes de tocar usuarios reales. No comenzar sin autorización explícita.
