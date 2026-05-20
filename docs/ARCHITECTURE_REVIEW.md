# PilotPay — Auditoría de Arquitectura de Datos
**Fecha:** 2026-05-20  
**Estado:** Revisión inicial — pre-migración  
**Versión app:** Beta 2.2, rama `avatars-redesign`  

---

## Índice

1. [Estado actual — inventario técnico](#1-estado-actual)
2. [Problemas identificados](#2-problemas-identificados)
3. [Arquitectura propuesta](#3-arquitectura-propuesta)
4. [Fuentes de verdad por dominio](#4-fuentes-de-verdad)
5. [Plan de migración por fases](#5-plan-de-migración)
6. [Riesgos y dependencias](#6-riesgos)

---

## 1. Estado actual

### 1.1 Variables globales de estado

La app mantiene estado en variables globales sueltas, sin encapsulación ni control de acceso:

| Variable | Tipo | Qué contiene | Riesgo |
|---|---|---|---|
| `USERS` | `object` | Todos los usuarios cargados de Firebase | Modificable desde cualquier módulo |
| `currentUser` | `string\|null` | Código del usuario autenticado | Sin getter protegido |
| `currentNivel` | `number` | Nivel jerárquico (1–6) | Duplicado en `profileData.nivel` |
| `profileData` | `object` | **Dios-objeto** con 30+ campos mezclados | Ver §1.2 |
| `calcResult` | `object\|null` | Resultado del último cálculo | Sin contexto usuario/mes/año |
| `window._calcResultBackup` | `object\|null` | Copia pre-cambio de `calcResult` | Estado frágil |
| `nomDataCached` | `object\|null` | Última nómina PDF parseada | Sin contexto usuario/mes |
| `simHistoricoData` | `object` | Mirror local de `profileData.simHistorico` | Sincronización manual, riesgo de drift |
| `pagasMode` | `string` | Modo paga extra | Duplicado en `profileData.pagaExtra` |
| `segmedActivo` | `boolean` | Seguro médico | Estado DOM sin fuente canónica |
| `seglicActivo` | `boolean` | Seguro licencia | Estado DOM sin fuente canónica |
| `ppActivo` | `boolean` | Plan de pensiones | Estado DOM sin fuente canónica |
| `perms` | `object` | Permisos admin por usuario | Cargado independientemente |
| `totalHVManual` | `boolean` | Flag de edición manual HV | Estado temporal sin contexto |

### 1.2 `profileData` — el objeto dios

`profileData` mezcla en un único blob cuatro dominios completamente distintos:

```
profileData = {
  // Dominio 1: IDENTIDAD PERMANENTE
  name, apellidos, alias, fullName?,
  nif, nss, ingreso_display,
  funcion, nivel, base,

  // Dominio 2: CONFIGURACIÓN FISCAL (semipermanente)
  irpf, estadoCivil, hijos, discapacidad, residencia, ccaa,
  pagaExtra,

  // Dominio 3: ESTADO DEL SIMULADOR IRPF (dinámico por mes)
  sim_mes, sim_ccaa, sim_civil, sim_hijos, sim_discap,
  sim_residencia, sim_hijos3, sim_ascendientes, sim_asc75, sim_pension,
  sim_brutoAcum, sim_irpfAcum, sim_brutoResto, sim_irpfActual,
  sim_avanzado,

  // Dominio 4: HISTÓRICO ACUMULADOS (datos temporales por mes)
  simHistorico: { 1: {bruto, irpf}, ..., 12: {bruto, irpf} },

  // Dominio 5: PREFERENCIAS UI
  theme, firstAccess,

  // Campos legacy / migración
  brutoAcum, irpfAcum, mesAcum,
}
```

**Este mezclado es el origen de la mayoría de los bugs actuales.**  
Un save del simulador sobreescribe datos de identidad. Un reload del perfil puede pisar estado del simulador. No hay control de qué módulo puede tocar qué.

### 1.3 Rutas de Firebase

```
pilotpay/
├── usuarios/                          ← datos operativos (funcion, base, nivel, irpf, pass)
│   └── {userCode}/                    ← {name, apellidos, funcion, base, nivel, irpf, theme, ...}
├── perfiles/                          ← profileData completo (blob) — actualizado con PATCH
│   └── {userCode}/                    ← TODO profileData incluyendo sim_*, simHistorico, etc.
├── permisos/                          ← permisos admin
│   └── {userCode}/                    ← {funciones: [], bases: []}
└── rutas/                             ← rutas ICAO (datos globales, no por usuario)
```

**Problema:** `pilotpay/perfiles/{user}` es una copia espejo de `profileData` — un blob monolítico sin estructura interna. No hay separación de dominios en Firebase tampoco.

### 1.4 Claves de localStorage

| Clave | Scope | Contenido | Problema |
|---|---|---|---|
| `pilotpay_historial` | **GLOBAL** ⚠️ | Array de registros auditoría | **No está aislado por usuario** |
| `pilotpay_v2_{user}` | Por usuario | Cache de `profileData` | Correcto |
| `pilotpay_{user}` | Por usuario | Formato legacy v1 | Legacy, migrado en carga |
| `pilotpay_theme_{user}` | Por usuario | Tema visual | Duplicado en `profileData.theme` |
| `pilotpay_perms_cache` | **GLOBAL** | Permisos admin | Sin scope de usuario |
| `pilotpay_offline_queue` | **GLOBAL** | Cola de cambios offline | Sin scope de usuario |
| `pilotpay_apikey` | **GLOBAL** | API key de Claude | Correcto (no es dato personal) |
| `pilotpay:{user}:audit_history_v1` | Por usuario | Historial auditorías (dashboard) | **Clave diferente a `pilotpay_historial`** |

### 1.5 La inconsistencia crítica del historial de auditorías

**Este es el bug estructural más grave actualmente visible.**

Existen **dos funciones distintas** que leen el historial desde **dos claves de localStorage distintas**:

```
hstLoad()                              → 'pilotpay_historial'         (global, sin usuario)
loadAuditHistory()                     → 'pilotpay:{user}:audit_history_v1' (con usuario)
```

Y `saveAuditRecord()` escribe **únicamente** a `'pilotpay_historial'`.

Consecuencias:
- El **Dashboard** llama a `loadAuditHistory()` → lee `pilotpay:{user}:audit_history_v1` → **siempre vacío** salvo migración manual
- El **Historial tab** llama a `hstLoad()` → lee `pilotpay_historial` → muestra registros correctamente
- Los registros guardados en `pilotpay_historial` son **compartidos entre usuarios** en el mismo dispositivo
- El Dashboard ve 0 auditorías → dispara alerta falsa "Sin auditorías guardadas"

### 1.6 Flujo de inicialización (hydration)

```
DOMContentLoaded
  └─ loadUsersFromFirebase()              ← carga TODOS los usuarios en memoria
  
doLogin()
  ├─ profileData = { ...USERS[u] }        ← snapshot inicial (sin campos extendidos)
  ├─ await loadUserData(u)                ← sobreescribe profileData desde Firebase/localStorage
  ├─ await loadPermsFromFirebase()
  └─ showWelcome()
  
enterApp()
  └─ initApp()
      ├─ Setea DOM desde profileData
      ├─ recalc()                         ← cálculo inicial (sin datos de mes concreto)
      ├─ initPerfil() → renderPerfil()
      ├─ loadSimulatorData()
      │   └─ cargarHistorico()            ← carga simHistoricoData desde profileData.simHistorico
      └─ showTab('dashboard')
          └─ renderDashboard()            ← lee loadAuditHistory() → clave de usuario (vacía)
```

**Problema:** El `recalc()` inicial corre sin un mes/contexto concreto. Produce un `calcResult` con datos de "mes por defecto" que el Dashboard puede mostrar como si fueran datos reales.

---

## 2. Problemas identificados

### P1 — Historial de auditorías con doble clave *(CRÍTICO — dato incorrecto visible)*

**Impacto:** Dashboard siempre muestra "Sin auditorías" aunque existan. Los registros no están aislados por usuario.  
**Causa:** `saveAuditRecord` escribe a `'pilotpay_historial'`, `loadAuditHistory()` lee de `'pilotpay:{user}:audit_history_v1'`.  
**Fix:** Unificar en una única clave user-scoped. Migrar registros existentes.

---

### P2 — `profileData` como dios-objeto sin separación de dominios *(CRÍTICO — riesgo de corrupción)*

**Impacto:** Un save de cualquier módulo sobreescribe campos de otros módulos. No hay garantía de qué está guardando quién.  
**Causa:** Diseño incremental sin arquitectura. El `PATCH` de Firebase con `{ ...profileData }` actualiza todo cada vez.  
**Fix:** Separar en sub-documentos Firebase por dominio: `/identity`, `/fiscal`, `/simulator`, `/preferences`.

---

### P3 — `simHistoricoData` como mirror manual de `profileData.simHistorico` *(ALTO — datos inconsistentes)*

**Impacto:** Si uno se actualiza sin el otro, el simulador muestra datos de un mes distinto al del perfil.  
**Causa:** Dos variables representando el mismo dato. Sincronización manual en línea 9514.  
**Fix:** Eliminar `simHistoricoData` como variable separada. El simulador lee/escribe directamente al store.

---

### P4 — `calcResult` sin contexto de usuario/mes/año *(ALTO — dato mostrado fuera de contexto)*

**Impacto:** El Dashboard puede mostrar un cálculo del mes anterior o de una configuración distinta. No se puede saber a qué mes corresponde el resultado mostrado.  
**Causa:** `calcResult` es estado global transiente sin metadatos.  
**Fix:** Añadir `{ userId, mesNomina, año, timestamp }` al objeto `calcResult`. El Dashboard valida que el contexto sea el esperado antes de mostrar.

---

### P5 — `USERS` cargado completo en memoria para todos los usuarios *(MEDIO — privacidad)*

**Impacto:** Todos los usuarios (con nombre, función, base, irpf) están en memoria para cualquier usuario autenticado.  
**Causa:** `loadUsersFromFirebase()` carga el directorio completo.  
**Fix:** Cargar solo el usuario autenticado. Admin carga el directorio completo solo cuando accede al panel admin.

---

### P6 — Nombres de campo inconsistentes para el mismo dato *(MEDIO — bugs silenciosos)*

| Concepto | Nombres en uso | Problema |
|---|---|---|
| % retención IRPF | `irpf`, `irpf_pct`, `sim_irpfActual` | Tres nombres, mismo número |
| Nombre completo | `name`+`apellidos`, `fullName`, `nombre` | Tres rutas distintas |
| Histórico acumulados | `profileData.simHistorico`, `simHistoricoData`, prefijos `sim_` | Mirror duplicado |
| Base laboral | `base`, `baseCode`, `baseNum`, `baseIsla` | Cuatro variaciones |
| Estado civil | `estadoCivil`, `sim_civil` | Mismo dato, doble almacenamiento |

---

### P7 — localStorage sin scope de usuario en claves críticas *(MEDIO — datos entre usuarios)*

**Impacto:** Si dos pilotos usan PilotPay en el mismo dispositivo, comparten `pilotpay_historial` y `pilotpay_offline_queue`.  
**Causa:** Las claves globales precedieron al helper `storageKey()` y no se migraron.  
**Fix:** Aplicar `storageKey()` a todas las claves. Migrar datos existentes en el login.

---

### P8 — Cálculo inicial sin mes concreto *(MEDIO — datos de dashboard sin contexto)*

**Impacto:** `recalc()` se llama al arrancar con inputs en blanco o valores por defecto. El Dashboard muestra ese resultado como si fuera datos del mes.  
**Causa:** Diseño donde la calculadora siempre tiene que tener un resultado.  
**Fix:** El Dashboard distingue entre "hay un cálculo en curso" y "hay un cálculo guardado para un mes concreto". Sin cálculo explícito: muestra estado vacío, no el resultado del recalc inicial.

---

### P9 — Backend y frontend con motores de cálculo paralelos *(BAJO — divergencia futura)*

**Impacto:** `recalc()` en frontend y `payrollEngine.js` en backend pueden producir resultados distintos ante los mismos inputs. Ya ha ocurrido.  
**Causa:** Paralelismo histórico. El backend se creó después del frontend.  
**Fix estratégico (largo plazo):** El frontend pasa a ser cliente del backend. `recalc()` hace POST a `/api/calcular-nomina` y muestra el resultado. El motor autoritativo está solo en el backend.

---

### P10 — `nomDataCached` sin contexto *(BAJO — datos obsoletos)*

**Impacto:** Si el usuario cambia de mes sin subir nueva nómina, `nomDataCached` tiene datos del mes anterior. La comparativa podría usar datos equivocados.  
**Causa:** Variable global sin metadatos.  
**Fix:** Añadir contexto `{ userId, mes, año }` a `nomDataCached`. Invalidar si el contexto no coincide.

---

## 3. Arquitectura propuesta

### 3.1 Principios

1. **Un único store central** — toda lectura y escritura pasa por `PilotPayStore`
2. **Separación estricta de dominios** — identidad ≠ fiscal ≠ simulador ≠ cálculo ≠ histórico
3. **Todo dato mensual lleva contexto** — `{ userId, year, month }` como clave compuesta
4. **Sin lectura directa de Firebase/localStorage desde módulos UI** — solo el store accede a persistencia
5. **Sin mirrors manuales** — un dato existe una sola vez; los derivados se calculan, no se guardan

### 3.2 Estructura del store

```javascript
PilotPayStore = {

  // ── AUTENTICACIÓN ──────────────────────────────────────────────────
  auth: {
    userId:          string | null,    // currentUser
    nivel:           number,           // currentNivel
    isAuthenticated: boolean,
  },

  // ── DATOS PERMANENTES DEL USUARIO ──────────────────────────────────
  // Fuente: pilotpay/usuarios/{userId}
  // Solo el admin puede modificarlos; el usuario puede solicitar cambio
  user: {
    funcion:   'CMD' | 'COP' | 'SCC' | 'CC',
    base:      'GC' | 'TFN' | 'MAD',
    nivel:     number,        // 1–6
    irpf:      number,        // % retención (puede ser actualizado por el usuario)
    name:      string,
    apellidos: string,
    ingreso:   string,        // fecha ISO
  },

  // ── IDENTIDAD PERSONAL (extraída de nóminas + confirmada por usuario) ──
  // Fuente: pilotpay/perfiles/{userId}/identity
  identity: {
    nif:             string,
    nss:             string,
    fullName:        string,   // nombre completo tal como aparece en nómina
    ingreso_display: string,   // fecha formateada para display
  },

  // ── CONFIGURACIÓN FISCAL (semipermanente) ──────────────────────────
  // Fuente: pilotpay/perfiles/{userId}/fiscal
  // El usuario la gestiona desde Perfil → Configuración fiscal
  fiscal: {
    irpf:          number,     // % retención actual (fuente de verdad para simulador)
    estadoCivil:   string,     // 'soltero' | 'casado' | ...
    hijos:         string,     // '0' | '1' | '2' | '3'
    discapacidad:  string,     // '0' | '33' | '65'
    residencia:    string,     // 'no' | 'si'
    ccaa:          string,     // 'can' | 'mad'
    pagaExtra:     string,     // 'prorr' | 'completa'
  },

  // ── PREFERENCIAS UI ────────────────────────────────────────────────
  // Fuente: pilotpay/perfiles/{userId}/preferences + localStorage
  preferences: {
    theme:       string,
    sim_avanzado: boolean,
  },

  // ── CÁLCULO EN CURSO ───────────────────────────────────────────────
  // Transiente — no persiste entre sesiones
  // Contexto obligatorio para que el dashboard sepa si es relevante
  calculation: {
    userId:    string | null,
    year:      number | null,
    month:     number | null,     // 1–12
    mesNomina: string | null,     // 'Enero' | ... (para display)
    result:    object | null,     // salidas del motor (sb, dpo, liquido, ...)
    timestamp: number | null,
    isManual:  boolean,           // false = recalc inicial automático (no mostrar en dashboard)
  },

  // ── DATOS MENSUALES (histórico estructurado) ───────────────────────
  // Fuente: localStorage pilotpay:{userId}:monthly:{year}:{month}
  // Clave canónica: userId + year + month
  monthly: {
    // Ejemplo entrada para Mayo 2026:
    '2026:5': {
      payrollExtracted: object | null,   // datos parseados del PDF
      calculatedResult: object | null,   // resultado del motor para ese mes
      auditResult:      object | null,   // resultado de la comparativa
      status: 'none' | 'calculated' | 'compared' | 'audited',
      updatedAt: string,                 // ISO timestamp
    },
  },

  // ── SIMULADOR IRPF ─────────────────────────────────────────────────
  // Fuente: pilotpay/perfiles/{userId}/simulator
  simulator: {
    // Histórico de acumulados por mes (claves numéricas 1–12)
    // Acumulado desde enero, no delta mensual
    historico: {
      1:  { bruto: number, irpf: number },
      // ...
      12: { bruto: number, irpf: number },
    },
    // Configuración del simulador (puede diferir del fiscal por escenarios)
    config: {
      ccaa:         string,
      civil:        string,
      hijos:        string,
      discapacidad: string,
      residencia:   string,
      hijos3:       string,
      ascendientes: string,
      asc75:        string,
      pension:      string,
    },
    year: number,    // año al que corresponde el histórico
  },

  // ── HISTORIAL DE AUDITORÍAS ────────────────────────────────────────
  // Fuente: localStorage pilotpay:{userId}:audit_history_v1
  // Ordenado: más reciente primero
  audits: {
    records: AuditRecord[],   // ver estructura en auditEngine.js
    lastLoaded: number,       // timestamp de la última carga
  },

  // ── NÓMINA PDF EN CURSO (parseo reciente) ─────────────────────────
  // Transiente — invalidado si cambia el contexto
  parsedPayroll: {
    userId:    string | null,
    year:      number | null,
    month:     number | null,
    data:      object | null,    // nomDataCached
    timestamp: number | null,
  },
}
```

### 3.3 Estructura Firebase propuesta

```
pilotpay/
├── usuarios/
│   └── {userId}/              ← datos operativos mínimos (para login y admin)
│       ├── pass, name, apellidos, alias
│       ├── funcion, base, nivel, irpf
│       ├── ingreso, admin, bloqueado
│       └── theme, firstAccess
│
├── perfiles/
│   └── {userId}/
│       ├── identity/          ← nif, nss, fullName, ingreso_display
│       ├── fiscal/            ← irpf, estadoCivil, hijos, ccaa, pagaExtra, ...
│       ├── simulator/         ← historico{1..12}, config{ccaa, civil, ...}, year
│       └── preferences/       ← theme, sim_avanzado
│
├── permisos/
│   └── {userId}/
│
└── rutas/                     ← datos globales (no por usuario)
```

### 3.4 Estructura localStorage propuesta

Todas las claves siguen el patrón `pilotpay:{userId}:{dominio}`:

```
pilotpay:{userId}:profile         ← cache de perfiles/{userId}/ (todos los sub-docs)
pilotpay:{userId}:audit_history   ← registros de auditoría (migra de pilotpay_historial)
pilotpay:{userId}:monthly:{Y}:{M} ← datos mensuales por año y mes
pilotpay:{userId}:theme           ← tema (migra de pilotpay_theme_{userId})
pilotpay:_global:offline_queue    ← cola offline (no dato personal, sí debe tener scope)
pilotpay:_global:perms_cache      ← caché permisos (solo admin)
pilotpay:_global:apikey           ← API key Claude
```

---

## 4. Fuentes de verdad

| Dato | Fuente de verdad | Quién escribe | Quién solo lee |
|---|---|---|---|
| Identidad del usuario (funcion, base, nivel) | Firebase `pilotpay/usuarios/{u}` | Admin únicamente | Todos los módulos |
| % IRPF | `store.fiscal.irpf` (Firebase `perfiles/{u}/fiscal`) | Usuario desde Perfil | Calculadora, Simulador, Dashboard |
| NIF / Nº SS | `store.identity` (Firebase `perfiles/{u}/identity`) | Parser PDF + confirmación usuario | Perfil, Reclamaciones, PDF |
| Estado civil, CCAA, hijos | `store.fiscal` | Usuario desde Perfil | Simulador |
| Resultado cálculo | `store.calculation` (transiente) | `recalc()` / backend | Dashboard, Comparativa |
| Histórico acumulados | `store.simulator.historico` | Usuario desde Simulador + Comparativa (propuestas) | Dashboard, Simulador |
| Registros de auditoría | `store.audits.records` + localStorage user-scoped | `saveAuditRecord()` | Dashboard, Historial tab |
| Nómina PDF parseada | `store.parsedPayroll` (transiente) | Parser PDF | Comparativa, Propuestas |
| Datos mensuales | `store.monthly['{Y}:{M}']` | Calculadora, Comparativa | Dashboard, Historial |
| Rutas ICAO | Firebase `pilotpay/rutas` | Admin | Variables tab, Calculadora |

**Reglas de escritura:**

- Ningún módulo UI escribe directamente a Firebase o localStorage — solo a través del store
- El store expone métodos explícitos: `store.setFiscal()`, `store.addAuditRecord()`, `store.setCalculation()`, etc.
- Los datos derivados (totales, diferencias, bases) **no se persisten** — se recalculan desde los datos raíz

---

## 5. Plan de migración

### Fase 0 — Correcciones urgentes sin refactor (esta semana)

Corregir los bugs críticos sin tocar la arquitectura global. Son parches focalizados.

**0.1 — Unificar la clave del historial de auditorías** *(P1 — crítico)*

```javascript
// En saveAuditRecord(): cambiar hstSave() por escritura user-scoped
// En renderHistorial(): cambiar hstLoad() por loadAuditHistory()
// Migrar en login: si existe 'pilotpay_historial', mover a clave de usuario y borrar global
```

**0.2 — Scope para offline_queue y perms_cache**

Añadir `:{userId}` a `pilotpay_offline_queue` y `pilotpay_perms_cache` en login/logout.

**0.3 — Marcar `calcResult` como "automático" cuando viene del recalc inicial**

Añadir `isManual: false` al recalc inicial. El Dashboard solo muestra la tarjeta si `isManual === true`.

---

### Fase 1 — Crear PilotPayStore como módulo (2–3 semanas)

Crear `frontend/js/store.js` con la estructura definida en §3.2.

El store comienza **solo-lectura**: los módulos existentes siguen escribiendo como antes, pero ahora leen desde el store. El store se alimenta de los globals actuales.

```javascript
// frontend/js/store.js — esqueleto inicial
const PilotPayStore = (() => {
  let _state = { auth: {}, user: {}, identity: {}, fiscal: {}, ... };

  return {
    // Getters
    getAuth()        { return { ..._state.auth }; },
    getUser()        { return { ..._state.user }; },
    getFiscal()      { return { ..._state.fiscal }; },
    getSimulator()   { return { ..._state.simulator }; },
    getAudits()      { return { ..._state.audits }; },
    getCalculation() { return { ..._state.calculation }; },

    // Hydration desde profileData existente (Fase 1: sin romper nada)
    hydrateFromLegacy(profileData, user, currentUser, currentNivel) { ... },
  };
})();
window.PilotPayStore = PilotPayStore;
```

**Migrar Dashboard** para que lea del store. Es el módulo más crítico y el que más inconsistencias muestra.

---

### Fase 2 — Migrar escrituras al store (3–4 semanas)

Cada módulo deja de escribir directamente a `profileData` y pasa por el store.

Orden de migración (menor a mayor riesgo):
1. `Dashboard` — ya migrado en Fase 1 (solo lectura)
2. `Perfil` — `saveProfile()` → `store.setFiscal()` + `store.setIdentity()`
3. `Simulador` — `guardarHistorico()` → `store.setSimulatorHistorico()`
4. `Comparativa` — `saveAuditRecord()` → `store.addAuditRecord()`
5. `Historial tab` — leer de `store.getAudits()`
6. `Calculadora` — `recalc()` → `store.setCalculation()`

**El store se encarga de la persistencia** (Firebase + localStorage) de forma transparente.

---

### Fase 3 — Separar Firebase por dominios (2 semanas)

Migrar la estructura plana `pilotpay/perfiles/{u}` a sub-documentos:
```
pilotpay/perfiles/{u}/identity/
pilotpay/perfiles/{u}/fiscal/
pilotpay/perfiles/{u}/simulator/
pilotpay/perfiles/{u}/preferences/
```

Escribir función de migración que en el login detecta el formato antiguo y lo estructura.
El store escribe a los sub-paths específicos, no al blob completo.

---

### Fase 4 — Datos mensuales con clave compuesta (3 semanas)

Introducir la estructura `monthly['{year}:{month}']` del store para datos de nómina y cálculo.

Ventajas:
- El Dashboard puede mostrar qué mes está calculado
- La Comparativa sabe si el PDF que se está viendo es del mes correcto
- El Historial puede vincular registros a meses exactos
- Se puede reconstruir cualquier mes desde cero

---

### Fase 5 — Backend como calculadora canónica (largo plazo)

Mover el motor de cálculo del frontend al backend. `recalc()` hace POST a `/api/calcular-nomina`. El frontend solo renderiza resultados.

Ventajas:
- Un único motor de cálculo (elimina P9)
- Las tablas salariales se actualizan en un solo lugar
- Los tests del backend validan el motor real que usan los usuarios

Prerequisito: el backend debe estar accesible (actualmente es local).

---

## 6. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración del historial rompe registros existentes | Media | Alto | Test con datos reales antes de merge. Script de migración con backup previo. |
| `simHistoricoData` y `profileData.simHistorico` divergen durante la transición | Alta | Medio | Eliminar `simHistoricoData` como variable separada en Fase 2. Hasta entonces, verificar sincronización en cada write. |
| Un módulo sigue leyendo de `profileData` directamente tras migrar el store | Alta | Bajo | Añadir console.warn en los campos deprecados de `profileData` durante la transición. |
| El store en Fase 1 queda desactualizado si `profileData` cambia | Media | Medio | `hydrateFromLegacy()` debe llamarse cada vez que `profileData` cambia, no solo en login. |
| Los datos de dos usuarios se mezclan en localStorage si comparten dispositivo | Alta (ya ocurre) | Muy alto | Prioridad máxima: Fase 0.1 y 0.2 |

---

## Apéndice A — Mapa de dependencias entre módulos

```
Firebase ──────────────────────────────────────────────────────────┐
  pilotpay/usuarios ──→ USERS (global)                             │
  pilotpay/perfiles ──→ profileData (global)                       │
  pilotpay/permisos ──→ perms (global)                             │
                                                                   │
localStorage                                                       │
  pilotpay_historial ──→ historial tab (hstLoad)                   │
  pilotpay:{u}:audit_history_v1 ──→ dashboard (loadAuditHistory)  │
  pilotpay_v2_{u} ──→ profileData (fallback offline)              │
                                                                   │
DOM inputs (calculadora)                                           │
  #funcion, #base, #irpf, #hv-*, #dpo → recalc() → calcResult    │
                                                                   │
Módulos                                                            │
  renderDashboard()                                                │
    ├─ loadAuditHistory()     [localStorage — clave distinta]      │
    ├─ calcResult             [global transiente]                  │
    └─ profileData            [global]                             │
                                                                   │
  renderPerfil()                                                   │
    ├─ profileData            [global]                             │
    └─ USERS[currentUser]     [fallback]                           │
                                                                   │
  renderSimulador()                                                │
    ├─ profileData.sim_*      [global — mezclado con todo]         │
    └─ simHistoricoData       [mirror local]                       │
                                                                   │
  renderComparativa()                                              │
    ├─ calcResult             [global transiente]                  │
    ├─ nomDataCached          [global sin contexto]                │
    └─ profileData            [para propuestas]                    │
                                                                   │
  renderHistorial()                                                │
    └─ hstLoad()              [localStorage — clave global]        │
```

---

## Apéndice B — Campos a renombrar en la migración

| Campo actual | Campo propuesto | Dominio |
|---|---|---|
| `profileData.irpf` | `store.fiscal.irpf` | fiscal |
| `profileData.sim_ccaa` | `store.simulator.config.ccaa` | simulator |
| `profileData.sim_civil` | `store.simulator.config.civil` | simulator |
| `profileData.simHistorico` | `store.simulator.historico` | simulator |
| `profileData.theme` | `store.preferences.theme` | preferences |
| `profileData.fullName` | `store.identity.fullName` | identity |
| `profileData.nif` | `store.identity.nif` | identity |
| `profileData.nss` | `store.identity.nss` | identity |
| `calcResult` | `store.calculation.result` | calculation |
| `nomDataCached` | `store.parsedPayroll.data` | parsedPayroll |
| `simHistoricoData` | eliminado — usar `store.simulator.historico` | — |
| `currentUser` | `store.auth.userId` | auth |
| `currentNivel` | `store.auth.nivel` | auth |

---

*Documento generado en sesión de auditoría técnica. Actualizar conforme avance la migración.*
