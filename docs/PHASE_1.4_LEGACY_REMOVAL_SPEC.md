# SPEC EJECUTABLE — Fase 1.4: Retirada de legacy (CLIENTE SOLAMENTE)

**Fecha:** 2026-06-17
**Fase:** 1.4 — Retirada del login legacy en cliente
**Estado:** 🟢 **DISEÑO LISTO PARA IMPLEMENTAR — NO implementado.** (Corregido 2026-06-17 tras micro-auditoría: alta de usuario **diferida a Admin 2.0** — ver §0-bis.)
**Depende de:** Fase 1.25 ✅ (publicada, `087c1ec`). Decisión Opción 2 (1.3 absorbida en 1.5) ✅ (`b46d441`).
**Reversibilidad:** **`git revert` de un único commit de cliente.** Sin tocar Firebase/reglas/datos.

> ⚠️ **ALCANCE: Fase 1.4 = CLIENTE SOLAMENTE.**
> - **NO se tocan reglas** Firebase.
> - **NO se purga `pass` de RTDB** (los valores existentes permanecen intactos).
> - **NO se deshabilita Anonymous Auth.**
> - El cierre real de R2 a nivel reglas, la purga de `pass` y el cierre de Anonymous quedan para **Fase 1.5**.

---

## 0-bis. CORRECCIÓN DE ALCANCE (2026-06-17) — tras micro-auditoría del Admin

La versión inicial de esta spec asumió (por inventario) que existía un **formulario de alta con input `adm-pass`**. La micro-auditoría del código real demuestra que **ese formulario NO existe** en `frontend/index.html`. Se corrige el alcance:

**Estado real verificado:**
- **`crearUsuarioLocal`** — **vivo pero ROTO**: lo invoca el botón "+ Dar acceso" (`:4299`), pero lee `adm-nombre/codigo/pass/funcion/base/nivel` (`:9004–9009`, sin optional chaining) y **esos inputs no existen** (el único `adm-*` editable es `adm-search`). Al pulsarlo hoy **crashea** (`TypeError` en `:9004`). Avería **pre-existente**, ajena a 1.4. → **FUERA de alcance de 1.4 · DIFERIDO a Admin 2.0.**
- **`generarAltaUsuario`** — **código muerto** (sin callers; lee los mismos inputs inexistentes). → **FUERA de alcance de 1.4 · DIFERIDO a Admin 2.0.**
- **Botón "+ Dar acceso" (`:4299`)** — **flujo roto/pre-existente**. → **FUERA de alcance de 1.4 · pendiente de Admin 2.0.**
- **No existe input `adm-pass`** → **no hay "campo visual de contraseña en alta" que retirar** en 1.4.

**Sí está vivo y verificable** (se mantiene en alcance de 1.4): el **núcleo de login** y la **edición de usuario** (`editarUsuario`/`guardarEdicionUsuario`, cuyo input `edit-pass` en `:9238` **sí existe** y es funcional).

**Alcance corregido de implementación 1.4 (cliente-only):**
- a) `doLogin` Auth-only (eliminar fallback legacy + fetch puntual post-Auth).
- b) eliminar preload whole-node **pre-login** (en `doLogin`).
- c) eliminar preload background de usuarios (en `DOMContentLoaded`).
- d) `DEFAULT_USERS` sin `pass`.
- e) `editarUsuario` / `guardarEdicionUsuario` sin campo `pass`.
- **DIFERIDO a Admin 2.0:** alta de usuario (`crearUsuarioLocal`, `generarAltaUsuario`, botón "+ Dar acceso").

**Nota explícita:**
- 1.4 **NO arregla el Admin**.
- 1.4 **NO implementa alta de usuarios**.
- 1.4 **solo retira el legacy vivo del login** (fallback por `pass` + lecturas masivas pre-login) **y la edición viva de `pass`** (campo `edit-pass`).

> Las secciones §3/§4 reflejan esta corrección: las filas de `crearUsuarioLocal` y del "form alta" quedan marcadas **DIFERIDO (Admin 2.0)**.

---

## 1. Objetivo exacto

Convertir el login en **Auth-only** en el cliente:
- Eliminar el fallback `USERS[u].pass === p`.
- Eliminar la dependencia de `DEFAULT_USERS.pass`.
- Eliminar la **lectura masiva pre-login** de `pilotpay/usuarios`.
- Adaptar el panel Admin (actual) para no requerir contraseña en alta/edición.

No se tocan reglas, ni se purga `pass` de RTDB, ni se deshabilita Anonymous (todo eso es 1.5).

---

## 2. Archivos afectados (previstos)

- `frontend/index.html` (único con lógica).
- `docs/index.html` (regenerado por `npm run sync`, **no editar a mano**).
- **NO** se tocan: `firebase-database.rules.json`, `pilotPayStore.js` (P4), `pilotPayAuth.js`, ningún otro JS.

---

## 3 / 4. Funciones afectadas y bloques a eliminar/cambiar

| Función | Línea(s) | Acción |
|---|---|---|
| **`doLogin`** | `7620–7621` | **Eliminar** preload whole-node pre-login (`if (Object.keys(USERS).length===0) await loadUsersFromFirebase()`) |
| | `7648–7652` | **Eliminar** bloque fallback legacy (`USERS[u].pass === p` → `authedVia='legacy'`) |
| | tras `7646` (post-Auth) | **Añadir** carga puntual: `USERS[u] = await fbGet('pilotpay/usuarios/'+u)` (sustituye la dependencia de USERS[u] para D-5 / bloqueado / temporal / perfil) |
| | `7637` | **Actualizar** comentario E2 → "Auth-only (1.4: legacy retirado)" |
| **`DOMContentLoaded`** | `7716–7717` | **Eliminar** preload background whole-node (`if (...) await loadUsersFromFirebase()`) |
| **`loadUsersFromFirebase`** | `7234–7266` | **Conservar** función (la usa el panel Admin). Solo se eliminan sus llamadores pre-login. Caller `:7597` (recuperación tras reconexión si `_USERS_FROM_FALLBACK`) se **conserva** |
| **`DEFAULT_USERS`** | `7226–7227` | **Eliminar** campo `pass: '7800'` (deja de ser fuente de credencial; queda solo display fallback) |
| ~~**`crearUsuarioLocal`**~~ | — | ⏸️ **DIFERIDO a Admin 2.0** (ver §0-bis). Vivo pero roto (formulario de alta inexistente → crashea). **No se toca en 1.4.** |
| ~~(form alta)~~ | — | ⏸️ **DIFERIDO a Admin 2.0.** No existe input `adm-pass` → nada que retirar en 1.4 |
| ~~`generarAltaUsuario`~~ | — | ⏸️ **DIFERIDO a Admin 2.0.** Código muerto (sin callers). **No se toca en 1.4.** |
| Botón "+ Dar acceso" (`4299`) | — | ⏸️ **DIFERIDO a Admin 2.0.** Flujo roto pre-existente. **No se toca en 1.4.** |
| **`guardarEdicionUsuario`** | `10242` | **Eliminar** lectura `edit-pass`; `10247` quitar requisito; `10250` **quitar `pass`** de `nameUpdates` (el PATCH preserva el pass existente → validate OK por merge) |
| **`editarUsuario`** | `9238` | **Eliminar** el `<input id="edit-pass" value="${u.pass||''}">` |
| **`login-pass`** | `2217` | **Conservar** (ahora es la contraseña Auth) |
| **`initializeFirebaseUsersOnce`** | `7271–7281` | **Sin cambios** (sin llamadores; código muerto). Documentar que requeriría reglas de 1.5 si se reactivara |

---

## 5. Comportamiento NUEVO

- Login **Auth-only**: credenciales válidas solo vía `PilotPayAuth.signIn`. Sin cuenta Auth o credenciales erróneas → `"Credenciales incorrectas"`.
- **Primer login en dispositivo nuevo requiere red (Auth) → queda NO SOPORTADO offline.** Documentado como limitación aceptada.
- Dispositivos no-admin **dejan de descargar el nodo `usuarios` completo** al arrancar/login → **mitigación cliente de R2** (el cierre a nivel reglas es 1.5).
- Admin alta/edición **sin contraseña**:
  - **Alta** escribe `pass: ""` (placeholder). **Es temporal y NO implica acceso**: un usuario creado así **no puede iniciar sesión hasta que exista su cuenta Auth** (provisión vía Admin SDK / admin-cli, fase de identidad). El `pass:""` existe solo para satisfacer la regla `validate` actual sin tocar reglas.
  - **Edición** no toca `pass` (el valor existente en RTDB se conserva por merge del PATCH).

---

## 6. Comportamiento CONSERVADO

- Login Auth ESH/BZP (E2 ruta primaria), `restoreSession` offline tras un login online previo (E1).
- Controles `bloqueado` / `temporal` (ahora con fetch puntual de `usuarios/{u}`).
- E3a perms role-aware + limpieza de cachés en logout; D-5 guard adaptado.
- Panel Admin lista usuarios (`loadUsersFromFirebase` al abrir admin) + recuperación tras reconexión.
- P4 sync (sin dependencia directa de `PilotPayAuth` → sin cambios). `loadUserData`, `loadPermsFromFirebase`, normalización de perfil, `showWelcome`.

---

## 7. Qué NO se toca

Firebase, reglas, valores `pass` en RTDB, Anonymous Auth, P4 (sin dependencia demostrada), Parser, Dashboard, Historial, Admin 2.0 (rediseño), Biblioteca/normativa, `login-pass` input, `initializeFirebaseUsersOnce`. **Sin nuevas funcionalidades.**

---

## 8. Riesgos

| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| 1 | Lockout si ESH/BZP no autentican en algún dispositivo | 🟠 | Precondición: verificar Auth en PC/iPhone/iPad **antes** |
| 2 | Pérdida de login offline de primer uso | 🟠 | Documentado como NO soportado; `restoreSession` cubre usos posteriores |
| 3 | `crearUsuarioLocal` escribe `pass:""` → usuario nuevo no puede loguear (sin cuenta Auth) | 🟠 | Alta de usuarios nuevos queda pendiente de provisión Auth (fase identidad); beta cerrada sin altas ahora |
| 4 | Algún consumidor pre-login esperaba `USERS` poblado (p.ej. datalist de códigos en login) | 🟠 | **Verificar** que la pantalla de login no enumera `USERS`; si lo hace, ajustar |
| 5 | `_USERS_FROM_FALLBACK` (`:7597`) aún recarga whole-node tras reconexión | 🟡 | Camino de recuperación; aceptable en 1.4, endurecer en 1.5 |
| 6 | `DEFAULT_USERS` sin pass + `initializeFirebaseUsersOnce` produciría write inválido si se invocara | 🟡 | Sin llamadores; documentar |

---

## 9. Rollback

1.4 = **un único commit de cliente** sobre rama propia. **`git revert <sha>`** restaura el login legacy íntegro. Como **no se tocan reglas ni datos** (los `pass` siguen en RTDB intactos), el legacy vuelve a funcionar inmediatamente tras el revert. Checkpoint: tag antes de empezar.

---

## 10. Validaciones obligatorias

| Check | Esperado |
|---|---|
| ESH Auth online | entra, `getSession().code==='ESH'` |
| BZP Auth online | entra, `getSession().code==='BZP'` |
| Password incorrecta | `"Credenciales incorrectas"`, no entra |
| Logout limpia sesión | `PilotPayAuth.getSession()===null` |
| Offline tras sesión Auth previa | abre vía `restoreSession` |
| Primer login offline (dispositivo nuevo) | **documentado NO soportado** (falla controladamente) |
| BZP no accede a Admin | sin panel admin (E3a) |
| ESH Admin no rompe | lista usuarios, editar/alta funcionan sin campo pass |
| P4 sin regresión | `inspectMonthly` / `pull` OK, RTDB sin 4xx |
| Dashboard / Parser / Historial | sin regresión |
| Multi-dispositivo | PC / iPhone / iPad PASS |

---

## 11. Criterios GO / NO-GO (para ejecutar 1.4)

**GO** si: ESH+BZP autentican vía Auth en los 3 dispositivos; claims verificados (R-D); decisión "offline primer login NO soportado" aceptada; todas las validaciones §10 PASS.

**NO-GO** si: algún dispositivo no autentica por Auth; regresión en P4 / Dashboard / Parser / Historial; riesgo 4 (login enumera USERS) sin resolver.

---

## 12. Estimación

- Implementación cliente (doLogin, loaders, DEFAULT_USERS, admin alta/edición): **~1–1,5 días** + testing.
- Validación multi-dispositivo: **~0,5–1 día**.
- `npm run sync` + pre-push: trivial.
- **Total ~2–2,5 días.** Sin eventos globales de reglas/datos.

---

## 13. Recomendación final

**GO para implementar 1.4 como spec (cliente-only, reversible)**, una vez que se **autorice la ejecución** y se confirmen las precondiciones (ESH/BZP Auth-capable en todos los dispositivos + claims R-D). Asumir como **limitación aceptada** que:
- El alta de usuarios nuevos queda incompleta hasta la fase de identidad (provisión Auth); el `pass:""` es temporal y **no concede acceso**.
- El **primer login offline en dispositivo nuevo deja de soportarse**.

El cierre real de R2 a nivel reglas y la purga de `pass` permanecen en **1.5**.

---

**FIN DE LA SPEC 1.4 — Cliente-only. No implementar sin autorización separada.**
