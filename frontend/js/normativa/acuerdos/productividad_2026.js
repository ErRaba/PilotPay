/**
 * productividad_2026.js — Acuerdo de Productividad 2026 (DPO)
 *
 * Fuente: Acuerdo de Productividad 2026 — BCSA, firmado 28/11/2025
 *
 * ADVERTENCIA CRÍTICA:
 *   Las matrices de consecución (eficiencia combustible × puntualidad para TDV;
 *   calidad de servicio × puntualidad para TCP) NO están incluidas en el documento.
 *   Sin ellas, el importe exacto del bono DPO NO puede calcularse.
 *   Ver: ambig_matrices_dpo_ausentes en norm_ambiguedades.js
 *
 * Estructura general del DPO 2026:
 *   — TDV (Tripulantes De Vuelo: CMD + COP): dos indicadores, dos matrices
 *     · Eficiencia de combustible (CO₂ vs objetivo)
 *     · Puntualidad colectiva de la base
 *   — TCP (Tripulantes de Cabina de Pasajeros: SCC + TCP): dos indicadores, dos matrices
 *     · Calidad de servicio a bordo (medida externa)
 *     · Puntualidad colectiva de la base
 *
 * El documento no especifica importes máximos ni base de cálculo.
 * El convenio colectivo (CC_REGLAS: cc_hv_tramos_concepto) define el DPO base por rol y tramo.
 * Este archivo documenta solo el ACUERDO DE PRODUCTIVIDAD, no el DPO del CC.
 */

'use strict';

var PROD_REGLAS = [

  // ══════════════════════════════════════════════════════════════
  // VIGENCIA Y ÁMBITO GENERAL
  // ══════════════════════════════════════════════════════════════

  {
    id:        'prod_vigencia',
    categoria: 'productividad',
    titulo:    'Acuerdo de Productividad 2026 — ámbito y vigencia',
    texto:     'El Acuerdo de Productividad 2026 aplica a todo el personal de vuelo de Binter Canarias (CMD, COP, SCC, TCP) en todas las bases (MAD, TFN, LPA y demás). Vigencia: ejercicio 2026. El documento fue firmado el 28/11/2025. No se especifica mecanismo de prórroga.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'ámbito general',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP'],
      condicionado_a: null, overrides: [], tipo_override: 'adiciona',
      temporal: true, prorroga_posible: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // INDICADORES TDV (CMD + COP)
  // ══════════════════════════════════════════════════════════════

  {
    id:        'prod_tdv_co2_objetivo',
    categoria: 'productividad',
    titulo:    'DPO TDV — eficiencia de combustible: objetivo CO₂ por hora de vuelo',
    texto:     'El primer indicador de productividad para TDV (CMD y COP) es la eficiencia de combustible, medida en kg de CO₂ emitidos por hora de bloque. El objetivo establecido en el acuerdo es 1.628,18 kg CO₂ por hora de bloque. El rendimiento se mide mensualmente. La cuantía a percibir viene determinada por la matriz eficiencia de combustible / puntualidad, que NO está publicada en el documento.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'TDV — indicador 1',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP'],
      condicionado_a: null, overrides: [], tipo_override: 'adiciona',
      temporal: true, ambiguedad_id: 'ambig_matrices_dpo_ausentes',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      indicador: 'eficiencia_combustible',
      unidad: 'kg_CO2_por_hora_bloque',
      objetivo: 1628.18,
      medicion: 'mensual',
      importe_determinado_por: 'matriz_eficiencia_x_puntualidad',
      matriz_publicada: false,
    },
  },

  {
    id:        'prod_tdv_ponderacion',
    categoria: 'productividad',
    titulo:    'DPO TDV — ponderación entre eficiencia de combustible y puntualidad',
    texto:     'La cuantía total del DPO para TDV combina dos indicadores con ponderación fija: 70% eficiencia de combustible, 30% puntualidad. La aplicación exacta de la ponderación se realiza mediante las matrices que no están incluidas en el documento.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'TDV — ponderación',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: 'ambig_matrices_dpo_ausentes',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      ponderacion_combustible_pct: 70,
      ponderacion_puntualidad_pct: 30,
    },
  },

  {
    id:        'prod_tdv_penalizacion_10pct',
    categoria: 'productividad',
    titulo:    'DPO TDV — penalización del 10% si la base no alcanza el objetivo de combustible',
    texto:     'Si el colectivo TDV de una base no alcanza el objetivo de eficiencia de combustible en un mes, se aplica una penalización del 10% sobre la cuantía del DPO de ese mes para todos los TDV de la base. La penalización es colectiva, no individual.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'TDV — penalización',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_tabla: {
      penalizacion_pct: 10,
      condicion: 'base_no_alcanza_objetivo_combustible_mensual',
      alcance: 'colectivo_base',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // INDICADOR COMPARTIDO: PUNTUALIDAD (TDV + TCP)
  // ══════════════════════════════════════════════════════════════

  {
    id:        'prod_puntualidad_comun',
    categoria: 'productividad',
    titulo:    'DPO — puntualidad: cota y objetivos (aplica a TDV y TCP)',
    texto:     'La puntualidad es uno de los dos indicadores tanto para TDV como para TCP. Se mide como porcentaje de vuelos con salida en cota 15 (dentro de los primeros 15 minutos de la ventana de salida). Rango de objetivos: el nivel mínimo de activación es el 80% y el objetivo de máxima consecución es el 85%. Por debajo del 80% el indicador de puntualidad no genera bono. Por encima del 85% se consolida en el máximo de la matriz. La puntualidad es colectiva por base.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'puntualidad — indicador compartido',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: 'ambig_matrices_dpo_ausentes',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      metrica: 'cota_15',
      descripcion_cota: 'porcentaje de salidas dentro de los 15 minutos de ventana',
      umbral_minimo_activacion_pct: 80,
      objetivo_maximo_pct: 85,
      bajo_minimo: 'no_genera_bono_puntualidad',
      sobre_maximo: 'consolida_en_maximo_matriz',
      alcance: 'colectivo_base',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // INDICADORES TCP (SCC + TCP)
  // ══════════════════════════════════════════════════════════════

  {
    id:        'prod_tcp_servicio_bordo',
    categoria: 'productividad',
    titulo:    'DPO TCP — calidad de servicio a bordo (indicador 1)',
    texto:     'El primer indicador de productividad para TCP (SCC y TCP) es la calidad de servicio a bordo, medida por un sistema externo de evaluación (no especificado en el documento). La cuantía a percibir viene determinada por la matriz calidad de servicio / puntualidad, que NO está publicada en el documento.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'TCP — indicador 1',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['SCC', 'TCP'],
      condicionado_a: null, overrides: [], tipo_override: 'adiciona',
      temporal: true, ambiguedad_id: 'ambig_matrices_dpo_ausentes',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      indicador: 'calidad_servicio_abordo',
      medicion: 'evaluacion_externa',
      sistema_evaluacion: 'no_especificado_en_documento',
      importe_determinado_por: 'matriz_calidad_x_puntualidad',
      matriz_publicada: false,
    },
  },

  {
    id:        'prod_tcp_scc_75pct',
    categoria: 'productividad',
    titulo:    'DPO SCC — condición del 75% de función: regla específica SCC',
    texto:     'Para las SCC (Sobrecargo), el DPO está condicionado a haber ejercido la función de Sobrecargo como mínimo el 75% del tiempo durante el período de devengo. Si no se alcanza ese porcentaje, el DPO del período correspondiente se pierde o reduce (el documento no especifica el mecanismo exacto). Esta condición NO aplica a TCP ni a TDV.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'SCC — condición función',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['SCC'],
      condicionado_a: 'scc_funcion_75pct_mes',
      overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: 'ambig_mad_75pct_funcion',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      condicion_minima_pct: 75,
      condicion_tipo: 'funcion_sobrecargo_ejercida',
      si_no_alcanza: 'pierde_o_reduce_dpo_periodo',
      mecanismo_exacto_no_especificado: true,
    },
  },

  {
    id:        'prod_tcp_penalizacion_10pct',
    categoria: 'productividad',
    titulo:    'DPO TCP — penalización del 10% si la base no alcanza objetivo de servicio',
    texto:     'Si el colectivo TCP de una base no alcanza el objetivo de calidad de servicio a bordo en un mes, se aplica una penalización del 10% sobre la cuantía del DPO de ese mes para todos los TCP/SCC de la base. La penalización es colectiva, no individual.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'TCP — penalización',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['SCC', 'TCP'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_tabla: {
      penalizacion_pct: 10,
      condicion: 'base_no_alcanza_objetivo_servicio_mensual',
      alcance: 'colectivo_base',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ALERTA CRÍTICA: MATRICES AUSENTES
  // ══════════════════════════════════════════════════════════════

  {
    id:        'prod_matrices_ausentes',
    categoria: 'productividad',
    titulo:    'ALERTA CRÍTICA — matrices de consecución DPO no publicadas',
    texto:     'El Acuerdo de Productividad 2026 hace referencia a dos matrices que determinan los importes exactos del DPO: (1) "Matriz eficiencia de combustible / puntualidad" para TDV, y (2) "Matriz calidad de servicio a bordo / puntualidad" para TCP. Ninguna de las dos matrices aparece en el documento. Sin estas matrices no es posible calcular ni estimar el importe exacto del bono DPO. PilotPay puede explicar el sistema y los factores que influyen, pero NO puede calcular el importe. Requiere que la empresa publique las matrices.',
    _meta: {
      doc: 'productividad_2026', capa: 'L3_ACUERDO', articulo: 'matrices de consecución',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-31',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: 'ambig_matrices_dpo_ausentes',
      pendiente_validacion: true, confianza: 'pendiente',
    },
    valor_texto: 'Sin matrices publicadas: PilotPay NO puede calcular el importe exacto del DPO. Solo puede mostrar los factores y los objetivos.',
    nota_critica: 'BLOQUEA TODO CÁLCULO DE DPO 2026. No inventar ni aproximar sin datos reales.',
  },

];
