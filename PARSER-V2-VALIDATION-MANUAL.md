# Parser V2 — Validación Manual con Nóminas Reales

**IMPORTANTE:** El script Node.js requiere dependencias complejas. La validación real se hace directamente en el navegador.

---

## 🎯 Protocolo de Validación Manual

### PASO 1: Activar modo debug

Abre la consola del navegador (F12) y ejecuta:

```javascript
localStorage.setItem('pilotpay_parser_debug', '1');
```

### PASO 2: Cargar nómina

1. Abre PilotPay en navegador
2. Ve a **Comparativa**
3. Carga un PDF de nómina desde `Nominas Claude/`

### PASO 3: Inspeccionar V2

```javascript
// V2 está adjunto al resultado legacy si debug activo
const nomData = window.nomDataCached || window.lastNomData;
const v2 = nomData._nominaV2;

// Ver resumen
console.log('Parser usado:', nomData._parserVersion || 'V1');
console.log('Confidence V2:', v2.confidence.global);
console.log('Warnings:', v2.warnings);

// Ver tabla conceptos
console.table(v2.tablaConceptos.map(c => ({
  tipo: c.tipo,
  subtipo: c.subtipo,
  concepto: c.concepto?.substring(0, 30),
  importe: c.devengo || c.retencion,
  conf: c.confidence
})));

// Ver campos detectados
console.log('EMPRESA:', v2.empresa);
console.log('TRABAJADOR:', v2.trabajador);
console.log('PERIODO:', v2.periodo);
console.log('BASES:', v2.bases);
console.log('TOTALES:', v2.totales);
console.log('IRPF %:', v2.deducciones.irpf_pct);
console.log('SS CC %:', v2.deducciones.ss_cc_pct);
console.log('ACUMULADOS:', v2.acumulados);

// Ver estadísticas
console.log('Total conceptos:', v2.tablaConceptos.length);
console.log('Clasificados:', v2.tablaConceptos.filter(c => c.tipo !== 'desconocido').length);
console.log('Desconocidos:', v2.tablaConceptos.filter(c => c.tipo === 'desconocido').length);
console.log('Líneas sin clasificar:', v2._debug.linesUnclassified.length);

// Ver líneas desconocidas
v2.tablaConceptos.filter(c => c.tipo === 'desconocido').forEach(c => {
  console.log('[DESCONOCIDO]', c.concepto, '→', c.rawLine);
});

// Ver líneas no clasificadas
v2._debug.linesUnclassified.forEach(u => {
  console.log('[NO CLASIFICADA]', u.reason, '→', u.line);
});
```

### PASO 4: Rellenar plantilla

Para cada nómina, copia esta plantilla y rellena con los valores de la consola:

```markdown
## Nómina: [NOMBRE_ARCHIVO.pdf]

**Parser usado:** [V1 / V2]  
**Confidence global:** [X.XXX]

### EMPRESA
- Nombre: [...]
- NIF: [...]

### TRABAJADOR
- Nombre: [...]
- NIF: [...]
- NSS: [...]
- Antigüedad: [...]
- Puesto: [...]
- Función: [...]
- Nivel: [...]
- Base: [...]
- Centro trabajo: [...]

### PERIODO
- Mes: [...]
- Año: [...]
- Inicio: [...]
- Fin: [...]

### BASES Y TOTALES
- Base SS: [X.XXX,XX €]
- Base IRPF: [X.XXX,XX €]
- Total Devengado: [X.XXX,XX €]
- Total Deducciones: [X.XXX,XX €]
- Líquido: [X.XXX,XX €]

### IRPF
- Porcentaje: [XX,XX%]
- Base: [X.XXX,XX €]
- Retenido: [X.XXX,XX €]

### ACUMULADOS
- base_irpf: [...]
- irpf: [...]
- cotiz_ss: [...]
- base_esp_rep: [...]
- irpf_esp_rep: [...]
- base_esp_norep: [...]
- irpf_esp_norep: [...]

### TABLA DE CONCEPTOS
Total detectadas: [XX]
Clasificadas: [XX] (XX%)
Desconocidas: [XX]

#### Conceptos Detectados:
1. [tipo] [subtipo] → [concepto] = [importe] (conf: X.XX)
2. ...

#### Conceptos Desconocidos:
1. [rawLine]
2. ...

### LÍNEAS NO CLASIFICADAS
Total: [XX]

[Lista de líneas...]

### OBSERVACIONES
- [Campo X está correcto / mal / no detectado]
- [Concepto Y debería clasificarse como...]
- ...
```

---

## 📋 CHECKLIST POR NÓMINA

Para cada nómina validada, marcar:

### Campos Básicos
- [ ] Empresa NIF detectado (B76038235)
- [ ] Empresa nombre detectado
- [ ] Trabajador nombre detectado
- [ ] Trabajador NIF detectado
- [ ] Trabajador NSS detectado
- [ ] Puesto detectado
- [ ] Función detectada (CMD/COP)
- [ ] Nivel detectado
- [ ] Base detectada
- [ ] Centro trabajo detectado
- [ ] Periodo mes detectado
- [ ] Periodo año detectado
- [ ] Fechas inicio/fin detectadas

### Importes Críticos
- [ ] Base SS detectada
- [ ] Base IRPF detectada
- [ ] Total Devengado detectado
- [ ] Total Deducciones detectado
- [ ] Líquido detectado
- [ ] IRPF % detectado
- [ ] IRPF retenido detectado

### tablaConceptos
- [ ] Salario Base extraído
- [ ] Plus Transporte extraído
- [ ] Horas Vuelo T1-T4 extraídas
- [ ] DPO extraído
- [ ] Complemento MAD extraído (si aplica)
- [ ] Dietas exentas extraídas
- [ ] Dietas sujetas extraídas
- [ ] SS CC extraída
- [ ] SS MEI extraída
- [ ] SS D+FP extraída
- [ ] SS Solidaridad extraída
- [ ] IRPF Retención extraída
- [ ] Seguro Médico extraído (si aplica)

### Porcentajes
- [ ] SS CC % detectado
- [ ] IRPF % detectado

### Acumulados
- [ ] Acum. Base IRPF detectado
- [ ] Acum. IRPF detectado
- [ ] Acum. Cotiz SS detectado

### Clasificación
- [ ] % clasificación ≥ 80%
- [ ] No hay conceptos importantes sin clasificar
- [ ] Conceptos desconocidos son realmente desconocidos (no patrones que deberían detectarse)

---

## 🎯 MÉTRICAS OBJETIVO

Para considerar V2 válido:

| Métrica | Objetivo | Crítico |
|---|---|---|
| **Cobertura campos básicos** | ≥ 90% | SÍ |
| **Base SS / Base IRPF** | 100% | SÍ |
| **Líquido neto** | 100% | SÍ |
| **IRPF %** | 100% | SÍ |
| **tablaConceptos extraídos** | 18-25 líneas/nómina | SÍ |
| **% clasificación** | ≥ 80% | SÍ |
| **Conceptos desconocidos** | ≤ 20% | NO |
| **Confidence global** | ≥ 0.7 | NO (forzado a 0 en pruebas) |
| **Tiempo parsing** | < 200ms | NO |

---

## 🔍 AUDITORÍA CRÍTICA

Para cada nómina, responde:

### 1. Campos leídos correctamente
- ¿Qué campos están perfectos?
- ¿Coinciden con la nómina PDF?

### 2. Campos leídos parcialmente
- ¿Qué campos se detectan pero con errores?
- ¿El valor es cercano pero no exacto?
- ¿Es un problema de formato o de lógica?

### 3. Campos mal interpretados
- ¿Qué campos están completamente mal?
- ¿Se confunde un concepto con otro?
- ¿El patrón está capturando el campo equivocado?

### 4. Campos no detectados
- ¿Qué campos aparecen en la nómina pero V2 no los ve?
- ¿Son campos importantes o secundarios?
- ¿El patrón no existe o está mal escrito?

### 5. Conceptos sin clasificar recurrentes
- ¿Qué conceptos aparecen como "desconocido" en múltiples nóminas?
- ¿Son conceptos que deberían tener subtipo?
- ¿Cómo se llaman exactamente en la nómina?

### 6. Patrones a corregir
- ¿Qué regex está fallando?
- ¿Qué patrón está capturando lo incorrecto?
- ¿Qué condición de clasificación está mal?

---

## 📊 INFORME AGREGADO

Después de validar las 8 nóminas, completar:

### Estadísticas Globales

```
Total nóminas validadas: 8
Parser usado: V1 (fallback porque confidence=0 forzado)

tablaConceptos:
- Promedio líneas/nómina: [XX]
- Total clasificadas: [XXX] (XX%)
- Total desconocidas: [XX]

Campos detectados correctamente:
- empresa.nif: X/8 (XX%)
- empresa.nombre: X/8 (XX%)
- trabajador.nombre: X/8 (XX%)
- trabajador.nif: X/8 (XX%)
- trabajador.nss: X/8 (XX%)
- trabajador.puesto: X/8 (XX%)
- trabajador.funcion: X/8 (XX%)
- trabajador.nivel: X/8 (XX%)
- trabajador.base: X/8 (XX%)
- periodo.mes: X/8 (XX%)
- periodo.anio: X/8 (XX%)
- bases.base_ss: X/8 (XX%)
- bases.base_irpf: X/8 (XX%)
- totales.total_devengado: X/8 (XX%)
- totales.total_deducciones: X/8 (XX%)
- totales.liquido: X/8 (XX%)
- deducciones.irpf_pct: X/8 (XX%)
- deducciones.ss_cc_pct: X/8 (XX%)
- acumulados.base_irpf: X/8 (XX%)
- acumulados.irpf: X/8 (XX%)
```

### Top 10 Conceptos Desconocidos Recurrentes

```
1. [XX veces] [concepto/rawLine]
   Propuesta: clasificar como [subtipo]
   
2. [XX veces] [concepto/rawLine]
   Propuesta: clasificar como [subtipo]

...
```

### Problemas Críticos Detectados

```
1. [Problema]
   Afecta: X/8 nóminas
   Severidad: Alta/Media/Baja
   Fix propuesto: [...]

2. [Problema]
   ...
```

### Conclusión

```
✅ CAMPOS BIEN LEÍDOS:
- [campo1]: 100% precisión
- [campo2]: 100% precisión
...

⚠️ CAMPOS PARCIALES:
- [campo3]: detectado en X/8, XX% tiene valor correcto
- [campo4]: ...

❌ CAMPOS MAL LEÍDOS:
- [campo5]: confunde X con Y
- [campo6]: patrón captura campo incorrecto

📋 CAMPOS NO DETECTADOS:
- [campo7]: aparece en PDF pero V2 no lo ve
- [campo8]: ...

🎯 RECOMENDACIÓN:
- V2 está listo / necesita correcciones / necesita refactor
- Priorizar fix de: [campos críticos]
- Añadir patrones para: [conceptos desconocidos recurrentes]
- Confidence global real esperado: 0.XX
```

---

## ⏭️ Después de la Validación

Una vez tengas los informes de las 8 nóminas:

1. Comparte los resultados aquí
2. Identificaremos patrones a corregir
3. Priorizaremos fixes por impacto
4. Decidiremos si activar V2 o iterar más

**NO MODIFICAR CÓDIGO hasta tener resultados reales.**

---

**Fecha:** 2026-06-04  
**Rama:** `parser-nomina-v2`  
**Commit:** `3ebefa9`
