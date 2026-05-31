# VALIDATION_CASES.md — Casos de Validación Operacional NormativaEngine

**Fecha de análisis**: 2026-05-25  
**Versión normativa analizada**: Beta 3.0 (post-arquitectura normativa)  
**Motor**: `normativaEngine.js` v1 + fuentes de `frontend/js/normativa/`

> Objetivo: validar que el motor normativo resuelve correctamente situaciones reales.  
> No son tests automatizados. Son trazados manuales contra la lógica del engine,  
> para detectar contradicciones, huecos y reglas mal modeladas antes de cualquier UI.

---

## ÍNDICE

1. [Problemas de diseño detectados en el engine](#problemas-de-diseño)
2. [Casos MAD](#casos-mad) — VC-MAD-01 a VC-MAD-04
3. [Casos TFN](#casos-tfn) — VC-TFN-01 a VC-TFN-04
4. [Casos LPA](#casos-lpa) — VC-LPA-01 a VC-LPA-03
5. [Casos Productividad](#casos-productividad) — VC-PROD-01 a VC-PROD-02
6. [Casos transversales](#casos-transversales) — VC-VAC-01, VC-DSC-01
7. [Ambigüedades nuevas descubiertas](#ambiguedades-nuevas)
8. [Prioridades mal resueltas](#prioridades-mal-resueltas)
9. [Resumen ejecutivo](#resumen-ejecutivo)

---

## PROBLEMAS DE DISEÑO DETECTADOS EN EL ENGINE {#problemas-de-diseño}

Estos problemas se detectaron al trazar los casos. No son errores de datos normativos
sino limitaciones del motor que el consumidor debe conocer antes de usar la API.

---

### DISEÑO-01 — `tipo_override` ignorado en el marcado de overrides

**Severidad**: Alta  
**Archivo afectado**: `normativaEngine.js` → `resolveContext()`

**Problema**: el engine marca una regla como `_overriddenBy` cuando cualquier otra regla
vigente la declara en su array `overrides[]`, sin importar si `tipo_override` es
`'adiciona'`, `'sustituye'` o `'suspende'`.

**Consecuencia concreta**: `cc_media_variables` aparece como `_overriddenBy: 'acta_media_variables_ampliada'`
aunque el Acta solo AMPLÍA el cálculo, no reemplaza la regla base. Un consumidor que
filtre por `_overriddenBy` eliminaría `cc_media_variables` incorrectamente.

**Reglas afectadas**:
- `cc_media_variables` (adiciona → no debe marcarse como "replaced")
- `cc_licencias_base` (adiciona × 3 reglas de antigüedad)
- `cc_vac_duracion` (adiciona por antigüedad + sustituye por roster)
- `cc_reduccion_jornada` (adiciona)

**Propuesta de fix**: exponer `_overrideType` junto a `_overriddenBy`:
```javascript
out._overriddenBy   = overriddenIds[r.id].id;
out._overrideType   = overriddenIds[r.id].tipo;  // 'adiciona'|'sustituye'|'suspende'
```

---

### DISEÑO-02 — Múltiples overrides sobre el mismo target: último escritor gana

**Severidad**: Media  
**Archivo afectado**: `normativaEngine.js` → `resolveContext()`

**Problema**: cuando varias reglas vigentes declaran el mismo ID en su `overrides[]`,
el engine ejecuta `overriddenIds[oid] = r.id` en bucle — el último en procesarse
sobreescribe a todos los anteriores.

**Consecuencia concreta**:
- `cc_vac_duracion` es overrideado por: `acta_vac_ant_14_20`, `acta_vac_ant_20_plus`,
  y opcionalmente `tfn_roster_5_3_vac_23_lab`. Solo uno queda en `_overriddenBy`.
- `cc_licencias_base` es overrideado por: `acta_licencias_ant_7_14`, `acta_licencias_ant_14_20`,
  `acta_licencias_ant_20_plus`. Solo queda uno.

**La iteración de `Object.keys()` en V8 sigue el orden de inserción**, así que el resultado
es determinista en la práctica, pero es una dependencia implícita frágil.

**Propuesta de fix**: cambiar a `overriddenIds[oid] = overriddenIds[oid] || []` y acumular
todos los IDs en un array. Exponer `_overriddenByList: [...]` en vez de `_overriddenBy`.

---

### DISEÑO-03 — `condicionado_a` no se evalúa: consumer responsibility no documentada

**Severidad**: Media  
**Archivo afectado**: `normativaEngine.js` → `resolveContext()`

**Problema**: reglas con `condicionado_a` aparecen en el resultado de `resolveContext`
sin importar si la condición es cierta. El caller debe comprobar
`_meta.condicionado_a` por sí mismo.

**Consecuencia concreta**:
- Para TFN septiembre 2026: `tfn_roster_5_3_vac_23_lab` (condicionado_a: 'roster_5_3_implantado')
  aparece en resultados. Si el consumidor la muestra sin chequear la condición,
  el usuario ve "23 días laborales" aunque el roster no esté formalmente implantado.
- `mad_comp_cop` (condicionado_a: 'funcion_asignada_75pct') aparece para todo COP de MAD.

**No es un bug de datos** — es un comportamiento documentado y deliberado del motor.
Pero si el primer consumidor (Centro Laboral UI) no chequea `condicionado_a`, la información
será inexacta.

**Propuesta**: añadir `getReglasByCondicionActiva(ctx, condicionesActivas[])` que filtre.

---

### DISEÑO-04 — Antigüedad no es un parámetro de contexto: todas las reglas por tramo aparecen

**Severidad**: Baja-Media  
**Archivo afectado**: `normativaEngine.js` → `resolveContext()`

**Problema**: `ctx` no tiene campo `antiguedad`. Por lo tanto, para cualquier tripulante
las tres reglas de licencias adicionales y las dos de vacaciones adicionales aparecen
simultáneamente en el resultado.

**Consecuencia concreta**: para un COP MAD de 5 años de antigüedad, el engine devuelve
`acta_licencias_ant_7_14`, `acta_licencias_ant_14_20` y `acta_licencias_ant_20_plus`.
El consumidor debe filtrar por antigüedad real antes de mostrar.

**No es un error normativo** — las reglas están bien modeladas con `rango_antiguedad_*`.
Es una limitación del nivel de contexto que acepta el motor actual.

---

### DISEÑO-05 — `lpa_antes_mayo_2026` capturada por `getRosterActivo` para LPA pre-mayo

**Severidad**: Baja  
**Archivo afectado**: `normativaEngine.js` → `getRosterActivo()`

**Problema**: `lpa_antes_mayo_2026` tiene `categoria: 'roster'` y `condicionado_a: null`,
así que `getRosterActivo('LPA', '2026-04-15')` la devuelve como "roster activo".

**Consecuencia**: técnicamente correcto (la regla describe el régimen aplicable),
pero el consumidor recibe una regla de capa L1_CC que dice "sin roster especial"
como si fuera el roster activo. Puede provocar confusión en la UI.

**Propuesta**: añadir un flag `informativa: true` a reglas como ésta, y que
`getRosterActivo` ignore las informativas.

---

## CASOS MAD {#casos-mad}

---

### VC-MAD-01 — COP MAD, marzo 2026

```
ctx: { base: 'MAD', grupo: 'COP', fecha: '2026-03-15' }
condicionesActivas: []
```

#### Reglas que el engine devuelve (vigentes para este contexto)

**Convenio General — CC_REGLAS:**
| ID | Categoría | Estado |
|---|---|---|
| cc_vac_duracion | vacaciones | vigente — _overriddenBy: acta_vac_ant_14_20 o acta_vac_ant_20_plus (ver DISEÑO-02) |
| cc_vac_fraccionamiento | vacaciones | vigente |
| cc_vac_caducidad | vacaciones | vigente |
| cc_vac_recuperacion_it | vacaciones | vigente |
| cc_maternidad_vacaciones | vacaciones | vigente |
| cc_it_carencia_7_dias | it_bajas | vigente |
| cc_it_condiciones_complemento | it_bajas | vigente |
| cc_it_accidente_laboral | it_bajas | vigente |
| cc_dias_libres_99 | dias_libres | vigente |
| cc_art80_seis_dias | programacion | vigente — **_overriddenBy: mad_art80_suspendido** |
| cc_art80_fin_semana | programacion | vigente — **_overriddenBy: mad_art80_suspendido** |
| cc_hv_tramos_concepto | hv | vigente |
| cc_imaginaria | hv | vigente |
| cc_libre_volado | hv | vigente |
| cc_media_variables | hv | vigente — _overriddenBy: acta_media_variables_ampliada (ver DISEÑO-01: solo 'adiciona') |
| cc_reduccion_jornada | reduccion_jornada | vigente |
| cc_licencias_base | licencias | vigente — _overriddenBy: acta_licencias_ant_20_plus (último procesado) |
| cc_uniformidad_pilotos | uniformidad | vigente |

**Acta de Cierre — ACTA_REGLAS:**
| ID | Categoría | Estado |
|---|---|---|
| acta_licencias_ant_7_14 | licencias | vigente — aparece para TODO COP (ver DISEÑO-04: sin filtro antigüedad) |
| acta_licencias_ant_14_20 | licencias | vigente — ídem |
| acta_licencias_ant_20_plus | licencias | vigente — ídem |
| acta_vac_ant_14_20 | vacaciones | vigente — ídem |
| acta_vac_ant_20_plus | vacaciones | vigente — ídem |
| acta_media_variables_ampliada | vacaciones | vigente |
| acta_media_variables_ajuste_12m | vacaciones | vigente (pendiente_validacion: true) |
| acta_reduccion_hv_vacaciones_lnr | reduccion_jornada | vigente |
| acta_nivel_1_plus_cmd | tablas_salariales | **NO** — grupo CMD, no COP |
| acta_nivel_1_plus_tcp | tablas_salariales | **NO** — grupos TCP/SCC/CC, no COP |
| acta_gratificacion_extraordinaria | historico | **NO** — vigencia_hasta: 2026-01-15, expirada |

**Base MAD — MAD_REGLAS:**
| ID | Categoría | Estado |
|---|---|---|
| mad_comp_cmd | complementos | **NO** — grupo CMD |
| mad_comp_cop | complementos | vigente — condicionado_a: funcion_asignada_75pct (ver DISEÑO-03) |
| mad_comp_scc | complementos | **NO** — grupo SCC |
| mad_comp_tcp | complementos | **NO** — grupo TCP |
| mad_hv_20pct | hv | vigente — condicionado_a: productividad_11_dias_colectivo |
| mad_roster_patron | roster | vigente |
| mad_roster_franco_5_dia | roster | vigente |
| mad_roster_sexto_dia_compensacion | roster | vigente |
| mad_art80_suspendido | programacion | vigente — overrides: cc_art80_seis_dias, cc_art80_fin_semana |

**Productividad — PROD_REGLAS:**
| ID | Categoría | Estado |
|---|---|---|
| prod_tdv_co2_objetivo | productividad | vigente |
| prod_tdv_ponderacion | productividad | vigente |
| prod_tdv_penalizacion_10pct | productividad | vigente |
| prod_puntualidad_comun | productividad | vigente |
| prod_matrices_ausentes | productividad | vigente (pendiente_validacion: true) |
| prod_tcp_* | productividad | **NO** — grupos SCC/TCP |

#### Overrides correctamente resueltos
- Art.80 (días consecutivos + fin de semana): **SUSPENDIDO** por `mad_art80_suspendido` ✓
- HV +20%: **CONDICIONADO** (el motor lo devuelve, el caller debe verificar productividad colectiva) ✓
- Complemento COP 833,33€/mes: **CONDICIONADO** (75% función asignada — ambigüedad activa) ✓

#### Ambigüedades que deben aparecer
- `ambig_mad_75pct_funcion` — via `mad_comp_cop` ✓
- `ambig_mad_11_dias_periodo` — via `mad_hv_20pct` ✓
- `ambig_media_variables_ajuste_12m` — via `acta_media_variables_ajuste_12m` ✓
- `ambig_vac_dia_adicional_tipo` — via `acta_vac_ant_14_20`/`acta_vac_ant_20_plus` ✓

#### Reglas que NO deben aparecer
- Cualquier regla de TFN_REGLAS ✓ (filtrada por base)
- Cualquier regla de LPA_REGLAS ✓ (filtrada por base)
- `prod_tcp_*` ✓ (filtrado por grupo)
- `acta_gratificacion_extraordinaria` ✓ (expirada)

#### Resultado: CORRECTO con advertencias
El engine resuelve correctamente el estado normativo. Las advertencias DISEÑO-01/02/03/04
afectan a la presentación, no a la corrección de los datos.

---

### VC-MAD-02 — CMD MAD, julio 2026 (transición acuerdo)

```
ctx: { base: 'MAD', grupo: 'CMD', fecha: '2026-07-15' }
```

#### Análisis de vigencia de reglas temporales MAD

`mad_roster_patron` tiene `vigencia_hasta: '2026-07-01'`.  
La función `_isVigente` compara: `if (hasta && fecha >= hasta) return false`  
Con `hasta = 2026-07-01` y `fecha = 2026-07-15`: `2026-07-15 >= 2026-07-01` → **EXPIRADA**.

**Resultado**: en julio 15, el engine NO devuelve:
- `mad_roster_patron` ✓ (expirado)
- `mad_roster_franco_5_dia` ✓ (expirado — misma vigencia)
- `mad_roster_sexto_dia_compensacion` ✓ (expirado)
- `mad_art80_suspendido` ✓ (expirado)

**Por lo tanto**, el Art. 80 RECUPERA plena vigencia en MAD a partir del 01/07/2026:
- `cc_art80_seis_dias`: vigente, sin `_overriddenBy` ✓
- `cc_art80_fin_semana`: vigente, sin `_overriddenBy` ✓

**Permanecen vigentes** (no temporales):
- `mad_comp_cmd` (vigencia_hasta: null) ✓
- `mad_hv_20pct` (vigencia_hasta: null) ✓
- Todas las reglas CC y Acta ✓

#### Conflicto detectado: prórroga no modelable

El documento dice el roster 6+3 puede prorrogarse "por acuerdo expreso de ambas partes".
Si en la realidad se prorroga (como es probable), el engine NO lo sabe — devuelve el estado
sin prórroga porque el acuerdo de prórroga no está documentado en el sistema.

**Consecuencia**: el engine podría mostrar un estado incorrecto si en julio 2026 el roster
sigue activo por prórroga. No hay forma de modelar esto sin un nuevo documento.

**Recomendación**: cuando una regla temporal está próxima a expirar, el UI debe advertir
al usuario que compruebe si hubo prórroga. El campo `prorroga_posible: true` en `_meta`
es el gancho correcto para esto.

#### Resultado: CORRECTO técnicamente, INCOMPLETO operacionalmente
El engine resuelve la fecha límite correctamente. La limitación es la falta de datos
sobre la prórroga, que es inherente al estado de los documentos.

---

### VC-MAD-03 — SCC MAD con 74% de función

```
ctx: { base: 'MAD', grupo: 'SCC', fecha: '2026-03-15' }
condicionesActivas: []   ← 'funcion_asignada_75pct' ausente
```

#### Reglas de complemento relevantes

`mad_comp_scc` — `condicionado_a: 'funcion_asignada_75pct'`  
`isCondicionActiva('funcion_asignada_75pct', [])` → **false**

**El engine SIEMPRE devuelve `mad_comp_scc`** en el resultado — no filtra por condición (DISEÑO-03).

**Lo que el motor SÍ ofrece para la evaluación**:
1. La regla `mad_comp_scc` aparece con `_meta.condicionado_a: 'funcion_asignada_75pct'`
2. `hasAmbiguedad(mad_comp_scc)` → devuelve `ambig_mad_75pct_funcion`
3. `ambig_mad_75pct_funcion.como_mostrar` → texto para el usuario
4. La ambigüedad está `estado: 'abierta'`

**Lo que el engine NO DEBE hacer** (y no hace):
- Asumir pérdida del complemento al 74% ✗ (no hay regla que lo diga)
- Calcular importe prorrateado ✗ (no definido en documento)
- Asumir que el complemento se cobra íntegro ✗ (condición no verificada)

#### Ambigüedad activa
`ambig_mad_75pct_funcion` — urgencia: alta, estado: abierta.

El texto disponible en `como_mostrar`:
> "El complemento de base MAD requiere estar un mínimo del 75% en tu función asignada
> mensualmente. La empresa no ha definido públicamente cómo se calcula este porcentaje."

#### Resultado: CORRECTO
El engine resuelve correctamente devolviendo la regla condicionada + la ambigüedad.
El consumidor NO debe calcular ni asumir resultado sobre el complemento.

---

### VC-MAD-04 — TCP MAD en baja parcial

```
ctx: { base: 'MAD', grupo: 'TCP', fecha: '2026-04-01' }
contexto_especial: baja_it activa parte del mes
```

#### Reglas de IT relevantes
- `cc_it_carencia_7_dias` — primeros 7 días: empresa no complementa (paga SS)
- `cc_it_condiciones_complemento` — condiciones para complemento empresa a partir del 8.º día
- `cc_it_accidente_laboral` — si la baja es por accidente laboral, sin carencia

#### Interacción IT × complemento MAD

`mad_comp_tcp` — `condicionado_a: 'funcion_asignada_75pct'`

**El documento NO dice que la baja suspende el complemento MAD.**  
Pero si la baja cubre suficientes días del mes, el tripulante no puede haber estado
el 75% de su "función asignada" (sea lo que sea que signifique).

**La ambigüedad `ambig_mad_75pct_funcion` captura exactamente este problema**:
el documento no define si los días de baja cuentan a favor o en contra del 75%.

**Lo que el engine devuelve correctamente**:
- `mad_comp_tcp` vigente, condicionado (DISEÑO-03)
- `cc_it_carencia_7_dias` vigente
- `cc_it_condiciones_complemento` vigente
- `ambig_mad_75pct_funcion` accesible via `hasAmbiguedad(mad_comp_tcp)`

**Hueco normativo identificado**: no existe ninguna regla que defina la interacción
entre IT y complemento MAD. El documento simplemente no lo trata.

#### Resultado: CORRECTO con hueco normativo
El engine resuelve correctamente ambas dimensiones por separado. La interacción
entre ellas es un hueco real del documento, no del motor.

---

## CASOS TFN {#casos-tfn}

---

### VC-TFN-01 — CMD TFN, febrero 2026

```
ctx: { base: 'TFN', grupo: 'CMD', fecha: '2026-02-15' }
```

#### Reglas de roster activas
- `tfn_roster_6_3` — vigente (01/01 → 01/07/2026) ✓
- `tfn_roster_6_3_franco_5_dia` — vigente, **pendiente_validacion: true** ⚠
- `tfn_roster_6_3_art80_suspendido` — vigente, overrides cc_art80_seis_dias + cc_art80_fin_semana ✓

#### Art. 80
- `cc_art80_seis_dias` — **_overriddenBy: tfn_roster_6_3_art80_suspendido** ✓
- `cc_art80_fin_semana` — **_overriddenBy: tfn_roster_6_3_art80_suspendido** ✓

#### Sin complemento MAD, sin HV +20%
- Ninguna regla de `MAD_REGLAS` aparece (filtrada por base) ✓

#### Advertencia de validación pendiente
`tfn_roster_6_3_franco_5_dia` tiene `pendiente_validacion: true` y `confianza: 'pendiente'`.
El texto del documento usa "procurará" y no distingue si aplica a MAD o también a TFN.
El consumidor debe señalizar esta regla como no confirmada.

Ambigüedad: `ambig_franco_5_dia_alcance`

#### Productividad TDV
- `prod_tdv_co2_objetivo`, `prod_tdv_ponderacion`, `prod_tdv_penalizacion_10pct` — vigentes ✓
- `prod_matrices_ausentes` — vigente, bloquea cálculo exacto ✓

#### Resultado: CORRECTO

---

### VC-TFN-02 — CMD TFN, septiembre 2026 (Fase 2)

```
ctx: { base: 'TFN', grupo: 'CMD', fecha: '2026-09-01' }
condicionesActivas: ['roster_5_3_implantado']
```

#### Reglas de roster Fase 1 — EXPIRADAS
- `tfn_roster_6_3` — **NO vigente** (hasta: 2026-07-01) ✓
- `tfn_roster_6_3_art80_suspendido` — **NO vigente** ✓
- `tfn_gap_julio_agosto` — **NO vigente** (hasta: 2026-08-01) ✓

#### Reglas de roster Fase 2 — VIGENTES
- `tfn_roster_5_3` — vigente (01/08 → 01/02/2027), overrides: tfn_roster_6_3, cc_art80_seis_dias, cc_art80_fin_semana ✓
- `tfn_roster_5_3_vac_23_lab` — vigente, condicionado_a: roster_5_3_implantado ✓
- `tfn_roster_5_3_actividad_descanso` — vigente ✓
- `tfn_roster_5_3_art80_suspendido` — vigente ✓

#### Vacaciones
Con `condicionesActivas: ['roster_5_3_implantado']`:
- `cc_vac_duracion` — **_overriddenBy: tfn_roster_5_3_vac_23_lab** ✓
- La regla de 23 días laborales aplica (condición cumplida)
- Ambigüedad activa: `ambig_vac_dia_adicional_tipo` (tipo del día adicional por antigüedad)

#### Art. 80
- `cc_art80_seis_dias` — **_overriddenBy: tfn_roster_5_3_art80_suspendido** ✓
- `cc_art80_fin_semana` — **_overriddenBy: tfn_roster_5_3_art80_suspendido** ✓

#### Override de Fase 1 por Fase 2
`tfn_roster_5_3._meta.overrides` incluye `'tfn_roster_6_3'`.  
Como `tfn_roster_6_3` ya no es vigente en septiembre, el override es redundante pero inofensivo.  
El engine no devuelve reglas no vigentes — no hay conflicto.

#### Resultado: CORRECTO

---

### VC-TFN-03 — CMD TFN, julio 2026 (GAP CRÍTICO)

```
ctx: { base: 'TFN', grupo: 'CMD', fecha: '2026-07-15' }
```

**Este es el caso más crítico del sistema.**

#### Estado de cada bloque de reglas en esta fecha

| Bloque | Estado |
|---|---|
| `tfn_roster_6_3` (Fase 1) | **EXPIRADO** — hasta: 2026-07-01, fecha: 2026-07-15 |
| `tfn_roster_5_3` (Fase 2) | **AÚN NO VIGENTE** — desde: 2026-08-01 |
| `tfn_gap_julio_agosto` | **VIGENTE** — desde: 2026-07-01, hasta: 2026-08-01 |
| CC y Acta | **VIGENTES** en todo momento |
| Art. 80 protecciones | **RECUPERADAS** — ningún override activo |

#### Lo que el engine devuelve correctamente
1. `tfn_gap_julio_agosto` como regla vigente con `pendiente_validacion: true` ✓
2. `cc_art80_seis_dias` sin `_overriddenBy` — protección recuperada ✓
3. `cc_art80_fin_semana` sin `_overriddenBy` — protección recuperada ✓
4. Ningún roster especial L3 vigente (excepto la regla de gap)

#### Lo que `getRosterActivo('TFN', '2026-07-15')` devuelve
`tfn_gap_julio_agosto` — capa L3_ACUERDO, `pendiente_validacion: true`.

Esto es **correcto**: la regla del gap es la única L3 vigente para TFN en julio.
El consumidor debe detectar `pendiente_validacion: true` y mostrar una alerta clara.

#### Texto de alerta disponible en la regla
> "Período de régimen incierto. No calcular ni afirmar nada sobre este intervalo sin confirmación."

#### Consecuencias normativas para el tripulante en julio 2026 TFN
- Art. 80 pleno: máximo 5 días consecutivos vuelve a aplicar
- Descanso semanal y mensual según CC
- Sin complemento MAD (nunca hubo)
- Sin vacaciones 23 días laborales (roster 5+3 no ha empezado)
- Toda la Acta y CC aplican íntegramente

**PERO**: si en la realidad el 6+3 se prorrogó (lo más probable operativamente),
el tripulante está bajo otro régimen que el engine no puede ver.

#### Resultado: CORRECTO en lo documentado. CRÍTICO advertir al usuario.
**El engine detecta y soporta el gap.** La interfaz debe hacer visible esta incertidumbre.

---

### VC-TFN-04 — TCP TFN, vacaciones septiembre 2026

```
ctx: { base: 'TFN', grupo: 'TCP', fecha: '2026-09-01', categorias: ['vacaciones'] }
condicionesActivas: ['roster_5_3_implantado']
```

#### Reglas de vacaciones vigentes
| ID | Descripción | Estado |
|---|---|---|
| cc_vac_duracion | 30 días naturales | vigente — **_overriddenBy** (ver abajo) |
| cc_vac_fraccionamiento | hasta 4 períodos | vigente |
| cc_vac_caducidad | sin prorrogar al año siguiente | vigente |
| cc_vac_recuperacion_it | recuperar si hay IT en vacaciones | vigente |
| acta_vac_ant_14_20 | +1 día si 14-20 años antigüedad | vigente — DISEÑO-04 |
| acta_vac_ant_20_plus | +1 día si >20 años antigüedad | vigente — DISEÑO-04 |
| acta_media_variables_ampliada | cálculo media variables | vigente |
| tfn_roster_5_3_vac_23_lab | 23 días laborales — condición roster | vigente, condicionado |

#### Resolución de override sobre `cc_vac_duracion`
Con `condicionesActivas: ['roster_5_3_implantado']`:
- `tfn_roster_5_3_vac_23_lab` aplica → **23 días laborales** en vez de 30 naturales
- `cc_vac_duracion._overriddenBy` = `'tfn_roster_5_3_vac_23_lab'` ✓

#### Día adicional por antigüedad
Si el TCP tiene entre 14 y 20 años de antigüedad:
- `acta_vac_ant_14_20` → +1 día adicional
- El tipo del día (laboral o natural) es `ambig_vac_dia_adicional_tipo`
- Resultado total: **23 laborales + 1 día (tipo incierto)**

Si no tiene antigüedad suficiente: solo 23 días laborales.  
El engine devuelve ambas reglas de antigüedad independientemente de la antigüedad real (DISEÑO-04).

#### Si el roster NO estuviera implantado
Con `condicionesActivas: []`:
- `tfn_roster_5_3_vac_23_lab` aparece igualmente pero con `condicionado_a` no cumplido
- El consumidor debe ignorarla o mostrarla como "solo si roster vigente"
- `cc_vac_duracion` aplicaría íntegra: 30 días naturales

#### Resultado: CORRECTO con DISEÑO-03/04 a gestionar por consumidor

---

## CASOS LPA {#casos-lpa}

---

### VC-LPA-01 — COP LPA, abril 2026 (pre-roster)

```
ctx: { base: 'LPA', grupo: 'COP', fecha: '2026-04-15' }
```

#### Reglas LPA vigentes
- `lpa_antes_mayo_2026` — vigente (vigencia_hasta: 2026-05-01, fecha < 2026-05-01) ✓
- `lpa_roster_patron` — **NO vigente** (desde: 2026-05-01, fecha < 2026-05-01) ✓
- `lpa_roster_vac_23_lab` — **NO vigente** ✓
- `lpa_actividad_descanso` — **NO vigente** ✓
- `lpa_art80_suspendido` — **NO vigente** ✓

#### Art. 80
- Sin override LPA vigente → `cc_art80_seis_dias` y `cc_art80_fin_semana` plenos ✓

#### `getRosterActivo('LPA', '2026-04-15')`
Devuelve `lpa_antes_mayo_2026` (DISEÑO-05).  
`valor_texto`: "CC estándar íntegro. Sin roster especial en LPA antes de mayo 2026."

Técnicamente correcto, semánticamente algo confuso (una regla que dice "no hay roster"
siendo devuelta como "el roster activo").

#### Sin complemento de base, sin HV +20%
Ninguna regla de MAD_REGLAS aparece (filtrada por base) ✓

#### Resultado: CORRECTO con DISEÑO-05 a atender en UI

---

### VC-LPA-02 — COP LPA, junio 2026 (roster activo)

```
ctx: { base: 'LPA', grupo: 'COP', fecha: '2026-06-15' }
condicionesActivas: ['roster_5_3_implantado']
```

#### Reglas LPA vigentes
- `lpa_antes_mayo_2026` — **NO vigente** (hasta: 2026-05-01, fecha >= 2026-05-01) ✓
- `lpa_roster_patron` — vigente (desde: 2026-05-01, hasta: 2026-11-01) ✓
- `lpa_roster_vac_23_lab` — vigente, condicionado_a: roster_5_3_implantado ✓
- `lpa_actividad_descanso` — vigente ✓
- `lpa_art80_suspendido` — vigente, overrides cc_art80_seis_dias + cc_art80_fin_semana ✓

#### Art. 80
- `cc_art80_seis_dias` — **_overriddenBy: lpa_art80_suspendido** ✓
- `cc_art80_fin_semana` — **_overriddenBy: lpa_art80_suspendido** ✓

#### Vacaciones con roster implantado
- `cc_vac_duracion` — **_overriddenBy: lpa_roster_vac_23_lab** → 23 días laborales ✓

#### Transición observada
En fecha 2026-04-15: `lpa_antes_mayo_2026` vigente, roster no vigente.  
En fecha 2026-05-01: `lpa_antes_mayo_2026` expirada, roster aún no vigente.  
**Hay un momento exacto de corte**: _isVigente con hasta=2026-05-01 y desde=2026-05-01.

- `lpa_antes_mayo_2026`: `fecha >= 2026-05-01` → expirada exactamente en esa fecha
- `lpa_roster_patron`: `fecha < 2026-05-01` → NO vigente, desde el 01/05 sí vigente

En `fecha = 2026-05-01` exacto:
- `lpa_antes_mayo_2026` → expirada ✓ (fecha >= hasta)
- `lpa_roster_patron` → vigente ✓ (fecha >= desde)

La transición funciona correctamente en el límite de fecha.

#### Resultado: CORRECTO

---

### VC-LPA-03 — CMD LPA, noviembre 2026 (expiración acuerdo)

```
ctx: { base: 'LPA', grupo: 'CMD', fecha: '2026-11-15' }
```

#### Reglas LPA temporales — EXPIRADAS
- `lpa_roster_patron` — **EXPIRADO** (hasta: 2026-11-01, fecha 2026-11-15 >= 2026-11-01) ✓
- `lpa_roster_vac_23_lab` — **EXPIRADO** ✓
- `lpa_actividad_descanso` — **EXPIRADO** ✓
- `lpa_art80_suspendido` — **EXPIRADO** ✓

#### Consecuencias de la expiración
- Art. 80 recuperado: `cc_art80_seis_dias` sin `_overriddenBy` ✓
- Vacaciones vuelven a 30 días naturales: `cc_vac_duracion` sin `_overriddenBy` ✓
- Sin actividades en descanso del roster ✓

#### Sin complemento de base (LPA nunca lo tuvo)
- Ninguna regla `mad_comp_*` — filtrada por base ✓

#### Misma limitación que VC-MAD-02: prórroga no modelable
Si el acuerdo LPA se prorroga, el engine no lo sabe.  
`lpa_roster_patron._meta.prorroga_posible: true` es el gancho para alertar.

#### Resultado: CORRECTO técnicamente, advertencia de prórroga igual que MAD.

---

## CASOS PRODUCTIVIDAD {#casos-productividad}

---

### VC-PROD-01 — TDV (CMD), productividad marzo 2026

```
ctx: { base: 'MAD', grupo: 'CMD', fecha: '2026-03-01', categorias: ['productividad'] }
```

#### Reglas que el engine devuelve

| ID | Descripción | Estado |
|---|---|---|
| prod_vigencia | ámbito general 2026 | vigente |
| prod_tdv_co2_objetivo | objetivo 1.628,18 kg CO₂/HB | vigente |
| prod_tdv_ponderacion | 70% combustible / 30% puntualidad | vigente |
| prod_tdv_penalizacion_10pct | -10% si base no alcanza objetivo | vigente |
| prod_puntualidad_comun | cota 15, umbral 80-85% | vigente |
| prod_matrices_ausentes | CRÍTICA — matrices no publicadas | vigente, pendiente_validacion: true |
| prod_tcp_* | **NO** — grupos SCC/TCP |  |

#### Lo que el engine puede informar correctamente
- Objetivo de CO₂: 1.628,18 kg/HB ✓
- Ponderación: combustible 70%, puntualidad 30% ✓
- Puntualidad: cota 15, mínimo 80%, máximo 85% ✓
- Penalización colectiva 10% si no se alcanza objetivo ✓

#### Lo que el engine NO puede resolver
- Importe exacto del bono DPO — **BLOQUEADO por matrices ausentes** ✓
- La regla `prod_matrices_ausentes` aparece con `pendiente_validacion: true`
  y su `nota_critica` es: "BLOQUEA TODO CÁLCULO DE DPO 2026."

#### Resultado: CORRECTO — el sistema comunica correctamente su propia limitación.

---

### VC-PROD-02 — TCP (SCC), DPO abril 2026

```
ctx: { base: 'TFN', grupo: 'SCC', fecha: '2026-04-01', categorias: ['productividad'] }
```

#### Reglas que el engine devuelve

| ID | Descripción | Estado |
|---|---|---|
| prod_vigencia | ámbito 2026 | vigente |
| prod_tcp_servicio_bordo | calidad servicio a bordo | vigente |
| prod_tcp_scc_75pct | condición 75% función SCC | vigente, condicionado |
| prod_tcp_penalizacion_10pct | -10% colectivo | vigente |
| prod_puntualidad_comun | cota 15 | vigente |
| prod_matrices_ausentes | CRÍTICA | vigente, pendiente_validacion: true |
| prod_tdv_* | **NO** — grupos CMD/COP |  |

#### Condición SCC 75%
`prod_tcp_scc_75pct` tiene `condicionado_a: 'scc_funcion_75pct_mes'`.  
Ambigüedad relacionada: `ambig_mad_75pct_funcion` — se reutiliza el mismo tipo de ambigüedad.

**Hueco detectado**: la ambigüedad `ambig_mad_75pct_funcion` está catalogada como
específica de MAD complemento. Para el DPO SCC 75%, la ambigüedad en cuanto a
qué es "función" también aplica, pero no hay un `ambig_id` propio. Ver sección
[Ambigüedades nuevas](#ambiguedades-nuevas).

#### Resultado: CORRECTO con hueco de ambigüedad a crear.

---

## CASOS TRANSVERSALES {#casos-transversales}

---

### VC-VAC-01 — COP con 15 años antigüedad + roster 5+3 activo

```
ctx: { base: 'TFN', grupo: 'COP', fecha: '2026-09-01', categorias: ['vacaciones'] }
antiguedad_real: 15  (no es parámetro del engine — DISEÑO-04)
condicionesActivas: ['roster_5_3_implantado']
```

#### Reglas de vacaciones devueltas

| ID | Aplica a 15 años | Descripción |
|---|---|---|
| cc_vac_duracion | N/A | 30 días — overrideado |
| acta_vac_ant_14_20 | **SÍ** (14-20 años) | +1 día adicional |
| acta_vac_ant_20_plus | No (>20 años) | aparece en engine, consumidor debe filtrar |
| tfn_roster_5_3_vac_23_lab | SÍ (condición cumplida) | 23 días laborales |

#### Cálculo correcto con antigüedad 15 años
- Base: 23 días laborales (roster 5+3 implantado)
- Adicional: +1 día (antigüedad 14-20 años, regla `acta_vac_ant_14_20`)
- Tipo del día adicional: **ambiguo** — `ambig_vac_dia_adicional_tipo`
  - ¿Natural? → total: 23 laborales + 1 natural
  - ¿Laboral? → total: 24 laborales
- **No calcular ni afirmar el total sin confirmar el tipo.**

#### Resultado: CORRECTO con ambigüedad activa bien capturada.

---

### VC-DSC-01 — ELIMINADO

> Este caso fue eliminado. La regla `mad_actividad_descanso` ha sido suprimida del motor
> tras auditoría jurídica (2026-05-31): el CUARTO del Acuerdo Roster MAD+TFN aplica
> exclusivamente al roster 5+3 de TFN (TERCERO). MAD no tiene cobertura normativa para
> actividades en días de descanso.

---

## AMBIGÜEDADES NUEVAS DESCUBIERTAS {#ambiguedades-nuevas}

Los casos de validación revelaron dos huecos no cubiertos por las 8 ambigüedades existentes:

---

### AMBIG-NUEVA-01 — DPO SCC: "función de Sobrecargo" vs "función asignada MAD"

**Origen**: VC-PROD-02  
**Problema**: `prod_tcp_scc_75pct` condiciona el DPO de SCC al 75% de ejercicio de función.
La ambigüedad `ambig_mad_75pct_funcion` existe para el complemento de base MAD,
pero no está referenciada por `prod_tcp_scc_75pct`.

El documento de productividad usa una condición similar pero en un contexto diferente
(DPO vs complemento de base). Puede ser la misma lógica o puede ser una definición distinta.

**Propuesta**: crear `ambig_dpo_scc_funcion_75pct` separada de `ambig_mad_75pct_funcion`
y referenciarla en `prod_tcp_scc_75pct._meta.ambiguedad_id`.

---

### AMBIG-NUEVA-02 — IT y complemento de base MAD: interacción no definida

**Origen**: VC-MAD-04  
**Problema**: ninguna regla trata qué ocurre con el complemento MAD (CMD/COP/SCC/TCP)
durante una baja por IT. La condición "75% función asignada" es el gancho,
pero no hay texto en el documento que defina si los días de baja cuentan o no.

**Esta es distinta de `ambig_mad_75pct_funcion`** (que trata la definición de "función asignada")
porque esta nueva ambigüedad trata específicamente el tratamiento de la baja.

**Propuesta**: crear `ambig_mad_complemento_durante_it` con afecta_reglas: mad_comp_cmd, mad_comp_cop, mad_comp_scc, mad_comp_tcp.

---

## PRIORIDADES MAL RESUELTAS {#prioridades-mal-resueltas}

Los casos de validación NO revelaron errores de prioridad normativa en los datos.
Los overrides entre capas están correctamente modelados:

- L3 (roster) suspende correctamente L1 (Art. 80 del CC) ✓
- L2 (Acta) añade correctamente sobre L1 (vacaciones, licencias) ✓
- Fase 2 (5+3) sustituye correctamente Fase 1 (6+3) cuando ambas vigencias no se solapan ✓
- Gap TFN está correctamente capturado como zona sin cobertura ✓

**El único riesgo de prioridad real está en el engine** (DISEÑO-01/02), no en los datos.
Si el consumidor interpreta `_overriddenBy` como "esta regla ya no aplica" sin comprobar
`tipo_override`, podría silenciar reglas de tipo 'adiciona' que siguen siendo válidas.

---

## RESUMEN EJECUTIVO {#resumen-ejecutivo}

### Estado general de la capa normativa

| Dimensión | Estado |
|---|---|
| Vigencias y fechas | ✅ Correctas en todos los casos |
| Overrides entre bases | ✅ Correctos (MAD no contamina TFN ni LPA) |
| Overrides entre capas L1/L2/L3 | ✅ Correctos |
| Gap TFN julio 2026 | ✅ Modelado explícitamente |
| Transición LPA pre/post mayo 2026 | ✅ Correcta, límites de fecha funcionan |
| Complementos MAD por grupo | ✅ Filtrado correcto por grupo |
| DPO: límite de cálculo comunicado | ✅ prod_matrices_ausentes funciona como blocker |
| Ambigüedades referenciadas | ✅ Accesibles via hasAmbiguedad() |
| Prorrogas no documentadas | ⚠ Limitación inherente: no hay datos |

### Problemas en el engine a corregir antes de UI

| ID | Severidad | Descripción |
|---|---|---|
| DISEÑO-01 | Alta | `tipo_override` ignorado en marcado de _overriddenBy |
| DISEÑO-02 | Media | Múltiples overrides sobre mismo target: último escritor gana |
| DISEÑO-03 | Media | `condicionado_a` no evaluado: responsabilidad del consumidor |
| DISEÑO-04 | Baja-Media | Antigüedad no en ctx: todas las reglas por tramo aparecen |
| DISEÑO-05 | Baja | `lpa_antes_mayo_2026` capturada por getRosterActivo como "roster activo" |

### Ambigüedades pendientes de crear

| ID propuesto | Urgencia |
|---|---|
| `ambig_dpo_scc_funcion_75pct` | Media |
| `ambig_mad_complemento_durante_it` | Alta |

### Veredicto

**La fuente de verdad normativa es sólida.**  
Los 15 casos se resuelven correctamente a nivel de datos.  
Los problemas detectados son todos del motor (engine), no del modelo normativo.  
Antes de construir el primer consumidor UI, deben corregirse DISEÑO-01 y DISEÑO-02.  
DISEÑO-03/04 pueden documentarse como responsabilidad del consumidor si el calendario lo exige.
