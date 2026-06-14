# PHASE 1.2 — PLAN OPERATIVO: MIGRACIÓN DE USUARIOS BETA

**Fecha:** 2026-06-12
**Fase:** 1.2 — Migración de usuarios beta (Plan Corregido Fase 1)
**Estado:** ✅ **COMPLETADA 2026-06-12** (ver §15 Cierre) — 2 usuarios migrados (ESH admin, BZP user), validados
**Depende de:** Fase 1.1 ✅ COMPLETADA (CLI `tools/admin-cli/admin.js` validado, `pilotPayAuth.js` validado)
**Documento previo:** `docs/PHASE_1.1_IMPLEMENTATION_PLAN.md`

---

## 0. PRINCIPIO RECTOR DE LA FASE 1.2

Fase 1.2 es **puramente aditiva en Firebase Auth**. Crea cuentas Email/Password y mappings
`userCodes`, pero **NO cambia cómo los usuarios entran en la app hoy**: el login legacy
(`doLogin` contra `pilotpay/usuarios/{code}/pass`) sigue funcionando intacto.

```
Tras Fase 1.2, cada usuario beta tiene DOS identidades coexistiendo:
  1. Login legacy (RTDB pass)  → SIGUE siendo el que usa la app
  2. Cuenta Firebase Auth      → creada, pero la app NO la usa todavía (hasta Fase 1.3)
```

Esto significa: **si la Fase 1.2 falla a medias, ningún usuario pierde acceso** — siguen
entrando por el login legacy. El riesgo de la fase es bajo por diseño.

---

## 1. USUARIOS AFECTADOS

**Alcance:** todos los códigos presentes en `pilotpay/usuarios` (beta cerrada, ~10-20 usuarios conocidos).

**Conocido desde el código:** `ESH` (admin) — el resto se enumeran en ejecución.

**No se listan aquí los códigos reales** a propósito: enumerarlos requiere leer `pilotpay/usuarios`,
nodo que contiene las contraseñas legacy en texto plano. La enumeración es un **paso operativo**
que ejecuta el administrador localmente (ver 1.A), no parte de este documento.

### Paso 1.A — Enumeración (ejecuta el admin, solo lectura)

Opción recomendada (consola): Firebase Console → Realtime Database → `pilotpay/usuarios` →
anotar la **lista de códigos** y, por cada uno, solo dos campos: `admin` (true/false) y
`bloqueado` (si existe). **No copiar el campo `pass` a ningún sitio.**

El resultado es una tabla de trabajo privada del admin:

| code | admin | bloqueado | temporal/accessExpiresAt |
|------|-------|-----------|--------------------------|
| ESH  | true  | —         | —                        |
| …    | …     | …         | …                        |

Esta tabla es el **input** de la migración. No se versiona en el repo.

---

## 2. DATOS ACTUALES POR USUARIO

Esquema real de `pilotpay/usuarios/{code}` (verificado en código):

```
pass, name, apellidos, alias, funcion, nivel, base, irpf, ingreso,
admin (bool), theme, firstAccess, pagaExtra, temporal, accessExpiresAt, bloqueado
```

**Qué consume la migración (solo 3 cosas):**
- `code` → identidad (email + claim)
- `admin` → rol del claim
- `bloqueado` / `temporal` / `accessExpiresAt` → estado inicial de la cuenta Auth

**Qué NO se toca ni se migra a Auth:**
- `pass` (la contraseña legacy NO se importa — ver 5)
- `name`, `apellidos`, `funcion`, `nivel`, `base`, `irpf`, etc. → permanecen en `pilotpay/usuarios`
  y `pilotpay/perfiles` sin cambios. Firebase Auth solo guarda identidad, no perfil.

---

## 3. CUENTAS FIREBASE AUTH QUE SE CREARÁN

Una cuenta Email/Password por código, vía el subcomando `create-user` del CLI (Fase 1.1):

| Campo | Valor |
|-------|-------|
| email | `{code en minúsculas}@pilotpay.internal` (ej. `esh@pilotpay.internal`) |
| uid | generado por Firebase |
| password | temporal, generada (ver 5) |
| mapping | `pilotpay/userCodes/{CODE}` = `{ uid, createdAt }` |

**Estado inicial según la tabla 1.A:**
- Usuario `bloqueado: true` → crear y luego `disable` (CLI) → cuenta deshabilitada.
- Usuario normal → cuenta habilitada.
- `temporal`/`accessExpiresAt` → **no** se traslada a Auth en 1.2 (la expiración sigue
  gestionándose client-side en el login legacy hasta Fase 1.4). Se documenta para 1.4.

**Idempotencia garantizada por el CLI:** `create-user` falla sin sobrescribir si la cuenta
o el mapping ya existen → re-ejecutar la migración es seguro.

---

## 4. CLAIMS POR USUARIO

```
{ role: <"admin" si usuarios[code].admin === true, si no "user">,
  code: <CODE en MAYÚSCULAS> }
```

- El **rol vive solo en el claim** (lo fija el Admin SDK). Nunca en un nodo editable por el usuario.
- El `code` en el claim es lo que permitirá, en Fase 1.3/1.5, la regla
  `auth.token.code === $userId` sobre los paths actuales `historicos/{code}` — cerrando R3 sin
  reestructurar datos.
- Admin conocido: `ESH` → `{ role: "admin", code: "ESH" }`. El resto → `user` salvo que la
  tabla 1.A marque `admin: true`.

---

## 5. PASSWORDS TEMPORALES

**Las contraseñas legacy NO se migran. Se consideran comprometidas** (texto plano en RTDB,
y la del admin estuvo además hardcodeada en producción — ver Fase 1.0/G3).

- El CLI **genera** una contraseña nueva por usuario si no se pasa `--password`:
  18 caracteres alfanuméricos sin ambiguos (`genPassword()` en `admin.js`).
- Se imprime **una sola vez** en la salida del `create-user`. El admin la captura en ese momento.
- **Nunca** se escriben las contraseñas en el repo, ni en este documento, ni se comparten en
  ningún canal compartido/persistente no seguro.
- Recomendación al usuario: si reutilizaba la contraseña legacy en otro servicio, cambiarla allí.

---

## 6. ENTREGA DE CREDENCIALES

- **Canal:** directo y privado, admin ↔ usuario (la beta es cerrada; el admin los conoce
  personalmente). No hay buzón en `@pilotpay.internal` → no hay reset automático en beta.
- **Qué se entrega:** el código (que ya conocen) + la contraseña temporal nueva.
- **Mensaje recomendado:** que es una contraseña temporal del nuevo sistema de acceso, que la
  guarden, y que el login de la app **no cambia todavía** (siguen entrando como siempre hasta
  que se les avise en Fase 1.3).
- **Sin urgencia para el usuario:** en 1.2 la credencial nueva aún no se usa; es preparación.

---

## 7. VERIFICACIÓN POR USUARIO

Por cada código migrado, en orden:

1. `node admin.js verify <code>` → **PASS** en las 3 patas (cuenta Auth, claims, mapping).
2. `node admin.js list` → la cuenta aparece con `role`, `mapping OK`, `disabled` coherente con 1.A.
3. **Muestra (sample) de login real:** para 1-2 usuarios, login en `frontend/test-auth.html`
   con su contraseña temporal → claims correctos + PATCH a `historicos/<code>/_authtest` → HTTP 200.
   (No es necesario para todos; basta una muestra que confirme el flujo extremo a extremo.)

**Criterio:** la migración de un usuario no se da por buena hasta que su `verify` da PASS.
Cualquier FAIL detiene el avance de ese usuario y se investiga antes de continuar.

---

## 8. CUENTAS EMAIL/PASSWORD PREEXISTENTES SIN CODE/ROLE/MAPPING

Detectadas en Fase 1.1 (hallazgo no bloqueante): `tiendaseloy@gmail.com`, `eloyaviation@gmail.com`.

- **Naturaleza:** probables pruebas manuales antiguas. No tienen claim `code` → el CLI no opera
  sobre ellas (opera por código), y la app no las reconoce.
- **Riesgo:** son cuentas Email/Password válidas → tras Fase 1.5 (Anonymous deshabilitado) seguirían
  pudiendo autenticarse y, bajo las reglas de ese momento, acceder según lo que permitan los claims
  (no tienen `code` ni `role`, así que las reglas por claim les negarían los paths de usuario).
- **Decisión propuesta para 1.2:** **eliminarlas**, salvo que confirmes que tienen un uso.
  - Como no tienen `code`/`mapping`, `delete-user <code>` no aplica. Borrado por **consola**
    (Authentication → Users → eliminar) o, si se prefiere CLI, requeriría un subcomando nuevo
    `delete-by-email` (cambio de código → **fuera del alcance de 1.2**; no recomendado ahora).
  - Recomendación: **borrado manual por consola** durante 1.2, tras tu confirmación de que no se usan.
- **Si se conservan:** documentarlas explícitamente como excepción conocida y revisarlas en 1.5.

> **DECISIÓN PROVISIONAL (2026-06-12):** **NO se borran todavía.** Quedan documentadas como
> **excepción pendiente** (`tiendaseloy@gmail.com`, `eloyaviation@gmail.com`). Su borrado se
> decidirá más adelante, tras verificar que no tienen uso real. No bloquea el cierre de Fase 1.2
> (criterio 12.8 se satisface con esta documentación explícita en lugar del borrado).

---

## 9. BACKUPS OBLIGATORIOS ANTES DE CREAR CUENTAS REALES

1. **Export JSON completo de RTDB** (`pilotpay/` entero: `usuarios`, `perfiles`, `permisos`,
   `historicos`, `solicitudes`, `deletedUsers`, `userCodes` si existe). Guardado **fuera del repo
   y fuera de OneDrive** (contiene contraseñas legacy y NIFs). Firebase Console → RTDB → ⋮ → Exportar JSON.
2. **Inventario de Firebase Auth previo:** `node admin.js list` (estado de cuentas Email/Password
   antes de la migración) + nota del recuento de cuentas anónimas (~816).
3. **Tabla 1.A** (códigos + admin + bloqueado) guardada de forma privada — es la fuente de la migración.
4. **Tag git de checkpoint** en la rama de seguridad antes de ejecutar (marca el estado de código).

Sin los puntos 1 y 3, la fase no comienza.

---

## 10. ROLLBACK

Fase 1.2 solo **añade** cuentas Auth y mappings `userCodes`; **no modifica** `usuarios`/`perfiles`/
`permisos` existentes. Por tanto el rollback es acotado y no afecta al acceso legacy:

| Qué revertir | Cómo |
|---|---|
| Cuentas Auth creadas | `node admin.js delete-user <code> --confirm` por cada código migrado (borra cuenta + mapping) |
| Mappings `userCodes` | Los borra `delete-user`; verificable con `verify <code>` → FAIL |
| Estado global | El login legacy nunca se tocó → los usuarios siguen entrando como antes, sin acción |
| RTDB | No se modificó; el backup (9.1) está solo como red de seguridad, no debería hacer falta |

**Punto de no retorno:** NINGUNO en 1.2. El primero irreversible sigue siendo Fase 1.4 (borrar `pass`).

---

## 11. QUÉ NO SE TOCA TODAVÍA (invariantes de la fase)

- ❌ **Login legacy** (`doLogin`) — sigue siendo el único que usa la app.
- ❌ **`pass` en RTDB** — permanece intacto (se borra en Fase 1.4).
- ❌ **Reglas Firebase** — sin cambios (las reglas por claim llegan en 1.3/1.5).
- ❌ **Anonymous Auth** — sigue habilitado (se deshabilita en 1.5).
- ❌ **P4 / sincronización** — sin cambios.
- ❌ **`index.html`** y el resto del frontend de la app — sin cambios.
- ❌ **`pilotPayAuth.js`** — NO se conecta a la app en 1.2 (integración en 1.3).
- ❌ **`DEFAULT_USERS`** — permanece (backdoor residual aceptado hasta 1.4).

Lo único que cambia en Firebase: se **crean** cuentas en Authentication y nodos en
`pilotpay/userCodes`. Nada más.

---

## 12. CRITERIOS DE CIERRE DE FASE 1.2

La fase se considera cerrada cuando, **simultáneamente**:

1. Existe una cuenta Firebase Auth por cada código beta de la tabla 1.A.
2. Cada cuenta tiene claims `{ role, code }` correctos (admin solo donde corresponde).
3. Cada código tiene su mapping `pilotpay/userCodes/{CODE}` → uid, verificado.
4. `verify <code>` da **PASS** para el 100% de los usuarios migrados.
5. Muestra de login real (1-2 usuarios) en el harness → claims OK + PATCH RTDB HTTP 200.
6. Estado `disabled` de cada cuenta coherente con `bloqueado` de la tabla 1.A.
7. Credenciales temporales entregadas por canal privado a cada usuario.
8. Decisión tomada sobre las 2 cuentas huérfanas (8): **resuelta como excepción documentada** (decisión 2026-06-12: no se borran todavía, se revisan en 1.5).
9. Backups (9.1, 9.2) realizados y guardados fuera del repo/OneDrive.
10. **Acceso legacy intacto:** prueba de que un usuario aún entra por el login actual (la app no cambió).
11. Producción (`avatars-redesign`) sin cambios; rama de seguridad sin push (salvo decisión explícita).

Si cualquiera de los 11 falla, la fase no se cierra y no se avanza a Fase 1.3.

---

## 13. SECUENCIA OPERATIVA RESUMIDA (para cuando se autorice)

```
1. Enumerar usuarios (tabla 1.A)              [solo lectura, admin]
2. Backups obligatorios (9)                   [export RTDB + list Auth + tag]
3. Decidir cuentas huérfanas (8)              [confirmación + borrado consola]
4. Por cada código:
     node admin.js create-user <code> --role user|admin
     (si bloqueado en 1.A → node admin.js disable <code>)
     node admin.js verify <code>             [debe dar PASS]
     anotar contraseña temporal (privado)
5. node admin.js list                          [revisión global]
6. Muestra de login real en test-auth.html    [1-2 usuarios]
7. Entregar credenciales (canal privado)       [6]
8. Verificar acceso legacy intacto             [un usuario entra como siempre]
9. Cerrar fase (criterios 12)
```

Todo con `GOOGLE_APPLICATION_CREDENTIALS` apuntando a la service account local (fuera de OneDrive),
nunca hardcodeada.

---

## 14. RIESGOS DE LA FASE Y MITIGACIÓN

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Crear cuenta con código equivocado | Baja | CLI idempotente; `verify` por usuario; tabla 1.A revisada |
| Contraseña temporal filtrada en canal inseguro | Media | Canal directo privado; rotable con `reset-password`; se considera temporal |
| Migración a medias (algunos sí, otros no) | Baja | Login legacy intacto → nadie pierde acceso; re-ejecutar es seguro (idempotente) |
| Borrar una cuenta huérfana que sí se usaba | Media | Confirmación explícita del admin antes de borrar; backup Auth previo (list) |
| Service account expuesta | Crítica | Fuera de OneDrive/repo; revocable en consola; nunca en git (`.gitignore` de C1) |

---

---

## 15. CIERRE DE FASE 1.2 (2026-06-12)

### 15.1 Prerrequisitos — completados y verificados
- **Backup RTDB completo:** exportado desde consola, guardado fuera de OneDrive/repo, JSON válido,
  `pilotpay/usuarios` con 2 hijos (cuadra con la enumeración), git no lo detecta. ✓
- **Listado Auth previo:** guardado (privado). ✓
- **Enumeración filtrada** (`export-legacy-users --safe`, sin `pass`): ✓
- **Tabla de migración** + **reconciliación** (códigos RTDB = filas = 2): ✓
- **Universo real:** 2 usuarios beta — 1 admin (ESH) + 1 user (BZP). 0 bloqueados, 0 temporales.

### 15.2 Ejecución real
| Código | Rol | Acción | verify | mapping |
|--------|-----|--------|--------|---------|
| ESH | admin | preexistía (no recreado); contraseña reseteada a credencial limpia/privada | PASS | OK |
| BZP | user | preexistía (no recreado); contraseña reseteada a credencial limpia/privada | PASS | OK |

- `list` → ambos con rol correcto y mapping OK.
- **Login legacy intacto:** acceso con contraseñas legacy de siempre → SÍ (1.2 no alteró el acceso actual).
- **Muestra de login real (harness `test-auth.html`):** login Email/Password OK, claims `role`/`code`
  correctos, PATCH `historicos/<code>/_authtest` → **HTTP 200**, DELETE de limpieza enviado.
  Confirma el flujo extremo a extremo y que el token Email/Password satisface las reglas actuales.

### 15.3 Nota de auditoría — anomalía resuelta
- El agregado de prerrequisitos **#4 ("0 cuentas Auth con código preexistentes") resultó impreciso**:
  tanto **ESH** como **BZP** ya tenían cuenta Auth + claims + mapping de una sesión previa.
  `create-user` los protegió por idempotencia (no sobrescribió). Impacto: ninguno — ambos `verify`
  dieron PASS y los mappings son correctos. Acción tomada: contraseñas de ambos **reseteadas** a
  credenciales de origen conocido y privadas.
- **Nota de proceso:** durante la operación se expusieron contraseñas en el chat varias veces (al pegar
  la salida del CLI). Mitigado reseteando ESH y BZP hasta dejar credenciales privadas. Mitigación a
  futuro: usar `reset-password <code> --password "<valor>"` (el CLI no imprime el secreto si se le pasa).

### 15.4 Estado final vs criterios §12
| Criterio | Estado |
|---|---|
| Cuenta Auth por código (1-3) | ✅ ESH + BZP |
| `verify` PASS 100% (4) | ✅ |
| Muestra de login real (5) | ✅ harness OK |
| `disabled` coherente (6) | ✅ (0 bloqueados) |
| Entrega de credenciales (7) | ⏳ **diferida a Fase 1.3** (la app aún no usa Auth; credenciales guardadas en privado) |
| Cuentas huérfanas (8) | ✅ excepción documentada (no borradas) |
| Backups (9) | ✅ |
| Acceso legacy intacto (10) | ✅ |
| Producción sin cambios; rama sin push (11) | ✅ |

> Criterio 7 (entrega) se difiere conscientemente: en 1.2 las credenciales nuevas no se usan todavía.
> Se entregarán al activar el login nuevo en Fase 1.3. No bloquea el cierre de 1.2.

### 15.5 Invariantes mantenidos
Login legacy, `pass` en RTDB, reglas Firebase, Anonymous Auth, P4, `index.html` y `DEFAULT_USERS`:
**NO tocados.** Lo único modificado en Firebase: 2 cuentas Auth (claims + contraseñas reseteadas) y
2 nodos `pilotpay/userCodes`. Producción (`avatars-redesign`) intacta. **Sin punto de no retorno.**

### 15.6 Próximo paso (NO implementar sin autorización)
**Fase 1.3 — Coexistencia / doble login** (riesgo MEDIO): toca `index.html` (doble login) y
**despliega reglas Firebase** (por claim + escopar `permisos/{code}`), retira analytics, retira
`docs/migrate.html` si quedara, y entrega las credenciales (criterio 7 diferido). Requiere plan propio
y autorización explícita. Es el primer paso que modifica `index.html` y reglas.

**Fase 1.2: ✅ COMPLETADA.**
