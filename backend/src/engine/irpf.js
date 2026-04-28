import { euros } from '../config/constants.js';
import { FUENTES } from '../config/sourceRegistry.js';
import { auditStep } from './audit.js';

export const IRPF_2026 = Object.freeze({
  UMBRALES_NO_RETENCION: {
    situacion1: [0, 17644, 18694],
    situacion2: [17197, 18130, 19262],
    situacion3: [15876, 16342, 16867],
  },
  ESCALA_RETENCION: [
    { desde: 0, cuota: 0, hastaTramo: 12450, tipo: 0.19 },
    { desde: 12450, cuota: 2365.50, hastaTramo: 7750, tipo: 0.24 },
    { desde: 20200, cuota: 4225.50, hastaTramo: 15000, tipo: 0.30 },
    { desde: 35200, cuota: 8725.50, hastaTramo: 24800, tipo: 0.37 },
    { desde: 60000, cuota: 17901.50, hastaTramo: 240000, tipo: 0.45 },
    { desde: 300000, cuota: 125901.50, hastaTramo: Infinity, tipo: 0.47 },
  ],
  GASTO_GENERAL_ART_19_2_F: 2000,
  MINIMO_CONTRIBUYENTE: 5550,
  MINIMO_MAYOR_65: 1150,
  MINIMO_MAYOR_75_ADICIONAL: 1400,
  MINIMO_DESCENDIENTES: [2400, 2700, 4000, 4500],
  INCREMENTO_MENOR_3: 2800,
  REDUCCION_RENDIMIENTOS_TRABAJO: {
    LIMITE: 19747.50,
    TRAMO1_HASTA: 14852,
    TRAMO1_IMPORTE: 7302,
    TRAMO2_HASTA: 17673.52,
    TRAMO2_FACTOR: 1.75,
    TRAMO3_BASE: 2364.34,
    TRAMO3_FACTOR: 1.14,
  },
  LIMITE_CUOTA_ART_85_3: 35200,
  PORCENTAJE_LIMITE_CUOTA: 0.43,
  VIVIENDA_HABITUAL_UMBRAL: 33007.20,
  VIVIENDA_HABITUAL_REDUCCION_TIPO: 2,
});

function clampNum(value, { min = 0, max = Infinity } = {}) {
  const n = Number(value) || 0;
  return Math.max(min, Math.min(max, n));
}

function hijosComputables(descendientes = []) {
  return Math.min(2, (Array.isArray(descendientes) ? descendientes : []).filter(d => d?.computable !== false).length);
}

export function minimoExcluidoRetencion({ situacion = 'situacion3', descendientes = [] } = {}) {
  const key = ['situacion1', 'situacion2', 'situacion3'].includes(situacion) ? situacion : 'situacion3';
  const idx = hijosComputables(descendientes);
  return IRPF_2026.UMBRALES_NO_RETENCION[key][idx];
}

export function aplicarEscalaRetencion(base) {
  const b = Math.max(0, Number(base) || 0);
  let tramo = IRPF_2026.ESCALA_RETENCION[0];
  for (const t of IRPF_2026.ESCALA_RETENCION) {
    if (b >= t.desde) tramo = t;
  }
  const exceso = Math.max(0, b - tramo.desde);
  return euros(tramo.cuota + exceso * tramo.tipo);
}

export function calcularReduccionRendimientosTrabajo(rendimientoNetoPrevio) {
  const r = Math.max(0, Number(rendimientoNetoPrevio) || 0);
  const cfg = IRPF_2026.REDUCCION_RENDIMIENTOS_TRABAJO;
  let reduccion = 0;
  if (r < cfg.LIMITE) {
    if (r <= cfg.TRAMO1_HASTA) {
      reduccion = cfg.TRAMO1_IMPORTE;
    } else if (r <= cfg.TRAMO2_HASTA) {
      reduccion = cfg.TRAMO1_IMPORTE - cfg.TRAMO2_FACTOR * (r - cfg.TRAMO1_HASTA);
    } else {
      reduccion = cfg.TRAMO3_BASE - cfg.TRAMO3_FACTOR * (r - cfg.TRAMO2_HASTA);
    }
  }
  return euros(Math.min(Math.max(0, reduccion), r));
}

export function calcularMinimoPersonalFamiliar({ edad = 0, descendientes = [] } = {}) {
  let minimo = IRPF_2026.MINIMO_CONTRIBUYENTE;
  const e = Number(edad) || 0;
  if (e >= 65) minimo += IRPF_2026.MINIMO_MAYOR_65;
  if (e >= 75) minimo += IRPF_2026.MINIMO_MAYOR_75_ADICIONAL;

  const lista = (Array.isArray(descendientes) ? descendientes : []).filter(d => d?.computable !== false);
  lista.forEach((d, i) => {
    const baseDesc = IRPF_2026.MINIMO_DESCENDIENTES[Math.min(i, IRPF_2026.MINIMO_DESCENDIENTES.length - 1)];
    const menor3 = Number(d?.edad) < 3 ? IRPF_2026.INCREMENTO_MENOR_3 : 0;
    const porcentaje = d?.porcentajeComputo === 100 || d?.exclusivo === true ? 1 : 0.5;
    minimo += (baseDesc + menor3) * porcentaje;
  });
  return euros(minimo);
}

export function calcularTipoRetencionReglamentario(input = {}, { audit = false } = {}) {
  const retribucionesAnuales = euros(input.retribucionesAnuales);
  const ssAnual = euros(input.ssAnual || 0);
  const reduccionesIrregulares = euros(input.reduccionesIrregulares || 0);
  const pensionesCompensatorias = euros(input.pensionCompensatoriaConyuge || 0);
  const situacion = input.situacion || 'situacion3';
  const descendientes = Array.isArray(input.descendientes) ? input.descendientes : [];
  const minimoExcluido = minimoExcluidoRetencion({ situacion, descendientes });
  const trazas = [];

  if (retribucionesAnuales <= 0) {
    return { tipo: 0, cuotaAnual: 0, baseRetencion: 0, minimoPersonalFamiliar: 0, retribucionesAnuales, audit: trazas, avisos: ['Sin retribuciones anuales: retención cero.'] };
  }

  if (retribucionesAnuales <= minimoExcluido) {
    if (audit) trazas.push(auditStep({
      codigo: 'IRPF_ART_81_NO_RETENCION',
      concepto: 'Límite cuantitativo excluyente de retención',
      formula: 'si retribucionesAnuales <= mínimo excluido por situación familiar => tipo 0',
      entradas: { retribucionesAnuales, situacion, hijosComputables: hijosComputables(descendientes), minimoExcluido },
      resultado: 0,
      fuente: FUENTES.IRPF_REGLAMENTO_ART_81.id,
    }));
    return { tipo: 0, cuotaAnual: 0, baseRetencion: 0, minimoPersonalFamiliar: 0, retribucionesAnuales, minimoExcluido, audit: trazas, avisos: [] };
  }

  const gastoGeneral = Math.min(IRPF_2026.GASTO_GENERAL_ART_19_2_F, Math.max(0, retribucionesAnuales - reduccionesIrregulares - ssAnual));
  const rendimientoNetoPrevio = euros(Math.max(0, retribucionesAnuales - reduccionesIrregulares - ssAnual));
  const reduccionRdt = calcularReduccionRendimientosTrabajo(rendimientoNetoPrevio);
  const baseRetencion = euros(Math.max(0, retribucionesAnuales - reduccionesIrregulares - ssAnual - gastoGeneral - reduccionRdt - pensionesCompensatorias));
  const minimoPersonalFamiliar = calcularMinimoPersonalFamiliar(input);

  const cuotaEscalaBase = aplicarEscalaRetencion(baseRetencion);
  const cuotaEscalaMinimo = aplicarEscalaRetencion(minimoPersonalFamiliar);
  let cuotaAnual = euros(Math.max(0, cuotaEscalaBase - cuotaEscalaMinimo));

  if (retribucionesAnuales <= IRPF_2026.LIMITE_CUOTA_ART_85_3) {
    const limiteCuota = euros(Math.max(0, retribucionesAnuales - minimoExcluido) * IRPF_2026.PORCENTAJE_LIMITE_CUOTA);
    cuotaAnual = Math.min(cuotaAnual, limiteCuota);
    if (audit) trazas.push(auditStep({
      codigo: 'IRPF_ART_85_3_LIMITE_CUOTA',
      concepto: 'Límite máximo de cuota para retribuciones no superiores a 35.200 €',
      formula: 'cuota <= 43% * (retribucionesAnuales - mínimo excluido art. 81)',
      entradas: { retribucionesAnuales, minimoExcluido, limiteCuota },
      resultado: cuotaAnual,
      fuente: FUENTES.IRPF_REGLAMENTO_ART_85.id,
    }));
  }

  let tipo = euros((cuotaAnual / retribucionesAnuales) * 100);
  if (baseRetencion <= minimoPersonalFamiliar) tipo = 0;

  if (input.deduccionViviendaHabitual === true && retribucionesAnuales < IRPF_2026.VIVIENDA_HABITUAL_UMBRAL) {
    tipo = euros(Math.max(0, tipo - IRPF_2026.VIVIENDA_HABITUAL_REDUCCION_TIPO));
  }

  if (input.contratoDuracionInferiorAnio === true) {
    tipo = Math.max(tipo, 2);
  }

  const retencionMensual = euros((Number(input.retribucionMensualSujeta) || 0) * tipo / 100);

  if (audit) {
    trazas.unshift(auditStep({
      codigo: 'IRPF_ART_82_PROCEDIMIENTO',
      concepto: 'Procedimiento general de retención sobre rendimientos del trabajo',
      formula: 'base art.83 -> mínimo art.84 -> cuota art.85 -> tipo art.86',
      entradas: { retribucionesAnuales, ssAnual, situacion, descendientes },
      resultado: { baseRetencion, minimoPersonalFamiliar, cuotaAnual, tipo },
      fuente: FUENTES.IRPF_REGLAMENTO_ART_82.id,
    }));
    trazas.push(auditStep({
      codigo: 'IRPF_ART_83_BASE',
      concepto: 'Base para calcular el tipo de retención',
      formula: 'retribucionesAnuales - SS - gasto general art.19.2.f - reducción rendimientos trabajo - pensión compensatoria',
      entradas: { retribucionesAnuales, reduccionesIrregulares, ssAnual, gastoGeneral, rendimientoNetoPrevio, reduccionRdt, pensionesCompensatorias },
      resultado: baseRetencion,
      fuente: FUENTES.IRPF_REGLAMENTO_ART_83.id,
    }));
    trazas.push(auditStep({
      codigo: 'IRPF_ART_84_MINIMO',
      concepto: 'Mínimo personal y familiar para retención',
      formula: 'mínimo contribuyente + descendientes computados por mitad salvo derecho exclusivo',
      entradas: { edad: input.edad || 0, descendientes },
      resultado: minimoPersonalFamiliar,
      fuente: FUENTES.IRPF_REGLAMENTO_ART_84.id,
    }));
    trazas.push(auditStep({
      codigo: 'IRPF_ART_85_CUOTA',
      concepto: 'Cuota anual de retención',
      formula: 'escala(baseRetencion) - escala(minimoPersonalFamiliar)',
      entradas: { baseRetencion, cuotaEscalaBase, minimoPersonalFamiliar, cuotaEscalaMinimo },
      resultado: cuotaAnual,
      fuente: FUENTES.IRPF_REGLAMENTO_ART_85.id,
    }));
    trazas.push(auditStep({
      codigo: 'IRPF_ART_86_TIPO',
      concepto: 'Tipo de retención',
      formula: 'tipo = 100 * cuotaAnual / retribucionesAnuales, con dos decimales',
      entradas: { cuotaAnual, retribucionesAnuales },
      resultado: tipo,
      fuente: FUENTES.IRPF_REGLAMENTO_ART_86.id,
    }));
  }

  return {
    tipo,
    cuotaAnual,
    baseRetencion,
    minimoPersonalFamiliar,
    minimoExcluido,
    retribucionesAnuales,
    ssAnual,
    gastoGeneral,
    rendimientoNetoPrevio,
    reduccionRendimientosTrabajo: reduccionRdt,
    retencionMensual,
    audit: trazas,
    avisos: [
      'Motor IRPF reglamentario core: no cubre todavía todos los casos especiales del modelo 145 ni regularizaciones complejas intraanuales.',
      'Las variables previsibles se estiman desde la nómina actual si no se informa retribucionesAnuales explícitamente.',
    ],
  };
}

export function calcularRetencionPorcentaje(baseRetencion, porcentaje) {
  return euros((Number(baseRetencion) || 0) * (Number(porcentaje) || 0) / 100);
}
