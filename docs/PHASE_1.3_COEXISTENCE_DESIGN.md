# PHASE 1.3 — DISEÑO Y AUDITORÍA: COEXISTENCIA / DOBLE LOGIN

**Fecha:** 2026-06-12
**Fase:** 1.3 — Coexistencia / Doble Login (Plan Corregido Fase 1)
**Estado:** 🟡 **DISEÑO Y AUDITORÍA — NO implementar. Sin cambios de código/reglas/Firebase.**
**Depende de:** Fase 1.2 ✅ (ESH + BZP migrados, `pilotPayAuth.js` validado)
**Riesgo de la fase (valoración previa):** MEDIO — primer paso que toca `index.html` y reglas Firebase.

---

## 1. INVENTARIO TÉCNICO EXACTO

### 1.1 Archivos a modificar (previsto)

| Archivo | Cambio previsto | Riesgo |
|---|---|---|
| `frontend/index.html` | Cargar `pilotPayAuth.js`; doble login en `doLogin()`; embudo de token; escopar `loadPermsFromFirebase()` | ALTO (monolito, login) |
| `frontend/js/pilotPayStore.js` | (Posible) que el sink P4 tome el token del embudo unificado — quizá cero cambios si el embudo es `getAuthToken()` | BAJO |
| `firebase-database.rules.json` | Reglas transitorias por claim (despliegue manual en consola) | ALTO (afecta a todos a la vez) |
| `frontend/js/pilotPayAnalytics.js` | Pausar (retirada de tracking a path sin regla) | BAJO |
| `docs/migrate.html` | Ya retirado en G4 — verificar que no reaparece | — |
| `scripts/sync-docs.js` | Añadir `pilotPayAuth.js`/quitar nada — ya sincroniza `js/` recursivo | BAJO |

### 1.2 Funciones afectadas (en `index.html`, líneas aproximadas)

| Función | Línea aprox | Rol actual | Cambio en 1.3 |
|---|---|---|---|
| `doLogin()` | 7595-7655 | Valida `USERS[u].pass === p`; set `currentUser`/`profileData`; `loadUserData`; `loadPermsFromFirebase`; `flushOfflineQueue`; `showWelcome` | Intentar `PilotPayAuth.signIn()` primero; legacy como fallback |
| `fbSignIn()` / `getAuthToken()` | 7123 / 7172 | Token anónimo (memoria) | El embudo: devolver token Auth si hay sesión `PilotPayAuth`, si no anónimo |
| `fbGet/fbSet/fbUpdate` | 7178-7202 | Usan `getAuthToken()` | Sin cambio si el embudo se centraliza en `getAuthToken()` |
| Sink P4 (`setFirebaseSink`) | 7667-7700 | Usa `getAuthToken()` | Sin cambio (hereda el embudo) |
| `loadUsersFromFirebase()` | 7244-7255 | Lee nodo `usuarios` entero (pre-login, anónimo) | Sigue para el fallback legacy; en 1.4 desaparece |
| `loadPermsFromFirebase()` | 7456-7470 | Lee nodo `permisos` **entero** | **Escopar a `permisos/{code}`** (obligatorio con reglas por claim) |
| `DEFAULT_USERS` | 7214-7217 | Fallback con `pass` de ESH | Intacto en 1.3 (se retira en 1.4) |

### 1.3 Flujos actuales de login
```
DOMContentLoaded → fbSignIn() [anónimo] → loadUsersFromFirebase() [nodo usuarios entero]
  ↓
Usuario teclea code+pass → doLogin()
  ↓
USERS[code].pass === pass ?  (texto plano, cliente)
  ├─ sí → currentUser=code; loadUserData(); loadPermsFromFirebase(); flushOfflineQueue(); showWelcome()
  └─ no → "Credenciales incorrectas"
```

### 1.4 Dependencias de sincronización (P4)
- P4 escribe/lee `pilotpay/historicos/{userId}/...` con el token del sink (`getAuthToken()` → anónimo hoy).
- `userId` = código de app (ESH/BZP), **no** el uid de Auth.
- El sink es **agnóstico al origen del token**: cualquier token con `auth != null` vale hoy.
- Validado en 1.1/1.2: un token Email/Password satisface las reglas actuales (PATCH `historicos/<code>` → HTTP 200).

### 1.5 Dependencias Firebase
- **Lectura pre-login:** `usuarios` (entero) y, en login, `permisos` (entero) — ambas chocan con reglas por claim.
- **Escritura por usuario:** `perfiles/{code}`, `usuarios/{code}` (campos user-managed), `historicos/{code}/...`.
- **Cross-user (admin):** monitor sync, alta/edición/borrado de usuarios, `solicitudes` — requieren cláusula admin en reglas.
- **Mappings:** `userCodes/{ESH,BZP}` ya existen (Fase 1.2).

---

## 2. MAPA COMPLETO DE AUTENTICACIÓN ACTUAL

```
┌─ IDENTIDAD DE APP (quién eres) ──────────────────────────────────────┐
│ doLogin(): USERS[code].pass === pass   (texto plano, validación CLIENTE)│
│ USERS ← loadUsersFromFirebase() (nodo usuarios entero) | DEFAULT_USERS │
│ currentUser = code  →  storageKey() = pilotpay:{code}:...              │
└───────────────────────────────────────────────────────────────────────┘
        │ (independiente)
┌─ IDENTIDAD DE FIREBASE (token para I/O) ─────────────────────────────┐
│ fbSignIn() → cuenta ANÓNIMA (REST) → idToken en memoria               │
│ getAuthToken() → ese token   →   EMBUDO ÚNICO de toda la E/S Firebase  │
│   ├─ fbGet/fbSet/fbUpdate                                              │
│   └─ sink P4 (historicos)                                             │
└───────────────────────────────────────────────────────────────────────┘
```

**Puntos clave:**
- **Dos identidades desacopladas hoy:** la de app (código+pass, cliente) y la de Firebase (uid anónimo). El uid anónimo no se correlaciona con el código → origen de R3.
- **`pass`:** texto plano en `pilotpay/usuarios/{code}/pass` y en `DEFAULT_USERS` (ESH). Validación 100% cliente → bypasseable.
- **Usuarios anónimos:** ~816 acumulados (1 por recarga); sin datos asociados.
- **Sync multi-dispositivo:** P4 por `historicos/{code}`; token anónimo; merge por timestamp; cola `p4_queue` si falla.
- **Persistencia local:** localStorage (fuente primaria) + IDB; `pilotpay_auth_session` (de C3) aún sin usar por la app.
- **Migración ya hecha (1.2):** ESH/BZP tienen cuenta Auth + claims `{role,code}` + mapping. La app **todavía no los usa**.

---

## 3. DISEÑO DE COEXISTENCIA

### 3.1 Principio
1.3 hace que la app **prefiera Auth** y mantenga **legacy como red de seguridad**, sin que nadie pierda acceso. El cambio se concentra en **dos puntos**: el login y el embudo de token.

### 3.2 Flujo Auth (primario)
```
Usuario teclea code+pass → doLogin()
  → PilotPayAuth.signIn(code, pass)
      ├─ OK → sesión Auth (claims role/code); currentUser = claim.code
      │        getAuthToken() pasará a devolver el token Auth (embudo)
      │        loadUserData(); loadPermsFromFirebase(code); showWelcome()
      └─ FALLO (cuenta no existe / red / credenciales) → cae a Legacy (3.3)
```

### 3.3 Flujo Legacy (fallback)
```
  → USERS[code].pass === pass ?
      ├─ sí → currentUser=code (igual que hoy); token sigue ANÓNIMO
      └─ no → "Credenciales incorrectas"
```

### 3.4 Reglas de prioridad
1. **Auth primero.** Si la cuenta Auth existe y la contraseña es correcta → sesión Auth.
2. **Legacy si Auth no aplica.** Cuenta inexistente (usuario no migrado) o sin red para el primer login → legacy.
3. **Nunca ambas a la vez.** Una sesión activa es Auth **o** legacy, no mixta. La presencia de `pilotpay_auth_session` marca el modo.

### 3.5 Embudo de token (la pieza central)
`getAuthToken()` se convierte en:
```
si PilotPayAuth.isAvailable():  return await PilotPayAuth.getToken()   // token Auth (claims)
si no:                          return token anónimo (comportamiento actual)
```
Como **todo** (fbGet/fbSet/fbUpdate + sink P4) pasa por `getAuthToken()`, este único cambio hace que un usuario migrado sincronice con su token Auth (con claim `code`) y uno no migrado siga con anónimo. **Sin tocar P4.**

### 3.6 Comportamiento offline
- Sesión Auth restaurable sin red (`restoreSession()` de C3, ya validado): la app abre con datos locales.
- Si `getToken()` no puede renovar (sin red): devuelve null → la E/S Firebase se encola (p4_queue/offline_queue) igual que hoy con el token anónimo expirado. **El offline-first no cambia.**
- Login inicial sin red de un usuario migrado: si no hay sesión persistida y no hay red → no puede autenticar contra Auth → puede caer a legacy (que es validación local contra USERS, si USERS está cacheado) o esperar red. **Punto a validar.**

---

## 4. DISEÑO DE REGLAS FIREBASE TRANSITORIAS

### 4.1 Estado actual (desplegado = repo, confirmado G1)
```
deny-by-default; por nodo: ".read"/".write": "auth != null"
```
Sin aislamiento por usuario. Token anónimo y token Auth son equivalentes frente a estas reglas.

### 4.2 Estado objetivo (Fase 1.5, NO 1.3)
```
historicos/$userId: ".read/.write": "auth.token.code === $userId || auth.token.role === 'admin'"
perfiles/$code, permisos/$code: idem por claim
usuarios: solo admin (o el propio); rol solo en auth.token.role
```

### 4.3 Estado intermedio de coexistencia (lo que SÍ se despliega en 1.3)
**Regla "claim manda si existe; anónimo sigue valiendo":**
```
historicos/$userId:
  ".read":  "(auth.token.code === $userId) || (auth.token.code === undefined && auth != null) || auth.token.role === 'admin'"
  ".write": "(auth.token.code === $userId) || (auth.token.code === undefined && auth != null)"
```
- Usuario **migrado** (token Auth, tiene `code`): queda **escopado** a su `$userId` → R3 cerrado para él.
- Usuario **no migrado** (token anónimo, sin `code`): `auth.token.code === undefined && auth != null` → sigue funcionando como hoy.
- `permisos`: durante 1.3 se mantiene **lectura permisiva** (`auth != null`) para no romper `loadPermsFromFirebase` hasta que el cliente escope la lectura a `permisos/{code}`. Una vez el cliente escopa (mismo despliegue de código), se puede endurecer.

### 4.4 Cómo evitar romper usuarios no migrados
- La cláusula `auth.token.code === undefined` es la red: mientras Anonymous siga habilitado (hasta 1.5) y el código `code` no esté en el token, el acceso es el de hoy.
- **No se toca `pass` ni el login legacy** → un no migrado entra exactamente igual.
- El endurecimiento final (quitar la cláusula anónima) se hace en 1.5, tras confirmar que todos migraron.

---

## 5. RIESGOS DETALLADOS

| # | Riesgo | Causa | Severidad | Mitigación |
|---|---|---|---|---|
| R-A | **Pérdida de acceso** | Doble login mal implementado bloquea ambos caminos | Alta | Legacy siempre como fallback; pruebas §7; rollback de código inmediato |
| R-B | **Pérdida de sincronización** | Regla por claim deniega `historicos`/`permisos` a quien ya migró | Alta | Reglas transitorias toleran anónimo; escopar `permisos` en cliente ANTES de endurecer; probar PATCH post-deploy |
| R-C | **`loadPermsFromFirebase` roto** | Lee nodo `permisos` entero; regla por usuario lo deniega | Media | Mantener `permisos` permisivo en 1.3 **y** escopar la lectura a `permisos/{code}` en el mismo deploy de código |
| R-D | **Claims incorrectos** | role/code mal en algún usuario | Media | `verify` por usuario (ya PASS para ESH/BZP); el embudo lee el claim del idToken |
| R-E | **Caché PWA antigua** | iPhone/iPad sirven `index.html` viejo (sin doble login) | Alta | Cache-busting (`?v=`) como en 13.18; el viejo sigue con anónimo+legacy → no se rompe, solo no usa Auth |
| R-F | **Conflicto sesión legacy vs Auth** | `pilotpay_auth_session` presente + login legacy, o viceversa | Media | Regla de prioridad 3.4 (una u otra, no mixta); `signOut()` limpia; en logout limpiar ambas |
| R-G | **Token Auth caduca y no renueva** | Sin red prolongada | Baja | Mismo comportamiento que anónimo hoy (encolar); offline-first intacto |
| R-H | **Despliegue de reglas afecta a todos a la vez** | Las reglas son globales e inmediatas | Alta | Reglas transitorias reversibles; desplegar reglas **después** del código; ventana monitorizada |

---

## 6. ESTRATEGIA DE DESPLIEGUE

### 6.1 Orden exacto (código antes que reglas)
```
1. [CÓDIGO] Cargar pilotPayAuth.js en index.html (orden: tras pilotPayStore, antes de uso)
2. [CÓDIGO] Embudo de token en getAuthToken() (Auth si sesión, si no anónimo)
3. [CÓDIGO] Doble login en doLogin() (Auth primario, legacy fallback)
4. [CÓDIGO] Escopar loadPermsFromFirebase() a permisos/{code}
5. [CÓDIGO] Pausar analytics
6. [PUBLICAR] sync-docs + push a avatars-redesign + cache-busting; verificar en 3 dispositivos
7. [VALIDAR] ESH y BZP entran por Auth; no migrado entra por legacy; sync OK con ambos tokens
8. [REGLAS] Desplegar reglas transitorias (4.3) — claim manda, anónimo tolerado
9. [VALIDAR] Post-reglas: migrado escopado a su historicos; no migrado sigue; admin sigue
10. [MONITOR] Ventana de observación; rollback de reglas listo
```
**Regla de oro:** el código (pasos 1-7) es reversible y NO rompe a nadie (Auth es aditivo, legacy sigue). Las reglas (paso 8) son el cambio global → van las últimas y con código ya validado en producción.

### 6.2 Puntos de validación
- Tras paso 6: la app carga, login legacy intacto, login Auth funciona para ESH/BZP.
- Tras paso 8: PATCH `historicos/<code>` HTTP 200 con token Auth (migrado) y con anónimo (no migrado); admin lee monitor.

### 6.3 Criterios de rollback
- **Código (1-7):** `git revert` del commit + re-publicar. Vuelve al login legacy puro.
- **Reglas (8):** re-desplegar `firebase-database.rules.json` actual (auth != null). Inmediato.
- Disparadores de rollback: cualquier usuario pierde acceso; sync roto para un migrado; admin pierde monitor.

### 6.4 Ventanas de riesgo
- **Publicación de código (6):** ventana de caché PWA — usuarios con versión vieja conviven con la nueva (ambas funcionan).
- **Despliegue de reglas (8):** ventana global e inmediata — es el momento de máxima atención.

---

## 7. ESTRATEGIA DE PRUEBAS

| Sujeto | Prueba | Resultado esperado |
|---|---|---|
| **ESH** (migrado, admin) | Login Auth + claims + sync + monitor admin | Entra por Auth; `role=admin`; sync OK; ve monitor |
| **BZP** (migrado, user) | Login Auth + sync historicos | Entra por Auth; `role=user`; PATCH historicos/BZP HTTP 200 |
| **Usuario legacy** (no migrado, si existiera) | Login con code+pass | Entra por fallback legacy; token anónimo; sync OK |
| **Usuario anónimo** (sesión sin login) | Lecturas pre-login | Igual que hoy mientras Anonymous siga habilitado |
| **Multi-dispositivo** | ESH en PC + iPhone PWA + iPad PWA | Login Auth en los 3; sync converge; caché-busting aplicado |
| **Offline** | Migrado abre sin red | `restoreSession()` abre con datos locales; sin pedir pass |
| **Conflicto** | Logout limpia ambas sesiones | `pilotpay_auth_session` y estado legacy limpios |

---

## 8. PRIMER PUNTO REAL DE IMPACTO PARA USUARIOS

**El despliegue de las reglas transitorias (paso 8).** Es el primer cambio **global e inmediato** que afecta a todos los dispositivos a la vez.

Matices:
- La **publicación de código (paso 6)** llega antes pero es **aditiva**: el doble login prueba Auth y cae a legacy; ningún usuario nota pérdida (a lo sumo, los migrados empiezan a entrar por Auth).
- Las **reglas (paso 8)** son donde un error rompería acceso/sync de forma inmediata y para todos. Por eso van con código ya validado y con rollback de reglas preparado.

---

## 9. PRIMER PUNTO DE NO RETORNO

**NO existe punto de no retorno en 1.3** si se respeta el diseño:
- El código es reversible (`git revert` + re-publicar).
- Las reglas transitorias son reversibles (re-desplegar las actuales).
- No se borra `pass`, no se deshabilita Anonymous, no se borra nada.

El **primer punto de no retorno del roadmap sigue siendo Fase 1.4** (borrar `pass` de RTDB). 1.3 tiene **ventanas de riesgo** (despliegue de reglas) pero **no** irreversibilidad.

---

## 10. RECOMENDACIÓN FINAL

**Dividir 1.3 e introducir una Fase 1.25 previa.** Los dos mayores focos de riesgo —cambio de `index.html` y despliegue de reglas— **no deben aterrizar juntos**. Propuesta:

### Fase 1.25 — Integración cliente (solo código, CERO reglas)
- Cargar `pilotPayAuth.js`, embudo de token, doble login, escopar `permisos`, pausar analytics.
- **No toca reglas.** Funciona bajo las reglas actuales (token Auth ya satisface `auth != null`, validado).
- Aditivo y reversible. Permite verificar en producción que ESH/BZP entran por Auth y sincronizan, **sin riesgo global de reglas**.
- Riesgo: BAJO-MEDIO (toca `index.html` pero legacy sigue de fallback).

### Fase 1.3 — Reglas transitorias (solo reglas)
- Desplegar las reglas por claim tolerantes con anónimo (4.3), con el cliente ya validado en producción.
- Riesgo: MEDIO (global), pero aislado del cambio de código.

### Luego: 1.4 (borrar pass + login legacy — ALTO, no retorno) → 1.5 (deshabilitar Anonymous + reglas finales).

**Justificación:** separar código de reglas reduce la superficie de fallo de cada despliegue, permite rollback independiente, y deja una ventana de observación entre ambos. Es coherente con el principio del Plan Corregido (no paralelizar cambios de alto riesgo).

**Alternativa (no recomendada):** ejecutar 1.3 completa (código + reglas en una tanda) — más rápido, pero junta los dos riesgos altos y complica el diagnóstico si algo falla.

---

## RESUMEN EJECUTIVO

- **Pieza central:** un **embudo de token único** (`getAuthToken()`) hace que conectar Auth a toda la E/S (incluido P4) sea un cambio de un punto.
- **Coexistencia:** Auth primario + legacy fallback; reglas transitorias que toleran anónimo → nadie pierde acceso.
- **Primer impacto usuarios:** despliegue de reglas. **Primer no retorno:** Fase 1.4 (no en 1.3).
- **Recomendación:** **Fase 1.25 (código) + Fase 1.3 (reglas)** separadas.

**FIN DEL DISEÑO — Fase 1.3. No implementar hasta autorización explícita y plan operativo aprobado.**
