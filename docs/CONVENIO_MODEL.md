# PilotPay — Modelo de Datos: Convenio BCSA

**Versión**: P6.1  
**Fecha**: 2026-05-25  
**Archivo fuente**: `frontend/js/convenioData.js`

---

## 1. Principio fundamental

El módulo Convenio es una **base normativa de solo lectura**. No interactúa con Firebase, el DOM ni el motor de cálculo. Es la referencia documental que respalda cada concepto implementado en `payrollEngine`.

**Regla de calidad**: ningún concepto entra al catálogo sin tener definición, fuente verificada, fórmula, cotización, tributación y efecto en bases SS/IRPF documentados. Preferible 20 conceptos sólidos que 150 placeholders.

---

## 2. Enumeraciones

### `CVN_ESTADO` — Estado de implementación

| Valor | Significado |
|---|---|
| `implementado` | Calculado y verificado contra nómina real |
| `implementado_parcial` | Implementado con limitaciones conocidas |
| `documentado` | Definido normativamente, pendiente de implementar en motor |
| `pendiente_evidencia` | Concepto identificado, falta evidencia documental |
| `pendiente_calculo` | Evidencia ok, falta implementar en motor |
| `pendiente_validacion` | Implementado, pendiente de contraste con nóminas reales |

### `CVN_PRIORIDAD`

| Valor | Descripción |
|---|---|
| `critica` | Impacto directo en la nómina de cada usuario activo |
| `alta` | Relevante para la mayoría de casos de uso |
| `media` | Casos específicos, no universales |
| `baja` | Informativo o muy poco frecuente |

### `CVN_CONFIANZA`

| Valor | Descripción |
|---|---|
| `validado_nomina` | Verificado contra nóminas reales (la evidencia más fuerte) |
| `validado_convenio` | Verificado en el texto del convenio colectivo |
| `parcial` | Interpretación parcial, pendiente de contraste completo |
| `experimental` | Sin evidencia documental suficiente — no usar en producción |

### `CVN_IMPACTO`

| Valor | Descripción |
|---|---|
| `nomina` | Afecta directamente al cálculo de la nómina |
| `operativo` | Afecta a la operación laboral, no a la cuantía de la nómina |
| `documental` | Relevancia normativa / informativa |
| `administrativo` | Afecta a procedimientos o gestión, no a la cuantía |

---

## 3. Modelo de concepto

```javascript
{
  // ── Identidad ──
  id:               string,          // slug único, snake_case
  nombre:           string,          // nombre completo
  nombre_corto:     string,          // abreviatura para tablas
  categoria:        string,          // ver CONVENIO_CATEGORIAS
  tags:             string[],        // palabras clave para búsqueda

  // ── Fuente normativa ──
  articulo:         string | null,   // "Artículo 42 BCSA" / "Anexo I"
  boe:              string | null,   // referencia BOE si aplica
  vigencia_desde:   string | null,   // ISO date
  vigencia_hasta:   string | null,   // null = vigente

  // ── Definición ──
  definicion:       string,          // descripción clara y precisa
  condiciones:      string[],        // lista de condiciones de aplicación
  aplica_a:         string[],        // ['CMD', 'COP', 'TCP', 'SCC', 'CC']
  por_nivel:        boolean,         // varía por nivel de antigüedad
  por_base:         boolean,         // varía por base de operaciones

  // ── Fiscalidad y SS ──
  cotiza_ss:        boolean | null,  // null = pendiente de evidencia
  tributa_irpf:     boolean | null,
  exento_hasta:     number | null,   // importe máximo exento (€)
  afecta_base_ss:   boolean | null,
  afecta_base_irpf: boolean | null,

  // ── Efecto económico ──
  efecto_bruto:     'suma' | 'descuento' | null,
  efecto_neto:      'suma' | 'descuento' | null,
  formula_desc:     string | null,   // descripción de la fórmula
  formula_ejemplo:  string | null,   // ejemplo con valores reales

  // ── Motor de cálculo ──
  motor_key:        string | null,   // clave en payrollEngine; null = no implementado

  // ── Metadatos de calidad ──
  estado:           CVN_ESTADO,
  prioridad:        CVN_PRIORIDAD,
  confianza:        CVN_CONFIANZA,
  impacto:          CVN_IMPACTO,
  fuente_nomina:    string,          // qué nóminas se usaron para verificar

  // ── Notas y relaciones ──
  notas_pendientes: string,          // qué hace falta para avanzar de estado
  relacionados:     string[],        // ids de conceptos relacionados
  faq_ids:          string[],        // ids de FAQs asociadas
}
```

---

## 4. Modelo de FAQ

```javascript
{
  id:           string,      // slug único
  pregunta:     string,      // pregunta en lenguaje natural
  respuesta:    string,      // respuesta directa y concisa
  fuente:       string,      // referencia normativa
  confianza:    CVN_CONFIANZA,
  concepto_ids: string[],    // conceptos relacionados
  verificada:   boolean,     // true = respuesta contrastada con evidencia real
}
```

---

## 5. Categorías

| id | Label | Conceptos típicos |
|---|---|---|
| `fijos` | Conceptos fijos | Salario base, plus transporte, prorrata extras |
| `variables` | Variables | Horas de vuelo, imaginarias, francos, DPO |
| `dietas` | Dietas | Dieta nacional, dieta internacional, mant. nac. |
| `complementos` | Complementos | Comp. destino, comp. MAD |
| `cargos_especiales` | Cargos especiales | Instrucción, LTC, GTI, Jefatura de base |
| `it_bajas` | IT / Bajas | IT baja, media variables |
| `permisos` | Permisos / Licencias | Licencias retribuidas, maternidad/paternidad |
| `acumuladas` | Variables acumuladas | Acumuladas anuales |
| `uniformidad` | Uniformidad | Complemento de uniformidad |

---

## 6. ConvenioEngine — API

```javascript
ConvenioEngine.getConcepto(id)           // → Concepto | null
ConvenioEngine.getByCategoria(cat)       // → Concepto[]
ConvenioEngine.getByEstado(estado)       // → Concepto[]
ConvenioEngine.getByMotorKey(key)        // → Concepto | null
ConvenioEngine.search(query)             // → Concepto[] (busca en nombre/def/tags)
ConvenioEngine.getFAQ(id)               // → FAQ | null
ConvenioEngine.getFAQsByConcepto(cId)   // → FAQ[]
ConvenioEngine.statsImplementados()     // → { total, impl, parc, pend }
```

---

## 7. Criterio de entrada al catálogo

Antes de añadir un nuevo concepto, deben estar documentados:

1. **Definición** clara en lenguaje no técnico
2. **Fuente normativa**: artículo del convenio o referencia BOE
3. **Fórmula**: cómo se calcula, con ejemplo real
4. **Cotización SS**: cotiza / no cotiza / exento hasta X €
5. **Tributación IRPF**: tributa / exento / exento hasta X €
6. **Efecto sobre base SS y base IRPF**
7. **Efecto en bruto/neto**: suma o descuento
8. **Evidencia**: al menos una nómina real o texto de convenio contrastado

Sin estos campos completos, el concepto entra con `estado: pendiente_evidencia` y `confianza: experimental`. No se calcula ni se muestra en auditorías hasta alcanzar `validado_nomina` o `validado_convenio`.

---

## 8. Estado actual del catálogo (P6.1)

### Implementados y verificados (`validado_nomina`)
salario_base · plus_transporte · prorrata_extras · horas_vuelo · imaginarias · francos · dpo · mant_nac · dieta_nac · dieta_int · compensatorio_dest · comp_mad

### Implementados parcialmente (`parcial`)
it_baja · media_variables

### Pendientes de evidencia
instruccion · ltc · gti · jefatura_base · licencias_retribuidas · maternidad_paternidad · uniformidad

---

## 9. Proceso para avanzar un concepto de estado

```
pendiente_evidencia
  → recopilar nóminas reales con el concepto visible
  → contrastar con texto del convenio colectivo
  → completar todos los campos del modelo
  → cambiar estado a: implementado_parcial | documentado

implementado_parcial
  → completar implementación en payrollEngine
  → verificar contra ≥2 nóminas reales
  → cambiar estado a: implementado

implementado + confianza: parcial
  → contraste completo con evidencia
  → cambiar confianza a: validado_nomina | validado_convenio
```
