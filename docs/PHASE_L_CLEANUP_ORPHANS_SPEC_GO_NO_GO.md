# FASE L — SPEC EJECUTABLE + GO/NO-GO: `cleanup-orphans`

**Fecha:** 2026-06-13
**Fase:** L — Limpieza de huérfanos RTDB. Subcomando CLI `cleanup-orphans`.
**Estado:** 🟡 **DISEÑO — NO implementar, NO borrar, NO tocar Firebase/reglas/producción.**
**Base:** `PHASE_L_RTDB_CLEANUP_DESIGN.md` (D16 `83f6d79`) + auditoría live + dependencias (§L/§M).
**Riesgo:** BAJO (5 nodos hoja huérfanos, sin uso en código, fuera de P4, sin cuentas Auth).

---

## 1. OBJETIVO EXACTO
Implementar (en una fase posterior) un subcomando de administración que elimine **exactamente** los 5 nodos
huérfanos confirmados de RTDB, de forma **idempotente, auditable y reversible** (backup previo), sin tocar
ningún otro nodo, antes de endurecer reglas (1.5).

## 2. PATHS A ELIMINAR (lista cerrada, hardcodeada — 5)
```
pilotpay/perfiles/FLZ
pilotpay/perfiles/PRK
pilotpay/perfiles/RBK
pilotpay/perfiles/TEST_RULES_DEBUG
pilotpay/permisos/TEST
```
**Ninguna otra.** Sin wildcards, sin patrones, sin entrada dinámica.

## 3. PATHS A CONSERVAR (intocables — verificados post)
```
pilotpay/usuarios/BZP        pilotpay/usuarios/ESH
pilotpay/perfiles/BZP        pilotpay/perfiles/ESH
pilotpay/permisos/BZP
pilotpay/historicos/ESH/**
pilotpay/userCodes/BZP       pilotpay/userCodes/ESH
pilotpay/deletedUsers/*      (TEST, TEST_REAL, TEST_VALIDACION)
pilotpay/rutas/*             (8 hijos)
```
`permisos/ESH` no existe y **no se crea** (admin no lo necesita). Todo lo no listado en §2 es intocable.

## 4. DECISIÓN SOBRE TOMBSTONES
**Recomendación: NO crear tombstones nuevos en esta limpieza.**
| | Pros | Contras |
|---|---|---|
| Crear `deletedUsers/{FLZ,PRK,RBK}` | Trazabilidad del borrado; coherente con §13.15 | Retroactivo (se borraron hace tiempo); sin riesgo de resurrección que justifique (perfiles NO se sincroniza por P4; los codes no pueden loguear) → aporta poco |
| No crear | Limpieza mínima; menos escrituras | Sin registro formal del borrado (queda en este doc + backup) |
**Conclusión:** el riesgo de resurrección es nulo (P4 solo toca `historicos`; `perfiles`/`permisos` se escriben
solo para el `currentUser` logueado, y estos codes no pueden loguear). El borrado queda documentado en este doc
y en el backup. `TEST_RULES_DEBUG`/`TEST` son artefactos de prueba → tombstone innecesario en cualquier caso.

> **DECISIÓN CONFIRMADA (Eloy, 2026-06-13): NO crear tombstones nuevos** para FLZ/PRK/RBK en Fase L.
> Motivo: sin usuario activo, sin userCode, sin Auth, sin histórico P4 → no pueden resucitar por sincronización;
> los tombstones retroactivos añaden ruido sin aportar protección real. Decisión cerrada.

## 5. DISEÑO DEL SUBCOMANDO CLI

**Nombre:** `cleanup-orphans`
**Invocación:**
```
node admin.js cleanup-orphans               # DRY-RUN (default): no borra; muestra plan + conteos
node admin.js cleanup-orphans --confirm      # EJECUCIÓN real (exige también gate de backup, ver abajo)
```

**Comportamiento (diseño, NO implementado):**
1. **Lista hardcodeada** de 5 paths (constante en el código, revisable en el diff). Sin args dinámicos de path.
2. **Guardas defensivas (defense-in-depth):** antes de cualquier `remove()`, asertar que **cada** path:
   - empieza por `pilotpay/perfiles/` o `pilotpay/permisos/` (los únicos prefijos permitidos);
   - **NO** empieza por `pilotpay/usuarios/`, `pilotpay/historicos/`, `pilotpay/userCodes/`, `pilotpay/deletedUsers/`, `pilotpay/rutas/`;
   - está en la lista cerrada de §2.
   Si algún path falla la aserción → abortar sin tocar nada.
3. **DRY-RUN por defecto** (sin `--confirm`): para cada path, leer (`.get()`) y reportar `EXISTE/ausente` + (si
   aplica) nº de hijos. **No escribe.** Imprime el plan: "se borrarían N de 5 paths".
4. **Gate de backup:** con `--confirm`, exigir además `--backup <ruta>` que apunte a un export RTDB **existente**
   (verifica que el fichero existe y es JSON válido) **y** que ese backup **contiene** los 5 paths (para
   garantizar rollback). Si no → abortar. (Alternativa: `--i-have-backup` explícito; preferible verificar el fichero.)
5. **Ejecución** (`--confirm` + backup verificado): por cada path existente, `db.ref(path).remove()`, uno a uno,
   con log `path → ELIMINADO`. Paths ya ausentes → `path → ya ausente (skip)` (idempotente).
6. **Verificación posterior** (automática): re-leer los 5 paths → todos `ausente`; re-contar conserve-list
   (`perfiles`→2, `permisos`→1, `usuarios`→2, `historicos`→ESH, `userCodes`→2, `deletedUsers`→3, `rutas`→8).
7. **Salida segura:** imprime **solo paths, estados y conteos**. **Nunca** valores (ni NIF/IRPF/pass).
8. **Solo lectura/borrado de los 5 paths.** No escribe nada más (salvo tombstones si se decidiera, §4 — fuera por defecto).

**Pseudocódigo (diseño):**
```js
const ORPHAN_PATHS = [
  'pilotpay/perfiles/FLZ', 'pilotpay/perfiles/PRK', 'pilotpay/perfiles/RBK',
  'pilotpay/perfiles/TEST_RULES_DEBUG', 'pilotpay/permisos/TEST'
];
const ALLOWED_PREFIX = ['pilotpay/perfiles/', 'pilotpay/permisos/'];
const FORBIDDEN_PREFIX = ['pilotpay/usuarios/','pilotpay/historicos/','pilotpay/userCodes/',
                          'pilotpay/deletedUsers/','pilotpay/rutas/'];

function assertSafe(p) {
  if (!ALLOWED_PREFIX.some(x => p.startsWith(x))) throw new Error('prefijo no permitido: ' + p);
  if (FORBIDDEN_PREFIX.some(x => p.startsWith(x))) throw new Error('prefijo prohibido: ' + p);
}

async function cmdCleanupOrphans(ctx, flags) {
  ORPHAN_PATHS.forEach(assertSafe);                  // defensa
  // 1) estado previo (dry-run y real)
  for (const p of ORPHAN_PATHS) {
    const snap = await ctx.db.ref(p).get();
    console.log(p, '→', snap.exists() ? 'EXISTE' : 'ausente');
  }
  if (!flags.confirm) { console.log('DRY-RUN: sin --confirm no se borra nada.'); return; }
  // 2) gate de backup
  if (!flags.backup) throw new Error('--confirm requiere --backup <ruta-export-RTDB>.');
  assertBackupValidAndContainsPaths(flags.backup, ORPHAN_PATHS);   // existe + JSON válido + contiene los 5
  // 3) borrado
  for (const p of ORPHAN_PATHS) {
    const snap = await ctx.db.ref(p).get();
    if (!snap.exists()) { console.log(p, '→ ya ausente (skip)'); continue; }
    await ctx.db.ref(p).remove();
    console.log(p, '→ ELIMINADO');
  }
  // 4) verificación posterior
  for (const p of ORPHAN_PATHS) {
    const snap = await ctx.db.ref(p).get();
    console.log('verify', p, '→', snap.exists() ? 'FALLO (sigue)' : 'OK (ausente)');
  }
}
```

## 6. BACKUP PREVIO OBLIGATORIO
- Export JSON completo de RTDB **fresco** → `C:\pilotpay-backups\pilotpay-rtdb-backup-PRE-cleanup-2026-06-13.json`
  (fuera de OneDrive/repo).
- Verificar: existe, tamaño > 0, **JSON válido**, **contiene los 5 paths** de §2 (clave para rollback).
- Registrar **conteo de nodos antes** (de la auditoría: perfiles 6, permisos 2, etc.).
- `auth-list` (CLI `list`): no estrictamente necesario (la limpieza no toca Auth), pero se puede guardar como foto del estado.
- El `--backup` que recibe el comando apunta a este fichero; el comando lo valida antes de borrar.

## 7. ROLLBACK EXACTO
- **Fuente:** el backup §6 (contiene los 5 nodos íntegros).
- **Restaurar solo los 5 paths** (no todo RTDB): por cada path, `db.ref(path).set(<valor del backup>)`.
  (Un sub-comando `restore-orphans --backup <ruta>` o restauración manual puntual.)
- **Restauración total de RTDB:** solo en desastre mayor; no es el camino esperado.
- Reversible **mientras exista el backup** → §6 es prerequisito.

## 8. RIESGOS
| # | Riesgo | Sev | |
|---|---|---|---|
| L1 | Borrar perfil equivocado | Media | Lista cerrada §2 + `assertSafe` (prefijos permitidos/prohibidos) + dry-run + verify |
| L2 | Borrar permisos equivocados | Media | Igual; solo `permisos/TEST` en la lista |
| L3 | Datos personales en el backup | Media | Backup fuera de OneDrive/repo; tratar según retención; necesario para rollback |
| L4 | Pérdida de evidencia | Baja | Backup conserva los datos; doc registra qué/por qué |
| L5 | Impacto en reglas futuras | — | Positivo (sin huérfanos inaccesibles) |
| L6 | Impacto en admin (ESH) | Ninguno | ESH no se toca; admin sigue por `isAdmin()` |
| L7 | Impacto en P4 | Ninguno | P4 = solo `historicos`; los 5 paths están en `perfiles`/`permisos` |
| L8 | Impacto en `rutas` | Ninguno | No está en la lista; `assertSafe` lo prohíbe explícitamente |
| L9 | Impacto en `deletedUsers` | Ninguno | No está en la lista; prefijo prohibido |
| L10 | Ejecutar sin backup | Media | Gate `--backup` obligatorio con `--confirm`; sin él, aborta |
| L11 | Borrado parcial (corte a mitad) | Baja | Idempotente: re-ejecutar completa lo pendiente; verify detecta restos |

## 9. MITIGACIONES (resumen)
Lista cerrada hardcodeada · `assertSafe` con prefijos permitidos **y** prohibidos · dry-run por defecto ·
`--confirm` + `--backup` verificado · verificación previa y posterior automática · salida sin valores ·
idempotencia · backup = rollback.

## 10. PRUEBAS DE DRY-RUN (sin borrar)
1. `node admin.js cleanup-orphans` (sin `--confirm`) → lista los 5 paths con `EXISTE/ausente`; mensaje "DRY-RUN, no se borra"; **0 escrituras** (verificar en consola Firebase que nada cambió).
2. Confirmar que reporta los 5 como `EXISTE` (coherente con la auditoría).
3. `assertSafe`: (test unitario sin red) alimentar un path prohibido (`pilotpay/usuarios/X`) → lanza, aborta.

## 11. PRUEBAS DE EJECUCIÓN REAL (cuando se autorice, tras backup)
1. Backup fresco + verificación (§6).
2. `node admin.js cleanup-orphans --confirm --backup "<ruta>"` → cada path `ELIMINADO`; verify `OK (ausente)` ×5.
3. Re-ejecutar el comando → todos `ya ausente (skip)` (idempotencia).

## 12. VALIDACIÓN POSTERIOR
- Re-ejecutar auditoría RTDB (script §B): `perfiles`→**2** (BZP,ESH), `permisos`→**1** (BZP), `historicos`→ESH
  intacto, `rutas`→8 intactas, `deletedUsers`→3 intacto, `usuarios`→2, `userCodes`→2.
- App: **ESH** login Auth/legacy → panel admin completo; **BZP** login Auth/legacy → entra, funciones/bases OK.
- Dashboard/Historial OK; **consola limpia**.
- Confirmar que los 5 codes no quedan en ningún nodo de datos.

## 13. CRITERIOS GO
- Backup fresco verificado (existe, JSON válido, contiene los 5 paths).
- Dry-run muestra exactamente los 5 paths esperados, ninguno más.
- `assertSafe` rechaza prefijos prohibidos (probado).
- Confirmación explícita de Eloy de FLZ/PRK/RBK como ex-usuarios (ya dada).

## 14. CRITERIOS NO-GO
- Backup no verificable o no contiene los 5 paths.
- Dry-run muestra un path inesperado (≠ los 5) → detener.
- Alguno de los 5 resulta NO huérfano (reaparece en `usuarios`/código).
- Cualquier duda sobre FLZ/PRK/RBK.

## 15. RECOMENDACIÓN FINAL
**Implementar el subcomando `cleanup-orphans` en el CLI** (Opción a), preferible a un script temporal suelto:
- **Auditable** (lista cerrada + guardas en el diff, revisable), **repetible**, **idempotente**, queda en el CLI
  para trazabilidad. Tocaría `tools/admin-cli/admin.js` (+ README) — con su propio commit (tipo C) y validación
  dry-run antes de la ejecución real.
- El script temporal (Opción b) sirve si se prefiere cero cambios en el CLI, pero es menos auditable y va contra
  la "no dejar scripts en el repo" (hay que crear/borrar). **No recomendado** para una operación de borrado.
- **Diferir** (Opción c) solo si se decide posponer toda la limpieza; pero la limpieza es prerequisito de reglas
  finales limpias (1.5), así que conviene hacerla antes.

**Secuencia:** implementar `cleanup-orphans` (commit + dry-run validado) → backup fresco → ejecución real con
`--confirm --backup` → validación posterior → cierre Fase L → 1.4 → 1.5.

**Decisión abierta:** tombstones (§4, recomendado NO) — confirmar antes de implementar.

**FIN DE LA SPEC/GO-NO-GO `cleanup-orphans` — No implementar hasta autorización. Documento untracked.**
