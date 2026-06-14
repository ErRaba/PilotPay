# FASE 1.25 — COMMIT E1: ESPECIFICACIÓN TÉCNICA EJECUTABLE

**Fecha:** 2026-06-12
**Commit:** E1 (primero de E1-E4 del plan 1.25, `b6223eb`)
**Estado:** 🟡 **ESPECIFICACIÓN — NO implementar. Sin cambios de código/reglas/Firebase.**
**Recomendación (ver §Auditoría):** **REFINAR E1 ANTES DE IMPLEMENTAR** — incorporar guard `currentUser`.

---

## 1. OBJETIVO EXACTO DE E1
Conectar el cliente Auth (`pilotPayAuth.js`, C3) al embudo de token de la app, de forma **dormida e
invisible**: cargar el módulo, restaurar sesión al arranque, y hacer que `getAuthToken()` use el token
Auth **solo cuando proceda**, con fallback anónimo intacto. **Sin tocar el login, las reglas ni P4.**

## 2. POR QUÉ E1 SE SEPARA DE E2
- **E1 = infraestructura dormida** (token funnel + carga + restore). No cambia el flujo de login visible.
- **E2 = activación** (doble login en `doLogin()` + `signOut()` en logout) — sí cambia el flujo.
- Separar permite: validar el embudo de forma aislada, revertir E1 sin afectar al login, y diagnosticar
  un solo cambio a la vez. Acorde al principio "no juntar cambios de riesgo".

## 3. ARCHIVOS EXACTOS AFECTADOS
- `frontend/index.html` — 3 ediciones (script include, `getAuthToken()`, `DOMContentLoaded`).
- (Al publicar) `docs/index.html` vía `npm run sync` — no en E1 local. `docs/js/pilotPayAuth.js` ya
  se sincroniza por la regla recursiva de `js/`.

## 4. FUNCIONES EXACTAS AFECTADAS
| Función | Línea | Cambio |
|---|---|---|
| (includes) | ~6301 | +1 `<script>` |
| `getAuthToken()` | 7172-7175 | Embudo con guard |
| `DOMContentLoaded` cb | 7658-7660 | `restoreSession()` antes de `fbSignIn()` |

**No tocadas:** `fbSignIn()`, `fbGet/fbSet/fbUpdate`, sink P4, `loadUsersFromFirebase()`, `doLogin()`,
`loadPermsFromFirebase()`, `loadUserData()`.

## 5. PUNTO EXACTO DE INSERCIÓN DE pilotPayAuth.js
Tras `frontend/index.html:6301` (`<script src="js/pilotPayStore.js?v=3.0.1">`):
```html
<script src="js/pilotPayAuth.js?v=3.0.1"></script>
```
Carga junto a los módulos core. Orden irrelevante para la ejecución (IIFE; se usa post-`DOMContentLoaded`),
pero agrupado por claridad. `?v=` para cache-busting PWA.

## 6. PUNTO EXACTO DE EJECUCIÓN DE restoreSession()
`frontend/index.html:7658-7660`, primera sentencia del callback `DOMContentLoaded`, **antes** de
`fbSignIn()` y de `setFirebaseSink()`:
```js
window.addEventListener('DOMContentLoaded', async () => {
  if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.restoreSession();  // ← E1
  await fbSignIn();
  ...
```
Es síncrono y sin red (C3); deja el modo de sesión definido antes de cualquier I/O.

## 7. DISEÑO EXACTO DEL NUEVO getAuthToken()

### 7.1 Versión RECHAZADA (solo `isAvailable`) — motivo en §Auditoría
```js
if (typeof PilotPayAuth !== 'undefined' && PilotPayAuth.isAvailable()) {
  return await PilotPayAuth.getToken();
}
```
**Problema:** se activa también PRE-login (`currentUser` null) y ante sesiones residuales/de otro usuario
→ puede degradar el login legacy (ver §Auditoría, hallazgo A-1).

### 7.2 Versión RECOMENDADA (con guard `currentUser`)
```js
async function getAuthToken() {
  // Embudo (E1): usar el token Auth SOLO si hay sesión Auth cuyo `code` coincide
  // con el usuario activo de la app. Evita que una sesión Auth residual (p.ej.
  // sembrada por el harness o de un usuario borrado) secuestre el token PRE-login
  // o de otro usuario, lo que degradaría el login legacy. Forward-compatible con E2.
  if (typeof PilotPayAuth !== 'undefined'
      && PilotPayAuth.isAvailable()
      && currentUser
      && (PilotPayAuth.getSession() || {}).code === currentUser) {
    return await PilotPayAuth.getToken(); // token Auth (o null sin red → encolar; no se mezcla con anónimo)
  }
  await fbSignIn();
  return _fbToken; // null si sin red o auth no habilitada
}
```
Propiedad: en E1, como `doLogin()` no se toca, una sesión solo "cuadra" si se sembró por harness con el
mismo código con el que luego se hace login legacy → el embudo queda **realmente dormido** salvo en ese
escenario de prueba controlado.

## 8. FLUJO COMPLETO

| Escenario | Comportamiento |
|---|---|
| **Sesión Auth válida y `code===currentUser`** | `getToken()` renueva si hace falta → token Auth → I/O con claim |
| **Sesión Auth inexistente** | `isAvailable()` false → camino anónimo (`fbSignIn`) — idéntico a hoy |
| **Token Auth expirado** | `getToken()` renueva con refresh token (securetoken) → nuevo idToken; re-persistido |
| **Fallo de restoreSession** | C3 lo envuelve en try/catch → devuelve false → no hay sesión → anónimo |
| **Fallback anónimo** | Cualquier caso en que el guard no se cumpla → `fbSignIn()` + `_fbToken` (hoy) |
| **Sesión Auth pero sin red (token null)** | `getToken()` → null → `getAuthToken()` → null → operación encolada (offline-first) |
| **Pre-login (`currentUser` null)** | Guard falla → anónimo → `loadUsersFromFirebase` carga `USERS` con token anónimo (sin regresión) |

## 9. PSEUDOCÓDIGO ANTES/DESPUÉS

**ANTES (3 puntos):**
```
includes: [ ... pilotPayStore.js, userProfile.js ... ]
getAuthToken(): await fbSignIn(); return _fbToken
DOMContentLoaded: await fbSignIn(); loadUsersFromFirebase(); setFirebaseSink(); ...
```
**DESPUÉS (E1 refinado):**
```
includes: [ ... pilotPayStore.js, pilotPayAuth.js, userProfile.js ... ]
getAuthToken():
   if PilotPayAuth disponible AND isAvailable() AND currentUser AND getSession().code===currentUser:
       return PilotPayAuth.getToken()
   await fbSignIn(); return _fbToken
DOMContentLoaded:
   PilotPayAuth.restoreSession()      // nuevo, sin red
   await fbSignIn(); loadUsersFromFirebase(); setFirebaseSink(); ...
```

## 10. DEPENDENCIAS INTERNAS AFECTADAS
| Dependencia | Efecto de E1 |
|---|---|
| `fbGet` / `fbSet` / `fbUpdate` (7178-7202) | Llaman a `getAuthToken()` → heredan el embudo. Sin cambios en su código |
| **P4 / sink** (7668-7700) | El sink usa `getAuthToken()` → hereda el embudo. **No se toca** `pilotPayStore.js` |
| Sincronización | Con sesión Auth válida y match → sync con token Auth; si no → anónimo (hoy) |
| Permisos | `loadPermsFromFirebase()` no se toca; usa `getAuthToken()` post-login (hereda embudo) |
| **Funciones admin** (9286/9326/9668/10043) | `getAuthToken()` directo para fetch admin → heredan embudo (con guard: usan Auth si `currentUser`=admin tiene sesión que cuadra; si no, anónimo). OK bajo reglas actuales |
| `currentUser` (global, 7709) | **Nueva lectura** desde `getAuthToken()` (guard). Inicializado a null; definido en tiempo de llamada |

## 11. RIESGOS TÉCNICOS
| # | Riesgo | Sev |
|---|---|---|
| T1 | Sesión Auth residual/dead secuestra token pre-login → login legacy degradado | **Alta (en versión 7.1)** |
| T2 | `pilotPayAuth.js` no carga | Baja |
| T3 | `restoreSession` excepción | Baja |
| T4 | Token Auth null sin red con sesión activa | Baja |
| T5 | Caché PWA sirve index viejo | Baja |
| T6 | Acoplamiento `getAuthToken`↔`currentUser` (orden/TDZ) | Muy baja |
| T7 | Admin fetch directo usa token inesperado | Baja |

## 12. MITIGACIONES
- **T1 → guard `currentUser` (§7.2).** Neutraliza el secuestro pre-login y el cruce de usuario. **Es el motivo del refinamiento.**
- T2 → `typeof PilotPayAuth !== 'undefined'` → cae a anónimo.
- T3 → C3 ya protege `restoreSession` con try/catch.
- T4 → encolar (offline-first); no mezclar tokens.
- T5 → cache-busting `?v=`; el viejo no tiene embudo → anónimo → no rompe.
- T6 → `currentUser` es global `let` inicializado; `getAuthToken` solo corre post-carga → sin TDZ.
- T7 → bajo reglas actuales cualquier token vale; con guard, admin usa Auth solo si su sesión cuadra.

## 13. PRUEBAS LOCALES OBLIGATORIAS
1. Carga sin errores; `typeof PilotPayAuth === 'object'`.
2. Arranque sin sesión: `isAvailable()` false; app y login legacy igual que hoy (token anónimo).
3. Embudo dormido: sin sesión, I/O usa token anónimo (DevTools: `?auth=` sin claim `code`).
4. Sembrar sesión por harness (`test-auth.html`, mismo origen) login ESH.
5. Recargar app + login legacy ESH → `currentUser=ESH` y `getSession().code=ESH` cuadran → I/O usa token **Auth** (JWT con `code/role`).
6. Pre-login con sesión sembrada PRESENTE: `loadUsersFromFirebase` debe seguir cargando `USERS` (token anónimo, guard falla por `currentUser` null) → **BZP puede login legacy** (test anti-regresión T1).
7. Offline con sesión Auth: app abre; operaciones encolan; al volver red, se vacían.

## 14. PRUEBAS DE REGRESIÓN OBLIGATORIAS
| Prueba | Esperado |
|---|---|
| Login legacy ESH y BZP | Entran igual que hoy |
| `loadUsersFromFirebase` con sesión Auth residual presente | Carga `USERS` completa (no cae a DEFAULT_USERS) → **anti-T1** |
| Perfil/dashboard | Cargan igual |
| Funciones admin (ESH) | Monitor sync, alta/edición → siguen |

## 15. PRUEBAS DE SINCRONIZACIÓN
- P4 con token anónimo (sin sesión): PATCH `historicos/{code}` HTTP 200; `P4Debug.inspectMonthly()` coincide.
- P4 con token Auth (sesión que cuadra): PATCH HTTP 200; sync converge multi-dispositivo.
- Cola `p4_queue`: trabajar offline → recuperar red → se vacía con el token del modo activo.

## 16. PRUEBAS OFFLINE-FIRST
- Modo avión, sin sesión: app abre con datos locales; al volver red, sync anónimo.
- Modo avión, con sesión Auth: `restoreSession` (sin red) OK; app abre; `getToken` null → encolar; al volver red, renueva y vacía.

## 17. CRITERIOS DE ÉXITO
1. Sin sesión Auth: comportamiento idéntico a hoy (no regresión) — login legacy, sync, P4.
2. `loadUsersFromFirebase` no se degrada por sesiones residuales (anti-T1).
3. Con sesión que cuadra: `getAuthToken()` devuelve token Auth; I/O HTTP 200.
4. Offline-first preservado.
5. `index.html` carga `pilotPayAuth.js` sin errores.

## 18. CRITERIOS DE BLOQUEO
- Login legacy se rompe para cualquier usuario (esp. BZP por T1).
- `loadUsersFromFirebase` cae a DEFAULT_USERS por sesión residual.
- P4/sync se rompe en modo anónimo.
- El embudo usa token Auth sin sesión que cuadre, o anónimo cuando debería Auth.

## 19. ROLLBACK EXACTO
- Local: `git revert <E1>` o revertir las 3 ediciones de `index.html`.
- Sin reglas/datos/producción que revertir (E1 local hasta publicar).
- **Punto de no retorno: NINGUNO.**

## 20. ESTIMACIÓN REAL DEL TAMAÑO DE E1
| Métrica | Valor |
|---|---|
| Líneas añadidas | ~10-12 (1 script + ~7 en getAuthToken + 1 en DOMContentLoaded) |
| Funciones tocadas | 2 (`getAuthToken`, callback `DOMContentLoaded`) + 1 include |
| Complejidad | Baja (un condicional + una llamada) |
| Riesgo (versión 7.2 refinada) | **MUY BAJO** |
| Riesgo (versión 7.1 sin guard) | MEDIO (regresión T1) |

---

# AUDITORÍA CRÍTICA DE E1

Búsqueda explícita de dependencias ocultas del monolito `index.html`.

### A-1 · `getAuthToken` se invoca PRE-login → riesgo de regresión del login legacy (HALLAZGO PRINCIPAL)
`loadUsersFromFirebase()` corre en `DOMContentLoaded` (antes de cualquier login) y usa `fbGet → getAuthToken`.
Con el embudo solo-`isAvailable()` (§7.1), una **sesión Auth residual** (sembrada por harness, o de un
usuario borrado como ZZT) haría:
```
isAvailable()=true → getToken() → refresh muerto → null → fbGet sin ?auth → reglas deniegan
→ loadUsersFromFirebase recibe null → USERS = DEFAULT_USERS (solo ESH)
→ BZP (y cualquier no-ESH) NO puede validar su login legacy → "Credenciales incorrectas"
```
**Es una regresión real, no teórica.** Probabilidad: requiere una sesión residual en el dispositivo
(quien probó el harness). **Mitigación: guard `currentUser` (§7.2)** → pre-login `currentUser` es null →
embudo cae a anónimo → `loadUsersFromFirebase` intacto. **Este hallazgo es el que motiva REFINAR E1.**

### A-2 · Cruce de identidad currentUser ↔ sesión Auth
Sin guard, `currentUser` (legacy, p.ej. ESH) y la sesión Auth (residual, p.ej. BZP/ZZT) pueden no
coincidir → el token no corresponde al usuario cuyos datos se están escribiendo (`historicos/{currentUser}`).
El guard `getSession().code === currentUser` lo elimina.

### A-3 · Estados globales implicados
- `_fbToken/_fbTokenExp/_fbRefreshToken` (anónimo, 7119-7121): intactos; coexisten con la sesión Auth en
  memoria de `PilotPayAuth`. No hay colisión (espacios separados).
- `currentUser` (7709): nueva lectura desde `getAuthToken`. Es `let` global inicializado a null → sin TDZ
  en tiempo de ejecución (getAuthToken corre tras carga).
- `USERS`, `profileData`, `perms`: no los toca E1; dependen de A-1 indirectamente (si USERS falla, profileData base se degrada).

### A-4 · Listeners y orden de arranque
- Único listener tocado: `DOMContentLoaded`. `restoreSession()` se inserta como primera sentencia,
  antes de `fbSignIn()` y `setFirebaseSink()` → el modo de sesión queda fijado antes de cualquier I/O y
  antes de que P4 registre el sink. Correcto.
- `PilotPayStore.init(currentUser)` corre en `initApp()` (7948), **post-login** → el sink ya usa el embudo.

### A-5 · Efectos laterales
- `getToken()` (C3) **re-persiste** el refresh token rotado en `localStorage.pilotpay_auth_session` en cada
  renovación. Efecto lateral esperado y benigno; no afecta a claves de datos.
- `fbSignIn()` sigue **incondicional** en arranque → mantiene la creación de 1 cuenta anónima por carga
  (~816 acumuladas). Conocido; optimización diferida (no E1).

### A-6 · Riesgos de sincronización
- El sink P4 hereda el embudo; con guard, un usuario en modo anónimo sincroniza con anónimo y uno en modo
  Auth (match) con Auth — nunca mezcla. Bajo reglas actuales ambos valen → sync no se rompe.
- Riesgo residual: si en una misma sesión el modo cambiara a mitad (no ocurre en E1: el modo se fija al
  arranque/login y no muta hasta logout).

### A-7 · Riesgos de caché / PWA
- `index.html` viejo cacheado no tiene embudo → anónimo → no rompe. Cache-busting `?v=` para forzar el nuevo.
- `pilotPayAuth.js` se servirá en `docs/js/` al sincronizar (regla recursiva de `js/`); inofensivo (no lo
  carga el index viejo).

### A-8 · Riesgos de `currentUser`
- Cubierto por A-1/A-2. El guard convierte `currentUser` en la condición de activación del embudo →
  alinea token e identidad de datos.

### A-9 · Riesgos de `profileData`
- E1 no toca `loadUserData()`. Único impacto indirecto: si A-1 degradara `USERS`, el merge base de
  `profileData` se vería afectado. Neutralizado por el guard.

### A-10 · Riesgos de permisos
- `loadPermsFromFirebase()` (lectura de nodo entero) no se toca en E1; sigue usando `getAuthToken` post-login.
  Bajo reglas actuales funciona con cualquier token. El escopado a `permisos/{code}` es de E3, no de E1.

### ¿Estamos subestimando alguna dependencia oculta?
**Sí, una: A-1 (regresión pre-login del login legacy).** El diseño conceptual previo (solo `isAvailable`)
la subestimaba. El resto de dependencias (P4, permisos, profileData, listeners) están correctamente
acotadas y no requieren cambios adicionales en E1. Con el guard `currentUser`, A-1 y A-2 quedan cerrados.

---

# RESUMEN EJECUTIVO
E1 es minúsculo (~10-12 líneas, 2 funciones + 1 include) y de muy bajo riesgo **con el refinamiento**.
La auditoría detectó un riesgo oculto real (**A-1**): el embudo solo-`isAvailable()` se activa pre-login y
ante sesiones Auth residuales, pudiendo **degradar el login legacy** de usuarios no-ESH (vía
`loadUsersFromFirebase → DEFAULT_USERS`). La corrección es un **guard de coincidencia `currentUser`** en
`getAuthToken()` (§7.2), que además alinea token e identidad de datos y es forward-compatible con E2.

# RECOMENDACIÓN FINAL

## ⚠️ REFINAR E1 ANTES DE IMPLEMENTAR

Adoptar la versión **§7.2 (con guard `currentUser`)** como diseño definitivo de E1, en lugar de la
§7.1 (solo `isAvailable`). El refinamiento es de 2 líneas adicionales y neutraliza el hallazgo A-1.
Con ese guard incorporado, E1 pasa a **riesgo MUY BAJO** y queda **listo para implementar**.

Pruebas innegociables antes de cerrar E1: **§13.6 y §14** (anti-regresión T1: `loadUsersFromFirebase`
no debe degradarse por una sesión Auth residual).

**FIN DE LA ESPECIFICACIÓN E1 — No implementar hasta autorización explícita sobre la versión §7.2.**
