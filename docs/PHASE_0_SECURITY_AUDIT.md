# FASE 0: AUDITORÍA DE PERSISTENCIAS — PilotPay 4.0

**Fecha:** 10/06/2026  
**Rama:** `pilotpay-4-security-phase-0`  
**Objetivo:** Identificar y bloquear persistencias de datos sensibles

---

## PERSISTENCIAS DETECTADAS

### localStorage

**Claves con datos SENSIBLES:**

| Clave | Datos | Sensibilidad | Función escritura |
|-------|-------|--------------|-------------------|
| `pilotpay:{userId}:audit_history_v1` | Auditorías con nominaV2 | **CRÍTICA** | `saveAuditRecord()` |
| `pilotpay:{userId}:monthly_v1` | Variables mensuales | **ALTA** | `PilotPayStore._saveMonthly()` |
| `pilotpay_v2_{userId}` | Perfil con IRPF, CCAA | **ALTA** | `saveUserData()` |
| `pilotpay_perms_cache` | Permisos admin | **MEDIA** | `_cachePerms()` |

**Claves NO sensibles (permitidas):**

| Clave | Datos | Función |
|-------|-------|---------|
| `pilotpay:{userId}:p4_queue` | Cola sync (metadatos) | `P4.enqueue()` |
| `pilotpay:{userId}:last_sync_at` | Timestamp | `P4._markSynced()` |
| `pilotpay_theme_{userId}` | Tema UI | `setTheme()` |
| `pilotpay_device_id` | Device ID | Auto-gen |
| `pp_ui_mode_v1` | Modo UI | `setUIMode()` |

---

### IndexedDB

**Stores con datos SENSIBLES:**

| Store | Contenido | Sensibilidad | Función |
|-------|-----------|--------------|---------|
| `auditHistory` | Auditorías completas | **CRÍTICA** | `PilotPayLocalDB.saveAudit()` |
| `monthlyRecords` | Variables mensuales | **ALTA** | `PilotPayLocalDB.saveMonthly()` |

---

### Firebase RTDB

**Paths con datos SENSIBLES:**

| Path | Contenido | Sensibilidad | Función |
|------|-----------|--------------|---------|
| `pilotpay/usuarios/{code}` | Nombre, contraseña, función, nivel | **CRÍTICA** | Admin only |
| `pilotpay/perfiles/{code}` | NIF, IRPF, historicoFiscal | **CRÍTICA** | `saveUserData()` |
| `pilotpay/historicos/{userId}/auditorias/{id}` | Auditorías con nominaV2 | **CRÍTICA** | `P4.uploadAudit()` |
| `pilotpay/historicos/{userId}/monthly/{year}_{month}` | Variables mensuales | **ALTA** | `P4.uploadMonthly()` |

**Paths NO sensibles:**

| Path | Contenido |
|------|-----------|
| `pilotpay/solicitudes/{key}` | Solicitudes cambio base |
| `pilotpay/rutas/{key}` | Tabla ICAO (sin uso) |
| `pilotpay/historicos/{userId}/deletedAuditorias/{id}` | Tombstones |

---

## FUNCIONES CRÍTICAS IDENTIFICADAS

### Guardado Auditorías

**Función:** `saveAuditRecord(nomData, calcData, diffData)`  
**Ubicación:** `frontend/index.html` ~línea 18000  
**Persistencias:**
1. localStorage: `pilotpay:{userId}:audit_history_v1`
2. IndexedDB: `auditHistory` store
3. Firebase: `pilotpay/historicos/{userId}/auditorias/{id}`

**Datos sensibles:**
- nominaV2 completa (NIF, NSS, nómina)
- diffData con discrepancias
- calcData con variables

---

### Guardado MonthRecords

**Función:** `PilotPayStore._saveMonthly(userId, year, month, data)`  
**Ubicación:** `frontend/js/pilotPayStore.js`  
**Persistencias:**
1. localStorage: `pilotpay:{userId}:monthly_v1`
2. IndexedDB: `monthlyRecords` store
3. Firebase: `pilotpay/historicos/{userId}/monthly/{year}_{month}`

**Datos sensibles:**
- Variables mensuales (HV, dietas, DPO)
- Auditoría snapshot
- Regularización

---

### Guardado Perfil

**Función:** `saveUserData(userId)`  
**Ubicación:** `frontend/index.html` ~línea 7350  
**Persistencias:**
1. localStorage: `pilotpay_v2_{userId}`
2. Firebase: `pilotpay/perfiles/{userId}`

**Datos sensibles:**
- NIF
- IRPF %
- historicoFiscal
- CCAA

---

### Lectura Usuarios

**Función:** `loadUsersFromFirebase()`  
**Ubicación:** `frontend/index.html` ~línea 7200  
**Problema:**
- Descarga TODOS los usuarios
- Incluye contraseñas (hash cliente)
- Almacena en variable global `USERS`

---

## BLOQUEADORES A IMPLEMENTAR

### 1. SECURITY_MODE Global

```javascript
// Constante global en index.html
const SECURITY_MODE = localStorage.getItem('pilotpay_security_mode') === '1';
```

Activación:
```javascript
localStorage.setItem('pilotpay_security_mode', '1');
location.reload();
```

---

### 2. Bloquear saveAuditRecord()

```javascript
function saveAuditRecord(nomData, calcData, diffData) {
  if (SECURITY_MODE) {
    console.warn('[SECURITY MODE] saveAuditRecord() bloqueado — datos sensibles NO persistidos');
    return false;
  }
  // ... resto del código actual
}
```

---

### 3. Bloquear PilotPayStore._saveMonthly()

```javascript
_saveMonthly(userId, year, month, data) {
  if (typeof SECURITY_MODE !== 'undefined' && SECURITY_MODE) {
    console.warn('[SECURITY MODE] _saveMonthly() bloqueado');
    return;
  }
  // ... resto del código actual
}
```

---

### 4. Bloquear saveUserData()

```javascript
function saveUserData(userId) {
  if (SECURITY_MODE) {
    console.warn('[SECURITY MODE] saveUserData() bloqueado');
    return;
  }
  // ... resto del código actual
}
```

---

### 5. Bloquear loadUsersFromFirebase()

```javascript
async function loadUsersFromFirebase() {
  if (SECURITY_MODE) {
    console.warn('[SECURITY MODE] loadUsersFromFirebase() bloqueado — usando datos mock');
    // Retornar solo usuario actual mock
    const mockUser = {
      [currentUser]: {
        name: 'USUARIO DEMO',
        funcion: 'CMD',
        nivel: 'B',
        base: 'MAD',
        admin: false
      }
    };
    Object.assign(USERS, mockUser);
    return;
  }
  // ... resto del código actual
}
```

---

### 6. Bloquear P4 sync

```javascript
// En pilotPayStore.js
async uploadAudit(userId, auditRecord) {
  if (typeof SECURITY_MODE !== 'undefined' && SECURITY_MODE) {
    console.warn('[SECURITY MODE] P4.uploadAudit() bloqueado');
    return { ok: false, reason: 'SECURITY_MODE' };
  }
  // ... resto
}

async uploadMonthly(userId, year, month, data) {
  if (typeof SECURITY_MODE !== 'undefined' && SECURITY_MODE) {
    console.warn('[SECURITY MODE] P4.uploadMonthly() bloqueado');
    return { ok: false, reason: 'SECURITY_MODE' };
  }
  // ... resto
}
```

---

## PERSISTENCIAS QUE SIGUEN ACTIVAS

✅ **Permitidas (NO bloqueadas):**

1. **Configuración UI:**
   - `pilotpay_theme_{userId}`
   - `pp_ui_mode_v1`
   - `pilotpay_device_id`

2. **Colas sync (solo metadatos):**
   - `pilotpay:{userId}:p4_queue`
   - `pilotpay:{userId}:offline_queue`

3. **Timestamps:**
   - `pilotpay:{userId}:last_sync_at`

4. **Sesión temporal:**
   - `currentUser` (variable global, NO localStorage)
   - `profileData` (variable global, NO localStorage)

**Razón:** No contienen datos personales/salariales sensibles

---

## RIESGOS QUE QUEDAN ABIERTOS

⚠️ **SECURITY_MODE NO elimina:**

1. **Datos ya guardados:**
   - localStorage existente
   - IndexedDB existente
   - Firebase RTDB existente

2. **Lecturas:**
   - Usuarios pueden seguir leyendo datos antiguos
   - Admin puede seguir leyendo Firebase

3. **Arquitectura fundamental:**
   - API Key sigue siendo pública (por diseño Firebase)
   - Anonymous Auth sigue activo
   - Cross-user access sigue posible
   - Contraseñas siguen en pilotpay/usuarios/

**SECURITY_MODE solo bloquea NUEVAS persistencias sensibles.**

**Migración completa requiere Fases 1-4.**

---

## ACTIVACIÓN/DESACTIVACIÓN

### Activar SECURITY_MODE

```javascript
// Consola navegador (F12)
localStorage.setItem('pilotpay_security_mode', '1');
location.reload();
```

### Desactivar SECURITY_MODE

```javascript
localStorage.removeItem('pilotpay_security_mode');
location.reload();
```

### Verificar estado

```javascript
console.log('SECURITY_MODE:', SECURITY_MODE ? 'ACTIVO' : 'INACTIVO');
```

---

## PRUEBAS MANUALES

### Test 1: Bloqueo saveAuditRecord()

```
1. Activar SECURITY_MODE
2. Cargar Variables
3. Calcular nómina
4. Cargar PDF nómina
5. Generar comparativa
6. Intentar guardar auditoría
7. ✅ Verificar consola: "[SECURITY MODE] saveAuditRecord() bloqueado"
8. ✅ Verificar NO aparece en localStorage:audit_history_v1
9. ✅ Verificar NO aparece en IndexedDB:auditHistory
```

### Test 2: Bloqueo saveUserData()

```
1. Activar SECURITY_MODE
2. Abrir Perfil
3. Modificar IRPF
4. Guardar
5. ✅ Verificar consola: "[SECURITY MODE] saveUserData() bloqueado"
6. ✅ Verificar profileData en memoria cambió (temporal)
7. ✅ Verificar localStorage NO cambió
8. ✅ Verificar Firebase NO cambió
```

### Test 3: Bloqueo loadUsersFromFirebase()

```
1. Activar SECURITY_MODE
2. Logout
3. Login
4. ✅ Verificar consola: "[SECURITY MODE] loadUsersFromFirebase() bloqueado"
5. ✅ Verificar variable USERS solo contiene usuario actual
6. ✅ Verificar NO se descargó lista completa
```

### Test 4: Bloqueo P4 sync

```
1. Activar SECURITY_MODE
2. Activar P4: localStorage.setItem('pilotpay_p4_enabled', '1')
3. Cargar Variables
4. Guardar mes
5. ✅ Verificar consola: "[SECURITY MODE] P4.uploadMonthly() bloqueado"
6. ✅ Verificar Firebase NO recibió datos nuevos
```

### Test 5: Configuración UI sigue funcionando

```
1. Activar SECURITY_MODE
2. Cambiar tema
3. ✅ Verificar tema cambia
4. ✅ Verificar localStorage:pilotpay_theme_{userId} actualizado
5. ✅ Verificar NO bloqueado
```

---

## AVISO VISUAL PROPUESTO

**Ubicación:** Console log automático al cargar

```javascript
if (SECURITY_MODE) {
  console.warn(
    '%c🛡️ PilotPay 4.0 Security Mode ACTIVE',
    'color: orange; font-size: 14px; font-weight: bold'
  );
  console.warn('Sensitive data persistence DISABLED');
  console.warn('Existing data remains readable');
  console.warn('New audits/profiles/monthly will NOT be saved');
}
```

**Opcional:** Badge discreto en dashboard (esquina inferior)

```html
<div id="security-mode-badge" style="
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: #ff6b00;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  z-index: 9999;
  display: none;
">
  🛡️ Security Mode
</div>
```

```javascript
if (SECURITY_MODE) {
  document.getElementById('security-mode-badge').style.display = 'block';
}
```

---

**FIN DE AUDITORÍA FASE 0**
