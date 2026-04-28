import { SS_2026, euros } from '../config/constants.js';
import { FUENTES } from '../config/sourceRegistry.js';
import { auditStep } from './audit.js';

export function calcularSolidaridadTrabajador2026(baseSinTope) {
  const exceso = Math.max(0, euros(baseSinTope - SS_2026.BASE_MAX_MENSUAL));
  const tramo1Base = Math.min(exceso, euros(SS_2026.BASE_MAX_MENSUAL * 0.10));
  const tramo2Base = Math.min(Math.max(exceso - tramo1Base, 0), euros(SS_2026.BASE_MAX_MENSUAL * 0.40));
  const tramo3Base = Math.max(exceso - tramo1Base - tramo2Base, 0);
  const t1 = euros(tramo1Base * SS_2026.SOLIDARIDAD_T1);
  const t2 = euros(tramo2Base * SS_2026.SOLIDARIDAD_T2);
  const t3 = euros(tramo3Base * SS_2026.SOLIDARIDAD_T3);
  return { exceso, tramo1Base, tramo2Base, tramo3Base, t1, t2, t3, total: euros(t1 + t2 + t3) };
}

export function calcularSSTrabajador(baseCotizableSinTope, { audit = false } = {}) {
  const baseSS = Math.min(euros(baseCotizableSinTope), SS_2026.BASE_MAX_MENSUAL);
  const cc = euros(baseSS * SS_2026.CC_TRABAJADOR);
  const mei = euros(baseSS * SS_2026.MEI_TRABAJADOR);
  const dfp = euros(baseSS * SS_2026.DESEMPLEO_FP_TRABAJADOR);
  const solidaridad = calcularSolidaridadTrabajador2026(baseCotizableSinTope);
  const total = euros(cc + mei + dfp + solidaridad.total);
  const resultado = {
    baseSS,
    baseCotizableSinTope: euros(baseCotizableSinTope),
    cc,
    mei,
    desempleoFormacion: dfp,
    solidaridad,
    total,
  };
  if (!audit) return resultado;
  return {
    ...resultado,
    audit: [
      auditStep({
        codigo: 'SS_BASE_TOPADA',
        concepto: 'Base de cotización mensual topada',
        formula: 'baseSS = min(baseCotizableSinTope, baseMaximaMensual)',
        entradas: { baseCotizableSinTope, baseMaximaMensual: SS_2026.BASE_MAX_MENSUAL },
        resultado: baseSS,
        fuente: FUENTES.SS_ORDEN_2026.id,
      }),
      auditStep({
        codigo: 'SS_TRABAJADOR',
        concepto: 'Cuota Seguridad Social trabajador',
        formula: 'baseSS * (CC + MEI + desempleo/formacion) + solidaridad(exceso)',
        entradas: { baseSS, ccTipo: SS_2026.CC_TRABAJADOR, meiTipo: SS_2026.MEI_TRABAJADOR, dfpTipo: SS_2026.DESEMPLEO_FP_TRABAJADOR, solidaridad: solidaridad.total },
        resultado: total,
        fuente: FUENTES.SS_ORDEN_2026.id,
      }),
    ],
  };
}
