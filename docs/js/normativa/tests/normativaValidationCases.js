/**
 * normativaValidationCases.js — Casos de validación operacional v2
 *
 * Actualizados al formato NormativaEngine v2 (_resolution).
 * Cada caso define el resultado esperado usando la nueva estructura:
 *
 *   esperado.reglas[id]._resolution = {
 *     estado:       'activa' | 'ampliada' | 'condicionada' | 'suspendida' | 'sustituida'
 *     operativa:    true | false | 'desconocida'
 *     modificadores: [{ reglaId, tipo }]
 *     condicion:    null | { id, estado }
 *   }
 *
 * Validación humana — no son asserts automatizados todavía.
 * Ver: docs/VALIDATION_CASES.md para el análisis completo.
 */

'use strict';

var NORM_VALIDATION_CASES = [

  // ══════════════════════════════════════════════════════════════
  // MAD
  // ══════════════════════════════════════════════════════════════

  {
    id:          'VC-MAD-01',
    descripcion: 'COP MAD, marzo 2026 — estado normativo completo',
    ctx: {
      base:  'MAD',
      grupo: 'COP',
      fecha: '2026-03-15',
      condicionesActivas:   [],
      condicionesInactivas: [],
    },
    esperado: {
      reglas: {
        'cc_art80_seis_dias': {
          _resolution: {
            estado:    'suspendida',
            operativa: false,
            modificadores: [{ reglaId: 'mad_art80_suspendido', tipo: 'suspende' }],
          },
        },
        'cc_art80_fin_semana': {
          _resolution: {
            estado:    'suspendida',
            operativa: false,
            modificadores: [{ reglaId: 'mad_art80_suspendido', tipo: 'suspende' }],
          },
        },
        'cc_media_variables': {
          _resolution: {
            estado:    'ampliada',
            operativa: true,
            modificadores: [{ reglaId: 'acta_media_variables_ampliada', tipo: 'adiciona' }],
          },
        },
        'cc_licencias_base': {
          _resolution: {
            estado:    'ampliada',
            operativa: true,
            // modificadores acumulados — todos los tramos de antigüedad presentes
            // (sin filtro antigüedad en ctx → todos pasan)
            modificadores_minimo: 3,
          },
        },
        'cc_vac_duracion': {
          _resolution: {
            estado:    'ampliada',
            operativa: true,
            // adiciona de acta_vac_ant_14_20 y acta_vac_ant_20_plus
            // NO sustituida aquí — sin roster activo en este contexto
          },
        },
        'mad_comp_cop': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
            condicion: { id: 'funcion_asignada_75pct', estado: 'desconocida' },
          },
        },
        'mad_hv_20pct': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
            condicion: { id: 'productividad_11_dias_colectivo', estado: 'desconocida' },
          },
        },
        'mad_art80_suspendido': {
          _resolution: {
            estado:    'activa',
            operativa: true,
            modifica_a: [
              { reglaId: 'cc_art80_seis_dias',  tipo: 'suspende' },
              { reglaId: 'cc_art80_fin_semana', tipo: 'suspende' },
            ],
          },
        },
        'mad_roster_franco_5_dia': {
          _resolution: {
            estado: 'condicionada',
            operativa: 'desconocida',
            condicion: { id: 'roster_6_3_implantado', estado: 'desconocida' },
            // modifica_a: [{ reglaId: 'mad_roster_patron', tipo: 'complementa' }]
          },
        },
        'acta_gratificacion_extraordinaria': null, // NO debe aparecer: expirada
        'mad_comp_cmd': null,  // NO: grupo CMD
        'mad_comp_scc': null,  // NO: grupo SCC
        'tfn_roster_6_3': null, // NO: base TFN
        'lpa_roster_patron': null, // NO: base LPA
        'prod_tcp_servicio_bordo': null, // NO: grupo SCC/TCP
      },
    },
    getRosterActivo_esperado: {
      id:                'mad_roster_patron',
      pendiente_validacion: false,
    },
    ambiguedades_esperadas: [
      'ambig_mad_75pct_funcion',
      'ambig_mad_11_dias_periodo',
      'ambig_media_variables_ajuste_12m',
      'ambig_mad_complemento_durante_it',
    ],
    notas: 'cc_licencias_base ampliada por 3 modificadores (uno por tramo antigüedad). Sin filtro antigüedad → todos pasan.',
  },

  {
    id:          'VC-MAD-02',
    descripcion: 'CMD MAD, julio 2026 — expiración roster, Art.80 recuperado',
    ctx: {
      base:  'MAD',
      grupo: 'CMD',
      fecha: '2026-07-15',
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'mad_roster_patron': null,        // NO: expirado (hasta 2026-07-01)
        'mad_art80_suspendido': null,     // NO: expirado
        'mad_actividad_descanso': null,   // NO: expirado
        'cc_art80_seis_dias': {
          _resolution: {
            estado:    'activa',
            operativa: true,
            modificadores: [],            // sin override activo → recuperado
          },
        },
        'cc_art80_fin_semana': {
          _resolution: {
            estado:    'activa',
            operativa: true,
            modificadores: [],
          },
        },
        'mad_comp_cmd': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',     // condición 75% no verificada
          },
        },
        'mad_hv_20pct': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
          },
        },
      },
    },
    getRosterActivo_esperado: null,       // sin roster L3 vigente en julio
    advertencia: 'Si el acuerdo se prorrogó, el engine no lo refleja. prorroga_posible:true es el gancho para alertar.',
    notas: '_isVigente(mad_roster_patron, 2026-07-15) = false porque 2026-07-15 >= 2026-07-01.',
  },

  {
    id:          'VC-MAD-03',
    descripcion: 'SCC MAD con 74% función — no asumir pérdida del complemento',
    ctx: {
      base:  'MAD',
      grupo: 'SCC',
      fecha: '2026-03-15',
      condicionesActivas:   [],
      condicionesInactivas: [],
    },
    contexto_especial: { funcion_ejercida_pct: 74 },
    esperado: {
      reglas: {
        'mad_comp_scc': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
            condicion: { id: 'funcion_asignada_75pct', estado: 'desconocida' },
          },
        },
      },
    },
    ambiguedades_esperadas: ['ambig_mad_75pct_funcion'],
    acciones_prohibidas: [
      'asumir_perdida_automatica_complemento',
      'calcular_importe_prorrateado',
      'asumir_cobro_integro',
    ],
    notas: 'El engine devuelve mad_comp_scc como condicionada/desconocida. El consumidor muestra la ambigüedad.',
  },

  {
    id:          'VC-MAD-04',
    descripcion: 'TCP MAD en baja por IT — interacción IT × complemento base',
    ctx: {
      base:  'MAD',
      grupo: 'TCP',
      fecha: '2026-04-01',
      condicionesActivas: [],
    },
    contexto_especial: { baja_it_activa: true },
    esperado: {
      reglas: {
        'cc_it_carencia_7_dias': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'cc_it_condiciones_complemento': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'mad_comp_tcp': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
            condicion: { id: 'funcion_asignada_75pct', estado: 'desconocida' },
          },
        },
      },
    },
    ambiguedades_esperadas: [
      'ambig_mad_75pct_funcion',
      'ambig_mad_complemento_durante_it',
    ],
    hueco_normativo: 'Ninguna regla define si los días de IT cuentan para el 75% de función asignada en MAD.',
  },

  // ══════════════════════════════════════════════════════════════
  // TFN
  // ══════════════════════════════════════════════════════════════

  {
    id:          'VC-TFN-01',
    descripcion: 'CMD TFN, febrero 2026 — roster 6+3 Fase 1 activo',
    ctx: {
      base:  'TFN',
      grupo: 'CMD',
      fecha: '2026-02-15',
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'tfn_roster_6_3': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'tfn_roster_6_3_art80_suspendido': {
          _resolution: {
            estado: 'activa',
            operativa: true,
            modifica_a: [
              { reglaId: 'cc_art80_seis_dias',  tipo: 'suspende' },
              { reglaId: 'cc_art80_fin_semana', tipo: 'suspende' },
            ],
          },
        },
        'cc_art80_seis_dias': {
          _resolution: { estado: 'suspendida', operativa: false },
        },
        'cc_art80_fin_semana': {
          _resolution: { estado: 'suspendida', operativa: false },
        },
        'tfn_roster_6_3_franco_5_dia': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
            // complementa tfn_roster_6_3 pero está condicionada a roster_6_3_implantado
          },
        },
        'mad_comp_cmd':  null,  // NO: base MAD
        'mad_hv_20pct':  null,  // NO: base MAD
        'tfn_roster_5_3': null, // NO: no vigente hasta 2026-08-01
        'tfn_gap_julio_agosto': null, // NO: no vigente hasta 2026-07-01
      },
    },
    getRosterActivo_esperado: {
      id:                   'tfn_roster_6_3',
      pendiente_validacion: false,
    },
    notas: 'tfn_roster_6_3_franco_5_dia usa tipo complementa → aparece como modificador de tfn_roster_6_3.',
  },

  {
    id:          'VC-TFN-02',
    descripcion: 'CMD TFN, septiembre 2026 — roster 5+3 Fase 2',
    ctx: {
      base:  'TFN',
      grupo: 'CMD',
      fecha: '2026-09-01',
      condicionesActivas: ['roster_5_3_implantado'],
    },
    esperado: {
      reglas: {
        'tfn_roster_5_3': {
          _resolution: {
            estado: 'activa',
            operativa: true,
            modifica_a: [
              { reglaId: 'cc_art80_seis_dias',  tipo: 'suspende' },
              { reglaId: 'cc_art80_fin_semana', tipo: 'suspende' },
              { reglaId: 'tfn_roster_6_3',      tipo: 'sustituye' }, // redundante pero declarado
            ],
          },
        },
        'tfn_roster_5_3_vac_23_lab': {
          _resolution: {
            estado:    'activa',        // condicion 'roster_5_3_implantado' está activa
            operativa: true,
            modifica_a: [{ reglaId: 'cc_vac_duracion', tipo: 'sustituye' }],
          },
        },
        'cc_vac_duracion': {
          _resolution: {
            estado:    'sustituida',
            operativa: false,
            modificadores: [{ reglaId: 'tfn_roster_5_3_vac_23_lab', tipo: 'sustituye' }],
          },
        },
        'cc_art80_seis_dias': {
          _resolution: { estado: 'suspendida', operativa: false },
        },
        'tfn_roster_6_3':     null, // NO: expirado
        'tfn_gap_julio_agosto': null, // NO: expirado
      },
    },
    getRosterActivo_esperado: {
      id:                   'tfn_roster_5_3',
      pendiente_validacion: false,
    },
  },

  {
    id:          'VC-TFN-03',
    descripcion: 'CMD TFN, julio 2026 — GAP CRÍTICO: zona sin cobertura documentada',
    ctx: {
      base:  'TFN',
      grupo: 'CMD',
      fecha: '2026-07-15',
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'tfn_gap_julio_agosto': {
          _resolution: {
            estado:    'activa',
            operativa: true,            // la regla del gap es la única L3 activa
          },
          _meta_check: { pendiente_validacion: true },
        },
        'cc_art80_seis_dias': {
          _resolution: {
            estado:    'activa',
            operativa: true,
            modificadores: [],          // sin override activo → Art.80 recuperado
          },
        },
        'tfn_roster_6_3':  null,        // NO: expirado (hasta 2026-07-01)
        'tfn_roster_5_3':  null,        // NO: no vigente aún (desde 2026-08-01)
        'tfn_roster_6_3_art80_suspendido': null,
        'tfn_roster_5_3_art80_suspendido': null,
      },
    },
    getRosterActivo_esperado: {
      id:                   'tfn_gap_julio_agosto',
      pendiente_validacion: true,
      nota: 'El gap ES el roster activo — indica incertidumbre, no la ausencia de resultado.',
    },
    critico: 'El consumidor DEBE detectar pendiente_validacion:true y mostrar advertencia.',
    advertencia: 'El engine detecta correctamente el gap. En la práctica, el 6+3 probablemente se prorrogó.',
  },

  {
    id:          'VC-TFN-04',
    descripcion: 'TCP TFN, vacaciones septiembre 2026 — 23 laborales condicionados',
    ctx: {
      base:             'TFN',
      grupo:            'TCP',
      fecha:            '2026-09-01',
      categorias:       ['vacaciones'],
      antiguedad_años:  15,
      condicionesActivas: ['roster_5_3_implantado'],
    },
    esperado: {
      reglas: {
        'cc_vac_duracion': {
          _resolution: { estado: 'sustituida', operativa: false },
        },
        'tfn_roster_5_3_vac_23_lab': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'acta_vac_ant_14_20': {
          _resolution: {
            estado:    'activa',        // antigüedad 15 → dentro del rango 14-20
            operativa: true,
          },
          _meta_check: { antiguedad_rango: { min: 14, max: 20 } },
        },
        'acta_vac_ant_20_plus': null,   // NO: antigüedad 15 < 20 → filtrada por _matchesAntiguedad
        'acta_licencias_ant_7_14': null, // categorias: ['vacaciones'] → excluida
        'acta_licencias_ant_14_20': null, // idem
      },
    },
    ambiguedades_esperadas: ['ambig_vac_dia_adicional_tipo'],
    acciones_prohibidas: [
      'afirmar_total_como_laborales_sin_aclarar_dia_adicional',
      'sumar_1_natural_a_23_laborales_sin_advertir',
    ],
    notas: 'Con antiguedad_años:15, acta_vac_ant_20_plus queda fuera del filtro. Sin DISEÑO-04 ya.',
  },

  // ══════════════════════════════════════════════════════════════
  // LPA
  // ══════════════════════════════════════════════════════════════

  {
    id:          'VC-LPA-01',
    descripcion: 'COP LPA, abril 2026 — CC estándar sin roster especial',
    ctx: {
      base:  'LPA',
      grupo: 'COP',
      fecha: '2026-04-15',
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'lpa_antes_mayo_2026': {
          _resolution: { estado: 'activa', operativa: true },
          _meta_check: { es_informativa: true },
          nota: 'Vigente por fecha. Regla informativa: describe "sin roster" como contexto.',
        },
        'lpa_roster_patron':        null, // NO: desde 2026-05-01
        'lpa_art80_suspendido':     null, // NO: desde 2026-05-01
        'cc_art80_seis_dias': {
          _resolution: { estado: 'activa', operativa: true, modificadores: [] },
        },
        'cc_art80_fin_semana': {
          _resolution: { estado: 'activa', operativa: true, modificadores: [] },
        },
        'mad_comp_cop':  null, // NO: base MAD
        'mad_hv_20pct':  null, // NO: base MAD
      },
    },
    getRosterActivo_esperado: null,
    // lpa_antes_mayo_2026 excluida por es_informativa:true
    notas: 'getRosterActivo devuelve null en pre-mayo LPA (fix DISEÑO-05 aplicado).',
  },

  {
    id:          'VC-LPA-02',
    descripcion: 'COP LPA, junio 2026 — roster 5+3 activo',
    ctx: {
      base:  'LPA',
      grupo: 'COP',
      fecha: '2026-06-15',
      condicionesActivas: ['roster_5_3_implantado'],
    },
    esperado: {
      reglas: {
        'lpa_antes_mayo_2026':  null,  // NO: expirada (hasta 2026-05-01)
        'lpa_roster_patron': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'lpa_art80_suspendido': {
          _resolution: {
            estado: 'activa',
            operativa: true,
            modifica_a: [
              { reglaId: 'cc_art80_seis_dias',  tipo: 'suspende' },
              { reglaId: 'cc_art80_fin_semana', tipo: 'suspende' },
            ],
          },
        },
        'cc_art80_seis_dias': {
          _resolution: { estado: 'suspendida', operativa: false },
        },
        'lpa_roster_vac_23_lab': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'cc_vac_duracion': {
          _resolution: { estado: 'sustituida', operativa: false },
        },
      },
    },
    getRosterActivo_esperado: {
      id: 'lpa_roster_patron',
      pendiente_validacion: false,
    },
  },

  {
    id:          'VC-LPA-03',
    descripcion: 'CMD LPA, noviembre 2026 — expiración acuerdo, CC recuperado',
    ctx: {
      base:  'LPA',
      grupo: 'CMD',
      fecha: '2026-11-15',
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'lpa_roster_patron':    null,  // NO: expirado (hasta 2026-11-01)
        'lpa_art80_suspendido': null,  // NO: expirado
        'lpa_roster_vac_23_lab': null, // NO: expirado
        'cc_art80_seis_dias': {
          _resolution: { estado: 'activa', operativa: true, modificadores: [] },
        },
        'cc_vac_duracion': {
          _resolution: {
            estado:    'ampliada',
            operativa: true,
            // acta_vac_ant_* sigue vigente (permanente)
          },
        },
      },
    },
    getRosterActivo_esperado: null,
    advertencia: 'Si el acuerdo se prorrogó, el engine no lo refleja. prorroga_posible:true es el gancho.',
  },

  // ══════════════════════════════════════════════════════════════
  // PRODUCTIVIDAD
  // ══════════════════════════════════════════════════════════════

  {
    id:          'VC-PROD-01',
    descripcion: 'TDV (CMD MAD), productividad marzo 2026 — matrices ausentes bloquean cálculo',
    ctx: {
      base:       'MAD',
      grupo:      'CMD',
      fecha:      '2026-03-01',
      categorias: ['productividad'],
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'prod_tdv_co2_objetivo': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'prod_tdv_ponderacion': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'prod_tdv_penalizacion_10pct': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'prod_puntualidad_comun': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'prod_matrices_ausentes': {
          _resolution: { estado: 'activa', operativa: true },
          _meta_check: { pendiente_validacion: true },
          nota: 'BLOQUEADOR: importe DPO no calculable.',
        },
        'prod_tcp_servicio_bordo':  null, // NO: grupo SCC/TCP
        'prod_tcp_scc_75pct':       null, // idem
        'prod_tcp_penalizacion_10pct': null, // idem
      },
    },
    informacion_disponible: {
      objetivo_co2_kg_hb:          1628.18,
      ponderacion_combustible_pct: 70,
      ponderacion_puntualidad_pct: 30,
      puntualidad_umbral_min_pct:  80,
      puntualidad_umbral_max_pct:  85,
    },
    calculo_importe_dpo: 'IMPOSIBLE — matrices no publicadas',
  },

  {
    id:          'VC-PROD-02',
    descripcion: 'TCP (SCC TFN), DPO abril 2026 — condición 75% + matrices ausentes',
    ctx: {
      base:       'TFN',
      grupo:      'SCC',
      fecha:      '2026-04-01',
      categorias: ['productividad'],
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'prod_tcp_servicio_bordo': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'prod_tcp_scc_75pct': {
          _resolution: {
            estado:    'condicionada',
            operativa: 'desconocida',
            condicion: { id: 'scc_funcion_75pct_mes', estado: 'desconocida' },
          },
        },
        'prod_matrices_ausentes': {
          _resolution: { estado: 'activa', operativa: true },
          _meta_check: { pendiente_validacion: true },
        },
        'prod_tdv_co2_objetivo': null,  // NO: grupo CMD/COP
        'prod_tdv_ponderacion':  null,  // NO: grupo CMD/COP
      },
    },
    ambiguedades_esperadas: ['ambig_matrices_dpo_ausentes', 'ambig_dpo_scc_funcion_75pct'],
  },

  // ══════════════════════════════════════════════════════════════
  // TRANSVERSALES
  // ══════════════════════════════════════════════════════════════

  {
    id:          'VC-VAC-01',
    descripcion: 'COP TFN 15 años + roster 5+3 — filtro antigüedad + día adicional ambiguo',
    ctx: {
      base:             'TFN',
      grupo:            'COP',
      fecha:            '2026-09-01',
      categorias:       ['vacaciones'],
      antiguedad_años:  15,
      condicionesActivas: ['roster_5_3_implantado'],
    },
    esperado: {
      reglas: {
        'tfn_roster_5_3_vac_23_lab': {
          _resolution: { estado: 'activa', operativa: true },
        },
        'cc_vac_duracion': {
          _resolution: { estado: 'sustituida', operativa: false },
        },
        'acta_vac_ant_14_20': {
          _resolution: { estado: 'activa', operativa: true },
          nota: 'rango 14-20: incluye antigüedad 15 ✓',
        },
        'acta_vac_ant_20_plus': null,  // NO: antigüedad 15 < 20 → filtrado
      },
    },
    resultado_esperado: {
      dias_base:     23,
      tipo_dias:     'laborales',
      dia_adicional: 1,
      tipo_adicional: 'ambiguo',
      ambiguedad:    'ambig_vac_dia_adicional_tipo',
      total_sin_resolver: '23 laborales + 1 día (tipo pendiente de aclaración)',
    },
    acciones_prohibidas: [
      'afirmar_24_dias_laborales',
      'afirmar_23_laborales_mas_1_natural',
    ],
    notas: 'DISEÑO-04 resuelto: acta_vac_ant_20_plus excluida por filtro antiguedad_años.',
  },

  {
    id:          'VC-DSC-01',
    descripcion: 'CMD MAD, oficina en día de descanso — ambigüedad función responsabilidad',
    ctx: {
      base:       'MAD',
      grupo:      'CMD',
      fecha:      '2026-03-15',
      categorias: ['actividad_descanso'],
      condicionesActivas: [],
    },
    esperado: {
      reglas: {
        'mad_actividad_descanso': {
          _resolution: { estado: 'activa', operativa: true },
          nota_consumidor: 'actividades_cuentan_fdp incluye dia_oficina_sin_funcion_responsabilidad. Para CMD: ambiguo.',
        },
      },
    },
    ambiguedades_esperadas: ['ambig_oficina_funcion_responsabilidad'],
    acciones_prohibidas: [
      'afirmar_que_cmd_puede_tener_oficina_en_descanso',
      'afirmar_que_cmd_no_puede_tener_oficina_en_descanso',
    ],
    notas: 'hasAmbiguedad(mad_actividad_descanso) → ambig_oficina_funcion_responsabilidad.',
  },

];

// ── Índice por ID ─────────────────────────────────────────────

var NORM_VALIDATION_INDEX = (function () {
  var idx = {};
  NORM_VALIDATION_CASES.forEach(function (c) { idx[c.id] = c; });
  return idx;
}());
