/**
 * norm_docs.js — Catálogo de documentos normativos PilotPay Convenio
 *
 * Cada entrada describe un documento fuente.
 * Las reglas reales están en los archivos de datos (common/, bases/, acuerdos/).
 * Este archivo es el registro de vigencias y metadatos de los documentos.
 *
 * IMPORTANTE: vigencia_hasta con fecha aproximada está marcado con nota_vigencia.
 */

'use strict';

var NORM_DOCS = {

  // ─── L1: Convenio Colectivo ──────────────────────────────────────────────

  'cc_bcsa2026': {
    id:              'cc_bcsa2026',
    nombre:          'Convenio Colectivo BCSA 2026',
    nombre_corto:    'CC BCSA 2026',
    referencia:      'BOE-A-2026-6389',
    fecha_firma:     '2025-11-28',
    vigencia_desde:  '2026-01-01',
    vigencia_hasta:  '2031-12-31',
    capa:            'L1_CC',
    temporal:        false,
    prorroga:        false,
    bases:           ['MAD', 'TFN', 'LPA'],
    grupos:          ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
    overrides_sobre: [],
    archivo_datos:   'common/convenio_general.js',
  },

  // ─── L2: Acta de Cierre ──────────────────────────────────────────────────

  'acta_cierre_2025': {
    id:              'acta_cierre_2025',
    nombre:          'Acta de Cierre Mesa Negociadora BCSA',
    nombre_corto:    'Acta de Cierre 2025',
    referencia:      null,
    fecha_firma:     '2025-11-28',
    vigencia_desde:  '2026-01-01',
    vigencia_hasta:  null,
    capa:            'L2_ACTA',
    temporal:        false,
    prorroga:        false,
    bases:           ['MAD', 'TFN', 'LPA'],
    grupos:          ['CMD', 'COP', 'SCC', 'TCP'],
    overrides_sobre: ['cc_bcsa2026'],
    archivo_datos:   'common/acta_cierre.js',
    nota:            'Modifica permanentemente Arts. 37, 41 y Media de Variables. Añade reglas exclusivas MAD (§SÉPTIMO).',
  },

  // ─── L3: Acuerdos temporales ─────────────────────────────────────────────

  'productividad_2026': {
    id:              'productividad_2026',
    nombre:          'Acuerdo Dirección por Objetivo año 2026',
    nombre_corto:    'DPO 2026',
    referencia:      null,
    fecha_firma:     '2025-11-28',
    vigencia_desde:  '2026-01-01',
    vigencia_hasta:  '2026-12-31',
    capa:            'L3_ACUERDO',
    temporal:        true,
    prorroga:        false,
    prorroga_requiere: null,
    renovacion_nota: 'NO se renueva automáticamente. Requiere nuevo acuerdo expreso para 2027.',
    bases:           ['MAD', 'TFN', 'LPA'],
    grupos:          ['CMD', 'COP', 'SCC', 'TCP'],
    overrides_sobre: [],
    archivo_datos:   'acuerdos/productividad_2026.js',
  },

  'roster_mad_tfn_2026': {
    id:              'roster_mad_tfn_2026',
    nombre:          'Acuerdo Roster MAD+TFN — patrón 6+3',
    nombre_corto:    'Roster MAD+TFN 6+3',
    referencia:      null,
    fecha_firma:     '2025-11-28',
    vigencia_desde:  '2026-01-01',
    vigencia_hasta:  '2026-07-01',
    nota_vigencia:   'Fecha aproximada: el documento dice "6 meses" sin día exacto de vencimiento. Prórroga requiere acuerdo expreso de ambas partes.',
    capa:            'L3_ACUERDO',
    temporal:        true,
    caracter:        'temporal',
    prorroga:        true,
    prorroga_requiere: 'acuerdo_expreso_ambas_partes',
    suspension_sin_compensacion: true,
    bases:           ['MAD', 'TFN'],
    grupos:          ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
    overrides_sobre: ['cc_bcsa2026'],
    archivo_datos:   'bases/base_mad.js + bases/base_tfn.js',
    nota:            'TFN tiene también roster_tfn_5_3_2026 desde 01/08/2026.',
  },

  'roster_tfn_5_3_2026': {
    id:              'roster_tfn_5_3_2026',
    nombre:          'Acuerdo Roster TFN — prueba patrón 5+3',
    nombre_corto:    'Roster TFN 5+3',
    referencia:      null,
    fecha_firma:     '2025-11-28',
    vigencia_desde:  '2026-08-01',
    vigencia_hasta:  '2027-02-01',
    nota_vigencia:   'Fecha aproximada: 6 meses desde 01/08/2026. Prórroga requiere acuerdo expreso.',
    capa:            'L3_ACUERDO',
    temporal:        true,
    caracter:        'prueba_temporal',
    prorroga:        true,
    prorroga_requiere: 'acuerdo_expreso_ambas_partes',
    suspension_sin_compensacion: true,
    bases:           ['TFN'],
    grupos:          ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
    overrides_sobre: ['cc_bcsa2026', 'roster_mad_tfn_2026'],
    archivo_datos:   'bases/base_tfn.js',
    ambiguedad_ids:  ['ambig_tfn_gap_julio_agosto'],
  },

  'roster_lpa_2026': {
    id:              'roster_lpa_2026',
    nombre:          'Acuerdo Roster LPA — prueba patrón 5+3',
    nombre_corto:    'Roster LPA 5+3',
    referencia:      null,
    fecha_firma:     '2025-11-28',
    vigencia_desde:  '2026-05-01',
    vigencia_hasta:  '2026-11-01',
    nota_vigencia:   'Fecha aproximada: 6 meses desde 01/05/2026. Prórroga requiere acuerdo expreso.',
    capa:            'L3_ACUERDO',
    temporal:        true,
    caracter:        'prueba_temporal',
    prorroga:        true,
    prorroga_requiere: 'acuerdo_expreso_ambas_partes',
    suspension_sin_compensacion: true,
    bases:           ['LPA'],
    grupos:          ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
    overrides_sobre: ['cc_bcsa2026'],
    archivo_datos:   'bases/base_lpa.js',
    nota:            'Antes del 01/05/2026 LPA aplica CC común sin roster.',
  },

};
