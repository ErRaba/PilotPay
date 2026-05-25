/**
 * norm_layers.js — Jerarquía normativa PilotPay Convenio
 *
 * Define las capas de prioridad del sistema experto.
 * Mayor nivel → mayor especificidad → prevalece sobre capas inferiores
 * DENTRO de su scope (base + fecha + grupos).
 *
 * Fuente: arquitectura interna PilotPay (no es un documento oficial)
 */

'use strict';

var NORM_LAYERS = {
  L1_CC:             { nivel: 1, label: 'Convenio Colectivo',  permanente: true,  color: 'blue'   },
  L2_ACTA:           { nivel: 2, label: 'Acta de Cierre',      permanente: true,  color: 'blue'   },
  L3_ACUERDO:        { nivel: 3, label: 'Acuerdo específico',  permanente: false, color: 'amber'  },
  L4_PRACTICA:       { nivel: 4, label: 'Práctica empresa',    permanente: false, color: 'green'  },
  L5_INTERPRETACION: { nivel: 5, label: 'Interpretación',      permanente: false, color: 'text3'  },
};

// Regla de resolución cuando dos normas colisionan en el mismo scope:
//   1. Mayor nivel gana.
//   2. Si mismo nivel: la más reciente gana.
//   3. Si misma fecha y mismo nivel: marcar ambigüedad explícita.
// Un L3 SOLO prevalece sobre L1/L2 si su scope (base + fechas) es aplicable.
// Si el acuerdo L3 vence o se cancela, el L1/L2 subyacente recupera plena vigencia.

var NORM_TIPOS_OVERRIDE = {
  'adiciona':    'La regla añade un derecho o beneficio nuevo. La regla base sigue siendo operativa como punto de partida.',
  'sustituye':   'La regla reemplaza completamente a la base. La regla base queda no operativa mientras la sustituta está vigente.',
  'suspende':    'La regla desactiva temporalmente la base. Cuando la suspensora expire, la base recupera plena vigencia.',
  'complementa': 'La regla añade detalle operativo o contexto de aplicación sin añadir derechos nuevos. La base sigue operativa.',
};

var NORM_CONFIANZA = {
  'documentado':       'Texto literal del documento fuente — sin interpretación.',
  'verificado_nomina': 'Contrastado además con nóminas reales.',
  'pendiente':         'Pendiente de validación o aclaración. No usar en producción.',
};

var NORM_CONDICIONES = {
  'roster_5_3_implantado':            'El roster 5+3 está actualmente vigente en la base.',
  'roster_6_3_implantado':            'El roster 6+3 está actualmente vigente en la base.',
  'productividad_11_dias_colectivo':  'La media colectiva de la base MAD es ≥11 días vuelo/mes (dato empresa, no verificable por la app).',
  'funcion_asignada_75pct':           'El tripulante ha estado ≥75% en su función asignada mensual (dato empresa, no verificable por la app).',
  'scc_funcion_75pct_mes':            'El tripulante ejerce como SCC ≥75% del tiempo mensual.',
};
