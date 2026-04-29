import { euros } from '../config/constants.js';
import { FUENTES } from '../config/sourceRegistry.js';
import { auditStep } from './audit.js';

export function getTramosParams({ diasMes = 30, diasVacaciones = 0, reduccionPct = 0 } = {}) {
  const dias = Math.max(1, Number(diasMes) || 30);
  const vac = Math.max(0, Math.min(dias, Number(diasVacaciones) || 0));
  const factorVac = (dias - vac) / dias;
  const factorReduccion = 1 - Math.max(0, Math.min(100, Number(reduccionPct) || 0)) / 100;
  const factor = euros(factorVac * factorReduccion);
  return {
    diasMes: dias,
    diasVacaciones: vac,
    reduccionPct: Number(reduccionPct) || 0,
    factor,
    horasBase: Math.round(60 * factor),
    anchoTramo: Math.round(10 * factor),
  };
}

export function distribuirHV(totalHV, params = {}) {
  const tramos = getTramosParams(params);
  const { horasBase, anchoTramo } = tramos;
  const total = Math.max(0, Number(totalHV) || 0);
  const exceso = Math.max(0, total - horasBase);
  return {
    horasBase,
    anchoTramo,
    t1: euros(Math.min(exceso, anchoTramo)),
    t2: euros(Math.min(Math.max(exceso - anchoTramo, 0), anchoTramo)),
    t3: euros(Math.min(Math.max(exceso - anchoTramo * 2, 0), anchoTramo)),
    t4: euros(Math.max(exceso - anchoTramo * 3, 0)),
  };
}

export function auditarDistribucionHV(totalHV, params = {}) {
  const tramos = getTramosParams(params);
  const distribucion = distribuirHV(totalHV, params);
  return {
    tramos,
    distribucion,
    audit: [auditStep({
      codigo: 'HV_TRAMOS_PROPORCIONALES',
      concepto: 'Reducción proporcional de umbrales de horas de vuelo',
      formula: 'factor = ((diasMes - diasVacaciones) / diasMes) * (1 - reduccionPct / 100); HB = round(60 * factor); ancho = round(10 * factor)',
      entradas: { totalHV, ...tramos },
      resultado: distribucion,
      fuente: FUENTES.CONVENIO_ART_40.id,
      notas: ['El convenio habla de reducción en igual proporción; el redondeo operativo debe validarse contra nóminas reales.'],
    })],
  };
}
