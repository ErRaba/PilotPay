// validate-parser-v2.js — Validación real del Parser V2 con nóminas reales

const fs = require('fs');
const path = require('path');

// pdfjs-dist para Node.js
const pdfjsLib = require('pdfjs-dist');

const NOMINAS_DIR = path.join(__dirname, 'Nominas Claude');

// ═══════════════════════════════════════════════════════════════════════════
// COPIAR FUNCIONES DEL PARSER V2 desde frontend/index.html
// ═══════════════════════════════════════════════════════════════════════════

async function extractPdfText(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rows = {};
    for (const item of content.items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows[y]) rows[y] = [];
      rows[y].push({ x, str: item.str });
    }
    const sortedYs = Object.keys(rows).map(Number).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = rows[y].sort((a, b) => a.x - b.x);
      fullText += rowItems.map(i => i.str).join('  ') + '\n';
    }
    fullText += '\n';
  }
  return fullText;
}

function parseBinterNominaV2(text) {
  const startTime = performance.now();
  const warnings = [];
  const confidence = {};
  const debugInfo = {
    rawLineCount: text.split('\n').length,
    linesClassified: 0,
    linesUnclassified: [],
    detectionStrategies: {},
  };

  const n = s => {
    if (!s) return null;
    const cleaned = s.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  };

  const findNum = (pattern) => {
    const m = text.match(pattern);
    return m ? n(m[1]) : null;
  };

  const findTxt = (pattern) => {
    const m = text.match(pattern);
    return m ? m[1].trim() : null;
  };

  const result = {
    version: "2.0",
    empresa: { nombre: null, nif: null, domicilio: null, ccc: null },
    trabajador: { nombre: null, nif: null, nss: null, fecha_ingreso: null, funcion: null, nivel: null, base: null, puesto: null, categoria: null, grupo_profesional: null, centro_trabajo: null },
    periodo: { mes: null, anio: null, fecha_inicio: null, fecha_fin: null },
    tablaConceptos: [],
    devengos: {},
    deducciones: {},
    bases: {},
    totales: {},
    acumulados: {},
    costeEmpresa: {},
    calendarioMensual: {},
    observaciones: {},
    legacy: null,
    raw: { text: text, lines: text.split('\n'), parsingTimeMs: 0 },
    warnings: warnings,
    confidence: confidence,
    _debug: debugInfo,
  };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // EMPRESA
  const empresaNifM = text.match(/\b([A-Z]\d{7}[A-Z0-9])\b/);
  if (empresaNifM) {
    result.empresa.nif = empresaNifM[1];
    confidence.empresa_nif = empresaNifM[1] === 'B76038235' ? 1 : 0.8;
    if (empresaNifM[1] !== 'B76038235') {
      warnings.push('NIF empresa (' + empresaNifM[1] + ') no es Binter Canarias (B76038235)');
    }
  }
  const empresaNombreM = text.match(/BINTER\s+CANARIAS\s+S\.?A\.?/i);
  if (empresaNombreM) {
    result.empresa.nombre = empresaNombreM[0];
    confidence.empresa_nombre = 1;
  }

  // TRABAJADOR
  const nombreM = text.match(/TRABAJADOR\s+([\w\s]+?)\s+(?:N\.?I\.?F|NIF)/i)
    || text.match(/([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{5,40})\s+\d{2}\/\d{2}\/\d{4}/)
    || text.match(/Estimado\/a\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúña-z\s]+?)(?:\n|Se adelantan)/i);
  if (nombreM) {
    result.trabajador.nombre = nombreM[1].trim();
    confidence.trabajador_nombre = 0.9;
  }

  const _NIF_RE = /\b(\d{8}[A-Z])\b/g;
  const _nssAnchorM = text.match(/\b\d{11,12}\b/) || text.match(/\d{2}[\/-]\d{8}[\/-]\d{2}/);
  const _nssAnchorPos = _nssAnchorM ? text.indexOf(_nssAnchorM[0]) : -1;
  const _nifCands = [];
  let _nifTmp;
  while ((_nifTmp = _NIF_RE.exec(text)) !== null) {
    _nifCands.push({ nif: _nifTmp[1], pos: _nifTmp.index });
  }
  let nif = null;
  if (_nifCands.length === 1) {
    nif = _nifCands[0].nif;
    confidence.trabajador_nif = 0.9;
  } else if (_nifCands.length > 1 && _nssAnchorPos >= 0) {
    const _antes = _nifCands.filter(c => c.pos < _nssAnchorPos);
    if (_antes.length > 0) {
      const _cercano = _antes.reduce((a, b) => b.pos > a.pos ? b : a);
      if (_nssAnchorPos - _cercano.pos < 600) {
        nif = _cercano.nif;
        confidence.trabajador_nif = 0.8;
      }
    }
    if (!nif) {
      const _despues = _nifCands.filter(c => c.pos > _nssAnchorPos && c.pos - _nssAnchorPos < 200);
      if (_despues.length > 0) {
        nif = _despues[0].nif;
        confidence.trabajador_nif = 0.7;
      }
    }
  }
  result.trabajador.nif = nif;

  const nssM = text.match(/N[ºo°]?\s*(?:AFILIACI[ÓO]N|INS\.?\s*SEG\.?\s*SOC\.?|SS)\.?\s*(\d{11,12})/i)
    || text.match(/(\d{11,12})\s+(?:\d{8}[A-Z]|[A-Z]\d{7})/);
  if (nssM) {
    result.trabajador.nss = nssM[1];
    confidence.trabajador_nss = 0.9;
  }

  const ingresoM = text.match(/ANTIG[ÜU]EDAD\s+EMP\.?\s*(\d{2}\/\d{2}\/\d{4})/i)
    || text.match(/(\d{2}\/\d{2}\/\d{4})\s+PILOTO/i);
  if (ingresoM) {
    result.trabajador.fecha_ingreso = ingresoM[1];
    confidence.trabajador_fecha_ingreso = 0.9;
  }

  const puestoLineM = text.match(/(?:PUESTO|Puesto)[:\s]+([^\n]+)/i);
  const puestoTxt = puestoLineM ? puestoLineM[1].trim() : '';
  result.trabajador.puesto = puestoTxt || null;
  let funcion = 'CMD';
  if (/comandante/i.test(puestoTxt)) funcion = 'CMD';
  else if (/copiloto/i.test(puestoTxt)) funcion = 'COP';
  else if (/SCC|sobrecargo/i.test(puestoTxt)) funcion = 'SCC';
  else if (/CC|tripulante.*cabina/i.test(puestoTxt)) funcion = 'CC';
  else if (/CMDT|COMANDANTE|CMD/i.test(text)) funcion = 'CMD';
  else if (/COP|COPILOTO/i.test(text)) funcion = 'COP';
  result.trabajador.funcion = funcion;
  confidence.trabajador_funcion = puestoTxt ? 0.9 : 0.6;

  const nivelM = text.match(/(?:CMDT|COP)\.?\s*(\d)/i);
  if (nivelM) {
    result.trabajador.nivel = parseInt(nivelM[1]);
    confidence.trabajador_nivel = 0.8;
  }

  const centroLineM = text.match(/CENTRO\s+DE\s+TRABAJO[:\s]+([^\n]+)/i)
    || text.match(/Aeropuerto\s+([A-Z]{3})/i);
  let base = 'CANARIAS';
  if (centroLineM) {
    const ct = centroLineM[1].trim();
    result.trabajador.centro_trabajo = ct;
    if (/MAD|MADRID/i.test(ct)) base = 'MADRID';
    else if (/TFN|TENERIFE/i.test(ct)) base = 'TENERIFE';
    else if (/LPA|PALMAS|CANARIA/i.test(ct)) base = 'GRAN_CANARIA';
    confidence.trabajador_base = 0.9;
  } else if (/MAD|MADRID/i.test(text)) {
    base = 'MADRID';
    confidence.trabajador_base = 0.6;
  }
  result.trabajador.base = base;

  // PERIODO
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const periodoM = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*[-–]?\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (periodoM) {
    const mesIdx = parseInt(periodoM[2]) - 1;
    result.periodo.mes = MESES[mesIdx];
    result.periodo.anio = parseInt(periodoM[6]);
    result.periodo.fecha_inicio = periodoM[1] + '/' + periodoM[2] + '/' + periodoM[3];
    result.periodo.fecha_fin = periodoM[4] + '/' + periodoM[5] + '/' + periodoM[6];
    confidence.periodo = 0.95;
  }

  // TABLA CONCEPTOS
  const _NUM_RE = /[\d]{1,3}(?:\.[\d]{3})*,[\d]{2}/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nums = (line.match(new RegExp(_NUM_RE.source, 'g')) || []).map(s => n(s));
    const hasConcepto = /[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}/.test(line);
    if (nums.length > 0 && hasConcepto) {
      const unidadesM = line.match(/^([\d]+[,.][\d]{4})\s/);
      const pctM = line.match(/\d{1,2},\d{2}%/);
      const conceptoM = line.match(/([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s\.]+?)(?:\s+[\d.,]+|$)/);
      const conceptoRaw = conceptoM ? conceptoM[1].trim() : null;
      let tipo = 'desconocido';
      let subtipo = null;
      let confLinea = 0.5;
      if (/salario\s*base/i.test(line)) { tipo = 'devengo'; subtipo = 'salario_base'; confLinea = 1; }
      else if (/plus.*transporte/i.test(line)) { tipo = 'devengo'; subtipo = 'plus_transporte'; confLinea = 1; }
      else if (/hora.*vuelo.*t[1-4]/i.test(line)) { tipo = 'devengo'; subtipo = 'horas_vuelo'; confLinea = 0.95; }
      else if (/otros.*conceptos/i.test(line)) { tipo = 'devengo'; subtipo = 'dpo'; confLinea = 0.7; }
      else if (/complemento.*base/i.test(line)) { tipo = 'devengo'; subtipo = 'complemento_mad'; confLinea = 0.9; }
      else if (/dieta/i.test(line)) { tipo = 'devengo'; subtipo = 'dietas'; confLinea = 0.85; }
      else if (/cotizaci[oó]n.*cont.*comunes/i.test(line)) { tipo = 'deduccion'; subtipo = 'ss_cc'; confLinea = 1; }
      else if (/cotizaci[oó]n.*mei/i.test(line)) { tipo = 'deduccion'; subtipo = 'ss_mei'; confLinea = 1; }
      else if (/cotizaci[oó]n.*d\+?fp/i.test(line)) { tipo = 'deduccion'; subtipo = 'ss_dfp'; confLinea = 1; }
      else if (/solid.*tramo/i.test(line)) { tipo = 'deduccion'; subtipo = 'ss_solidaridad'; confLinea = 0.9; }
      else if (/retenci[oó]n.*irpf/i.test(line)) { tipo = 'deduccion'; subtipo = 'irpf'; confLinea = 1; }
      else if (/seguro.*m[eé]dico/i.test(line)) { tipo = 'deduccion'; subtipo = 'seguro_medico'; confLinea = 0.9; }
      if (tipo === 'desconocido' && nums.length >= 2) confLinea = 0.3;
      result.tablaConceptos.push({
        rawLine: line,
        unidades: unidadesM ? n(unidadesM[1]) : null,
        precio: null,
        porcentaje: pctM ? parseFloat(pctM[0].replace(',','.').replace('%','')) : null,
        base: nums.length >= 2 ? nums[nums.length - 2] : null,
        concepto: conceptoRaw,
        especieInfo: /especie/i.test(line) ? 'repercutida' : (/no\s*rep/i.test(line) ? 'no_repercutida' : null),
        devengo: tipo === 'devengo' ? nums[nums.length - 1] : null,
        retencion: tipo === 'deduccion' ? nums[nums.length - 1] : null,
        tipo: tipo,
        subtipo: subtipo,
        confidence: confLinea,
      });
      debugInfo.linesClassified++;
    } else if (nums.length > 0 && !hasConcepto) {
      debugInfo.linesUnclassified.push({ line, reason: 'tiene números pero sin concepto descriptivo' });
    }
  }

  // DEVENGOS/DEDUCCIONES agregados
  result.devengos.salario_base = result.tablaConceptos.find(c => c.subtipo === 'salario_base')?.devengo || null;
  result.devengos.plus_transporte = result.tablaConceptos.find(c => c.subtipo === 'plus_transporte')?.devengo || null;
  result.devengos.dpo = result.tablaConceptos.find(c => c.subtipo === 'dpo')?.devengo || null;
  result.devengos.complemento_mad = result.tablaConceptos.find(c => c.subtipo === 'complemento_mad')?.devengo || null;
  const hvLineas = result.tablaConceptos.filter(c => c.subtipo === 'horas_vuelo');
  result.devengos.horas_vuelo = hvLineas.reduce((sum, c) => sum + (c.devengo || 0), 0) || null;
  result.devengos.hv_t1_imp = hvLineas.find(c => /t1/i.test(c.rawLine))?.devengo || null;
  result.devengos.hv_t2_imp = hvLineas.find(c => /t2/i.test(c.rawLine))?.devengo || null;
  result.devengos.hv_t3_imp = hvLineas.find(c => /t3/i.test(c.rawLine))?.devengo || null;
  result.devengos.hv_t4_imp = hvLineas.find(c => /t4/i.test(c.rawLine))?.devengo || null;
  result.devengos.hv_t1_uds = hvLineas.find(c => /t1/i.test(c.rawLine))?.unidades || null;
  result.devengos.hv_t2_uds = hvLineas.find(c => /t2/i.test(c.rawLine))?.unidades || null;
  const dietasExLineas = result.tablaConceptos.filter(c => c.subtipo === 'dietas' && /exenta/i.test(c.rawLine));
  const dietasSujLineas = result.tablaConceptos.filter(c => c.subtipo === 'dietas' && /sujeta/i.test(c.rawLine));
  result.devengos.dietas_exentas = dietasExLineas.reduce((s, c) => s + (c.devengo || 0), 0) || null;
  result.devengos.dietas_sujetas = dietasSujLineas.reduce((s, c) => s + (c.devengo || 0), 0) || null;
  result.deducciones.ss_cc = result.tablaConceptos.find(c => c.subtipo === 'ss_cc')?.retencion || null;
  result.deducciones.ss_mei = result.tablaConceptos.find(c => c.subtipo === 'ss_mei')?.retencion || null;
  result.deducciones.ss_dfp = result.tablaConceptos.find(c => c.subtipo === 'ss_dfp')?.retencion || null;
  const ssSolLineas = result.tablaConceptos.filter(c => c.subtipo === 'ss_solidaridad');
  result.deducciones.ss_solidaridad = ssSolLineas.reduce((s, c) => s + (c.retencion || 0), 0) || null;
  result.deducciones.irpf_retencion = result.tablaConceptos.find(c => c.subtipo === 'irpf' && !/especie/i.test(c.rawLine))?.retencion || null;
  result.deducciones.irpf_especie = result.tablaConceptos.find(c => c.subtipo === 'irpf' && /especie/i.test(c.rawLine))?.retencion || null;
  result.deducciones.seguro_medico = result.tablaConceptos.find(c => c.subtipo === 'seguro_medico')?.retencion || null;
  const ssccLinea = result.tablaConceptos.find(c => c.subtipo === 'ss_cc');
  if (ssccLinea && ssccLinea.porcentaje) {
    result.deducciones.ss_cc_pct = ssccLinea.porcentaje;
    confidence.ss_cc_pct = 0.9;
  }
  const irpfLineaM = text.split('\n').find(l =>
    /Retenci[oó]n\s+A\s+Cuenta\s+Del\s+Irpf/i.test(l) && !/[Ee]specie/i.test(l)
  );
  if (irpfLineaM) {
    const pctM = irpfLineaM.match(/^([\d]+[,.][\d]+)%/);
    if (pctM) {
      result.deducciones.irpf_pct = parseFloat(pctM[1].replace(',','.'));
      confidence.irpf_pct = 0.95;
    }
  }

  // BASES Y TOTALES
  for (const line of lines) {
    const nums = (line.match(new RegExp(_NUM_RE.source, 'g')) || []).map(s => n(s)).filter(v => v !== null);
    if (nums.length >= 8 && nums[0] > 1000 && nums[3] > 1000) {
      result.bases.base_ss = nums[3];
      result.bases.base_irpf = nums[5];
      result.totales.total_devengado = nums[6];
      result.totales.total_deducciones = nums[7];
      confidence.bases_totales_pie = 0.9;
      break;
    }
  }
  for (const line of lines) {
    const liqM = line.match(/([\d.]+,\d+)\s*€/);
    if (liqM && !line.includes('Acum.')) {
      result.totales.liquido = n(liqM[1]);
      confidence.liquido = 0.85;
      break;
    }
  }

  // ACUMULADOS
  const _RN_ACM = '[\\d]{1,3}(?:\\.\\d{3})*,\\d{2}';
  const _RN_ACM_RE = new RegExp('^' + _RN_ACM + '$');
  function _findAcum(lns, labelRe) {
    for (let _i = 0; _i < lns.length; _i++) {
      const _line = lns[_i];
      if (!labelRe.test(_line)) continue;
      const _nAcum = (_line.match(/Acum\./g) || []).length;
      const _inlineNums = _line.match(new RegExp(_RN_ACM, 'g')) || [];
      const _firstAcumIdx = _line.indexOf('Acum.');
      const _thisMatch = labelRe.exec(_line);
      const _isFirst = _thisMatch && (_thisMatch.index === _firstAcumIdx);
      const _scanBack = () => {
        for (let _j = _i - 1; _j >= Math.max(0, _i - 4); _j--) {
          if (_RN_ACM_RE.test(lns[_j])) return n(lns[_j]);
          if (lns[_j] && /Acum\./i.test(lns[_j])) break;
        }
        return null;
      };
      if (_nAcum <= 1) {
        if (_inlineNums.length > 0) return n(_inlineNums[_inlineNums.length - 1]);
        const _back = _scanBack();
        if (_back !== null) return _back;
      } else {
        if (_isFirst) {
          const _back = _scanBack();
          if (_back !== null) return _back;
        } else {
          if (_inlineNums.length > 0) return n(_inlineNums[_inlineNums.length - 1]);
        }
      }
    }
    return null;
  }
  const _lns_acm = lines;
  result.acumulados.base_irpf = _findAcum(_lns_acm, /Acum\.\s+Base\s+IRPF\s*$/i);
  result.acumulados.irpf = _findAcum(_lns_acm, /Acum\.\s+IRPF\s*$/i);
  result.acumulados.cotiz_ss = _findAcum(_lns_acm, /Acum\.?\s*Cotiz/i);
  result.acumulados.base_esp_rep = _findAcum(_lns_acm, /Acum\.\s+Base\s+Esp/i);
  result.acumulados.irpf_esp_rep = _findAcum(_lns_acm, /Acum\.\s+IRPF\s+Esp.*?Rep(?!.*No)/i);
  result.acumulados.base_esp_norep = _findAcum(_lns_acm, /Acum\.\s+Base\s+Esp.*?No\s+Rep/i);
  result.acumulados.irpf_esp_norep = _findAcum(_lns_acm, /Acum\.\s+IRPF\s+Esp.*?No\s+Rep/i);
  if (result.acumulados.base_irpf) confidence.acumulados = 0.8;

  // CALENDARIO MENSUAL
  const _CODIGOS_DIAS = {
    EN:'Enfermedad', AC:'Accidente', MA:'Maternidad', ER:'ERE',
    VA:'Vacaciones', PA:'Paternidad', RE:'Riesgo Embarazo', HU:'Huelga', AU:'Ausencia'
  };
  const _tiraLine = lines.find(l => (l.match(/\d\.\d/g) || []).length >= 10) || '';
  let _tiraSep = _tiraLine;
  for (let _k = 0; _k < 5; _k++) _tiraSep = _tiraSep.replace(/(\d\.\d)(\d)/g, '$1 $2');
  const _tiraVals = (_tiraSep.match(/\b\d{1,3}\.\d\b/g) || []).map(Number);
  const _diasConInc = [];
  const _codigosRes = {};
  let _diasTrabajados = 0;
  _tiraVals.forEach((v, i) => {
    if (v === 100) _diasTrabajados++;
    else if (v > 0 && v < 100) {
      _diasConInc.push({ dia: i + 1, cod: 'IT', nombre: 'Baja/Incidencia', pct: v });
      _codigosRes['IT'] = (_codigosRes['IT'] || 0) + 1;
    }
  });
  (_tiraLine.split(/\s+/) || []).forEach((tok, i) => {
    const cod = tok.toUpperCase();
    if (_CODIGOS_DIAS[cod]) {
      _diasConInc.push({ dia: i + 1, cod, nombre: _CODIGOS_DIAS[cod] });
      _codigosRes[cod] = (_codigosRes[cod] || 0) + 1;
      if (_tiraVals[i] === 100) _diasTrabajados--;
    }
  });
  result.calendarioMensual.diasInfo = {
    diasTrabajados: _tiraVals.length > 0 ? _diasTrabajados : null,
    totalDias: _tiraVals.length,
    totalConIncidencia: _diasConInc.length,
    diasConCodigo: _diasConInc,
    codigosResumen: _codigosRes,
  };
  result.calendarioMensual.bajaInfo = _diasConInc.length > 0
    ? { detectada: true, resumen: Object.entries(_codigosRes).map(([c,n])=>`${c}:${n}`).join(', ') }
    : { detectada: false };
  if (_tiraVals.length > 0) confidence.calendarioMensual = 0.85;

  // CONFIDENCE GLOBAL
  const confValues = Object.values(confidence).filter(v => typeof v === 'number');
  const confMedia = confValues.length > 0 ? confValues.reduce((a,b) => a+b, 0) / confValues.length : 0;
  const camposCriticos = ['trabajador_nombre', 'trabajador_nif', 'periodo', 'liquido', 'bases_totales_pie'];
  const criticosOK = camposCriticos.filter(k => confidence[k] && confidence[k] >= 0.7).length;
  const factorCobertura = criticosOK / camposCriticos.length;
  confidence.global = confMedia * factorCobertura;

  // WARNINGS
  if (result.tablaConceptos.length === 0) warnings.push('No se detectaron líneas de conceptos en tablaConceptos[]');
  if (debugInfo.linesUnclassified.length > result.tablaConceptos.length * 0.5) warnings.push('Más del 50% de líneas con números quedaron sin clasificar');
  if (!result.trabajador.nombre) warnings.push('Nombre trabajador no detectado');
  if (!result.trabajador.nif) warnings.push('NIF trabajador no detectado');
  if (!result.periodo.mes) warnings.push('Periodo no detectado');

  result.raw.parsingTimeMs = performance.now() - startTime;
  result.warnings = warnings;
  result.confidence = confidence;
  result._debug = debugInfo;

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDACIÓN CON NÓMINAS REALES
// ═══════════════════════════════════════════════════════════════════════════

async function validateAll() {
  const files = fs.readdirSync(NOMINAS_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`\n═══════════════════════════════════════════════════════════════════════════`);
  console.log(`VALIDACIÓN PARSER V2 — ${files.length} NÓMINAS REALES`);
  console.log(`═══════════════════════════════════════════════════════════════════════════\n`);

  const results = [];

  for (const file of files) {
    const filePath = path.join(NOMINAS_DIR, file);
    console.log(`\n📄 Procesando: ${file}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const text = await extractPdfText(filePath);
      const v2 = parseBinterNominaV2(text);
      results.push({ file, v2, success: true });

      // INFORME POR NÓMINA
      printNominaReport(file, v2);

    } catch (e) {
      console.error(`❌ ERROR: ${e.message}\n`);
      results.push({ file, error: e.message, success: false });
    }
  }

  // INFORME AGREGADO
  printAggregateReport(results);

  // GUARDAR JSON
  fs.writeFileSync(
    path.join(__dirname, 'parser-v2-validation-results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`\n✅ Resultados guardados en: parser-v2-validation-results.json\n`);
}

function printNominaReport(file, v2) {
  const fmt = v => v !== null && v !== undefined ? v : '—';
  const fmtEur = v => v !== null ? v.toLocaleString('es-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' €' : '—';

  console.log(`┌─ EMPRESA ─────────────────────────────────────────────────────────────────┐`);
  console.log(`│ Nombre: ${fmt(v2.empresa.nombre)}`);
  console.log(`│ NIF:    ${fmt(v2.empresa.nif)}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌─ TRABAJADOR ──────────────────────────────────────────────────────────────┐`);
  console.log(`│ Nombre:        ${fmt(v2.trabajador.nombre)}`);
  console.log(`│ NIF:           ${fmt(v2.trabajador.nif)}`);
  console.log(`│ NSS:           ${fmt(v2.trabajador.nss)}`);
  console.log(`│ Antigüedad:    ${fmt(v2.trabajador.fecha_ingreso)}`);
  console.log(`│ Puesto:        ${fmt(v2.trabajador.puesto)}`);
  console.log(`│ Función:       ${fmt(v2.trabajador.funcion)}`);
  console.log(`│ Nivel:         ${fmt(v2.trabajador.nivel)}`);
  console.log(`│ Base:          ${fmt(v2.trabajador.base)}`);
  console.log(`│ Centro:        ${fmt(v2.trabajador.centro_trabajo)}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌─ PERIODO ─────────────────────────────────────────────────────────────────┐`);
  console.log(`│ Mes:    ${fmt(v2.periodo.mes)}`);
  console.log(`│ Año:    ${fmt(v2.periodo.anio)}`);
  console.log(`│ Inicio: ${fmt(v2.periodo.fecha_inicio)}`);
  console.log(`│ Fin:    ${fmt(v2.periodo.fecha_fin)}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌─ BASES Y TOTALES ─────────────────────────────────────────────────────────┐`);
  console.log(`│ Base SS:           ${fmtEur(v2.bases.base_ss)}`);
  console.log(`│ Base IRPF:         ${fmtEur(v2.bases.base_irpf)}`);
  console.log(`│ Total Devengado:   ${fmtEur(v2.totales.total_devengado)}`);
  console.log(`│ Total Deducciones: ${fmtEur(v2.totales.total_deducciones)}`);
  console.log(`│ Líquido:           ${fmtEur(v2.totales.liquido)}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌─ IRPF ────────────────────────────────────────────────────────────────────┐`);
  console.log(`│ Porcentaje: ${fmt(v2.deducciones.irpf_pct)}%`);
  console.log(`│ Base:       ${fmtEur(v2.bases.base_irpf)}`);
  console.log(`│ Retenido:   ${fmtEur(v2.deducciones.irpf_retencion)}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌─ ACUMULADOS ──────────────────────────────────────────────────────────────┐`);
  for (const [k, v] of Object.entries(v2.acumulados)) {
    if (v !== null) console.log(`│ ${k.padEnd(20)}: ${fmtEur(v)}`);
  }
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  console.log(`┌─ TABLA DE CONCEPTOS ──────────────────────────────────────────────────────┐`);
  console.log(`│ Total detectadas:  ${v2.tablaConceptos.length}`);
  const clasificadas = v2.tablaConceptos.filter(c => c.tipo !== 'desconocido').length;
  const desconocidas = v2.tablaConceptos.filter(c => c.tipo === 'desconocido').length;
  const pctClasif = v2.tablaConceptos.length > 0 ? (clasificadas / v2.tablaConceptos.length * 100).toFixed(1) : 0;
  console.log(`│ Clasificadas:      ${clasificadas} (${pctClasif}%)`);
  console.log(`│ Desconocidas:      ${desconocidas}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘`);

  v2.tablaConceptos.forEach((c, i) => {
    const tipoColor = c.tipo === 'devengo' ? '+' : (c.tipo === 'deduccion' ? '-' : '?');
    const imp = c.devengo || c.retencion;
    const conf = c.confidence.toFixed(2);
    console.log(`  ${(i+1).toString().padStart(2)}. [${tipoColor}] ${(c.subtipo||'desconocido').padEnd(20)} ${fmtEur(imp).padStart(12)} (${conf})`);
    if (c.tipo === 'desconocido') {
      console.log(`      ⚠️  ${c.concepto || c.rawLine.substring(0, 60)}`);
    }
  });
  console.log();

  if (v2._debug.linesUnclassified.length > 0) {
    console.log(`┌─ LÍNEAS NO CLASIFICADAS ──────────────────────────────────────────────────┐`);
    console.log(`│ Total: ${v2._debug.linesUnclassified.length}`);
    console.log(`└───────────────────────────────────────────────────────────────────────────┘`);
    v2._debug.linesUnclassified.slice(0, 10).forEach(u => {
      console.log(`  • ${u.reason}`);
      console.log(`    → ${u.line.substring(0, 80)}`);
    });
    if (v2._debug.linesUnclassified.length > 10) {
      console.log(`  ... y ${v2._debug.linesUnclassified.length - 10} más\n`);
    }
  }

  if (v2.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS:`);
    v2.warnings.forEach(w => console.log(`   - ${w}`));
  }

  console.log(`\n⏱  Parsing time: ${v2.raw.parsingTimeMs.toFixed(2)}ms`);
  console.log(`🎯 Confidence global: ${v2.confidence.global.toFixed(3)}\n`);
}

function printAggregateReport(results) {
  console.log(`\n\n═══════════════════════════════════════════════════════════════════════════`);
  console.log(`INFORME AGREGADO — TODAS LAS NÓMINAS`);
  console.log(`═══════════════════════════════════════════════════════════════════════════\n`);

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Procesadas exitosamente: ${successful.length}/${results.length}`);
  if (failed.length > 0) {
    console.log(`❌ Fallidas: ${failed.length}`);
    failed.forEach(f => console.log(`   - ${f.file}: ${f.error}`));
  }

  if (successful.length === 0) {
    console.log(`\n❌ No hay resultados para analizar.\n`);
    return;
  }

  console.log(`\n┌─ ESTADÍSTICAS GLOBALES ───────────────────────────────────────────────────┐`);

  const totalConceptos = successful.reduce((s, r) => s + r.v2.tablaConceptos.length, 0);
  const avgConceptos = (totalConceptos / successful.length).toFixed(1);
  const totalClasificadas = successful.reduce((s, r) => s + r.v2.tablaConceptos.filter(c => c.tipo !== 'desconocido').length, 0);
  const totalDesconocidas = successful.reduce((s, r) => s + r.v2.tablaConceptos.filter(c => c.tipo === 'desconocido').length, 0);
  const pctClasifGlobal = totalConceptos > 0 ? (totalClasificadas / totalConceptos * 100).toFixed(1) : 0;
  const avgConfidence = (successful.reduce((s, r) => s + r.v2.confidence.global, 0) / successful.length).toFixed(3);

  console.log(`│ tablaConceptos promedio:  ${avgConceptos} líneas/nómina`);
  console.log(`│ Total clasificadas:       ${totalClasificadas} (${pctClasifGlobal}%)`);
  console.log(`│ Total desconocidas:       ${totalDesconocidas}`);
  console.log(`│ Confidence promedio:      ${avgConfidence}`);
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  // COBERTURA POR CAMPO
  console.log(`┌─ COBERTURA POR CAMPO ─────────────────────────────────────────────────────┐`);
  const checkField = (path) => {
    const count = successful.filter(r => {
      const val = path.split('.').reduce((obj, key) => obj?.[key], r.v2);
      return val !== null && val !== undefined;
    }).length;
    const pct = (count / successful.length * 100).toFixed(0);
    return { count, pct };
  };

  const fields = [
    'empresa.nif',
    'empresa.nombre',
    'trabajador.nombre',
    'trabajador.nif',
    'trabajador.nss',
    'trabajador.fecha_ingreso',
    'trabajador.puesto',
    'trabajador.funcion',
    'trabajador.nivel',
    'trabajador.base',
    'periodo.mes',
    'periodo.anio',
    'bases.base_ss',
    'bases.base_irpf',
    'totales.total_devengado',
    'totales.total_deducciones',
    'totales.liquido',
    'deducciones.irpf_pct',
    'deducciones.irpf_retencion',
    'deducciones.ss_cc_pct',
    'acumulados.base_irpf',
    'acumulados.irpf',
  ];

  fields.forEach(f => {
    const { count, pct } = checkField(f);
    const bar = '█'.repeat(Math.floor(pct / 5));
    console.log(`│ ${f.padEnd(30)} ${count}/${successful.length} (${pct}%) ${bar}`);
  });
  console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);

  // CONCEPTOS DESCONOCIDOS RECURRENTES
  const allDesconocidos = successful.flatMap(r =>
    r.v2.tablaConceptos.filter(c => c.tipo === 'desconocido').map(c => c.concepto || c.rawLine)
  );
  const freq = {};
  allDesconocidos.forEach(c => {
    const key = c.substring(0, 40);
    freq[key] = (freq[key] || 0) + 1;
  });
  const topDesconocidos = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, 10);

  if (topDesconocidos.length > 0) {
    console.log(`┌─ CONCEPTOS DESCONOCIDOS MÁS FRECUENTES ──────────────────────────────────┐`);
    topDesconocidos.forEach(([concepto, count]) => {
      console.log(`│ ${count}× ${concepto}`);
    });
    console.log(`└───────────────────────────────────────────────────────────────────────────┘\n`);
  }
}

validateAll().catch(console.error);
