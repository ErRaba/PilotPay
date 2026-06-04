# Parser V2 — Guía de Testing

**Rama:** `parser-nomina-v2`  
**Estado:** FASE 2 completada — extracción documental implementada  
**Confidence global:** Forzado a 0 (modo prueba) — V2 NO activo, siempre usa V1

---

## 🎯 Objetivo de Testing

Validar que `parseBinterNominaV2()` extrae correctamente **TODAS** las líneas de la nómina sin perder información.

**NO estamos testeando auditoría ni cálculos todavía** — solo captura de información documental.

---

## 📋 Cómo Testear

### Paso 1: Activar modo debug

```javascript
localStorage.setItem('pilotpay_parser_debug', '1');
```

### Paso 2: Cargar nómina en Comparativa

1. Abrir PilotPay en navegador
2. Ir a sección **Comparativa**
3. Cargar PDF de nómina Binter

### Paso 3: Revisar console.log

Aparecerán logs:

```
[Parser] V2 OK — confidence: 0.00
[Parser] V2 warnings: [...]
[Parser] Usando V1 (fallback)
```

**IMPORTANTE:** Como `confidence.global = 0`, V2 SIEMPRE hace fallback a V1. La app funciona con V1, pero V2 se ejecuta y loggea resultados.

### Paso 4: Inspeccionar estructura V2

En consola:

```javascript
// El resultado legacy incluye _nominaV2 si debug activo
const nomData = window.nomDataCached;  // Variable global tras cargar nómina
const v2 = nomData._nominaV2;

// Ver tablaConceptos
console.table(v2.tablaConceptos);

// Ver líneas no clasificadas
console.log(v2._debug.linesUnclassified);

// Ver warnings
console.log(v2.warnings);

// Ver confidence por campo
console.table(v2.confidence);
```

---

## 📊 Qué Analizar

### 1. tablaConceptos[]

**Objetivo:** Capturar TODAS las líneas de la tabla de conceptos.

**Métricas esperadas:**
- Nómina típica Binter: **15-25 líneas** de conceptos
- Clasificadas (tipo ≠ "desconocido"): **≥80%**
- Desconocidas (tipo === "desconocido"): **≤20%**

**Revisar:**
```javascript
v2.tablaConceptos.forEach((c, i) => {
  console.log(
    i+1,
    c.tipo.padEnd(12),
    c.subtipo?.padEnd(20),
    c.concepto,
    '→',
    c.devengo || c.retencion
  );
});
```

**Preguntas:**
- ¿Hay líneas de conceptos que V2 NO captura?
- ¿Hay líneas clasificadas como "desconocido" que deberían tener subtipo?
- ¿Los importes (devengo/retencion) son correctos?

### 2. Líneas Clasificadas vs No Clasificadas

**Revisar:**
```javascript
console.log('Total líneas PDF:', v2._debug.rawLineCount);
console.log('Líneas clasificadas:', v2._debug.linesClassified);
console.log('Líneas NO clasificadas:', v2._debug.linesUnclassified.length);
```

**Objetivo:** 
- `linesClassified` debe incluir TODAS las líneas de conceptos
- `linesUnclassified` debe ser principalmente líneas de encabezado/pie

**Revisar líneas no clasificadas:**
```javascript
v2._debug.linesUnclassified.forEach(u => {
  console.log('[NO CLASIFICADA]', u.reason, '→', u.line);
});
```

### 3. Campos Nuevos vs V1

**Campos que V2 detecta y V1 NO:**

| Campo | ¿Lo tiene V1? | ¿Lo tiene V2? |
|---|---|---|
| **empresa.nif** | ❌ NO | ✅ SÍ |
| **empresa.nombre** | ❌ NO | ✅ SÍ |
| **trabajador.puesto** | ❌ NO | ✅ SÍ |
| **trabajador.centro_trabajo** | ❌ NO | ✅ SÍ |
| **periodo.fecha_inicio** | ❌ NO | ✅ SÍ |
| **periodo.fecha_fin** | ❌ NO | ✅ SÍ |
| **tablaConceptos[]** | ❌ NO | ✅ SÍ (NUEVO) |
| **devengos.hv_t3_imp** | ❌ NO | ✅ SÍ |
| **devengos.hv_t4_imp** | ❌ NO | ✅ SÍ |
| **deducciones.ss_cc_pct** | ❌ NO | ✅ SÍ (%) |
| **totales.total_deducciones** | ❌ NO | ✅ SÍ |
| **calendarioMensual.diasInfo** | Parcial | ✅ Completo |

**Verificar:**
```javascript
console.log('Empresa NIF:', v2.empresa.nif);
console.log('Puesto:', v2.trabajador.puesto);
console.log('SS CC %:', v2.deducciones.ss_cc_pct);
console.log('Total Deducciones:', v2.totales.total_deducciones);
```

### 4. Confidence Global

**Revisar:**
```javascript
console.table(v2.confidence);
console.log('Confidence global (calculado):', v2.confidence.global);
```

**NOTA:** El `confidence.global` se fuerza a 0 al final para mantener fallback a V1. El valor calculado aparece en el log antes de forzarse.

**Campos críticos esperados con conf ≥ 0.7:**
- `trabajador_nombre`
- `trabajador_nif`
- `periodo`
- `liquido`
- `bases_totales_pie`

### 5. Warnings

**Revisar:**
```javascript
v2.warnings.forEach(w => console.warn('[V2 Warning]', w));
```

**Warnings esperados:**
- `[DEBUG] confidence.global forzado a 0 — V2 en modo prueba`

**Warnings que indican problemas:**
- "No se detectaron líneas de conceptos en tablaConceptos[]"
- "Más del 50% de líneas con números quedaron sin clasificar"
- "Nombre trabajador no detectado"
- "NIF trabajador no detectado"
- "Periodo no detectado"

---

## ✅ Checklist de Validación

### Extracción Básica
- [ ] Nombre trabajador detectado
- [ ] NIF trabajador detectado (formato 12345678A)
- [ ] NSS detectado
- [ ] Periodo (mes/año) detectado
- [ ] Empresa NIF detectado (B76038235)
- [ ] Empresa nombre detectado (BINTER CANARIAS)

### tablaConceptos[]
- [ ] Al menos 15 líneas extraídas
- [ ] Salario Base aparece
- [ ] Plus Transporte aparece
- [ ] Horas Vuelo T1-T4 aparecen
- [ ] Dietas (exentas/sujetas) aparecen
- [ ] SS (CC, MEI, D+FP) aparecen
- [ ] IRPF Retención aparece
- [ ] Líneas "desconocidas" < 20%

### Campos Nuevos
- [ ] `empresa.nif` poblado
- [ ] `trabajador.puesto` poblado
- [ ] `deducciones.ss_cc_pct` poblado (porcentaje)
- [ ] `totales.total_deducciones` poblado
- [ ] `calendarioMensual.diasInfo.diasTrabajados` poblado

### Confidence
- [ ] `confidence.trabajador_nombre` ≥ 0.8
- [ ] `confidence.trabajador_nif` ≥ 0.7
- [ ] `confidence.periodo` ≥ 0.9
- [ ] `confidence.liquido` ≥ 0.8
- [ ] Confidence global calculado ≥ 0.6 (antes de forzar a 0)

### Fallback V1
- [ ] App funciona correctamente (usa V1)
- [ ] Comparativa muestra resultados
- [ ] No hay errores JS en consola
- [ ] V2 se ejecuta en background sin romper nada

---

## 📈 Resultados Esperados

### Nómina Binter típica (CMD/COP)

```
┌─────────────────────────┬──────────┐
│ Métrica                 │ Valor    │
├─────────────────────────┼──────────┤
│ Parser usado            │ V1       │  ← fallback porque conf=0
│ Confidence global       │ 0.00     │  ← forzado, real ~0.7-0.8
│ Líneas totales PDF      │ ~150-250 │
│ tablaConceptos          │ 18-25    │
│ Clasificadas            │ 16-22    │
│ Desconocidas            │ 2-3      │
│ Sin clasificar          │ 120-220  │  ← encabezados, pie, etc
│ Tiempo parsing          │ 50-150ms │
└─────────────────────────┴──────────┘
```

### Comparativa V1 vs V2

| Aspecto | V1 | V2 |
|---|---|---|
| **Campos detectados** | ~35 | ~45 |
| **Líneas conceptos capturadas** | Implícito (agregados) | Explícito (array completo) |
| **Empresa detectada** | ❌ NO | ✅ SÍ |
| **SS porcentajes** | ❌ NO | ✅ SÍ |
| **Total deducciones** | ❌ NO | ✅ SÍ |
| **Líneas desconocidas guardadas** | ❌ NO | ✅ SÍ |
| **Sistema confidence** | ❌ NO | ✅ SÍ |
| **Debug info** | ❌ NO | ✅ SÍ |

---

## 🔧 Troubleshooting

### "No se detectaron líneas de conceptos"

**Causa:** Regex de detección no coincide con formato PDF.

**Debug:**
```javascript
// Ver líneas raw
v2.raw.lines.forEach((l, i) => {
  if (/salario|hora|vuelo|dieta|cotizaci/i.test(l)) {
    console.log(i, l);
  }
});
```

### "Muchas líneas desconocidas"

**Causa:** Patrones de clasificación incompletos.

**Debug:**
```javascript
// Ver líneas desconocidas
v2.tablaConceptos.filter(c => c.tipo === 'desconocido').forEach(c => {
  console.log('[DESCONOCIDO]', c.concepto, '→', c.rawLine);
});
```

### "NIF trabajador no detectado"

**Causa:** Lógica de ancla al NSS falló.

**Debug:**
```javascript
// Ver todos los NIFs candidatos
const nifs = v2.raw.text.match(/\b\d{8}[A-Z]\b/g);
console.log('NIFs encontrados:', nifs);
console.log('NIF empresa esperado: B76038235');
```

---

## 📝 Plantilla de Reporte

```markdown
## Test Parser V2 — Nómina [MES/AÑO]

**Archivo:** [nombre.pdf]
**Parser usado:** V1 (fallback automático)
**Confidence global calculado:** [X.XX]

### Estadísticas
- Líneas totales: XXX
- tablaConceptos: XX líneas
  - Clasificadas: XX (XX%)
  - Desconocidas: XX (XX%)
- Líneas no clasificadas: XXX

### Campos nuevos detectados (vs V1)
- empresa.nif: [B76038235 / NO DETECTADO]
- empresa.nombre: [BINTER CANARIAS / NO DETECTADO]
- trabajador.puesto: [Comandante / NO DETECTADO]
- deducciones.ss_cc_pct: [X.XX% / NO DETECTADO]
- totales.total_deducciones: [X.XXX,XX € / NO DETECTADO]

### tablaConceptos[] (primeras 5 líneas)
1. [tipo] [subtipo] → [concepto] = [importe]
2. ...

### Líneas desconocidas
1. [rawLine]
2. ...

### Warnings
- [warning 1]
- [warning 2]

### Observaciones
- [observación 1]
- [observación 2]

### Recomendaciones
- [mejora 1]
- [mejora 2]
```

---

## ⏭️ Próximos Pasos

**FASE 3 (pendiente):**
1. Revisar reportes de test
2. Ajustar patrones de clasificación según líneas desconocidas
3. Añadir más subtipos si necesario
4. Robustecer detección de empresa/trabajador
5. Validar confidence global
6. **SI TODO OK:** cambiar `confidence.global = 0` → usar cálculo real
7. Testear con V2 activo
8. Comparar resultados V1 vs V2 en auditoría

---

**Fecha:** 2026-06-04  
**Rama:** `parser-nomina-v2`  
**Commit:** `3ebefa9`
