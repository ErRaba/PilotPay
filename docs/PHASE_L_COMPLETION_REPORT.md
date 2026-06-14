# FASE L — INFORME DE CIERRE

**Fecha:** 2026-06-13
**Fase:** L — Limpieza de huérfanos RTDB
**Estado:** ✅ **COMPLETADA (2026-06-13)** — re-auditoría (§3) + smoke test (§4) verificados.
**Base:** auditoría D16 `83f6d79`, spec/go-no-go D17 `8fd9221`, subcomando `7f9e20f`.

---

## 1. EJECUCIÓN — confirmado
- Backup previo: `C:\pilotpay-backups\pilotpay-rtdb-pre-cleanup-2026-06-13.json` (verificado: existe, JSON válido, contiene los 5 paths).
- Dry-run en vivo: OK (5 × EXISTE, sin borrado).
- Ejecución real: `cleanup-orphans --confirm --backup <ruta>` → **5/5 ELIMINADO + 5/5 verify OK (ausente)** (verificación interna del comando, confirmada por Eloy).

## 2. PATHS ELIMINADOS (5)
```
pilotpay/perfiles/FLZ                ELIMINADO
pilotpay/perfiles/PRK                ELIMINADO
pilotpay/perfiles/RBK                ELIMINADO
pilotpay/perfiles/TEST_RULES_DEBUG   ELIMINADO
pilotpay/permisos/TEST               ELIMINADO
```

## 3. RE-AUDITORÍA POST-CLEANUP — ✅ PASS (verificado 2026-06-13)
| Nodo | Esperado | Real (live) | OK |
|---|---|---|---|
| perfiles | 2: BZP, ESH | 2: BZP, ESH | ✅ |
| permisos | 1: BZP | 1: BZP | ✅ |
| usuarios | 2: BZP, ESH (intacto) | 2: BZP, ESH | ✅ |
| historicos | 1: ESH (intacto) | 1: ESH (monthly 5 / aud 5 / tombstones 19) | ✅ |
| userCodes | 2: BZP, ESH (intacto) | 2: BZP, ESH | ✅ |
| deletedUsers | 3 (intacto) | 3: TEST, TEST_REAL, TEST_VALIDACION | ✅ |
| rutas | 8 (intacto) | 8 | ✅ |
| solicitudes | NO EXISTE | NO EXISTE | ✅ |
Salida guardada: `C:\pilotpay-backups\rtdb-postcleanup-2026-06-13.txt`.

## 4. SMOKE TEST ESH/BZP — ✅ PASS (verificado 2026-06-13)
| Prueba | Resultado |
|---|---|
| ESH Auth | PASS |
| ESH Legacy | PASS |
| ESH Admin (panel completo) | PASS |
| BZP Auth | PASS |
| BZP Legacy | PASS |
| Dashboard | PASS |
| Historial (auditorías ESH intactas) | PASS |
| Consola limpia | PASS |

## 5. INTEGRIDAD / IMPACTO
- **Firebase Auth:** no tocado (los 5 codes no tenían cuenta).
- **userCodes:** no tocado (no tenían mapping).
- **P4 / historicos:** no tocado (P4 solo `historicos`; ESH intacto).
- **rutas / deletedUsers:** no tocados (`assertSafe` los prohíbe).
- **Privacidad:** retirada de PII (NIF/IRPF) de 3 ex-usuarios (FLZ/PRK/RBK). El backup conserva esos datos → guardarlo según política de retención.

## 6. ROLLBACK DISPONIBLE
Backup `pre-cleanup-2026-06-13.json` permite restaurar los 5 paths (snippet `_tmp_restore.mjs` documentado). No usado (cierre OK esperado).

## 7. ESTADO RTDB FINAL (esperado, a confirmar con §3)
Base **limpia**: solo {BZP, ESH} en datos de usuario; `permisos` solo BZP; `historicos` solo ESH; `userCodes` {BZP,ESH}; `deletedUsers` (tombstones de prueba conservados); `rutas` (reservado). Sin huérfanos. → **Lista para reglas finales por claim (1.5) sin nodos inaccesibles/sin dueño.**

## 8. PRÓXIMO PASO (NO ahora)
- **Fase 1.4:** borrar `pass` de `usuarios` + retirar login legacy + `DEFAULT_USERS` + actualizar `.validate`.
- **Fase 1.5:** reglas finales por claim (sin tolerancia anon) + deshabilitar Anonymous + purga ~816 anónimas.
- (Decisión abierta) destino de `docs/PHASE_1.3_RULES_TRANSITION_DESIGN.md` (commit histórico o descartar).
- (Decisión abierta) ¿limpiar `deletedUsers/TEST*` como ruido de prueba? (opcional, conservados por defecto).

## 9. CONSISTENCIA VERIFICADA
- **D16** (`83f6d79`, auditoría): los 5 huérfanos identificados = los 5 eliminados. ✅
- **D17** (`8fd9221`, spec/go-no-go): criterios GO cumplidos (backup verificado, dry-run, lista cerrada). ✅
- **Commit `7f9e20f`** (subcomando): ejecutado `--confirm --backup` → 5/5 ELIMINADO + 5/5 verify OK. ✅
- **Re-auditoría real** (§3): `perfiles`=2, `permisos`=1, resto intacto → coincide con lo esperado. ✅
- **Disposición §M de D16** respetada: deletedUsers/* y rutas/* conservados; permisos/ESH no creado; tombstones FLZ/PRK/RBK NO creados (decisión D17). ✅

**Cierre formal:** ✅ Fase L COMPLETADA. NO avanzar a 1.4/1.5. Producción intacta.
