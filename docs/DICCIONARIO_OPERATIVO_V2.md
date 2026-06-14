# Diccionario Operativo V2 — PilotPay

⚠️ **Estado:** Análisis completado. Parser NO implementado.

**Fuente:** 18 programaciones históricas (Enero 2025 - Junio 2026)  
**Período analizado:** 18 meses consecutivos  
**Archivos procesados:** 18 PDFs  
**Fecha análisis:** 10/06/2026

---

## 📋 Inventario de Archivos

### Cobertura Temporal

| Año | Meses Disponibles | Estado |
|-----|-------------------|--------|
| **2025** | Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Sep, Oct, Nov, Dic | ✅ Completo (12/12) |
| **2026** | Ene, Feb, Mar, Abr, May, Jun | ✅ Completo hasta fecha actual (6/6) |

**Total:** 18 meses consecutivos ✅  
**Meses ausentes:** Ninguno  
**Coherencia temporal:** ✅ Serie completa

---

## 🎯 Enfoque Corregido

### ❌ Enfoque Anterior (INCORRECTO)

- Intentaba calcular impacto económico directamente
- Creaba lógica de cálculo paralela
- Interpretaba códigos sin validación
- Mezclaba extracción con cálculo

### ✅ Enfoque Actual (CORRECTO)

**Pregunta correcta:**

> "¿A qué variable o concepto de PilotPay corresponde este código?"

**Objetivo:**

Descubrir cómo convertir una **programación futura** en **variables previstas** compatibles con la calculadora existente.

**Principio fundamental:**

```
Programación Futura
  ↓
Extracción (Parser Programación V1)
  ↓
Normalización
  ↓
Adaptación
  ↓
Variables Previstas (compatibles con calculadora)
  ↓
Calculadora PilotPay (motores existentes, SIN MODIFICAR)
  ↓
Proyección Económica
```

---

## 📚 ENTREGABLE 1 — Diccionario Operativo V2

### Códigos Validados

| Código | Significado Validado | Categoría | Confianza | Observaciones |
|--------|---------------------|-----------|-----------|---------------|
| **OFF** | Día libre / Sin actividad programada | DESCANSO | ALTO | Día sin actividad asignada |
| **FR-** | Franco mañana | DESCANSO | ALTO | Franco (NO rotativo), franja mañana |
| **FR.** | Franco tarde | DESCANSO | ALTO | Franco (NO rotativo), franja tarde |
| **SBY-** | Imaginaria mañana | RESERVA | ALTO | Standby 05:00-17:00 |
| **SBY.** | Imaginaria tarde | RESERVA | ALTO | Standby 11:00-23:00 |
| **SBY** | Imaginaria | RESERVA | MEDIO | Sin franja especificada |
| **VAC** | Vacaciones | VACACIONES | ALTO | Vacaciones anuales |
| **ERF2** | Entrenamiento E2 | FORMACIÓN | ALTO | Formación tipo Embraer E2 |
| **CRE2** | CRM E2 | FORMACIÓN | ALTO | Crew Resource Management E2 |
| **EQE2** | Equipment E2 | FORMACIÓN | MEDIO | Formación equipamiento, certificación anual |
| **SEN1** | Simulador | SIMULADOR | MEDIO | Simulator Engine-out |
| **LPC/OPC** | Line/Operator Check | VERIFICACIÓN | ALTO | Verificación línea/operador |
| **LRC** | Line Check | VERIFICACIÓN | MEDIO | Line Check anual |
| **RM** | Reconocimiento Médico | MÉDICO | ALTO | Programado primer día bloque de 6 |
| **CAT** | CAT III Training | FORMACIÓN | ALTO | Formación aproximación CAT III |
| **BAJ** | Baja justificada | AUSENCIA | MEDIO | Baja que requiere justificación |
| **6xxx** | Vuelo comercial | VUELO | ALTO | Código vuelo 4 dígitos |
| **\*6xxx** | Vuelo NO operado | POSICIONAMIENTO | ALTO | Tripulante situado, NO opera |

**Total códigos validados:** 18

---

### Códigos NO Validados (Requieren Validación)

| Código | Estado | Acción Requerida |
|--------|--------|------------------|
| **VAL** | DESCONOCIDO | Validar con tripulación/compañía (NO es Valencia) |
| **GRX** | Granada (destino IATA) | Validar contexto operativo |
| **MAD** | Madrid (destino IATA) | Validar contexto operativo |

---

### Correcciones Aplicadas

#### 1. OFF vs FR

**OFF:** Día libre / Sin actividad programada  
**FR- / FR.:** Franco mañana/tarde

**IMPORTANTE:** OFF y FR son conceptos distintos. NO agrupar como "francos".

#### 2. SBY* → Imaginaria/Reserva

**Antes:** Standby con significado ambiguo  
**Ahora:** Imaginaria (concepto claro en calculadora PilotPay)

#### 3. Horarios en Programación

**Antes:** Interpretados como horas de vuelo  
**Ahora:** Inicio/Fin FDP (Flight Duty Period)

| Patrón | Significado Validado |
|--------|---------------------|
| **HH:MM** (campo actividad) | Inicio FDP |
| **HH:MM HH:MM** (dos campos) | Inicio FDP + Fin FDP |

**IMPORTANTE:** Las horas mostradas NO son horas de vuelo.

#### 4. VAL → DESCONOCIDO

**Antes:** Interpretado como Valencia  
**Ahora:** Significado desconocido, requiere validación

#### 5. Asterisco en Vuelos

**Patrón:** `*6015 A16:36 MAD`

**Significado validado:** El tripulante NO opera ese tramo. Va situado en ese vuelo para comenzar o finalizar su FDP.

**Clasificación:** POSICIONAMIENTO (NO suma horas de vuelo operadas)

#### 6. DPO → Eliminado

**Antes:** Asociado con "Dietas de Pernocta"  
**Ahora:** Interpretación incorrecta, concepto eliminado del diccionario

---

### Conocimiento Operativo Validado

#### Vacaciones (desde 2026)

**Patrón:** 4 bloques × 6 días (patrón 6+3)

**Impacto conocido:**
- Afectan cálculo HB
- Aplican media de variables

**Acción:** Guardar como conocimiento operativo, NO implementar reglas aquí (calculadora las aplicará)

#### Reconocimiento Médico (RM)

**Regla según acuerdo:** Debe programarse el primer día del bloque de 6

**Acción:** Guardar como conocimiento operativo, NO implementar lógica

---

## 🔗 ENTREGABLE 2 — Matriz de Mapeo a PilotPay

### Conceptos con Soporte Existente (Prioridad ALTA)

| Código | Significado | Variable PilotPay | Campo | Motor | Soporte | Desarrollo Requerido |
|--------|-------------|-------------------|-------|-------|---------|----------------------|
| **OFF** | Día libre | Día libre | `diaLibre` | ⚠️ REVISAR | ⚠️ VALIDAR | Verificar si existe campo específico |
| **FR-** | Franco mañana | Franco | `franco` | Francos | ✅ SÍ | ❌ NINGUNO |
| **FR.** | Franco tarde | Franco | `franco` | Francos | ✅ SÍ | ❌ NINGUNO |
| **SBY-** | Imaginaria mañana | Imaginaria | `imaginaria` | Imaginarias | ✅ SÍ | ❌ NINGUNO |
| **SBY.** | Imaginaria tarde | Imaginaria | `imaginaria` | Imaginarias | ✅ SÍ | ❌ NINGUNO |
| **SBY** | Imaginaria | Imaginaria | `imaginaria` | Imaginarias | ✅ SÍ | ❌ NINGUNO |
| **VAC** | Vacaciones | Vacaciones | `vacaciones` | Vacaciones | ⚠️ REVISAR | Validar patrón 6+3 (2026) |
| **6xxx** | Vuelo | Horas de vuelo | `horasVuelo` | HV + Productividad | ✅ SÍ | Requiere tabla ICAO |

**Estos conceptos pueden proyectarse HOY usando calculadora actual.**

---

### Conceptos Futuros (Sin Soporte Actual)

| Código | Significado | Variable Futura | Soporte | Desarrollo Requerido | Prioridad |
|--------|-------------|-----------------|---------|----------------------|-----------|
| **ERF2** | Entrenamiento E2 | Formación | ❌ NO | Campo `formacion` + regla impacto HB | Media |
| **CRE2** | CRM E2 | Formación | ❌ NO | Campo `formacion` + regla impacto HB | Media |
| **EQE2** | Equipment E2 | Formación | ❌ NO | Campo `formacion` + regla impacto HB | Baja |
| **SEN1** | Simulador | Simulador | ❌ NO | Campo `simulador` + regla impacto HB | Media |
| **LPC/OPC** | Verificación | Verificación | ❌ NO | Campo `verificacion` + impacto variables | Baja |
| **LRC** | Line Check | Verificación | ❌ NO | Campo `verificacion` + impacto variables | Baja |
| **RM** | Reconocimiento Médico | Actividad médica | ❌ NO | Campo `actividadMedica` | Baja |
| **CAT** | CAT III Training | Formación | ❌ NO | Campo `formacion` + regla impacto HB | Baja |
| **BAJ** | Baja | Ausencia | ❌ NO | Campo `ausencia` + regla IT | Baja |
| **\*6xxx** | Posicionamiento | Posicionamiento | ❌ NO | Detección asterisco + NO suma HV | Media |

---

### Regla Roja Aplicada

❌ **NO tocar:**
- Calculadora existente
- Motores de HV, HB, productividad, IRPF
- Lógica de francos, imaginarias, vacaciones
- Backend de cálculo

✅ **SÍ desarrollar (futuro):**
- Parser Programación V1 (extractor)
- Normalizador de códigos
- Adaptador variables previstas → variables PilotPay
- Tabla ICAO de rutas (datos, no motor)

---

## 📊 ENTREGABLE 3 — Variables Previsionales

### Análisis de Generación Automática

| Variable PilotPay | ¿Puede Obtenerse? | Hipótesis | Datos Externos | Observaciones |
|-------------------|-------------------|-----------|----------------|---------------|
| **Días libres previstos** | ✅ SÍ | Ninguna | No | Conteo directo OFF |
| **Francos previstos** | ✅ SÍ | Ninguna | No | Conteo directo FR-/FR. |
| **Imaginarias previstas** | ✅ SÍ | Ninguna | No | Conteo directo SBY* |
| **Vacaciones previstas** | ✅ SÍ | Regla 6+3 | Convenio 2026 | Conteo directo VAC |
| **Formación prevista** | ✅ SÍ | Ninguna | No | Conteo ERF2/CRE2/etc |
| **Simulador previsto** | ✅ SÍ | Ninguna | No | Conteo SEN1 |
| **Verificación prevista** | ✅ SÍ | Ninguna | No | Conteo LPC/OPC/LRC |
| **Actividad médica prevista** | ✅ SÍ | Ninguna | No | Conteo RM |
| **Actividad no productiva** | ✅ SÍ | Ninguna | No | Suma formación + simulador + verificación |
| **HV previstas** | ⚠️ PARCIAL | Tabla ICAO | Tabla rutas | Requiere HB por vuelo |
| **HB previstas** | ⚠️ PARCIAL | HV + ratio | Tabla ICAO + convenio | HB = HV × ratio |
| **Posicionamientos** | ⚠️ PARCIAL | Detección \* | No | Detectar asterisco |

---

### Fiabilidad de Proyección

| Variable | Fiabilidad | Motivo |
|----------|------------|--------|
| **Días libres** | ALTA | Dato explícito en programación (OFF) |
| **Francos** | ALTA | Dato explícito en programación (FR) |
| **Imaginarias** | ALTA | Dato explícito en programación |
| **Vacaciones** | ALTA | Dato explícito en programación |
| **Formación** | ALTA | Dato explícito en programación |
| **Simulador** | ALTA | Dato explícito en programación |
| **HV** | MEDIA | Requiere tabla ICAO + hipótesis conservadora |
| **HB** | MEDIA | Depende de HV + aplicación ratio convenio |
| **Posicionamientos** | BAJA | Requiere detección patrón asterisco |

---

### Variables NO Proyectables

| Variable | Razón |
|----------|-------|
| **Regularizaciones** | Impredecibles |
| **Atrasos** | Impredecibles |
| **Bonus** | Discrecionales |
| **Horas extras** | No aparecen en programación inicial |
| **Cambios operativos** | Programación provisional, cambia frecuentemente |

---

## ✅ ENTREGABLE 4 — Conceptos Ya Soportados

### Fase 1 MVP (Sin Desarrollo de Motores)

| Concepto | Variable PilotPay | Motor | Desarrollo | Prioridad |
|----------|-------------------|-------|------------|-----------|
| **Día libre** (OFF) | `diaLibre` | ⚠️ REVISAR | Verificar campo existente | ALTA |
| **Franco** (FR-, FR.) | `franco` | ✅ Francos | ❌ NINGUNO | ALTA |
| **Imaginaria** (SBY) | `imaginaria` | ✅ Imaginarias | ❌ NINGUNO | ALTA |
| **Vuelo** (6xxx) | `horasVuelo` | ✅ HV + Productividad | Tabla ICAO (datos) | ALTA |

**Nota:** OFF y FR son conceptos distintos. OFF requiere validación de campo en calculadora.

---

### Fase 2 (Requiere Validación)

| Concepto | Variable PilotPay | Motor | Desarrollo | Prioridad |
|----------|-------------------|-------|------------|-----------|
| **Vacaciones** (VAC) | `vacaciones` | ✅ Vacaciones | Validar patrón 6+3 | MEDIA |

---

## 🔮 ENTREGABLE 5 — Conceptos Futuros

### Inventario de Actividades Sin Soporte

| Concepto | Frecuencia | Impacto Probable | Desarrollo Futuro |
|----------|------------|------------------|-------------------|
| **Formación** (ERF2, CRE2, EQE2, CAT) | 7 | Reduce HB, afecta productividad | Campo `formacion` + regla |
| **Simulador** (SEN1) | 1 | Reduce HB, afecta productividad | Campo `simulador` + regla |
| **Verificación** (LPC/OPC, LRC) | 2 | Impacto bajo variables | Campo `verificacion` |
| **Reconocimiento Médico** (RM) | 1 | Sin impacto económico directo | Campo `actividadMedica` |
| **Baja** (BAJ) | 1 | Requiere regla IT | Campo `ausencia` + motor IT |
| **Posicionamiento** (\*6xxx) | Frecuente | NO genera HV operadas | Detección asterisco |

---

### Priorización de Desarrollo Futuro

| Fase | Concepto | Justificación |
|------|----------|---------------|
| **Fase 1 (MVP)** | Francos, Imaginarias, Vuelos | Soporte existente, alta frecuencia |
| **Fase 2** | Vacaciones, Formación, Simulador | Alta frecuencia, impacto medio |
| **Fase 3** | Posicionamientos (\*vuelo) | Frecuente pero impacto complejo |
| **Fase 4** | Verificación, RM, Baja | Baja frecuencia, impacto bajo/específico |

---

## 📈 Estadísticas Generales

| Métrica | Valor |
|---------|-------|
| **Códigos validados** | 18 |
| **Códigos desconocidos** | 3 (VAL, GRX, MAD) |
| **Códigos con soporte existente** | 8 |
| **Códigos requieren desarrollo** | 10 |
| **Nivel confianza ALTO** | 13/18 (72%) |
| **Nivel confianza MEDIO** | 5/18 (28%) |

---

## 🎯 Conclusiones

### Principio Fundamental Confirmado

**La calculadora es la fuente de verdad.**

**La programación se adapta a ella.**

**Parser Programación V1 será un adaptador de datos, NO una nueva calculadora.**

---

### Conceptos Listos para Proyección Inmediata

**Sin tocar motores:**

1. **Días libres (OFF)** → `diaLibre` → Motor: ⚠️ Verificar existencia
2. **Francos (FR-, FR.)** → `franco` → Motor: ✅ Existente
3. **Imaginarias (SBY)** → `imaginaria` → Motor: ✅ Existente
4. **Vuelos (6xxx)** → `horasVuelo` → Motor: ✅ Existente (requiere tabla ICAO)

---

### Próximos Pasos

**NO implementar todavía:**
- Parser Programación V1
- Adaptador variables
- UI de proyección

**SÍ validar ahora:**
- Códigos desconocidos (VAL, GRX, MAD)
- Patrón vacaciones 6+3 en calculadora
- Reglas formación/simulador

---

**FIN DEL DICCIONARIO OPERATIVO V2**

**Enfoque corregido aplicado:** Mapeo a variables PilotPay, NO cálculo económico directo.

**Regla roja respetada:** NO tocar motores existentes.

**Visión validada:** Programación → Variables Previstas → Calculadora Existente → Proyección.
