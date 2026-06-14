# 🔄 HANDOFF FABLE 5 — PHASE 1: IDENTIDAD SEGURA

**Fecha handoff:** 10/06/2026  
**Fase actual:** Transición Fase 0 → Fase 1  
**Documento objetivo:** Continuidad sin pérdida de contexto  
**Proyecto:** PilotPay 4.0 — Migración Arquitectura Segura

---

## 1. ESTADO ACTUAL DEL PROYECTO

### Rama Activa

```bash
Rama: pilotpay-4-security-phase-0
Commit: a99e13a (audit: complete persistence map — exhaustive inventory)
Parent commits:
  - 5881551: security(phase-0): implement SECURITY_MODE
  - Commits anteriores en avatars-redesign
```

### Fases Completadas

| Fase | Estado | Commit | Documentación |
|------|--------|--------|---------------|
| **Fase 0** | ✅ COMPLETADA | `5881551` | `docs/PHASE_0_IMPLEMENTATION_REPORT.md` |
| **Fase 0.5** | ✅ COMPLETADA | `a99e13a` | `docs/PHASE_0.5_PERSISTENCE_MAP.md` |

### Archivos Clave Creados

1. `docs/AUDITORIA_ARQUITECTURA_ACTUAL_V1.md` — Auditoría arquitectura actual (5 riesgos críticos)
2. `docs/DISENO_ARQUITECTURA_SEGURA_BASE_V1.md` — Diseño arquitectura segura (roadmap 12 semanas)
3. `docs/PHASE_0_SECURITY_AUDIT.md` — Auditoría persistencias Fase 0
4. `docs/PHASE_0_IMPLEMENTATION_REPORT.md` — Informe implementación SECURITY_MODE
5. `docs/PHASE_0.5_PERSISTENCE_MAP.md` — Mapa exhaustivo persistencias (20 puntos)

### Archivos Modificados (Código)

1. `frontend/index.html` (+45 líneas guards SECURITY_MODE)
2. `frontend/js/pilotPayStore.js` (+23 líneas guards P4)
3. `docs/index.html` (sincronizado)
4. `docs/js/pilotPayStore.js` (sincronizado)

---

## 2. ARQUITECTURA ACTUAL RESUMIDA

### Frontend

**Archivo principal:** `frontend/index.html` (~20.000 líneas)

**Componentes:**
- Login/Auth (Anonymous Firebase REST)
- Dashboard 2.x
- Variables mensuales
- Calculadora nómina
- Parser PDF nóminas V1 + V2
- Comparativa inteligente
- Simulador IRPF
- Historial auditorías
- Biblioteca Normativa
- Generación PDFs
- Sistema avatares

**Módulos JS:**
- `pilotPayStore.js` — Store central + P4 sync
- `pilotPayLocalDB.js` — IndexedDB wrapper
- `auditEngine.js` — Motor auditoría puro
- `userProfile.js` — Perfil y aliases
- `userAdmin.js` — Gestión usuarios
- `financialProfile.js` — Perfil financiero
- `fiscalHistory.js` — Historial fiscal
- `avatarManager.js` — Sistema avatares

---

### Persistencia (Triple Capa)

```
localStorage (primario)
  ↓ write-through
IndexedDB (secundario)
  ↓ write-through
Firebase RTDB (sync multi-device)
```

**Claves localStorage críticas:**
- `pilotpay:{userId}:audit_history_v1` — Auditorías con nominaV2
- `pilotpay:{userId}:monthly_v1` — Variables mensuales
- `pilotpay_v2_{userId}` — Perfil (NIF, IRPF, fiscal)

**IndexedDB stores:**
- `auditHistory` — Duplicado auditorías
- `monthlyRecords` — Duplicado monthly

**Firebase RTDB paths:**
- `pilotpay/usuarios/{code}` — **CON CONTRASEÑAS** ⚠️
- `pilotpay/perfiles/{code}` — NIF, IRPF, fiscal
- `pilotpay/historicos/{userId}/auditorias/{id}` — Auditorías
- `pilotpay/historicos/{userId}/monthly/{year}_{month}` — Variables

---

### Firebase

**Auth:** Anonymous Auth (REST API, sin SDK)  
**RTDB URL:** `https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app`  
**API Key:** Expuesta en código (pública por diseño web) ⚠️

**Reglas actuales:**
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

**⚠️ PROBLEMA:** Sin aislamiento por uid, cross-user access posible

---

### Sincronización P4

**Flag:** `localStorage.getItem('pilotpay_p4_enabled') === '1'`

**Flujo:**
```
Guardado local (LS/IDB)
  ↓
P4.notifyAuditRecord() / _notifyFirebase()
  ↓
Write-through a Firebase RTDB
  ↓
Si falla → Encolar en p4_queue
```

**Guards:**
- `_isP4Enabled()` — Flag activo
- `_ready` — Post-init
- `!_isHydratingFromIDB` — No durante hydration

---

## 3. RIESGOS CRÍTICOS PENDIENTES

### R1: API Key Firebase Pública

**Estado:** ⚠️ ABIERTO  
**Exposición:** `frontend/index.html:7072`  
**Problema:** Cualquiera con la key puede autenticarse anónimamente  
**Nota importante:** La API Key web de Firebase es PÚBLICA POR DISEÑO. La seguridad NO viene de ocultarla, sino de Firebase Auth real + reglas estrictas + dominios autorizados  
**Solución:** Fase 1 (Firebase Email/Password Auth + reglas uid)

---

### R2: Contraseñas en RTDB

**Estado:** ⚠️ ABIERTO  
**Path:** `pilotpay/usuarios/{code}/pass`  
**Problema:** Hash cliente visible a cualquier sesión autenticada  
**Exposición:** `loadUsersFromFirebase()` descarga TODO el nodo  
**Solución:** Fase 1 (eliminar campo pass, migrar a Firebase Auth)

---

### R3: Cross-User Access

**Estado:** ⚠️ ABIERTO  
**Problema:** Reglas Firebase permiten `auth != null` sin validar `auth.uid === $userId`  
**Consecuencia:** Usuario A puede leer/escribir datos de Usuario B técnicamente  
**Solución:** Fase 2 (reestructurar RTDB por uid + reglas estrictas)

---

### R4: Datos Sin Cifrar

**Estado:** ⚠️ ABIERTO  
**Exposición:** localStorage, IndexedDB, Firebase RTDB  
**Contenido:** NIF, NSS, nóminas completas, IRPF, variables, auditorías  
**Problema:** Datos sensibles en texto plano  
**Solución:** Fase 3 (AES-256-GCM client-side, clave derivada de sesión)

---

### R5: Login Client-Side Bypassable

**Estado:** ⚠️ ABIERTO  
**Función:** `doLogin()` en `frontend/index.html`  
**Problema:** Validación cliente contra `pilotpay/usuarios/{code}/pass` (hash cliente)  
**Consecuencia:** Bypassable vía DevTools  
**Solución:** Fase 1 (Firebase Auth server-side)

---

## 4. DECISIONES YA APROBADAS

### ✅ Modelo de Identidad

**Decisión:** Firebase Email/Password Auth  
**Email format:** `{code}@pilotpay.internal` (ej: `esh@pilotpay.internal`)  
**UID:** Generado por Firebase automáticamente  
**Custom Claims:** `{ role: "user|admin", code: "ESH" }`  
**Correlación:** Bidireccional `pilotpay/users/{uid}/code` ↔ `pilotpay/userCodes/{code}/uid`

---

### ✅ Estructura Datos Firebase

**Decisión:** Reestructurar por uid

**Nueva estructura:**
```
pilotpay/
├─ users/{auth.uid}/
├─ profiles/{auth.uid}/
├─ audits/{auth.uid}/{auditId}/
├─ monthly/{auth.uid}/{year}_{month}/
├─ documents/{auth.uid}/{docId}/
├─ config/{auth.uid}/
├─ tombstones/{auth.uid}/
├─ logs/{auth.uid}/{logId}/
├─ userCodes/{code}/ → uid (reverse mapping)
└─ shared/ (read-only)
```

---

### ✅ Reglas Firebase

**Decisión:** Deny-by-default + auth.uid validation

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "pilotpay": {
      "users": {
        "$userId": {
          ".read": "auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin'",
          ".write": "auth.uid === $userId"
        }
      }
    }
  }
}
```

---

### ✅ Cifrado Local

**Decisión:** AES-256-GCM client-side  
**Librería:** crypto-js  
**Clave:** Derivada de idToken (rotación automática por sesión)  
**Alcance:** localStorage + IndexedDB (datos sensibles)  
**NO cifrar:** Config UI, device ID, timestamps, flags

---

### ✅ Backend Documental

**Decisión:** Mover parsers PDF a backend (Fase 4)  
**Flujo:** Upload PDF → Parse server-side → Retorna estructura limpia  
**Storage:** Firebase Storage para PDFs, metadata en RTDB  
**Motivo:** Minimizar exposición datos sensibles en cliente

---

### ✅ Roadmap Aprobado

**Total:** 12 semanas (3 meses) hasta beta cerrada segura

| Fase | Duración | Objetivo |
|------|----------|----------|
| Fase 0 | 1 sem | Contención (✅ COMPLETADA) |
| Fase 1 | 3 sem | Identidad segura ← **PRÓXIMO** |
| Fase 2 | 3 sem | Aislamiento uid |
| Fase 3 | 3 sem | Cifrado local |
| Fase 4 | 2 sem | Backend documental |
| Fase 5 | TBD | Escalabilidad (futuro) |

---

## 5. DECISIONES DESCARTADAS

### ❌ Mantener Anonymous Auth

**Razón:** No permite aislamiento uid real, contraseñas siguen en RTDB

---

### ❌ Cifrar Contraseñas en RTDB

**Razón:** Parche temporal, solución real es Firebase Auth

---

### ❌ Rotar API Key como solución

**Razón:** API Key web de Firebase es PÚBLICA por diseño. La seguridad viene de Auth + reglas, NO de ocultar la key

---

### ❌ Backend opcional

**Razón:** Upload/parse PDFs en cliente expone datos sensibles, backend es OBLIGATORIO (Fase 4)

---

### ❌ Implementar Fase 1-4 en paralelo

**Razón:** Alto riesgo regresión, roadmap secuencial es más seguro

---

### ❌ SECURITY_MODE como solución permanente

**Razón:** Es contención temporal, NO resuelve riesgos críticos

---

## 6. ESTADO EXACTO DE SECURITY_MODE

### Qué Bloquea

✅ **6 funciones críticas bloqueadas:**

1. `loadUsersFromFirebase()` — Descarga masiva usuarios
2. `saveUserData()` — Guardado perfil (NIF, IRPF, fiscal)
3. `saveAuditRecord()` — Guardado auditorías (nominaV2)
4. `_saveMonthly()` — Guardado MonthRecords
5. `_notifyFirebase()` — Sync P4 monthly
6. `_notifyFirebaseAudit()` — Sync P4 auditorías

**Resultado:** Nuevas persistencias sensibles bloqueadas

---

### Qué NO Bloquea

❌ **Persistencias permitidas:**

- Config UI (tema, modo)
- Device ID
- Timestamps sync
- Flags (P4, parser debug)
- Colas sync (p4_queue, offline_queue) ⚠️
- Backups pre-pull (p4_pull_backup_*) ⚠️

❌ **Datos antiguos:**
- localStorage existente
- IndexedDB existente
- Firebase RTDB existente

❌ **Lecturas:**
- Usuario puede leer datos antiguos
- Admin puede leer Firebase

---

### Archivos Modificados

**`frontend/index.html`:**
- Línea 7070-7089: Definición SECURITY_MODE + console warnings
- Línea 7219-7238: Guard `loadUsersFromFirebase()`
- Línea 7315-7321: Guard `saveUserData()`
- Línea 6375-6383: Guard `saveAuditRecord()`
- Línea 2191-2206: Badge visual HTML
- Línea 7738-7743: Mostrar badge en `enterApp()`

**`frontend/js/pilotPayStore.js`:**
- Línea 101-106: Guard `_saveMonthly()`
- Línea 664-669: Guard `_notifyFirebase()`
- Línea 688-692: Guard `_notifyFirebaseAudit()`

**Total:** 68 líneas de guards defensivos

---

### Activación/Desactivación

**Activar:**
```javascript
localStorage.setItem('pilotpay_security_mode', '1');
location.reload();
```

**Desactivar:**
```javascript
localStorage.removeItem('pilotpay_security_mode');
location.reload();
```

**Verificar:**
```javascript
console.log('SECURITY_MODE:', SECURITY_MODE ? 'ACTIVO' : 'INACTIVO');
```

---

## 7. ESTADO DE PERSISTENCIAS

### localStorage (15 claves)

| Clave | Sensibilidad | SECURITY_MODE |
|-------|--------------|---------------|
| `pilotpay:{userId}:audit_history_v1` | CRÍTICA | ✅ Bloqueada |
| `pilotpay:{userId}:monthly_v1` | ALTA | ✅ Bloqueada |
| `pilotpay_v2_{userId}` | CRÍTICA | ✅ Bloqueada |
| `pilotpay_perms_cache` | MEDIA | ❌ NO |
| `pilotpay:{userId}:p4_queue` | MEDIA | ⚠️ Indirecto |
| `pilotpay:{userId}:offline_queue` | MEDIA | ⚠️ Indirecto |
| `pilotpay:{userId}:last_sync_at` | BAJA | ❌ NO |
| `pilotpay_theme_{userId}` | BAJA | ❌ NO |
| `pilotpay_device_id` | BAJA | ❌ NO |
| `pilotpay_p4_enabled` | BAJA | ❌ NO |
| `pilotpay_security_mode` | BAJA | ❌ NO |
| `pilotpay_parser_debug` | BAJA | ❌ NO |
| `pp_ui_mode_v1` | BAJA | ❌ NO |
| `pilotpay:{userId}:p4_pull_backup_*` | MEDIA-ALTA | ⚠️ NO protegido |
| `pilotpay_apikey` | BAJA | ❌ NO (legacy) |

---

### IndexedDB (5 stores)

| Store | Sensibilidad | SECURITY_MODE |
|-------|--------------|---------------|
| `auditHistory` | CRÍTICA | ✅ Bloqueada |
| `monthlyRecords` | ALTA | ✅ Bloqueada |
| `pendingSyncQueue` | BAJA | ❌ NO (poco uso) |
| `syncState` | BAJA | ❌ NO (poco uso) |
| `appSettings` | BAJA | ❌ NO (poco uso) |

---

### Firebase RTDB (8 paths activos)

| Path | Sensibilidad | SECURITY_MODE |
|------|--------------|---------------|
| `pilotpay/usuarios/{code}` | CRÍTICA (pass) | ✅ Bloqueada lectura |
| `pilotpay/perfiles/{code}` | CRÍTICA | ✅ Bloqueada escritura |
| `pilotpay/historicos/{uid}/auditorias/{id}` | CRÍTICA | ✅ Bloqueada |
| `pilotpay/historicos/{uid}/monthly/{y}_{m}` | ALTA | ✅ Bloqueada |
| `pilotpay/permisos` | MEDIA | ❌ NO |
| `pilotpay/solicitudes/{key}` | BAJA | ❌ NO |
| `pilotpay/rutas/{key}` | BAJA | ❌ NO (sin uso) |
| `pilotpay/historicos/{uid}/deletedAuditorias/{id}` | BAJA | ❌ NO |

---

### Variables Globales (6)

| Variable | Sensibilidad | Persistida |
|----------|--------------|------------|
| `currentUser` | BAJA | ❌ NO |
| `profileData` | ALTA | Solo si saveUserData() |
| `USERS` | CRÍTICA | ❌ NO (memoria) |
| `calcResult` | MEDIA | ❌ NO |
| `nomDataCached` | CRÍTICA | ❌ NO |
| `PilotPayMode` | BAJA | Via pp_ui_mode_v1 |

---

## 8. PRÓXIMO OBJETIVO OBLIGATORIO

# FASE 1 — IDENTIDAD SEGURA

**Duración:** 3 semanas  
**Objetivo:** Eliminar R1, R2, R5

---

### Semana 1: Implementar Firebase Auth

**Tareas:**
1. Integrar Firebase SDK (Auth)
2. Implementar signInWithEmailAndPassword()
3. Mapeo código → email interno
4. Backend endpoint crear usuarios (Node.js/Express)
5. Testing auth flow local

**Entregables:**
- Firebase Auth funcional
- Login con código + contraseña
- Token JWT válido
- Backend endpoint `/api/auth/create-user`

---

### Semana 2: Migrar Usuarios Beta

**Tareas:**
1. Script migración usuarios existentes
2. Crear cuentas Firebase Auth por código
3. Generar contraseñas temporales
4. Distribuir credenciales vía canal seguro
5. Crear tabla `pilotpay/userCodes/{code} → uid`

**Entregables:**
- Todos los usuarios migrados
- Correlación uid ↔ code funcional
- Credenciales distribuidas
- Backup pre-migración

---

### Semana 3: Eliminar Login Client-Side

**Tareas:**
1. Reemplazar `doLogin()` con Firebase Auth
2. Eliminar campo `pass` de `pilotpay/usuarios/`
3. Validar auth flow producción
4. Testing multi-device
5. Rollback plan si falla

**Entregables:**
- Login server-side funcional
- Contraseñas eliminadas de RTDB
- Testing completo
- Tag estable post-migración

---

### Riesgos Eliminados Post-Fase 1

✅ **R1:** API Key → Protegida (Firebase Auth + reglas)  
✅ **R2:** Contraseñas RTDB → Eliminadas  
✅ **R5:** Login client-side → Migrado a server

---

## 9. QUÉ NO DEBE TOCAR FABLE 5

### ❌ Parsers

**NO modificar:**
- Parser Nómina V1
- Parser Nómina V2
- Parser Variables (actual)
- Funciones extractPdfText()
- Lógica clasificación conceptos

**Razón:** Funcionan correctamente, riesgo regresión alto

---

### ❌ Cálculos

**NO modificar:**
- Calculadora nómina
- Motor auditoría (auditEngine.js)
- Comparativa inteligente
- Simulador IRPF
- Tablas salariales BCSA

**Razón:** Lógica validada, fuera del scope seguridad

---

### ❌ UX/UI

**NO modificar:**
- Dashboard 2.x
- Layouts responsive
- Sistema avatares
- Temas (dark/light)
- Tabs/navegación

**Razón:** Estable, no relacionado con seguridad

---

### ❌ Biblioteca Normativa

**NO modificar:**
- Convenio Colectivo
- Acuerdos
- Productividad
- Glosario
- Referencias cruzadas

**Razón:** Contenido validado, fuera del scope

---

### ❌ Funcionalidad Existente

**NO romper:**
- Variables mensuales
- Generación PDFs
- Historial auditorías
- Regularizaciones
- MonthRecords
- P4 sync (mantener compatible)

**Razón:** Usuarios beta dependen de estas funciones

---

### ✅ Qué SÍ Puede Modificar Fable 5

**Scope Fase 1:**
- Sistema autenticación (login/logout)
- Estructura `pilotpay/usuarios/` (eliminar pass)
- Creación usuarios (migrar a Firebase Auth)
- Correlación uid ↔ code
- Reglas Firebase (preparar para uid)
- Backend auth endpoints (nuevos)

**Scope futuro (Fases 2-4):**
- Reestructuración RTDB por uid (Fase 2)
- Cifrado localStorage/IDB (Fase 3)
- Backend parsers (Fase 4)

---

## 10. INSTRUCCIÓN DE ARRANQUE PARA NUEVA SESIÓN

### Prompt Listo para Copiar/Pegar

```
Continuamos PilotPay 4.0 — FASE 1: IDENTIDAD SEGURA

CONTEXTO:

Proyecto: PilotPay Beta 3.0 → Migración arquitectura segura
Rama: pilotpay-4-security-phase-0
Commit actual: a99e13a (audit: complete persistence map)
Documentos clave: HANDOFF_FABLE5_PHASE1.md

FASE 0: ✅ COMPLETADA
- SECURITY_MODE implementado (6 bloqueadores activos)
- Nuevas persistencias sensibles bloqueadas
- Inventario exhaustivo 20 persistencias
- Docs: PHASE_0_IMPLEMENTATION_REPORT.md, PHASE_0.5_PERSISTENCE_MAP.md

RIESGOS CRÍTICOS PENDIENTES:
- R1: API Key Firebase pública (por diseño web)
- R2: Contraseñas en pilotpay/usuarios/{code}/pass
- R3: Cross-user access (reglas sin uid)
- R4: Datos sin cifrar (LS/IDB/Firebase)
- R5: Login client-side bypassable

OBJETIVO FASE 1 (3 semanas):
Implementar Firebase Email/Password Auth real
- Eliminar contraseñas de RTDB
- Login server-side
- Correlación uid ↔ code
- Backend endpoint crear usuarios

DECISIONES YA APROBADAS:
- Firebase Auth como identidad ✅
- Email format: {code}@pilotpay.internal
- UID como clave principal futura
- Custom claims: { role, code }
- Roadmap 12 semanas aprobado

QUÉ NO TOCAR:
- Parsers (V1/V2)
- Cálculos (nómina, auditoría, simulador)
- UX/Dashboard
- Biblioteca Normativa
- Funcionalidad existente usuarios beta

PRIMERA TAREA:

Lee docs/HANDOFF_FABLE5_PHASE1.md completo.

Luego responde:
1. ¿Entiendes el contexto del proyecto?
2. ¿Qué riesgos críticos eliminará Fase 1?
3. ¿Cuál es la arquitectura auth actual vs futura?
4. ¿Qué NO debes modificar en Fase 1?
5. ¿Estás listo para comenzar Semana 1 de Fase 1?

NO implementes nada hasta confirmar comprensión completa.
```

---

## CHECKLIST PRE-HANDOFF

Antes de iniciar nueva sesión, verificar:

- [ ] Documento `HANDOFF_FABLE5_PHASE1.md` creado
- [ ] Rama `pilotpay-4-security-phase-0` limpia
- [ ] Commit `a99e13a` es HEAD
- [ ] SECURITY_MODE documentado
- [ ] Riesgos críticos claros
- [ ] Decisiones aprobadas/descartadas claras
- [ ] Roadmap Fase 1 detallado
- [ ] Restricciones "NO TOCAR" claras
- [ ] Prompt arranque listo

---

## REFERENCIAS CRÍTICAS

**Documentos obligatorios de lectura:**
1. `docs/AUDITORIA_ARQUITECTURA_ACTUAL_V1.md` — Riesgos críticos
2. `docs/DISENO_ARQUITECTURA_SEGURA_BASE_V1.md` — Arquitectura objetivo
3. `docs/PHASE_0_IMPLEMENTATION_REPORT.md` — Qué se implementó
4. `docs/PHASE_0.5_PERSISTENCE_MAP.md` — Todas las persistencias
5. `CLAUDE.md` — Contexto general proyecto

**Código crítico:**
- `frontend/index.html:7070-7089` — SECURITY_MODE
- `frontend/index.html:7600-7770` — Login actual
- `frontend/js/pilotPayStore.js` — P4 sync
- `frontend/js/pilotPayLocalDB.js` — IndexedDB

---

**FIN DE HANDOFF — FASE 1 LISTA PARA COMENZAR**
