# FASE 1.25 — COMMIT E2: REVISIÓN GO / NO-GO

**Fecha:** 2026-06-12
**Pregunta única:** *¿Está E2 listo para implementarse o existe algún riesgo oculto adicional?*
**Insumos:** D8 (diseño, `74650fa`), D9 (spec ejecutable, `55590e9`), E1 (`30602f6`, commiteado).
**Estado:** revisión de riesgo. NO diseño, NO implementación, NO modificación de documentos.

---

## 1. RESUMEN EJECUTIVO
E2 (doble login en `doLogin()` + `signOut()` en `doLogout()`) está **listo para implementar bajo
condiciones**, con D-1..D-5 incorporadas. Esta revisión hizo una pasada nueva buscando riesgos no
capturados en D8/D9. **No apareció ningún riesgo oculto bloqueante nuevo.** El único hallazgo crítico
(A2-1, crash de `showWelcome` por `USERS[u]` ausente) ya está mitigado por **D-5**. Se identifican 3
riesgos residuales **no bloqueantes** (Auth-disable bypassable vía legacy hasta 1.4; cruce de `signOut`
multi-pestaña; latencia de `signIn` en el camino de login), todos aceptables en 1.25.
**Veredicto: GO WITH CONDITIONS.**

## 2. DEPENDENCIAS REVISADAS
- `doLogin → showWelcome → USERS[currentUser]` (dura; A2-1 / D-5).
- `doLogin → loadUserData / loadPermsFromFirebase` (por código; sin cambios).
- `getAuthToken` (embudo E1) ← `currentUser` + `PilotPayAuth.getSession()`.
- `signIn` → `identitytoolkit` (mismo host que el `fbSignIn` anónimo ya usa hoy).
- `doLogout → PilotPayStore.clear / resetCalculadora / resetComparativa` (+ `signOut` nuevo).
- `saveUserData` (en normalización) → gated por `SECURITY_MODE` (Fase 0) — ver §5.
- `pilotpay_auth_session` (dispositivo, compartida entre pestañas).
- `pilotpay_ck_ctx` / `pilotpay_ck_consultas` (global, no escopado; pre-existente).

## 3. RIESGOS DESCUBIERTOS EN D8 Y D9
| Origen | Riesgo | Estado |
|---|---|---|
| D8 | R1 bloquear login legacy | Mitigado (legacy intacto como fallback) |
| D8 | R2 sesión Auth residual | Mitigado (D-1/D-3 + guard E1) |
| D8 | R3 mismatch currentUser↔claim | Mitigado (D-3) |
| D8 | R5 migrado con pass legacy | Esperado (coexistencia) |
| D9 | **A2-1 crash `showWelcome` por `USERS[u]` ausente** | **Mitigado (D-5)** |
| D9 | A2-7 multi-pestaña signOut cruzado | Residual no bloqueante (§8) |
| D9 | A2-8 `ck_ctx` global no escopado | Pre-existente, fuera de E2 |

## 4. RIESGOS YA MITIGADOS (D-1..D-5)
- **D-1** `signOut()` en éxito legacy → sin sesión Auth residual → embudo anónimo puro.
- **D-2** `bloqueado`/`temporal` honrados en Auth y legacy → un usuario bloqueado no entra por ningún camino.
- **D-3** `session.code === u` exigido → no hay token de otro usuario.
- **D-4** carga anónima de `USERS` pre-login intacta → A-1 (de E1) sigue neutralizado.
- **D-5** `USERS[u]` exigido antes de entrar → `showWelcome`/`profileData` nunca reciben `undefined` → **sin crash**.

## 5. POSIBLES RIESGOS TODAVÍA NO MITIGADOS (no bloqueantes)
1. **Auth-disable bypassable vía legacy hasta 1.4.** Si el admin deshabilitara la cuenta **Auth** de un
   usuario pero NO marcara `USERS[code].bloqueado`, ese usuario aún entraría por **legacy** (su `pass` RTDB
   sigue válida). El mecanismo de bloqueo real en 1.25 sigue siendo `USERS.bloqueado` (legacy), no el disable
   de Auth. **Aceptable:** coherente con que `pass` no se borra hasta 1.4. Relevancia hoy: nula (0 bloqueados).
2. **Latencia de `signIn` en el camino de login.** E2 añade una llamada a `identitytoolkit` antes del
   fallback legacy. Si ese endpoint estuviera degradado (pero RTDB arriba), cada login pagaría el fallo/timeout
   de `signIn` antes de caer a legacy. **Mitigación natural:** es el **mismo host** que `fbSignIn` ya usa hoy
   al arranque; `fetch` sin timeout explícito (mejora futura posible en `pilotPayAuth.js`, no en E2). Severidad baja.
3. **`pilotpay_ck_ctx` global no escopado.** Persiste entre usuarios del mismo dispositivo; `doLogout` no lo
   limpia. **Pre-existente, NO de E2.** Deuda de privacidad menor a tratar fuera de la migración Auth.
4. **`SECURITY_MODE` (Fase 0) sigue activo si el flag está puesto.** Bloquea `saveUserData`/`saveAuditRecord`.
   No afecta al acceso, pero en pruebas locales conviene **conocer su estado** (un `saveUserData` en la
   normalización de `doLogin` sería no-op si está activo). No es riesgo de E2; es contexto de prueba.

## 6. ESCENARIOS DE PÉRDIDA DE ACCESO
| Escenario | ¿Pérdida? | Razón |
|---|---|---|
| Auth caído, RTDB arriba | No | `signIn` lanza → legacy con `USERS` cacheado |
| `USERS[u]` ausente + Auth OK | No (error claro) | D-5: `signOut` + mensaje, sin crash |
| Pass Auth mala, pass legacy buena (migrado) | No | Cae a legacy → entra |
| Pass incorrecta (ambas) | Correcto (deniega) | No es pérdida: credencial inválida |
| Sin red total + `USERS` no cacheado | Igual que hoy | Pre-existente (DEFAULT_USERS solo ESH); no introducido por E2 |
| Bloqueado/temporal | Correcto (deniega) | D-2 |

**Conclusión:** E2 **no introduce** ningún escenario nuevo de pérdida de acceso respecto a hoy. D-5
convierte el único crash potencial en un error controlado.

## 7. ESCENARIOS DE CORRUPCIÓN DE SESIÓN
| Escenario | ¿Corrupción? | Control |
|---|---|---|
| Sesión Auth residual de otro code | No | Guard E1 (`code===currentUser`) + `signOut` (D-1/D-3) |
| Login legacy con sesión Auth previa | No | `signOut` en éxito legacy (D-1) |
| Mismatch claim vs input | No | D-3 rechaza |
| currentUser queda como uid | No | `currentUser = u` (código) en ambas rutas |
| Token mezclado (Auth+anónimo) en sync | No | Un modo por sesión; embudo decide por `currentUser` |

## 8. ESCENARIOS MULTI-DISPOSITIVO
- **Dispositivos distintos:** cada uno mantiene su `pilotpay_auth_session` local; sync por `historicos/{code}`
  converge (merge por timestamp). Sin interferencia.
- **Multi-pestaña (mismo dispositivo/origen):** `pilotpay_auth_session` es compartida; **no hay listener
  `'storage'`** → no se sincroniza login en vivo. Si pestaña B hace login legacy (→ `signOut`), borra la
  sesión Auth que usaba pestaña A → A cae a **anónimo** (datos siguen por su `currentUser`). **Sin corrupción
  de datos** (token anónimo válido bajo reglas actuales; claves por código). Severidad baja; a vigilar; se
  endurece en 1.3.

## 9. ESCENARIOS OFFLINE
- **Arranque offline con sesión Auth:** `restoreSession` (sin red) OK; app abre con datos locales; `getToken`
  null → operaciones encoladas; al volver red, renueva y vacía. Igual que E1.
- **Login offline:** `signIn` (red) lanza → legacy con `USERS` cacheado → entra si pass legacy OK. Sin lockout.
- **Pérdida de red a mitad de sesión:** token Auth expira → encolar; offline-first intacto.

## 10. ESCENARIOS DE ROLLBACK
- `git revert <E2>` → `doLogin`/`doLogout` vuelven al estado E1 (solo legacy; embudo dormido). Inmediato.
- Sin reglas/datos/producción que revertir. **Punto de no retorno: NINGUNO.**
- Rollback parcial no aplica (E2 es un commit único acoplado); revertir el commit es suficiente.

## 11. VALORACIÓN FINAL

## ✅ GO WITH CONDITIONS

E2 puede implementarse **con D-1..D-5** y superando la batería de pruebas de §12. No hay riesgo oculto
bloqueante nuevo; los residuales (§5) son aceptables y propios de la coexistencia 1.25. El único crash
potencial (A2-1) queda neutralizado por D-5.

**Condiciones:**
- C1. Implementar con D-1..D-5 (D-5 innegociable).
- C2. Helper `fail()` re-habilita el botón en todos los caminos de error.
- C3. Conocer el estado de `SECURITY_MODE` en el entorno de prueba (para no confundir un no-op con un fallo).
- C4. Validación local completa (§12) antes del commit; commit solo tras confirmación.
- C5. NO publicar a producción en E2 (queda para una decisión de despliegue posterior, junto con 1.3).

## 12. PRUEBAS OBLIGATORIAS ANTES DEL COMMIT
**Acceso / login:**
1. ESH Auth OK (pass Auth) → entra; modo Auth; welcome correcto.
2. BZP Auth OK → entra; modo Auth.
3. ESH legacy fallback (pass antigua) → entra; modo anónimo; `signOut` aplicado.
4. BZP legacy fallback → entra; modo anónimo.
5. Pass incorrecta (ni Auth ni legacy) → "Credenciales incorrectas"; botón re-habilitado.
6. **D-5:** Auth OK con `USERS[u]` ausente (simular `USERS` sin ese code) → error claro, **sin crash**, `signOut` aplicado.
7. Auth caído (bloquear identitytoolkit, RTDB arriba) → cae a legacy; entra si pass legacy OK.
8. Bloqueado (`USERS[u].bloqueado=true`) → deniega por Auth y por legacy; `signOut` aplicado.

**Regresión:**
9. `showWelcome` pinta correctamente en modo Auth y en modo legacy (nombre, rol, nivel, base).
10. `currentUser` = código en ambos modos; `profileData`/permisos cargan.
11. `doLogout` limpia memoria + DOM + `pilotpay_auth_session` (verificar que la clave desaparece).

**P4 / sync:**
12. Con P4 activo: PATCH/pull `historicos/{code}` HTTP 200 en modo Auth y en modo legacy; `inspectMonthly` coincide.

**Sesiones cruzadas / multi-pestaña:**
13. ESH Auth → logout → BZP Auth → sin restos de ESH; sync BZP.
14. Sembrar sesión Auth de un code y login legacy de otro → `signOut` limpia; modo anónimo; sin mismatch.
15. (Opcional) Dos pestañas: A ESH Auth, B BZP legacy → A cae a anónimo; sin corrupción de datos.

**Offline:**
16. Modo avión: arranque con sesión Auth abre con datos locales; login offline cae a legacy; al reconectar, sync.

**Aislamiento de producción:**
17. `git diff` solo toca `index.html` (`doLogin`/`doLogout`); producción no se publica.

---

**Conclusión:** **GO WITH CONDITIONS.** Implementar E2 con D-1..D-5, validar §12, commitear tras confirmación,
sin publicar a producción.

**FIN DE LA REVISIÓN GO/NO-GO — E2.**
