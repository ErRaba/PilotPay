/**
 * base_tfn.js — Reglas específicas de la Base TFN
 *
 * Fuente: Acuerdo Roster MAD+TFN 28/11/2025 (cláusulas PRIMERO/SEGUNDO/TERCERO/CUARTO/QUINTO)
 *
 * TFN hereda todo el CC (L1) y el Acta (L2).
 * Las reglas aquí son overrides o adiciones específicas de TFN.
 *
 * TFN tiene DOS fases de roster en 2026:
 *
 *   FASE 1 — 01/01/2026 → ~01/07/2026 (o prórroga):
 *     Roster 6+3, TEMPORAL, mismo acuerdo que MAD.
 *
 *   FASE 2 — 01/08/2026 → ~01/02/2027 (o prórroga):
 *     Roster 5+3, PRUEBA TEMPORAL.
 *     Justificado "en función de la experiencia de LPA".
 *     LPA empieza antes (01/05/2026) y TFN incorpora aprendizajes desde agosto.
 *
 * AMBIGÜEDAD CRÍTICA: qué ocurre en TFN entre ~01/07 y 01/08/2026.
 *   Ver: ambig_tfn_gap_julio_agosto en norm_ambiguedades.js
 *
 * Las reglas de complemento MAD (HV +20%, comp_base) NO aplican a TFN.
 * TFN no tiene complemento de base específico ni HV diferencial.
 */

'use strict';

var TFN_REGLAS = [

  // ══════════════════════════════════════════════════════════════
  // FASE 1: ROSTER 6+3 TFN (01/01/2026 → ~01/07/2026)
  // Mismo acuerdo que MAD — PRIMERO del Acuerdo Roster MAD+TFN
  // ══════════════════════════════════════════════════════════════

  {
    id:        'tfn_roster_6_3',
    categoria: 'roster',
    titulo:    'Roster TFN — Fase 1: patrón 6+3 (TEMPORAL)',
    texto:     'Desde el 01/01/2026, TFN opera con un roster fijo de 6 días de actividad seguidos de 3 días de descanso. Carácter TEMPORAL: 6 meses con posibilidad de prórroga por acuerdo expreso de ambas partes. Es el mismo acuerdo que MAD (cláusula PRIMERO). La suspensión, modificación o no renovación NO genera derecho a compensación económica.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      nota_vigencia: 'Fecha aproximada (6 meses desde 01/01/2026). Sujeta a prórroga por acuerdo expreso. Ver ambigüedad sobre gap con Fase 2.',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null,
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, prorroga_posible: true, suspension_sin_compensacion: true,
      ambiguedad_id: 'ambig_tfn_gap_julio_agosto', pendiente_validacion: false,
      confianza: 'documentado',
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
    id:        'tfn_roster_6_3_franco_5_dia',
    categoria: 'roster',
    titulo:    'Roster TFN Fase 1 — franco después del 5.º día',
    texto:     'El PRIMERO del Acuerdo MAD+TFN establece expresamente que aplica "a la Base de Madrid y Tenerife". Ese mismo cláusula incluye el compromiso de que la empresa "procurará" asignar un franco después del 5.º día de servicio, salvo causas organizativas justificadas. El uso de "procurará" indica intención, no obligación.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: ['tfn_roster_6_3'], tipo_override: 'complementa',
      temporal: true, ambiguedad_id: null,
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_texto: '"Procurará" — intención, no obligación. Causas organizativas justificadas eximen a la empresa. Aplica a MAD y TFN (cláusula PRIMERO del mismo acuerdo).',
  },

  {
    id:        'tfn_roster_6_3_sexto_dia',
    categoria: 'roster',
    titulo:    'Roster TFN Fase 1 — compensación si se activa el 6.º día',
    texto:     'Si se activa el franco correspondiente al 6.º día de actividad en TFN (el tripulante trabaja ese día en lugar del franco), la empresa intentará asignar un día libre al inicio del siguiente ciclo de actividad. El texto usa "intentará" — compromiso de buena fe, no garantía. Esta cláusula está en el PRIMERO del Acuerdo MAD+TFN, que aplica expresamente a ambas bases.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: ['tfn_roster_6_3'], tipo_override: 'complementa',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_texto: '"Intentará" — compromiso de buena fe. No garantía. La empresa puede no compensar.',
  },

  {
    id:        'tfn_roster_6_3_actividad_descanso',
    categoria: 'actividad_descanso',
    titulo:    'Actividades en descanso — TFN Fase 1 (6+3)',
    texto:     'Con el roster 6+3 activo en TFN, las siguientes actividades pueden programarse en el PRIMER o ÚLTIMO día del bloque de 3 días de descanso, convirtiendo el patrón efectivo en 6+2. Las que SÍ cuentan como actividad operativa (afectan a FDP): formación online, vuelo posicional para simulador/verificaciones, día de oficina (solo personal sin función de responsabilidad), auditorías e inspecciones, competencia lingüística. Las que NO cuentan como actividad operativa (NO afectan a FDP ni descanso mínimo): reconocimiento médico, horas sindicales en días de libranza.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'CUARTO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
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
      horas_sindicales_nota: 'Si no hay hueco en el bloque de 3, puede ir al bloque de actividad.',
    },
  },

  {
    id:        'tfn_roster_6_3_art80_suspendido',
    categoria: 'programacion',
    titulo:    'Protecciones Art. 80 suspendidas en TFN — Fase 1 (6+3)',
    texto:     'Durante la vigencia del roster 6+3 en TFN, quedan suspendidas las protecciones del Art. 80 sobre: (1) máximo 5 días consecutivos de actividad; (2) fin de semana libre mensual si trabajas todos los fines de semana.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'SEGUNDO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-07-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_6_3_implantado',
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // GAP TFN: ~01/07/2026 → 01/08/2026
  // ══════════════════════════════════════════════════════════════

  {
    id:        'tfn_gap_julio_agosto',
    categoria: 'roster',
    titulo:    'TFN — Zona de transición no documentada (julio-agosto 2026)',
    texto:     'El roster 6+3 de TFN vence en torno al 01/07/2026 (6 meses desde el inicio). El roster 5+3 (Fase 2) comienza el 01/08/2026. El documento no especifica qué régimen aplica en TFN durante ese intervalo. Posibles situaciones: (a) el 6+3 se prorroga expresamente hasta el 01/08, (b) TFN vuelve temporalmente al CC común, (c) acuerdo no documentado. Esta incertidumbre requiere confirmación oficial.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO + TERCERO',
      vigencia_desde: '2026-07-01', vigencia_hasta: '2026-08-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: 'ambig_tfn_gap_julio_agosto',
      pendiente_validacion: true, confianza: 'pendiente',
    },
    valor_texto: 'Período de régimen incierto. No calcular ni afirmar nada sobre este intervalo sin confirmación.',
  },

  // ══════════════════════════════════════════════════════════════
  // FASE 2: ROSTER 5+3 TFN (01/08/2026 → ~01/02/2027)
  // Cláusula TERCERO del Acuerdo Roster MAD+TFN — solo TFN
  // ══════════════════════════════════════════════════════════════

  {
    id:        'tfn_roster_5_3',
    categoria: 'roster',
    titulo:    'Roster TFN — Fase 2: prueba patrón 5+3 (PRUEBA TEMPORAL)',
    texto:     'Desde el 01/08/2026, TFN pasa a operar en PRUEBA con un roster de 5 días de actividad seguidos de 3 días de descanso. Carácter: PRUEBA TEMPORAL por 6 meses con posibilidad de prórroga. La empresa justifica esta transición "en función de las pruebas y experiencia adquirida en la base de Las Palmas" (LPA inicia el 01/05/2026). La suspensión, modificación o no renovación NO genera derecho a compensación.',
    _meta: {
      doc: 'roster_tfn_5_3_2026', capa: 'L3_ACUERDO', articulo: 'TERCERO',
      vigencia_desde: '2026-08-01', vigencia_hasta: '2027-02-01',
      nota_vigencia: 'Fecha aproximada (6 meses desde 01/08/2026).',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null,
      overrides: ['tfn_roster_6_3', 'cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'sustituye',
      temporal: true, prorroga_posible: true, suspension_sin_compensacion: true,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      dias_actividad: 5,
      dias_descanso: 3,
      patron: '5+3',
      cupos_max_actividades_no_vuelo: true,
    },
  },

  {
    id:        'tfn_roster_5_3_vac_23_lab',
    categoria: 'vacaciones',
    titulo:    'Vacaciones TFN — 23 días laborales con roster 5+3 implantado',
    texto:     'Cuando el roster 5+3 esté efectivamente implantado en TFN, las vacaciones anuales de Grupos III y IV serán de 23 días laborales (en lugar de los 30 días naturales del CC). Se mantiene el fraccionamiento en hasta 4 períodos. Si el roster 5+3 se cancela o no se prorroga, las vacaciones vuelven automáticamente a 30 días naturales.',
    _meta: {
      doc: 'roster_tfn_5_3_2026', capa: 'L3_ACUERDO', articulo: 'QUINTO',
      vigencia_desde: '2026-08-01', vigencia_hasta: '2027-02-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_5_3_implantado',
      overrides: ['cc_vac_duracion'], tipo_override: 'sustituye',
      temporal: true, ambiguedad_id: 'ambig_vac_dia_adicional_tipo',
      pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      dias_vacaciones: 23,
      tipo_dias: 'laborales',
      max_periodos: 4,
      condicion: 'roster_5_3_efectivamente_implantado',
      si_se_cancela_roster: 'vuelve_a_30_dias_naturales_CC',
    },
  },

  {
    id:        'tfn_roster_5_3_actividad_descanso',
    categoria: 'actividad_descanso',
    titulo:    'Actividades en descanso — TFN Fase 2 (5+3)',
    texto:     'Con el roster 5+3 activo en TFN, las mismas actividades pueden programarse en el PRIMER o ÚLTIMO día del bloque de 3 días de descanso. Cuando ocurre, el patrón efectivo pasa a 6+2 (5+1 de descanso usado = 6 actividad, 2 libres). Las que SÍ cuentan como actividad (afectan FDP): formación online, vuelo posicional simulador/verificaciones, día de oficina (sin función de responsabilidad), auditorías, competencia lingüística. Las que NO cuentan (no afectan FDP): reconocimiento médico, horas sindicales en días de libranza.',
    _meta: {
      doc: 'roster_mad_tfn_2026', capa: 'L3_ACUERDO', articulo: 'CUARTO',
      nota_documental: 'El TERCERO del Acuerdo MAD+TFN establece el roster 5+3 para TFN. El CUARTO del mismo documento regula las actividades en descanso para "esta programación de roster fijo", que incluye ambas fases (6+3 y 5+3).',
      vigencia_desde: '2026-08-01', vigencia_hasta: '2027-02-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_5_3_implantado',
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
    },
  },

  {
    id:        'tfn_roster_5_3_art80_suspendido',
    categoria: 'programacion',
    titulo:    'Protecciones Art. 80 suspendidas en TFN — Fase 2 (5+3)',
    texto:     'Durante la vigencia del roster 5+3 en TFN, se mantiene la suspensión de las mismas protecciones del Art. 80: (1) máximo 5 días consecutivos; (2) fin de semana libre si trabajas todos los fines de semana del mes.',
    _meta: {
      doc: 'roster_tfn_5_3_2026', capa: 'L3_ACUERDO', articulo: 'SEGUNDO',
      vigencia_desde: '2026-08-01', vigencia_hasta: '2027-02-01',
      bases: ['TFN'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_5_3_implantado',
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
  },

];
