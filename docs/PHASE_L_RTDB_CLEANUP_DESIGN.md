# FASE L — DISEÑO: LIMPIEZA DE HUÉRFANOS RTDB

**Fecha:** 2026-06-13
**Fase:** L — Limpieza de datos huérfanos en RTDB (previa a 1.4/1.5)
**Estado:** 🟡 **DISEÑO — NO implementar. No borrar/escribir en Firebase, no tocar reglas/producción.**
**Base:** auditoría live `PHASE_1.3_RTDB_REAL_STATE_AUDIT.md` (§I-M). Disposición confirmada por Eloy.
**Riesgo:** **BAJO** (5 nodos hoja huérfanos, sin uso en código, fuera de P4, sin cuentas Auth asociadas).

---

## 1. OBJETIVO
Eliminar de RTDB los datos huérfanos confirmados, **antes** de endurecer reglas (1.5), para que no queden
nodos inaccesibles y sin dueño bajo el modelo por claim, y para retirar PII de ex-usuarios (privacidad).

## 2. INVENTARIO EXACTO — NODOS A ELIMINAR (5)
| # | Path exacto | Tipo | Motivo | Contiene PII |
|---|---|---|---|---|
| 1 | `pilotpay/perfiles/FLZ` | Perfil | ex-usuario (confirmado) | **SÍ** (NIF/IRPF) |
| 2 | `pilotpay/perfiles/PRK` | Perfil | ex-usuario (confirmado) | **SÍ** |
| 3 | `pilotpay/perfiles/RBK` | Perfil | ex-usuario (confirmado) | **SÍ** |
| 4 | `pilotpay/perfiles/TEST_RULES_DEBUG` | Perfil | artefacto de prueba | dummy |
| 5 | `pilotpay/permisos/TEST` | Permiso | artefacto de prueba | no |

**Verificado (§L auditoría):** ningún flujo de código referencia estos códigos; no tienen entrada en
`usuarios`, ni `historicos`, ni `userCodes`, ni cuenta Firebase Auth.

## 3. INVENTARIO EXACTO — NODOS A CONSERVAR (intocables)
- `usuarios/{BZP,ESH}`, `perfiles/{BZP,ESH}`, `permisos/BZP`, `historicos/ESH/**`, `userCodes/{BZP,ESH}`.
- `deletedUsers/{TEST,TEST_REAL,TEST_VALIDACION}` (tombstones válidos).
- `rutas/*` (8 hijos, legacy reservado).
- `permisos/ESH` **no existe y no se crea** (admin no lo necesita).
- Todo lo no listado en §2 es **intocable**.

## 4. RIESGOS TÉCNICOS
| # | Riesgo | Sev | Mitigación |
|---|---|---|---|
| L1 | Borrar un nodo equivocado | Media | Lista de **5 paths exactos** (no patrones, no wildcards); confirmación por nodo; backup previo |
| L2 | Borrado parcial / a medias | Baja | Cada `remove()` es atómico por path; verificación post (§9) |
| L3 | Resurrección posterior | Baja | `perfiles`/`permisos` **NO** se sincronizan por P4 (P4 = solo `historicos`); además los codes no pueden loguear (sin `usuarios`) → nada los re-escribe |
| L4 | Tipo de credencial al borrar | Baja | Admin SDK (service account); ignora reglas; no necesita sesión de usuario |

## 5. RIESGOS DE PRIVACIDAD
- **Positivo:** elimina NIF/IRPF de ex-usuarios (FLZ/PRK/RBK) → reduce pasivo de datos personales (GDPR).
- **Backup contiene la PII:** el backup previo (§8) incluirá esos perfiles → guardarlo **fuera de OneDrive/repo**
  y, si en el futuro se quiere borrado real total, tratar también la copia de backup según política de retención.
- No se expone PII en logs: el script de limpieza imprime **solo paths y resultado** (no valores).

## 6. RIESGOS DE SINCRONIZACIÓN P4
**Ninguno.** P4 sincroniza exclusivamente `pilotpay/historicos/{userId}/**`. Los 5 nodos a eliminar están en
`perfiles`/`permisos` → **fuera del alcance de P4**. No hay colas, ni tombstones P4, ni pull/push implicados.
`historicos` no se toca (solo existe `ESH`, que se conserva).

## 7. IMPACTO SOBRE OTROS SUBSISTEMAS
| Subsistema | Impacto |
|---|---|
| **Firebase Auth** | **Ninguno.** FLZ/PRK/RBK/TEST_RULES_DEBUG/TEST no tienen cuenta Auth (userCodes solo BZP/ESH). No se toca Authentication |
| **userCodes** | **Ninguno.** No existen mappings para estos codes (solo BZP/ESH) |
| **deletedUsers** | **Ninguno** (se conservan). Opcional (ver §7.1): crear tombstones para los codes limpiados |
| **Reglas futuras por claim (1.5)** | **Positivo:** sin huérfanos, no quedan nodos inaccesibles/sin dueño bajo el modelo por claim |
| **App en runtime (ESH/BZP)** | **Ninguno.** Sus datos no se tocan; los codes eliminados no participan en ningún flujo |

### 7.1 ¿Crear tombstones para los codes limpiados? (decisión menor)
- **A favor:** documenta el borrado, coherente con §13.15.
- **En contra:** FLZ/PRK/RBK ya fueron "eliminados" hace tiempo (sin tombstone); crear tombstones ahora es
  retroactivo y, dado que no hay riesgo de resurrección (L3), aporta poco.
- **Recomendación:** **opcional.** Por trazabilidad, se podría crear `deletedUsers/{FLZ,PRK,RBK}` con
  `{ deletedAt, deletedBy:'cleanup-fase-L', reason:'orphan-profile' }`. No imprescindible. Decisión de Eloy.

## 8. PLAN DE BACKUP PREVIO (obligatorio)
1. Export JSON completo de RTDB **fresco** (no reutilizar el de 2026-06-12) →
   `C:\pilotpay-backups\pilotpay-rtdb-backup-PRE-cleanup-2026-06-13.json` (fuera de OneDrive/repo).
2. Verificar: existe, tamaño > 0, JSON válido, contiene `perfiles/FLZ|PRK|RBK|TEST_RULES_DEBUG` y `permisos/TEST`
   (para garantizar que el rollback puede restaurarlos). **Sin imprimir valores** (solo presencia de claves).
3. Este backup **ES el rollback** (§10).

## 9. PLAN DE VALIDACIÓN POSTERIOR
Tras la limpieza (Admin SDK, solo lectura para verificar):
1. Re-ejecutar el script de auditoría (§B del doc RTDB) → esperado:
   - `perfiles` → **2** hijos: BZP, ESH.
   - `permisos` → **1** hijo: BZP.
   - Resto sin cambios (`usuarios` 2, `historicos` ESH, `userCodes` 2, `deletedUsers` 3, `rutas` 8).
2. Smoke test app: **ESH** login (admin) → panel completo; **BZP** login (user) → entra, funciones/bases OK.
   (Sus datos no se tocaron → debe ser idéntico.)
3. Confirmar que no quedan los 5 codes en ningún nodo de datos.

## 10. PLAN DE ROLLBACK EXACTO
- **Fuente:** el backup §8 (contiene los 5 nodos íntegros).
- **Restaurar** (si se necesitara revertir): re-escribir vía Admin SDK los paths exactos desde el backup:
  `set('pilotpay/perfiles/FLZ', <del backup>)`, … `set('pilotpay/permisos/TEST', <del backup>)`.
- Al ser 5 nodos hoja, el rollback es puntual y total. **No hay reglas/Auth/producción que revertir.**
- **Punto de no retorno:** el borrado es reversible **solo mientras exista el backup** → de ahí que §8 sea
  obligatorio y previo. (Conceptualmente, borrar datos es "más irreversible" que los cambios de código de 1.25,
  pero el backup lo cubre.)

## 11. MÉTODO DE EJECUCIÓN (cuando se autorice — NO ahora)
Admin SDK, borrados puntuales por path exacto, con confirmación. Opciones:
- **(a)** Subcomando nuevo en el CLI: `node admin.js cleanup-orphans --confirm` con la lista de 5 paths
  **hardcodeada y revisable** en el diff (preferible: auditable, repetible).
- **(b)** Script temporal `_tmp_cleanup.mjs` (como el de auditoría), no commiteable, borrado tras usar.
- **Recomendación:** (a) — un subcomando explícito con la lista exacta es más auditable que un script suelto, y
  queda en el CLI para trazabilidad. Tocaría `tools/admin-cli/admin.js` (+ README). Se diseñará su spec ejecutable
  + go/no-go aparte antes de implementar.

## 12. SECUENCIA RECOMENDADA
```
1. Backup RTDB fresco (§8) + verificación.
2. (Opcional) decidir tombstones §7.1.
3. Ejecutar limpieza de los 5 paths exactos (Admin SDK, confirmación).
4. Validación posterior (§9): auditoría re-ejecutada + smoke test ESH/BZP.
5. Cierre documental de Fase L.
→ Luego: Fase 1.4 (borrar pass/legacy) → Fase 1.5 (reglas finales + deshabilitar Anonymous).
```

## 13. CRITERIOS DE ÉXITO
- `perfiles` = {BZP, ESH}; `permisos` = {BZP}; resto intacto.
- ESH/BZP operan igual (smoke test).
- Backup íntegro disponible.
- Cero impacto en Auth/userCodes/P4/historicos/rutas/deletedUsers.

## 14. CRITERIOS DE BLOQUEO
- Backup no verificable → no proceder.
- Cualquier path de la lista resulta NO ser huérfano (re-aparece en usuarios/código) → detener y revisar.
- Borrado afecta a un nodo fuera de los 5 → rollback inmediato desde backup.

---

**FIN DEL DISEÑO FASE L — No implementar. Requiere: backup previo + spec ejecutable/go-no-go del subcomando de limpieza + autorización explícita.**
