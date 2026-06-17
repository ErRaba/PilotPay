# PREREQUISITO 1.5 — Verificación R-B: reglas desplegadas vs repo

**Fecha:** 2026-06-17
**Contexto:** cierre de Fase 1.4 (publicada en producción, `247644d`). Prerequisito para Fase 1.5 (reglas finales).
**Estado:** 🔴 **R-B = FAIL** — reglas desplegadas ≠ `firebase-database.rules.json` del repo.
**Naturaleza:** documento de prerequisito. **No corregir todavía. No `firebase deploy`. No tocar RTDB. No iniciar 1.5.**

---

## 1. Método de verificación

- **Lado repo:** lectura de `firebase-database.rules.json` en `avatars-redesign@247644d` (autoritativo).
- **Lado desplegado:** lectura de las reglas activas vía **Firebase Console → Realtime Database → pestaña Rules** (solo lectura; sin CLI, sin deploy, sin tocar RTDB).
  - (El entorno de trabajo no dispone de credenciales privilegiadas —firebase CLI/gcloud/service account/DB secret— por lo que la lectura desplegada la realizó el usuario desde Console.)

---

## 2. Resultado — R-B = FAIL

| Punto | Repo (`247644d`) | Desplegado (Console) | Coincide |
|---|---|---|---|
| `pilotpay/deletedUsers` | ✅ **Presente** (`.read`/`.write`: `auth != null` + `.validate` tombstone: `userId`, `deletedAt`(number), `deletedBy`) | ❌ **NO aparece** | ❌ **NO** |
| `usuarios.$code` exige `pass` | ✅ `validate` exige `pass` (isString) | (sin confirmar específicamente; ver §6) | — |
| Identidad global repo↔desplegado | — | — | ❌ **Difieren** |

**Conclusión:** las reglas desplegadas **no contienen el bloque `deletedUsers`** que sí está en el repo. Confirma que el archivo de reglas del repo (donde `deletedUsers` se añadió en la rama de seguridad) **nunca se desplegó** — coherente con que en toda la migración 1.x **no se ejecutó `firebase deploy`**.

---

## 3. Impacto

- El **repo** contiene `pilotpay/deletedUsers`; las **reglas desplegadas no**.
- Por **deny-by-default** (root `.read/.write = false`), un path no declarado queda **bloqueado**.
- `purgeUser()` escribe **tombstones** en `pilotpay/deletedUsers/{userId}` antes de borrar los datos del usuario.
- Con las reglas desplegadas actuales, esa escritura sería **DENEGADA** → el tombstone **no se crea**.
- **Riesgo:** **resurrección de usuarios borrados** (sin tombstone, el sync multi-device puede recrear datos eliminados) y borrado incompleto/inconsistente, si se ejecuta un borrado **antes** de que `deletedUsers` esté en reglas desplegadas.

**Severidad actual: BAJA-LATENTE** — el riesgo solo se materializa **si se borra un usuario**. Hoy: no se están borrando usuarios; el flujo de borrado vive en el Admin (parcialmente Admin 2.0 congelado); ESH/BZP activos.

---

## 4. Opciones evaluadas

### Opción A — Fix puntual previo (desplegar solo el bloque `deletedUsers` antes de 1.5)
- **Pros:** cierra el riesgo de resurrección de inmediato; habilita borrado seguro ya.
- **Contras:** **un despliegue global de reglas adicional** (todo evento de reglas afecta a todos los dispositivos a la vez = riesgo). Innecesario si no se va a borrar nadie antes de 1.5.

### Opción B — Diferir a 1.5 (incluir `deletedUsers` en el despliegue global de reglas finales)
- **Pros:** **sin despliegue global extra**; `deletedUsers` entra junto a las reglas finales por claim de 1.5; menor riesgo agregado.
- **Contras:** mientras tanto, **no debe ejecutarse ningún borrado de usuario** (guardrail), o el tombstone fallaría.

---

## 5. Decisión recomendada

> ## ✅ Recomendado: **Opción B — diferir a 1.5**, con guardrail.

**Justificación (situación actual):**
- **No se están borrando usuarios** ahora → el riesgo está dormido.
- El **flujo de borrado** pertenece al **Admin (Admin 2.0 congelado)** → no hay vía activa para dispararlo en uso normal.
- **1.5 será la fase formal de reglas** (reglas finales por claim, sin tolerancia anónima, + purga de `pass` + cierre de Anonymous) → es el momento natural y de menor coste para desplegar también `deletedUsers`.
- Evita un **segundo evento global** de reglas por un riesgo que hoy no está activo.

**Guardrail mientras R-B siga FAIL:**
> ⛔ **NO ejecutar borrado de usuarios** (`purgeUser` / "Eliminar perfil") hasta que `deletedUsers` esté en las reglas **desplegadas** (se hará en 1.5). Si surgiera una necesidad imprevista de borrar un usuario antes de 1.5 → ejecutar **Opción A** (deploy puntual de `deletedUsers`) primero.

---

## 6. Acciones futuras para 1.5

1. **Desplegar reglas finales** (un único evento global) que incluyan:
   - `pilotpay/deletedUsers` (cerrar R-B).
   - Reglas por claim **sin tolerancia anónima** (absorbe diseño 1.3).
   - Ajuste de `usuarios.$code.validate`: dejar de exigir `pass` (tras la purga).
2. **Purga de `pass`** de `pilotpay/usuarios` (con backup previo).
3. **Deshabilitar Anonymous Auth**.
4. **Re-verificar R-B** post-deploy: reglas desplegadas == repo (byte a byte, incl. `deletedUsers`).
5. **Confirmar específicamente** en la lectura de 1.5 si `usuarios` desplegado exige `pass` hoy (quedó sin verificar en esta comprobación, que se centró en `deletedUsers`).
6. **Gates GO/NO-GO** propios de 1.5 + validación multi-dispositivo (evento de alto riesgo: reglas + datos).

---

## 7. Rollback esperado

- **Este prerequisito no despliega nada** → no requiere rollback.
- **Para 1.5 (cuando se ejecute):** rollback = re-desplegar el `firebase-database.rules.json` **actualmente desplegado** (guardar copia exacta desde Console **antes** del deploy de 1.5). La purga de `pass` requerirá **backup RTDB** previo para revertir datos.
- **Estado de cliente:** Fase 1.4 (`247644d`) es independiente de las reglas; su rollback propio sigue disponible (tag `pre-1.4-avatars-89d582e`, rama `phase-1.4-legacy-removal`, o `git revert 247644d`).

---

**Resumen:** R-B = **FAIL** (deployed sin `deletedUsers`). Riesgo bajo-latente (solo si se borra un usuario). Recomendación: **diferir a 1.5** con guardrail de "no borrar usuarios" hasta entonces. No se corrige ni despliega nada ahora.
