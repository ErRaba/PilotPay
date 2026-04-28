import { TABLAS } from '../config/salaryTables.js';
import { DIETAS, ESPECIE, euros } from '../config/constants.js';
import { FUENTES } from '../config/sourceRegistry.js';
import { auditStep } from './audit.js';
import { calcularSSTrabajador } from './ss2026.js';
import { auditarDistribucionHV } from './tramos.js';
import { calcularRetencionPorcentaje, calcularTipoRetencionReglamentario } from './irpf.js';

function nivelIndex(nivel) {
  const n = Number(nivel) || 1;
  return Math.max(0, n - 1);
}
function getTabla(funcion) {
  const t = TABLAS[String(funcion || '').toUpperCase()];
  if (!t) throw new Error(`Función no soportada: ${funcion}`);
  return t;
}
function sumaDietas(dietas = {}) {
  let total = 0, exenta = 0;
  for (const [key, uds] of Object.entries(dietas)) {
    if (!DIETAS[key]) continue;
    total += DIETAS[key].total * (Number(uds) || 0);
    exenta += DIETAS[key].exenta * (Number(uds) || 0);
  }
  return { total: euros(total), exenta: euros(exenta), sujeta: euros(Math.max(0, total - exenta)) };
}

function normalizarMes(input = {}) {
  const raw = String(input.mesNomina || input.mes || input.month || '').trim().toLowerCase();
  const meses = {
    enero: 'Enero', febrero: 'Febrero', marzo: 'Marzo', abril: 'Abril', mayo: 'Mayo', junio: 'Junio',
    julio: 'Julio', agosto: 'Agosto', septiembre: 'Septiembre', setiembre: 'Septiembre', octubre: 'Octubre', noviembre: 'Noviembre', diciembre: 'Diciembre',
    '1': 'Enero', '01': 'Enero', '2': 'Febrero', '02': 'Febrero', '3': 'Marzo', '03': 'Marzo', '4': 'Abril', '04': 'Abril',
    '5': 'Mayo', '05': 'Mayo', '6': 'Junio', '06': 'Junio', '7': 'Julio', '07': 'Julio', '8': 'Agosto', '08': 'Agosto',
    '9': 'Septiembre', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
  };
  return meses[raw] || null;
}

function calcularPagasExtraMes({ sb, extra, pagasProrrateadas, mesNomina }) {
  const modo = pagasProrrateadas ? 'prorrateadas' : '14-pagas';
  const extraMensualProrrateada = euros(extra * 2);
  let pagaExtraMes = 0;
  let extra1Dev = 0;
  let extra2Dev = 0;
  let etiqueta = pagasProrrateadas ? 'prorrateada' : 'sin-extra-mensual';

  if (pagasProrrateadas) {
    pagaExtraMes = extraMensualProrrateada;
    extra1Dev = euros(extra);
    extra2Dev = euros(extra);
  } else if (mesNomina === 'Julio') {
    pagaExtraMes = euros(sb);
    extra1Dev = euros(sb);
    etiqueta = 'extra-julio';
  } else if (mesNomina === 'Diciembre') {
    pagaExtraMes = euros(sb);
    extra2Dev = euros(sb);
    etiqueta = 'extra-diciembre';
  }

  return {
    modo,
    mesNomina,
    pagaExtraMes: euros(pagaExtraMes),
    extra1Dev,
    extra2Dev,
    etiqueta,
    extraMensualProrrateada,
  };
}
function dpoMensual(funcion, nivel, porcentaje = 100, sccEjercido75 = false) {
  const fn = String(funcion).toUpperCase();
  const pct = Math.max(0, Number(porcentaje) || 0) / 100;
  if (fn === 'CMD') return euros(10000 / 12 * pct);
  if (fn === 'COP') return euros(((Number(nivel) <= 4 ? 2500 : 1500) / 12) * pct);
  if (fn === 'SCC') return euros(((sccEjercido75 ? 2500 : 1500) / 12) * pct);
  if (fn === 'CC') return euros(1500 / 12 * pct);
  return 0;
}
function calcularHVGrupoIV(t, idx, hv = {}) {
  const t1 = Number(hv.t1) || 0, t2 = Number(hv.t2) || 0, t3 = Number(hv.t3) || 0, t4 = Number(hv.t4) || 0;
  return euros(t1 * t.hv_t1[idx] + t2 * t.hv_t2[idx] + t3 * t.hv_t3[idx] + t4 * t.hv_t4[idx]);
}
function calcularHVGrupoIII(t, idx, hv = {}) {
  const o = hv.ordinarias || {};
  const r = hv.relevantes || {};
  return euros(
    (Number(o.t1) || 0) * t.hv_t1_o[idx] + (Number(o.t2) || 0) * t.hv_t2_o[idx] +
    (Number(o.t3) || 0) * t.hv_t3_o[idx] + (Number(o.t4) || 0) * t.hv_t4_o[idx] +
    (Number(r.t1) || 0) * t.hv_t1_r[idx] + (Number(r.t2) || 0) * t.hv_t2_r[idx] +
    (Number(r.t3) || 0) * t.hv_t3_r[idx] + (Number(r.t4) || 0) * t.hv_t4_r[idx]
  );
}

export function calcularNomina(input = {}, options = {}) {
  const auditEnabled = options.audit !== false;
  const audit = [];
  const funcion = String(input.funcion || '').toUpperCase();
  const t = getTabla(funcion);
  const idx = nivelIndex(input.nivel);
  if (!t.salbase[idx]) throw new Error(`Nivel no válido para ${funcion}: ${input.nivel}`);

  const sb = t.salbase[idx];
  const extra = t.extra[idx];
  const pagasProrrateadas = Boolean(input.pagasProrrateadas);
  const mesNomina = normalizarMes(input);
  const pagasExtra = calcularPagasExtraMes({ sb, extra, pagasProrrateadas, mesNomina });
  const pagaExtraMes = pagasExtra.pagaExtraMes;
  const prorrataExtrasSS = euros(extra * 2);
  const irpfPctManual = Number(input.irpfPct) || 0;
  const dietas = sumaDietas(input.dietas);

  if (auditEnabled) {
    audit.push(auditStep({ codigo: 'CLASIFICACION', concepto: 'Clasificación profesional aplicable', formula: 'funcion -> grupo profesional -> tabla retributiva -> nivel', entradas: { funcion, nivel: Number(input.nivel), grupo: t.grupo }, resultado: `${funcion}/Grupo ${t.grupo}/Nivel ${Number(input.nivel)}`, fuente: FUENTES.CONVENIO_ART_25.id }));
    audit.push(auditStep({ codigo: 'SALARIO_BASE', concepto: 'Salario base mensual', formula: 'tabla salarial[funcion][nivel]', entradas: { funcion, nivel: Number(input.nivel) }, resultado: sb, fuente: FUENTES.CONVENIO_RETRIBUCIONES.id }));
  }

  let hvImporte = 0, plusTransporte = 0, plusSobrecargo = 0, hvUsadas = input.hv;
  if (t.grupo === 'IV') {
    if (input.hv?.autoTotal != null) {
      const hvAudit = auditarDistribucionHV(input.hv.autoTotal, input.tramos);
      hvUsadas = hvAudit.distribucion;
      if (auditEnabled) audit.push(...hvAudit.audit);
    }
    hvImporte = calcularHVGrupoIV(t, idx, hvUsadas);
    plusTransporte = t.plus_tr[idx];
    if (auditEnabled) audit.push(auditStep({ codigo: 'HV_GRUPO_IV', concepto: 'Importe horas de vuelo Grupo IV', formula: 'Σ(horas tramo * tarifa tramo función/nivel)', entradas: hvUsadas || {}, resultado: hvImporte, fuente: FUENTES.CONVENIO_RETRIBUCIONES.id }));
  } else {
    hvImporte = calcularHVGrupoIII(t, idx, input.hv);
    plusTransporte = euros(t.plus_tr_anual / 11);
    plusSobrecargo = Number(input.plusSobrecargoUds || 0) * t.plus_sobrecargo[idx];
    if (auditEnabled) audit.push(auditStep({ codigo: 'HV_GRUPO_III', concepto: 'Importe horas de vuelo Grupo III', formula: 'Σ(HV ordinarias/relevantes por tramo * tarifa SCC/CC nivel)', entradas: input.hv || {}, resultado: hvImporte, fuente: FUENTES.CONVENIO_RETRIBUCIONES.id }));
  }

  const dpo = dpoMensual(funcion, input.nivel, input.dpoPct ?? 100, input.sccEjercido75);
  const complementos = euros((Number(input.lv1) || 0) + (Number(input.lv2) || 0) + (Number(input.lv3) || 0) + plusSobrecargo + (Number(input.complementoMadrid) || 0));
  const deduccionesPrivadas = input.deduccionesPrivadas || {};
  const interesesPrestamo = euros(Number(deduccionesPrivadas.interesesPrestamo) || 0);
  const amortizacionPrestamo = euros(Number(deduccionesPrivadas.amortizacionPrestamo) || 0);
  const otrasDeduccionesPrivadas = euros(Number(deduccionesPrivadas.otras) || 0);
  const deduccionesPrivadasNetas = euros(interesesPrestamo + amortizacionPrestamo + otrasDeduccionesPrivadas);
  const especieCotizable = euros((input.seguroMedico ? ESPECIE.SEGURO_MEDICO : 0) + (input.seguroVida !== false ? ESPECIE.SEGURO_VIDA : 0));

  const devengosSalariales = euros(sb + pagaExtraMes + hvImporte + plusTransporte + dpo + complementos);
  const devengosNoSalariales = dietas.total;
  const bruto = euros(devengosSalariales + devengosNoSalariales);

  const baseCotizableSinTope = euros(sb + hvImporte + plusTransporte + dpo + complementos + prorrataExtrasSS + especieCotizable + dietas.sujeta);
  const ss = calcularSSTrabajador(baseCotizableSinTope, { audit: auditEnabled });
  if (auditEnabled && ss.audit) audit.push(...ss.audit);
  const ssLimpio = { ...ss };
  delete ssLimpio.audit;

  const baseIRPF = euros(devengosSalariales + dietas.sujeta + (input.seguroVida !== false ? ESPECIE.SEGURO_VIDA : 0));
  const usarIRPFReglamentario = input.irpfModo === 'reglamentario' || input.irpfReglamentario === true;
  const retribucionMensualPrevisible = baseIRPF;
  const retribucionesAnualesEstimadas = euros(input.irpf?.retribucionesAnuales ?? ((devengosSalariales - pagaExtraMes + dietas.sujeta + (input.seguroVida !== false ? ESPECIE.SEGURO_VIDA : 0)) * 12 + (extra * 2)));
  const ssAnualEstimada = euros(input.irpf?.ssAnual ?? (ssLimpio.total * 12));
  const irpfReglamentario = calcularTipoRetencionReglamentario({
    ...(input.irpf || {}),
    retribucionesAnuales: retribucionesAnualesEstimadas,
    ssAnual: ssAnualEstimada,
    retribucionMensualSujeta: retribucionMensualPrevisible,
  }, { audit: auditEnabled });
  const irpfPct = usarIRPFReglamentario ? irpfReglamentario.tipo : irpfPctManual;
  const irpf = usarIRPFReglamentario ? irpfReglamentario.retencionMensual : calcularRetencionPorcentaje(baseIRPF, irpfPctManual);
  const liquido = euros(bruto - ssLimpio.total - irpf - deduccionesPrivadasNetas);

  if (auditEnabled) {
    audit.push(auditStep({ codigo: 'PAGA_EXTRA', concepto: 'Pagas extra en nómina y prorrata de pagas para Seguridad Social', formula: 'si prorrateadas: pagaExtraMes = extra * 2; si 14 pagas: julio/diciembre = salario base; resto meses = 0. La prorrataExtrasSS = extra * 2 siempre.', entradas: { extra, salarioBase: sb, pagasProrrateadas, mesNomina }, resultado: { ...pagasExtra, prorrataExtrasSS }, fuente: FUENTES.CONVENIO_RETRIBUCIONES.id, notas: ['En modo 14 pagas la extra se suma al devengo y a la base IRPF solo en julio/diciembre.', 'La base de cotización mensual mantiene la prorrata de pagas extra y no aumenta por cobrar la extra completa en julio/diciembre.'] }));
    audit.push(auditStep({ codigo: 'PLUS_TRANSPORTE', concepto: 'Plus transporte mensual', formula: t.grupo === 'III' ? 'plusTransporte = anual / 11' : 'tabla función/nivel', entradas: { grupo: t.grupo, funcion, nivel: Number(input.nivel) }, resultado: plusTransporte, fuente: FUENTES.CONVENIO_RETRIBUCIONES.id }));
    audit.push(auditStep({ codigo: usarIRPFReglamentario ? 'BASE_IRPF_REGLAMENTARIA' : 'BASE_IRPF_PORCENTAJE', concepto: usarIRPFReglamentario ? 'IRPF reglamentario calculado en backend' : 'Base IRPF usada con porcentaje informado', formula: usarIRPFReglamentario ? 'procedimiento general arts. 82 a 86 RIRPF' : 'devengos salariales + dietas sujetas + especie vida', entradas: { devengosSalariales, dietasSujetas: dietas.sujeta, seguroVida: input.seguroVida !== false ? ESPECIE.SEGURO_VIDA : 0, irpfPct }, resultado: { baseIRPF, irpf, irpfPct }, fuente: usarIRPFReglamentario ? FUENTES.IRPF_REGLAMENTO_ART_82.id : FUENTES.IRPF_PORCENTAJE_INFORMADO.id, notas: [usarIRPFReglamentario ? 'IRPF calculado por motor reglamentario core.' : 'Modo manual: porcentaje informado por usuario/nómina.'] }));
    if (usarIRPFReglamentario && irpfReglamentario.audit) audit.push(...irpfReglamentario.audit);
    audit.push(auditStep({ codigo: 'DEDUCCIONES_PRIVADAS_NETAS', concepto: 'Deducciones privadas/netas', formula: 'interesesPrestamo + amortizacionPrestamo + otrasDeduccionesPrivadas', entradas: { interesesPrestamo, amortizacionPrestamo, otrasDeduccionesPrivadas }, resultado: deduccionesPrivadasNetas, fuente: 'NOMINA_EMPRESA' }));
    audit.push(auditStep({ codigo: 'LIQUIDO', concepto: 'Líquido a percibir', formula: 'bruto - SS trabajador - IRPF - deduccionesPrivadasNetas', entradas: { bruto, ssTrabajador: ssLimpio.total, irpf, deduccionesPrivadasNetas }, resultado: liquido, fuente: 'CALCULO_ARITMETICO' }));
  }

  return {
    funcion, grupo: t.grupo, nivel: Number(input.nivel),
    versionMotor: '2026.04-audit-v6-extra-pay-14p',
    conceptos: { sb, pagaExtraMes, pagasExtra, hvImporte, plusTransporte, dpo, complementos, dietas },
    bases: { prorrataExtrasSS, baseCotizableSinTope, baseSS: ssLimpio.baseSS, baseIRPF },
    deducciones: { ss: ssLimpio, irpf, irpfPct, irpfModo: usarIRPFReglamentario ? 'reglamentario' : 'manual', irpfReglamentario: usarIRPFReglamentario ? irpfReglamentario : undefined, privadas: { interesesPrestamo, amortizacionPrestamo, otras: otrasDeduccionesPrivadas, total: deduccionesPrivadasNetas } },
    totales: { devengosSalariales, devengosNoSalariales, bruto, liquido },
    audit,
    avisos: [
      'Motor backend auditado en fase de migración: validar contra nóminas reales antes de usar como cálculo definitivo.',
      usarIRPFReglamentario ? 'IRPF reglamentario core activado: validar con AEAT/casos reales antes de considerarlo definitivo.' : 'IRPF en modo manual: se aplica el porcentaje informado.',
      'Las tablas se han migrado desde el frontend y deben quedar bloqueadas por fuente/anexo/versionado.',
    ],
  };
}
