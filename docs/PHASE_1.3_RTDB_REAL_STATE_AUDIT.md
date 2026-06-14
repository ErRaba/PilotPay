# FASE 1.3 — AUDITORÍA DEL ESTADO REAL DE RTDB

**Fecha:** 2026-06-13
**Objetivo:** decidir con fundamento Opción 1 (1.3 transitoria) vs Opción 2 (fusionar 1.3→1.5) auditando el estado real de `/pilotpay`.
**Estado:** 🟡 AUDITORÍA — solo lectura. NO escribir/borrar/modificar reglas/Firebase/producción.
**Método:** parte **verificada** (gates previos + código) + parte **a confirmar en vivo** por Eloy con script de solo lectura (§B). **No se imprimen valores sensibles** (pass, NIF, fiscal, emails).

---

## A. INVENTARIO POR NODO (verificado + pendiente de confirmación live)

| Nodo | Existe | nº hijos | Códigos | Sensible | ¿pass/cred? | ¿fiscal/laboral? | Lee (código) | Escribe (código) | Regla actual | Regla futura |
|---|---|---|---|---|---|---|---|---|---|---|
| `usuarios` | ✅ (verif. backup) | **2** (verif. backup) | ESH, BZP | Alta | **SÍ `pass` texto plano** (verif. G3) | nivel/funcion/base | `loadUsersFromFirebase` (entero, pre-login), `doLogin`, admin | `saveUserData`(propio), `doLogin`(auto-block), admin fns | `auth!=null`+validate(pass) | **sin cambios hasta 1.4** (legacy lee entero pre-login) |
| `perfiles` | ✅ | ⬜ (live) | ⬜ | **Alta** (NIF, IRPF, fiscal) | no | **SÍ** | `loadUserData`(propio) | `saveUserData`(propio), admin | `auth!=null` | claim `code===$code`‖admin‖anon |
| `permisos` | ✅ | ⬜ (live) | ⬜ | Baja | no | funciones/bases | `loadPermsFromFirebase`(admin entero / user `/{code}`) | `savePerms`(admin), admin fns | `auth!=null` | parent admin‖anon; hijo claim |
| `historicos` | ✅ (ESH verif.) | ⬜ (live, parent .read=false) | ESH(+?) | **Alta** (nominaV2) | no | **SÍ** (nóminas) | P4 sink(propio), monitor admin(otros) | P4 sink(propio), borrado | `$userId:auth!=null` | claim `code===$userId`‖admin‖anon |
| `deletedUsers` | ⬜ (live) | ⬜ | ⬜ | Media | no | no | verificación purga (admin) | tombstones (admin) | `auth!=null`+validate | admin‖anon |
| `solicitudes` | ⬜ (live) | ⬜ | ⬜ | Media | no | no | admin | user(propia) | `auth!=null`+validate | `auth!=null` (key no escopable trivial) |
| `userCodes` | ✅ (CLI 1.2) | **≥2** (ESH,BZP verif. 1.2) | ESH, BZP | Baja | no (uid) | no | (cliente no lo usa) | **CLI Admin SDK** | (sin regla → deny clientes) | read=admin, write=false |
| `analytics` | ❌ **NO EXISTE** (verif. G2) | 0 | — | — | no | (buffer local sí) | `uploadBatch`(pausado E3b) | pausado | sin regla (deny) | sin regla (deny) |
| `rutas` | ✅ (retirado, datos preservados) | ⬜ (live) | — | Baja | no | no (rutas ICAO) | (sin código cliente) | (sin código cliente) | `auth!=null`+validate | sin cambios |
| `diagnostics` | ❌ no existe | — | — | — | — | — | — | — | — (solo etiqueta UI) | no crear |

**Leyenda:** ⬜ = pendiente de confirmar en vivo (§B). "verif." = ya verificado en gate/código previo.

## B. MÉTODO DE LECTURA SEGURA (ejecuta tú; imprime SOLO conteos y códigos, nunca valores)

**Opción recomendada — script Admin SDK de solo lectura** (lee todo, incluido `historicos` cuyo parent tiene `.read=false` para clientes). Crea un archivo **temporal** en `tools/admin-cli/` (no se commitea), ejecútalo y bórralo:

```js
// tools/admin-cli/_tmp_rtdb_audit.mjs   (TEMPORAL — borrar tras usar)
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
initializeApp({ credential: applicationDefault(),
  databaseURL: 'https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app' });
const db = getDatabase();
const nodes = ['usuarios','perfiles','permisos','historicos','deletedUsers','solicitudes','userCodes','analytics','rutas'];
for (const n of nodes) {
  const snap = await db.ref('pilotpay/' + n).get();   // Admin SDK ignora reglas
  if (!snap.exists()) { console.log(n.padEnd(13), '→ NO EXISTE'); continue; }
  const keys = Object.keys(snap.val() || {});
  console.log(n.padEnd(13), '→', keys.length, 'hijos:', keys.join(','));   // SOLO claves (códigos), nunca valores
  if (n === 'historicos') {
    const v = snap.val() || {};
    for (const c of keys) {
      const s = v[c] || {};
      console.log('   ', c.padEnd(8),
        'monthly:'    + (s.monthly ? Object.keys(s.monthly).length : 0),
        'auditorias:' + (s.auditorias ? Object.keys(s.auditorias).length : 0),
        'deletedAud:' + (s.deletedAuditorias ? Object.keys(s.deletedAuditorias).length : 0));
    }
  }
}
process.exit(0);
```
Ejecutar:
```powershell
cd "C:\Users\EloyI\OneDrive\PilotPay\PilotPay Beta 2.2\tools\admin-cli"
$env:GOOGLE_APPLICATION_CREDENTIALS="RUTA_LOCAL_PRIVADA"
node _tmp_rtdb_audit.mjs
Remove-Item _tmp_rtdb_audit.mjs    # limpieza
```
> Imprime SOLO nombres de nodo, conteos y **códigos** (ESH/BZP/...). **No** imprime pass, NIF, ni datos fiscales (nunca accede a `val[code]` salvo para contar sub-hijos de `historicos`). El snapshot transita memoria pero no se imprime — mismo principio que `export-legacy-users --safe`.

**Alternativa ligera (sin SDK)** — en DevTools de la app (logueado), `?shallow=true` devuelve solo claves; **limitación:** `historicos` parent tiene `.read=false` → no enumera; solo sirve para los demás nodos.

## C. AGREGADOS A DEVOLVER (rellena tras ejecutar §B)
```
usuarios     : N hijos  → códigos: ____   (esperado 2: ESH, BZP)
perfiles     : N hijos  → códigos: ____
permisos     : N hijos  → códigos: ____
historicos   : N hijos  → códigos: ____   (por code: monthly/auditorias/deletedAud)
deletedUsers : N hijos  → códigos: ____
solicitudes  : N hijos
userCodes    : N hijos  → códigos: ____   (esperado 2: ESH, BZP)
analytics    : NO EXISTE (esperado)
rutas        : N hijos
otros nodos inesperados bajo /pilotpay: ____
```

## D. CONFIRMACIONES DIRIGIDAS (puntos 4-10 del encargo)
1. **¿`usuarios.pass` sigue presente?** SÍ (verificado G3: ESH/pass rotada; el campo existe). Confirmar que BZP también tiene `pass` (debería). → R2 vivo hasta 1.4.
2. **¿`historicos` solo ESH/BZP o más códigos?** ⬜ — el script §B lo revela. **Códigos distintos de ESH/BZP = posibles huérfanos** (usuarios antiguos borrados sin purgar su histórico).
3. **¿`permisos` solo ESH/BZP o más?** ⬜ — §B. Códigos extra = huérfanos.
4. **¿`analytics` tiene datos pese a pausa?** NO (verificado G2: nodo inexistente). Confirmar que sigue inexistente.
5. **¿Datos bajo usuarios eliminados / códigos antiguos?** ⬜ — comparar códigos de `historicos`/`perfiles`/`permisos` vs `usuarios` (2). Cualquier code en histórico/perfil/permiso que **no** esté en `usuarios` = **huérfano**.
6. **¿Nodos legacy/muertos?** `analytics` (inexistente), `rutas` (retirado, datos preservados a propósito), `diagnostics` (no existe). Confirmar que no hay nodos inesperados adicionales.
7. **¿`userCodes` solo ESH/BZP?** Esperado sí (CLI 1.2). Confirmar que no hay mappings huérfanos (de ZZT/ZZA borrados — debieron eliminarse con `delete-user`).

## E. RIESGOS DETECTADOS (en función del resultado)
| Hallazgo posible | Riesgo | Acción |
|---|---|---|
| Códigos en `historicos`/`perfiles`/`permisos` fuera de {ESH,BZP} | Datos huérfanos de usuarios antiguos → con reglas por claim quedarían **inaccesibles** (sin claim que los reclame) y sin propietario | Fase de **limpieza** previa (decidir borrar/archivar) |
| `userCodes` con ZZT/ZZA u otros | Mappings huérfanos de pruebas | Limpieza menor |
| `deletedUsers` con tombstones antiguos | Trazabilidad; sin riesgo de acceso | Revisar; GC futuro |
| `usuarios.pass` presente (confirmado) | **R2** legible por cualquier sesión auth | Cierra en **1.4** (borrar pass + legacy) |
| `analytics` con datos (no esperado) | Contradiría G2 | Investigar reglas desplegadas |

## F. RESUMEN EJECUTIVO
Por lo ya verificado: **2 usuarios** (ESH, BZP), ambos migrados a Auth (1.2); `analytics` inexistente (G2);
`usuarios.pass` presente (G3); `userCodes` con ESH/BZP (CLI). Falta confirmar en vivo (§B/§C) los conteos de
`perfiles`, `permisos`, `historicos`, `deletedUsers`, `solicitudes`, `rutas` y —crítico— **si existen códigos
huérfanos** fuera de {ESH, BZP} en los nodos de datos.

## G. RECOMENDACIÓN ESTRATÉGICA (provisional, a firmar con §C)

**Inclinación: Opción 2 (fusionar 1.3 → 1.5), condicionada a "sin huérfanos".**
- Con **solo 2 usuarios ya migrados**, las reglas transitorias 1.3 (que toleran anónimo) **no aportan seguridad real** (R3 sigue abierto vía anon) y solo añaden un despliegue global de riesgo alto para "ensayar". El ensayo aporta poco con 2 usuarios controlados.
- Camino más limpio: **1.4** (borrar `pass` + retirar login legacy + `DEFAULT_USERS`) → **1.5** (reglas finales por claim **sin tolerancia anon** + deshabilitar Anonymous), en una secuencia coordinada. Se evita el despliegue transitorio intermedio.

**PERO** la decisión depende de §C:
- **Si `historicos`/`perfiles`/`permisos` contienen solo {ESH, BZP} y `userCodes` solo {ESH, BZP}** → base limpia → **Opción 2** clara (saltar transitoria, ir a 1.4→1.5).
- **Si hay códigos huérfanos** (datos de usuarios antiguos sin propietario) → **insertar una Fase intermedia de LIMPIEZA** antes de endurecer reglas, porque con reglas por claim esos datos huérfanos quedarían inaccesibles y sin dueño (ni borrados ni reclamables). Limpiar primero, endurecer después.

**Tercera vía contemplada:** **fase de limpieza** (si hay huérfanos) → luego Opción 2. Es la combinación más probable si §C revela códigos antiguos.

## H. RECOMENDACIÓN FINAL
1. Ejecuta §B (script temporal de solo lectura) y rellena §C.
2. Con esos conteos: si base limpia → **Opción 2**; si huérfanos → **limpieza + Opción 2**.
3. En ningún escenario las transitorias (Opción 1) parecen el mejor uso de un despliegue global de reglas con 2 usuarios. **Salvo** que planees onboarding inmediato de muchos usuarios nuevos no migrados (entonces el staging de Opción 1 recobra sentido).

---

## I. RESULTADO LIVE (2026-06-13) — verificado por Eloy

| Nodo | nº | Códigos | Diagnóstico |
|---|---|---|---|
| `usuarios` | 2 | BZP, ESH | ✅ usuarios reales |
| `perfiles` | 6 | BZP, ESH, **FLZ, PRK, RBK, TEST_RULES_DEBUG** | ⚠️ **4 huérfanos** (sin entrada en `usuarios`) |
| `permisos` | 2 | BZP, **TEST** | ⚠️ **TEST huérfano**; ⚠️ **falta ESH** (ver Q7) |
| `historicos` | 1 | ESH (monthly 5 / auditorias 5 / **deletedAud 19**) | ✅ sin huérfanos; BZP sin histórico (nunca sincronizó) |
| `deletedUsers` | 3 | TEST, TEST_REAL, TEST_VALIDACION | tombstones de pruebas |
| `solicitudes` | — | NO EXISTE | normal |
| `userCodes` | 2 | BZP, ESH | ✅ limpio |
| `analytics` | — | NO EXISTE | ✅ esperado (G2 / E3b) |
| `rutas` | 8 | 6012/6014/6015/6017/6072/6073/6074/6075 (ICAO) | reservado (retirado Beta 3.0, datos preservados) |

**Hallazgo de fondo:** los huérfanos en `perfiles` (FLZ/PRK/RBK) **sin** entrada en `usuarios` ni tombstone en
`deletedUsers` confirman empíricamente el **gap de borrado** documentado en CLAUDE.md §13.15 ("borrado real" es
objetivo, no estado actual): borrados pasados eliminaron `usuarios` pero dejaron `perfiles` atrás.

## J. ANÁLISIS (8 preguntas)

**Q1 · ¿Qué huérfanos son seguros de limpiar?**
- ✅ **Seguro (artefactos de prueba):** `perfiles/TEST_RULES_DEBUG`, `permisos/TEST`.
- 🟡 **Limpiar CON confirmación (PII real):** `perfiles/FLZ`, `perfiles/PRK`, `perfiles/RBK` — son códigos con pinta de
  usuarios reales y **contienen datos fiscales** (NIF/IRPF). No están en `usuarios` (no pueden loguear) ni tienen
  `historicos`. Casi seguro ex-beta-testers eliminados a medias. **No auto-borrar**: requieren tu confirmación de que
  no son usuarios a conservar. Recomendado borrarlos (ver Q6).

**Q2 · ¿Qué nodos deben conservarse?**
- `usuarios/{BZP,ESH}`, `perfiles/{BZP,ESH}`, `permisos/BZP`, `historicos/ESH`, `userCodes/{BZP,ESH}` → datos vivos.
- `rutas/*` → preservado a propósito (ver Q4).

**Q3 · ¿`deletedUsers` se mantiene o se limpia?**
Son tombstones **válidos** (TEST/TEST_REAL/TEST_VALIDACION) de usuarios de prueba borrados. Su función es impedir
resurrección por sync. **Recomendación: mantener** (bajo riesgo, aporta trazabilidad; no rompen reglas — regla
`deletedUsers` = admin/anon). Opcional limpiarlos como ruido de pruebas, pero no es necesario. GC futuro (>180 días)
ya contemplado en CLAUDE.md.

**Q4 · ¿`rutas` es producto actual o legacy?**
**Legacy reservado, NO muerto.** CLAUDE.md §12.5: tabla de rutas ICAO retirada de la UI en Beta 3.0, **datos
preservados** para la futura Proyección Operativa. **Conservar.** No limpiar. La regla puede endurecerse a
`read: auth!=null` / `write: admin` en el hardening, pero los datos se quedan.

**Q5 · ¿`permisos/TEST` puede romper reglas futuras?**
**No rompe**, pero es basura. Bajo reglas por claim (`permisos/{code}: read code===$code||admin`), `TEST` no tiene
cuenta Auth/claim → nadie lo lee salvo admin → queda inerte. No bloquea a nadie. **Borrar** por higiene (artefacto de
prueba), no por necesidad de reglas.

**Q6 · ¿Borrar `perfiles/FLZ/PRK/RBK/TEST_RULES_DEBUG` antes de reglas finales?**
**Sí, recomendado** (con confirmación para FLZ/PRK/RBK):
- Bajo reglas finales por claim quedarían **inaccesibles y sin dueño** (ningún claim los reclama) → huérfanos
  permanentes.
- **Privacidad/GDPR:** mantener datos fiscales (NIF/IRPF) de personas que ya **no** están en el sistema es un
  pasivo. Eliminarlos es higiene positiva.
- `TEST_RULES_DEBUG` → borrar directo (test). FLZ/PRK/RBK → confirmar que son ex-usuarios abandonados y borrar.

**Q7 · ¿Falta `permisos/ESH` por fallback admin o conviene crearlo?**
**Normal, no hace falta crearlo.** ESH es admin: `applyUserPerms` da acceso total por `currentUser === ADMIN_CODE`
(no por `permisos`), y `getUserPerms('ESH')` cae a `USERS.ESH.funcion/base` si `permisos/ESH` falta. El admin **no
depende** de su entrada en `permisos`. Dejarlo ausente es correcto. (Crearlo sería cosmético; innecesario.)

**Q8 · Plan de limpieza seguro (propuesta, NO ejecutar)**
Categorías:
| Acción | Nodos | Confirmación |
|---|---|---|
| **Borrar (test)** | `perfiles/TEST_RULES_DEBUG`, `permisos/TEST` | directa (artefactos) |
| **Borrar (PII, confirmar)** | `perfiles/FLZ`, `perfiles/PRK`, `perfiles/RBK` | Eloy confirma que son ex-usuarios |
| **Conservar** | `usuarios/{BZP,ESH}`, `perfiles/{BZP,ESH}`, `permisos/BZP`, `historicos/ESH`, `userCodes/{BZP,ESH}`, `rutas/*` | — |
| **Conservar (tombstones)** | `deletedUsers/*` | mantener (Q3) |
| **Sin acción** | `permisos/ESH` ausente (Q7), `solicitudes`/`analytics` inexistentes | — |

**Método de limpieza:** Admin SDK (solo borrados puntuales por code), **tras backup RTDB**, con lista explícita de
codes, confirmación por nodo, y verificación posterior (re-ejecutar §B). Sería una **Fase de Limpieza** previa a las
reglas finales. Se diseñará con su propio doc + go/no-go cuando lo autorices (no se borra nada ahora).

## K. RECOMENDACIÓN ESTRATÉGICA REVISADA (con datos live)

**Camino: FASE DE LIMPIEZA → Opción 2 (1.4 → 1.5).** Confirmado:
1. **La base NO está limpia** (4 huérfanos en `perfiles`, 1 en `permisos`) → **se necesita una fase de limpieza
   ANTES de endurecer reglas**, o esos datos (incluidos fiscales) quedarían inaccesibles y sin dueño para siempre.
2. **Opción 1 (transitoria) descartada de facto:** con 2 usuarios reales ya migrados, unas reglas que toleran anónimo
   no aportan seguridad; no justifican un despliegue global. Confirmado el análisis previo (§6 del diseño 1.3).
3. **Secuencia recomendada:**
   - **Fase L (Limpieza):** borrar huérfanos de prueba (`TEST_RULES_DEBUG`, `permisos/TEST`) + huérfanos PII
     confirmados (`FLZ`/`PRK`/`RBK`). Backup previo. (Decidir si limpiar también `deletedUsers/TEST*` — opcional.)
   - **Fase 1.4:** borrar `pass` de `usuarios`, retirar login legacy + `DEFAULT_USERS`, actualizar `.validate` de `usuarios`.
   - **Fase 1.5:** reglas finales por claim **sin tolerancia anon** + deshabilitar Anonymous + purga de ~816 anónimas.
4. **Nota de proceso (no de esta fase):** el flujo de borrado de usuarios deja huérfanos (gap CLAUDE.md §13.15);
   convendría, en algún momento, que `purgeUser` borre también `perfiles`/`permisos`/`historicos` del code. Fuera del
   alcance inmediato, pero la limpieza actual es su consecuencia.

**Decisión que necesito de ti:** ¿autorizas preparar el **diseño/spec/go-no-go de la Fase de Limpieza** (borrado seguro
de huérfanos, Admin SDK, con backup y confirmación por code)? Y confirmación sobre **FLZ/PRK/RBK** (¿ex-usuarios a
borrar, o conservar alguno?).

---

---

## L. AUDITORÍA DE DEPENDENCIAS EN CÓDIGO (2026-06-13) — ¿se usan esos códigos?

Búsqueda de literales `FLZ|PRK|RBK|TEST_RULES_DEBUG` y `TEST`/`TEST_REAL`/`TEST_VALIDACION` en `index.html`,
`userAdmin.js`, `pilotPayStore.js`, `pilotPayAuth.js`, `tools/admin-cli/*`, `docs/*`:

| Código | Referencias en CÓDIGO | Veredicto |
|---|---|---|
| FLZ, PRK, RBK | **Ninguna** (solo en este doc de auditoría) | huérfano confirmado |
| TEST_RULES_DEBUG | **Ninguna** (solo en este doc) | huérfano confirmado |
| TEST | **Ninguna en código.** Solo **ejemplos de documentación** (`CHANGELOG_P4.7.md`: logs de `purgeFirebaseForUser('TEST')`/`verifyUserPurged('TEST')`; `FIREBASE_SCHEMA.md`: ejemplo de tombstone) | residuo de prueba; no usado por ningún flujo |

**Conclusión:** **ningún flujo de la app usa estos códigos.** No están hardcodeados, no hay listas de usuarios
que los incluyan (`DEFAULT_USERS` = solo ESH), y las únicas menciones de "TEST" son ejemplos en docs históricos.
Los códigos de prueba activos del CLI son `ZZT`/`ZZA` (otros). → Los 5 nodos a eliminar son huérfanos reales.

## M. DISPOSICIÓN CONFIRMADA POR ELOY (2026-06-13)
| Nodo | Disposición |
|---|---|
| `perfiles/FLZ` | **ELIMINAR** (ex-usuario, confirmado) |
| `perfiles/PRK` | **ELIMINAR** (ex-usuario, confirmado) |
| `perfiles/RBK` | **ELIMINAR** (ex-usuario, confirmado) |
| `perfiles/TEST_RULES_DEBUG` | **ELIMINAR** (artefacto de prueba) |
| `permisos/TEST` | **ELIMINAR** (artefacto de prueba) |
| `deletedUsers/*` (TEST, TEST_REAL, TEST_VALIDACION) | **CONSERVAR** (tombstones válidos) |
| `rutas/*` | **CONSERVAR** (legacy reservado, Proyección Operativa) |
| `permisos/ESH` | **NO CREAR** (admin no lo necesita) |

→ Diseño de la limpieza: ver `docs/PHASE_L_RTDB_CLEANUP_DESIGN.md`.

---

**FIN DE LA AUDITORÍA — resultados live + dependencias + disposición confirmados. Recomendación: Fase L (Limpieza) → 1.4 → 1.5 (Opción 2). Sin commit ni borrado hasta autorización.**
