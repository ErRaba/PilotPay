# PilotPay — Arquitectura de Sincronización (P4)

**Versión**: Beta 3.0  
**Tag**: `v3.0.0-beta-sync-stable`  
**Archivo fuente principal**: `frontend/js/pilotPayStore.js`

---

## 1. Principio fundamental

PilotPay es **local-first / offline-first**.

```
localStorage  ←→  IndexedDB (IDB)  ←→  Firebase RTDB
    (primario)        (secundario)        (sync, nunca autoritativo)
```

**La app puede operar completamente sin red.** Firebase es una capa de sincronización multi-device. Nunca es la fuente de verdad.

---

## 2. Entidades sincronizadas

### MonthRecord (`monthly_v1`)

Representa el expediente mensual de un usuario. Es la entidad central del sistema.

```
{
  id            : "{userId}:{year}:{month}"
  userId        : string
  year          : number (2020–2100)
  month         : number (1–12)
  schemaVersion : number
  mesLabel      : string
  estado        : string   ← ver máquina de estados
  variablesData : object | null
  calculoTeorico: object | null
  nominaData    : object | null
  auditoria     : object | null
  regularizacion: object | null
  reclamacion   : object | null
  resolvedPeriod: object | null
  _createdAt    : ISO string
  _updatedAt    : ISO string   ← usado para merge de sync
  _schemaVersion: 1            ← añadido por Firebase decorator
  _lastWriterDevice: string    ← device ID del último escritor
}
```

**Máquina de estados:**
```
pendiente
  → pending_variables      (variables cargadas)
    → pending_calculation  (calculado, esperando nómina oficial)
      → pending_comparison (nómina subida, esperando comparativa)
        → con_diferencias  (comparativa con diferencias)
        → auditado         (sin diferencias o aceptado)
          → regularizado
            → reclamado
              → cerrado
```

**Estados activos** (aparecen en "Expediente activo"): `pending_variables`, `pending_calculation`, `pending_comparison`, `con_diferencias`  
**Estados terminados** (aparecen en "Última auditoría"): `auditado`, `regularizado`, `reclamado`, `cerrado`

### AuditRecord (`audit_history_v1`)

Registro inmutable de una auditoría completada. Append-only.

```
{
  id             : "{timestamp}_{random}"
  userId         : string
  mes            : string (nombre del mes)
  anyo           : string
  fechaAuditoria : ISO string
  estado         : "ok" | "alerta" | "aviso"
  nDiscrepancias : number
  discrepancias  : array
  liqTeorico     : number | null
  liqReal        : number | null
  diff           : number | null
  ...
}
```

### Tombstone (`deletedAuditorias`)

Registro de borrado. Previene resurrección de registros eliminados en sync pull.

```
{
  id              : string (= auditId borrado)
  deletedAt       : ISO string
  deletedByDevice : string
  _schemaVersion  : 1
}
```

---

## 3. Claves de almacenamiento

### localStorage
```
pilotpay:{userId}:monthly_v1       ← mapa { "year_month": MonthRecord }
pilotpay:{userId}:audit_history_v1 ← array de AuditRecord (más reciente primero)
pilotpay:{userId}:p4_queue         ← mapa { fbPath: data } — writes pendientes
pilotpay:{userId}:last_sync_at     ← ISO timestamp del último sync OK
pilotpay:{userId}:p4_pull_backup_monthly  ← backup pre-pull (monthly)
pilotpay:{userId}:p4_pull_backup_audit    ← backup pre-pull (auditorías)
pilotpay:{userId}:p4_pull_backup_ts       ← timestamp del backup
```

### IndexedDB (PilotPayLocalDB, DB_VERSION=1)
```
monthlyRecords   ← MonthRecords indexados por userId
auditHistory     ← AuditRecords indexados por userId
```

### Firebase RTDB
```
pilotpay/historicos/{userId}/monthly/{year}_{month}
pilotpay/historicos/{userId}/auditorias/{auditId}
pilotpay/historicos/{userId}/deletedAuditorias/{auditId}
```

---

## 4. Feature flag P4

```javascript
localStorage.getItem('pilotpay_p4_enabled') === '1'
```

Sin el flag activo, toda la infraestructura P4 es **no-op**. El sistema funciona como local-only.

Activación temporal (testing): URL `?p4=1` o `?p4pull=1`

El sink Firebase se registra en `PilotPayStore.setFirebaseSink()` desde `index.html` tras auth exitoso. Internamente: `{ update(path, data), get(path), getDeviceId() }`.

---

## 5. Flujo write-through Monthly

Cuando se modifica un MonthRecord:

```
1. _monthly[key] = { ...mr }           ← actualizar memoria
2. localStorage.setItem(monthlyKey)     ← persistir localStorage
3. IDB.putMonthlyRecord(mr)             ← write-through IDB (best-effort)
4. _notifyFirebase(path, _p4Decorate(mr))  ← write-through Firebase (si P4 activo)
```

`_p4Decorate(mr)` añade al objeto:
- `_schemaVersion: 1`
- `_updatedAt: new Date().toISOString()` (sobreescribe el original — timestamp del momento de escritura Firebase)
- `_lastWriterDevice: deviceId`

La escritura Firebase usa HTTP **PATCH** (merge parcial), no PUT. Solo se escribe el nodo exacto modificado (`monthly/{year}_{month}`), no el árbol completo.

Si Firebase está offline o el sink no está disponible, el write se **encola** en `p4_queue` y se reintenta al reconectarse.

---

## 6. Flujo write-through Auditorías

Las auditorías son **append-only**. Cada auditoría escribe su propio nodo.

```
1. hstSave(list)                           ← localStorage
2. IDB.putAuditRecord(record)              ← IDB write-through
3. PilotPayStore.notifyAuditRecord(record) ← Firebase write-through
   → PATCH pilotpay/historicos/{userId}/auditorias/{record.id}
```

No se usa `_p4Decorate` estándar aquí — el record ya tiene `_updatedAt` del momento de creación y se preserva.

---

## 7. Flujo delete

### Delete MonthRecord pending
```
1. delete _monthly[key]                    ← memoria
2. _saveMonthly()                          ← localStorage
3. IDB.deleteMonthlyRecord(mr.id)          ← IDB (CRÍTICO: sin esto, hydrateFromIDB resurrect)
4. _p4Sink.update(fbPath, null)            ← Firebase DELETE
   fallback: _enqueueP4(fbPath, null)
```

**Invariante crítico**: Si el IDB no se limpia explícitamente, `hydrateFromIDB()` en el próximo arranque detecta la clave en IDB pero no en localStorage y la importa de vuelta → resurrección del registro.

### Delete AuditRecord
```
1. hstSave(listaFiltrada)                  ← localStorage (sin el record)
2. IDB.deleteAuditRecord(auditId)          ← IDB
3. PilotPayStore.notifyAuditDelete(auditId)
   → Firebase DELETE  pilotpay/.../auditorias/{auditId}
   → Firebase PATCH   pilotpay/.../deletedAuditorias/{auditId}  ← tombstone
```

---

## 8. Tombstones — prevención de resurrección

Los tombstones resuelven el problema de resurrección en sync multi-device:

**Sin tombstones**: usuario borra en PC → pull en iPhone trae de vuelta el registro (Firebase lo tiene en `auditorias/`)

**Con tombstones**:
1. Delete en PC → borra `auditorias/{id}` en Firebase + escribe `deletedAuditorias/{id}`
2. Pull en iPhone → detecta tombstone → no importa el registro aunque existiera localmente
3. El registro local (si existía) también se elimina

**Tombstones solo para auditorías.** Los MonthRecords se borran directamente (no hay tombstone de monthly).

---

## 9. Flujo Pull Firebase → local

El pull es **conservador**. Nunca borra datos locales sin un tombstone.

```
P4Debug.pullFromFirebase()
  ↓
1. Guardar backup previo (localStorage backup_monthly, backup_audit, backup_ts)
2. GET pilotpay/historicos/{userId}/monthly
   GET pilotpay/historicos/{userId}/auditorias
   GET pilotpay/historicos/{userId}/deletedAuditorias
  ↓
3. Merge monthly — por cada registro en Firebase:
   - Si no existe local → importar (mNew++)
   - Si existe local:
     * fbMs > localMs  → Firebase gana (mUpdated++)
     * fbMs ≤ localMs  → local gana (mUnchanged++)
  ↓
4. Merge auditorías — misma lógica de timestamps
  ↓
5. Aplicar tombstones:
   - Para cada deletedAuditorias/{id} → eliminar de local si existía (aTombstoned++)
  ↓
6. Escribir resultado en localStorage + IDB
7. Refrescar _monthly en memoria (hydrateFromIDB o reload directo)
8. _lastSyncAt = now → persistir en last_sync_at
```

**Resultado del pull:**
```javascript
{
  monthly:           { new, updated, unchanged, invalid },
  audit:             { new, updated, unchanged, invalid },
  tombstonesApplied: number,
  backupSaved:       boolean
}
```

**Rollback disponible**: `P4Debug.rollbackPull()` restaura desde el backup pre-pull.

---

## 10. Conflictos y precedencia de timestamps

| Situación | Resultado |
|---|---|
| `fbMs > localMs` | Firebase gana → local actualizado |
| `fbMs <= localMs` | Local gana → Firebase descartado |
| `fbMs == 0` (sin timestamp Firebase) | Local gana |
| `localMs == 0` (sin timestamp local) | Firebase gana |
| Registro solo en Firebase, no en local | Se importa (mNew) |
| Registro solo en local, no en Firebase | Se mantiene (no se borra) |
| Registro borrado (tombstone) en Firebase | Se elimina local |

**Nota sobre `_p4Decorate`**: Sobreescribe `_updatedAt` con el timestamp del momento de escritura Firebase. Si hay un gap significativo entre la escritura local y la escritura Firebase (por ejemplo, si el dispositivo estaba offline y luego flushea la cola), el `_updatedAt` en Firebase puede ser posterior al local → Firebase gana en el próximo pull.

---

## 11. Auto-pull on reconnect

```javascript
window.addEventListener('online', function() {
  // 1. Flush cola P4 (writes pendientes → Firebase)
  PilotPayStore.flushP4Queue()
  // 2. Pull Firebase → local
  P4Debug.pullFromFirebase()
})
```

El handler está en `index.html`. Se ejecuta cuando el dispositivo vuelve online tras estar offline.

---

## 12. Cola offline (p4_queue)

Cuando Firebase no está disponible (offline o error de red), los writes se encolan:

```
localStorage: pilotpay:{userId}:p4_queue
Formato: { "pilotpay/historicos/.../monthly/2026_5": { ...MonthRecord... } }
```

- `null` como valor = DELETE pendiente
- Los items permanecen en cola hasta que el flush tiene éxito
- En el flush, cada item se envía individualmente; los que fallan permanecen en cola
- Un item puede ser sobreescrito en cola si se modifica el mismo path varias veces (last-write-wins en cola)

---

## 13. Indicador de sync

`PilotPayStore.syncStatus()` devuelve:
```javascript
{
  isFlushing  : boolean,
  isPulling   : boolean,
  pendingOps  : number,   ← items en p4_queue
  lastError   : string | null,
  lastSyncAt  : ISO string | null
}
```

Se usa en la UI para mostrar el indicador de estado de sync.

---

## 14. P4 Debug Panel

Panel visual de diagnóstico. **Solo lectura.** Solo visible cuando:
- `currentUser === ADMIN_CODE` y P4 activo, o
- URL `?p4debug=1`

Muestra en tiempo real:

| Sección | Contenido |
|---|---|
| Identidad | userId, P4 enabled, último pull, errores, queue pendiente |
| Monthly — capas | Conteo en memoria / localStorage / IDB / Firebase |
| Monthly — detalle | Tabla: año · mes · estado · _updatedAt · id (tail) |
| Monthly — Firebase | Mismo detalle para la capa Firebase |
| Audit history | Count local / Firebase / tombstones |

Botón **↻ Refresh** para actualizar sin recargar.

**Herramienta temporal**: retirar cuando no sea necesario eliminando el bloque HTML `#p4-debug-panel` y la función `refreshP4DebugPanel()`.

---

## 15. Herramientas de diagnóstico (consola)

Disponibles en `window.P4Debug`:

```javascript
// Inspección
P4Debug.listLocalAuditIds()           // sync — IDs en localStorage
await P4Debug.listFirebaseAuditIds()  // IDs en Firebase
await P4Debug.listTombstoneIds()      // tombstones en Firebase
await P4Debug.diffAuditSync()         // diff entre capas (5 categorías)
await P4Debug.inspectMonthly()        // estado monthly en 4 capas

// Sync
await P4Debug.pullFromFirebase()      // pull completo
P4Debug.rollbackPull()                // rollback al estado pre-pull
await P4Debug.uploadLocalToFirebase() // upload inicial (dry-run por defecto)
P4Debug.dryRunUpload()                // dry-run síncrono

// Limpieza (requieren { confirm:true })
await P4Debug.nukeLocalMonthlyPending({ confirm:true })  // borra pending local
await P4Debug.nukeAudits({ confirm:true })               // reset completo auditorías
await P4Debug.fullLocalReset({ confirm:true })           // reset local completo
```

---

## 16. Invariantes del sistema

Estas invariantes nunca deben romperse:

1. **localStorage es siempre la fuente primaria** — IDB y Firebase son write-through secundarios
2. **El pull nunca borra registros locales** sin un tombstone en Firebase
3. **Los tombstones solo aplican a auditorías** — los MonthRecords se borran directamente
4. **Un DELETE de monthly debe limpiar las 3 capas**: localStorage + IDB + Firebase
5. **Si IDB no se limpia en un delete, hydrateFromIDB resucitará el registro** en el próximo arranque
6. **`_p4Decorate` sobreescribe `_updatedAt`** — el timestamp en Firebase puede diferir del local
7. **La cola offline es last-write-wins por path** — múltiples writes al mismo path colapsan al último
8. **Sin flag P4 activo, toda la infraestructura es no-op** — el sistema funciona como local-only
9. **Firebase nunca es fuente autoritativa** — en caso de duda, local gana
10. **Los AuditRecords son append-only** — no se modifican una vez creados, solo se borran

---

## 17. Seguridad Firebase (P5)

Ver documentación completa: `docs/FIREBASE_SECURITY.md`  
Archivo de reglas: `firebase-database.rules.json`

**Resumen**:
- Deny-by-default en root
- `auth != null` en todos los paths (`pilotpay/**`)
- Auth model: Firebase Anonymous Auth (REST, sin SDK)
- Limitación: `auth.uid` ≠ código de usuario app → sin aislamiento real por usuario a nivel Firebase
- Solución a largo plazo: Firebase Custom Auth + backend que emita tokens con `uid = código_usuario_app`
