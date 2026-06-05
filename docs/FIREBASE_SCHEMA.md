# PilotPay — Firebase RTDB Schema (P4.7)

**Versión:** 1.1  
**Estado:** Implementado y validado  
**Fecha:** 2026-06-05  
**Última actualización:** P4.7 — Sistema de borrado robusto completado  

---

## 1. Estructura de rutas

```
pilotpay/
  usuarios/
    {userId}/                     ← Existente. Gestionado por saveUserData().
      pass, name, apellidos, funcion, nivel, base, irpf, ingreso, admin, alias

  permisos/
    {userId}/                     ← Existente. Gestionado por savePermsToFirebase().
      funciones: [...], bases: [...]

  perfiles/
    {userId}/                     ← Existente. Gestionado por saveUserData().
      Campos de FinancialProfile + FiscalHistory (historicoFiscal).

  historicos/                     ← NUEVO en P4.
    {userId}/
      auditorias/
        {auditId}/                ← Un nodo por AuditRecord.
      monthly/
        {year}_{month}/           ← Un nodo por MonthRecord. Ej: "2026_5".
      deletedAuditorias/
        {auditId}/                ← Tombstones de auditorías eliminadas (P4 sync).

  deletedUsers/                   ← NUEVO en P4.7.
    {userId}/                     ← Tombstone de usuario eliminado.
```

**Regla de naming de `{userId}`:** código de usuario en mayúsculas (ej. `ESH`, `BZP`).  
**Regla de naming de `{auditId}`:** campo `id` del AuditRecord (`timestamp_random5`).  
**Regla de naming de `{year}_{month}`:** año e entero mes separados por guión bajo. Nunca dos puntos (`:` reservado para IDs internos de MonthRecord).

---

## 2. Nodo: AuditRecord (`historicos/{userId}/auditorias/{auditId}`)

Snapshot inmutable de una auditoría. **Nunca se modifica tras escritura inicial.**

```jsonc
{
  // ── Metadatos Firebase (añadidos en escritura, no en localStorage) ──
  "_schemaVersion":    1,                         // integer, versión del schema Firebase
  "_updatedAt":        "2026-05-24T14:32:15.123Z", // ISO 8601, momento de escritura a Firebase
  "_lastWriterDevice": "abc123xyz",               // pilotpay_device_id del dispositivo que escribió

  // ── Identificación ──
  "id":             "1748123456789_abc12",         // único, timestamp_random5
  "userId":         "ESH",
  "fechaAuditoria": "2026-05-24T14:32:15.123Z",
  "mes":            "Mayo",
  "anyo":           "2026",

  // ── Metadatos del trabajador (snapshot del momento) ──
  "nombre": "Eloy",
  "cargo":  "CMD",
  "nivel":  "3",

  // ── Resultados ──
  "liqTeorico":     2450.80,
  "liqReal":        2405.60,
  "diff":           -45.20,
  "estado":         "alerta",   // "ok" | "aviso" | "alerta"
  "nDiscrepancias": 3,
  "discrepancias": [
    { "concept": "Salario Base", "teorico": 1800.00, "real": 1780.00, "delta": -20.00, "status": "err" }
  ],

  // ── Datos extraídos del PDF ──
  "datosExtraidos": {
    "nif":             "12345678A",
    "nss":             "28/1234567890",
    "irpf_pct":        34.15,
    "total_devengado": 3200.00,
    "base_irpf":       3100.00,
    "acum_base_irpf":  15500.00,
    "acum_irpf":       5293.25,
    "dias_trabajados": 30
  }
}
```

**Política de escritura:** `fbUpdate` sobre el nodo padre `/auditorias` con `{ [auditId]: record }`.  
Esto es un PATCH sobre el dict de auditorías: añade el nodo nuevo sin tocar los existentes.

---

## 3. Nodo: MonthRecord (`historicos/{userId}/monthly/{year}_{month}`)

Estado completo del expediente de un mes. **Mutable — solo el dispositivo más reciente gana.**

```jsonc
{
  // ── Metadatos Firebase (añadidos/actualizados en cada escritura) ──
  "_schemaVersion":    1,
  "_updatedAt":        "2026-05-24T14:35:00.000Z",
  "_lastWriterDevice": "abc123xyz",

  // ── Identidad ──
  "id":           "ESH:2026:5",   // userId:year:month (interno, no cambia)
  "userId":       "ESH",
  "year":         2026,
  "month":        5,
  "mesLabel":     "Mayo",
  "schemaVersion": 1,

  // ── Máquina de estados ──
  "estado": "auditado",
  // Estados válidos: pendiente → pending_variables → pending_calculation
  //                 → pending_comparison → auditado | con_diferencias
  //                 → regularizado | reclamado → cerrado

  // ── Metadatos de ciclo de vida ──
  "metadata": {
    "createdFrom": "onVariablesConfirmed",
    "lastTransition": {
      "from": "pending_comparison", "to": "auditado",
      "at": "2026-05-24T14:32:15.123Z", "reason": "auditoria-completada"
    }
  },

  // ── Fuentes de datos (snapshots congelados) ──
  "variablesData":   { "_periodoFin": "2026-04-30T...", "...": "..." },
  "calculoTeorico":  {
    "engineVersion":   "1.0",
    "convenioVersion": "BCSA-2024",
    "calculatedAt":    "2026-05-24T14:15:00.000Z",
    "liquidoReal":     2450.80,
    "totalDevengado":  3200.00
  },
  "auditoria": {
    "fechaAuditoria":  "2026-05-24T14:32:15.123Z",
    "liqTeorico":      2450.80,
    "liqReal":         2405.60,
    "diferenciaNeta":  -45.20,
    "nDiscrepancias":  3,
    "discrepancias":   [{ "...": "..." }]
  },
  "regularizacion":  null,
  "reclamacion":     null,
  "resolvedPeriod": {
    "year": 2026, "month": 5, "mesLabel": "Mayo",
    "source": "periodoFin", "resolvedAt": "2026-05-24T14:10:00.000Z"
  },

  // ── Timestamps internos (del MonthRecord local, no de Firebase) ──
  "_createdAt": "2026-05-01T09:00:00.000Z",
  "_updatedAt": "2026-05-24T14:35:00.000Z"
}
```

**Política de escritura:** `fbUpdate` sobre el nodo padre `/monthly` con `{ ['2026_5']: record }`.  
PATCH sobre el dict de meses: solo toca el mes que cambió, nunca los demás.

---

## 4. Política de conflictos — last-writer-wins por `_updatedAt`

### Regla principal

Al leer un MonthRecord de Firebase para sincronizar con local:

```
si Firebase._updatedAt > local._updatedAt  →  Firebase gana → actualizar local
si local._updatedAt   > Firebase._updatedAt →  local gana   → subir a Firebase
si ambos iguales                            →  sin conflicto → no-op
```

### Por qué es suficiente

La máquina de estados de MonthRecord **nunca retrocede** (ver tabla de transiciones en pilotPayStore.js). El registro con `_updatedAt` más reciente siempre es el estado más avanzado — nunca puede representar una versión "anterior" del expediente.

### Auditorías: sin conflicto posible

Cada AuditRecord tiene `id = timestamp_random5`. Dos dispositivos que crean auditorías simultáneamente generan IDs distintos → merge natural sin colisión.

### Casos límite documentados

| Caso | Comportamiento |
|------|---------------|
| Mismo dispositivo, misma sesión | `_lastWriterDevice` igual → no hay conflicto real |
| Dos dispositivos, meses distintos | Sin conflicto (nodos RTDB independientes) |
| Dos dispositivos, mismo mes, estados diferentes | Gana el `_updatedAt` más alto |
| Dispositivo offline crea registro, otro dispositivo también | IDs distintos para auditorías. Para monthly: el offline tiene `_updatedAt` local — al sincronizar se compara con Firebase y gana el más reciente |
| Firebase devuelve null (ruta vacía) | Se asume que local es la fuente → se sube sin conflicto |

---

## 5. Claves legacy ignoradas (nunca se suben a Firebase)

| Clave | Razón |
|-------|-------|
| `pilotpay_audit_history_v1` | Sin scope de usuario — origen desconocido |
| `pilotpay_audit_history_v1_` | Variante con trailing underscore — artefacto histórico |
| `pilotpay:_:*` | userId='_' — datos de sesión anónima sin login |
| `pilotpay_theme_*` | Preferencia visual, no portable |
| `*:idb_migration_v1` | Flag interno de migración IDB |
| `pilotpay_device_id` | Identificador de dispositivo, no de usuario |
| `pilotpay_migration_backup_*` | Backups de migrate.html, temporales |

---

## 6. Firebase Rules requeridas (P4)

```json
{
  "rules": {
    "pilotpay": {
      ".read":  "auth != null",
      ".write": "auth != null",
      "historicos": {
        "$userId": {
          ".read":  "auth != null",
          ".write": "auth != null"
        }
      }
    }
  }
}
```

Las reglas actuales (`auth != null` en raíz) ya cubren `historicos/`. No requieren cambio.

---

## 7. Compatibilidad con migrate.html y localStorage legacy

- `migrate.html` sigue exportando/importando `audit_history_v1` y `monthly_v1` de localStorage. No cambia.
- Firebase `historicos/` es **adicional** — las claves localStorage no desaparecen.
- Si un usuario migra datos via `migrate.html` antes de P4: los datos llegarán a localStorage. Al primer write real (nueva auditoría), el sink los subirá a Firebase.
- Si un usuario ya tiene datos en Firebase `historicos/` (de una sesión anterior con P4): no se sobreescriben por el import de migrate.html (migrate.html solo toca localStorage, no Firebase historicos).

---

## 7. Nodo: deletedUsers (P4.7 — Sistema de borrado robusto)

### Ubicación: `pilotpay/deletedUsers/{userId}`

Tombstone de usuario eliminado. Registro permanente para trazabilidad y prevención de resurrecciones.

```jsonc
{
  // ── Identificación ──
  "userId":           "TEST",                      // string, código del usuario eliminado

  // ── Metadatos de borrado ──
  "deletedAt":        1717594800000,               // number, timestamp ms (Date.now())
  "deletedBy":        "ESH",                       // string, admin que eliminó (o 'self')
  "deletedByDevice":  "abc123xyz",                 // string, device ID (pilotpay_device_id)
  "schemaVersion":    1                            // number, versión del schema tombstone
}
```

### Características

**Inmutabilidad:** Una vez creada, la tombstone NO se modifica ni elimina (salvo GC futuro Fase 2).

**Creación:** `purgeUser()` crea tombstone ANTES de borrar datos del usuario.

**Uso:**
- Trazabilidad: registro permanente de usuarios eliminados
- Anti-resurrección (Fase 2): prevenir que sync recree usuario borrado
- Auditoría: histórico de borrados

**Flujo de borrado (Fase 1):**

1. ✅ `createDeletedUserTombstone(userId)` → crea en `/deletedUsers/{userId}`
2. ✅ Si tombstone falla → **ABORTAR purga completa**
3. ✅ `purgeFirebaseForUser(userId)` → borra `/usuarios`, `/perfiles`, `/permisos`, `/historicos`
4. ✅ `purgeLocalStorageForUser(userId)` → borra todas las claves `pilotpay:{userId}:*`
5. ✅ `purgeIndexedDBForUser(userId)` → borra registros con `userId` en IDB
6. ✅ `purgeQueuesForUser(userId)` → borra colas P4 y offline
7. ✅ `purgeMemoryForUser(userId)` → limpia variables globales
8. ✅ `verifyUserPurged(userId)` → verifica ausencia de residuos

**Validación Firebase Rules:**
```json
".validate": "!newData.exists() || (newData.hasChildren(['userId', 'deletedAt', 'deletedBy']) && newData.child('userId').isString() && newData.child('deletedAt').isNumber() && newData.child('deletedBy').isString())"
```

**GC futuro (Fase 2):** Tombstones > 180 días pueden limpiarse (no implementado).

---

## 8. Ruta de Firebase NO afectada por P4

Las siguientes rutas **no se modifican en P4**:

- `pilotpay/usuarios/` — sin cambio
- `pilotpay/permisos/` — sin cambio
- `pilotpay/perfiles/` — sin cambio
- `pilotpay/rutas/` — sin cambio
- `pilotpay/solicitudes/` — sin cambio
