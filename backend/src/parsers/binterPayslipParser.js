import { euros, SS_2026 } from '../config/constants.js';

function parseEuro(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim().replace(/\./g, '').replace(',', '.');
  return euros(Number(s));
}

function parsePct(raw) {
  if (raw == null) return 0;
  return Number(String(raw).replace(',', '.'));
}

function norm(label = '') {
  return String(label)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const CONCEPTO_RULES = [
  { re: /^salario base$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'salarioBase' },
  { re: /^plus de transporte$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'plusTransporte' },
  { re: /^plus puntualidad$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'plusPuntualidad' },
  { re: /^hora (de )?vuelo($| t\d)/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'horasVuelo' },
  { re: /^imaginarias$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'imaginarias' },
  { re: /^productividad \(fdp\)$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'productividadFdp' },
  { re: /^paga extra prorrateada$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'pagaExtraProrrateada' },
  { re: /^incentivo temporal por movilidad$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'incentivoMovilidad' },
  { re: /^complemento de base$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'complementoBase' },
  { re: /^otros conceptos$/, tipo: 'devengo_salarial', baseSS: true, baseIRPF: true, key: 'otrosConceptos' },
  { re: /dieta .* exenta$/, tipo: 'dieta_exenta', baseSS: false, baseIRPF: false, key: 'dietasExentas' },
  { re: /dieta .* sujeta$/, tipo: 'dieta_sujeta', baseSS: true, baseIRPF: true, key: 'dietasSujetas' },
  { re: /^seguro medico$/, tipo: 'especie_informativa', baseSS: false, baseIRPF: false, key: 'seguroMedicoInformativo' },
  { re: /^seguro vida especie$/, tipo: 'especie_repercutida', baseSS: true, baseIRPF: true, key: 'seguroVidaEspecie' },
  { re: /^seguro medico no repercutido$/, tipo: 'especie_no_repercutida', baseSS: true, baseIRPF: false, key: 'seguroMedicoNoRepercutido' },
  { re: /^intereses prestamo$/, tipo: 'deduccion_privada_neta', baseSS: false, baseIRPF: false, key: 'interesesPrestamo' },
  { re: /^amortizacion del prestamo$/, tipo: 'deduccion_privada_neta', baseSS: false, baseIRPF: false, key: 'amortizacionPrestamo' },
];

const DEDUCCION_RULES = [
  { re: /^cotizacion cont\. comunes$/, key: 'contingenciasComunes' },
  { re: /^cotizacion mei$/, key: 'mei' },
  { re: /^cot\. adic\. solidaridad\. exceso primer tramo$/, key: 'solidaridadTramo1' },
  { re: /^cot\. adic\. solidaridad\. exceso segundo tramo$/, key: 'solidaridadTramo2' },
  { re: /^cot\. adic\. solidaridad\. exceso tercer tramo$/, key: 'solidaridadTramo3' },
  { re: /^cotizacion d\+fp$/, key: 'desempleoFormacion' },
  { re: /^retencion a cuenta irpf especie$/, key: 'irpfEspecie' },
  { re: /^retencion a cuenta del irpf$/, key: 'irpfDinerario' },
];

function classifyConcept(label) {
  const n = norm(label);
  const rule = CONCEPTO_RULES.find(r => r.re.test(n));
  return rule ? { ...rule, normalized: n } : { tipo: 'desconocido', baseSS: null, baseIRPF: null, key: 'desconocido', normalized: n };
}

function classifyDeduction(label) {
  const n = norm(label);
  const rule = DEDUCCION_RULES.find(r => r.re.test(n));
  return rule ? { ...rule, normalized: n } : { key: 'deduccionDesconocida', normalized: n };
}

function add(bucket, key, amount) {
  bucket[key] = euros((bucket[key] || 0) + amount);
}

export function parseBinterPayslipText(text = '') {
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const result = {
    trabajador: {},
    periodo: {},
    conceptos: [],
    deduccionesLegales: [],
    deduccionesPrivadas: [],
    especie: [],
    empresa: {},
    acumulados: {},
    resumen: {},
    flags: [],
    audit: [],
  };

  const joined = lines.join('\n');
  const nifMatch = joined.match(/(?:^|\n)(\d{8}[A-Z])\n([A-ZÁÉÍÓÚÑ ]+)\n(\d{2}\/\d{2}\/\d{4})\s+([^\n]+)\n([^\n]+)/);
  if (nifMatch) {
    result.trabajador.nif = nifMatch[1];
    result.trabajador.nombre = nifMatch[2].trim();
    result.trabajador.fechaIngreso = nifMatch[3];
    result.trabajador.categoriaRaw = nifMatch[4].trim();
    result.trabajador.funcionRaw = nifMatch[5].trim();
    result.trabajador.esCopiloto = /copiloto/i.test(result.trabajador.funcionRaw);
    result.trabajador.esComandante = /comandante/i.test(result.trabajador.funcionRaw);
  }
  const periodoMatch = joined.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodoMatch) {
    result.periodo.desde = periodoMatch[1];
    result.periodo.hasta = periodoMatch[2];
  }

  const conceptLine = /^(\d+(?:,\d+)?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const singleAmountLine = /^(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const deductionLine = /^(\d{1,2},\d{2})%\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const costLine = /^\.\s*(.+?)\.{2,}\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const totalLine = /^(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const liquidLine = /^(\d{1,3}(?:\.\d{3})*,\d{2})\s+Acum\. Base IRPF\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;

  for (const line of lines) {
    let m = line.match(deductionLine);
    if (m) {
      const pct = parsePct(m[1]);
      const base = parseEuro(m[2]);
      const label = m[3].trim();
      const importe = parseEuro(m[4]);
      const cls = classifyDeduction(label);
      result.deduccionesLegales.push({ label, key: cls.key, porcentaje: pct, base, importe });
      result.audit.push({ codigo: 'PARSE_DEDUCCION', label, key: cls.key, porcentaje: pct, base, importe });
      continue;
    }
    m = line.match(conceptLine);
    if (m) {
      const unidades = parsePct(m[1]);
      const precio = parseEuro(m[2]);
      const label = m[3].trim();
      const importe = parseEuro(m[4]);
      const cls = classifyConcept(label);
      const row = { label, key: cls.key, tipo: cls.tipo, unidades, precio, importe, baseSS: cls.baseSS, baseIRPF: cls.baseIRPF };
      if (cls.tipo === 'deduccion_privada_neta') result.deduccionesPrivadas.push(row);
      else if (cls.tipo?.startsWith('especie')) result.especie.push(row);
      else result.conceptos.push(row);
      result.audit.push({ codigo: 'PARSE_CONCEPTO', ...row });
      continue;
    }
    m = line.match(/^Coste SS Empresa\.{2,}\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/);
    if (m) {
      result.empresa.costeSSTotal = parseEuro(m[1]);
      continue;
    }
    m = line.match(costLine);
    if (m) {
      result.empresa[norm(m[1]).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] = parseEuro(m[2]);
      continue;
    }
    m = line.match(totalLine);
    if (m) {
      result.resumen.totalDevengado = parseEuro(m[1]);
      result.resumen.totalDeducciones = parseEuro(m[2]);
      result.resumen.baseSS = parseEuro(m[3]);
      result.resumen.baseAT = parseEuro(m[4]);
      result.resumen.baseIRPF = parseEuro(m[5]);
      result.resumen.totalEmpresa = parseEuro(m[6]);
      result.resumen.totalRetenciones = parseEuro(m[7]);
      continue;
    }
    m = line.match(liquidLine);
    if (m) {
      result.resumen.liquido = parseEuro(m[1]);
      result.acumulados.baseIRPF = parseEuro(m[2]);
      continue;
    }
    m = line.match(singleAmountLine);
    if (m && /^(Otros Conceptos|Complemento de base|Seguro Médico|Intereses Préstamo|Amortización Del Préstamo)$/i.test(m[1])) {
      const label = m[1].trim();
      const importe = parseEuro(m[2]);
      const cls = classifyConcept(label);
      const row = { label, key: cls.key, tipo: cls.tipo, unidades: 1, precio: importe, importe, baseSS: cls.baseSS, baseIRPF: cls.baseIRPF };
      if (cls.tipo === 'deduccion_privada_neta') result.deduccionesPrivadas.push(row);
      else if (cls.tipo?.startsWith('especie')) result.especie.push(row);
      else result.conceptos.push(row);
      result.audit.push({ codigo: 'PARSE_CONCEPTO_SIMPLE', ...row });
    }
  }

  const ded = Object.fromEntries(result.deduccionesLegales.map(d => [d.key, d.importe]));
  const priv = Object.fromEntries(result.deduccionesPrivadas.map(d => [d.key, d.importe]));
  result.resumen.ssTrabajador = euros((ded.contingenciasComunes || 0) + (ded.mei || 0) + (ded.desempleoFormacion || 0) + (ded.solidaridadTramo1 || 0) + (ded.solidaridadTramo2 || 0) + (ded.solidaridadTramo3 || 0));
  result.resumen.solidaridadTrabajador = euros((ded.solidaridadTramo1 || 0) + (ded.solidaridadTramo2 || 0) + (ded.solidaridadTramo3 || 0));
  result.resumen.irpfTrabajador = euros((ded.irpfDinerario || 0) + (ded.irpfEspecie || 0));
  result.resumen.deduccionesPrivadas = euros(Object.values(priv).reduce((a, b) => a + b, 0));
  result.resumen.baseSSTopada = result.resumen.baseSS > 0 && result.resumen.baseSS >= SS_2026.BASE_MAX_MENSUAL;
  if (result.resumen.baseSS && result.resumen.baseSS < SS_2026.BASE_MAX_MENSUAL && result.resumen.solidaridadTrabajador > 0) {
    result.flags.push({ severity: 'error', codigo: 'SOLIDARIDAD_CON_BASE_NO_TOPADA', mensaje: 'La nómina tiene base SS inferior a base máxima pero incluye solidaridad.' });
  }
  if (result.resumen.baseSS && result.resumen.baseSS < SS_2026.BASE_MAX_MENSUAL) {
    result.flags.push({ severity: 'info', codigo: 'BASE_NO_TOPADA', mensaje: 'Base SS inferior a 5.101,20 €. No debe existir solidaridad.' });
  }
  if (result.deduccionesPrivadas.length) {
    result.flags.push({ severity: 'info', codigo: 'DEDUCCION_PRIVADA_NETA', mensaje: 'Detectada deducción privada/neto, como préstamo. Reduce líquido, no base SS/IRPF.' });
  }
  return result;
}

export function buildEmpresaComparisonFromParsed(parsed) {
  return {
    bruto: parsed.resumen.totalDevengado,
    liquido: parsed.resumen.liquido,
    baseSS: parsed.resumen.baseSS,
    baseIRPF: parsed.resumen.baseIRPF,
    ssTrabajador: parsed.resumen.ssTrabajador,
    irpf: parsed.resumen.irpfTrabajador,
    solidaridad: parsed.resumen.solidaridadTrabajador,
    deduccionesPrivadas: parsed.resumen.deduccionesPrivadas,
  };
}
