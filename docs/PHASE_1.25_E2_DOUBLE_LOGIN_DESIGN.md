# FASE 1.25 — COMMIT E2: DISEÑO DE DOBLE LOGIN

**Fecha:** 2026-06-12
**Commit:** E2 (segundo de E1-E4 del plan 1.25). E1 = `30602f6` (commiteado, validado).
**Estado:** 🟡 **DISEÑO — NO implementar. Sin cambios de código/reglas/Firebase.**
**Recomendación (ver §13):** IMPLEMENTAR E2, previa confirmación de 4 decisiones de diseño.

---

## 0. RELACIÓN CON E1

E1 dejó el embudo `getAuthToken()` con guard `currentUser` (dormido: sin sesión Auth → anónimo).
E2 **activa** ese embudo conectando el login real: `doLogin()` intentará Auth primero y, al tener éxito,
establecerá `currentUser = code` con una sesión Auth → el embudo pasa a usar el token Auth. **Sin tocar reglas.**

---

## 1. INVENTARIO EXACTO DE doLogin() ACTUAL (`index.html` 7595-7659)

| Paso | Línea | Qué hace |
|---|---|---|
| Lectura inputs | 7596-7597 | `u = login-user.toUpperCase().trim()`, `p = login-pass.trim()` |
| Estado botón | 7602-7603 | "Verificando…", disabled |
| Carga USERS | 7606 | Si `USERS` vacío → `loadUsersFromFirebase()` (token anónimo, pre-login) |
| **Validación** | 7611 | `if (USERS[u] && USERS[u].pass === p)` — **texto plano, cliente** |
| Bloqueado | 7613-7620 | Si `USERS[u].bloqueado` → error, return |
| Temporal | 7623-7636 | Si `temporal && accessExpiresAt` caducado → `fbUpdate` set `bloqueado`, error, return |
| Identidad | 7637-7638 | `currentUser = u`; `profileData = { ...USERS[u] }` |
| Carga perfil | 7641 | `await loadUserData(u)` (lee `perfiles/{u}`) |
| Normalización | 7644-7652 | `UserProfile.normalizeProfile`, `FinancialProfile.normalize`, `FiscalHistory.migrateFromLegacy` (+`saveUserData` si había `simHistorico`) |
| Permisos | 7653 | `await loadPermsFromFirebase()` (nodo entero) |
| Cola offline | 7655 | `if (_online) await flushOfflineQueue()` |
| Bienvenida | 7658 | `showWelcome()` → `enterApp()` → `initApp()` → `PilotPayStore.init(currentUser)` |
| Error | 7659+ | else → "Credenciales incorrectas" + shake |

**Persistencias afectadas por un login:** `pilotpay_v2_{code}` (perfil, vía `loadUserData`/`saveUserData`),
`pilotpay_perms_cache` (permisos), `pilotpay:{code}:*` (al operar), y `pilotpay_auth_session` (nuevo, en E2 si Auth).

---

## 2. DISEÑO DEL NUEVO FLUJO E2

### 2.1 Intento Auth (primario)
Tras cargar `USERS`, antes de la validación legacy:
```
if PilotPayAuth disponible:
   try session = await PilotPayAuth.signIn(u, p)
        if session.code === u → authedVia = 'auth'
        else                  → PilotPayAuth.signOut(); (mismatch defensivo)
   catch → authedVia = null   (cuenta inexistente / pass Auth incorrecta / sin red)
```

### 2.2 Cuándo se intenta Auth
Siempre que `PilotPayAuth` esté disponible. `signIn` usa su propio fetch a `identitytoolkit`
(independiente de `getAuthToken`), así que no interfiere con la carga anónima de `USERS`.

### 2.3 Cuándo se cae a legacy
Si Auth no aplica (`authedVia` null): cuenta no migrada, contraseña Auth incorrecta, o sin red.
Entonces se evalúa **exactamente la validación de hoy**: `USERS[u] && USERS[u].pass === p`.

### 2.4 Cómo se evita la doble identidad
- En éxito Auth: `currentUser = u` y existe sesión Auth con `code = u` → el guard E1 (`getSession().code === currentUser`) cuadra → embudo usa token Auth.
- En éxito legacy: **`PilotPayAuth.signOut()`** para garantizar modo anónimo puro (sin sesión Auth residual que el embudo pudiera usar). → embudo usa anónimo.
- `currentUser` **siempre = código** (nunca el uid), tanto en Auth como en legacy.

### 2.5 Contraseña incorrecta
Auth lanza (pass Auth mala) → cae a legacy → `USERS[u].pass === p` falla → "Credenciales incorrectas".
Una contraseña que no es ni la Auth-nueva ni la legacy-antigua falla en ambos → error.

### 2.6 Usuario no migrado
`signIn` lanza (cuenta inexistente, error neutro por enumeration protection) → cae a legacy →
si `USERS[u].pass === p` → entra por legacy (token anónimo), **idéntico a hoy**.

### 2.7 Auth caído / sin red
`signIn` (fetch) lanza por red → `authedVia` null → cae a legacy → valida contra `USERS` (en memoria/caché)
→ entra por legacy si la pass legacy es correcta. **Sin bloqueo de acceso por caída de Auth.**

---

## 3. REGLAS DE PRIORIDAD

| Caso | Resultado |
|---|---|
| **Auth correcto** (pass Auth válida, code coincide) | Sesión Auth; `currentUser=code`; embudo → token Auth |
| **Auth incorrecto** (pass Auth mala) | `signIn` lanza → cae a legacy |
| **Auth no disponible** (módulo no cargó / sin red) | Cae a legacy |
| **Legacy correcto** (`USERS[u].pass===p`) | `signOut()` Auth; `currentUser=code`; embudo → anónimo |
| **Legacy incorrecto** | "Credenciales incorrectas" |

> Coexistencia: un usuario migrado puede entrar con su **pass Auth nueva** (→ modo Auth) **o** con su
> **pass legacy antigua** (→ modo legacy/anónimo), porque `pilotpay/usuarios/{code}/pass` sigue intacto
> hasta Fase 1.4. Comportamiento esperado durante 1.25-1.3.

---

## 4. ESTADOS GLOBALES

| Estado | En E2 |
|---|---|
| `currentUser` | = código (Auth: `session.code`; legacy: `u`). **Nunca uid** |
| `profileData` | `{ ...USERS[u] }` + `loadUserData(u)` (perfiles/{code}) — **igual que hoy** |
| `USERS` | Cargado pre-login (anónimo); base de `profileData` y de `bloqueado`/`temporal`. **Sin cambios** |
| `window.PilotPayAuth` | Auth: sesión activa (code=u). Legacy: `signOut()` → sin sesión |
| `localStorage`/session | `pilotpay_auth_session` presente solo en modo Auth; resto de claves por código sin cambios |

---

## 5. RIESGOS

| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| R1 | Bloquear el login legacy | Alta | Legacy se evalúa siempre que Auth no aplique; ruta legacy idéntica a hoy; pruebas §9 |
| R2 | Sesión Auth residual incorrecta | Media | `signOut()` en éxito legacy + mismatch; guard E1 ya exige `code===currentUser` |
| R3 | Mismatch `currentUser` vs claim `code` | Media | `signIn` retorna `code`; se exige `session.code === u`, si no → `signOut()` + no-auth |
| R4 | Caída a DEFAULT_USERS | Media | No se cambia la carga de `USERS` (sigue anónima pre-login); E1 ya protegió A-1 |
| R5 | Migrado con pass legacy | Baja | Entra por legacy (anónimo) — esperado en coexistencia; se documenta; desaparece en 1.4 |
| R6 | Usuario no migrado | Baja | Cae a legacy → entra como hoy |
| R7 | Offline / Auth caído | Media | `signIn` lanza → legacy con `USERS` cacheado; sin lockout |
| R8 | Caché PWA antigua | Baja | `index.html` viejo no tiene doble login → solo legacy (hoy); cache-busting `?v=` |
| R9 | Bloqueado/temporal omitidos en ruta Auth | Media | Aplicar `USERS[u].bloqueado`/`temporal` **en ambas rutas** antes de entrar (§7) |

---

## 6. MITIGACIONES (resumen de decisiones)
- **D-1:** `signOut()` en éxito legacy → modo anónimo puro (evita R2).
- **D-2:** Honrar `USERS[u].bloqueado`/`temporal` en **ambas** rutas (Auth y legacy) antes de entrar (evita R9).
- **D-3:** Exigir `session.code === u` tras `signIn`; si no, `signOut()` y tratar como no-auth (evita R3).
- **D-4:** Mantener la carga de `USERS` anónima pre-login sin cambios (mantiene A-1 neutralizado, evita R4).

---

## 7. PSEUDOCÓDIGO EXACTO DE doLogin() REFINADO (E2)

```js
async function doLogin() {
  const u = document.getElementById('login-user').value.trim().toUpperCase();
  const p = document.getElementById('login-pass').value.trim();
  const card = ..., errEl = ..., btn = ...;
  const fail = (msg) => { errEl.textContent = msg; errEl.style.display='block';
                          card.classList.add('login-shake');
                          setTimeout(()=>card.classList.remove('login-shake'),400);
                          document.getElementById('login-pass').value=''; };

  btn.textContent='Verificando...'; btn.disabled=true;
  if (Object.keys(USERS).length === 0) await loadUsersFromFirebase();   // anónimo, pre-login (sin cambios)
  btn.textContent='Entrar'; btn.disabled=false;

  // 1) Intento Auth (primario)
  let authedVia = null;
  if (typeof PilotPayAuth !== 'undefined') {
    try {
      const session = await PilotPayAuth.signIn(u, p);
      if (session && session.code === u) authedVia = 'auth';
      else PilotPayAuth.signOut();                 // D-3 mismatch defensivo
    } catch (e) { authedVia = null; }              // Auth no aplica → legacy
  }

  // 2) Fallback legacy (idéntico a hoy)
  if (!authedVia) {
    if (USERS[u] && USERS[u].pass === p) {
      if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();  // D-1 modo anónimo puro
      authedVia = 'legacy';
    }
  }

  // 3) Sin autenticación válida
  if (!authedVia) { fail('Credenciales incorrectas'); return; }

  // 4) Controles admin legacy — en AMBAS rutas (D-2)
  if (USERS[u] && USERS[u].bloqueado) {
    if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();
    fail('Usuario bloqueado por el administrador'); return;
  }
  if (USERS[u] && USERS[u].temporal && USERS[u].accessExpiresAt) {
    const now=new Date();
    const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if (today > USERS[u].accessExpiresAt) {
      try { await fbUpdate(`pilotpay/usuarios/${u}`, { bloqueado:true }); USERS[u].bloqueado=true; } catch(e){}
      if (typeof PilotPayAuth !== 'undefined') PilotPayAuth.signOut();
      fail('⏰ Acceso temporal caducado. Contacta con el administrador.'); return;
    }
  }

  // 5) Establecer sesión (idéntico a hoy)
  currentUser = u;
  profileData = { ...USERS[u] };
  btn.textContent='Cargando perfil...'; btn.disabled=true;
  await loadUserData(u);
  if (typeof UserProfile      !== 'undefined') profileData = UserProfile.normalizeProfile(profileData);
  if (typeof FinancialProfile !== 'undefined') FinancialProfile.normalize(profileData);
  if (typeof FiscalHistory    !== 'undefined') {
    const _hadSim = !!(profileData.simHistorico);
    FiscalHistory.migrateFromLegacy(profileData);
    if (_hadSim && currentUser) saveUserData(currentUser);
  }
  await loadPermsFromFirebase();
  if (_online) await flushOfflineQueue();
  btn.textContent='Entrar'; btn.disabled=false;
  showWelcome();
}
```
Además: **`doLogout()`** añade `if (typeof PilotPayAuth!=='undefined') PilotPayAuth.signOut();` a su limpieza.

---

## 8. QUÉ NO DEBE CAMBIAR
- `currentUser` = código (no uid); todas las rutas `perfiles/{code}`, `permisos`, `historicos/{code}`.
- `loadUserData`, normalización, `loadPermsFromFirebase` (nodo entero — su escopado es E3, no E2).
- Carga anónima de `USERS` pre-login.
- Reglas, `pass` en RTDB, Anonymous, P4, formulario de login, UX, welcome (texto/estilos).
- `pilotPayAuth.js` (se usa, no se modifica).

---

## 9. PLAN DE PRUEBAS (local, mismo origen para harness + app)

| # | Caso | Esperado |
|---|---|---|
| 1 | **ESH Auth OK** (pass Auth) | Entra; modo Auth; embudo token Auth; PATCH historicos/ESH 200 |
| 2 | **ESH legacy fallback** (pass legacy antigua) | Entra; modo anónimo; `signOut()` aplicado |
| 3 | **BZP Auth OK** | Entra; modo Auth |
| 4 | **BZP legacy fallback** | Entra; modo anónimo |
| 5 | **Contraseña incorrecta** (ni Auth ni legacy) | "Credenciales incorrectas" |
| 6 | **Auth caído** (simular sin red a identitytoolkit) | Cae a legacy; entra si pass legacy OK |
| 7 | **Usuario no migrado simulado** (code sin cuenta Auth, con pass legacy) | Entra por legacy |
| 8 | **Sesión Auth residual de otro code** (sembrar ZZx por harness) + login ESH legacy | `signOut()` limpia; modo anónimo; sin mismatch |
| 9 | **Logout/login cruzado** (ESH Auth → logout → BZP Auth) | `signOut()` en logout; sesiones no se mezclan |
| 10 | **Multi-dispositivo** (PC + iPhone + iPad) | Login Auth en los 3; sync converge |
| 11 | **P4/sync tras login** (Auth y legacy) | PATCH/pull HTTP 200 en ambos modos; conteos coinciden |
| 12 | **Bloqueado/temporal** (forzar `bloqueado=true` en USERS) | Deniega en ambas rutas; `signOut()` aplicado |

---

## 10. ROLLBACK EXACTO
- `git revert <E2>` → `doLogin()`/`doLogout()` vuelven al estado E1 (solo legacy visible; embudo dormido).
- Sin reglas/datos/producción que revertir. **Punto de no retorno: NINGUNO.**

## 11. CRITERIOS DE ÉXITO
1. ESH y BZP entran por **Auth** (pass Auth) → modo Auth, sync OK.
2. ESH y BZP entran por **legacy** (pass antigua) → modo anónimo, sync OK.
3. Usuario no migrado / Auth caído → legacy sin cambios.
4. Contraseña incorrecta → error.
5. `currentUser` = código siempre; `profileData`/permisos/historicos por código.
6. `signOut()` garantiza modo puro (sin mezcla); logout limpia ambos.
7. Bloqueado/temporal honrados en ambas rutas.
8. P4/sync OK en Auth y legacy. Producción intacta.

## 12. CRITERIOS DE BLOQUEO
- Cualquier usuario pierde acceso (Auth o legacy).
- `currentUser` queda como uid o no-código.
- Sesión Auth residual usada con `currentUser` distinto (mismatch).
- Bloqueado/temporal dejan de aplicarse.
- P4/sync se rompe en algún modo.

---

## 13. RECOMENDACIÓN FINAL

**IMPLEMENTAR E2** — el diseño es coherente y de riesgo MEDIO-BAJO (legacy intacto como fallback, sin
reglas, reversible). **Previa confirmación explícita de las 4 decisiones de diseño** (§6):

- **D-1** `signOut()` en éxito legacy (modo anónimo puro).
- **D-2** Honrar `bloqueado`/`temporal` en ambas rutas.
- **D-3** Exigir `session.code === u`; si no, `signOut()` + no-auth.
- **D-4** No cambiar la carga anónima de `USERS` pre-login.

Sub-división opcional (si se quiere minimizar aún más): **E2a** = doble login en `doLogin()`;
**E2b** = `signOut()` en `doLogout()`. Recomendación: **un solo commit E2** (cambios acoplados y pequeños),
salvo que prefieras separar el logout.

> Nota: el diseño visual del login/welcome sigue siendo deuda aparte ("UX Login 2.0 / Welcome 2.0"),
> NO se aborda en E2.

**FIN DEL DISEÑO E2 — No implementar hasta autorización explícita y confirmación de D-1..D-4.**
