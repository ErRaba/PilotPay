# FASE 1.25 — COMMIT E3: DISEÑO — ESCOPADO DE PERMISOS + ANALYTICS

**Fecha:** 2026-06-12
**Commit:** E3 (tercero de E1-E4). E1 `30602f6`, E2 `ec6f00f` (commiteados/validados).
**Estado:** 🟡 **DISEÑO — NO implementar. Sin cambios de código/reglas/Firebase.**
**Recomendación (ver §10):** **DIVIDIR en E3a (perms) + E3b (analytics)** — cambios independientes.

---

## 0. OBJETIVO
Preparar el cliente para las reglas transitorias por claim de Fase 1.3, **sin desplegar reglas**:
1. **E3a:** `loadPermsFromFirebase()` lee solo `permisos/{currentUser}` para usuarios **no-admin** (el admin sigue leyendo el nodo entero).
2. **E3b:** pausar analytics (escribe a un path sin regla → denegado + ruido en consola).
Ambos funcionan bajo las reglas actuales (`auth != null`); preparan 1.3 sin romper a nadie.

---

## 1. INVENTARIO EXACTO DE `loadPermsFromFirebase()` (`index.html` 7464-7481)

```js
async function loadPermsFromFirebase() {
  if (_online) {
    try {
      const fbPerms = await fbGet('pilotpay/permisos');     // ← NODO ENTERO
      if (fbPerms) {
        perms = fbPerms;                                     // perms = { code: {funciones,bases}, ... }
        localStorage.setItem('pilotpay_perms_cache', JSON.stringify(perms));
        return;
      }
    } catch(e) {}
  }
  // Fallback local
  const local = localStorage.getItem('pilotpay_perms_cache')
             || localStorage.getItem('pilotpay_admin_perms');
  if (local) perms = JSON.parse(local);
}
```

| Aspecto | Detalle |
|---|---|
| Línea | 7464-7481 |
| Path leído | `pilotpay/permisos` (**nodo entero**, todos los usuarios) |
| Formato | `{ [code]: { funciones:[...], bases:[...] } }` |
| Fallback | `pilotpay_perms_cache` → `pilotpay_admin_perms` (localStorage) |
| Caché local | `pilotpay_perms_cache` (no escopada por usuario) |
| Token | `fbGet` → `getAuthToken` (embudo E1: Auth o anónimo) — post-login |
| Dependencias downstream | `getUserPerms(currentUser)` (8067), `perms[code]` (admin 8956/8962, 10263), `getUserPerms(currentUser).bases` (10991) |

**Consumo:**
- `getUserPerms(userCode)` (8067-8074): `perms[userCode] || { funciones:[u.funcion], bases:[u.base] }` — **fallback a `USERS[u]`** si falta.
- **Usuario normal:** solo necesita `perms[currentUser]`.
- **Admin (`ESH`):** necesita el **nodo entero** (lista/edita permisos de otros en el panel admin; `savePermsToFirebase` 7483 escribe el nodo entero con `isAdmin()` guard).

---

## 2. DISEÑO OBJETIVO (E3a)

### 2.1 Lectura actual
`fbGet('pilotpay/permisos')` (entero) para **todos**.

### 2.2 Lectura propuesta (role-aware)
```
if isAdmin():
   fbPerms = fbGet('pilotpay/permisos')                 // entero (admin necesita todos)
   perms = fbPerms; cache(perms)
else:
   mine = fbGet('pilotpay/permisos/' + currentUser)     // SOLO lo propio
   perms = mine ? { [currentUser]: mine } : {}
   cache(perms)                                          // cache del scoped
fallback: cache local (igual que hoy)
```

| Caso | Comportamiento |
|---|---|
| **Admin (ESH)** | Lee nodo entero — **idéntico a hoy**; panel admin intacto |
| **User (BZP)** | Lee solo `permisos/BZP` → `perms = { BZP: {...} }`; `getUserPerms(BZP)` funciona igual |
| **Sin permisos** (`permisos/{code}` ausente) | `perms = {}` → `getUserPerms` cae al fallback `USERS[code].funcion/base` (8070-8073) — **sin pérdida de acceso** |
| **Offline** | Fallback a `pilotpay_perms_cache` (igual que hoy) |

### 2.3 Por qué no rompe al admin
`isAdmin()` (`currentUser === ADMIN_CODE`) se evalúa **después** de fijar `currentUser` (E2 lo fija antes de `loadPermsFromFirebase`). El admin mantiene la lectura del nodo entero → `savePermsToFirebase` y el panel admin no cambian. `savePermsToFirebase` ya tiene guard `isAdmin()` → un user nunca escribe el nodo.

### 2.4 Compatibilidad con reglas futuras (1.3)
- User lee `permisos/{currentUser}` → futura regla `auth.token.code===code || admin` lo permite.
- Admin lee `permisos` (parent) → la regla 1.3 debe conceder lectura del parent al rol admin.
E3a deja el cliente **ya alineado** con ese modelo, sin desplegar la regla.

---

## 3. RIESGOS (E3a)
| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| P1 | Romper permisos admin | Alta | Admin sigue leyendo nodo entero (role-aware); `savePermsToFirebase` con guard `isAdmin` intacto |
| P2 | Perder acceso a módulos/bases | Media | `getUserPerms` cae a `USERS[u].funcion/base` si `perms[code]` falta (8070); no hay pérdida |
| P3 | Caché vieja (`pilotpay_perms_cache` no escopada) | Media | Pre-existente; `doLogout` no la limpia. E3 puede escopar la caché por code (opcional) o limpiarla en logout. **Decisión pendiente** |
| P4 | Usuario con permisos ausentes | Baja | Fallback a `USERS[u]` (P2) |
| P5 | Diferencia Auth vs legacy | Baja | El scoped read usa `getAuthToken` (embudo): Auth o anónimo, ambos válidos bajo reglas actuales |
| P6 | Reglas futuras por claim | — | E3a alinea el cliente; el endurecimiento real es 1.3 |
| P7 | Usuarios no migrados | Baja | Entran por legacy (anónimo); `permisos/{code}` legible bajo `auth!=null`; mismo scoped read |

---

## 4. ANALYTICS (E3b)

### 4.1 Inventario del módulo (`frontend/js/pilotPayAnalytics.js`)
| Función | Línea | Qué hace |
|---|---|---|
| `track(action, data)` | 100 | Gate `window.currentUser`; guarda evento en localStorage (FIFO `MAX_LOCAL_EVENTS`); cada `UPLOAD_BATCH_SIZE` → `uploadBatch` |
| `uploadBatch(events)` | 141 | Por evento: `fbUpdate('pilotpay/analytics/'+currentUser+'/events/'+id, event)` |
| `flush()` | 163 | Sube todos los pendientes |
| Carga | `index.html:6308` | `<script src="js/pilotPayAnalytics.js">` (sin flag de activación) |
| Call-sites | index.html ×7 | `completeAudit`, `checkAbandonOnModuleChange`, `track('module_view')`, `startAuditSession`, `updateAuditPhase`, `track('error_occurred')` ×2 |

### 4.2 Rutas Firebase usadas
`pilotpay/analytics/{code}/events/{eventId}` (PATCH vía `fbUpdate`).

### 4.3 Reglas actuales: ¿permiten o deniegan?
**DENIEGAN.** `pilotpay/analytics` **no existe** en `firebase-database.rules.json` → deny-by-default →
cada `fbUpdate` lanza HTTP error → el `.catch` (150-152) hace **`console.error('[Analytics] Upload failed')`**.
**NO falla en silencio:** genera ruido en consola y escrituras denegadas en cada batch. (Confirmado en G2: nodo `pilotpay/analytics` vacío/inexistente.)

### 4.4 Impacto real si se pausa
- ✅ Desaparecen los `console.error` de uploads denegados (consola más limpia).
- ✅ Cesan las escrituras denegadas (tráfico inútil).
- ✅ Cesa la acumulación de metadatos de auditoría en localStorage (`MAX_LOCAL_EVENTS`) — dato sensible sin cifrar.
- ⚠️ Se pierde el tracking local (que hoy no se persiste en remoto de todas formas) — pérdida nula de valor real.

### 4.5 Propuesta: **PAUSAR** (flag, default OFF) en E3b
Añadir en `pilotPayAnalytics.js` un flag de activación (`pilotpay_analytics_enabled === '1'`, default OFF):
`track()` y `uploadBatch()`/`flush()` hacen **early-return** si no está activo. **NO** quitar el `<script>`
(rompería los 7 call-sites con `ReferenceError`). Los call-sites siguen llamando a `PilotPayAnalytics.track(...)`
→ **no-op** → sin error. Reversible (flip flag). ~3-5 líneas en `pilotPayAnalytics.js`.

> Alternativa "no tocar": dejarlo como está → seguiría ensuciando consola y escribiendo denegado. **No recomendada.**
> Alternativa "diferir": pausarlo en 1.3 junto a reglas. Posible, pero el ruido en consola contamina la validación
> de E2/E3 → mejor pausar ahora.

---

## 5. PSEUDOCÓDIGO DE E3

### E3a — `loadPermsFromFirebase()` (index.html)
```js
async function loadPermsFromFirebase() {
  if (_online) {
    try {
      let fbPerms;
      if (isAdmin()) {
        fbPerms = await fbGet('pilotpay/permisos');            // entero (admin)
        if (fbPerms) { perms = fbPerms; cache(perms); return; }
      } else if (currentUser) {
        const mine = await fbGet('pilotpay/permisos/' + currentUser);  // scoped
        perms = mine ? { [currentUser]: mine } : {};
        cache(perms);
        return;
      }
    } catch(e) {}
  }
  // Fallback local (igual que hoy)
  const local = localStorage.getItem('pilotpay_perms_cache')
             || localStorage.getItem('pilotpay_admin_perms');
  if (local) perms = JSON.parse(local);
}
```

### E3b — `pilotPayAnalytics.js` (flag de pausa)
```js
function _analyticsEnabled() {
  try { return localStorage.getItem('pilotpay_analytics_enabled') === '1'; } catch(e){ return false; }
}
function track(action, data={}) {
  if (!_analyticsEnabled()) return;          // ← pausa
  if (!window.currentUser) { ...; return; }
  ... (resto igual)
}
function uploadBatch(events) {
  if (!_analyticsEnabled()) return;          // ← pausa (defensa adicional)
  ... (resto igual)
}
```

---

## 6. PRUEBAS LOCALES
| Sujeto | Esperado |
|---|---|
| **ESH admin (Auth)** | Lee nodo entero; panel admin lista/edita permisos de todos; `savePermsToFirebase` OK |
| **ESH admin (legacy)** | Igual (token anónimo) |
| **BZP user (Auth)** | Lee solo `permisos/BZP`; `getUserPerms(BZP)` correcto; bases/funciones correctas |
| **BZP user (legacy)** | Igual (anónimo) |
| **Offline** | Fallback a `pilotpay_perms_cache`; sin pérdida de módulos |
| **Sin permisos** (`permisos/{code}` ausente) | `getUserPerms` cae a `USERS[u].funcion/base`; entra con su función/base |
| **Caché existente** | Si online falla, usa caché; verificar que no mezcla usuarios (P3) |
| **Analytics pausado** | Consola sin `[Analytics] Upload failed`; sin escrituras a `pilotpay/analytics`; call-sites no-op sin error |

---

## 7. ROLLBACK EXACTO
- **E3a:** `git revert <E3a>` → `loadPermsFromFirebase` vuelve a leer el nodo entero. Sin reglas/datos.
- **E3b:** `git revert <E3b>` → analytics vuelve a su estado actual (o `flip` del flag a '1'). Sin reglas/datos.
- Si E3 fuera un commit único: `git revert <E3>`. **Punto de no retorno: NINGUNO.**

## 8. CRITERIOS DE ÉXITO
1. Admin (ESH) mantiene panel admin completo (lee/edita permisos de todos).
2. User (BZP) lee solo lo suyo; bases/funciones/módulos correctos; sin pérdida de acceso.
3. Sin permisos → fallback a `USERS[u]`; entra.
4. Offline → caché; sin regresión.
5. Auth y legacy idénticos en ambos roles.
6. Analytics pausado → consola limpia, sin escrituras denegadas, call-sites no-op.
7. Reglas/Firebase/producción intactos.

## 9. CRITERIOS DE BLOQUEO
- Admin pierde capacidad de ver/editar permisos de otros.
- User pierde acceso a una base/función/módulo que tenía.
- `getUserPerms` devuelve vacío sin fallback → pérdida de acceso.
- Analytics sigue generando `console.error` tras pausar.

---

## 10. RECOMENDACIÓN FINAL

## ✅ DIVIDIR EN E3a + E3b

Son cambios **independientes**, en **archivos distintos**, con riesgos distintos:
- **E3a** (`index.html`, `loadPermsFromFirebase` role-aware) — riesgo MEDIO (toca permisos; mitigado por role-awareness + fallback a USERS).
- **E3b** (`pilotPayAnalytics.js`, flag de pausa) — riesgo BAJO (no-op; limpia consola).

Ventaja de dividir: validar y revertir cada uno por separado; E3b puede ir primero (trivial, limpia la consola para validar E3a sin ruido de analytics).

**Decisión pendiente para E3a:** ¿escopar también la caché (`pilotpay_perms_cache_{code}`) o limpiarla en `doLogout`?
(P3 — cache no escopada). Recomendación: **limpiar `pilotpay_perms_cache` en `doLogout`** (1 línea, evita mezcla
entre usuarios del mismo dispositivo offline). A confirmar antes de implementar E3a.

**Orden propuesto:** E3b (analytics, trivial) → E3a (perms, con decisión de caché). Ambos antes de Fase 1.3 (reglas).

> No se difiere a después de reglas: escopar el cliente **antes** de endurecer reglas es lo que evita que 1.3
> rompa la lectura de permisos de los usuarios. E3a es prerequisito de la regla `permisos/{code}` de 1.3.

---

## 11. MAPA FUNCIONAL DE PERMISOS PILOTPAY

### 11.1 Distinción fundamental (estado actual)
Hoy `permisos/{code} = { funciones:[...], bases:[...] }` **NO controla el acceso a módulos**. Controla el
**alcance de cálculo**: qué función (CMD/COP/SCC/CC) y qué base (MAD/TFN/LPA) puede calcular ese usuario.
El acceso a módulos es, hoy, de dos tipos:
- **Binario por sesión:** cualquier usuario logueado ve los módulos operativos.
- **Admin:** los módulos de administración se gobiernan por `isAdmin()` (`currentUser === ADMIN_CODE`), **no** por `permisos`.

> Por tanto, "permisos" actual ≠ "acceso a funciones". Son dos ejes distintos que el modelo futuro unificará.

### 11.2 Mapa de módulos reales (actual → futuro)

| Módulo | Gating actual | Eje futuro (permisos/{code}) |
|---|---|---|
| Dashboard | Logueado | `features` (core, siempre) |
| Variables | Logueado | `features` (core) |
| Auditoría de nómina | Logueado | `features` (core) |
| Parser de nómina PDF | Logueado | `features` (core) |
| Histórico de auditorías | Logueado | `features` (core) |
| Simulador IRPF | Logueado | `features` / `plan` |
| Convenio Colectivo | Logueado | `features` (documental) |
| Acuerdos de base | Logueado | `features` (documental) |
| Biblioteca Normativa | Logueado | `features` (documental) |
| Productividad 2026 | Logueado | `features` (documental) |
| Tablas salariales | Logueado (modal documental) | `features` (documental) |
| **Cálculo CMD/COP/TCP** | `permisos.funciones` | `funciones` (se conserva) |
| **Cálculo por base** | `permisos.bases` | `bases` (se conserva) |
| Administración | `isAdmin()` (ADMIN_CODE) | `adminPerms` / `role` (claim) |
| Gestión de usuarios | `isAdmin()` | `adminPerms.users` |
| Gestión de permisos | `isAdmin()` | `adminPerms.perms` |
| Funciones beta | No existe gating | `betaFeatures` |
| Planes/funciones activables (futuro) | No existe | `plan` + `features` + `exceptions` |

### 11.3 Evolución propuesta de `permisos/{code}` (ADITIVA — no se implementa en E3)
El modelo actual se **conserva** y se **extiende** con campos opcionales. Ningún campo nuevo es obligatorio;
los consumidores actuales (`getUserPerms`) siguen leyendo `funciones`/`bases`.

```jsonc
// permisos/{code} — futuro (todos los campos nuevos OPCIONALES)
{
  "funciones": ["CMD"],          // ACTUAL — alcance de cálculo (se conserva)
  "bases": ["MAD"],              // ACTUAL — alcance de cálculo (se conserva)

  // ── extensiones futuras (NO en E3) ──
  "plan": "beta",                // plan contratado: free | beta | pro | ...
  "features": ["dashboard","auditoria","simulador","biblioteca"],  // funciones disponibles
  "betaFeatures": ["proyeccion_operativa"],   // funciones beta activadas para este usuario
  "blockedFeatures": [],          // excepciones de bloqueo por usuario
  "exceptions": {},               // overrides puntuales (activar/desactivar algo concreto)
  "adminPerms": { "users": false, "perms": false }  // permisos administrativos granulares
}
```

**Principio de evolución:**
- `funciones`/`bases` (alcance de cálculo) **permanecen** y mantienen su semántica.
- El acceso a módulos migra progresivamente de "binario por sesión" a `features`/`plan`/`betaFeatures`.
- El acceso admin migra de `isAdmin()` (código hardcodeado) a `adminPerms` + el claim `role` (Fase 1.5).
- `exceptions`/`blockedFeatures` permiten overrides por usuario sin tocar el plan.

### 11.4 Por qué E3 NO bloquea este futuro
- E3a lee `permisos/{currentUser}` **completo** (sea cual sea su forma) para el usuario, y el **nodo entero**
  para el admin. Si mañana `permisos/{code}` crece con `plan`/`features`/`betaFeatures`, el scoped read los
  trae sin cambios.
- La separación role-aware (admin lee todo) es **exactamente** la que necesita el futuro panel de gestión de
  planes/funciones.
- E3 **no** introduce ningún esquema de planes ni gating de módulos: solo escopa la **lectura**. El modelo
  funcional se diseña e implementa en una fase propia, sobre esta base ya alineada.

---

## 12. QUÉ NO DEBE HACER E3

E3 es exclusivamente: **escopar la lectura de permisos (role-aware) + pausar analytics.** En particular, E3 **NO** debe:

- ❌ **Rediseñar UX** — ni login, ni welcome, ni el panel admin, ni la visibilidad de módulos.
- ❌ **Tocar reglas Firebase** — el endurecimiento por claim es de la Fase 1.3.
- ❌ **Modificar lógica de cálculo** — nómina, IRPF, auditoría, parsers: intactos.
- ❌ **Bloquear módulos sin decisión explícita** — E3 NO añade gating de módulos por `features`/`plan`. Los
  módulos siguen visibles igual que hoy. El gating funcional es una fase futura, no E3.
- ❌ **Cambiar la estructura de planes** — no se introduce `plan`/`features`/`betaFeatures` en datos ni en
  código. Solo se documenta la evolución prevista (§11) para no bloquearla.
- ❌ **Romper el panel admin** — el admin debe conservar lectura del nodo entero y edición de permisos de todos.
- ❌ **Cambiar el comportamiento de usuarios actuales** — ESH/BZP entran y operan igual; mismas funciones,
  mismas bases, mismos módulos. La única diferencia observable debe ser interna (qué path se lee) y nula para el usuario.

> Regla de oro de E3: **invisible para el usuario, idéntico para el admin, preparado para 1.3.**

---

**FIN DEL DISEÑO E3 — No implementar hasta autorización explícita.**
