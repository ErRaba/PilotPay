# Auditoría Real de Arquitectura Actual — PilotPay

**Fecha:** 10/06/2026  
**Objetivo:** Evaluación técnica exhaustiva de la arquitectura actual para determinar si es apta para PilotPay 4.0 con datos reales sensibles.

---

## A) MAPA DE ARQUITECTURA ACTUAL

### Estructura de Archivos

```
frontend/
├── index.html (22,204 líneas) ← MONOLITO CRÍTICO
├── api-client.js
├── migrate.html
├── parser-diagnostic.html
└── js/
    ├── auditEngine.js
    ├── avatarManager.js
    ├── convenioData.js
    ├── convenioKnowledge.js
    ├── financialProfile.js
    ├── fiscalHistory.js
    ├── pilotPayAnalytics.js
    ├── pilotPayDebug.js
    ├── pilotPayLocalDB.js
    ├── pilotPayStore.js
    ├── userAdmin.js
    ├── userProfile.js
    └── normativa/ (15+ archivos)
```

**Hallazgo crítico:**

✅ Módulos JS separados: estructura modular mejorada  
❌ index.html monolítico: **22,204 líneas** con lógica crítica embebida

---

### Lógica en frontend/index.html

**Contenido del monolito (líneas 22,204):**

| Componente | Líneas Aprox | Descripción |
|------------|--------------|-------------|
| **Config Firebase** | 7070-7200 | URL, API Key, auth anónimo |
| **Login/Auth** | 7516-7600 | Validación credenciales client-side |
| **Parser PDF Nóminas** | 13000-15000 | Parser V1 + Parser V2 |
| **Calculadora** | 10000-12000 | Motor cálculo nómina |
| **UI Components** | 1000-6000 | Dashboard, comparativa, simulador |
| **Firebase Operations** | 7000-9000 | CRUD Firebase directo |
| **Data Persistence** | Disperso | localStorage, IndexedDB |

**Hallazgo crítico:**

❌ **Toda la lógica de negocio vive en client-side**  
❌ **No existe backend operativo protegiendo operaciones críticas**  
❌ **Validaciones de seguridad en JavaScript expuesto**

---

## B) INVENTARIO DE DATOS PERSISTIDOS

### localStorage (Client-Side)

**Claves detectadas en código real:**

| Clave | Contenido | Sensibilidad | Crítico |
|-------|-----------|--------------|---------|
| `pilotpay:{userId}:monthly_v1` | MonthRecords con variables mensuales | **ALTA** | ✅ SÍ |
| `pilotpay:{userId}:audit_history_v1` | Historial auditorías con nóminas | **CRÍTICA** | ✅ SÍ |
| `pilotpay:{userId}:p4_queue` | Cola sync Firebase | MEDIA | NO |
| `pilotpay:{userId}:offline_queue` | Cola offline perfil/permisos | MEDIA | NO |
| `pilotpay_v2_{userId}` | **Caché de perfil completo** | **ALTA** | ✅ SÍ |
| `pilotpay_perms_cache` | Caché de permisos | MEDIA | NO |
| `pilotpay_admin_perms` | Permisos admin | **ALTA** | ✅ SÍ |
| `pilotpay_theme_{userId}` | Tema UI | BAJA | NO |
| `pilotpay_device_id` | ID dispositivo | BAJA | NO |
| `pp_ui_mode_v1` | Modo UI | BAJA | NO |

**Datos sensibles en MonthRecords:**
```javascript
{
  userId: "ESH",
  year: 2026,
  month: 6,
  variables: {
    horasVuelo: 68.5,
    imaginarias: 3,
    francos: 10,
    dpo: 120.50,
    // ...
  },
  auditoria: { /* snapshot auditoría completa */ },
  regularizacion: { /* ajustes económicos */ }
}
```

**Datos sensibles en audit_history_v1:**
```javascript
[
  {
    id: "uuid",
    userId: "ESH",
    mes: "Junio",
    year: 2026,
    nominaV2: {
      empresa: { nif, nombre },
      trabajador: { nombre, nif, nss, fecha_ingreso },
      tablaConceptos: [ /* conceptos retributivos completos */ ],
      devengos: { /* bruto completo */ },
      deducciones: { /* SS, IRPF */ },
      totales: { /* líquido neto */ }
    }
  }
]
```

**Hallazgo crítico:**

❌ **localStorage NO cifrado, visible en DevTools**  
❌ **Datos salariales completos accesibles desde consola navegador**  
❌ **NIF, NSS, datos personales en texto plano**

---

### IndexedDB (Client-Side)

**Base de datos:** `PilotPayLocalDB` (v1)

**Stores:**

| Store | Contenido | Sensibilidad |
|-------|-----------|--------------|
| `monthlyRecords` | Copia de `pilotpay:{userId}:monthly_v1` | **ALTA** |
| `auditHistory` | Copia de `pilotpay:{userId}:audit_history_v1` | **CRÍTICA** |

**Hallazgo crítico:**

❌ **IndexedDB NO cifrado**  
❌ **Duplica datos sensibles** (localStorage + IDB)  
❌ **Accessible desde DevTools → Application → IndexedDB**

---

### Firebase Realtime Database (Cloud)

**URL detectada en código (línea 7071):**
```javascript
const FB_URL = 'https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app';
const FB_KEY = 'AIzaSyAPgJfxBoqv_bKuVDDjvU927nQe-b0cCbQ';
```

**⚠️ CRÍTICO: API Key visible en código fuente público**

**Paths activos:**

| Path | Contenido | Sensibilidad | Protección |
|------|-----------|--------------|------------|
| `pilotpay/usuarios/{code}` | **Nombre, contraseña (hash cliente), función, nivel, base** | **CRÍTICA** | auth != null |
| `pilotpay/perfiles/{code}` | **NIF, IRPF %, CCAA, historicoFiscal** | **CRÍTICA** | auth != null |
| `pilotpay/permisos/{code}` | Permisos por función/base | MEDIA | auth != null |
| `pilotpay/historicos/{userId}/monthly/{year}_{month}` | **MonthRecords con variables reales** | **ALTA** | auth != null |
| `pilotpay/historicos/{userId}/auditorias/{id}` | **Auditorías con nominaV2 completa** | **CRÍTICA** | auth != null |
| `pilotpay/historicos/{userId}/deletedAuditorias/{id}` | Tombstones | BAJA | auth != null |
| `pilotpay/rutas/{key}` | Tabla rutas (reservada) | BAJA | auth != null |
| `pilotpay/solicitudes/{key}` | Solicitudes cambio base/cargo | MEDIA | auth != null |

**Ejemplo estructura `pilotpay/usuarios/ESH` (REAL):**
```json
{
  "name": "ELOY INFANTE SECO DE HERRERA",
  "pass": "contraseña-hash-cliente",
  "funcion": "CMD",
  "nivel": "B",
  "base": "MAD",
  "admin": true
}
```

**Ejemplo estructura `pilotpay/perfiles/ESH` (REAL):**
```json
{
  "nif": "12345678A",
  "irpf": 34.35,
  "ccaa": "Canarias",
  "historicoFiscal": {
    "2026": {
      "irpf": 34.35,
      "basesIRPF": [...]
    }
  }
}
```

**Hallazgo crítico:**

❌ **Contraseñas visibles a cualquier sesión autenticada anónima**  
❌ **NIF, datos fiscales visibles a cualquier sesión autenticada**  
❌ **Sin aislamiento cross-user en reglas Firebase**  
❌ **API Key expuesta permite autenticación anónima por cualquiera**

---

## C) INVENTARIO DE SUPERFICIES EXPUESTAS

### 1. API Key Firebase

**Ubicación:** `frontend/index.html` línea 7072

```javascript
const FB_KEY = 'AIzaSyAPgJfxBoqv_bKuVDDjvU927nQe-b0cCbQ';
```

**Exposición:**
- ✅ Visible en código fuente HTML
- ✅ Accesible desde DevTools
- ✅ Permite autenticación anónima desde cualquier cliente

**Consecuencia:**

❌ **Cualquier persona con esta key puede:**
1. Autenticarse anónimamente contra Firebase
2. Leer `/pilotpay/usuarios` → obtener lista completa de usuarios y contraseñas
3. Leer `/pilotpay/perfiles` → obtener NIF, IRPF de todos los usuarios
4. Leer `/pilotpay/historicos` → acceder a auditorías de cualquier usuario

---

### 2. URL Firebase RTDB

**Ubicación:** `frontend/index.html` línea 7071

```javascript
const FB_URL = 'https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app';
```

**Exposición:**
- ✅ Visible en código fuente
- ✅ Directamente accesible vía REST API con `?auth=<token>`

---

### 3. Login Client-Side

**Ubicación:** `frontend/index.html` líneas 7516-7587

**Flujo actual:**

```javascript
async function doLogin() {
  // 1. Cargar usuarios desde Firebase
  if (Object.keys(USERS).length === 0) await loadUsersFromFirebase();
  
  // 2. Validar en cliente
  if (USERS[u] && USERS[u].pass === p) {
    currentUser = u;
    profileData = { ...USERS[u] };
    // ...
  }
}
```

**Problemas críticos:**

1. ❌ **Contraseñas descargadas a cliente** (`loadUsersFromFirebase()`)
2. ❌ **Validación en JavaScript** (modificable desde DevTools)
3. ❌ **Sin hash server-side** (hash en cliente, no protege)
4. ❌ **Variable global `USERS`** accesible desde consola

**Demostración de vulnerabilidad:**

```javascript
// Desde consola navegador (F12):
console.log(USERS);
// → { "ESH": { "pass": "...", "nif": "...", ... }, ... }
```

---

### 4. Reglas Firebase

**Archivo:** `firebase-database.rules.json`

**Análisis línea por línea:**

```json
{
  "rules": {
    ".read":  false,  // ✅ Deny-by-default root
    ".write": false,  // ✅ Deny-by-default root
    
    "pilotpay": {
      ".read":  false,
      ".write": false,
      
      "usuarios": {
        ".read":  "auth != null",  // ❌ CRÍTICO: Todos los autenticados leen TODO
        ".write": "auth != null",  // ❌ CRÍTICO: Todos los autenticados escriben
        "$code": {
          ".validate": "!newData.exists() || (...)"
        }
      },
      
      "perfiles": {
        ".read":  "auth != null",  // ❌ CRÍTICO: Todos leen todos los perfiles
        ".write": "auth != null"   // ❌ CRÍTICO: Todos escriben todos los perfiles
      },
      
      "historicos": {
        "$userId": {
          ".read":  "auth != null",  // ❌ CRÍTICO: Sin validación userId
          ".write": "auth != null"   // ❌ CRÍTICO: Sin validación userId
        }
      }
    }
  }
}
```

**Hallazgo crítico:**

❌ **`auth != null` permite acceso a TODOS los datos si estás autenticado**  
❌ **NO existe `auth.uid === $userId`** (imposible con anonymous auth actual)  
❌ **Cualquier sesión anónima lee/escribe datos de cualquier usuario**

**Limitación documentada (CLAUDE.md líneas 1076-1083):**

> El `auth.uid` anónimo no está correlacionado con los códigos de usuario de la app (ESH, COP...). Firebase NO puede verificar que el usuario A solo acceda a historicos/A/. El aislamiento por usuario es enforced únicamente en cliente.

**Consecuencia:**

❌ **Cross-user isolation NO existe**  
❌ **Usuario A puede leer/escribir datos de Usuario B**  
❌ **Solo la "buena fe" del cliente protege los datos**

---

### 5. Datos en localStorage (No Cifrados)

**Accesible desde:**
- DevTools → Application → Local Storage
- Consola navegador: `localStorage.getItem('pilotpay:ESH:audit_history_v1')`

**Ejemplo contenido real:**

```json
{
  "nominaV2": {
    "trabajador": {
      "nombre": "ELOY INFANTE SECO DE HERRERA",
      "nif": "12345678A",
      "nss": "281234567890",
      "fecha_ingreso": "2015-03-01"
    },
    "totales": {
      "total_devengado": 5200.00,
      "liquido": 3850.50
    }
  }
}
```

**Hallazgo crítico:**

❌ **Datos salariales completos accesibles desde consola**  
❌ **NIF, NSS, fechas de ingreso en texto plano**  
❌ **Cualquier script inyectado puede leer todo**

---

## D) RIESGOS CRÍTICOS

### RIESGO C1: API Key Firebase Expuesta

**Severidad:** ❌ **CRÍTICA**

**Descripción:**

API Key `AIzaSyAPgJfxBoqv_bKuVDDjvU927nQe-b0cCbQ` visible en código fuente público.

**Explotación:**

1. Atacante abre `index.html` en navegador
2. Lee API Key desde código fuente
3. Autentica anónimamente: `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSy...`
4. Obtiene `idToken` válido
5. Accede a Firebase RTDB: `GET https://airside-mad-default-rtdb.../pilotpay/usuarios.json?auth=<idToken>`
6. Descarga lista completa de usuarios, contraseñas, NIF, datos fiscales

**Impacto:**

- ✅ Acceso total a datos de todos los usuarios
- ✅ Modificación de datos de cualquier usuario
- ✅ Borrado de datos
- ✅ Creación de usuarios falsos
- ✅ Escalada a admin

**Mitigación:**

❌ **Imposible mitigar** sin cambiar arquitectura completa  
⚠️ Rotar API Key solo da tiempo hasta que nuevo key se exponga

---

### RIESGO C2: Contraseñas Visibles a Sesiones Autenticadas

**Severidad:** ❌ **CRÍTICA**

**Descripción:**

Nodo `pilotpay/usuarios` contiene contraseñas (hash cliente) visibles a cualquier sesión con `auth != null`.

**Explotación:**

1. Usuario legítimo A se autentica
2. Abre consola navegador (F12)
3. Ejecuta: `await fetch('https://airside-mad-default-rtdb.../pilotpay/usuarios.json?auth=' + _fbToken)`
4. Obtiene lista completa:
   ```json
   {
     "ESH": { "pass": "hash1", "name": "...", "nif": "..." },
     "COP": { "pass": "hash2", "name": "...", "nif": "..." },
     ...
   }
   ```
5. Offline brute-force sobre hashes

**Impacto:**

- ✅ Usuario malicioso interno obtiene todas las contraseñas
- ✅ Acceso total a cuentas de otros usuarios
- ✅ Compromiso total de la plataforma

**Mitigación actual:**

❌ **NINGUNA**

---

### RIESGO C3: Cross-User Data Access

**Severidad:** ❌ **CRÍTICA**

**Descripción:**

Reglas Firebase NO verifican `auth.uid === $userId`. Usuario A puede leer/escribir datos de Usuario B.

**Explotación:**

1. Usuario A (código: COP) se autentica
2. Modifica `currentUser` en DevTools: `currentUser = "ESH"`
3. Ejecuta operaciones con userId "ESH"
4. Firebase acepta (regla solo valida `auth != null`)
5. Usuario A lee/escribe datos de Usuario ESH

**Impacto:**

- ✅ Acceso cruzado total entre usuarios
- ✅ Modificación de auditorías de otros
- ✅ Lectura de nóminas de otros
- ✅ Borrado de datos de otros

**Mitigación actual:**

❌ **NINGUNA** (por diseño de anonymous auth)

---

### RIESGO C4: Datos Sensibles en localStorage Sin Cifrar

**Severidad:** ❌ **CRÍTICA**

**Descripción:**

NIF, NSS, nóminas completas, datos fiscales almacenados en texto plano en localStorage.

**Explotación:**

1. XSS injection (cualquier vulnerabilidad)
2. Script malicioso ejecuta: `localStorage.getItem('pilotpay:ESH:audit_history_v1')`
3. Exfiltra datos completos a servidor externo

**Impacto:**

- ✅ Robo masivo de datos personales
- ✅ Robo de datos salariales
- ✅ Robo de datos fiscales
- ✅ Violación GDPR

**Mitigación actual:**

❌ **NINGUNA**

---

### RIESGO C5: Login Client-Side Sin Backend

**Severidad:** ❌ **CRÍTICA**

**Descripción:**

Validación de credenciales en JavaScript modificable desde DevTools.

**Explotación:**

1. Atacante abre DevTools
2. Antes de login, ejecuta:
   ```javascript
   const _origLogin = doLogin;
   doLogin = async function() {
     currentUser = "ESH";
     profileData = { admin: true, ... };
     showWelcome();
   };
   ```
3. Bypass completo de autenticación

**Impacto:**

- ✅ Acceso sin credenciales
- ✅ Escalada a admin
- ✅ Acceso total a plataforma

**Mitigación actual:**

❌ **NINGUNA** (validación solo en cliente)

---

## E) RIESGOS ALTOS

### RIESGO A1: Lógica de Negocio en Client-Side

**Severidad:** ⚠️ **ALTA**

**Descripción:**

22,204 líneas de lógica crítica en `index.html` modificable desde DevTools.

**Impacto:**

- Manipulación de cálculos de nómina
- Generación de auditorías falsas
- Modificación de resultados fiscales

---

### RIESGO A2: Sin Rate Limiting

**Severidad:** ⚠️ **ALTA**

**Descripción:**

Firebase RTDB sin límites de operaciones desde cliente.

**Impacto:**

- Scraping masivo de datos
- DoS económico (costes Firebase)
- Exfiltración completa de base de datos

---

### RIESGO A3: Permisos Admin en localStorage

**Severidad:** ⚠️ **ALTA**

**Descripción:**

Clave `pilotpay_admin_perms` en localStorage determina permisos admin.

**Explotación:**

```javascript
localStorage.setItem('pilotpay_admin_perms', JSON.stringify({ admin: true }));
location.reload();
```

**Impacto:**

- Escalada a admin
- Acceso a panel administración
- Gestión de usuarios

---

## F) RIESGOS MEDIOS

### RIESGO M1: Ausencia de Logs de Auditoría

**Severidad:** ⚠️ **MEDIA**

**Descripción:**

No existen logs de quién accedió a qué datos cuándo.

**Impacto:**

- Imposible detectar accesos no autorizados
- Imposible auditar modificaciones
- Violación GDPR (falta trazabilidad)

---

### RIESGO M2: Sin Cifrado en Tránsito Interno

**Severidad:** ⚠️ **MEDIA**

**Descripción:**

localStorage → IndexedDB → Firebase sin cifrado adicional.

**Impacto:**

- Datos visibles en backups navegador
- Datos visibles en sync cloud navegador (Chrome Sync)

---

### RIESGO M3: Device ID No Validado

**Severidad:** ⚠️ **MEDIA**

**Descripción:**

`pilotpay_device_id` generado en cliente, no validado por servidor.

**Impacto:**

- Suplantación de dispositivos
- Bypass de limitaciones por dispositivo

---

## G) CONCLUSIÓN: APTO / NO APTO PARA PILOTPAY 4.0

### ❌ **NO APTO PARA DATOS REALES SENSIBLES**

**Justificación:**

La arquitectura actual presenta **5 riesgos CRÍTICOS** que hacen IMPOSIBLE garantizar la seguridad de datos personales, salariales y fiscales reales.

**Bloqueadores absolutos:**

1. ❌ **API Key Firebase expuesta** → Acceso total desde cualquier cliente
2. ❌ **Contraseñas visibles a sesiones autenticadas** → Compromiso total
3. ❌ **Cross-user data access** → Sin aislamiento entre usuarios
4. ❌ **Datos sensibles sin cifrar en localStorage** → Robo masivo
5. ❌ **Login client-side sin backend** → Bypass de autenticación

**Consecuencias legales:**

- ❌ **Violación GDPR** (Art. 32: Seguridad del tratamiento)
- ❌ **Violación LOPD** (España)
- ❌ **Responsabilidad civil** por negligencia en protección de datos
- ❌ **Sanciones económicas** potenciales hasta 20M € o 4% facturación anual

**Consecuencias operativas:**

- ❌ **Datos de nómina accesibles a cualquiera** con la API Key
- ❌ **Usuario A puede leer nóminas de Usuario B**
- ❌ **Datos fiscales (NIF, NSS, IRPF) expuestos**
- ❌ **Modificación de datos sin autenticación real**

---

### Evaluación por Área

| Área | Estado | Apto 4.0 |
|------|--------|----------|
| **Autenticación** | ❌ Client-side, bypassable | ❌ NO |
| **Autorización** | ❌ Sin cross-user isolation | ❌ NO |
| **Almacenamiento** | ❌ Sin cifrado, localStorage expuesto | ❌ NO |
| **API Security** | ❌ Key expuesta, sin rate limiting | ❌ NO |
| **Data Privacy** | ❌ Datos personales sin protección | ❌ NO |
| **Audit Trail** | ❌ Sin logs, sin trazabilidad | ❌ NO |
| **GDPR Compliance** | ❌ Incumplimiento múltiple | ❌ NO |

**Puntuación global:** **0/7 áreas aptas**

---

## H) PRIMERAS 10 CORRECCIONES RECOMENDADAS (POR PRIORIDAD)

### 1. ⚠️ CRÍTICO: Implementar Backend de Autenticación

**Prioridad:** ❌ **BLOQUEANTE**

**Acción:**

- Eliminar validación de login en cliente
- Crear endpoint POST `/api/auth/login` en backend
- Validar credenciales server-side
- Retornar JWT con claims: `{ userId, role, permissions }`
- Firebase Custom Auth: backend emite custom tokens donde `uid = userId`

**Impacto:**

✅ Elimina RIESGO C5 (login client-side)  
✅ Habilita aislamiento cross-user en Firebase rules

---

### 2. ⚠️ CRÍTICO: Rotar y Proteger API Key Firebase

**Prioridad:** ❌ **BLOQUEANTE**

**Acción:**

- Rotar API Key inmediatamente en Firebase Console
- Mover key a variable de entorno backend
- Implementar proxy backend para Firebase RTDB
- Cliente NO debe tener acceso directo a Firebase

**Impacto:**

✅ Elimina RIESGO C1 (API Key expuesta)  
✅ Previene autenticación anónima no autorizada

---

### 3. ⚠️ CRÍTICO: Eliminar Contraseñas de Firebase RTDB

**Prioridad:** ❌ **BLOQUEANTE**

**Acción:**

- Migrar `/pilotpay/usuarios` a backend exclusivamente
- Eliminar campo `pass` de Firebase RTDB
- Contraseñas SOLO en backend, hash con bcrypt/argon2
- Firebase RTDB solo almacena metadatos NO sensibles

**Impacto:**

✅ Elimina RIESGO C2 (contraseñas visibles)

---

### 4. ⚠️ CRÍTICO: Implementar Cross-User Isolation en Firebase

**Prioridad:** ❌ **BLOQUEANTE**

**Acción:**

- Migrar a Firebase Custom Auth (backend emite tokens)
- Actualizar reglas Firebase:
  ```json
  "historicos": {
    "$userId": {
      ".read": "auth.uid === $userId",
      ".write": "auth.uid === $userId"
    }
  }
  ```
- Correlacionar `auth.uid` con `userId` (ESH, COP, etc.)

**Impacto:**

✅ Elimina RIESGO C3 (cross-user data access)  
✅ Aislamiento real enforced por Firebase

---

### 5. ⚠️ CRÍTICO: Cifrar Datos Sensibles en localStorage

**Prioridad:** ❌ **BLOQUEANTE**

**Acción:**

- Implementar cifrado AES-256-GCM para localStorage
- Derivar clave de sesión desde JWT (rotación automática)
- Cifrar ANTES de `localStorage.setItem()`
- Descifrar DESPUÉS de `localStorage.getItem()`
- Campos críticos: `audit_history_v1`, `monthly_v1`, `pilotpay_v2_*`

**Impacto:**

✅ Elimina RIESGO C4 (datos sin cifrar)  
✅ Protege contra XSS injection data exfiltration

---

### 6. ⚠️ ALTA: Implementar Rate Limiting

**Prioridad:** ❌ **ALTA**

**Acción:**

- Implementar rate limiting en backend:
  - Login: 5 intentos / 15 min / IP
  - API calls: 100 req / min / usuario
- Firebase Security Rules con validación de timestamps
- CloudFlare Rate Limiting (si aplicable)

**Impacto:**

✅ Elimina RIESGO A2 (sin rate limiting)  
✅ Previene scraping masivo  
✅ Previene DoS económico

---

### 7. ⚠️ ALTA: Eliminar Permisos de localStorage

**Prioridad:** ❌ **ALTA**

**Acción:**

- Eliminar `pilotpay_admin_perms` de localStorage
- Permisos SOLO en JWT claims (backend)
- Validar permisos server-side en cada operación crítica
- Frontend lee permisos de JWT (solo lectura, no modificable)

**Impacto:**

✅ Elimina RIESGO A3 (permisos admin en localStorage)

---

### 8. ⚠️ ALTA: Implementar Audit Trail

**Prioridad:** ⚠️ **ALTA**

**Acción:**

- Backend registra TODAS las operaciones críticas:
  - Login/logout (userId, IP, timestamp)
  - Lectura de datos sensibles (quién leyó qué)
  - Modificación de datos (quién modificó qué)
  - Operaciones admin
- Logs inmutables (append-only)
- Retención mínima 1 año (GDPR)

**Impacto:**

✅ Elimina RIESGO M1 (sin logs)  
✅ Cumplimiento GDPR Art. 30 (Registro de actividades)

---

### 9. ⚠️ ALTA: Separar Lógica de Negocio a Backend

**Prioridad:** ⚠️ **ALTA**

**Acción:**

- Migrar calculadora de nómina a backend
- Migrar motor de auditoría a backend
- Migrar parsers PDF a backend (vía upload)
- Frontend solo UI + presentación

**Impacto:**

✅ Elimina RIESGO A1 (lógica en client-side)  
✅ Previene manipulación de cálculos

---

### 10. ⚠️ MEDIA: Implementar HTTPS + CSP

**Prioridad:** ⚠️ **MEDIA**

**Acción:**

- Forzar HTTPS en producción
- Implementar Content Security Policy:
  ```
  Content-Security-Policy:
    default-src 'self';
    script-src 'self' 'strict-dynamic';
    object-src 'none';
    base-uri 'none';
  ```
- Eliminar `eval()`, `Function()`, inline scripts

**Impacto:**

✅ Previene XSS injection  
✅ Protege contra data exfiltration

---

## RESUMEN EJECUTIVO

**Estado Actual:** ❌ **ARQUITECTURA NO SEGURA PARA DATOS REALES**

**Riesgos Críticos:** 5  
**Riesgos Altos:** 3  
**Riesgos Medios:** 3

**Tiempo Estimado Correcciones Críticas:** 8-12 semanas

**Recomendación:**

❌ **NO subir datos reales** (nóminas, NIF, NSS, fiscales) hasta resolver los 5 riesgos críticos.

⚠️ **Uso actual solo apropiado para:** Demo, desarrollo, datos sintéticos.

✅ **PilotPay 4.0 requiere:** Arquitectura backend completa + Firebase Custom Auth + cifrado client-side.

---

**FIN DE AUDITORÍA DE ARQUITECTURA ACTUAL V1**
