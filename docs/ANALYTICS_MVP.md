# 📊 ANALYTICS MVP — Documentación Técnica

**Versión:** 1.0  
**Fecha:** 2026-06-07  
**Estado:** Implementado  
**Rama:** `parser-nomina-v2`

---

## 1. ARQUITECTURA GENERAL

### Principios

**Local-first:**
- Eventos se registran primero en localStorage
- Se suben a Firebase en batches de 50 eventos
- Opera offline sin pérdida de datos

**Privacidad:**
- NO se registran importes salariales
- NO se registran datos personales identificables
- Solo métricas agregadas y de uso

**Simplicidad:**
- Sin agregaciones automáticas
- Sin Firebase Functions
- Sin dashboards en tiempo real
- Análisis manual mediante scripts

---

## 2. ALMACENAMIENTO

### localStorage

**Clave:**
```
pilotpay:{userId}:analytics
```

**Contenido:**
Array de eventos (máximo 1000, FIFO)

**Estructura de evento:**
```javascript
{
  eventId: string,              // UUID único
  userId: string,               // Código usuario (ESH, COP, etc.)
  deviceId: string,             // ID dispositivo
  action: string,               // Tipo de evento
  timestamp: number,            // Unix ms
  date: string,                 // YYYY-MM-DD
  ...data                       // Datos específicos del evento
}
```

---

### Firebase

**Ruta:**
```
pilotpay/analytics/{userId}/events/{eventId}
```

**Permisos:**
```json
{
  ".read": "auth != null && root.child('pilotpay/usuarios/' + auth.uid + '/admin').val() === true",
  ".write": "auth != null"
}
```

**Upload:**
- Batch automático cada 50 eventos
- Flush manual al cerrar ventana/tab

---

## 3. EVENTOS IMPLEMENTADOS

### 3.1 audit_complete

**Descripción:**
Registrado cuando se guarda una auditoría completada exitosamente.

**Estructura:**
```javascript
{
  action: 'audit_complete',
  mes: string,                  // "Enero", "Febrero", etc.
  anio: number,                 // 2026, 2027, etc.
  timeSpent: number,            // ms desde inicio sesión auditoría
  hasDiferencias: boolean,      // true si hay discrepancias
  numDiferencias: number,       // cantidad de discrepancias
  parser: string,               // 'v1' | 'v2'
  parserSuccess: boolean        // true si parser funcionó
}
```

**Tracking point:**
- **Archivo:** `frontend/index.html`
- **Función:** `saveAuditRecord()`
- **Línea:** ~6409
- **Código:**
```javascript
// Analytics: auditoría completada
if (typeof PilotPayAnalytics !== 'undefined') {
  PilotPayAnalytics.completeAudit({
    mes: record.mes,
    anio: record.anio,
    hasDiferencias: record.nDiscrepancias > 0,
    numDiferencias: record.nDiscrepancias,
    parser: nomData?.metadata?.parserVersion || 'v1',
    parserSuccess: nomData?.metadata?.parserSuccess !== false
  });
}
```

**Métricas derivadas:**
- Auditorías completadas por usuario
- % Auditorías con diferencias (valor del producto)
- Parser V2 success rate
- Tiempo promedio de auditoría

---

### 3.2 audit_abandoned

**Descripción:**
Registrado cuando se abandona una auditoría antes de completarla.

**Estructura:**
```javascript
{
  action: 'audit_abandoned',
  mes: string,
  anio: number,
  lastPhase: string,            // 'variables' | 'calcular' | 'nomina' | 'comparar'
  timeSpent: number,            // ms desde inicio
  hasVariables: boolean,        // true si cargó variables
  hasCalculation: boolean,      // true si ejecutó cálculo
  hasNomina: boolean,           // true si procesó nómina
  hasComparison: boolean,       // true si comparó
  reason: string                // 'module_change' | 'window_close'
}
```

**Triggers de abandono:**

1. **Cambio de módulo fuera del workspace**
   - **Archivo:** `frontend/index.html`
   - **Función:** `showTab()`
   - **Línea:** ~10249
   - **Código:**
   ```javascript
   // Analytics: detectar abandono de auditoría si sale del workspace
   if (typeof PilotPayAnalytics !== 'undefined') {
     PilotPayAnalytics.checkAbandonOnModuleChange(name);
   }
   ```

2. **Cierre de ventana/tab**
   - **Archivo:** `frontend/js/pilotPayAnalytics.js`
   - **Listener:** `window.beforeunload`
   - **Línea:** ~234
   - **Código:**
   ```javascript
   window.addEventListener('beforeunload', function() {
     if (currentAuditSession) {
       abandonAudit('window_close');
     }
     flush();
   });
   ```

**Inicio de sesión de auditoría:**
- **Archivo:** `frontend/index.html`
- **Función:** `varsConfirmarPeriodo()`
- **Línea:** ~16371
- **Código:**
```javascript
// Analytics: iniciar sesión de auditoría
if (typeof PilotPayAnalytics !== 'undefined' && varsData._periodoFin) {
  const nomMes = varsGetNominaMes(varsData._periodoFin);
  const anio = varsData._periodoFin.getFullYear();
  PilotPayAnalytics.startAuditSession(nomMes, anio);
  PilotPayAnalytics.updateAuditPhase('variables', true);
}
```

**Métricas derivadas:**
- Tasa de abandono por fase
- Fase con mayor abandono (optimizar UX)
- Tiempo promedio antes de abandono

---

### 3.3 module_view

**Descripción:**
Registrado cada vez que el usuario navega a un módulo.

**Estructura:**
```javascript
{
  action: 'module_view',
  module: string                // 'dashboard', 'variables', 'calcular', 'nomina',
                                // 'comparar', 'historial', 'simulador', 'convenio',
                                // 'perfil', 'config', 'admin'
}
```

**Tracking point:**
- **Archivo:** `frontend/index.html`
- **Función:** `showTab()`
- **Línea:** ~10270
- **Código:**
```javascript
// Analytics: track module view
if (typeof PilotPayAnalytics !== 'undefined') {
  PilotPayAnalytics.track('module_view', { module: name });
}
```

**Métricas derivadas:**
- Ranking de módulos por uso
- Módulos más visitados por usuario
- Módulos sin uso (candidatos a deprecar)

---

### 3.4 error_occurred

**Descripción:**
Registrado cuando ocurre un error no capturado o promise rejection.

**Estructura:**
```javascript
{
  action: 'error_occurred',
  module: string,               // 'parser', 'audit', 'calc', 'sync', 'promise', 'unknown'
  errorType: string,            // 'Error', 'TypeError', 'UnhandledPromiseRejection', etc.
  errorMessage: string,         // Sanitizado (max 200 caracteres)
  fatal: boolean,               // Siempre false en implementación actual
  line: number,                 // Línea del error (solo window.onerror)
  column: number                // Columna del error (solo window.onerror)
}
```

**Tracking points:**

1. **Errores JavaScript no capturados**
   - **Archivo:** `frontend/index.html`
   - **Listener:** `window.error`
   - **Línea:** ~21959
   - **Código:**
   ```javascript
   window.addEventListener('error', function(event) {
     if (typeof PilotPayAnalytics === 'undefined') return;
     
     let errorMessage = event.message || 'Unknown error';
     errorMessage = errorMessage.substring(0, 200);
     
     let module = 'unknown';
     if (event.filename) {
       if (event.filename.includes('parser')) module = 'parser';
       else if (event.filename.includes('audit')) module = 'audit';
       else if (event.filename.includes('calc')) module = 'calc';
       else if (event.filename.includes('sync') || event.filename.includes('Store')) module = 'sync';
     }
     
     PilotPayAnalytics.track('error_occurred', {
       module: module,
       errorType: event.error?.name || 'Error',
       errorMessage: errorMessage,
       fatal: false,
       line: event.lineno,
       column: event.colno
     });
   });
   ```

2. **Promise rejections no capturadas**
   - **Archivo:** `frontend/index.html`
   - **Listener:** `window.unhandledrejection`
   - **Línea:** ~21982
   - **Código:**
   ```javascript
   window.addEventListener('unhandledrejection', function(event) {
     if (typeof PilotPayAnalytics === 'undefined') return;
     
     let errorMessage = String(event.reason).substring(0, 200);
     
     PilotPayAnalytics.track('error_occurred', {
       module: 'promise',
       errorType: 'UnhandledPromiseRejection',
       errorMessage: errorMessage,
       fatal: false
     });
   });
   ```

**Métricas derivadas:**
- Error rate (errores / acciones totales)
- Errores por módulo
- Módulos más problemáticos
- Estabilidad del sistema

---

## 4. API PÚBLICA

### PilotPayAnalytics.track()

**Uso:**
```javascript
PilotPayAnalytics.track(action, data);
```

**Parámetros:**
- `action` (string): Tipo de evento
- `data` (object): Datos específicos del evento

**Ejemplo:**
```javascript
PilotPayAnalytics.track('module_view', { module: 'dashboard' });
```

---

### PilotPayAnalytics.startAuditSession()

**Uso:**
```javascript
PilotPayAnalytics.startAuditSession(mes, anio);
```

**Parámetros:**
- `mes` (string): Nombre del mes
- `anio` (number): Año

**Descripción:**
Inicia una sesión de auditoría para tracking de abandonos.

---

### PilotPayAnalytics.updateAuditPhase()

**Uso:**
```javascript
PilotPayAnalytics.updateAuditPhase(phase, success);
```

**Parámetros:**
- `phase` (string): 'variables', 'calcular', 'nomina', 'comparar'
- `success` (boolean): true si fase completada exitosamente

---

### PilotPayAnalytics.completeAudit()

**Uso:**
```javascript
PilotPayAnalytics.completeAudit(data);
```

**Parámetros:**
- `data` (object): Datos de la auditoría completada

**Descripción:**
Registra auditoría completada y cierra sesión actual.

---

### PilotPayAnalytics.abandonAudit()

**Uso:**
```javascript
PilotPayAnalytics.abandonAudit(reason);
```

**Parámetros:**
- `reason` (string): 'module_change', 'window_close', etc.

**Descripción:**
Registra abandono de auditoría en progreso.

---

### PilotPayAnalytics.flush()

**Uso:**
```javascript
PilotPayAnalytics.flush();
```

**Descripción:**
Sube inmediatamente todos los eventos pendientes a Firebase.

---

## 5. DEBUG

### Activar modo debug

```javascript
localStorage.setItem('pilotpay_analytics_debug', '1');
```

**Efectos:**
- Console.log de cada evento tracked
- Console.log de cada upload batch

### Ver eventos locales

```javascript
PilotPayAnalytics.getLocalEvents();
```

**Retorna:**
Array de eventos almacenados localmente.

### Ver sesión de auditoría actual

```javascript
PilotPayAnalytics.getCurrentSession();
```

**Retorna:**
Objeto con estado de la sesión actual o null.

---

## 6. ANÁLISIS DE DATOS

### Export manual desde Firebase

**Método 1: Firebase Console**
1. Navegar a `pilotpay/analytics/{userId}/events`
2. Export JSON

**Método 2: Script Node.js**
```javascript
// analyze.js
const fb = await fetchFirebaseData('pilotpay/analytics');

// Métrica 1: Module ranking
const moduleViews = fb.filter(e => e.action === 'module_view');
const ranking = countBy(moduleViews, 'module');
console.log('Module Ranking:', ranking);

// Métrica 2: Audit completion rate
const audits = fb.filter(e => e.action === 'audit_complete');
console.log('Total audits:', audits.length);

// Métrica 3: Success rate
const withDiff = audits.filter(a => a.hasDiferencias);
console.log('Audits with differences:', (withDiff.length / audits.length * 100) + '%');

// Métrica 4: Parser V2
const v2 = audits.filter(a => a.parser === 'v2');
const v2Success = v2.filter(a => a.parserSuccess);
console.log('Parser V2 success:', (v2Success.length / v2.length * 100) + '%');

// Métrica 5: Errors
const errors = fb.filter(e => e.action === 'error_occurred');
console.log('Errors by module:', groupBy(errors, 'module'));
```

---

## 7. MÉTRICAS CLAVE

### 1. Module Usage Ranking
**Pregunta:** ¿Qué módulos se usan más?  
**Evento:** `module_view`  
**Cálculo:** Contar eventos por módulo  
**Decisión:** Priorizar desarrollo

### 2. Audit Completion Rate
**Pregunta:** ¿Los usuarios completan auditorías?  
**Evento:** `audit_complete`  
**Cálculo:** Total audits / usuarios activos  
**Decisión:** Validar valor del producto

### 3. Audit Success Rate
**Pregunta:** ¿PilotPay encuentra errores reales?  
**Evento:** `audit_complete` con `hasDiferencias=true`  
**Cálculo:** Audits con diferencias / total audits  
**Decisión:** Métrica de valor del producto

### 4. Parser Success Rate
**Pregunta:** ¿Parser V2 funciona bien?  
**Evento:** `audit_complete` con `parser='v2'` y `parserSuccess`  
**Cálculo:** V2 success / V2 total  
**Decisión:** Migrar completamente a V2

### 5. Error Rate
**Pregunta:** ¿Dónde está rota la app?  
**Evento:** `error_occurred`  
**Cálculo:** Errores por módulo  
**Decisión:** Priorizar estabilidad

### 6. Abandonment Rate
**Pregunta:** ¿Dónde abandonan los usuarios?  
**Evento:** `audit_abandoned`  
**Cálculo:** Abandonos por fase  
**Decisión:** Optimizar fase con mayor abandono

---

## 8. LIMITACIONES CONOCIDAS

### No implementado en MVP

❌ **sync_result:** Tracking de sincronización Firebase  
   - Requiere instrumentación en pilotPayStore.js
   - Complejidad media
   - Valor medio (solo crítico si hay problemas sync)

❌ **DAU/MAU:** Usuarios activos diarios/mensuales  
   - Requiere agregaciones automáticas
   - Con 10-20 usuarios, DAU = número de usuarios
   - No aporta valor en beta cerrada

❌ **Retention cohorts:** Cohortes de retención  
   - Requiere volumen estadístico (100+ usuarios)
   - Requiere semanas/meses de datos

❌ **Dashboards:** Visualización automática  
   - Análisis manual via scripts es suficiente
   - Complejidad alta sin valor en beta

---

## 9. ROADMAP

### Fase 1: Beta cerrada (ACTUAL)
**Implementado:**
- ✅ 4 eventos core: audit_complete, audit_abandoned, module_view, error_occurred
- ✅ Almacenamiento localStorage + Firebase
- ✅ API pública
- ✅ Error tracking global

**Suficiente para:**
- Decisiones de roadmap
- Validación de parser V2
- Detección de problemas técnicos

---

### Fase 2: Beta ampliada (+20-100 usuarios)
**Añadir:**
- sync_result (tracking de Firebase sync)
- session_duration
- convenio_view (validar inversión Biblioteca Normativa)

**Todavía NO:**
- Agregaciones automáticas
- Dashboards
- Firebase Functions

---

### Fase 3: Producción (100+ usuarios)
**Añadir:**
- Agregación diaria simple
- Dashboard Admin básico
- Retention metrics

**Considerar:**
- Firebase Functions para agregación
- Export a BigQuery (si >1000 usuarios)

---

## 10. ARCHIVOS MODIFICADOS

### Nuevos archivos

**`frontend/js/pilotPayAnalytics.js`**
- Módulo principal de analytics
- API pública
- Gestión de almacenamiento
- Tracking de sesiones de auditoría
- 250 líneas

---

### Archivos modificados

**`frontend/index.html`**

**Cambios:**
1. **Script analytics cargado** (línea ~6290)
   ```html
   <script src="js/pilotPayAnalytics.js"></script>
   ```

2. **showTab() — module_view + abandono** (línea ~10249, ~10270)
   ```javascript
   PilotPayAnalytics.checkAbandonOnModuleChange(name);
   PilotPayAnalytics.track('module_view', { module: name });
   ```

3. **varsConfirmarPeriodo() — inicio auditoría** (línea ~16371)
   ```javascript
   PilotPayAnalytics.startAuditSession(nomMes, anio);
   PilotPayAnalytics.updateAuditPhase('variables', true);
   ```

4. **saveAuditRecord() — auditoría completada** (línea ~6409)
   ```javascript
   PilotPayAnalytics.completeAudit({ ... });
   ```

5. **Error listeners globales** (línea ~21959)
   ```javascript
   window.addEventListener('error', ...);
   window.addEventListener('unhandledrejection', ...);
   ```

---

## 11. TESTING

### Test manual

1. **Activar debug:**
   ```javascript
   localStorage.setItem('pilotpay_analytics_debug', '1');
   ```

2. **Navegar a módulos:**
   - Abrir Dashboard → Console: `module_view: dashboard`
   - Abrir Convenio → Console: `module_view: convenio`

3. **Completar auditoría:**
   - Variables → Calcular → Nómina → Comparar → Guardar
   - Console: `audit_complete` con datos completos

4. **Abandonar auditoría:**
   - Variables → Navegar a Dashboard
   - Console: `audit_abandoned` con `reason: module_change`

5. **Provocar error:**
   - Console: `throw new Error('test')`
   - Console: `error_occurred` con datos del error

6. **Verificar localStorage:**
   ```javascript
   PilotPayAnalytics.getLocalEvents();
   ```

7. **Verificar Firebase:**
   - Firebase Console → `pilotpay/analytics/{userId}/events`
   - Debe contener eventos subidos

---

## 12. DECISIONES DE DISEÑO

### ¿Por qué solo 4 eventos en MVP?

**Criterio:** 80% del valor con 20% de la complejidad

- `audit_complete` → Métrica #1 de valor
- `audit_abandoned` → Métrica de UX crítica
- `module_view` → Decisiones de roadmap
- `error_occurred` → Estabilidad del sistema

**Eventos excluidos:**
- `sync_result` → Complejidad implementación vs valor en beta
- `session_duration` → No crítico con 15 usuarios
- `convenio_view` → Validación futura Biblioteca Normativa

---

### ¿Por qué sin agregaciones automáticas?

**Razón:** Con 10-20 usuarios, CSV export + script manual es suficiente

**Agregaciones automáticas requieren:**
- Firebase Functions (complejidad)
- Schema de agregación (overhead)
- Dashboard de visualización (tiempo desarrollo)

**Valor añadido en beta:** BAJO

---

### ¿Por qué sin dashboards?

**Razón:** Análisis semanal manual > dashboard tiempo real

**Con 15 usuarios:**
- Export JSON Firebase: 2 minutos
- Script análisis: 5 líneas JavaScript
- Total: 10 minutos por semana

**Dashboard automático:**
- Desarrollo: 2-3 días
- Mantenimiento: continuo
- Valor añadido: mínimo

---

## 13. PRIVACIDAD

### Datos NUNCA registrados

❌ Salarios  
❌ Importes específicos  
❌ NIF/NIE  
❌ Nombre completo  
❌ Apellidos  
❌ Dirección  
❌ Cuenta bancaria  

### Datos sanitizados

**Errores:**
- Mensaje limitado a 200 caracteres
- Stack trace NO incluido
- Solo tipo de error + módulo

---

## CONCLUSIÓN

**Sistema de telemetría mínimo viable implementado.**

**4 eventos críticos:**
- ✅ audit_complete
- ✅ audit_abandoned
- ✅ module_view
- ✅ error_occurred

**Responde preguntas clave:**
- ✅ ¿Qué módulos se usan?
- ✅ ¿Parser V2 funciona?
- ✅ ¿Dónde están los errores?
- ✅ ¿Usuarios encuentran valor?
- ✅ ¿Dónde abandonan?

**Listo para decisiones de producto en beta cerrada.**
