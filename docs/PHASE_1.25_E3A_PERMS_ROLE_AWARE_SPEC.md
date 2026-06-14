# FASE 1.25 — COMMIT E3a: ESPECIFICACIÓN — PERMISOS ROLE-AWARE + LIMPIEZA DE CACHÉ

**Fecha:** 2026-06-13
**Commit:** E3a (segunda mitad de E3). E3b `05c8a04` hecho. Diseño D11 `3543dc5`. Auditoría caché D13 `68aef2a` (P3 = Opción A).
**Estado:** 🟡 **ESPECIFICACIÓN — NO implementar. Sin cambios de código/reglas/Firebase.**
**Recomendación (ver §17):** **IMPLEMENTAR E3a** (un commit, 2 funciones en `index.html`).

---

## 1. INVENTARIO `loadPermsFromFirebase()` (`index.html` 7464-7481)
```js
async function loadPermsFromFirebase() {
  if (_online) {
    try {
      const fbPerms = await fbGet('pilotpay/permisos');   // NODO ENTERO (todos)
      if (fbPerms) { perms = fbPerms; localStorage.setItem('pilotpay_perms_cache', JSON.stringify(perms)); return; }
    } catch(e) {}
  }
  const local = localStorage.getItem('pilotpay_perms_cache') || localStorage.getItem('pilotpay_admin_perms');
  if (local) perms = JSON.parse(local);
}
```
Llamada: `doLogin()` (paso 5, tras fijar `currentUser`). No hay otras call-sites (el handler `online` recarga `USERS`, no perms). → `currentUser` siempre está definido cuando corre.

## 2. INVENTARIO `savePermsToFirebase()` (`index.html` 7483-7491)
```js
async function savePermsToFirebase() {
  if (!isAdmin()) return;                                  // ← guard admin
  localStorage.setItem('pilotpay_perms_cache', JSON.stringify(perms));
  if (_online) { try { await fbUpdate('pilotpay/permisos', perms); return; } catch(e){} }  // PATCH nodo entero
  _enqueue('pilotpay/permisos', perms);
}
```
**Solo admin.** Escribe el nodo entero. **E3a NO lo toca.**

## 3. INVENTARIO `getUserPerms()` (`index.html` 8067-8074)
```js
function getUserPerms(userCode) {
  const u = USERS[userCode];
  if (!u) return { funciones: [], bases: [] };
  return perms[userCode] || { funciones: [u.funcion], bases: [u.base] };  // ← fallback a USERS[u]
}
```
**Clave:** si `perms[userCode]` falta → fallback a `USERS[u].funcion/base`. Esto **garantiza que un usuario nunca pierde acceso** aunque `perms` esté escopado/ausente.

## 4. PANEL ADMIN QUE CONSUME `perms[code]`
- `togglePerm(userCode, type, val, checked)` (`index.html` 8952): edita `perms[userCode]` de **cualquier** usuario; guard `isAdmin()` (8953); crea desde `USERS[u]` si falta (8956). **Requiere nodo entero** (admin edita a otros).
- `atomicRoleChange()` (`js/userAdmin.js` 143-163): admin; escribe `usuarios/perfiles/permisos/{code}`, actualiza `window.perms[code]` y reescribe `pilotpay_perms_cache = window.perms` (entero).
- `perms[code]` en `index.html:10263` (render salario por code): admin renderiza a otros (tiene entero); user → su propio code (presente).
**Todas las rutas admin son `isAdmin()`-guarded y operan sobre el nodo entero en contexto admin → E3a no las afecta** (admin sigue leyendo entero).

## 5. INVENTARIO DE CACHÉS
| Clave | Escritura | Lectura | Escopada | Contenido |
|---|---|---|---|---|
| `pilotpay_perms_cache` | `loadPerms` 7470, `savePerms` 7485, `atomicRoleChange` userAdmin.js:163 | `loadPerms` fallback 7477 | **GLOBAL** | Hoy nodo entero; tras E3a: entero (admin) / escopado (user) |
| `pilotpay_admin_perms` | (legacy, no se escribe ya) | `loadPerms` fallback 7478 | GLOBAL | Legacy |
`doLogout` **no limpia** ninguna hoy (P3 lo corrige).

## 6. DISEÑO ROLE-AWARE
| Ruta | Lectura | Caché escrita |
|---|---|---|
| **Admin** (`isAdmin()`) | `fbGet('pilotpay/permisos')` (entero) | `pilotpay_perms_cache` = entero |
| **User** (`currentUser`, no-admin) | `fbGet('pilotpay/permisos/'+currentUser)` (scoped) | `pilotpay_perms_cache` = `{ [currentUser]: mine }` |
| **Fallback offline** | `pilotpay_perms_cache` → `pilotpay_admin_perms` | — |
| **Usuario sin permisos** (`permisos/{code}` ausente) | `perms = {}` → `getUserPerms` cae a `USERS[u].funcion/base` | `{}` |
| **Legacy / Auth** | Idéntico: usa `getAuthToken` (embudo); token Auth o anónimo, ambos válidos bajo reglas actuales | — |

`doLogout()`: limpia `pilotpay_perms_cache` **y** `pilotpay_admin_perms` (P3 / Opción A).

## 7. PSEUDODIFF DETALLADO

### (a) `loadPermsFromFirebase()` — role-aware
```diff
 async function loadPermsFromFirebase() {
   if (_online) {
     try {
-      const fbPerms = await fbGet('pilotpay/permisos');
-      if (fbPerms) { perms = fbPerms; localStorage.setItem('pilotpay_perms_cache', JSON.stringify(perms)); return; }
+      if (isAdmin()) {
+        const fbPerms = await fbGet('pilotpay/permisos');                 // entero (admin)
+        if (fbPerms) { perms = fbPerms; localStorage.setItem('pilotpay_perms_cache', JSON.stringify(perms)); return; }
+      } else if (currentUser) {
+        const mine = await fbGet('pilotpay/permisos/' + currentUser);     // scoped (user)
+        perms = mine ? { [currentUser]: mine } : {};
+        try { localStorage.setItem('pilotpay_perms_cache', JSON.stringify(perms)); } catch(e) {}
+        return;
+      }
     } catch(e) {}
   }
   // Fallback local (sin cambios)
   const local = localStorage.getItem('pilotpay_perms_cache') || localStorage.getItem('pilotpay_admin_perms');
   if (local) perms = JSON.parse(local);
 }
```

### (b) `doLogout()` — limpieza de caché (P3, junto al signOut de E2)
```diff
     // 3) Identidad
     if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();      // E2
+    try { localStorage.removeItem('pilotpay_perms_cache'); } catch(e) {}  // E3a / P3
+    try { localStorage.removeItem('pilotpay_admin_perms'); } catch(e) {}  // E3a / P3
     currentUser = null;
     profileData = {};
```

## 8. DECISIÓN P3 INCORPORADA
- **Limpiar ambas cachés en `doLogout()`** (`pilotpay_perms_cache` + `pilotpay_admin_perms`). Neutraliza el riesgo de que un user (scoped) deje caché y un admin offline lea un panel incompleto (auditoría D13, punto 10).
- **Por qué NO se escopa la clave todavía** (`pilotpay_perms_cache_{code}`, Opción B): más superficie (3 sitios de escritura, incluido `userAdmin.js` que E3a **no debe tocar**) y el escenario que cubre (admin offline-tras-logout conservando su caché) es un edge aceptado. Opción A resuelve el riesgo con ~2 líneas sin tocar `userAdmin.js`. B queda como mejora futura.

## 9. RIESGOS
| # | Riesgo | Sev | |
|---|---|---|---|
| R1 | Romper admin (panel incompleto) | Alta | Admin sigue leyendo nodo entero (role-aware); `togglePerm`/`savePerms`/`atomicRoleChange` intactos |
| R2 | User sin permisos | Baja | `getUserPerms` → fallback `USERS[u].funcion/base` |
| R3 | Caché stale | Baja | Online sobrescribe; offline es local-first aceptado; logout limpia |
| R4 | Offline | Media | Fallback a caché; user → su scoped o `USERS[u]`; admin-tras-logout necesita reconectar (edge aceptado P3) |
| R5 | Auth vs legacy | Baja | Idéntico (embudo); ambos tokens válidos hoy |
| R6 | Reglas futuras 1.3 | — | User scoped read alinea con `permisos/{code}`; admin requiere regla de parent para rol (diseño 1.3) |
| R7 | Panel admin incompleto offline | Media | P3/Opción A (logout limpia) evita leer caché escopada; admin recarga online |

## 10. MITIGACIONES
- R1 → role-aware (admin=entero) + guards `isAdmin()` intactos en todas las rutas de escritura.
- R2 → fallback `USERS[u]` en `getUserPerms` (8070).
- R3/R7 → limpieza en logout (P3) + online sobrescribe.
- R4 → fallback local; degradación grácil (user) / reconexión (admin, edge).
- R6 → E3a deja el cliente alineado; reglas se despliegan en 1.3.

## 11. PRUEBAS LOCALES
| # | Caso | Esperado |
|---|---|---|
| 1 | ESH admin Auth | Lee nodo entero; panel admin completo; togglePerm/atomicRoleChange OK |
| 2 | ESH admin legacy | Igual (token anónimo) |
| 3 | BZP user Auth | Lee solo `permisos/BZP`; `perms={BZP:...}`; bases/funciones correctas |
| 4 | BZP user legacy | Igual (anónimo) |
| 5 | Admin ve panel completo | Lista/edita permisos de todos los usuarios |
| 6 | User solo lee su permiso | DevTools Network: GET `permisos/BZP` (no `permisos` entero) |
| 7 | Offline con caché | Fallback a `pilotpay_perms_cache`; sin pérdida de módulos |
| 8 | Logout limpia caché | Tras logout: `localStorage.getItem('pilotpay_perms_cache')`===null y `pilotpay_admin_perms`===null |
| 9 | Sin permisos en Firebase | `getUserPerms(code)` → `USERS[code].funcion/base`; entra |

## 12. PRUEBAS DE NO REGRESIÓN
Dashboard, Variables, Auditoría, Convenio, Acuerdos, Biblioteca Normativa → visibles y operativos igual (no gateados por perms). Admin → panel completo. Cálculo respeta `funciones`/`bases` del usuario (sin cambios).

## 13. ROLLBACK EXACTO
`git revert <E3a>` → `loadPermsFromFirebase` lee nodo entero y `doLogout` no limpia caché (estado E3b/E2). Solo `index.html`. Sin reglas/datos/producción. **Punto de no retorno: NINGUNO.**

## 14. CRITERIOS DE ÉXITO
1. Admin (ESH) panel completo (lee/edita permisos de todos) en Auth y legacy.
2. User (BZP) lee solo lo suyo; bases/funciones/módulos correctos; sin pérdida.
3. Sin permisos → fallback `USERS[u]`; entra.
4. Offline → caché; sin regresión (user); admin reconecta (edge).
5. Logout limpia `pilotpay_perms_cache` + `pilotpay_admin_perms`.
6. No regresión de módulos. Reglas/Firebase/producción intactos.

## 15. CRITERIOS DE BLOQUEO
- Admin pierde panel completo o capacidad de editar permisos de otros.
- User pierde una base/función/módulo que tenía.
- `getUserPerms` devuelve vacío sin fallback.
- Logout no limpia las cachés.

---

## 16. AUDITORÍA CRÍTICA DE E3a

### A3-1 · `renderAdmin` / edición de permisos
El panel admin (`togglePerm` 8952) edita `perms[userCode]` de cualquier usuario; **requiere el nodo entero**.
E3a mantiene al admin leyendo el nodo entero → el panel **no se degrada**. Un user nunca llega a `togglePerm` (guard `isAdmin()`). ✅

### A3-2 · `atomicRoleChange` (`userAdmin.js`)
Admin-only; escribe `permisos/{code}` y reescribe `pilotpay_perms_cache = window.perms` (entero). **E3a NO toca `userAdmin.js`** (restricción). Como solo corre en contexto admin (window.perms entero), su caché-write sigue siendo del nodo entero → coherente con la rama admin de E3a. ✅ Sin conflicto.

### A3-3 · `savePermsToFirebase`
Guard `isAdmin()` (7484); un user scoped nunca lo llama → nunca sube su `perms` escopado al nodo. ✅ E3a no lo toca.

### A3-4 · `getUserPerms`
Fallback a `USERS[u].funcion/base` (8070) → un user sin `perms[code]` (scoped ausente) no pierde acceso. **Es la red de seguridad de R2.** ✅

### A3-5 · `profileData`
Independiente de `perms` (se carga de `perfiles/{code}` + `USERS`). E3a no lo toca. Sin impacto.

### A3-6 · `currentUser`
La rama scoped usa `currentUser` (`fbGet('pilotpay/permisos/'+currentUser)`). `loadPermsFromFirebase` corre en `doLogin` tras fijar `currentUser` → siempre definido. Guard `else if (currentUser)` cubre el caso null (→ fallback). `isAdmin()`=`currentUser===ADMIN_CODE`. ✅

### A3-7 · Caché global
Tras E3a, `pilotpay_perms_cache` puede contener entero (admin) o scoped (user) según quién entró. **El riesgo (admin offline leyendo scoped) se neutraliza con P3 (logout limpia).** Dentro de una sesión, online siempre sobrescribe. ✅

### A3-8 · Logout/login cruzado
Logout limpia ambas cachés (P3). Login del siguiente usuario: online → lee su rol-scoped fresco; offline → sin caché → user cae a `USERS[u]` (entra), admin necesita online. ✅ Sin contaminación cruzada.

### A3-9 · Multi-dispositivo
Cada dispositivo carga su caché rol-scoped local; Firebase es la fuente. Sin interferencia entre dispositivos. ✅

### A3-10 · Reglas futuras (1.3)
- User lee `permisos/{currentUser}` → futura regla `auth.token.code===code || admin` lo permite.
- Admin lee `permisos` (parent) → la regla 1.3 debe conceder lectura del parent al rol admin (`auth.token.role==='admin'`). **Punto a contemplar en el diseño de reglas de 1.3** (no en E3a). E3a deja el cliente alineado.

### ¿Riesgos ocultos?
**Ninguno bloqueante.** Las 3 rutas de escritura/edición admin están `isAdmin()`-guarded y operan sobre el nodo entero (admin lo sigue cargando). El fallback de `getUserPerms` evita pérdida de acceso. P3 (logout-clear) neutraliza la contaminación de caché. El único apunte para el futuro: la regla de 1.3 debe permitir al admin leer el parent `permisos` (A3-10) — responsabilidad del diseño de reglas, no de E3a.

---

## 17. RECOMENDACIÓN FINAL

## ✅ IMPLEMENTAR E3a (un commit)
Dos cambios pequeños y relacionados en `index.html`: `loadPermsFromFirebase` (role-aware) + `doLogout` (limpieza P3). Riesgo MEDIO-BAJO: el admin sigue leyendo el nodo entero (panel intacto), el user no pierde acceso (fallback `USERS[u]`), y la limpieza en logout neutraliza la contaminación de caché. Reversible, sin reglas, sin tocar `userAdmin.js`.

**No dividir:** los dos cambios son interdependientes (el escopado introduce el riesgo de caché que la limpieza cierra) → deben ir juntos para no dejar un estado intermedio con el riesgo abierto.

**Pruebas innegociables antes del commit:** §11 (esp. #5 admin panel completo, #6 user lee solo lo suyo, #8 logout limpia caché, #9 sin permisos → fallback) y §12 (no regresión de módulos).

**Nota para 1.3:** la regla `permisos` deberá conceder lectura del parent al rol admin (A3-10).

**FIN DE LA ESPECIFICACIÓN E3a — No implementar hasta autorización explícita.**
