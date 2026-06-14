# Proyección Operativa — Diseño Funcional Futuro

⚠️ **Estado:** Visión futura. NO implementado.

**Documento:** Detalle funcional de la línea estratégica de Proyección Operativa documentada en `CLAUDE.md` sección 12.

**Propósito:** Recopilar especificaciones, ejemplos, estructuras de datos y fases de implementación para cuando se apruebe el desarrollo de capacidades de proyección económica basada en programación operativa.

---

## 0. Aclaración Estratégica Fundamental

### El Flujo Actual de PilotPay

```
Programación Ejecutada (mes cerrado)
  ↓
Empresa extrae variables reales:
  - HV (horas de vuelo)
  - HB (horas baremo)
  - Dietas
  - Imaginarias
  - Francos
  - Otros conceptos
  ↓
PDF Variables (enviado a tripulación)
  ↓
PilotPay carga PDF Variables
  ↓
Calculadora PilotPay (motores existentes)
  ↓
Cálculo / Auditoría de Nómina
```

**Característica:** Las variables proceden de **actividad ya ejecutada** (mes cerrado).

---

### El Flujo Futuro de Proyección Operativa

```
Programación Inicial Futura (mes futuro)
  ↓
PilotPay extrae variables previstas:
  - HV previstas
  - HB previstas
  - Dietas previstas
  - Imaginarias previstas
  - Francos previstos
  - Vacaciones previstas
  - Actividades no vuelo previstas
  ↓
Calculadora PilotPay (MISMOS motores, SIN MODIFICAR)
  ↓
Proyección Económica
```

**Característica:** Las variables proceden de **actividad aún NO ejecutada** (mes futuro).

---

### Diferencia Fundamental

| Aspecto | Flujo Actual | Flujo Futuro |
|---------|--------------|--------------|
| **Origen dato** | Programación ejecutada | Programación inicial |
| **Estado dato** | EJECUTADO | PREVISTO |
| **Naturaleza** | Variables reales | Variables previstas |
| **Certeza** | Alta (actividad realizada) | Media (actividad programada, puede cambiar) |
| **Calculadora** | Motores existentes | **MISMOS motores (sin modificar)** |
| **Resultado** | Nómina real calculada | Proyección económica estimada |

---

### Principio Arquitectónico

**PilotPay hace con la programación inicial lo mismo que la empresa hace posteriormente con la programación ejecutada:**

> Extraer variables de actividad operativa para alimentar los motores de cálculo económico.

**La diferencia NO está en la calculadora.**

**La diferencia está en el origen y la naturaleza del dato.**

---

### Roles Claramente Definidos

**Parser Programación V1:**
- ✅ Extractor anticipado de variables
- ✅ Adaptador de datos operativos → variables PilotPay
- ❌ NO es una nueva calculadora
- ❌ NO es un motor económico paralelo
- ❌ NO duplica lógica de cálculo

**Calculadora PilotPay (existente):**
- ✅ Motor único de cálculo económico
- ✅ Acepta variables reales (flujo actual)
- ✅ Acepta variables previstas (flujo futuro)
- ✅ NO se modifica para proyección

---

### Tratamiento de Variables Previstas

**Campos de estado requeridos (futuros):**

```javascript
{
  // Variables extraídas
  horasVuelo: 68,
  imaginarias: 3,
  francos: 10,
  // ... resto de variables
  
  // Metadata de origen
  estado: "PREVISTO",  // vs "EJECUTADO"
  origen: "PROGRAMACION_INICIAL",  // vs "PDF_VARIABLES_EMPRESA"
  fechaExtraccion: "2026-06-10",
  programacionFecha: "2026-07-01",  // Mes al que corresponde
  
  // Advertencias
  provisional: true,
  puedeVariar: true
}
```

**Separación estricta:**

❌ **NO mezclar:**
- Variables ejecutadas (estado: EJECUTADO)
- Variables previstas (estado: PREVISTO)

✅ **SÍ distinguir:**
- Origen del dato
- Naturaleza del dato
- Certeza del dato

---

### Objetivo Final Validado

**Si la empresa extrae variables reales desde la programación ejecutada...**

**...PilotPay debe extraer variables previstas desde la programación inicial para anticipar una proyección económica razonable.**

**Usando exactamente los mismos motores de cálculo.**

**Sin duplicar lógica.**

**Sin modificar la calculadora.**

---

## 1. Ejemplos de Mensajes UX

### Mensajes Apropiados (Proyección, No Garantía)

✅ **"Con esta programación, cobrarías aproximadamente 5.200 € (±150 €)"**
- Rango explícito
- Palabra clave: "aproximadamente"
- Incertidumbre cuantificada

✅ **"Proyección basada en programación de hoy. Puede variar según cambios operativos."**
- Disclaimers claros
- Fecha de referencia
- Advertencia de volatilidad

✅ **"Estimación conservadora: 5.050 € — Estimación optimista: 5.350 €"**
- Rango de escenarios
- Transparencia de hipótesis
- Sin garantías absolutas

### Mensajes NO Apropiados (Garantía Falsa)

❌ **"Tu nómina será de 5.200 €"**
- Verbo futuro categórico
- Sin rangos
- Falsa precisión

❌ **"Cobrarás exactamente 5.200 €"**
- Palabra "exactamente" inapropiada
- Promesa imposible de cumplir
- Genera expectativas incorrectas

❌ **"Nómina confirmada: 5.200 €"**
- Palabra "confirmada" incorrecta
- Confunde proyección con realidad
- Puede generar reclamaciones legales

### Principios de UX Writing

1. **Siempre usar condicional o aproximación**
   - "cobrarías aproximadamente"
   - "resultado estimado"
   - "proyección conservadora"

2. **Incluir rangos de variabilidad**
   - (±150 €)
   - Escenario conservador vs optimista
   - Disclaimer de cambios operativos

3. **Fechar la proyección**
   - "Según programación de hoy"
   - "Basado en datos del 15/06/2026"
   - "Puede variar si cambia la programación"

4. **Evitar verbos categóricos**
   - NO: "será", "cobrarás", "tendrás"
   - SÍ: "cobrarías", "se estima", "resultado aproximado"

---

## 2. Actividades Operativas e Impacto Económico

### Tabla Completa de Actividades

| Actividad | Impacto en Retribución | Variables Afectadas | Fiabilidad Proyección |
|-----------|------------------------|---------------------|------------------------|
| **Vuelos comerciales** | Horas de vuelo, horas baremo, productividad | HV, DPO, dietas, productividad | Alta |
| **Simuladores** | Reducen horas de vuelo, afectan productividad | HV (negativo), productividad | Media |
| **Cursos (CRM, RM)** | Sin horas de vuelo, retribución específica | Salario base únicamente | Alta |
| **Vacaciones** | Sin horas de vuelo, retribución según convenio | Salario base, plus transporte | Alta |
| **IT (Incapacidad Temporal)** | Sin horas de vuelo, retribución según normativa | Salario base (proporcional días) | Media |
| **Reservas (imaginarias)** | Imaginarias, retribución específica | Imaginarias, productividad | Alta |
| **Oficina** | Sin horas de vuelo, retribución base | Salario base únicamente | Alta |
| **Posicionamientos** | Sin horas de vuelo productivas, dietas posibles | Dietas (según destino) | Media |
| **Francos** | Sin actividad, sin retribución adicional | Ninguna | Alta |
| **Entrenamiento en línea** | Horas de vuelo (no comerciales), productividad | HV, productividad | Media-Baja |
| **Evaluaciones técnicas** | Sin horas de vuelo, retribución específica | Variable según tipo evaluación | Baja |

### Conceptos Económicos Afectados por Actividad

**Horas de vuelo:**
- Afectadas por: vuelos comerciales, entrenamiento en línea
- NO afectadas por: simuladores, cursos, vacaciones, IT, reservas, oficina

**Horas baremo (productividad):**
- Calculadas desde: horas de vuelo + ratio convenio
- Afectadas indirectamente por cualquier actividad que reduzca/aumente HV

**Variables mensuales:**
- **DPO:** Depende de pernoctas (vuelos específicos)
- **Dietas exentas:** Depende de rutas internacionales y duración
- **Complemento MAD:** Si base MAD y actividad cumple condiciones

**Salario bruto:**
- Fijo: Salario base + Plus transporte (independiente de actividad)
- Variable: HV + DPO + Dietas + Productividad

**Líquido estimado:**
- Bruto - SS - IRPF
- Requiere IRPF estimado del usuario (puede variar vs real)

---

## 3. Casos de Uso: Preguntas que PilotPay Responderá

### Categoría 1: Análisis de Variaciones

**Pregunta:** ¿Por qué este mes he cobrado menos que mi media?

**Respuesta futura:**
```
Análisis de variación: -320 € vs media anual

Causas detectadas:
1. Horas de vuelo: 65h vs 72h media (-7h) → -280 €
2. DPO: 2 pernoctas vs 3 media (-1) → -40 €
3. Productividad: afectada por simulador (día 15)

Actividades atípicas este mes:
- Simulador recurrente (día 15) → sin horas de vuelo ese día
- Vacaciones (días 20-24) → 5 días sin actividad productiva
```

**Pregunta:** ¿Qué impacto tuvo el simulador en mi nómina?

**Respuesta futura:**
```
Impacto simulador recurrente (día 15):

Directo:
- Horas de vuelo perdidas: ~8h (estimado según patrón habitual)
- Valor económico: ~-120 € (15€/h × 8h)

Indirecto:
- Productividad mensual afectada (menos horas baremo)
- Estimado: ~-30 € adicionales

Total estimado: -150 € por día de simulador
```

**Pregunta:** ¿Cómo afectaron las vacaciones a mis variables?

**Respuesta futura:**
```
Impacto vacaciones (5 días):

Horas de vuelo NO realizadas: ~20h (estimado según patrón)
DPO NO generado: ~2 pernoctas perdidas
Dietas NO cobradas: ~80 € (estimado según rutas habituales)

Retribución mantenida:
- Salario base: proporcional garantizado
- Plus transporte: proporcional garantizado

Impacto neto estimado: -400 € (variables perdidas)
```

---

### Categoría 2: Proyecciones Operativas

**Pregunta:** Con esta programación, ¿cuánto cobraré aproximadamente?

**Respuesta futura:**
```
Proyección económica (según programación del 10/06/2026):

Horas de vuelo programadas: 68h
DPO estimado: 3 pernoctas
Dietas estimadas: 120 € (rutas interislas)
Productividad estimada: según acuerdo vigente

Resultado estimado:
- Escenario conservador: 5.050 €
- Escenario central: 5.200 €
- Escenario optimista: 5.350 €

⚠️ Esta proyección puede variar si cambia la programación operativa.
```

**Pregunta:** ¿Qué pasa si me asignan 10 horas más de vuelo?

**Respuesta futura:**
```
Simulación: +10 horas de vuelo

Impacto estimado:
- Horas de vuelo: 68h → 78h (+10h)
- Valor directo: +150 € (15€/h × 10h)
- Productividad adicional: +50 € (estimado)
- DPO potencial: +1 pernocta → +40 €

Total estimado: +240 €
Resultado proyectado: 5.440 € (escenario central)
```

**Pregunta:** ¿Cómo afecta un día de IT a mi retribución?

**Respuesta futura:**
```
Impacto IT (Incapacidad Temporal):

Primer día:
- Sin retribución empresa (según convenio)

Días 2-3:
- Retribución empresa: 60% base reguladora

Día 4 en adelante:
- Retribución SS: 60% base reguladora (días 4-20)
- Retribución SS: 75% base reguladora (día 21+)

Estimación para 1 mes completo IT:
- Retribución estimada: 60-75% de tu salario habitual
- Resultado estimado: 3.120-3.900 € (vs 5.200 € habitual)
```

---

### Categoría 3: Análisis Históricos

**Pregunta:** ¿Cuál es mi media mensual en meses con simulador?

**Respuesta futura:**
```
Análisis histórico: meses con simulador

Meses analizados: 8 (últimos 12 meses)
Media con simulador: 4.950 €
Media sin simulador: 5.280 €

Diferencia media: -330 €

Interpretación:
Los meses con simulador recurrente tienen ~6% menos retribución debido a:
- Menos horas de vuelo ese día (~8h perdidas)
- Impacto en productividad mensual
```

**Pregunta:** ¿Qué impacto tienen los recurrentes en mi productividad?

**Respuesta futura:**
```
Análisis productividad: impacto recurrentes

Histórico último año:
- Meses sin recurrente: 72h media → productividad X
- Meses con recurrente: 65h media → productividad Y

Impacto productividad:
- Reducción horas baremo: ~10%
- Impacto económico productividad: ~-80 €

Nota: El simulador NO suma horas productivas según acuerdo vigente.
```

**Pregunta:** ¿Cómo varían mis ingresos según la base de operación?

**Respuesta futura:**
```
Análisis por base de operación:

Base TFN (Tenerife Norte):
- Media mensual: 5.150 €
- DPO medio: 2.5 pernoctas
- Complemento MAD: NO aplicable

Base LPA (Gran Canaria):
- Media mensual: 5.200 €
- DPO medio: 3 pernoctas
- Complemento MAD: NO aplicable

Base MAD (Madrid):
- Media mensual: 5.450 €
- DPO medio: 3.5 pernoctas
- Complemento MAD: +180 € (SÍ aplicable)

Diferencia TFN vs MAD: +300 € media mensual
```

---

### Categoría 4: Comparativas Operativas

**Pregunta:** ¿Cómo compara mi actividad con mi patrón habitual?

**Respuesta futura:**
```
Comparativa mes actual vs patrón habitual:

Horas de vuelo:
- Este mes: 68h
- Tu media: 72h
- Diferencia: -4h (-6%)

Pernoctas:
- Este mes: 3 DPO
- Tu media: 3 DPO
- Diferencia: 0 (igual)

Días de actividad:
- Este mes: 18 días
- Tu media: 19 días
- Diferencia: -1 día

Interpretación: Mes ligeramente por debajo de tu patrón habitual.
```

**Pregunta:** ¿Estoy volando más o menos que mi media anual?

**Respuesta futura:**
```
Tendencia anual de horas de vuelo:

Ene: 70h | Feb: 68h | Mar: 75h | Abr: 72h | May: 65h | Jun: 68h (actual)

Media móvil 6 meses: 69.7h
Media anual proyectada: 70h

Tendencia: Estable (±3% variación mensual)
Mes actual: Ligeramente por debajo de media (-2h)
```

**Pregunta:** ¿Qué meses fueron económicamente mejores y por qué?

**Respuesta futura:**
```
Ranking meses últimos 12:

1. Marzo 2026: 5.680 € → 78h de vuelo, 4 DPO, alta productividad
2. Octubre 2025: 5.520 € → 75h de vuelo, 3 DPO
3. Enero 2026: 5.380 € → 72h de vuelo, 3 DPO

Peores meses:
1. Agosto 2025: 4.200 € → Vacaciones (15 días)
2. Diciembre 2025: 4.850 € → Simulador + cursos (menos actividad productiva)

Factores de meses mejores:
- Horas de vuelo altas (>75h)
- DPO elevado (3-4 pernoctas)
- Sin actividades no productivas (simuladores, cursos)
```

---

## 4. Formatos de Datos Soportados

### Tabla Completa de Formatos

| Formato | Extensión | Prioridad | Complejidad Extracción | Notas |
|---------|-----------|-----------|------------------------|-------|
| **HTML** | `.html`, `.htm` | **Alta** | Media | eCrew, sistemas web, estructura semántica |
| **PDF** | `.pdf` | **Alta** | Alta | Exportaciones comunes, requiere PDF.js |
| **Excel** | `.xls`, `.xlsx` | **Media** | Media | Hojas de cálculo, estructura tabular |
| **Word** | `.docx` | **Baja** | Media | Menos común, formato XML subyacente |
| **RTF** | `.rtf` | **Baja** | Baja | Texto enriquecido, rara vez usado |
| **MHT** | `.mht`, `.mhtml` | **Baja** | Media | HTML archivado, menos común |
| **Imagen + OCR** | `.png`, `.jpg`, `.pdf` | **Muy baja** | Muy alta | Último recurso, precisión limitada |

### Priorización de Desarrollo

**Fase 1 (MVP):**
- HTML (eCrew específicamente)
- PDF (exportaciones comunes)

**Fase 2 (Expansión):**
- Excel (XLS/XLSX)

**Fase 3 (Completitud):**
- DOCX, RTF, MHT

**Fase 4 (Último recurso):**
- OCR de imágenes (solo si otros formatos no disponibles)

### Consideraciones Técnicas por Formato

**HTML:**
- Ventaja: Estructura semántica (tablas, clases CSS)
- Desafío: Múltiples sistemas generan HTML distinto
- Estrategia: Detectores específicos por sistema (eCrew, Jeppesen, etc.)

**PDF:**
- Ventaja: Formato común de exportación
- Desafío: Sin estructura semántica (texto plano extraído)
- Estrategia: Parsing por patrones de texto + posicionamiento

**Excel:**
- Ventaja: Estructura tabular clara
- Desafío: Variabilidad de formatos (hojas, columnas)
- Estrategia: Detección de cabeceras + mapeo de columnas

**OCR:**
- Ventaja: Universal (cualquier imagen)
- Desafío: Precisión limitada, errores de reconocimiento
- Estrategia: Solo como último recurso + validación exhaustiva

---

## 5. Conceptos Económicos Proyectables

### Nivel 1: Alta Fiabilidad (Proyección Directa)

**Conceptos proyectables con alta precisión:**

✅ **Horas de vuelo estimadas**
- Condición: Programación incluye vuelos con horarios
- Cálculo: Suma de horas de vuelo programadas
- Precisión: Alta (±5% variación por cambios operativos)

✅ **Horas bloque estimadas**
- Condición: Existe tabla ICAO de rutas con horas bloque
- Cálculo: Lookup tabla rutas por vuelo programado
- Precisión: Alta (datos ICAO estables)

✅ **Imaginarias**
- Condición: Programación marca días de reserva
- Cálculo: Conteo de días marcados como "reserva" o "standby"
- Precisión: Alta (información explícita en programación)

✅ **Francos**
- Condición: Programación marca días libres
- Cálculo: Conteo de días sin actividad
- Precisión: Alta (información explícita)

✅ **Salario base**
- Condición: Ninguna (concepto fijo)
- Cálculo: Tabla salarial según nivel/antigüedad
- Precisión: Absoluta (dato contractual)

✅ **Plus transporte**
- Condición: Ninguna (concepto fijo)
- Cálculo: Importe fijo según convenio
- Precisión: Absoluta (dato contractual)

---

### Nivel 2: Fiabilidad Media (Estimación Conservadora)

**Conceptos estimables con hipótesis razonables:**

⚠️ **DPO (Dietas de Pernocta)**
- Condición: Programación incluye destinos + horarios
- Cálculo: Identificar vuelos que generan pernocta (salida tarde + regreso mañana siguiente)
- Hipótesis: Patrón de rutas DPO basado en histórico
- Precisión: Media (±20% variación según cambios de tripulación)

⚠️ **Dietas exentas**
- Condición: Programación incluye rutas internacionales
- Cálculo: Tabla de dietas por destino + duración estimada
- Hipótesis: Duración estancia según horarios programados
- Precisión: Media (varía según retrasos, cancelaciones)

⚠️ **Productividad**
- Condición: Acuerdo de productividad vigente conocido
- Cálculo: Aplicar fórmula acuerdo sobre horas baremo estimadas
- Hipótesis: Cumplimiento de mínimos/máximos mensuales
- Precisión: Media-Alta (depende de precisión horas de vuelo)

⚠️ **Complemento MAD**
- Condición: Base operativa Madrid + cumplimiento condiciones
- Cálculo: Importe fijo si cumple requisitos
- Hipótesis: Usuario mantiene base MAD durante el mes
- Precisión: Alta (si condiciones estables)

---

### Nivel 3: NO Proyectable (Datos Reales Requeridos)

**Conceptos que NO deben proyectarse sin datos reales:**

❌ **Regularizaciones**
- Razón: Impredecibles, dependen de ajustes empresa
- Tratamiento: Ignorar en proyección (valor = 0)

❌ **Atrasos**
- Razón: Impredecibles, dependen de ajustes históricos
- Tratamiento: Ignorar en proyección (valor = 0)

❌ **Bonus excepcionales**
- Razón: Impredecibles, discrecionales
- Tratamiento: Ignorar en proyección (valor = 0)

❌ **Horas extras no programadas**
- Razón: No aparecen en programación inicial
- Tratamiento: Ignorar (solo proyectar horas programadas)

❌ **Incentivos puntuales**
- Razón: Discrecionales, no contractuales
- Tratamiento: Ignorar en proyección (valor = 0)

---

### Fórmulas de Proyección Conservadora

**Principio:** Siempre proyectar por lo bajo (conservador) para evitar falsas expectativas.

**Horas de vuelo proyectadas:**
```
HV_proyectadas = Σ (horas_vuelo_programado) × 0.95
```
Factor 0.95 = -5% conservador (cancelaciones, cambios)

**DPO proyectado:**
```
DPO_proyectado = COUNT(vuelos_con_pernocta_probable) × 0.90
```
Factor 0.90 = -10% conservador (cambios de tripulación)

**Productividad proyectada:**
```
Productividad = aplicar_acuerdo(HV_proyectadas × ratio_baremo)
```
Usar HV conservadoras (ya ajustadas -5%)

**Bruto estimado:**
```
Bruto_estimado_conservador = 
  Salario_base + 
  Plus_transporte + 
  (HV_proyectadas × tarifa_hora) + 
  (DPO_proyectado × tarifa_pernocta) + 
  Productividad_proyectada

Bruto_estimado_optimista = Bruto_conservador × 1.10
```

Rango final: `[Conservador, Optimista]`

---

## 6. Estructura de Datos: Tabla Rutas ICAO

### Nodo Firebase

**Path:** `pilotpay/rutas/{key}`

**Estado:** Nodo creado, reglas de seguridad definidas, NO activo en app

### Estructura JSON Propuesta

```javascript
{
  // Identificador único
  "id": "NT450_TFN_LPA",
  
  // Datos operativos
  "vuelo": "NT450",
  "origen": "TFN",          // ICAO code
  "destino": "LPA",         // ICAO code
  "aerolinea": "NT",        // IATA airline code
  
  // Datos económicos (críticos para proyección)
  "hb": 0.75,               // Horas bloque (decimal)
  
  // Datos opcionales (futuros)
  "distancia": 115,         // NM (millas náuticas)
  "tipoAeronave": "ATR72",  // Tipo aeronave habitual
  "categoria": "interislas", // Categoría ruta
  
  // Metadata
  "actualizado": "2026-06-01",  // Fecha última actualización
  "fuente": "tabla_oficial_binter"
}
```

### Ejemplos de Rutas

**Interislas (Canarias):**
```javascript
{
  "id": "NT450_TFN_LPA",
  "vuelo": "NT450",
  "origen": "TFN",
  "destino": "LPA",
  "hb": 0.75,
  "distancia": 115,
  "tipoAeronave": "ATR72",
  "categoria": "interislas"
}
```

**Peninsular:**
```javascript
{
  "id": "NT900_TFN_MAD",
  "vuelo": "NT900",
  "origen": "TFN",
  "destino": "MAD",
  "hb": 2.50,
  "distancia": 1050,
  "tipoAeronave": "A320",
  "categoria": "peninsular"
}
```

**Internacional:**
```javascript
{
  "id": "NT8001_MAD_LIS",
  "vuelo": "NT8001",
  "origen": "MAD",
  "destino": "LIS",
  "hb": 1.25,
  "distancia": 305,
  "tipoAeronave": "E195",
  "categoria": "internacional"
}
```

### Reglas de Seguridad Firebase

**Definidas en:** `firebase-database.rules.json` líneas 119-128

```json
"rutas": {
  ".read":  "auth != null",
  ".write": "auth != null",
  "$key": {
    ".validate": "!newData.exists() || (newData.hasChildren(['vuelo', 'origen', 'destino', 'hb']) && newData.child('hb').isNumber())"
  }
}
```

**Restricciones:**
- READ: Cualquier usuario autenticado
- WRITE: Cualquier usuario autenticado (enforced en cliente: solo admin)
- VALIDACIÓN: Campos mínimos `vuelo`, `origen`, `destino`, `hb` (número)

### Uso Futuro en Proyección

**Flujo:**

```
Programación incluye vuelo "NT450"
  ↓
Lookup en tabla rutas: pilotpay/rutas/NT450_TFN_LPA
  ↓
Obtener hb = 0.75
  ↓
Acumular horas bloque del día/mes
  ↓
Aplicar en cálculo de productividad
```

**Fallback si ruta no existe:**
- Usar estimación conservadora genérica (ej: 1.0h para interislas, 2.5h para peninsular)
- Marcar como "estimación sin datos ICAO" (lower confidence)

---

## 7. Fases de Implementación — Alcance Detallado

### Fase A: Parser Programación V1

**Objetivo:** Extraer programación mensual y normalizarla sin cálculo económico.

**Alcance funcional:**

1. **Lectura de archivos**
   - Soportar HTML (prioridad alta)
   - Soportar PDF (prioridad alta)
   - Estructura modular para añadir formatos futuros

2. **Extracción de datos**
   - Identificar tabla/estructura de programación
   - Extraer actividades día por día
   - Detectar tipo de actividad (vuelo, reserva, franco, curso, etc.)
   - Extraer horarios (inicio/fin)
   - Extraer códigos de vuelo (si aplicable)
   - Extraer origen/destino (si aplicable)

3. **Normalización**
   - Convertir a estructura canónica `ProgramacionParseResult`
   - Clasificar actividades por tipo
   - Validar fechas/horarios
   - Detectar inconsistencias

4. **Persistencia**
   - Guardar programación completa en localStorage
   - Guardar en IndexedDB (write-through)
   - Sincronizar a Firebase (si P4 activo)

5. **Confidence scoring**
   - Asignar confidence por campo extraído
   - Confidence global de la programación
   - Reportar warnings/errores

**NO incluye:**
- ❌ Cálculo económico
- ❌ Proyección de nómina
- ❌ Integración con motor de cálculo
- ❌ Dashboard de resultados

**Entregables:**
- Parser HTML/PDF de programación
- Estructura `ProgramacionParseResult` definida
- Persistencia en localStorage/IDB/Firebase
- Confidence scoring

**Tiempo estimado:** 4-6 semanas desarrollo + 2 semanas testing

---

### Fase B: Motor de Proyección Económica

**Objetivo:** Calcular impacto económico estimado desde programación normalizada.

**Prerequisito:** Fase A completada y validada

**Alcance funcional:**

1. **Integración con motor de cálculo**
   - Usar motor de nómina existente
   - Adaptar inputs desde programación
   - Calcular variables estimadas

2. **Estimación de horas de vuelo**
   - Sumar horas de vuelos programados
   - Aplicar factor conservador (-5%)
   - Detectar actividades que NO suman HV (simulador, curso, etc.)

3. **Estimación de horas bloque**
   - Lookup tabla ICAO desde Firebase (`pilotpay/rutas`)
   - Calcular horas bloque totales
   - Fallback a estimación genérica si ruta no existe

4. **Cálculo de DPO estimado**
   - Identificar vuelos con pernocta probable
   - Aplicar factor conservador (-10%)
   - Validar contra patrones históricos

5. **Proyección de productividad**
   - Aplicar acuerdo de productividad vigente
   - Usar horas baremo estimadas
   - Calcular productividad estimada

6. **Generación de bruto estimado**
   - Salario base (fijo)
   - Plus transporte (fijo)
   - HV estimadas × tarifa
   - DPO estimado × tarifa
   - Productividad estimada
   - Complemento MAD (si aplicable)

7. **Rangos de proyección**
   - Escenario conservador (factores -5% / -10%)
   - Escenario central (factores nominales)
   - Escenario optimista (+10%)

8. **Líquido estimado**
   - Calcular SS estimada
   - Aplicar IRPF del perfil usuario
   - Generar líquido neto estimado ± rango

**NO incluye:**
- ❌ Análisis de variaciones (requiere histórico)
- ❌ Comparativas vs realidad (requiere nóminas reales)
- ❌ Dashboard completo

**Entregables:**
- Motor de proyección económica
- Estructura `ProyeccionEconomica` con rangos
- Integración con tabla ICAO
- API interna para consultar proyección

**Tiempo estimado:** 6-8 semanas desarrollo + 3 semanas testing

---

### Fase C: Análisis de Variaciones Operativas

**Objetivo:** Comparar programación vs realidad ejecutada y explicar variaciones.

**Prerequisito:** Fase A + B completadas, histórico de programaciones + nóminas reales

**Alcance funcional:**

1. **Comparación programado vs ejecutado**
   - Leer programación guardada del mes
   - Leer nómina real auditada del mes
   - Comparar concepto por concepto
   - Identificar variaciones

2. **Identificación de causas**
   - HV programadas vs HV reales
   - DPO estimado vs DPO real
   - Productividad estimada vs real
   - Clasificar causas (cambios operativos, cancelaciones, extras)

3. **Explicación de variaciones**
   - Generar texto explicativo:
     - "Volaste 5h más de lo programado → +75 €"
     - "2 vuelos cancelados → -30 € (DPO no realizado)"
   - Cuantificar impacto por causa

4. **Dashboard de impacto operativo**
   - Gráfico: programado vs real
   - Desglose de variaciones
   - Explicaciones en lenguaje natural

5. **Análisis histórico de patrones**
   - Comparar múltiples meses
   - Identificar patrones (ej: "meses con simulador -6% media")
   - Sugerir ajustes a estimaciones futuras

**NO incluye:**
- ❌ Predicción de cambios operativos futuros
- ❌ Machine learning / IA predictiva

**Entregables:**
- Comparador programado vs ejecutado
- Explicador de variaciones en lenguaje natural
- Dashboard de análisis de variaciones
- Histórico de precisión de proyecciones

**Tiempo estimado:** 8-10 semanas desarrollo + 4 semanas testing

---

### Consideraciones de Implementación

**Orden obligatorio:** A → B → C (cada fase requiere la anterior)

**Validación entre fases:**
- Fase A: Validar extracción con 10+ programaciones reales
- Fase B: Validar proyecciones vs 6+ nóminas reales (±10% precisión)
- Fase C: Validar explicaciones con usuarios beta (comprensibilidad)

**Dependencias técnicas:**
- Tabla ICAO (`pilotpay/rutas`) debe poblarse antes de Fase B
- Histórico de programaciones debe acumularse durante Fase A para usar en Fase C

**Riesgos:**
- Variabilidad de formatos de programación entre sistemas
- Cambios operativos frecuentes invalidan proyecciones
- Expectativas de usuario de precisión absoluta (gestión UX crítica)

---

## 8. Arquitectura Técnica

⏳ **Pendiente de diseño cuando se apruebe desarrollo.**

**Áreas a diseñar:**

- Estructura de datos `ProgramacionParseResult`
- Estructura de datos `ProgramacionDay`
- Estructura de datos `ProgramacionActivity`
- Estructura de datos `ProyeccionEconomica`
- API interna de proyección
- Integración con motor de cálculo existente
- Persistencia en localStorage/IDB/Firebase
- Sincronización multi-device (P4)
- Confidence scoring detallado
- Trazabilidad de cálculos proyectados

**Filosofía arquitectónica:**

Aplicar los mismos principios que Parser Nómina V2:
1. Extracción exhaustiva
2. Normalización temprana
3. Clasificación rigurosa
4. Persistencia completa
5. Interpretación progresiva

---

**FIN DEL DOCUMENTO**

**Última actualización:** 2026-06-09  
**Estado:** Visión futura documentada. NO implementado.  
**Mantenedor:** Ver CLAUDE.md sección 12 para visión estratégica ejecutiva.
