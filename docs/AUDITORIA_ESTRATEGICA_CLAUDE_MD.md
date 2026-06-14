# Auditoría Estratégica CLAUDE.MD — Alineación Filosófica

**Fecha:** 10/06/2026  
**Objetivo:** Alinear completamente CLAUDE.md con la visión real descubierta durante el diseño de Programación Operativa.

---

## ✅ MODIFICACIONES APLICADAS

### 1. Corrección Terminología — "Motor de Proyección"

**Ubicación:** Sección 12.7 — Fases Futuras

**ANTES (INCORRECTO):**
```
Fase B: Motor de Proyección Económica — Cálculo de impacto retributivo estimado
```

**AHORA (CORRECTO):**
```
Fase B: Generador de Variables Previstas — Transformación de programación en variables compatibles con calculadora existente
```

**Razón de cambio:**

❌ "Motor de Proyección" sugiere motor económico paralelo  
✅ "Generador de Variables" respeta el Modelo Unificado de Variables

**Alineación con:**
- Sección 1.1 — Modelo Unificado de Variables
- Decisión estratégica: UNA sola calculadora, múltiples orígenes

---

### 2. Refuerzo Principio de Conocimiento Persistente

**Ubicación:** Sección 1.1 — Principio de Conocimiento Persistente

**TEXTO AÑADIDO:**

```markdown
**Consecuencias prácticas:**

**Parser de Nóminas:**
- ✅ Extrae IRPF %, SS %, coste empresa, acumulados, tablaConceptos completa
- ✅ Persiste nominaV2 completa (no solo campos usados hoy)
- ✅ Habilita: IRPF AUTO-DETECT, análisis histórico futuro, inteligencia fiscal

**Parser de Programaciones (futuro):**
- ✅ Debe interpretar y almacenar **todo** lo relevante que pueda identificar
- ✅ NO limitarse solo a: HV, HB, Imaginarias, Francos, Dietas
- ✅ Debe capturar: formación, simuladores, verificaciones, actividad completa
- ✅ Aunque inicialmente la proyección solo use una parte

**Regla de oro del almacenamiento:**

> **PilotPay almacena toda la información relevante que sea capaz de interpretar.**
> 
> NO almacena únicamente la información que necesita hoy.
```

**Ejemplo añadido:**

```
Parser Programación V1 detecta:
  - Vuelos (6xxx) → Genera HV previstas ✅
  - Formación (ERF2, CRE2) → Almacena pero NO usa todavía ✅
  - Simuladores (SEN1) → Almacena pero NO usa todavía ✅
  - Verificaciones (LPC/OPC) → Almacena pero NO usa todavía ✅

Futuro (Fase 2):
  - Formación almacenada → Habilita análisis impacto en HB
  - Simuladores almacenados → Habilita proyección más precisa
  - Verificaciones almacenadas → Habilita análisis de variaciones
```

**Protección añadida:**

✅ Protege contra implementaciones que solo almacenen lo necesario hoy  
✅ Justifica la extracción exhaustiva de Parser Programación V1  
✅ Habilita futuras funcionalidades sin romper schema

---

### 3. Nueva Subsección — Precisión vs Cobertura

**Ubicación:** Sección 1.1 — Estado Documental y Cobertura de Conocimiento

**SUBSECCIÓN NUEVA:**

```markdown
#### Precisión de Cálculo vs Cobertura Documental

**PilotPay NO mejora únicamente porque sus motores sean mejores.**

**También mejora porque conoce mejor la realidad documental del usuario.**
```

**Tabla de distinción:**

| Concepto | Definición | Responsable |
|----------|------------|-------------|
| **Precisión de Cálculo** | Exactitud de motores | Desarrollo PilotPay |
| **Cobertura Documental** | Cantidad/calidad documentación histórica | Usuario |

**Ejemplo comparativo:**

```
Usuario A:
  - 18 meses programaciones + variables + nóminas
  - Cobertura: ALTA

Usuario B:
  - 1 nómina + 1 PDF variables
  - Cobertura: BAJA

Motores PilotPay: IDÉNTICOS
Cobertura documental: DIFERENTE

Consecuencia:
  Usuario A → Más contexto, mejores tendencias, proyecciones fiables
  Usuario B → Solo cálculo puntual, sin histórico
```

**Principio documentado:**

> La cobertura documental NO representa precisión matemática.  
> Representa cantidad y calidad del conocimiento disponible.

**Capacidades de PilotPay añadidas:**

PilotPay debe ser capaz de valorar internamente:
- ✅ Qué documentación posee
- ✅ Qué documentación falta
- ✅ Qué contexto histórico tiene disponible
- ✅ Qué grado de conocimiento acumulado posee

---

### 4. Nueva Sección — Visión UX a Largo Plazo

**Ubicación:** Sección 1.1 — Después de "Frase de Referencia del Proyecto"

**SECCIÓN COMPLETA AÑADIDA:**

```markdown
### Visión UX a Largo Plazo

#### Modelo de Interacción Documental

La interacción principal con PilotPay debe tender progresivamente hacia un **modelo documental**.
```

**Paradigma UX documentado:**

**Usuario NO debería:**
- ❌ Elegir módulos
- ❌ Elegir procesos
- ❌ Decidir flujos internos
- ❌ Configurar opciones de interpretación

**Usuario debería:**
- ✅ Aportar documentos

**PilotPay debe:**
- ✅ Identificar automáticamente tipo de documento
- ✅ Interpretar contenido
- ✅ Decidir flujo adecuado
- ✅ Generar resultado correspondiente

**Visión ideal documentada:**

```
Usuario arrastra documento
  ↓
PilotPay identifica automáticamente:
  - Nómina → Extrae nominaV2 → Habilita auditoría
  - Variables → Genera expediente mensual
  - Programación futura → Genera proyección económica
  - Programación ejecutada → Rechaza (periodo no válido)
  - Convenio → Indexa en Biblioteca Normativa
```

**Principio de Complejidad Interna:**

> La complejidad debe crecer internamente. Nunca externamente.

**Evolución correcta vs incorrecta documentada:**

```
✅ Correcto:
  V1.0: Interpreta nóminas
  V2.0: Interpreta nóminas + variables
  V3.0: Interpreta nóminas + variables + programaciones
  Usuario sigue: "Arrastro documento"

❌ Incorrecto:
  V1.0: Módulo Nóminas
  V2.0: Módulo Nóminas + Módulo Variables
  V3.0: Módulo Nóminas + Módulo Variables + Módulo Programaciones
  Usuario debe: Elegir módulo cada vez
```

**Objetivo UX documentado:**

```
Superficie de interacción ideal:
  1. Arrastrar documento
  2. Ver resultado
  3. (Opcional) Ajustar si necesario

TODO lo demás automático:
  - Detección de tipo
  - Selección de flujo
  - Aplicación de reglas
  - Persistencia de datos
  - Generación de resultados
```

**Consecuencias de diseño añadidas:**

Para cualquier nueva funcionalidad, preguntar:
1. ¿Requiere elegir módulo? → ❌ Rediseñar
2. ¿Requiere configurar opciones? → ⚠️ Justificar
3. ¿PilotPay puede decidirlo automáticamente? → ✅ Preferido

---

## 🔍 AUDITORÍA DE COHERENCIA

### Áreas Revisadas

| Área | Estado | Coherencia |
|------|--------|------------|
| **Filosofía del Producto** | ✅ Actualizada | ✅ Coherente |
| **Modelo Unificado Variables** | ✅ Validada | ✅ Coherente |
| **Principio Conocimiento Persistente** | ✅ Reforzada | ✅ Coherente |
| **Estado Documental** | ✅ Ampliada | ✅ Coherente |
| **Programación Operativa** | ✅ Corregida | ✅ Coherente |
| **Roadmap Futuro** | ✅ Alineado | ✅ Coherente |
| **Visión UX** | ✅ Documentada | ✅ Coherente |

---

### Contradicciones Eliminadas

**ANTES:**

1. ❌ "Motor de Proyección Económica" (sugería motor paralelo)
2. ⚠️ Faltaba distinción Precisión vs Cobertura
3. ⚠️ Faltaba protección explícita almacenamiento exhaustivo
4. ⚠️ Visión UX implícita, no documentada

**AHORA:**

1. ✅ "Generador de Variables Previstas" (respeta modelo unificado)
2. ✅ Distinción explícita y detallada
3. ✅ Regla de oro del almacenamiento documentada
4. ✅ Visión UX completa y con ejemplos

---

### Coherencia Verificada

#### Flujo Conceptual

```
Filosofía del Producto (1.1)
  ↓
"Usuario aporta documentos, PilotPay se encarga"
  ↓
Principio de Conocimiento Persistente
  ↓
"Almacenar todo lo relevante, no solo lo necesario hoy"
  ↓
Estado Documental y Cobertura
  ↓
"Calidad = Motores + Documentación histórica"
  ↓
Visión UX a Largo Plazo
  ↓
"Modelo documental: arrastra → resultado automático"
  ↓
Programación Operativa (12.2)
  ↓
"Nuevo origen de variables, NO motor paralelo"
  ↓
Roadmap Futuro (12.7)
  ↓
"Generador de Variables Previstas"
```

**Coherencia:** ✅ **100%**

Todas las secciones refuerzan el mismo modelo conceptual.

---

#### Principios Alineados

| Principio | Sección | Estado |
|-----------|---------|--------|
| **Regla de Oro** | 1.1 | ✅ Documentado |
| **Modelo Unificado Variables** | 1.1 | ✅ Documentado |
| **Conocimiento Persistente** | 1.1 | ✅ Reforzado |
| **Precisión vs Cobertura** | 1.1 | ✅ Añadido |
| **Visión UX Documental** | 1.1 | ✅ Añadido |
| **Programación = Origen Variables** | 12.2 | ✅ Documentado |
| **NO Motor Paralelo** | 12.7 | ✅ Corregido |

---

## 📊 RESUMEN DE CAMBIOS

### Archivos Modificados

- `CLAUDE.md` (raíz)
- `docs/CLAUDE.md` (sincronizado)

### Secciones Modificadas

| # | Sección | Tipo Cambio | Líneas |
|---|---------|-------------|--------|
| 1 | 1.1 — Principio Conocimiento Persistente | Refuerzo | +35 |
| 2 | 1.1 — Estado Documental | Nueva subsección | +60 |
| 3 | 1.1 — Visión UX | Nueva sección | +120 |
| 4 | 12.7 — Fases Futuras | Corrección terminología | 1 |

**Total añadido:** ~215 líneas de documentación estratégica

---

## ✅ CORRECCIONES ADICIONALES PROPUESTAS

### Ninguna Detectada

Tras la auditoría exhaustiva, **NO se detectan incoherencias restantes** entre:

- ✅ Filosofía del Producto
- ✅ Estado Documental
- ✅ Programación Operativa
- ✅ Roadmap Futuro
- ✅ Visión UX

**Estado:** CLAUDE.md está completamente alineado estratégicamente.

---

## 🎯 VALIDACIÓN FINAL

### Preguntas de Coherencia

**1. ¿Programación Operativa es un motor paralelo?**

❌ NO → Es un generador de variables que alimenta la calculadora existente ✅

**2. ¿Parser Programación debe almacenar solo lo necesario hoy?**

❌ NO → Debe almacenar todo lo relevante que pueda interpretar ✅

**3. ¿Cobertura Documental = Precisión de Cálculo?**

❌ NO → Son conceptos diferentes y complementarios ✅

**4. ¿Usuario debe elegir módulos?**

❌ NO → Usuario aporta documentos, PilotPay decide flujo ✅

**5. ¿PilotPay debe añadir más pantallas para evolucionar?**

❌ NO → Debe aumentar inteligencia interna, no complejidad externa ✅

---

## 📝 CONCLUSIÓN

**CLAUDE.md ahora refleja completamente la visión estratégica real de PilotPay.**

**Principios protegidos:**

1. ✅ Usuario aporta documentos, PilotPay se encarga
2. ✅ Una sola calculadora, múltiples orígenes
3. ✅ Almacenar todo lo relevante, no solo lo necesario
4. ✅ Calidad = Motores + Cobertura Documental
5. ✅ Modelo UX documental, no modular
6. ✅ Complejidad interna, nunca externa

**Estado:** ✅ **ALINEACIÓN ESTRATÉGICA COMPLETADA**

**Próximo paso:** Cualquier desarrollo futuro debe ser compatible con estos principios documentados.

---

**FIN DE AUDITORÍA ESTRATÉGICA**
