/**
 * acta_cierre.js — Modificaciones permanentes del Acta de Cierre (28/11/2025)
 *
 * Fuente: Acta de Cierre de la Mesa Negociadora del CC Binter Canarias
 * Firmada en Telde el 28 de noviembre de 2025.
 *
 * Capa: L2_ACTA — modifica permanentemente el CC BCSA 2026.
 * Estas reglas prevalecen sobre L1_CC en todos los scope que aplican.
 *
 * NOTAS DE CONTENIDO:
 * - §SÉPTIMO (reglas exclusivas MAD) están en bases/base_mad.js
 * - §CUARTO (gratificación extraordinaria) fue un pago puntual antes del 15/01/2026.
 *   Se documenta aquí por trazabilidad histórica pero ya está ejecutado.
 */

'use strict';

var ACTA_REGLAS = [

  // ══════════════════════════════════════════════════════════════
  // LICENCIAS RETRIBUIDAS ADICIONALES POR ANTIGÜEDAD (§PRIMERO)
  // Modifica: Art. 37 CC — Licencias retribuidas
  // ══════════════════════════════════════════════════════════════

  {
    id:        'acta_licencias_ant_7_14',
    categoria: 'licencias',
    titulo:    'Licencias retribuidas adicionales — antigüedad 7-14 años',
    texto:     'Los tripulantes de Grupos III y IV con antigüedad entre 7 y 14 años pueden solicitar 4 días de licencia retribuida adicional al año (sin necesidad de causa legalmente establecida). Petición con mínimo 45 días de antelación al mes de disfrute (salvo urgencia grave). Se entiende concedida si no hay respuesta 15 días antes. Concesión por orden de petición y antigüedad en caso de coincidencia. Sujeta a disponibilidad operativa.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§PRIMERO — modifica Art. 37',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_licencias_base'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
      antiguedad_rango: { min: 7, max: 14 },
    },
    valor_tabla: {
      dias_lrc: 4,
      rango_antiguedad_min_años: 7,
      rango_antiguedad_max_años: 14,
      preaviso_dias: 45,
      silencio_positivo_dias_antes: 15,
      sujeta_disponibilidad_operativa: true,
    },
  },

  {
    id:        'acta_licencias_ant_14_20',
    categoria: 'licencias',
    titulo:    'Licencias retribuidas adicionales — antigüedad 14-20 años',
    texto:     '5 días de licencia retribuida adicional para tripulantes de Grupos III y IV con antigüedad entre 14 y 20 años. Mismas condiciones de petición y concesión que el tramo anterior.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§PRIMERO — modifica Art. 37',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_licencias_base'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
      antiguedad_rango: { min: 14, max: 20 },
    },
    valor_tabla: {
      dias_lrc: 5,
      rango_antiguedad_min_años: 14,
      rango_antiguedad_max_años: 20,
      preaviso_dias: 45,
      silencio_positivo_dias_antes: 15,
      sujeta_disponibilidad_operativa: true,
    },
  },

  {
    id:        'acta_licencias_ant_20_plus',
    categoria: 'licencias',
    titulo:    'Licencias retribuidas adicionales — antigüedad más de 20 años',
    texto:     '6 días de licencia retribuida adicional para tripulantes de Grupos III y IV con más de 20 años de antigüedad. Mismas condiciones.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§PRIMERO — modifica Art. 37',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_licencias_base'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
      antiguedad_rango: { min: 20, max: null },
    },
    valor_tabla: {
      dias_lrc: 6,
      rango_antiguedad_min_años: 20,
      rango_antiguedad_max_años: null,
      preaviso_dias: 45,
      silencio_positivo_dias_antes: 15,
      sujeta_disponibilidad_operativa: true,
    },
  },

  // ══════════════════════════════════════════════════════════════
  // VACACIONES: DÍAS ADICIONALES POR ANTIGÜEDAD (§SEGUNDO)
  // Modifica: Art. 41 CC — Vacaciones
  // ══════════════════════════════════════════════════════════════

  {
    id:        'acta_vac_ant_14_20',
    categoria: 'vacaciones',
    titulo:    'Día adicional de vacaciones — antigüedad 14-20 años',
    texto:     'Grupos III y IV con antigüedad entre 14 y 20 años tienen +1 día adicional sobre la duración de vacaciones establecida. La empresa asigna este día preferentemente junto con alguno de los períodos de vacaciones ya asignados.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SEGUNDO — modifica Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_vac_duracion'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_vac_dia_adicional_tipo', pendiente_validacion: false,
      confianza: 'documentado',
      antiguedad_rango: { min: 14, max: 20 },
    },
    valor_tabla: {
      dias_adicionales: 1,
      rango_antiguedad_min_años: 14,
      rango_antiguedad_max_años: 20,
      asignacion: 'empresa_preferentemente_junto_vacaciones_previas',
    },
  },

  {
    id:        'acta_vac_ant_20_plus',
    categoria: 'vacaciones',
    titulo:    'Día adicional de vacaciones — antigüedad más de 20 años',
    texto:     'Grupos III y IV con más de 20 años de antigüedad tienen +1 día adicional sobre la duración de vacaciones establecida. La empresa lo asigna preferentemente junto con algún período de vacaciones previo.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SEGUNDO — modifica Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_vac_duracion'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_vac_dia_adicional_tipo', pendiente_validacion: false,
      confianza: 'documentado',
      antiguedad_rango: { min: 20, max: null },
    },
    valor_tabla: {
      dias_adicionales: 1,
      rango_antiguedad_min_años: 20,
      rango_antiguedad_max_años: null,
      asignacion: 'empresa_preferentemente_junto_vacaciones_previas',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // MEDIA DE VARIABLES: ALCANCE AMPLIADO (§TERCERO)
  // Modifica: concepto "Media de variables" del CC
  // ══════════════════════════════════════════════════════════════

  {
    id:        'acta_media_variables_ampliada',
    categoria: 'vacaciones',
    titulo:    'Media de variables — todos los conceptos variables incluidos',
    texto:     'Además de los conceptos variables del CC, se incluirán TODOS los conceptos variables retribuidos al trabajador en el cálculo de la media de variables. Esta ampliación del alcance es permanente.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§TERCERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_media_variables'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: 'ambig_media_variables_ajuste_12m',
      pendiente_validacion: false, confianza: 'documentado',
    },
  },

  {
    id:        'acta_media_variables_ajuste_12m',
    categoria: 'vacaciones',
    titulo:    'Media de variables — ajuste al nuevo modelo retributivo (12 meses)',
    texto:     'Durante los 12 meses siguientes a la firma del convenio (hasta aproximadamente noviembre/diciembre 2026), la media de variables se ajustará al "nuevo modelo retributivo". El documento no define exactamente qué cambia en el cálculo.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§TERCERO',
      vigencia_desde: '2026-01-01', vigencia_hasta: '2026-12-01',
      nota_vigencia: 'Aproximada: 12 meses desde la firma (28/11/2025).',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], tipo_override: null,
      temporal: true, ambiguedad_id: 'ambig_media_variables_ajuste_12m',
      pendiente_validacion: true, confianza: 'pendiente',
    },
    nota_pendiente: 'El documento menciona el ajuste pero no lo define. Pendiente de confirmación empresa.',
  },

  // ══════════════════════════════════════════════════════════════
  // REDUCCIÓN DE JORNADA: EXTENSIÓN A VACACIONES Y LNR (§SEXTO)
  // Extiende: principio de proporcionalidad HV
  // ══════════════════════════════════════════════════════════════

  {
    id:        'acta_reduccion_hv_vacaciones_lnr',
    categoria: 'reduccion_jornada',
    titulo:    'Reducción de jornada — tramos HV también en vacaciones y LNR',
    texto:     'Cuando hay reducción de jornada activa, los tramos de horas de vuelo se reducen en la misma proporción. Esta reducción se aplica también durante los períodos de vacaciones y de licencia no retribuida (LNR), no solo durante los días laborables.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§SEXTO',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: ['cc_reduccion_jornada'], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // NIVEL 1+ (§QUINTO)
  // Nuevos niveles salariales — no base-específicos
  // ══════════════════════════════════════════════════════════════

  {
    id:        'acta_nivel_1_plus_tcp',
    categoria: 'tablas_salariales',
    titulo:    'Nivel 1+ para Grupo III (TCP/SCC/CC)',
    texto:     'Nuevo nivel salarial 1+ para Grupo III. Acceso no automático — condiciones no especificadas explícitamente para TCP en el documento.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§QUINTO',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['TCP', 'SCC', 'CC'],
      condicionado_a: null, overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_tabla: {
      salario_base_mes: 956.50,
      extra1_mes: 79.70,
      extra2_mes: 79.70,
      hv_t1_ord: 11.25,
      hv_t2_ord: 15.19,
      hv_t3_ord: 18.00,
      hv_t4_ord: 20.25,
      hv_t1_rot: 13.75,
      hv_t2_rot: 18.56,
      hv_t3_rot: 22.00,
      hv_t4_rot: 24.75,
      libre_volado_menos_24h: 250.00,
      libre_volado_24_72h: 150.00,
      libre_volado_mas_72h: 100.00,
      plus_sobrecargo_reactor_dia: 22.00,
      destacamento_nac_dia: 20.07,
      destacamento_int_dia: 28.89,
      dieta_nac_dia: 34.13,
      supl_int_dia: 13.00,
      supl_pernocta_nac_dia: 17.86,
      supl_pernocta_int_dia: 34.67,
    },
  },

  {
    id:        'acta_nivel_1_plus_cmd',
    categoria: 'tablas_salariales',
    titulo:    'Nivel 1+ para Comandantes (Grupo IV)',
    texto:     'Nuevo nivel salarial 1+ para CMD. Requisitos de acceso: (1) Tener asignadas funciones de comandante y ostentar el cargo. (2) Informe de valoración técnica y desempeño favorable. (3) Antigüedad mínima 15 años en la compañía. (4) Haber permanecido 10 años en el nivel 1 de la tabla salarial del CC.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§QUINTO',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD'],
      condicionado_a: null, overrides: [], tipo_override: 'adiciona',
      temporal: false, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    valor_tabla: {
      requisitos: {
        cargo_cmd_activo: true,
        informe_tecnico_favorable: true,
        antiguedad_minima_años: 15,
        años_en_nivel_1: 10,
      },
      salario_base_mes: 5351.28,
      extra1_mes: 445.94,
      extra2_mes: 445.94,
      hv_0_40: 0,
      hv_40_60: 0,
      hv_60_70: 98.32,
      hv_70_80: 109.14,
      hv_80_90: 118.97,
      hv_mas_90: 131.75,
      libre_volado_menos_24h: 800.00,
      libre_volado_24_72h: 525.00,
      libre_volado_mas_72h: 400.00,
      destacamento_nac_dia: 44.65,
      destacamento_int_dia: 44.65,
      dieta_nac_dia: 40.14,
      supl_int_dia: 33.45,
      supl_pernocta_nac_dia: 18.96,
      supl_pernocta_int_dia: 61.33,
      plus_transporte_mes: 200.70,
    },
  },

  // ══════════════════════════════════════════════════════════════
  // GRATIFICACIÓN EXTRAORDINARIA (§CUARTO) — HISTÓRICO
  // Pago único antes del 15/01/2026 — ya ejecutado
  // ══════════════════════════════════════════════════════════════

  {
    id:        'acta_gratificacion_extraordinaria',
    categoria: 'historico',
    titulo:    'Gratificación extraordinaria puntual (pagada en enero 2026)',
    texto:     'Pago único realizado antes del 15/01/2026. TCP con alta continua desde 01/01/2020 y sin cambio de nivel: 1.000€. COP con alta continua desde 01/01/2020 y sin cambio de nivel: 2.500€. CMD sin cambio de nivel: 6.900€. CMD con cambio de nivel: 2.500€. Requisito común: estar en alta en la empresa en la fecha de firma y haber permanecido ininterrumpidamente.',
    _meta: {
      doc: 'acta_cierre_2025', capa: 'L2_ACTA', articulo: '§CUARTO',
      vigencia_desde: '2025-11-28', vigencia_hasta: '2026-01-15',
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'TCP'],
      condicionado_a: null, overrides: [], tipo_override: 'adiciona',
      temporal: true, ambiguedad_id: null, pendiente_validacion: false,
      confianza: 'documentado',
    },
    nota: 'Pago ya ejecutado. Se documenta por trazabilidad histórica.',
    valor_tabla: {
      tcp_importe: 1000,
      cop_importe: 2500,
      cmd_sin_cambio_nivel_importe: 6900,
      cmd_con_cambio_nivel_importe: 2500,
      fecha_limite_pago: '2026-01-15',
      requisito_alta_desde: '2020-01-01',
      requisito_continuidad: true,
    },
  },

];
