/**
 * base_lpa.js — Reglas específicas de la Base LPA (Las Palmas de Gran Canaria)
 *
 * Fuente: Acuerdo Roster Base LPA 28/11/2025 (Acuerdo 2)
 *
 * LPA hereda todo el CC (L1) y el Acta (L2).
 * Las reglas aquí son overrides o adiciones específicas de LPA.
 *
 * ANTES del 01/05/2026: CC común aplica íntegramente. Sin roster especial.
 * DESDE el 01/05/2026: PRUEBA TEMPORAL roster 5+3.
 *   Carácter: prueba, 6 meses con posibilidad de prórroga.
 *   La experiencia de LPA sirve de referencia para TFN (que incorpora desde 01/08/2026).
 *
 * IMPORTANTE:
 *   LPA no tiene "franco después del 5.º día" — con 5 días de actividad el bloque
 *   ya termina en el 5.º, la protección carece de sentido operativo.
 *   LPA no tiene complemento de base específico (solo MAD).
 *   LPA no tiene HV +20% (solo MAD).
 */

'use strict';

var LPA_REGLAS = [

  // ══════════════════════════════════════════════════════════════
  // SITUACIÓN ANTES DE MAYO 2026
  // ══════════════════════════════════════════════════════════════

  {
    id:        'lpa_antes_mayo_2026',
    categoria: 'roster',
    titulo:    'LPA — régimen anterior al roster 5+3 (antes del 01/05/2026)',
    texto:     'Antes del 01/05/2026, LPA opera bajo el Convenio Colectivo estándar, sin roster especial. No existe acuerdo de roster específico para LPA previo a esta fecha. Se aplican íntegramente las reglas del CC (Art. 80 y demás) y las del Acta de Cierre.',
    _meta: {
      doc: 'roster_lpa_2026', capa: 'L1_CC', articulo: 'N/A — referencia contextual',
      vigencia_desde: null, vigencia_hasta: '2026-05-01',
      bases: ['LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
      es_informativa: true,
    },
    valor_texto: 'CC estándar íntegro. Sin roster especial en LPA antes de mayo 2026.',
  },

  // ══════════════════════════════════════════════════════════════
  // ROSTER 5+3 LPA (01/05/2026 → ~01/11/2026)
  // Acuerdo Roster LPA — PRIMERO y SEGUNDO
  // ══════════════════════════════════════════════════════════════

  {
    id:        'lpa_roster_patron',
    categoria: 'roster',
    titulo:    'Roster LPA — patrón 5+3 (PRUEBA TEMPORAL)',
    texto:     'Desde el 01/05/2026, LPA opera en PRUEBA con un roster de 5 días de actividad seguidos de 3 días de descanso. Carácter: PRUEBA TEMPORAL por 6 meses, con posibilidad de prórroga por acuerdo expreso de ambas partes. LPA es la base piloto: su experiencia fundamenta la decisión de TFN de adoptar el mismo modelo desde el 01/08/2026. La suspensión, modificación o no renovación NO genera derecho a compensación económica.',
    _meta: {
      doc: 'roster_lpa_2026', capa: 'L3_ACUERDO', articulo: 'PRIMERO',
      vigencia_desde: '2026-05-01', vigencia_hasta: '2026-11-01',
      nota_vigencia: 'Fecha aproximada (6 meses desde 01/05/2026). Sujeta a prórroga por acuerdo expreso.',
      bases: ['LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null,
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, prorroga_posible: true, suspension_sin_compensacion: true,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      dias_actividad: 5,
      dias_descanso: 3,
      patron: '5+3',
      cupos_max_actividades_no_vuelo: true,
      base_piloto_para_tfn: true,
    },
  },

  {
    id:        'lpa_roster_vac_23_lab',
    categoria: 'vacaciones',
    titulo:    'Vacaciones LPA — 23 días laborales con roster 5+3 implantado',
    texto:     'Cuando el roster 5+3 esté efectivamente implantado en LPA, las vacaciones anuales de Grupos III y IV serán de 23 días laborales (en lugar de los 30 días naturales del CC). Se mantiene el fraccionamiento en hasta 4 períodos. Si el roster 5+3 se cancela o no se prorroga, las vacaciones vuelven automáticamente a 30 días naturales del CC.',
    _meta: {
      doc: 'roster_lpa_2026', capa: 'L3_ACUERDO', articulo: 'QUINTO',
      vigencia_desde: '2026-05-01', vigencia_hasta: '2026-11-01',
      bases: ['LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
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
    id:        'lpa_actividad_descanso',
    categoria: 'actividad_descanso',
    titulo:    'Actividades en descanso — LPA (roster 5+3)',
    texto:     'Con el roster 5+3 activo en LPA, las siguientes actividades pueden programarse en el PRIMER o ÚLTIMO día del bloque de 3 días de descanso, convirtiendo el patrón efectivo en 6+2. Las que SÍ cuentan como actividad operativa (afectan a FDP): formación online, vuelo posicional para simulador/verificaciones, día de oficina (solo personal sin función de responsabilidad), auditorías e inspecciones, competencia lingüística. Las que NO cuentan como actividad operativa (NO afectan a FDP ni descanso mínimo): reconocimiento médico, horas sindicales en días de libranza (si no hay hueco en el bloque de 3, pueden ir al bloque de actividad).',
    _meta: {
      doc: 'roster_lpa_2026', capa: 'L3_ACUERDO', articulo: 'CUARTO',
      vigencia_desde: '2026-05-01', vigencia_hasta: '2026-11-01',
      bases: ['LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
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
      horas_sindicales_nota: 'Si no hay hueco en el bloque de 3, puede programarse en el bloque de actividad.',
      oficina_nota: 'Solo para personal SIN función de responsabilidad. La empresa no ha definido qué cargos quedan excluidos.',
    },
  },

  {
    id:        'lpa_art80_suspendido',
    categoria: 'programacion',
    titulo:    'Protecciones Art. 80 suspendidas en LPA con roster 5+3 activo',
    texto:     'Durante la vigencia del roster 5+3 en LPA, quedan suspendidas las protecciones del Art. 80 sobre: (1) máximo 5 días consecutivos de actividad; (2) fin de semana libre mensual si trabajas todos los fines de semana. El resto del Art. 80 sigue vigente.',
    _meta: {
      doc: 'roster_lpa_2026', capa: 'L3_ACUERDO', articulo: 'SEGUNDO',
      vigencia_desde: '2026-05-01', vigencia_hasta: '2026-11-01',
      bases: ['LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: 'roster_5_3_implantado',
      overrides: ['cc_art80_seis_dias', 'cc_art80_fin_semana'], tipo_override: 'suspende',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
  },

];
