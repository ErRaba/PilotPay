# Modelo Unificado de Variables V1 — PilotPay

⚠️ **Estado:** Diseño conceptual. NO implementado.

**Fecha:** 10/06/2026  
**Objetivo:** Diseñar modelo que permita a PilotPay gestionar simultáneamente datos REALES, PREVISTOS y SIMULADOS sin contaminar la integridad del histórico.

---

## 🎯 Problema a Resolver

PilotPay necesita gestionar tres naturalezas de datos:

1. **REAL** — Programación ejecutada (PDF empresa, nómina)
2. **PREVISTO** — Programación futura (programación inicial)
3. **SIMULADO** — Datos manuales (usuario introduce hipótesis)

**Principio fundamental:** Las previsiones NO deben contaminar auditorías, histórico real ni comparativas reales.

---

## 📋 ENTREGABLE 1 — Modelo de Datos Conceptual

### Estructura VariableSet

```javascript
const VariableSet = {
  // IDENTIFICACIÓN
  id: "uuid-unico",
  
  // PERIODO TEMPORAL
  periodo: {
    year: 2026,
    month: 7,
    label: "Julio 2026"
  },
  
  // NATURALEZA DEL DATO
  naturaleza: {
    estado: "REAL" | "PREVISTO" | "SIMULADO",
    origen: "PDF_EMPRESA" | "PROGRAMACION_INICIAL" | "ENTRADA_MANUAL" | "NOMINA_PDF",
    confianza: 0.0 - 1.0,
    provisional: boolean
  },
  
  // FECHAS DE TRAZABILIDAD
  fechas: {
    creacion: "2026-06-10T10:30:00Z",
    referencia: "2026-07-01",
    extraccion: "2026-06-10T10:30:00Z",
    ejecucion: "2026-07-01" | null
  },
  
  // VARIABLES (estructura idéntica independiente del estado)
  variables: {
    horasVuelo: 68.5,
    imaginarias: 3,
    francos: 10,
    vacaciones: false,
    dpo: 120.50,
    irpf: 34.35,
    nivel: "B",
    base: "MAD"
  },
  
  // METADATA DE ORIGEN
  metadata: {
    archivoOrigen: "Variables Julio 2026.pdf",
    hashArchivo: "sha256...",
    usuarioId: "ESH",
    dispositivo: "device-uuid"
  },
  
  // ADVERTENCIAS
  advertencias: [
    {
      tipo: "INFO" | "WARNING" | "ERROR",
      mensaje: "Variables previstas sujetas a cambios",
      campo: "horasVuelo" | null
    }
  ],
  
  // VERSIONADO (para actualización de previsiones)
  version: {
    numero: 1,
    sustituye: "uuid-anterior" | null,
    vigente: true
  }
};
```

### Principios del Modelo

1. **Inmutabilidad por Defecto** — Cada VariableSet es inmutable, actualizar = crear nuevo
2. **Estado Explícito** — `naturaleza.estado` es obligatorio
3. **Trazabilidad Completa** — De dónde viene, cuándo, con qué confianza
4. **Separación de Concerns** — Variables idénticas en estructura, naturaleza en metadata

---

## 🔄 ENTREGABLE 2 — Clasificación de Orígenes

### Orígenes Actuales

| Origen | Código | Estado Natural | Implementado |
|--------|--------|----------------|--------------|
| PDF Empresa | `PDF_EMPRESA` | REAL | ✅ SÍ |
| Nómina PDF | `NOMINA_PDF` | REAL | ✅ SÍ |
| Entrada Manual | `ENTRADA_MANUAL` | SIMULADO | ✅ SÍ |
| Variables Texto | `VARIABLES_TEXTO` | REAL/SIMULADO | ⚠️ EXISTE |

### Orígenes Futuros

| Origen | Código | Estado Natural | Implementado |
|--------|--------|----------------|--------------|
| Programación Inicial | `PROGRAMACION_INICIAL` | PREVISTO | ❌ NO |
| Importación Batch | `IMPORTACION_BATCH` | REAL | ❌ NO |
| API Externa | `API_EXTERNA` | REAL/PREVISTO | ❌ NO |

---

## 🏷️ ENTREGABLE 3 — Clasificación de Estados

### ESTADO 1: REAL

**Definición:** Datos de actividad ejecutada, cerrada y confirmada.

**Características:**
- Periodo pasado/presente (cerrado)
- Confianza ALTA (0.95-1.0)
- Provisional: false
- Fecha ejecución: CONOCIDA

**Ejemplo:**
```javascript
{
  periodo: { year: 2026, month: 6 },
  naturaleza: {
    estado: "REAL",
    origen: "PDF_EMPRESA",
    confianza: 1.0,
    provisional: false
  },
  fechas: { ejecucion: "2026-06-01" }
}
```

**Usos:** ✅ Auditorías, Comparativas, Histórico, Estadísticas, Dashboard

---

### ESTADO 2: PREVISTO

**Definición:** Datos de actividad futura programada, NO ejecutada.

**Características:**
- Periodo futuro
- Confianza MEDIA-BAJA (0.60-0.85)
- Provisional: true
- Fecha ejecución: NULL

**Ejemplo:**
```javascript
{
  periodo: { year: 2026, month: 7 },
  naturaleza: {
    estado: "PREVISTO",
    origen: "PROGRAMACION_INICIAL",
    confianza: 0.75,
    provisional: true
  },
  fechas: { ejecucion: null },
  advertencias: [{
    tipo: "WARNING",
    mensaje: "Programación provisional sujeta a cambios"
  }]
}
```

**Usos:** ✅ Proyección, Planificación, Dashboard (con etiqueta)  
**NO usar:** ❌ Auditorías, Histórico real, Comparativas reales

---

### ESTADO 3: SIMULADO

**Definición:** Datos introducidos manualmente para escenarios hipotéticos.

**Características:**
- Periodo cualquiera
- Confianza VARIABLE
- Provisional: true
- Fecha ejecución: NULL

**Ejemplo:**
```javascript
{
  periodo: { year: 2026, month: 8 },
  naturaleza: {
    estado: "SIMULADO",
    origen: "ENTRADA_MANUAL",
    confianza: 0.5,
    provisional: true
  },
  fechas: { ejecucion: null },
  advertencias: [{
    tipo: "INFO",
    mensaje: "Simulación manual, NO refleja datos reales"
  }]
}
```

**Usos:** ✅ Simulador, Escenarios "qué pasaría si"  
**NO usar:** ❌ Auditorías, Histórico real, Comparativas reales

### Transiciones de Estado

```
PREVISTO → REAL (cuando el mes se ejecuta)
SIMULADO → (no transiciona)
REAL → (inmutable, no puede volver a PREVISTO)
```

---

## 📊 ENTREGABLE 4 — Matriz de Consumo

| Módulo | REAL | PREVISTO | SIMULADO | Observaciones |
|--------|------|----------|----------|---------------|
| **Calculadora** | ✅ | ✅ | ✅ | Función pura, acepta cualquier tipo |
| **Auditoría** | ✅ | ❌ | ❌ | SOLO REAL (comparar real vs real) |
| **Comparativa** | ✅ | ❌ | ❌ | SOLO REAL |
| **Histórico** | ✅ | ❌ | ❌ | SOLO REAL (registro ejecutado) |
| **Dashboard - Expediente** | ✅ | ✅ | ⚠️ | REAL prioritario, otros con etiqueta |
| **Dashboard - Evolución** | ✅ | ✅ | ❌ | REAL continuo, PREVISTO punteado |
| **Simulador** | ✅ | ✅ | ✅ | Acepta cualquier tipo |
| **Proyección Operativa** | ❌ | ✅ | ⚠️ | PREVISTO principal |
| **Estadísticas** | ✅ | ❌ | ❌ | SOLO REAL (medias, tendencias) |
| **Reclamaciones** | ✅ | ❌ | ❌ | SOLO REAL (documentos oficiales) |

### Reglas Detalladas

**Calculadora:**
```javascript
calcular(variables) {
  // NO distingue estado, solo calcula
  // El resultado hereda naturaleza.estado del input
  return { ...resultado, naturaleza: variables.naturaleza };
}
```

**Auditoría/Comparativa:**
```javascript
function crearAuditoria(vars, nomina) {
  if (vars.naturaleza.estado !== "REAL") {
    throw new Error("Auditoría requiere variables REALES");
  }
  // Proceder...
}
```

**Histórico:**
```javascript
function guardarEnHistorico(record) {
  if (record.naturaleza?.estado !== "REAL") {
    console.warn("Histórico rechaza NO REAL");
    return false;
  }
  return true;
}
```

**Estadísticas:**
```javascript
function calcularMedia(meses) {
  const reales = meses.filter(m => m.naturaleza.estado === "REAL");
  // Solo sobre ejecutados
}
```

---

## 📈 ENTREGABLE 5 — Impacto en Dashboard

### Convivencia Visual

**Expediente Activo:**
```
┌─────────────────────────────────────────┐
│ EXPEDIENTE ACTIVO                       │
├─────────────────────────────────────────┤
│ Último Salario: Jun 2026 — 5.200 € ✓   │
│ Estado: Auditado                        │
│                                         │
│ Próximo Ciclo: Jul 2026                 │
│ Proyección: 5.100 € (±200) [PREVISTO]  │
│ ⚠️ Basado en prog. 10/06, puede variar │
└─────────────────────────────────────────┘
```

**Evolución Anual:**
```
€6000 ┤     ╱╲
€5500 ┤    ╱  ╲
€5000 ┤──╱──────╲╲──┆┆────┆
€4500 ┤          ╲╲ ┆┆  ┆
      └─────────────────────
       E F M A M J J A S O

── REAL (ejecutado)
┆┆ PREVISTO (estimado)
```

**Referencia Habitual:**
```
┌─────────────────────────────────────────┐
│ REFERENCIA HABITUAL                     │
├─────────────────────────────────────────┤
│ Media anual: 5.150 €                    │
│ Base: 6 meses ejecutados                │
│ ⚠️ Previsiones NO incluidas en media   │
└─────────────────────────────────────────┘
```

### Reglas Visuales

| Estado | Color | Estilo Línea | Tooltip | En Media |
|--------|-------|--------------|---------|----------|
| REAL | Azul | Continua ── | "Jun: 5.200 € (auditado)" | ✅ SÍ |
| PREVISTO | Azul | Punteada ┆┆ | "Jul: ~5.100 € (proyección)" | ❌ NO |
| SIMULADO | Naranja | Punteada | "Ago: 4.800 € (simulación)" | ❌ NO |

### Badges y Advertencias

**REAL:** Sin badge (estándar)  
**PREVISTO:** Badge azul "PREVISTO" + disclaimer  
**SIMULADO:** Badge naranja "SIMULACIÓN" + warning visible

---

## 🚫 ENTREGABLE 6 — Riesgos y Mitigaciones

### Riesgos Identificados

**RIESGO 1: Confusión visual REAL vs PREVISTO**

**Escenario:**
```
Usuario ve: "Julio 2026: 5.100 €"
Asume: Nómina real confirmada
Realidad: Proyección sujeta a cambios
```

**Impacto:** Alto — Usuario reclama basándose en proyección

**Mitigación:**
- ✅ Badge obligatorio "PREVISTO" en toda visualización
- ✅ Tooltip diferenciado
- ✅ Línea punteada en gráficas
- ✅ Disclaimer visible
- ✅ NO permitir crear reclamaciones desde PREVISTO

---

**RIESGO 2: Contaminación histórico con previsiones**

**Escenario:**
```
Programación Julio → Variables previstas → Guardado en histórico
Más adelante: Variables reales Julio → Conflicto
```

**Impacto:** Crítico — Histórico corrupto, estadísticas falsas

**Mitigación:**
- ✅ Guardia en `guardarEnHistorico()`: rechazar NO REAL
- ✅ MonthRecord.estado distingue REAL vs PREVISTO
- ✅ Al ejecutarse el mes: PREVISTO se reemplaza por REAL
- ✅ Histórico auditado solo acepta estado REAL

---

**RIESGO 3: Auditoría sobre datos previstos**

**Escenario:**
```
Usuario carga nómina Julio (REAL)
Compara con variables Julio (PREVISTO)
Genera auditoría inválida
```

**Impacto:** Alto — Auditoría sin valor, genera confusión

**Mitigación:**
- ✅ Validación estado en `crearAuditoria()`: requiere REAL
- ✅ Modal warning si intenta auditar con PREVISTO
- ✅ Botón "Auditar" deshabilitado si variables NO REAL

---

**RIESGO 4: Estadísticas con datos mixtos**

**Escenario:**
```
Media anual calcula: 6 REAL + 3 PREVISTO + 3 SIMULADO
Media resultante: incorrecta
```

**Impacto:** Medio — Estadísticas falsas

**Mitigación:**
- ✅ Filtro obligatorio: `meses.filter(m => m.estado === "REAL")`
- ✅ Contador visible: "Base: 6 meses ejecutados"
- ✅ NO incluir PREVISTO/SIMULADO en promedios

---

**RIESGO 5: Usuario olvida actualizar previsión**

**Escenario:**
```
Jun: Previsión Julio (5.100 €)
Jul ejecutado: Real (4.800 €)
Usuario NO actualiza → Dashboard muestra previsión obsoleta
```

**Impacto:** Medio — Información desactualizada

**Mitigación:**
- ✅ Al detectar REAL del mismo periodo → marcar PREVISTO como `vigente: false`
- ✅ Badge "DESACTUALIZADO" si existe REAL posterior
- ✅ Sugerencia automática: "Cargar variables reales Julio"

---

**RIESGO 6: Previsión se guarda como auditoría**

**Escenario:**
```
Usuario carga programación Julio
Hace clic "Guardar auditoría"
Sistema guarda proyección como auditoría real
```

**Impacto:** Crítico — Corrupción histórico

**Mitigación:**
- ✅ `saveAuditRecord()` valida `estado === "REAL"`
- ✅ Modal error: "No puedes auditar variables previstas"
- ✅ Botón "Guardar auditoría" oculto si estado !== REAL

---

### Mecanismos de Protección

**Nivel 1: Validación en Función**
```javascript
function guardarEnHistorico(record) {
  if (record.naturaleza?.estado !== "REAL") {
    throw new Error("Histórico solo acepta datos REALES");
  }
}
```

**Nivel 2: Validación UI**
```javascript
const puedeAuditar = variables.naturaleza.estado === "REAL";
btnAuditar.disabled = !puedeAuditar;
```

**Nivel 3: Advertencias Visuales**
```javascript
if (variables.naturaleza.estado === "PREVISTO") {
  mostrarBadge("PREVISTO", "blue");
  mostrarDisclaimer("Proyección provisional, puede variar");
}
```

**Nivel 4: Segregación de Datos**
```javascript
// Storage separado
localStorage.setItem('pilotpay:real:monthly', ...);
localStorage.setItem('pilotpay:previsto:proyecciones', ...);
// NO mezclar en mismo objeto
```

---

## 📐 Esquema de Almacenamiento Propuesto

### Estructura Actual (MonthRecord)

```javascript
MonthRecord = {
  userId: "ESH",
  year: 2026,
  month: 6,
  estado: "auditado",
  variables: { ... },
  auditoria: { ... },
  regularizacion: { ... }
}
```

### Estructura Futura (con naturaleza)

```javascript
MonthRecord = {
  userId: "ESH",
  year: 2026,
  month: 7,
  estado: "auditado",
  
  // NUEVO: naturaleza del dato
  naturaleza: {
    estado: "REAL",
    origen: "PDF_EMPRESA",
    confianza: 1.0,
    provisional: false
  },
  
  fechas: {
    creacion: "2026-06-10T10:30:00Z",
    ejecucion: "2026-07-01"
  },
  
  variables: { ... },
  auditoria: { ... },
  regularizacion: { ... }
}
```

### Storage Paths

**REAL (actual):**
```
localStorage: pilotpay:{userId}:monthly_v1
IndexedDB: monthlyRecords
Firebase: pilotpay/historicos/{userId}/monthly/{year}_{month}
```

**PREVISTO (futuro):**
```
localStorage: pilotpay:{userId}:proyecciones_v1
IndexedDB: proyecciones
Firebase: pilotpay/proyecciones/{userId}/monthly/{year}_{month}
```

**SIMULADO (futuro):**
```
localStorage: pilotpay:{userId}:simulaciones_v1
// NO sincronizar a Firebase (local only)
```

---

## 🔄 Casos de Uso Detallados

### CASO 1: Usuario carga variables REAL

```
1. Usuario: Sube "Variables Junio 2026.pdf"
2. Parser: Extrae variables
3. Sistema: Detecta periodo = 2026-06
4. Sistema: Asigna estado = REAL (periodo pasado)
5. Sistema: Crea VariableSet con naturaleza.estado = "REAL"
6. Calculadora: Procesa (hereda estado REAL)
7. Usuario: Puede auditar (estado = REAL)
8. Sistema: Guarda en histórico (acepta REAL)
```

### CASO 2: Usuario carga programación PREVISTO

```
1. Usuario: Sube "Programación Julio 2026.html"
2. Parser: Extrae códigos SBY, FR, VAC, 6xxx
3. Sistema: Detecta periodo = 2026-07 (futuro)
4. Sistema: Asigna estado = PREVISTO
5. Sistema: Crea VariableSet con naturaleza.estado = "PREVISTO"
6. Calculadora: Procesa (hereda estado PREVISTO)
7. Sistema: Muestra proyección con badge "PREVISTO"
8. Usuario: NO puede auditar (validación rechaza)
9. Sistema: NO guarda en histórico real
10. Sistema: Guarda en storage proyecciones separado
```

### CASO 3: Usuario introduce datos SIMULADO

```
1. Usuario: Rellena formulario manualmente
2. Sistema: Asigna estado = SIMULADO
3. Sistema: Crea VariableSet con naturaleza.estado = "SIMULADO"
4. Calculadora: Procesa (hereda estado SIMULADO)
5. Sistema: Muestra resultado con badge "SIMULACIÓN"
6. Usuario: NO puede auditar
7. Sistema: NO guarda en histórico
8. Sistema: Opcionalmente guarda en simulaciones locales
```

### CASO 4: Transición PREVISTO → REAL

```
Jun: Usuario carga Programación Julio → estado PREVISTO
Jul ejecutado: Usuario carga Variables Julio PDF → estado REAL

Sistema detecta:
  - Mismo periodo (2026-07)
  - Estado anterior: PREVISTO
  - Estado nuevo: REAL

Acción:
  1. Marca proyección como vigente: false
  2. Crea nuevo MonthRecord con estado REAL
  3. Badge cambia: "PREVISTO" → (sin badge, es estándar)
  4. Ahora SÍ puede auditar
  5. Ahora SÍ se guarda en histórico
```

---

## ✅ Checklist de Implementación Futura

**Antes de implementar Parser Programación V1:**

- [ ] Añadir campo `naturaleza` a MonthRecord
- [ ] Añadir campo `naturaleza` a AuditRecord
- [ ] Crear storage separado para proyecciones
- [ ] Implementar validación estado en `saveAuditRecord()`
- [ ] Implementar validación estado en `guardarEnHistorico()`
- [ ] Implementar filtro estado en estadísticas
- [ ] Añadir badges visuales (PREVISTO, SIMULADO)
- [ ] Añadir disclaimers obligatorios
- [ ] Modificar gráfica Evolución (línea punteada)
- [ ] Implementar detección transición PREVISTO→REAL
- [ ] Testing completo de segregación de datos

**Solo cuando checklist esté completo → implementar Parser Programación V1**

---

## 📊 Resumen Ejecutivo

### Modelo Aprobado

**3 estados:** REAL, PREVISTO, SIMULADO

**Separación estricta:**
- REAL → Auditorías, Histórico, Comparativas, Estadísticas
- PREVISTO → Proyección, Dashboard (etiquetado)
- SIMULADO → Simulador, Escenarios (sin histórico)

### Protecciones Implementadas

1. **Validación función:** Rechazar NO REAL en módulos críticos
2. **Validación UI:** Deshabilitar acciones según estado
3. **Segregación storage:** Paths separados REAL vs PREVISTO
4. **Advertencias visuales:** Badges + disclaimers obligatorios
5. **Transiciones controladas:** PREVISTO→REAL detectado y manejado

### Riesgos Mitigados

✅ Confusión visual (badges + líneas diferenciadas)  
✅ Contaminación histórico (validación estado)  
✅ Auditoría inválida (rechazo NO REAL)  
✅ Estadísticas falsas (filtro REAL obligatorio)  
✅ Datos obsoletos (detección REAL posterior)  
✅ Guardado erróneo (validación multi-nivel)

---

**MODELO UNIFICADO DE VARIABLES V1 COMPLETADO**

**Próximo paso:** Implementar cambios arquitectónicos antes de desarrollar Parser Programación V1.
