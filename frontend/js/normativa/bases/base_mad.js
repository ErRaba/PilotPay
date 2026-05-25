/**
 * base_mad.js — Reglas específicas de la Base MAD
 *
 * Fuentes:
 *   - Acta de Cierre 28/11/2025, §SÉPTIMO (complemento base + HV +20%)
 *   - Acuerdo Roster MAD+TFN 28/11/2025, cláusulas PRIMERO/SEGUNDO/CUARTO
 *
 * Capa: L2_ACTA (complemento y HV) + L3_ACUERDO (roster)
 *
 * MAD hereda todo el CC (L1) y el Acta (L2).
 * Las reglas aquí son adicionales o overrides para esta base específicamente.
 *
 * ANTES del 01/01/2026: sin roster, sin complemento MAD.
 * DESDE el 01/01/2026: roster 6+3 TEMPORAL (6 meses + prórroga).
 * Si el roster se cancela: CC y Acta recuperan plena vigencia.
 * Las reglas MAD de complemento (§SÉPTIMO) son PERMANENTES independientemente del roster.
 */

'use strict';

var MAD_REGLAS = [

  // ══════════════════════════════════════════════════════════════
  // COMPLEMENTO DE BASE MAD (§SÉPTIMO Acta de Cierre)
  // Permanente. No depende del roster.
  // ══════════════════════════════════════════════════════════════

  {
    id:        'mad_comp_cmd',
    categoria: 'complementos',
    titulo:    'Complemento de base MAD — Comandante',
    texto:     'Los CMD destinados en MAD perciben un complemento de base de 18.000€ brutos anuales (1.500€ brutos mensuales). Condición: haber estado como mínimo el 75% de la función asignada mensualmente. El documento no define qué es "función asignada".',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SÉPTIMO punto 2',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD'], grupos: ['CMD'],
      condicionado_a: 'funcion_asignada_75pct',
      overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_mad_75pct_funcion',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      importe_anual_bruto: 18000,
      importe_mensual_bruto: 1500,
      condicion_minima_pct: 75,
      condicion_tipo: 'funcion_asignada_mensual',
    },
  },

  {
    id:        'mad_comp_cop',
    categoria: 'complementos',
    titulo:    'Complemento de base MAD — Copiloto',
    texto:     'Los COP destinados en MAD perciben 10.000€ brutos anuales (833,33€ brutos mensuales). Misma condición del 75% de función asignada mensualmente.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SÉPTIMO punto 2',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD'], grupos: ['COP'],
      condicionado_a: 'funcion_asignada_75pct',
      overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_mad_75pct_funcion',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      importe_anual_bruto: 10000,
      importe_mensual_bruto: 833.33,
      condicion_minima_pct: 75,
      condicion_tipo: 'funcion_asignada_mensual',
    },
  },

  {
    id:        'mad_comp_scc',
    categoria: 'complementos',
    titulo:    'Complemento de base MAD — Sobrecargo (SCC)',
    texto:     'Las SCC destinadas en MAD perciben 15.000€ brutos anuales (1.250€ brutos mensuales). Misma condición del 75% de función asignada mensualmente.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SÉPTIMO punto 2',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD'], grupos: ['SCC'],
      condicionado_a: 'funcion_asignada_75pct',
      overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_mad_75pct_funcion',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      importe_anual_bruto: 15000,
      importe_mensual_bruto: 1250,
      condicion_minima_pct: 75,
      condicion_tipo: 'funcion_asignada_mensual',
    },
  },

  {
    id:        'mad_comp_tcp',
    categoria: 'complementos',
    titulo:    'Complemento de base MAD — TCP',
    texto:     'Las TCP destinadas en MAD perciben 4.800€ brutos anuales (400€ brutos mensuales). Misma condición del 75% de función asignada mensualmente.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SÉPTIMO punto 2',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD'], grupos: ['TCP'],
      condicionado_a: 'funcion_asignada_75pct',
      overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_mad_75pct_funcion',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      importe_anual_bruto: 4800,
      importe_mensual_bruto: 400,
      condicion_minima_pct: 75,
      condicion_tipo: 'funcion_asignada_mensual',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // HV +20% MAD (§SÉPTIMO Acta de Cierre)
  // Permanente. Condicionado a productividad colectiva.
  // ══════════════════════════════════════════════════════════════

  {
    id:        'mad_hv_20pct',
    categoria: 'hv',
    titulo:    'HV +20% — condicionado a productividad colectiva MAD',
    texto:     'El valor de TODAS las horas de vuelo (todos los tramos T1-T4) se incrementa en un 20% para la base MAD, siempre que la productividad media del colectivo se mantenga en 11 días de vuelo por tripulante. Si la productividad varía, se revisará con la representación legal de los trabajadores. El +20% NO cae automáticamente: requiere revisión formal.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SÉPTIMO punto 1',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD'], grupos: ['CMD', 'COP', 'SCC', 'TCP'],
      condicionado_a: 'productividad_11_dias_colectivo',
      overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_mad_11_dias_periodo',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      incremento_pct: 20,
      afecta_tramos: ['T1', 'T2', 'T3', 'T4'],
      condicion_dias_vuelo_media: 11,
      condicion_tipo: 'colectivo_base_mad',
      mecanismo_si_varia: 'revision_con_rlt',
      suspension_automatica: false,
    },
    nota_critica: 'El +20% es COLECTIVO: no depende del desempeño individual sino de la media de toda la base MAD. La app no puede verificar si la condición se cumple — es un dato de la empresa.',
  },

  // ══════════════════════════════════════════════════════════════
  // ROSTER MAD 6+3 (Acuerdo Roster MAD+TFN — PRIMERO/SEGUNDO)
  // TEMPORAL: 6 meses desde 01/01/2026 + posible prórroga
  // ══════════════════════════════════════════════════════════════

  {
    id:        'mad_roster_patron',
    categoria: 'roster',
    titulo:    'Roster MAD — patrón 6+3 (TEMPORAL)',
    texto:     'Desde el 01/01/2026, MAD opera con un roster fijo de 6 días de actividad seguidos de 3 días de descanso. Carácter TEMPORAL: 6 meses con posibilidad de prórroga si ambas partes lo acuerdan expresamente. La suspensión, modificación o no renovación NO genera derecho a compensación económica.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      nota_vigencia: 'Fecha aproximada (6 meses). Sujeta a prórroga por acuerdo expreso.',
      bases: ['MAD'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null,
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, prorroga_posible: true, suspension_sin_compensacion: true,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      dias_actividad: 6,
      dias_descanso: 3,
      patron: '6+3',
      cupos_max_actividades_no_vuelo: true,
      empresa_puede_adaptar_causas_operativas: true,
    },
  },

  {
    id:        'mad_roster_franco_5_dia',
    categoria: 'roster',
    titulo:    'Roster MAD — intento de franco después del 5.º día',
    texto:     'La empresa procurará asignar un franco después del quinto día de actividad, salvo causas organizativas justificadas. Estas causas deberán ser comunicadas al comité de empresa. Nota: el texto usa "procurará", no "deberá". No es una obligación absoluta.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['MAD'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: ['mad_roster_patron'], tipo_override: 'complementa',
      temporal: true, ambiguedad_id: 'ambig_franco_5_dia_alcance',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_texto: '"Procurará" — intención, no obligación. Causas org. justificadas eximen a la empresa.',
  },

  {
    id:        'mad_roster_sexto_dia_compensacion',
    categoria: 'roster',
    titulo:    'Roster MAD — compensación si se activa el 6.º día',
    texto:     'Si se activa el franco correspondiente al 6.º día (es decir, si el tripulante trabaja ese día en lugar del franco), la empresa intentará asignar un día libre al inicio del siguiente ciclo de actividad. El texto usa "intentará" — es un compromiso de buena fe, no una garantía.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['MAD'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: ['mad_roster_patron'], tipo_override: 'complementa',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_texto: '"Intentará" — compromiso de buena fe. No garantía. La empresa puede no compensar.',
  },

  // ══════════════════════════════════════════════════════════════
  // ACTIVIDADES EN DESCANSO — MAD (Acuerdo Roster — CUARTO)
  // Aplica mientras el roster esté vigente
  // ══════════════════════════════════════════════════════════════

  {
    id:        'mad_actividad_descanso',
    categoria: 'actividad_descanso',
    titulo:    'Actividades que pueden meterse en tus 3 días de descanso — MAD',
    texto:     'Con el roster 6+3 activo en MAD, las siguientes actividades pueden programarse en el PRIMER o ÚLTIMO día del bloque de 3 días de descanso. Cuando ocurre, el patrón efectivo pasa a ser 6 días actividad + 2 días libres. Las actividades que SÍ cuentan como actividad operativa (afectan a FDP): formación online, vuelo posicional para simulador/verificaciones, día de oficina (solo personal sin función de responsabilidad), auditorías e inspecciones, competencia lingüística. Las actividades que NO cuentan como actividad operativa (NO afectan a FDP ni descanso mínimo): reconocimiento médico, horas sindicales solicitadas en días de libranza (si no hay hueco en el bloque de 3, pueden ir al bloque de actividad).',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'CUARTO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['MAD'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: [], tipo_override: 'adiciona',
      temporal: true, ambiguedad_id: 'ambig_oficina_funcion_responsabilidad',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      dia_en_descanso: 'primero_o_ultimo',
      patron_resultante: '6+2',
      actividades_cuentan_fdp: [
        'formacion_no_presencial_online',
        'vuelo_posicional_simulador_verificaciones',
        'dia_oficina_sin_funcion_responsabilidad',
        'auditorias_e_inspecciones',
        'competencia_linguistica',
      ],
      actividades_no_cuentan_fdp: [
        'reconocimiento_medico',
        'horas_sindicales_en_libranza',
      ],
      horas_sindicales_nota: 'Si no hay día disponible en el bloque de 3, puede programarse en el bloque de actividad.',
      oficina_nota: 'Solo para personal SIN función de responsabilidad. La empresa no ha definido qué cargos tienen función de responsabilidad.',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // ART. 80 SUSPENDIDO — MAD (Acuerdo Roster — SEGUNDO)
  // ══════════════════════════════════════════════════════════════

  {
    id:        'mad_art80_suspendido',
    categoria: 'programacion',
    titulo:    'Protecciones Art. 80 suspendidas en MAD con roster activo',
    texto:     'Con el roster 6+3 activo, quedan en suspenso estas dos protecciones del Art. 80 del CC: (1) la que impide programar 6 o más días seguidos de actividad; (2) la que garantiza un fin de semana libre al mes si trabajas todos los fines de semana. El resto del Art. 80 sigue vigente.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'SEGUNDO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['MAD'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_texto: 'Suspendidas: protección 6 días consecutivos + protección fin de semana mensual.',
  },

];
