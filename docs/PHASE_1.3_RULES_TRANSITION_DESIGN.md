# FASE 1.3 — DISEÑO: REGLAS FIREBASE TRANSITORIAS POR CLAIM

**Fecha:** 2026-06-13
**Fase:** 1.3 — Coexistencia de reglas (Auth-claim + legacy/anónimo)
**Estado:** 📚 **DISEÑO HISTÓRICO — FASE NO EJECUTADA — ABSORBIDA EN FASE 1.5** (decisión 2026-06-17, ver §0-bis). No implementar. No tocar reglas/Firebase/producción.
**Depende de:** Fase 1.25 ✅ (cliente con doble login + embudo token + permisos role-aware).
**Riesgo de la fase:** **ALTO** — primer cambio **global e inmediato** de reglas (afecta a todos los dispositivos a la vez).

> ⚠️ **Hallazgo estratégico (leer primero, §6):** unas reglas transitorias que **toleran el token anónimo**
> (necesario mientras Anonymous siga habilitado y exista login legacy) **NO cierran R3** por sí solas — solo
> **validan/escenifican** el modelo por claim para de-riesgar la Fase 1.5. El blindaje real llega en 1.4 (borrar
> pass/legacy) + 1.5 (deshabilitar Anonymous + quitar tolerancia anónima). Esto condiciona el go/no-go.

---

## 0-bis. DECISIÓN ESTRATÉGICA (2026-06-17) — FASE 1.3 NO SE EJECUTA

**Decisión del usuario:** la Fase 1.3 **NO se ejecutará como fase independiente**. Se **fusiona en la Fase 1.5**.

**Estatus de este documento:** 📚 **diseño histórico** — fase **no ejecutada** — **absorbida en 1.5**.
Se conserva como referencia técnica (inventario de paths §1, matriz de acceso §2, riesgos Q1–Q8 §4)
que **alimentará el diseño de las reglas finales de 1.5**. NO representa trabajo a ejecutar.

**Motivo (confirmado):**
- Con solo **ESH y BZP migrados**, las reglas transitorias aportan poco valor.
- **No cierran R3**: toleran el token anónimo (§6) → la seguridad real no llega hasta 1.5.
- Añaden un **despliegue global extra de reglas** (evento de máximo riesgo) sin beneficio proporcionado.

**Contexto verificado en el momento de la decisión:**
- ✅ **Fase 1.25 publicada y verificada en producción** — `087c1ec` en `origin/avatars-redesign`;
  GitHub Pages sirviendo el build nuevo; bug TDZ `editarUsuario` resuelto en vivo.
- ✅ **Fase L cerrada** (limpieza RTDB de huérfanos).
- ✅ **Validaciones ESH/BZP realizadas:** Auth, legacy, offline, logout, permisos escopados (E3a), multi-dispositivo.
- ✅ **Auth ESH/BZP operativos** (login Auth PASS en ambos).
- ⚠️ **R-B** — reglas desplegadas vs repo: pendiente confirmar nodo `deletedUsers` antes de 1.5.
- ⚠️ **R-D** — claims `{code, role}` en el idToken: pendiente verificación formal (decodificar token) antes de 1.5.
- ✅ **R-A cerrado** — la precondición "1.25 en producción" (antes incumplida) queda resuelta con el push de `087c1ec`.

**Hoja de ruta resultante:**
1. ✅ **1.25** — publicada y verificada.
2. ⏭️ **1.4 — Retirada de legacy:** eliminar `pass` en claro + login legacy; migración total a Auth. *(siguiente fase real; NO iniciada)*
3. ⏭️ **1.5 — Reglas finales por claim SIN tolerancia anónima** + deshabilitar Anonymous Auth. **Absorbe el diseño de este documento (1.3).** *(NO iniciada)*

**Riesgos heredados a re-evaluar en 1.5:** R-B (reglas desplegadas == repo, incl. `deletedUsers`) y R-D (claims realmente presentes en el token).

---

## 1. INVENTARIO EXACTO DE PATHS RTDB (real, verificado por grep)

| Path | Estado | Notas |
|---|---|---|
| `pilotpay/usuarios/{code}` | Activo | Identidad + **`pass` texto plano** + bloqueado/temporal |
| `pilotpay/perfiles/{code}` | Activo | Perfil financiero (NIF, IRPF, fiscal) |
| `pilotpay/permisos` y `/{code}` | Activo | Alcance de cálculo (funciones/bases) |
| `pilotpay/historicos/{userId}/monthly/{ym}` | Activo (P4) | MonthRecords |
| `pilotpay/historicos/{userId}/auditorias/{id}` | Activo (P4) | AuditRecords (nominaV2) |
| `pilotpay/historicos/{userId}/deletedAuditorias/{id}` | Activo (P4) | Tombstones |
| `pilotpay/deletedUsers/{userId}` | Activo (admin) | Tombstones de usuarios |
| `pilotpay/solicitudes/{key}` | Activo | Solicitudes de cambio (user escribe, admin lee) |
| `pilotpay/userCodes/{code}` | Activo (CLI) | Mapping code→uid. **Escrito por Admin SDK (ignora reglas)**; el cliente NO lo lee/escribe aún |
| `pilotpay/analytics/{code}/events/{id}` | **Pausado (E3b)** | Sin regla → denegado; envío pausado en cliente |
| `pilotpay/rutas/{key}` | Retirado | Datos preservados; sin código cliente; regla presente |
| `pilotpay/diagnostics/...` | **No existe** | Solo etiqueta de texto en UI (8474); telemetría futura, no usado |

## 2. MATRIZ DE ACCESO POR PATH

Leyenda token: **anon** = token anónimo; **Auth** = token Email/Password con claims `{code, role}`.

### usuarios
- **Lee:** `loadUsersFromFirebase` (**nodo entero, PRE-login**), `doLogin`, panel admin. **Escribe:** `saveUserData` (campos propios `/{code}`), `doLogin` (auto-bloqueo temporal, pre-currentUser), `createUser`/`toggleBloqueo`/`atomicRoleChange`/`renombrar` (admin).
- **Token hoy:** anon. **Tras 1.25:** anon (pre-login) / Auth o anon (post-login).
- **Regla actual:** `auth != null` + validate (exige `pass`).
- **Regla transitoria:** **SIN CAMBIOS (sigue `auth != null`).** Constraint dura: `loadUsersFromFirebase` lee el **nodo entero pre-login** (para validar el login legacy) → **no se puede escopar hasta eliminar el login legacy (Fase 1.4)**. ⇒ **R2 (pass legible) persiste hasta 1.4.**

### perfiles/{code}
- **Lee:** `loadUserData` (propio). **Escribe:** `saveUserData` (propio), `createUser`/`atomicRoleChange`/purge (admin).
- **Token:** anon hoy / Auth o anon tras 1.25.
- **Regla actual:** `auth != null`.
- **Transitoria:** `auth.token.code === $code || role admin || (auth.token.code == null && auth != null)` → migrado escopado; **anon tolerado** (no migrado sigue).

### permisos (parent) y /{code}
- **Lee:** admin → **parent entero**; user → `/{code}` (E3a). **Escribe:** `savePermsToFirebase` (admin, **PATCH parent**), `createUser`/`atomicRoleChange` (admin, `/{code}`).
- **Token:** admin puede entrar por **legacy (anon)** o Auth; user igual.
- **Regla actual:** `auth != null`.
- **Transitoria:** `permisos: { ".read": "auth != null", ".write": "role admin || (code==null && auth!=null)", "$code": { ".read": "code===$code || role admin || (code==null && auth!=null)" } }`.
  - ⚠️ **Constraint:** un **admin que entra por legacy (anon)** NO tiene claim `role` → para que el panel admin siga leyendo el parent entero, el `.read` del parent debe **tolerar anon** durante la transición. Tightening (admin-only) → Fase 1.5.

### historicos/{userId}/** (P4)
- **Lee/Escribe:** P4 sink (propio `{userId}` = code), borrado auditoría (propio), monitor admin (**lee de otros** `{userId}`).
- **Token:** Auth o anon (embudo, según modo de sesión).
- **Regla actual:** `$userId: { auth != null }` + validates monthly/auditorias/tombstones.
- **Transitoria:** `$userId: { ".read": "auth.token.code === $userId || role admin || (code==null && auth!=null)", ".write": "auth.token.code === $userId || (code==null && auth!=null)" }` (manteniendo los `.validate` actuales).
  - Migrado → escopado a su `{userId}` (R3 cerrado **para él**). No migrado (anon) → tolerado. Monitor admin: por Auth (claim role) lee de otros; por legacy (anon) → tolerado durante transición.

### deletedUsers/{userId}
- **Escribe/Lee:** admin (tombstones, purga, verificación).
- **Transitoria:** `".read"/".write": "role admin || (code==null && auth!=null)"` (+ validate actual). Tolerancia anon hasta 1.5 (admin puede entrar legacy).

### solicitudes/{key}
- **Escribe:** user (propia). **Lee:** admin.
- **Transitoria:** mantener `auth != null` (estructura key=`{code}_{ts}`; no trivial de escopar por claim sin rediseñar la key). Endurecer en hardening posterior.

### userCodes/{code}
- **Escribe:** CLI (Admin SDK, ignora reglas). Cliente: no lo usa aún.
- **Transitoria:** denegar a clientes (`".read": "role admin"`, `".write": false` para clientes; Admin SDK sigue escribiendo). O dejar deny-by-default (no está en reglas). Recomendado: regla explícita read=admin, write=false.

### analytics, rutas, diagnostics
- **analytics:** mantener **sin regla** (deny) — el envío está pausado (E3b). No añadir regla en 1.3.
- **rutas:** sin cambios (retirado, datos preservados).
- **diagnostics:** no existe; no crear regla.

## 3. DISEÑO DE REGLAS TRANSITORIAS (propuesta, NO desplegar)

Patrón base — **"claim manda si existe; anónimo tolerado mientras Anonymous siga habilitado"**:
```jsonc
{
  "rules": {
    ".read": false, ".write": false,
    "pilotpay": {
      ".read": false, ".write": false,

      // usuarios: SIN CAMBIOS (legacy login lee el nodo entero pre-login). R2 hasta 1.4.
      "usuarios": {
        ".read": "auth != null",
        ".write": "auth != null",
        "$code": { ".validate": "!newData.exists() || (newData.hasChildren(['pass','name','funcion','nivel','base']) && ...)" }
      },

      "perfiles": {
        ".read": "auth != null",   // parent: tolerante (admin legacy + simplicidad); hijo escopa
        "$code": {
          ".read":  "auth.token.code === $code || root.child('...').isAdminClaim || auth.token.code == null",
          ".write": "auth.token.code === $code || auth.token.code == null"
        }
      },

      "permisos": {
        ".read":  "auth != null",                                   // admin lee parent (legacy incl.)
        ".write": "auth.token.role === 'admin' || auth.token.code == null",
        "$code": {
          ".read":  "auth.token.code === $code || auth.token.role === 'admin' || auth.token.code == null",
          ".validate": "!newData.exists() || newData.hasChildren(['funciones','bases'])"
        }
      },

      "historicos": {
        ".read": false, ".write": false,
        "$userId": {
          ".read":  "auth.token.code === $userId || auth.token.role === 'admin' || auth.token.code == null",
          ".write": "auth.token.code === $userId || auth.token.code == null",
          "monthly":   { "$mk": { ".validate": "<validate monthly actual>" } },
          "auditorias":{ "$id": { ".validate": "<validate auditorias actual>" } },
          "deletedAuditorias": { "$id": { ".validate": "<validate tombstone actual>" } }
        }
      },

      "deletedUsers": {
        ".read":  "auth.token.role === 'admin' || auth.token.code == null",
        ".write": "auth.token.role === 'admin' || auth.token.code == null",
        "$userId": { ".validate": "<validate actual>" }
      },

      "solicitudes": { ".read": "auth != null", ".write": "auth != null",
        "$key": { ".validate": "<validate actual>" } },

      "userCodes": {
        ".read":  "auth.token.role === 'admin'",
        ".write": false,                                            // solo Admin SDK
        "$code": { ".validate": "newData.hasChildren(['uid'])" }
      },

      "rutas": { ".read": "auth != null", ".write": "auth != null", "$key": { ".validate": "<actual>" } }
    }
  }
}
```
> `auth.token.code == null` = sesión **anónima** (sin claim) → **tolerancia transitoria**. Se elimina en 1.5.
> `auth.token.role === 'admin'` = solo lo tienen las cuentas Auth con claim admin (ESH).

**Lo que estas reglas cambian respecto a hoy:**
- **Añaden** escopado por claim en `perfiles/{code}`, `permisos/{code}`, `historicos/{userId}` **para usuarios migrados** (Auth).
- **Mantienen** acceso a no-migrados (anon) y a admin-legacy (anon) → **nadie pierde acceso**.
- `usuarios` intacto (R2 hasta 1.4).

## 4. RIESGOS
| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| Q1 | Bloqueo de sync (regla deniega `historicos`) | Alta | Tolerancia anon + claim propio; probar PATCH/pull migrado y no-migrado post-deploy |
| Q2 | Bloqueo de login | Media | `usuarios` intacto → legacy login no se toca; Auth login no depende de reglas de usuarios |
| Q3 | Admin sin acceso (panel/monitor) | Alta | `permisos` parent y `historicos` toleran anon → admin-legacy sigue; admin-Auth por claim role |
| Q4 | P4 denegado | Alta | `historicos/$userId` write = code propio o anon; sink usa embudo (token correcto) |
| Q5 | Caché PWA / dispositivos antiguos | Media | Cliente viejo usa anon → tolerado por las reglas; cache-busting al publicar 1.25 |
| Q6 | Rollback de reglas | — | Re-desplegar `firebase-database.rules.json` actual (inmediato) |
| Q7 | Claims no propagados | Media | Verificar `verify` de ESH/BZP (claims OK) antes del deploy; un token sin claim cae en la rama anon-tolerada |
| Q8 | Validates rotos al reescribir | Media | **Conservar textualmente** los `.validate` actuales (monthly/auditorias/tombstones/usuarios) |

## 5. ORDEN DE DESPLIEGUE / VALIDACIÓN / ROLLBACK
**Pre-requisitos:**
- [ ] Cliente 1.25 **publicado en producción** y verificado (ESH/BZP entran por Auth online) — **antes** de tocar reglas.
- [ ] Verificar reglas desplegadas actuales == repo (como G1).
- [ ] Backup RTDB completo.
- [ ] Tener a mano el `firebase-database.rules.json` actual para rollback.

**Despliegue:**
1. Desplegar reglas transitorias (§3) en consola Firebase.
2. **Validación inmediata multi-dispositivo:**
   - ESH Auth: panel admin completo (lee permisos parent + historicos de otros) ✓
   - BZP Auth: lee/escribe solo `historicos/BZP`, `perfiles/BZP`, `permisos/BZP` ✓; **denegado** leer `historicos/ESH` (R3 cerrado para migrado) ✓
   - Usuario/dispositivo no migrado (anon): sigue operando (tolerancia) ✓
   - P4 PATCH/pull HTTP 200 en migrado y no-migrado ✓
   - Login legacy intacto ✓
3. Ventana de observación.

**Rollback:** re-desplegar las reglas actuales (inmediato, sin pérdida de datos).

## 6. GO / NO-GO — HALLAZGO ESTRATÉGICO

**Las reglas transitorias NO cierran R3 mientras toleran el token anónimo.** Cualquier sesión anónima
(la API key pública permite obtenerla mientras Anonymous esté habilitado) cae en la rama
`auth.token.code == null && auth != null` → **acceso como hoy**. Es decir:
- ✅ Un usuario **migrado** (Auth) queda escopado → R3 cerrado **para él**.
- ❌ Pero un atacante con token **anónimo** sigue accediendo (tolerancia) → **R3 sigue abierto a nivel sistema**.

**Por tanto, el valor real de la Fase 1.3 es STAGING, no seguridad:** valida que las reglas por claim
**no rompen** a los usuarios migrados ni al admin, de modo que la Fase 1.5 (deshabilitar Anonymous + quitar la
tolerancia anon) sea de bajo riesgo. El blindaje efectivo de R3 ocurre en **1.5**.

**Decisión estratégica a tomar (dos opciones):**
- **Opción 1 — 1.3 como staging:** desplegar reglas transitorias ahora (valida claims sin romper nada),
  observar, y en 1.5 endurecer. Más pasos, más despliegues globales, pero cada uno de menor riesgo.
- **Opción 2 — fusionar 1.3 en 1.5:** NO desplegar reglas transitorias; ir directamente, tras 1.4 (borrar
  pass/legacy), a reglas finales por claim **sin tolerancia anon** + deshabilitar Anonymous en una tanda
  coordinada. Menos despliegues globales; el endurecimiento es un único evento de mayor riesgo pero mejor
  contenido (ya sin legacy/anon que tolerar).

**Recomendación:** dado que (a) solo hay **2 usuarios** (ESH/BZP, ambos migrados), (b) las transitorias no
aportan seguridad real mientras toleran anon, y (c) cada despliegue de reglas es un evento global de riesgo
alto — **evaluar seriamente la Opción 2** (fusionar 1.3→1.5). La Opción 1 tiene sentido con muchos usuarios
migrando gradualmente; con 2 usuarios ya migrados, el staging aporta poco frente al coste de un despliegue
global extra. **Decisión del usuario requerida antes de avanzar.**

**Veredicto del diseño:** Reglas transitorias **diseñadas y listas**, pero **GO condicionado** a:
1. Resolver la decisión estratégica (Opción 1 vs 2).
2. Publicar y validar el cliente 1.25 en producción primero.
3. Spec ejecutable + go/no-go específicos (JSON final, matriz de acceso probada, plan de rollback) antes de desplegar.

**FIN DEL DISEÑO 1.3 — Decisión tomada (2026-06-17): Opción 2 (fusionar 1.3 → 1.5).**
**Esta fase NO se ejecuta de forma independiente. Documento conservado como diseño histórico / insumo de 1.5.**
