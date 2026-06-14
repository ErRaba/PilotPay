# FASE 1.25 — E3a: AUDITORÍA DE `pilotpay_perms_cache` (decisión P3)

**Fecha:** 2026-06-13
**Objetivo:** cerrar la decisión P3 (¿limpiar/escopar la caché de permisos?) antes de tocar `loadPermsFromFirebase()` en E3a.
**Estado:** 🟡 AUDITORÍA — NO implementar. Sin cambios de código/reglas/Firebase.

---

## 1. DÓNDE SE ESCRIBE
| Sitio | Contexto | Qué escribe |
|---|---|---|
| `index.html:7470` | `loadPermsFromFirebase()` tras leer online | `perms` = **nodo entero** `pilotpay/permisos` |
| `index.html:7485` | `savePermsToFirebase()` (guard `isAdmin()`) | `perms` (nodo entero, admin) |
| `js/userAdmin.js:163` | `atomicRoleChange()` (admin) | `window.perms` (nodo entero) |

## 2. DÓNDE SE LEE
| Sitio | Contexto |
|---|---|
| `index.html:7477-7478` | Fallback **offline** de `loadPermsFromFirebase()`: `pilotpay_perms_cache` → si no, `pilotpay_admin_perms` (legacy) |

Único consumidor de lectura: el fallback offline. Online siempre se sobrescribe desde Firebase.

## 3. QUÉ ESTRUCTURA GUARDA
**Hoy:** el **nodo entero** `{ [code]: { funciones:[...], bases:[...] } }` (todos los usuarios), porque las 3 escrituras vuelcan `perms`/`window.perms` completo.
**Tras E3a (propuesto):** para un **usuario no-admin**, `loadPermsFromFirebase` pasaría a `perms = { [currentUser]: {...} }` → la caché guardaría **solo lo de ese usuario**. Para **admin**, seguiría siendo el nodo entero.

## 4. ¿ESCOPADA POR USUARIO O GLOBAL?
**Clave GLOBAL:** `pilotpay_perms_cache` (sin `{userId}`). Hoy su contenido es el nodo entero (todos). → Una sola clave global que hoy contiene los permisos de todos los usuarios.

## 5. QUÉ OCURRE AL HACER LOGOUT
`doLogout()` (index.html 7800-7844) limpia memoria, DOM, `currentUser`, `profileData`, pero **NO** elimina `pilotpay_perms_cache` ni `pilotpay_admin_perms`. → **La caché persiste tras logout.**

## 6. LOGIN CON OTRO USUARIO EN EL MISMO NAVEGADOR
- **Online:** `loadPermsFromFirebase` **sobrescribe** la caché desde Firebase. Hoy (nodo entero) el nuevo usuario obtiene todo → correcto. Tras E3a, un usuario obtiene solo lo suyo → caché = `{nuevoUser}`.
- **Offline:** se usa la caché previa. Hoy (nodo entero) `getUserPerms(nuevoUser)` encuentra `perms[nuevoUser]` en el nodo cacheado → **funciona**. Tras E3a (caché escopada del usuario anterior) `perms[nuevoUser]` sería `undefined` → **fallback a `USERS[nuevoUser].funcion/base`** (getUserPerms 8070).

## 7. QUÉ OCURRE OFFLINE
`loadPermsFromFirebase` cae a `pilotpay_perms_cache`. Si la caché es de otro usuario/rol, se lee esa. `getUserPerms` mitiga con fallback a `USERS[u]` si falta `perms[u]`.

## 8. SI EL USUARIO CAMBIA DE PERMISOS EN FIREBASE
El cambio se refleja en el **siguiente** `loadPermsFromFirebase` online (sobrescribe caché). Offline, la caché queda **stale** hasta la próxima conexión. (Comportamiento aceptable: local-first.)

## 9. RIESGO DE MEZCLA ESH/BZP
- **Hoy:** la caché global contiene `{ESH, BZP}`; `getUserPerms` elige el correcto → sin "mezcla" funcional. Matiz de **privacidad**: el localStorage de un dispositivo contiene los permisos de **todos** los usuarios (no solo el activo).
- **Tras E3a:** un usuario solo cachea lo suyo → **mejora la privacidad**. Pero la clave global puede contener, según quién entró último, datos **escopados (un user)** o **enteros (admin)** → inconsistencia entre roles offline.

## 10. RIESGO ADMIN/USER
**El riesgo principal que E3a introduce.** Si un **usuario** (scoped) escribe la caché y luego el **admin entra OFFLINE**, `loadPermsFromFirebase` leería la caché escopada `{user}` → el panel admin vería **solo ese usuario** (incompleto). Hoy no pasa porque la caché es siempre el nodo entero.

## 11. RIESGO CON AUTH vs LEGACY
**Ninguno específico.** La caché es independiente del modo de sesión: online usa `getAuthToken` (Auth o anónimo, ambos válidos), offline usa la caché. El contenido depende del **rol** (admin entero / user escopado tras E3a), no de Auth/legacy.

## 12. RELACIÓN CON E3a ROLE-AWARE
E3a cambia **qué** se cachea (admin=entero, user=escopado). Eso convierte la clave global en un contenedor de forma variable → introduce la inconsistencia del punto 10 (admin offline leyendo caché escopada). **E3a debe resolver la caché** para no degradar el panel admin offline ni dejar restos cruzados.

## 13. RELACIÓN CON REGLAS FUTURAS (FASE 1.3)
Bajo reglas por claim, un usuario solo podrá **leer** `permisos/{own}` en Firebase. La caché es **local** (no sujeta a reglas), pero mantener en el localStorage del usuario los permisos de **otros** (nodo entero) contradice el principio de aislamiento que persigue 1.3. **Escopar la caché del usuario a lo suyo alinea el cliente con 1.3.** (El admin, por diseño, sí maneja el conjunto.)

## 14. ¿LIMPIAR EN `doLogout()`: OBLIGATORIO / OPCIONAL / INNECESARIO?
**RECOMENDADO (no estrictamente obligatorio).**
- **No es estrictamente obligatorio** porque `getUserPerms` tiene fallback a `USERS[u]` → un usuario nunca pierde acceso por caché stale/ajena.
- **Pero es recomendado** porque, con E3a, limpiar evita: (a) que el admin lea offline una caché escopada de un user (panel incompleto, punto 10); (b) restos de permisos de otros usuarios en el dispositivo (privacidad). Coste: ~1-2 líneas.
- **Innecesario:** descartado — dejarlo como está mantiene el riesgo (10) y la inconsistencia que E3a introduce.

## 15. ALTERNATIVAS
| Opción | Efecto | Coste | Veredicto |
|---|---|---|---|
| **A) Limpiar en logout** (`pilotpay_perms_cache` + `pilotpay_admin_perms`) | Evita contaminación cruzada; tras logout, offline cae a `USERS` fallback (user OK) / admin necesita online | ~2 líneas en `doLogout` | ✅ **Recomendada** (minimal, correcta) |
| **B) Escopar la clave por usuario** (`pilotpay_perms_cache_{code}`) | Cada user/admin conserva su propia caché offline (incl. admin entero) sin contaminación | ~3 sitios (load/save/atomicRoleChange) | ⭐ Más robusta; más superficie. Opción futura si el offline-admin importa |
| **C) Validar timestamp/version** | Detecta caché stale | Complejidad alta; no resuelve cruce de usuario | ❌ Overkill ahora |
| **D) Mantener como está** | Caché global nodo-entero | 0 | ❌ Con E3a deja el riesgo (10) y desalinea con 1.3 |

## 16. RECOMENDACIÓN FINAL

**Para E3a: Opción A — limpiar `pilotpay_perms_cache` (y el legacy `pilotpay_admin_perms`) en `doLogout()`.**

Justificación:
- Es el cambio **mínimo y correcto** que neutraliza el único riesgo nuevo que E3a introduce (admin offline leyendo caché escopada de un user, punto 10).
- No causa pérdida de acceso: tras logout + login offline, `getUserPerms` cae a `USERS[u].funcion/base` (su propia función/base) → el usuario opera. El admin offline-tras-logout necesitaría reconectar para el panel completo — **edge aceptable** (editar permisos offline es raro y arriesgado).
- Mejora privacidad (no deja permisos de otros usuarios tras cerrar sesión) y **alinea con 1.3** (el cliente del usuario no retiene datos ajenos).
- Coste ~2 líneas, reversible, sin tocar reglas/Firebase.

**Opción B (escopar la clave)** queda como mejora futura **si** el escenario admin-offline llega a importar; aporta robustez a cambio de más superficie. No necesaria para cerrar E3a.

**Decisión P3 propuesta:** E3a incluirá, además del escopado role-aware de `loadPermsFromFirebase`, **una limpieza de `pilotpay_perms_cache` + `pilotpay_admin_perms` en `doLogout()`** (Opción A). Esto amplía el alcance de E3a a **dos funciones** (`loadPermsFromFirebase` y `doLogout`), ambas en `index.html`.

> Nota: esto hace que E3a toque `doLogout()` (ya tocado en E2 para `signOut`). Es coherente — el logout es el punto natural de limpieza de sesión. Se documentará en la spec ejecutable de E3a.

**FIN DE LA AUDITORÍA — decisión P3 pendiente de tu confirmación.**
