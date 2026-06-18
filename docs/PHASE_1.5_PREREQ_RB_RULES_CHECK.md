# PREREQUISITO 1.5 — Verificación R-B: reglas desplegadas vs repo

**Fecha:** 2026-06-17 (corregido 2026-06-17 con el ruleset desplegado completo)
**Contexto:** cierre de Fase 1.4 (publicada en producción, `247644d`). Prerequisito para Fase 1.5 (reglas finales).
**Estado:** 🟢 **R-B = PASS (con delta menor)** — reglas desplegadas ≈ `firebase-database.rules.json` del repo; única diferencia: falta `deletedUsers/$userId/.validate`.
**Naturaleza:** documento de prerequisito. **No corregir reglas. No `firebase deploy`. No tocar RTDB. No iniciar 1.5.**

> ⚠️ **Nota de corrección.** Una primera lectura manual parcial de Console concluyó erróneamente que `deletedUsers` estaba **ausente** (R-B = FAIL, con supuesto riesgo de resurrección por deny). El **ruleset desplegado completo** (pegado y verificado después) demuestra que **`deletedUsers` SÍ existe** con `.read`/`.write: auth != null`. Este documento queda corregido en consecuencia; quedan **anuladas** las afirmaciones previas de "deletedUsers ausente", "tombstones denegados", "riesgo de resurrección por deny" y "R-B = FAIL".

---

## 1. Método de verificación

- **Lado repo:** lectura de `firebase-database.rules.json` en `avatars-redesign@247644d` (autoritativo).
- **Lado desplegado:** **ruleset completo** copiado desde **Firebase Console → Realtime Database → pestaña Rules** (solo lectura; sin CLI, sin deploy, sin tocar RTDB).
  - (El entorno de trabajo no dispone de credenciales privilegiadas —firebase CLI/gcloud/service account/DB secret—; la lectura la realizó el usuario desde Console.)

---

## 2. Resultado — R-B = PASS (con delta menor)

Comparación nodo a nodo. **Única diferencia funcional encontrada:**

| Punto | Repo (`247644d`) | Desplegado (Console, completo) | Coincide |
|---|---|---|---|
| `pilotpay/deletedUsers` — `.read`/`.write` | `auth != null` | `auth != null` | ✅ **SÍ** |
| `pilotpay/deletedUsers/$userId/.validate` | ✅ presente (`userId`, `deletedAt`(number), `deletedBy`) | ❌ **ausente** | ⚠️ **delta menor** |
| `usuarios.$code.validate` (exige `pass`) | exige `pass` (isString) | **idéntico** (exige `pass`) | ✅ **SÍ** |
| `perfiles`, `permisos` (`.read`/`.write`) | `auth != null` | `auth != null` | ✅ **SÍ** |
| `historicos` + `$userId` + `monthly`/`auditorias`/`deletedAuditorias` (validates) | presentes | **idénticos** | ✅ **SÍ** |
| `rutas`, `solicitudes` (+ validates) | presentes | **idénticos** | ✅ **SÍ** |
| Deny-by-default root + `pilotpay` | `false`/`false` | `false`/`false` | ✅ **SÍ** |

**Conclusión:** las reglas desplegadas **coinciden con el repo en todos los nodos y permisos**, salvo que **`deletedUsers/$userId` no tiene el sub-`.validate`** que sí está en el repo. `deletedUsers` **existe y permite lectura/escritura** en desplegado.

---

## 3. Impacto

- `deletedUsers` **está desplegado con `.write: auth != null`** → `purgeUser()` **SÍ puede escribir tombstones** en `pilotpay/deletedUsers/{userId}`. **No hay denegación por deny-by-default. No hay riesgo de resurrección por deny.**
- El **único** efecto del `.validate` ausente: el nodo desplegado **acepta tombstones sin validación estructural** (cualquier forma), mientras el repo exigiría la forma `{userId, deletedAt(number), deletedBy}`.
- **Riesgo real:** **falta de validación estructural** de tombstones en `deletedUsers` (integridad de datos), **no** una denegación de escritura.

**Severidad: IMPORTANTE (no crítica).** Los tombstones **funcionan hoy**; lo que falta es el endurecimiento de su validación, que se añade en 1.5.

---

## 4. Acción sobre el delta `deletedUsers/$userId/.validate`

### Opción A — Fix puntual previo (desplegar solo el `.validate` de `deletedUsers/$userId` antes de 1.5)
- **Pros:** alinea desplegado↔repo de inmediato; tombstones validados ya.
- **Contras:** **un despliegue global de reglas adicional** (todo evento de reglas afecta a todos los dispositivos a la vez). Innecesario: los tombstones ya funcionan; solo falta validación.

### Opción B — Diferir a 1.5 (incluir el `.validate` en el despliegue global de reglas finales)
- **Pros:** **sin despliegue global extra**; el `.validate` entra junto a las reglas finales por claim de 1.5.
- **Contras:** hasta entonces, los tombstones se escriben **sin validación estructural** (aceptable: el cliente genera la forma correcta).

---

## 5. Decisión recomendada

> ## ✅ Recomendado: **Opción B — diferir a 1.5**.

**Justificación (situación actual):**
- `deletedUsers` ya **permite escritura** → **no hay bloqueo ni urgencia**.
- El delta es **validación estructural**, de severidad importante pero no crítica.
- **1.5 será la fase formal de reglas** (reglas finales por claim, sin tolerancia anónima, + purga de `pass` + cierre de Anonymous) → es el momento natural y de menor coste para añadir también el `.validate` de `deletedUsers`.
- Evita un **segundo evento global** de reglas por un delta que no bloquea funcionalidad.

**Sobre el guardrail "no borrar usuarios":**
> El guardrail previo se basaba en la premisa (ahora anulada) de que los tombstones se denegarían. Como `deletedUsers` **sí permite escritura**, **el borrado no se denegaría**. El guardrail deja de ser estrictamente necesario; se mantiene como **prudencia opcional** (los tombstones se escriben sin validación estructural hasta 1.5).

---

## 6. Otros estados confirmados (relevantes para 1.5)

- **Anonymous Auth = ENABLED** (confirmado en Console). 1.5 debe **deshabilitarlo** (cierra R3 a nivel sistema). ⚠️ El cliente aún hace `fbSignIn()` **anónimo** en bootstrap (`DOMContentLoaded`) → 1.5 debe **retirar ese bootstrap** antes/junto a deshabilitar Anonymous (componente cliente, no solo reglas).
- **`validate(pass)` = ACTIVO** en `usuarios.$code` (confirmado, byte-idéntico al repo). **Acoplamiento crítico:** la **purga de `pass`** en 1.5 **exige relajar `validate(pass)`** en el mismo deploy; si se purga con la regla activa, futuras escrituras a `usuarios` sin `pass` serían denegadas.
- **Backup RTDB:** ❌ no hecho — **obligatorio antes** de la purga de `pass` (gate de ejecución de 1.5).
- **Snapshot de reglas desplegadas:** disponible (ruleset completo capturado) — debe **guardarse como artefacto de rollback** de 1.5.

---

## 7. Acciones futuras para 1.5

1. **Desplegar reglas finales** (un único evento global) que incluyan:
   - `deletedUsers/$userId/.validate` (cierra el delta de R-B).
   - Reglas por claim **sin tolerancia anónima** (absorbe diseño 1.3).
   - Ajuste de `usuarios.$code.validate`: dejar de exigir `pass` (acoplado a la purga).
2. **Purga de `pass`** de `pilotpay/usuarios` (con backup RTDB previo).
3. **Retirar bootstrap anónimo del cliente** y **deshabilitar Anonymous Auth**.
4. **Re-verificar R-B** post-deploy: reglas desplegadas == repo (byte a byte).
5. **Gates GO/NO-GO** propios de 1.5 + validación multi-dispositivo (evento de alto riesgo: reglas + datos + cliente).

---

## 8. Rollback esperado

- **Este prerequisito no despliega nada** → no requiere rollback.
- **Para 1.5 (cuando se ejecute):** rollback = re-desplegar el **ruleset desplegado actual** (guardar copia exacta como artefacto **antes** del deploy de 1.5). La purga de `pass` requerirá **backup RTDB** previo para revertir datos. El componente cliente (retirada de bootstrap anónimo) se revierte por `git revert`.
- **Estado de cliente:** Fase 1.4 (`247644d`) es independiente de las reglas; su rollback propio sigue disponible (tag `pre-1.4-avatars-89d582e`, rama `phase-1.4-legacy-removal`, o `git revert 247644d`).

---

**Resumen:** R-B = **PASS con delta menor** — desplegado coincide con el repo salvo el `.validate` ausente en `deletedUsers/$userId`. `deletedUsers` existe y permite escritura → tombstones funcionan; **no** hay riesgo de resurrección por deny. Severidad **IMPORTANTE (no crítica)**: falta validación estructural, que se añade en 1.5. Anonymous=ENABLED y `validate(pass)`=ACTIVO confirmados; backup RTDB y snapshot de reglas pendientes como gates de ejecución de 1.5.
