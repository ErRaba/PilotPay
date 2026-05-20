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

// ── Códigos de días especiales ──────────────────────────────────────────────
const CODIGOS_DIAS = {
  EN: 'Enfermedad',
  AC: 'Accidente',
  MA: 'Maternidad',
  ER: 'ERE',
  VA: 'Vacaciones',
  PA: 'Paternidad',
  RE: 'Riesgo Embarazo',
  HU: 'Huelga',
  AU: 'Ausencia',
};

const CONCEPTO_RULES = [
  { re: /^salario base$/,                   tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'salarioBase' },
  { re: /^plus de transporte$/,             tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'plusTransporte' },
  { re: /^plus puntualidad$/,               tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'plusPuntualidad' },
  { re: /^hora (de )?vuelo($| t\d)/,        tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'horasVuelo' },
  { re: /^imaginarias$/,                    tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'imaginarias' },
  { re: /^productividad \(fdp\)$/,          tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'productividadFdp' },
  { re: /^paga extra prorrateada$/,         tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'pagaExtraProrrateada' },
  { re: /^incentivo temporal por movilidad$/, tipo: 'devengo_salarial',      baseSS: true,  baseIRPF: true,  key: 'incentivoMovilidad' },
  { re: /^complemento de base$/,            tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'complementoBase' },
  { re: /^otros conceptos$/,                tipo: 'devengo_salarial',        baseSS: true,  baseIRPF: true,  key: 'otrosConceptos' },
  { re: /dieta .* exenta$/,                 tipo: 'dieta_exenta',            baseSS: false, baseIRPF: false, key: 'dietasExentas' },
  { re: /dieta .* sujeta$/,                 tipo: 'dieta_sujeta',            baseSS: true,  baseIRPF: true,  key: 'dietasSujetas' },
  { re: /^seguro medico$/,                  tipo: 'especie_informativa',     baseSS: false, baseIRPF: false, key: 'seguroMedicoInformativo' },
  { re: /^seguro vida especie$/,            tipo: 'especie_repercutida',     baseSS: true,  baseIRPF: true,  key: 'seguroVidaEspecie' },
  { re: /^seguro medico no repercutido$/,   tipo: 'especie_no_repercutida',  baseSS: true,  baseIRPF: false, key: 'seguroMedicoNoRepercutido' },
  { re: /^intereses prestamo$/,             tipo: 'deduccion_privada_neta',  baseSS: false, baseIRPF: false, key: 'interesesPrestamo' },
  { re: /^amortizacion del prestamo$/,      tipo: 'deduccion_privada_neta',  baseSS: false, baseIRPF: false, key: 'amortizacionPrestamo' },
];

const DEDUCCION_RULES = [
  { re: /^cotizacion cont\. comunes$/,                        key: 'contingenciasComunes' },
  { re: /^cotizacion mei$/,                                   key: 'mei' },
  { re: /^cot\. adic\. solidaridad\. exceso primer tramo$/,  key: 'solidaridadTramo1' },
  { re: /^cot\. adic\. solidaridad\. exceso segundo tramo$/, key: 'solidaridadTramo2' },
  { re: /^cot\. adic\. solidaridad\. exceso tercer tramo$/,  key: 'solidaridadTramo3' },
  { re: /^cotizacion d\+fp$/,                                key: 'desempleoFormacion' },
  { re: /^retencion a cuenta irpf especie$/,                 key: 'irpfEspecie' },
  { re: /^retencion a cuenta del irpf$/,                     key: 'irpfDinerario' },
];

function classifyConcept(label) {
  const n = norm(label);
  const rule = CONCEPTO_RULES.find(r => r.re.test(n));
  return rule
    ? { ...rule, normalized: n }
    : { tipo: 'desconocido', baseSS: null, baseIRPF: null, key: 'desconocido', normalized: n };
}

function classifyDeduction(label) {
  const n = norm(label);
  const rule = DEDUCCION_RULES.find(r => r.re.test(n));
  return rule
    ? { ...rule, normalized: n }
    : { key: 'deduccionDesconocida', normalized: n };
}

function add(bucket, key, amount) {
  bucket[key] = euros((bucket[key] || 0) + amount);
}

// ── Extracción de tira de días y códigos ────────────────────────────────────
/**
 * Dada una lista de líneas del texto extraído del PDF, localiza la tira de
 * días del mes (secuencia numérica 1-31) y la fila de códigos/porcentajes
 * que la sigue, y devuelve diasInfo con:
 *   - diasTrabajados: número de días al 100 %
 *   - totalConIncidencia: número de días con cualquier código
 *   - diasConCodigo: [{ dia, cod, nombre }]
 *   - codigosResumen: { VA: 6, EN: 3, … }
 */
function extractDiasInfo(lines) {
  const diasInfo = {
    diasTrabajados: null,
    totalConIncidencia: 0,
    diasConCodigo: [],
    codigosResumen: {},
  };

  // Buscar línea con secuencia de números de día: al menos 15 tokens numéricos 1-31
  let diasLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const toks = lines[i].trim().split(/\s+/);
    if (toks.length >= 15 && toks.every(t => /^\d{1,2}$/.test(t) && Number(t) >= 1 && Number(t) <= 31)) {
      diasLineIdx = i;
      break;
    }
  }

  if (diasLineIdx < 0) return diasInfo;

  const diasNums = lines[diasLineIdx].trim().split(/\s+/).map(Number);
  const totalDias = diasNums.length;

  // Buscar fila de porcentajes/códigos en las 1-4 líneas siguientes.
  // La tira puede llegar concatenada "100.0100.0..." (sin espacios, layout PDF.js real).
  let pctTokens = [];
  for (let j = diasLineIdx + 1; j <= Math.min(diasLineIdx + 4, lines.length - 1); j++) {
    const ln = lines[j].trim();
    if (!ln) continue;

    // Caso A: tokens separados por espacios "100.0 100.0 VA ..."
    const spacedTokens = ln.split(/\s+/).filter(t => /^\d{1,3}\.\d+$/.test(t) || CODIGOS_DIAS[t.toUpperCase()]);
    if (spacedTokens.length >= 15) { pctTokens = ln.split(/\s+/); break; }

    // Caso B: concatenados "100.0100.0100.0..." → split por regex
    if (/^[\d.]+$/.test(ln) && ln.length > 30) {
      const concat = ln.match(/\d{1,3}\.\d+/g) || [];
      if (concat.length >= 15) { pctTokens = concat; break; }
    }

    // Caso C: línea con códigos mezclados con porcentajes
    const hasCod = ln.split(/\s+/).some(t => CODIGOS_DIAS[t.toUpperCase()]);
    if (hasCod) { pctTokens = ln.split(/\s+/); break; }
  }

  if (pctTokens.length === 0) {
    diasInfo.diasTrabajados = totalDias;
    return diasInfo;
  }

  const diasConIncidencia = [];
  const codigosResumen = {};
  let diasTrabajados = totalDias;

  pctTokens.forEach((tok, i) => {
    const cod = tok.toUpperCase();
    if (CODIGOS_DIAS[cod]) {
      const dia = diasNums[i] || i + 1;
      diasConIncidencia.push({ dia, cod, nombre: CODIGOS_DIAS[cod] });
      codigosResumen[cod] = (codigosResumen[cod] || 0) + 1;
      diasTrabajados--;
    } else if (parseFloat(tok) > 0 && parseFloat(tok) < 100) {
      diasTrabajados--;  // porcentaje parcial (baja sin código específico)
    }
  });

  diasInfo.diasTrabajados     = diasTrabajados;
  diasInfo.totalConIncidencia = diasConIncidencia.length;
  diasInfo.diasConCodigo      = diasConIncidencia;
  diasInfo.codigosResumen     = codigosResumen;

  return diasInfo;
}

export function parseBinterPayslipText(text = '') {
  const lines = String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const joined = lines.join('\n');
  const result = {
    trabajador: {},
    periodo: {},
    conceptos: [],
    deduccionesLegales: [],
    deduccionesPrivadas: [],
    especie: [],
    empresa: {},
    acumulados: {},
    diasInfo: {},       // NEW: días trabajados y códigos
    resumen: {},
    flags: [],
    audit: [],
  };

  // ── Extracción de datos del trabajador ──────────────────────────────────────
  // Estrategia: buscar el NIF (8 dígitos + letra) que está asociado a los datos
  // del trabajador. El NIF/CIF de empresa (letra + 8 chars o A-W + 8 dígitos)
  // se excluye explícitamente. Se usan tres estrategias en orden de fiabilidad:
  //
  // E1 — Bloque estructurado: NIF en línea propia, seguido de nombre en mayúsculas,
  //      fecha de ingreso y descripción de puesto. Típico en nóminas Binter.
  //
  // E2 — Ancla por Nº SS: buscar el Nº SS (formato NN-NNNNNNNN-NN) y extraer
  //      el NIF de las líneas próximas anteriores. Si hay varios NIF en el
  //      documento, el que esté más cerca del Nº SS es el del trabajador.
  //
  // E3 — Fallback: no asignar NIF. Es preferible devolver vacío a devolver
  //      el NIF de la empresa.
  //
  // CIF de empresa típico Binter: empieza por letra (A, B, …) seguida de dígitos,
  // o tiene formato X-NNNNNNN-Y (distinto al NIF persona ≡ 8 dígitos + letra).

  // Regex NIF persona física: exactamente 8 dígitos seguidos de 1 letra mayúscula.
  // Excluye NIE (X/Y/Z) y CIF (letra inicial).
  const NIF_PERSONA_RE = /\b(\d{8}[A-HJ-NP-TV-Z])\b/g;
  // Regex Nº SS: NN/NNNNNNNN/NN o NN-NNNNNNNN-NN
  const NSS_RE = /\b(\d{2}[\/-]\d{8}[\/-]\d{2})\b/;
  // Nombre en MAYÚSCULAS: al menos dos palabras, solo letras y espacios
  const NOMBRE_MAYUS_RE = /^[A-ZÁÉÍÓÚÑÜ]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ]{2,})+$/;
  // Fecha ingreso: DD/MM/AAAA
  const FECHA_RE = /\b(\d{2}\/\d{2}\/\d{4})\b/;

  // Recoger todos los NIF persona encontrados en el documento con su posición
  const nifCandidates = [];
  let _m;
  while ((_m = NIF_PERSONA_RE.exec(joined)) !== null) {
    nifCandidates.push({ nif: _m[1], pos: _m.index });
  }

  // Posición del Nº SS en el texto (ancla del trabajador)
  const nssRawMatch = joined.match(NSS_RE);
  const nssPos = nssRawMatch ? joined.indexOf(nssRawMatch[0]) : -1;
  if (nssRawMatch) result.trabajador.nss = nssRawMatch[1];

  // E1: bloque estructurado — NIF en línea propia + nombre mayúsculas + fecha ingreso
  let nifEncontrado = null;
  for (let i = 0; i < lines.length; i++) {
    if (/^\d{8}[A-HJ-NP-TV-Z]$/.test(lines[i])) {
      // Línea siguiente debe ser nombre en mayúsculas
      if (i + 1 < lines.length && NOMBRE_MAYUS_RE.test(lines[i + 1])) {
        // Dentro de las 3 líneas siguientes debe aparecer una fecha
        const ventana = lines.slice(i + 1, i + 5).join(' ');
        if (FECHA_RE.test(ventana)) {
          nifEncontrado = lines[i];
          result.trabajador.nombre       = lines[i + 1].trim();
          const fechaM = ventana.match(FECHA_RE);
          if (fechaM) result.trabajador.fecha_ingreso = fechaM[1];
          // Categoría y función: líneas i+3 e i+4 si existen y no son números
          if (lines[i + 3] && !/^\d/.test(lines[i + 3]))
            result.trabajador.categoriaRaw = lines[i + 3].trim();
          if (lines[i + 4] && !/^\d/.test(lines[i + 4]))
            result.trabajador.funcionRaw  = lines[i + 4].trim();
          break;
        }
      }
    }
  }

  // E2: ancla por Nº SS — el NIF del trabajador es el más cercano al Nº SS
  if (!nifEncontrado && nssPos >= 0 && nifCandidates.length > 0) {
    // Buscar el NIF que aparece ANTES del Nº SS y más próximo a él
    const antes = nifCandidates.filter(c => c.pos < nssPos);
    if (antes.length > 0) {
      const masCercano = antes.reduce((a, b) => (b.pos > a.pos ? b : a));
      // Distancia razonable: menos de 600 caracteres antes del Nº SS
      if (nssPos - masCercano.pos < 600) {
        nifEncontrado = masCercano.nif;
      }
    }
    // Si no hay ninguno antes, buscar el inmediatamente después (máx 200 chars)
    if (!nifEncontrado) {
      const despues = nifCandidates.filter(c => c.pos > nssPos && c.pos - nssPos < 200);
      if (despues.length > 0) nifEncontrado = despues[0].nif;
    }
  }

  // E3: fallback — si solo hay un NIF persona en el documento, puede ser el trabajador;
  //     si hay varios (empresa también aparece como NIF), no asignamos nada.
  if (!nifEncontrado && nifCandidates.length === 1) {
    nifEncontrado = nifCandidates[0].nif;
  }

  // Asignar NIF solo si se ha identificado con seguridad
  if (nifEncontrado) {
    result.trabajador.nif = nifEncontrado;
  }
  // Si no: result.trabajador.nif permanece undefined → en la UI se mostrará '—'
  // y NO se propondrá como actualización del perfil.

  // Nombre y fecha de ingreso si no los capturó E1 (intentar con regex original)
  if (!result.trabajador.nombre) {
    const nifMatch = joined.match(/(?:^|\n)(\d{8}[A-HJ-NP-TV-Z])\n([A-ZÁÉÍÓÚÑ ]+)\n(\d{2}\/\d{2}\/\d{4})\s+([^\n]+)\n([^\n]+)/);
    if (nifMatch && nifMatch[1] === nifEncontrado) {
      result.trabajador.nombre        = nifMatch[2].trim();
      result.trabajador.fecha_ingreso = nifMatch[3];
      result.trabajador.categoriaRaw  = nifMatch[4].trim();
      result.trabajador.funcionRaw    = nifMatch[5].trim();
    }
  }
  if (result.trabajador.funcionRaw) {
    result.trabajador.esCopiloto  = /copiloto/i.test(result.trabajador.funcionRaw);
    result.trabajador.esComandante= /comandante/i.test(result.trabajador.funcionRaw);
  }

  const periodoMatch = joined.match(/(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})/);
  if (periodoMatch) {
    result.periodo.desde = periodoMatch[1];
    result.periodo.hasta = periodoMatch[2];
  }

  const conceptLine     = /^(\d+(?:,\d+)?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const singleAmountLine= /^(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const deductionLine   = /^(\d{1,2},\d{2})%\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const costLine        = /^\.\s*(.+?)\.{2,}\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const totalLine       = /^(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  const liquidLine      = /^(\d{1,3}(?:\.\d{3})*,\d{2})\s+Acum\. Base IRPF\s+(\d{1,3}(?:\.\d{3})*,\d{2})$/;
  // NEW: acumulados adicionales
  const acumIRPFRetLine = /Acum\.\s+I\.?R\.?P\.?F\.?\s+Retenido\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i;
  const acumBaseIRPFLine= /Acum\.\s+Base\s+I\.?R\.?P\.?F\.?\s+(\d{1,3}(?:\.\d{3})*,\d{2})/i;

  for (const line of lines) {
    let m = line.match(deductionLine);
    if (m) {
      const pct    = parsePct(m[1]);
      const base   = parseEuro(m[2]);
      const label  = m[3].trim();
      const importe= parseEuro(m[4]);
      const cls    = classifyDeduction(label);
      result.deduccionesLegales.push({ label, key: cls.key, porcentaje: pct, base, importe });
      result.audit.push({ codigo: 'PARSE_DEDUCCION', label, key: cls.key, porcentaje: pct, base, importe });
      continue;
    }
    m = line.match(conceptLine);
    if (m) {
      const unidades = parsePct(m[1]);
      const precio   = parseEuro(m[2]);
      const label    = m[3].trim();
      const importe  = parseEuro(m[4]);
      const cls      = classifyConcept(label);
      const row = { label, key: cls.key, tipo: cls.tipo, unidades, precio, importe, baseSS: cls.baseSS, baseIRPF: cls.baseIRPF };
      if (cls.tipo === 'deduccion_privada_neta')  result.deduccionesPrivadas.push(row);
      else if (cls.tipo?.startsWith('especie'))    result.especie.push(row);
      else                                         result.conceptos.push(row);
      result.audit.push({ codigo: 'PARSE_CONCEPTO', ...row });
      continue;
    }
    m = line.match(/^Coste SS Empresa\.{2,}\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/);
    if (m) { result.empresa.costeSSTotal = parseEuro(m[1]); continue; }
    m = line.match(costLine);
    if (m) {
      result.empresa[norm(m[1]).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')] = parseEuro(m[2]);
      continue;
    }
    m = line.match(totalLine);
    if (m) {
      result.resumen.totalDevengado    = parseEuro(m[1]);
      result.resumen.totalDeducciones  = parseEuro(m[2]);
      result.resumen.baseSS            = parseEuro(m[3]);
      result.resumen.baseAT            = parseEuro(m[4]);
      result.resumen.baseIRPF          = parseEuro(m[5]);
      result.resumen.totalEmpresa      = parseEuro(m[6]);
      result.resumen.totalRetenciones  = parseEuro(m[7]);
      continue;
    }
    m = line.match(liquidLine);
    if (m) {
      result.resumen.liquido          = parseEuro(m[1]);
      result.acumulados.baseIRPF      = parseEuro(m[2]);  // Acum. Base IRPF
      continue;
    }
    // NEW: Acum. IRPF Retenido (aparece en línea separada en algunos formatos)
    m = line.match(acumIRPFRetLine);
    if (m) { result.acumulados.irpfRetenido = parseEuro(m[1]); continue; }
    // Acum. Base IRPF standalone
    m = line.match(acumBaseIRPFLine);
    if (m && !result.acumulados.baseIRPF) { result.acumulados.baseIRPF = parseEuro(m[1]); continue; }

    m = line.match(singleAmountLine);
    if (m && /^(Otros Conceptos|Complemento de base|Seguro Médico|Intereses Préstamo|Amortización Del Préstamo)$/i.test(m[1])) {
      const label    = m[1].trim();
      const importe  = parseEuro(m[2]);
      const cls      = classifyConcept(label);
      const row = { label, key: cls.key, tipo: cls.tipo, unidades: 1, precio: importe, importe, baseSS: cls.baseSS, baseIRPF: cls.baseIRPF };
      if (cls.tipo === 'deduccion_privada_neta')  result.deduccionesPrivadas.push(row);
      else if (cls.tipo?.startsWith('especie'))    result.especie.push(row);
      else                                         result.conceptos.push(row);
      result.audit.push({ codigo: 'PARSE_CONCEPTO_SIMPLE', ...row });
    }
  }

  // ── Extracción de días trabajados y códigos ─────────────────────────────
  result.diasInfo = extractDiasInfo(lines);

  const ded  = Object.fromEntries(result.deduccionesLegales.map(d => [d.key, d.importe]));
  const priv = Object.fromEntries(result.deduccionesPrivadas.map(d => [d.key, d.importe]));
  result.resumen.ssTrabajador = euros(
    (ded.contingenciasComunes || 0) + (ded.mei || 0) + (ded.desempleoFormacion || 0) +
    (ded.solidaridadTramo1 || 0) + (ded.solidaridadTramo2 || 0) + (ded.solidaridadTramo3 || 0)
  );
  result.resumen.solidaridadTrabajador = euros(
    (ded.solidaridadTramo1 || 0) + (ded.solidaridadTramo2 || 0) + (ded.solidaridadTramo3 || 0)
  );
  result.resumen.irpfTrabajador   = euros((ded.irpfDinerario || 0) + (ded.irpfEspecie || 0));
  result.resumen.deduccionesPrivadas = euros(Object.values(priv).reduce((a, b) => a + b, 0));
  result.resumen.baseSSTopada     = result.resumen.baseSS > 0 && result.resumen.baseSS >= SS_2026.BASE_MAX_MENSUAL;

  if (result.resumen.baseSS && result.resumen.baseSS < SS_2026.BASE_MAX_MENSUAL && result.resumen.solidaridadTrabajador > 0) {
    result.flags.push({ severity: 'error', codigo: 'SOLIDARIDAD_CON_BASE_NO_TOPADA',
      mensaje: 'La nómina tiene base SS inferior a base máxima pero incluye solidaridad.' });
  }
  if (result.resumen.baseSS && result.resumen.baseSS < SS_2026.BASE_MAX_MENSUAL) {
    result.flags.push({ severity: 'info', codigo: 'BASE_NO_TOPADA',
      mensaje: 'Base SS inferior a 5.101,20 €. No debe existir solidaridad.' });
  }
  if (result.deduccionesPrivadas.length) {
    result.flags.push({ severity: 'info', codigo: 'DEDUCCION_PRIVADA_NETA',
      mensaje: 'Detectada deducción privada/neto, como préstamo. Reduce líquido, no base SS/IRPF.' });
  }

  return result;
}

export function buildEmpresaComparisonFromParsed(parsed) {
  return {
    bruto:              parsed.resumen.totalDevengado,
    liquido:            parsed.resumen.liquido,
    baseSS:             parsed.resumen.baseSS,
    baseIRPF:           parsed.resumen.baseIRPF,
    ssTrabajador:       parsed.resumen.ssTrabajador,
    irpf:               parsed.resumen.irpfTrabajador,
    solidaridad:        parsed.resumen.solidaridadTrabajador,
    deduccionesPrivadas: parsed.resumen.deduccionesPrivadas,
    // NEW: acumulados y días para comparativa
    acumulados: {
      baseIRPF:    parsed.acumulados.baseIRPF    || null,
      irpfRetenido: parsed.acumulados.irpfRetenido || null,
    },
    diasInfo: parsed.diasInfo || {},
  };
}
