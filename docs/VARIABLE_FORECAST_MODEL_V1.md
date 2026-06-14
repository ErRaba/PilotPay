# Variable Forecast Model V1 — PilotPay

⚠️ **Estado:** Modelo de análisis. NO implementado.

**Fecha:** 10/06/2026  
**Objetivo:** Identificar qué variables de PilotPay pueden generarse desde una programación inicial (futura) para alimentar la calculadora existente.

---

## 🎯 Pregunta Clave

**¿Qué variables previsionales puede generar PilotPay a partir de una programación inicial?**

### Flujos Comparados

**Flujo Actual (Empresa):**
```
Programación Ejecutada (mes cerrado)
  ↓
Empresa extrae variables reales
  ↓
PDF Variables
  ↓
PilotPay lee PDF
  ↓
Calculadora
```

**Flujo Futuro (PilotPay):**
```
Programación Inicial (mes futuro)
  ↓
PilotPay extrae variables previstas
  ↓
Calculadora (SIN MODIFICAR)
  ↓
Proyección económica
```

---

## 📋 ENTREGABLE 1 — Catálogo de Variables

### Variables Identificadas en Calculadora Actual

| Variable | Input ID | Obligatoria | Tipo | Observaciones |
|----------|----------|-------------|------|---------------|
| **Horas de vuelo total** | `hv-total` | ✅ SÍ | number | Variable crítica |
| **HV Tramo 1** | `hv1` | ❌ NO | number | Desgloses HV por tramo |
| **HV Tramo 2** | `hv2` | ❌ NO | number | Desgloses HV por tramo |
| **HV Tramo 3** | `hv3` | ❌ NO | number | Desgloses HV por tramo |
| **HV Tramo 4** | `hv4` | ❌ NO | number | Desgloses HV por tramo |
| **Imaginarias** | `imaginarias` | ❌ NO | number | Unidades |
| **Francos** | `francos` | ❌ NO | number | Unidades |
| **DPO** | `dpo` | ❌ NO | number | Importe en € |
| **Vacaciones** | `toggle-vac` | ❌ NO | boolean | Este mes con vacaciones |
| **IRPF %** | `irpf` | ✅ SÍ | number | Porcentaje retención |
| **Nivel** | `nivel` | ✅ SÍ | select | A, B, C, D (pilotos) |
| **Base** | `base` | ✅ SÍ | select | TFN, LPA, MAD, etc. |

**Total variables inputs:** 12

---

### A) VARIABLES GENERABLES DIRECTAMENTE

Variables que pueden extraerse directamente de la programación sin cálculos adicionales.

| Variable | Fuente Programación | Fiabilidad | Hipótesis | Datos Externos | Estado |
|----------|---------------------|------------|-----------|----------------|--------|
| **Imaginarias** | Conteo SBY-, SBY., SBY | ALTA | Ninguna | No | ✅ GENERABLE |
| **Francos** | Conteo FR-, FR. | ALTA | Ninguna | No | ✅ GENERABLE |
| **Días libres** | Conteo OFF | ALTA | Ninguna | No | ⚠️ GENERABLE (requiere validar si calculadora usa este campo) |
| **Vacaciones (flag)** | Detección VAC en mes | ALTA | Ninguna | No | ✅ GENERABLE |
| **Días vacaciones** | Conteo VAC | ALTA | Ninguna | No | ⚠️ GENERABLE (requiere validar si calculadora usa este campo) |
| **Formación (días)** | Conteo ERF2, CRE2, EQE2, CAT | ALTA | Ninguna | No | ⚠️ INFO (no es input directo calculadora) |
| **Simulador (días)** | Conteo SEN1 | ALTA | Ninguna | No | ⚠️ INFO (no es input directo calculadora) |
| **Actividad médica** | Conteo RM | ALTA | Ninguna | No | ⚠️ INFO (no es input directo calculadora) |

**Resumen Generables Directamente:**
- **Con soporte actual:** 3 (Imaginarias, Francos, Vacaciones flag)
- **Requieren validación:** 2 (Días libres, Días vacaciones)
- **Informativas:** 3 (Formación, Simulador, RM)

---

### B) VARIABLES GENERABLES CON REGLAS

Variables que requieren cálculos, tablas externas o hipótesis.

| Variable | Fuente Programación | Fiabilidad | Hipótesis | Datos Externos | Estado |
|----------|---------------------|------------|-----------|----------------|--------|
| **HV Total previstas** | Suma HB de vuelos programados | MEDIA | Tabla ICAO rutas | Tabla `pilotpay/rutas` | ⚠️ GENERABLE CON DATOS |
| **HV Tramo 1** | Clasificación HB por tramos | MEDIA | Tabla ICAO + regla tramos | Tabla rutas + convenio | ⚠️ GENERABLE CON REGLAS |
| **HV Tramo 2** | Clasificación HB por tramos | MEDIA | Tabla ICAO + regla tramos | Tabla rutas + convenio | ⚠️ GENERABLE CON REGLAS |
| **HV Tramo 3** | Clasificación HB por tramos | MEDIA | Tabla ICAO + regla tramos | Tabla rutas + convenio | ⚠️ GENERABLE CON REGLAS |
| **HV Tramo 4** | Clasificación HB por tramos | MEDIA | Tabla ICAO + regla tramos | Tabla rutas + convenio | ⚠️ GENERABLE CON REGLAS |
| **DPO estimado** | Detección vuelos con pernocta | BAJA | Patrón horarios pernocta | Histórico patrones | ❌ COMPLEJO |

**Resumen Generables con Reglas:**
- **Factibles:** 5 (HV total + 4 tramos, requiere tabla ICAO)
- **Complejos:** 1 (DPO, requiere detección pernoctas)

---

### C) VARIABLES NO GENERABLES TODAVÍA

Variables que dependen de ejecución real o información no disponible en programación inicial.

| Variable | Razón | Observaciones |
|----------|-------|---------------|
| **IRPF %** | Dato fiscal personal, NO operativo | Debe obtenerse del perfil usuario |
| **Nivel** | Dato contractual personal, NO operativo | Debe obtenerse del perfil usuario |
| **Base** | Dato operativo personal | Podría inferirse de programación si aparece origen vuelos, pero NO fiable |
| **DPO (importe €)** | Requiere detección de pernoctas + tarifa DPO | Complejo, baja fiabilidad |
| **Dietas** | No aparecen en programación inicial | Solo conocidas tras ejecución |
| **Complementos variables** | Dependen de ejecución real | No predecibles |
| **Horas extras** | No programadas inicialmente | Solo tras cambios operativos |
| **Regularizaciones** | Ajustes posteriores | Impredecibles |

**Resumen No Generables:**
- **Deben obtenerse del perfil:** 2 (IRPF, Nivel)
- **Difíciles de proyectar:** 6 (Base, DPO, Dietas, Complementos, Horas extras, Regularizaciones)

---

## 🗺️ ENTREGABLE 2 — Mapa Programación → Variables

### Tabla de Mapeo

| Código Programación | Variables Alimentadas | Fiabilidad |
|---------------------|----------------------|------------|
| **6xxx** (Vuelo) | HV Total, HV Tramos 1-4, (DPO si pernocta) | MEDIA (requiere tabla ICAO) |
| **SBY-, SBY., SBY** | Imaginarias | ALTA |
| **FR-, FR.** | Francos | ALTA |
| **OFF** | Días libres (si calculadora lo usa) | MEDIA (requiere validación) |
| **VAC** | Vacaciones flag, Días vacaciones | ALTA |
| **ERF2, CRE2, EQE2, CAT** | Formación (días) | ALTA (informativo) |
| **SEN1** | Simulador (días) | ALTA (informativo) |
| **RM** | Actividad médica (días) | ALTA (informativo) |
| **LPC/OPC, LRC** | Verificación (días) | ALTA (informativo) |

### Flujos de Extracción

#### Flujo 1: Imaginarias (Directo)

```
Programación
  ↓
Buscar: SBY-, SBY., SBY
  ↓
Contar unidades
  ↓
Variable: imaginarias = N
  ↓
Calculadora (campo: imaginarias)
```

**Fiabilidad:** ALTA  
**Desarrollo requerido:** Parser + contador

---

#### Flujo 2: Francos (Directo)

```
Programación
  ↓
Buscar: FR-, FR.
  ↓
Contar unidades
  ↓
Variable: francos = N
  ↓
Calculadora (campo: francos)
```

**Fiabilidad:** ALTA  
**Desarrollo requerido:** Parser + contador

---

#### Flujo 3: Vacaciones (Directo)

```
Programación
  ↓
Buscar: VAC
  ↓
Detectar presencia en mes
  ↓
Variable: vacaciones = true/false
  ↓
Calculadora (campo: toggle-vac)
```

**Fiabilidad:** ALTA  
**Desarrollo requerido:** Parser + detector booleano

---

#### Flujo 4: HV Previstas (Con Datos Externos)

```
Programación
  ↓
Buscar: 6xxx (códigos vuelo)
  ↓
Para cada vuelo:
  Lookup tabla ICAO: vuelo → horas bloque
  ↓
Sumar horas bloque totales
  ↓
Variable: hv-total = Σ HB
  ↓
Clasificar por tramos según convenio
  ↓
Variables: hv1, hv2, hv3, hv4
  ↓
Calculadora (campos: hv-total, hv1-4)
```

**Fiabilidad:** MEDIA  
**Desarrollo requerido:** Parser + tabla ICAO + regla clasificación tramos  
**Hipótesis conservadora:** HV proyectadas × 0.95 (ajuste -5% por cancelaciones)

---

#### Flujo 5: DPO (Hipótesis Compleja)

```
Programación
  ↓
Buscar: 6xxx (códigos vuelo)
  ↓
Para cada vuelo:
  Analizar horarios salida/llegada
  Detectar patrón pernocta:
    - Salida tarde (>15:00)
    - Sin regreso mismo día
    - Siguiente actividad mañana siguiente
  ↓
Contar pernoctas probables
  ↓
Aplicar factor conservador × 0.80
  ↓
Variable: dpo_estimado = N pernoctas × tarifa DPO
  ↓
⚠️ Baja fiabilidad
```

**Fiabilidad:** BAJA  
**Desarrollo requerido:** Parser + detector pernoctas + histórico patrones  
**NO RECOMENDADO para MVP**

---

## 📊 ENTREGABLE 3 — Porcentaje de Cobertura

### Cobertura de Variables Calculadora

| Clasificación | Variables | % Total |
|---------------|-----------|---------|
| **Generables directamente** | 3 (Imaginarias, Francos, Vacaciones) | 25% |
| **Generables con datos** | 5 (HV total + HV tramos 1-4) | 42% |
| **Deben venir de perfil** | 2 (IRPF, Nivel) | 17% |
| **No generables todavía** | 2 (Base, DPO) | 17% |

**Total inputs calculadora:** 12  
**Generables desde programación:** 8 (67%)  
**NO generables:** 4 (33%)

---

### Cobertura por Fiabilidad

| Fiabilidad | Variables | Observaciones |
|------------|-----------|---------------|
| **ALTA** | 3 | Imaginarias, Francos, Vacaciones (extracción directa) |
| **MEDIA** | 5 | HV total + HV tramos (requiere tabla ICAO) |
| **BAJA** | 0 | DPO descartado para MVP |
| **Perfil Usuario** | 2 | IRPF, Nivel (NO vienen de programación) |
| **No proyectables** | 2 | Base, DPO importe |

---

### Impacto en Proyección Económica

**Con variables de ALTA fiabilidad (3):**
- ✅ Imaginarias → Afecta HB → Afecta productividad → Impacto medio en bruto
- ✅ Francos → Afecta HB → Afecta productividad → Impacto medio en bruto
- ✅ Vacaciones → Afecta cálculo HB y media variables → Impacto alto en bruto

**Con variables de MEDIA fiabilidad (5):**
- ✅ HV total + tramos → **Impacto CRÍTICO** en bruto (concepto principal retribución)

**Variables faltantes de perfil (2):**
- ⚠️ IRPF → **Impacto CRÍTICO** en líquido (debe venir de perfil usuario)
- ⚠️ Nivel → **Impacto ALTO** en salario base (debe venir de perfil usuario)

**Variables no proyectables (2):**
- ⚠️ Base → Impacto medio (complemento MAD)
- ⚠️ DPO → Impacto medio-bajo (variable mensual)

---

### Estimación de Precisión de Proyección

**Escenario: Proyección con variables ALTA + MEDIA fiabilidad**

| Concepto Nómina | Precisión Proyección | Observaciones |
|-----------------|----------------------|---------------|
| **Salario base** | 100% | Viene de perfil (nivel) |
| **Plus transporte** | 100% | Fijo, viene de perfil |
| **HV (horas vuelo)** | 85-90% | MEDIA fiabilidad, tabla ICAO + factor conservador |
| **Productividad** | 80-85% | Depende de HV + Imaginarias + Francos + Vacaciones |
| **Complemento MAD** | 0-100% | Depende de si base = MAD (no proyectable fiable) |
| **DPO** | 0% | NO proyectable en MVP |
| **Bruto devengado** | 70-80% | HV + Productividad (conceptos principales) |
| **SS** | 70-80% | Depende de bruto |
| **IRPF** | 100% | Viene de perfil (%) |
| **Líquido neto** | 70-80% | Depende de bruto + deducciones |

**Precisión global estimada:** **70-80%** del resultado económico real

**Rango de variación esperado:** ±10-15% sobre proyección

---

## 🚫 ENTREGABLE 4 — Gaps Detectados

### Variables NO Obtenibles desde Programación

| Variable | Razón | Solución |
|----------|-------|----------|
| **IRPF %** | Dato fiscal personal, no operativo | Obtener de `profileData.irpf` |
| **Nivel salarial** | Dato contractual personal, no operativo | Obtener de `profileData.nivel` |
| **Base operativa** | Podría inferirse pero NO fiable | Obtener de `profileData.base` (o inferir con baja confianza) |
| **DPO (importe)** | Requiere detectar pernoctas + tarifa | Proyección baja fiabilidad → descartado MVP |
| **Dietas exentas** | No aparecen en programación inicial | No proyectable (solo conocidas tras ejecución) |
| **Complementos variables** | Dependen de ejecución real | No proyectable |
| **Horas extras no programadas** | No aparecen en programación inicial | No proyectable |
| **Regularizaciones** | Ajustes posteriores a ejecución | No proyectable (impredecible) |
| **Atrasos** | Ajustes históricos | No proyectable (impredecible) |

---

### Gaps de Datos Externos

| Dato Externo | Necesidad | Estado | Impacto |
|--------------|-----------|--------|---------|
| **Tabla ICAO rutas** | CRÍTICO | ⚠️ Infraestructura existe (`pilotpay/rutas`) pero NO poblada | Sin tabla → NO hay HV proyectadas → impacto CRÍTICO |
| **Regla clasificación tramos HV** | ALTO | ✅ Existe en convenio | Requiere implementar regla |
| **Tarifa DPO** | MEDIO | ✅ Existe en convenio | Solo si se proyecta DPO (descartado MVP) |
| **Patrón detección pernoctas** | MEDIO | ❌ NO existe | Solo si se proyecta DPO (descartado MVP) |

---

### Gaps de Conocimiento Operativo

| Conocimiento | Necesidad | Estado |
|--------------|-----------|--------|
| **¿OFF es equivalente a Franco en calculadora?** | MEDIO | ⚠️ REQUIERE VALIDACIÓN |
| **¿Calculadora usa campo "días vacaciones"?** | BAJO | ⚠️ REQUIERE VALIDACIÓN |
| **¿Formación/Simulador afectan cálculo HB?** | MEDIO | ⚠️ REQUIERE VALIDACIÓN con convenio |
| **¿Base puede inferirse de origen vuelos?** | BAJO | ⚠️ BAJA FIABILIDAD, descartado MVP |

---

## 🎯 ENTREGABLE 5 — MVP Realista

### Definición MVP: Proyección Operativa Mínima Viable

**Objetivo:** Generar variables previstas desde programación inicial para obtener proyección económica razonable usando calculadora actual.

**Sin tocar:**
- ❌ Calculadora
- ❌ Motores de cálculo
- ❌ Firebase (salvo tabla ICAO)
- ❌ Dashboard existente

---

### Variables Proyectables en MVP

| # | Variable | Fuente | Fiabilidad | Desarrollo |
|---|----------|--------|------------|------------|
| 1 | **Imaginarias** | Conteo SBY | ALTA | Parser + contador |
| 2 | **Francos** | Conteo FR | ALTA | Parser + contador |
| 3 | **Vacaciones (flag)** | Detección VAC | ALTA | Parser + detector |
| 4 | **HV Total** | Suma HB vuelos | MEDIA | Parser + tabla ICAO |
| 5 | **HV Tramo 1** | Clasificación HB | MEDIA | Parser + tabla ICAO + regla |
| 6 | **HV Tramo 2** | Clasificación HB | MEDIA | Parser + tabla ICAO + regla |
| 7 | **HV Tramo 3** | Clasificación HB | MEDIA | Parser + tabla ICAO + regla |
| 8 | **HV Tramo 4** | Clasificación HB | MEDIA | Parser + tabla ICAO + regla |

**Total variables MVP:** 8/12 (67% de inputs calculadora)

---

### Variables de Perfil (NO desde Programación)

| # | Variable | Fuente |
|---|----------|--------|
| 9 | **IRPF %** | `profileData.irpf` |
| 10 | **Nivel** | `profileData.nivel` |
| 11 | **Base** | `profileData.base` |

**Total desde perfil:** 3/12 (25%)

---

### Variables Descartadas en MVP

| # | Variable | Razón |
|---|----------|-------|
| 12 | **DPO** | Baja fiabilidad, complejo detectar pernoctas |

**Total descartadas:** 1/12 (8%)

---

### Estructura Variables Previstas MVP

```javascript
const variablesPrevistas = {
  // Metadata
  estado: "PREVISTO",
  origen: "PROGRAMACION_INICIAL",
  fechaExtraccion: "2026-06-10",
  mesProgramado: "2026-07",
  
  // Variables desde programación (ALTA fiabilidad)
  imaginarias: 3,        // Conteo SBY
  francos: 10,           // Conteo FR
  vacaciones: false,     // Detección VAC
  
  // Variables desde programación (MEDIA fiabilidad)
  hvTotal: 68.5,         // Suma HB desde tabla ICAO
  hv1: 45.0,             // Tramo 1 (0-50h)
  hv2: 18.5,             // Tramo 2 (50-70h)
  hv3: 5.0,              // Tramo 3 (70-80h)
  hv4: 0.0,              // Tramo 4 (>80h)
  
  // Variables desde perfil usuario (NO programación)
  irpf: 34.35,           // De profileData.irpf
  nivel: "B",            // De profileData.nivel
  base: "MAD",           // De profileData.base
  
  // Variables NO proyectadas en MVP
  dpo: null,             // Descartado (baja fiabilidad)
  
  // Advertencias
  provisional: true,
  puedeVariar: true,
  factorConservador: 0.95  // HV × 95% (ajuste cancelaciones)
};
```

---

### Flujo Completo MVP

```
1. Usuario sube HTML/PDF programación inicial (mes futuro)
   ↓
2. Parser Programación V1:
   - Extrae códigos: SBY, FR, VAC, 6xxx
   - Cuenta: imaginarias, francos
   - Detecta: vacaciones (boolean)
   - Lista vuelos programados: [6075, 6015, 6017, ...]
   ↓
3. Generador Variables Previstas:
   - Para cada vuelo → Lookup tabla ICAO → HB
   - Suma HB total
   - Clasifica HB por tramos (convenio)
   - Aplica factor conservador (× 0.95)
   - Obtiene IRPF, Nivel, Base desde profileData
   ↓
4. Estructura variablesPrevistas generada
   ↓
5. Calculadora PilotPay (SIN MODIFICAR):
   - Recibe variablesPrevistas
   - Calcula bruto devengado
   - Calcula SS, IRPF
   - Calcula líquido neto
   ↓
6. Resultado: Proyección económica (±10-15% vs real)
```

---

### Requisitos Técnicos MVP

| Componente | Estado | Desarrollo Requerido |
|------------|--------|----------------------|
| **Parser Programación V1** | ❌ NO existe | Extracción códigos SBY, FR, VAC, 6xxx |
| **Tabla ICAO rutas** | ⚠️ Infraestructura existe, NO poblada | Poblar tabla `pilotpay/rutas` con HB por vuelo |
| **Regla clasificación tramos** | ❌ NO existe | Implementar regla convenio (0-50h, 50-70h, 70-80h, >80h) |
| **Generador variables previstas** | ❌ NO existe | Función que genera estructura compatible calculadora |
| **Adaptador input calculadora** | ❌ NO existe | Cargar variablesPrevistas → inputs calculadora |
| **Calculadora** | ✅ Existe | **SIN MODIFICAR** |

---

### Valor Aportado MVP

**Pregunta que responde:**

> "Con esta programación inicial, si el mes se ejecutara aproximadamente como está publicado hoy, cobrarías entre 4.900 € y 5.500 € (proyección central: 5.200 €)"

**NO responde:**

> ~~"Tu nómina será exactamente 5.200 €"~~

**Precisión esperada:** 70-80% del resultado real (rango ±10-15%)

**Utilidad:**
- ✅ Anticipar resultado económico mensual
- ✅ Detectar meses atípicos (muchas vacaciones, poco vuelo)
- ✅ Comparar proyección vs realidad ejecutada (análisis variaciones futuro)
- ✅ Planificación financiera personal

---

### Esfuerzo de Desarrollo Estimado

| Componente | Complejidad | Tiempo Estimado |
|------------|-------------|-----------------|
| **Parser Programación V1** | Media | 3-4 semanas |
| **Poblar tabla ICAO** | Baja | 1 semana (datos manuales/semi-automáticos) |
| **Regla clasificación tramos** | Baja | 1 semana |
| **Generador variables** | Baja | 1 semana |
| **Adaptador calculadora** | Media | 2 semanas |
| **Testing integración** | Media | 2 semanas |

**Total estimado:** 10-12 semanas desarrollo + testing

---

### Limitaciones Conocidas MVP

| Limitación | Impacto |
|------------|---------|
| **DPO NO proyectado** | Impacto medio-bajo en bruto (~5-10% variación) |
| **Base NO inferida** | Complemento MAD puede faltar (solo aplica base MAD) |
| **Factor conservador HV (-5%)** | Proyección sistemáticamente por debajo de real |
| **Cambios operativos frecuentes** | Programación cambia → proyección desactualizada |
| **Tabla ICAO incompleta** | Si vuelo no existe → HV = 0 (error proyección) |

---

## 📈 Conclusiones

### Respuesta a Pregunta Clave

**¿Qué variables puede generar PilotPay desde programación inicial?**

**Respuesta:** **8 de 12 variables (67%)** con fiabilidad ALTA-MEDIA.

---

### Viabilidad Proyección Operativa

| Aspecto | Evaluación |
|---------|------------|
| **Técnicamente viable** | ✅ SÍ |
| **Sin modificar calculadora** | ✅ SÍ |
| **Requiere datos externos** | ⚠️ SÍ (tabla ICAO crítica) |
| **Precisión aceptable** | ✅ SÍ (70-80%) |
| **Utilidad real** | ✅ SÍ (planificación financiera) |
| **Desarrollo complejo** | ⚠️ MEDIO (10-12 semanas) |

---

### Recomendación

**✅ MVP ES VIABLE**

**Con las siguientes condiciones:**

1. **Poblar tabla ICAO** como prioridad 0 (sin ella NO hay HV proyectadas)
2. **Implementar Parser Programación V1** para HTML (formato actual observado)
3. **Descartar DPO** en primera versión (complejidad vs beneficio)
4. **Comunicar siempre rango** (no cifra exacta)
5. **Validar con usuarios beta** antes de escalar

---

**FIN DEL VARIABLE FORECAST MODEL V1**

**Próximo paso aprobado:** Validar viabilidad MVP con usuario real antes de comenzar desarrollo.
