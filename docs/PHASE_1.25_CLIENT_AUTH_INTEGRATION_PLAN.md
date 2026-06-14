# PHASE 1.25 — PLAN OPERATIVO: INTEGRACIÓN CLIENTE DE AUTH (SOLO CÓDIGO)

**Fecha:** 2026-06-12
**Fase:** 1.25 — Integración cliente de Auth (derivada de la recomendación del diseño 1.3)
**Estado:** 🟡 **DISEÑO — NO implementar. Sin cambios de código/reglas/Firebase.**
**Depende de:** Fase 1.2 ✅ (ESH/BZP migrados) · `pilotPayAuth.js` (C3, validado) · diseño 1.3 (`04ffa22`)
**Riesgo de la fase:** BAJO-MEDIO (toca `index.html`, pero legacy permanece como fallback; **cero cambios de reglas**).

---

## 0. PRINCIPIO RECTOR

Fase 1.25 conecta el cliente Auth (ya validado en C3) a la app, **sin tocar ni una regla de Firebase**.
Funciona bajo las reglas actuales (`auth != null`), porque un token Email/Password ya las satisface
(validado en 1.1/1.2: PATCH `historicos/<code>` → HTTP 200).

```
Objetivo: que ESH/BZP entren por Auth y sincronicen con su token Auth,
          y que CUALQUIER usuario no migrado siga entrando EXACTAMENTE igual que hoy.
Invariante: nadie pierde acceso. El legacy sigue intacto como fallback.
Reversible al 100% (git revert + re-publicar). Sin punto de no retorno.
```

Las reglas (estado intermedio por claim) se dejan para **Fase 1.3**. Esta fase es **solo código cliente**.

---

## 1. ARCHIVOS EXACTOS QUE SE TOCARÍAN

| Archivo | Cambio | Riesgo |
|---|---|---|
| `frontend/index.html` | (a) cargar `pilotPayAuth.js`; (b) embudo en `getAuthToken()`; (c) doble login en `doLogin()`; (d) `restoreSession()` en arranque; (e) `signOut()` en `doLogout()`; (f) escopar `loadPermsFromFirebase()` a `permisos/{code}` (preparatorio) | MEDIO |
| `docs/index.html` + `docs/js/pilotPayAuth.js` | Generados por `npm run sync` al publicar (no edición manual) | BAJO |

**Nada más.** No se toca `pilotPayStore.js` (el sink P4 hereda el embudo), ni reglas, ni `tools/admin-cli`,
ni los parsers/cálculos/dashboard. `pilotPayAuth.js` ya existe (C3) y no se modifica.

---

## 2. FUNCIONES EXACTAS QUE SE MODIFICARÍAN (en `index.html`)

| Función / punto | Línea aprox | Cambio |
|---|---|---|
| Includes de scripts | ~6308 | Añadir `<script src="js/pilotPayAuth.js?v=...">` (antes de su primer uso; tras `pilotPayStore.js`) |
| `getAuthToken()` | 7172 | **Embudo:** si hay sesión `PilotPayAuth` → su token; si no → anónimo (actual) |
| `doLogin()` | 7595-7655 | Intentar `PilotPayAuth.signIn()` primero; legacy como fallback |
| `DOMContentLoaded` | 7658-7707 | Añadir `PilotPayAuth.restoreSession()` al arranque (antes de fijar el sink / antes de cualquier I/O) |
| `doLogout()` | 7786+ | Añadir `PilotPayAuth.signOut()` a la limpieza de sesión |
| `loadPermsFromFirebase()` | 7456-7470 | Leer `permisos/{currentUser}` en vez del nodo entero (preparatorio para 1.3) |

**No se modifican:** `fbSignIn()`, `fbGet/fbSet/fbUpdate`, el sink P4, `loadUsersFromFirebase()`,
`loadUserData()`, `DEFAULT_USERS`. (El sink y fbGet/fbSet/fbUpdate heredan el embudo sin tocarse.)

---

## 3. FLUJO LOGIN AUTH (primario)

```
doLogin(code, pass):
  1. ¿PilotPayAuth disponible? (script cargado)
  2. try: session = await PilotPayAuth.signIn(code, pass)
       → OK:
           currentUser = session.code          (del claim, no del input)
           profileData = (loadUserData(currentUser) lee perfiles/{code})
           loadPermsFromFirebase(currentUser)   (scoped)
           flushOfflineQueue()
           showWelcome()
           # A partir de aquí getAuthToken() devuelve el token Auth → P4 usa token Auth
       → signIn lanza (cuenta no existe / credenciales / red):
           → ir a FLUJO LEGACY (§4)
```
Nota: `signIn` con cuenta inexistente o contraseña mala lanza el **mismo error neutro** (enumeration
protection, validado en C3). Distinguir "no migrado" de "credencial mala" no es posible ni necesario:
en ambos casos se intenta el fallback legacy, que decide.

---

## 4. FLUJO LOGIN LEGACY (fallback)

```
  (tras fallo de Auth)
  legacy:
    if (USERS[code] && USERS[code].pass === pass):   # idéntico a hoy
        (chequear bloqueado / temporal como hoy)
        currentUser = code
        profileData = loadUserData(code)
        loadPermsFromFirebase(code)
        flushOfflineQueue()
        showWelcome()
        # getAuthToken() sigue devolviendo token ANÓNIMO (no hay sesión Auth)
    else:
        "Credenciales incorrectas"
```
El camino legacy es **byte a byte el de hoy**. No se altera la validación, ni `bloqueado`/`temporal`,
ni el token anónimo. Solo se ejecuta si Auth no aplicó.

---

## 5. REGLAS DE PRIORIDAD AUTH ↔ LEGACY

1. **Auth primero.** Si la cuenta Auth existe y la contraseña es correcta → sesión Auth.
2. **Legacy si Auth no aplica.** Cuenta inexistente (no migrado) o sin red para el primer login → legacy.
3. **Nunca mixta.** La existencia de `localStorage.pilotpay_auth_session` define el modo de la sesión.
   `getAuthToken()` decide el token según ese único indicador (`PilotPayAuth.isAvailable()`).
4. **Logout limpia ambos.** `doLogout()` llama a `PilotPayAuth.signOut()` **y** mantiene la limpieza
   legacy existente → no quedan sesiones colgadas de ningún tipo.

---

## 6. OFFLINE / restoreSession

- **Arranque:** `DOMContentLoaded` llama `PilotPayAuth.restoreSession()` (sin red). Si había sesión Auth,
  el modo queda en Auth desde el inicio y `getAuthToken()` usará el token Auth (renovándolo de forma
  perezosa al primer uso con red).
- **Sin red:** `restoreSession()` no hace red; la app abre con datos locales (offline-first intacto).
- **Token Auth no renovable (sin red):** `getToken()` devuelve null → la E/S Firebase se encola
  (p4_queue / offline_queue), igual que hoy cuando el token anónimo expira. **No se degrada el offline-first.**
- **Decisión de diseño (sin mezcla de tokens):** si hay sesión Auth pero `getToken()` da null,
  `getAuthToken()` **devuelve null** (encolar), **no** cae a anónimo. Evita mezclar identidades y es
  forward-compatible con las reglas por claim de 1.3. (Bajo las reglas actuales, anónimo también valdría;
  se elige no mezclar por higiene y por preparar 1.3.)

---

## 7. CÓMO CAMBIA getAuthToken()

**Hoy:**
```
async function getAuthToken() { await fbSignIn(); return _fbToken; }   // anónimo
```
**En 1.25 (embudo):**
```
async function getAuthToken() {
  if (typeof PilotPayAuth !== 'undefined' && PilotPayAuth.isAvailable()) {
    return await PilotPayAuth.getToken();   // token Auth (o null si sin red → encolar)
  }
  await fbSignIn();                          // camino anónimo/legacy SIN cambios
  return _fbToken;
}
```
**Consecuencia clave:** como `fbGet/fbSet/fbUpdate` y el **sink P4** ya llaman a `getAuthToken()`,
este único cambio hace que **toda** la E/S use el token correcto según el modo de sesión. **P4 no se toca.**

---

## 8. CÓMO SE VALIDA QUE P4 SIGUE FUNCIONANDO

- **Migrado (Auth):** login ESH/BZP → activar P4 (`?p4=1` o flag) → generar un cambio (auditoría/monthly)
  → confirmar PATCH a `historicos/{code}` con token Auth → HTTP 200 → leer en otro dispositivo.
- **No migrado (anónimo):** mismo flujo con token anónimo → sigue funcionando.
- **Cola offline:** trabajar sin red, recuperar red → `p4_queue` se vacía con el token del modo activo.
- **Sink sin cambios:** se verifica que `setFirebaseSink` no se ha tocado y que el token llega vía embudo.
- **P4 Debug Panel:** `P4Debug.inspectMonthly()` para comparar conteos entre dispositivos (herramienta existente).

---

## 9. CÓMO SE EVITA ROMPER USUARIOS LEGACY

- El camino legacy de `doLogin()` es **idéntico**: misma validación `USERS[code].pass === pass`,
  mismos chequeos `bloqueado`/`temporal`, mismo token anónimo.
- `loadUsersFromFirebase()` y `DEFAULT_USERS` **intactos** → el fallback siempre tiene con qué validar.
- **Reglas sin cambios** → el token anónimo sigue siendo válido para toda la E/S.
- Si `pilotPayAuth.js` no cargara (error de red en el `<script>`), `getAuthToken()` detecta
  `typeof PilotPayAuth === 'undefined'` → cae a anónimo → la app funciona como hoy (degradación segura).

---

## 10. QUÉ PASA CON permisos / perfil / currentUser / profileData

| Elemento | Comportamiento en 1.25 |
|---|---|
| `currentUser` | Tras Auth: = `claim.code` (ESH/BZP). Tras legacy: = `code` tecleado. Mismo valor que hoy → `storageKey()` no cambia |
| `profileData` | `loadUserData(currentUser)` lee `perfiles/{code}` igual que hoy (con token Auth o anónimo, ambos válidos bajo reglas actuales) |
| `permisos` | `loadPermsFromFirebase()` pasa a leer **`permisos/{currentUser}`** (scoped). Bajo reglas actuales funciona; prepara 1.3. Si el nodo scoped no existe, fallback a caché local como hoy |
| `pilotpay_auth_session` | Nuevo indicador del modo de sesión (lo gestiona `PilotPayAuth`) |
| Claves de datos locales | **Sin cambios** — siguen escopadas por `code` (`pilotpay:{code}:...`) |

**Importante:** `currentUser` sigue siendo el **código** (no el uid). Todas las claves de storage, IDB y
paths `historicos/{code}` permanecen iguales → **cero migración de datos** en 1.25.

---

## 11. QUÉ NO SE TOCA

- ❌ Reglas Firebase (se quedan en `auth != null`; el cambio por claim es de 1.3).
- ❌ `pass` en RTDB y `DEFAULT_USERS` (se retiran en 1.4).
- ❌ `doLogin()` legacy (se conserva como fallback; se retira en 1.4).
- ❌ Anonymous Auth (sigue habilitado; se deshabilita en 1.5).
- ❌ `pilotPayStore.js` / sink P4 (heredan el embudo).
- ❌ Parsers, cálculos, auditEngine, dashboard, Biblioteca Normativa.
- ❌ Esquemas de datos, storage keys, IDB stores, paths Firebase.
- ❌ `pilotPayAuth.js` (ya validado en C3; se usa, no se modifica).

---

## 12. RIESGOS Y MITIGACIONES

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| 1 | Doble login bloquea ambos caminos | Alta | Legacy intacto como fallback; pruebas §14; rollback de código inmediato |
| 2 | `pilotPayAuth.js` no carga (red/caché) | Media | `getAuthToken()` detecta `undefined` → cae a anónimo → app como hoy |
| 3 | `loadPermsFromFirebase` scoped rompe permisos | Media | Bajo reglas actuales el read scoped funciona; fallback a caché local; probar con ESH (admin) y BZP |
| 4 | Token Auth no renueva offline | Baja | Encolar (no mezclar con anónimo); offline-first preservado |
| 5 | Caché PWA sirve `index.html` viejo | Media | Cache-busting `?v=` (procedimiento 13.18); el viejo sigue con anónimo+legacy → no se rompe |
| 6 | Sesión Auth + estado legacy colgados | Media | `doLogout()` limpia ambos; modo definido por `isAvailable()` |
| 7 | Admin (ESH) pierde monitor/funciones | Media | Claim `role=admin` en token; probar monitor sync y funciones admin tras login Auth |
| 8 | Mezcla de tokens en sync | Baja | Decisión §6: no cross-fallback; un modo, un token |

**Riesgo agregado: BAJO-MEDIO.** Reversible, sin reglas, legacy intacto.

---

## 13. SECUENCIA DE COMMITS PROPUESTA (cuando se autorice)

| Commit | Contenido | Por qué separado |
|---|---|---|
| **E1** | Cargar `pilotPayAuth.js` + `restoreSession()` en arranque + embudo en `getAuthToken()` | Base: el token funnel sin cambiar login todavía. Verificable de forma aislada |
| **E2** | Doble login en `doLogin()` + `signOut()` en `doLogout()` | El cambio de flujo de login, sobre la base ya probada |
| **E3** | Escopar `loadPermsFromFirebase()` a `permisos/{code}` | Preparatorio para 1.3; aislado para validar permisos por separado |
| **E4** | Pausar analytics (opcional aquí o en 1.3) | Independiente |

Cada commit en la rama de seguridad local, validado antes del siguiente. Publicación a producción
(`avatars-redesign`) **solo** tras validar los cuatro en local y con tu autorización explícita.

---

## 14. PLAN DE PRUEBAS LOCAL (antes de publicar)

Con la app servida en local (no producción):
1. **Arranque sin sesión:** carga OK, login legacy de un usuario → entra como hoy (token anónimo).
2. **Login Auth ESH:** entra; `currentUser=ESH`; `role=admin` disponible; dashboard/perfil cargan.
3. **Login Auth BZP:** entra; `currentUser=BZP`; perfil carga.
4. **Recarga (migrado):** `restoreSession()` mantiene sesión Auth sin pedir pass.
5. **Embudo de token:** con sesión Auth, una operación Firebase usa token Auth (inspección DevTools: claim en el JWT).
6. **P4 con Auth:** generar cambio → PATCH `historicos/{code}` HTTP 200 con token Auth.
7. **Fallback:** login con código sin cuenta Auth → cae a legacy → token anónimo → funciona.
8. **Logout:** limpia `pilotpay_auth_session` y estado legacy; siguiente login limpio.
9. **Offline:** modo avión → app abre con datos locales; operaciones se encolan; al volver red, vacía cola.
10. **`pilotPayAuth.js` ausente (simulado):** la app cae a anónimo y funciona (degradación segura).

## 15. PLAN DE PRUEBAS EN PRODUCCIÓN (tras publicar con cache-busting)

En PC Chrome + iPhone PWA + iPad PWA:
1. ESH login Auth en los 3 dispositivos; sync converge; monitor admin OK.
2. BZP login Auth; PATCH `historicos/BZP` HTTP 200; sync entre dispositivos.
3. Verificar que un acceso por **legacy** (si se fuerza credencial sin cuenta Auth) sigue entrando.
4. Caché: forzar recarga dura; confirmar versión nueva (`?v=`) servida.
5. Sin tocar reglas: confirmar que P4 sigue idéntico (conteos `P4Debug.inspectMonthly()` coinciden).

---

## 16. ROLLBACK EXACTO

- **Por commit:** `git revert E4..E1` (o individual) → vuelve al login legacy puro.
- **En producción:** revertir el commit publicado en `avatars-redesign` + `npm run sync` + push → GitHub Pages
  vuelve a la versión legacy en minutos (con cache-busting).
- **Sin reglas que revertir** (no se tocaron). **Sin datos que restaurar** (no se migró nada).
- **Punto de no retorno: NINGUNO.** El primero sigue siendo Fase 1.4.

---

## 17. CRITERIOS DE ÉXITO

1. ESH y BZP entran por **Auth** (no legacy) y la app funciona igual (dashboard, perfil, sync).
2. El **token Auth** se usa en toda la E/S Firebase (incluido P4) para sesiones Auth.
3. Un usuario **no migrado** (o fallo de Auth) entra por **legacy** sin cambios.
4. **Recarga** mantiene la sesión Auth sin pedir contraseña (offline-first).
5. **P4 sigue funcionando** con ambos tokens (PATCH HTTP 200, sync converge).
6. **Logout** limpia ambos modos.
7. **Reglas sin cambios**, `pass` intacto, Anonymous habilitado, legacy intacto.
8. Producción funciona idéntica para quien no usa Auth; rollback probado mentalmente.

## 18. CRITERIOS DE BLOQUEO

La fase NO se cierra (y se hace rollback) si:
- Algún usuario pierde acceso (Auth o legacy).
- El sync P4 se rompe para algún modo.
- `loadPermsFromFirebase` scoped deja a un usuario sin permisos correctos.
- El admin (ESH) pierde monitor o funciones tras login Auth.
- La caché PWA deja a un dispositivo en estado inconsistente sin recuperación por cache-busting.

---

## RESUMEN

Fase 1.25 = **toda la integración de código** de Auth (carga del módulo, embudo de token, doble login,
restore/​logout, escopar permisos) **sin tocar ni una regla**. Aprovecha que un token Email/Password ya
satisface las reglas actuales. Legacy intacto como fallback → nadie pierde acceso. Reversible, sin punto
de no retorno. Deja a Fase 1.3 como **un despliegue de reglas limpio** sobre un cliente ya validado en producción.

**FIN DEL PLAN — Fase 1.25. No implementar hasta autorización explícita.**
