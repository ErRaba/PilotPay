# FASE 1.25 — COMMIT E2: ESPECIFICACIÓN TÉCNICA EJECUTABLE

**Fecha:** 2026-06-12
**Commit:** E2 (segundo de E1-E4). E1 = `30602f6` (commiteado). Diseño D8 = `74650fa`.
**Estado:** 🟡 **ESPECIFICACIÓN — NO implementar. Sin cambios de código/reglas/Firebase.**
**Recomendación (ver §final):** **REFINAR E2 ANTES DE IMPLEMENTAR** — incorporar guard D-5 (`USERS[u]` presente).

---

## 1. OBJETIVO EXACTO DE E2
Convertir `doLogin()` en doble login: **Auth primario** para usuarios migrados, **legacy fallback**
intacto. Y añadir `PilotPayAuth.signOut()` a `doLogout()`. Activa el embudo E1 (`getAuthToken`) para
sesiones Auth. **Sin tocar reglas, `pass`, Anonymous, P4 ni la UX visual.** `currentUser` sigue siendo el código.

## 2. DECISIÓN FINAL SOBRE D-1..D-4 (+ D-5 nueva)
| Dec | Contenido | Estado |
|---|---|---|
| **D-1** | `signOut()` en éxito legacy → modo anónimo puro | ✅ ACEPTADA |
| **D-2** | Honrar `USERS[u].bloqueado`/`temporal` en ambas rutas | ✅ ACEPTADA |
| **D-3** | Exigir `session.code === u`; si no → `signOut()` + no-auth | ✅ ACEPTADA |
| **D-4** | No cambiar la carga anónima de `USERS` pre-login | ✅ ACEPTADA |
| **D-5** | **NUEVA (de la auditoría):** exigir que `USERS[u]` exista antes de entrar; si Auth autentica un code sin entrada en `USERS` → `signOut()` + error (no entrar) | ⚠️ **REQUERIDA** |

**Motivo de D-5:** `showWelcome()` y `profileData` dependen de `USERS[u]` (ver Auditoría A2-1).

## 3. INVENTARIO EXACTO DE LÍNEAS ACTUALES

### 3.1 `doLogin()` (`index.html` 7595-7660+)
Ver D8 §1. Estructura: leer inputs (7596-7597) → btn (7602-7603) → cargar `USERS` (7606) →
**validación legacy `USERS[u] && USERS[u].pass===p`** (7611) → bloqueado (7613-7620) → temporal
(7623-7636) → `currentUser=u`, `profileData={...USERS[u]}` (7637-7638) → `loadUserData` (7641) →
normalización (7644-7652) → `loadPermsFromFirebase` (7653) → `flushOfflineQueue` (7655) →
`showWelcome()` (7658) → else "Credenciales incorrectas" (7659+).

### 3.2 `doLogout()` (`index.html` 7800-7844)
- 7803-7808: limpia memoria (`nomDataCached`, `calcResult`, `simHistoricoData`, `varsData`, `PilotPayStore.clear()`).
- 7811-7829: limpia DOM (calculadora, variables, comparativa, nómina).
- 7832-7833: `currentUser = null; profileData = {}`.
- 7836-7842: muestra login screen, limpia inputs.
- **NO** limpia `pilotpay_auth_session` (← E2 añade `signOut()`).

### 3.3 `showWelcome()` (`index.html` 10642+)
- 10647: **`const u = USERS[currentUser];`** ← dependencia dura.
- 10649-10656: usa `u.funcion`, `u.nivel`, `u.alias`, `u.name`, `u.base` (con fallback a `profileData`, pero `u.*` se accede directamente en varias).
- **Si `u` es `undefined` → TypeError** (A2-1).

## 4. PUNTOS EXACTOS DE INSERCIÓN/MODIFICACIÓN
| # | Ubicación | Acción |
|---|---|---|
| (a) | `doLogin()` 7611-7659 | Reemplazar el bloque `if (USERS[u] && pass===p){...} else {...}` por el flujo de doble login (§5) |
| (b) | `doLogout()` ~7833 | Añadir `if (typeof PilotPayAuth!=='undefined') PilotPayAuth.signOut();` |

**No se tocan:** `showWelcome()`, `loadUserData`, `loadPermsFromFirebase`, `PilotPayStore`, `setFirebaseSink`,
formulario, UX. Solo `doLogin()` y `doLogout()`.

## 5. PSEUDODIFF DETALLADO

### (b) `doLogout()` — añadir signOut
```diff
   // 3) Identidad
+  if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();  // E2: limpiar sesión Auth
   currentUser = null;
   profileData = {};
```

### (a) `doLogin()` — doble login (reemplaza 7611-fin)
```diff
-  if (USERS[u] && USERS[u].pass === p) {
-    if (USERS[u].bloqueado) { ...error...; return; }
-    if (USERS[u].temporal && ...) { ...error...; return; }
-    currentUser = u;
-    profileData = { ...USERS[u] };
-    ...loadUserData / normalizar / loadPerms / flush...
-    showWelcome();
-  } else {
-    ...Credenciales incorrectas...
-  }
+  // 1) Intento Auth (primario)
+  let authedVia = null;
+  if (typeof PilotPayAuth !== 'undefined') {
+    try {
+      const session = await PilotPayAuth.signIn(u, p);
+      if (session && session.code === u) authedVia = 'auth';
+      else PilotPayAuth.signOut();                          // D-3 mismatch
+    } catch (e) { authedVia = null; }                       // Auth no aplica → legacy
+  }
+  // 2) Fallback legacy (idéntico a hoy)
+  if (!authedVia && USERS[u] && USERS[u].pass === p) {
+    if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();  // D-1 modo anónimo puro
+    authedVia = 'legacy';
+  }
+  // 3) Sin autenticación válida
+  if (!authedVia) { /*fail*/ errEl... 'Credenciales incorrectas'; shake; clear pass; return; }
+  // 3b) D-5: el perfil/welcome dependen de USERS[u]; si no existe, no entrar
+  if (!USERS[u]) {
+    if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();
+    /*fail*/ 'No se pudo cargar tu perfil. Reintenta con conexión.'; return;
+  }
+  // 4) Controles admin legacy — en AMBAS rutas (D-2)
+  if (USERS[u].bloqueado) { PilotPayAuth?.signOut?.(); /*fail*/ 'Usuario bloqueado...'; return; }
+  if (USERS[u].temporal && USERS[u].accessExpiresAt) {
+    const today = ...; if (today > USERS[u].accessExpiresAt) {
+      try { await fbUpdate(`pilotpay/usuarios/${u}`,{bloqueado:true}); USERS[u].bloqueado=true; } catch(e){}
+      PilotPayAuth?.signOut?.(); /*fail*/ '⏰ Acceso temporal caducado...'; return;
+    }
+  }
+  // 5) Establecer sesión (idéntico a hoy)
+  currentUser = u;
+  profileData = { ...USERS[u] };
+  btn.textContent='Cargando perfil...'; btn.disabled=true;
+  await loadUserData(u);
+  if (typeof UserProfile!=='undefined') profileData = UserProfile.normalizeProfile(profileData);
+  if (typeof FinancialProfile!=='undefined') FinancialProfile.normalize(profileData);
+  if (typeof FiscalHistory!=='undefined') { const _h=!!profileData.simHistorico;
+    FiscalHistory.migrateFromLegacy(profileData); if(_h&&currentUser) saveUserData(currentUser); }
+  await loadPermsFromFirebase();
+  if (_online) await flushOfflineQueue();
+  btn.textContent='Entrar'; btn.disabled=false;
+  showWelcome();
```
(Se extrae un helper `fail(msg)` para los 4 puntos de error, reduciendo duplicación.)

## 6. NUEVO FLUJO COMPLETO DE doLogin()
| Caso | Camino | currentUser | Token | Entra |
|---|---|---|---|---|
| **Auth OK** (pass Auth, code coincide, USERS[u] existe) | Auth | code | Auth | Sí |
| **Auth incorrecto** (pass Auth mala) | → legacy | — | — | según legacy |
| **Auth no disponible** (sin módulo/sin red) | → legacy | — | — | según legacy |
| **Legacy OK** (`USERS[u].pass===p`) | legacy (signOut Auth) | code | anónimo | Sí |
| **Legacy incorrecto** | — | — | — | No (error) |
| **No migrado** (sin cuenta Auth, con pass legacy) | → legacy | code | anónimo | Sí |
| **Bloqueado/temporal** | cualquiera → check D-2 | — | — | No (error + signOut) |
| **Sin red** | Auth lanza → legacy con USERS cacheado | code | anónimo | si pass legacy OK |
| **Auth OK pero USERS[u] ausente** (D-5) | rechazado | — | — | No (signOut + error) |

## 7. NUEVO FLUJO DE doLogout()
Añade `PilotPayAuth.signOut()` antes de `currentUser=null`. Resto idéntico (limpieza memoria/DOM, login screen).
Resultado: ni sesión Auth ni estado legacy quedan colgados.

## 8. CÓMO SE EVITA SESIÓN AUTH RESIDUAL
- Éxito legacy → `signOut()` (D-1). Mismatch `code` → `signOut()` (D-3). Bloqueado/temporal/D-5 → `signOut()`.
- Logout → `signOut()`. El embudo E1 además solo usa la sesión si `getSession().code===currentUser`.

## 9. CÓMO SE EVITA MISMATCH currentUser vs claim code
- Tras `signIn`, se exige `session.code === u`. Si no, `signOut()` y se trata como no-auth (D-3).
- `currentUser` se fija a `u` (= `session.code` cuando Auth) → coincide con el claim → embudo coherente.

## 10. CÓMO SE CONSERVA EL FALLBACK LEGACY
- El bloque legacy `USERS[u] && USERS[u].pass === p` se mantiene **idéntico**; solo se ejecuta si Auth no aplicó.
- `USERS` se carga anónimo pre-login sin cambios (D-4). `pass` en RTDB intacto.

## 11. CÓMO SE CONSERVA currentUser = code
- En ambas rutas `currentUser = u` (código tecleado, mayúsculas). Nunca el uid. Todas las claves/paths por código.

## 12. CÓMO SE PRESERVAN PERFIL, PERMISOS, HISTÓRICO Y P4
- `profileData = {...USERS[u]}` + `loadUserData(u)` (perfiles/{code}) — sin cambios.
- `loadPermsFromFirebase()` (nodo entero) — sin cambios (escopado es E3).
- `historicos/{code}` y P4 — el sink usa el embudo; token Auth (Auth) o anónimo (legacy), ambos válidos.
- `PilotPayStore.init(currentUser)` en `initApp` — por código, sin cambios.

## 13. RIESGOS OCULTOS BUSCADOS EXPLÍCITAMENTE
| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| H1 | `showWelcome()` crashea si `USERS[u]` ausente (Auth desacopla de USERS) | **Alta** | **D-5** (guard USERS[u]) |
| H2 | `doLogout` no limpiaba `pilotpay_auth_session` | Media | E2 añade `signOut()` |
| H3 | Sesión Auth residual usada con currentUser distinto | Media | Guard E1 + signOut (D-1/D-3) |
| H4 | Migrado con pass legacy entra en modo anónimo | Baja | Esperado (coexistencia); desaparece en 1.4 |
| H5 | Multi-pestaña: signOut de una pestaña afecta a otra | Baja | Ambas caen a anónimo (datos por código); ver A2-7 |
| H6 | `DEFAULT_USERS` (solo ESH) + Auth de BZP → USERS[BZP] ausente → H1 | Media | D-5 lo bloquea con error claro |

## 14. DEPENDENCIAS CRUZADAS DEL MONOLITO
- `doLogin → showWelcome → USERS[currentUser]` (10647): **dura** (H1/D-5).
- `doLogin → loadUserData → USERS[user]` (merge base) y `perfiles/{code}`.
- `doLogin → loadPermsFromFirebase` (nodo `permisos` entero).
- `showWelcome → enterApp → initApp → PilotPayStore.init(currentUser)` + `PilotPayLocalDB.bootstrap` + `hydrateFromIDB`.
- `getAuthToken` (embudo E1) ← `currentUser` (global) + `PilotPayAuth.getSession()`.
- `setFirebaseSink` (DOMContentLoaded, una vez) usa `getAuthToken` → hereda embudo.

## 15. PRUEBAS OBLIGATORIAS EN LOCAL
ESH/BZP Auth OK; ESH/BZP legacy fallback (pass antigua); pass incorrecta; Auth caído (sin red);
no migrado simulado; bloqueado/temporal; **D-5: Auth OK con USERS[u] ausente → error, no crash**.

## 16. PRUEBAS DE REGRESIÓN
Login legacy ESH/BZP idéntico; `showWelcome` pinta bien en ambos modos; `currentUser`=código;
`profileData`/permisos/historicos por código; `doLogout` limpia memoria+DOM+sesión.

## 17. PRUEBAS DE P4/SYNC
Con P4 activo: PATCH/pull `historicos/{code}` HTTP 200 en modo Auth y en modo legacy/anónimo;
`P4Debug.inspectMonthly()` conteos coinciden; cola offline se vacía al reconectar.

## 18. PRUEBAS DE SESIONES CRUZADAS ESH/BZP
- ESH Auth → logout (`signOut`) → BZP Auth → sin restos de ESH; `currentUser=BZP`; sync BZP.
- Sembrar sesión Auth de un code y login legacy de otro → `signOut` limpia; modo anónimo; sin mismatch.
- Multi-pestaña: ESH Auth en pestaña A, BZP legacy en pestaña B → B hace `signOut` (limpia sesión compartida); A queda en anónimo (datos por ESH); sin corrupción (A2-7).

## 19. ROLLBACK EXACTO
`git revert <E2>` → `doLogin`/`doLogout` vuelven al estado E1 (solo legacy; embudo dormido).
Sin reglas/datos/producción. **Punto de no retorno: NINGUNO.**

## 20. CRITERIOS DE ÉXITO
1. ESH/BZP entran por Auth (pass Auth) → modo Auth, sync OK.
2. ESH/BZP entran por legacy (pass antigua) → modo anónimo, sync OK.
3. No migrado / Auth caído → legacy sin cambios.
4. Pass incorrecta → error; **Auth sin USERS[u] → error, sin crash (D-5)**.
5. `currentUser`=código; perfil/permisos/historicos por código.
6. `signOut` garantiza modo puro; logout limpia ambos.
7. Bloqueado/temporal honrados en ambas rutas. P4/sync OK. Producción intacta.

## 21. CRITERIOS DE BLOQUEO
- Cualquier usuario pierde acceso. `showWelcome` crashea. `currentUser` queda como uid.
- Sesión residual usada con currentUser distinto. Bloqueado/temporal dejan de aplicar. P4 roto.

---

# AUDITORÍA CRÍTICA DE E2

### A2-1 · `showWelcome()` depende de `USERS[currentUser]` (HALLAZGO PRINCIPAL)
`index.html:10647` `const u = USERS[currentUser]` y luego `u.funcion/u.nivel/u.alias/u.name/u.base`.
El login **Auth** autentica con `identitytoolkit` **independientemente de `USERS`**. Si `USERS[u]` no
existe (p. ej. `USERS` = `DEFAULT_USERS` por fallback offline → solo ESH; o un futuro usuario en Auth aún
no propagado a `usuarios`), `u` es `undefined` → **`u.funcion` lanza → welcome crashea tras un login "exitoso"**.
El legacy de hoy nunca llega sin `USERS[u]` (su validación lo exige). **Mitigación: D-5** (no entrar si `!USERS[u]`).

### A2-2 · `profileData` base
`profileData = {...USERS[u]}`. Sin `USERS[u]` → base vacía; `loadUserData` la complementa con `perfiles/{code}`,
pero `showWelcome` ya habría fallado antes (A2-1). D-5 cubre ambos.

### A2-3 · `loadPermsFromFirebase()`
No se toca en E2. Lee nodo `permisos` entero con `getAuthToken` post-login (token Auth o anónimo). Bajo
reglas actuales funciona con cualquiera. Escopado = E3.

### A2-4 · `PilotPayStore.init()` / `hydrateFromIDB()` / `setFirebaseSink()`
- `init(currentUser)` (initApp, post-welcome): por código; sin cambios; carga desde localStorage.
- `hydrateFromIDB`: desde IDB; sin cambios.
- `setFirebaseSink`: una vez en `DOMContentLoaded`; usa el embudo (token según modo). E2 no lo toca.
→ Ninguno se ve afectado salvo por el token (ya validado en E1/P4).

### A2-5 · `currentUser`
Se fija a `u` en ambas rutas. El embudo E1 exige `getSession().code===currentUser`. Coherente.

### A2-6 · `USERS` / `DEFAULT_USERS`
`DEFAULT_USERS` solo tiene ESH. En fallback offline (`_USERS_FROM_FALLBACK`), `USERS` = {ESH}. Un login
**Auth de BZP** en ese estado autenticaría (Auth no depende de USERS) pero `USERS[BZP]` ausente → A2-1.
**D-5 lo bloquea** con error claro en vez de crash. (El legacy de BZP en ese estado ya fallaría hoy.)

### A2-7 · `pilotpay_auth_session` y sesiones cruzadas / multi-pestaña
- `pilotpay_auth_session` es de **dispositivo** (compartida entre pestañas del mismo origen).
- No hay listener `'storage'` en `index.html` (verificado) → las pestañas no sincronizan login en vivo.
- Cruce: pestaña A (ESH Auth) + pestaña B hace login legacy de BZP → B ejecuta `signOut()` (D-1) que borra
  la sesión **compartida** → A pierde su sesión Auth; su embudo cae a **anónimo** (datos siguen por `currentUser=ESH`).
  **Severidad baja:** no hay corrupción (datos por código; token anónimo válido bajo reglas actuales), pero el
  modo de A cambia silenciosamente. Aceptable en 1.25; se endurecerá con reglas en 1.3 (donde anónimo dejará
  de escoparse). **A vigilar, no bloqueante.**

### A2-8 · `pilotpay_ck_ctx` / `pilotpay_ck_consultas`
Claves **globales** (no escopadas por código) del módulo de consultas de Biblioteca Normativa (18278-18279).
`doLogout()` **no las limpia** → persisten entre usuarios del mismo dispositivo. **Pre-existente, NO de E2**
(E2 no las toca). Se anota como deuda de privacidad menor a revisar fuera de la migración Auth (no bloquea E2).

### A2-9 · Caché / PWA
`index.html` viejo (sin doble login) → solo legacy (hoy). Cache-busting `?v=` al publicar. Sin riesgo nuevo.

### ¿Subestimamos alguna dependencia oculta?
**Sí: A2-1 (`showWelcome` ⇒ `USERS[currentUser]`).** El diseño D8 honraba `bloqueado`/`temporal` con
`if (USERS[u] && ...)` pero **no exigía** `USERS[u]` para entrar — y `showWelcome`/`profileData` sí lo
necesitan. El camino Auth, al desacoplar autenticación de `USERS`, abre la puerta al crash. **D-5 lo cierra.**
El resto (perm, store, init, sink, ck_ctx, multi-tab) está acotado: nada más requiere cambios en E2.

---

# RESUMEN EJECUTIVO
E2 conecta el doble login con cambios acotados a `doLogin()` y `doLogout()` (~40-50 líneas netas, helper
`fail()` incluido). La auditoría detectó un **riesgo oculto real (A2-1)**: `showWelcome()` y `profileData`
dependen de `USERS[currentUser]`, y el camino Auth puede autenticar un código sin entrada en `USERS`
(p. ej. fallback `DEFAULT_USERS`), provocando un **crash tras un login aparentemente exitoso**. La corrección
es **D-5**: exigir `USERS[u]` antes de entrar (signOut + error claro si falta). Con D-1..D-5, E2 queda
coherente y de riesgo MEDIO-BAJO.

# RECOMENDACIÓN FINAL

## ⚠️ REFINAR E2 ANTES DE IMPLEMENTAR
Adoptar **D-5** (guard `USERS[u]`) además de D-1..D-4 antes de tocar `doLogin()`. Es la lección de la
auditoría (análoga a A-1 en E1). Con D-5 incorporada, **E2 pasa a riesgo MEDIO-BAJO y queda listo para
implementar**. Pruebas innegociables: §15 (incl. el caso D-5: Auth OK con `USERS[u]` ausente → error, no crash)
y §18 (sesiones cruzadas). El rediseño visual ("UX Login 2.0 / Welcome 2.0") sigue siendo deuda aparte.

**FIN DE LA ESPECIFICACIÓN E2 — No implementar hasta autorización explícita sobre la versión con D-5.**
