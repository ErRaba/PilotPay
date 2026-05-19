// ═══════════════════════════════════════════════════════════════════════════
// PILOTPAY — AUDIT ENGINE  (frontend/js/auditEngine.js)
// Motor de auditoría salarial — completamente agnóstico del DOM.
// No accede a document, window.* ni globales de la app.
// Recibe todo por parámetro; devuelve objetos puros.
// Expuesto como window.auditEngine para compatibilidad con scripts no-ES.
// ═══════════════════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  // ── SECCIÓN 1: CLASIFICACIÓN ─────────────────────────────────────────────
  // Define qué conceptos son causas raíz, qué son derivados y cuál es el
  // concepto final de impacto neto. Estas constantes se usan tanto en el
  // cálculo como en el render de badges de la comparativa.

  // Causas raíz: discrepancia con origen en retribución pactada o variables
  // reales. Una diferencia aquí CAUSA diferencias en los derivados.
  var ROOT_CONCEPTS = new Set([
    'Salario Base',
    'Plus Transporte',
    'Horas de Vuelo',
    'DPO',
    'Comp. Base MAD',
    'Dietas exentas'
  ]);

  // Derivados: consecuencia algebraica de los raíz.
  // Sumarlos al impacto independientemente duplicaría el efecto.
  var DERIVED_CONCEPTS = new Set([
    'Total Devengado',
    'Base IRPF',
    'Base SS',
    'SS Trabajador',
    'Retención IRPF'
  ]);

  // Concepto final: único punto de medida del impacto neto percibido.
  var FINAL_CONCEPT = 'Líquido neto';


  // ── SECCIÓN 2: CÁLCULO DE DIFFS ──────────────────────────────────────────
  // Compara el resultado teórico del motor con los datos reales del PDF.

  /**
   * Construye el array de diferencias concepto a concepto.
   * Idéntico al bloque inline original de renderComparativa.
   * No redondea el delta — igual que el código original — para que
   * los umbrales de clasificación funcionen exactamente igual.
   *
   * @param {object} r        calcResult del motor de nómina
   * @param {object} nomData  datos parseados de la nómina PDF
   * @returns {Array<{concept, teorico, real, delta, status}>}
   */
  function computeDiffs(r, nomData) {
    var t   = nomData.totales      || {};
    var d   = nomData.devengos     || {};
    var ded = nomData.deducciones  || {};

    var diffs = [];

    function addDiff(concept, teorico, real, umbral) {
      if (umbral === undefined) umbral = 1;
      if (!real && real !== 0) return;
      var delta  = real - teorico;
      var status = Math.abs(delta) < umbral ? 'ok' : (delta < -umbral ? 'err' : 'warn');
      diffs.push({ concept: concept, teorico: teorico, real: real, delta: delta, status: status });
    }

    addDiff('Salario Base',    r.sb,             d.salario_base,   0.5);
    addDiff('Plus Transporte', r.plus_tr,        d.plus_transporte, 0.5);
    addDiff('Horas de Vuelo',  r.hvTotal,        d.horas_vuelo,    2);
    addDiff('DPO',             r.dpo,            d.dpo,            1);
    if (r.compMad > 0) addDiff('Comp. Base MAD', r.compMad, d.complemento_mad, 1);
    addDiff('Dietas exentas',  r.totalDietasEx,  d.dietas_exentas, 2);
    addDiff('Total Devengado', r.totalDevengado, t.total_devengado, 2);
    addDiff('Base IRPF',       r.baseIRPF,       t.base_irpf,      2);
    addDiff('Base SS',         r.baseSS,         t.base_ss,        5);
    addDiff('SS Trabajador',   r.ss_total,
      (ded.ss_cc || 0) + (ded.ss_mei || 0) + (ded.ss_dfp || 0) + (ded.ss_solidaridad || 0), 2);
    addDiff('Retención IRPF',  r.retencionIRPF,  ded.irpf_retencion, 2);
    addDiff('Líquido neto',    r.liquidoReal,    t.liquido,        2);

    return diffs;
  }

  /**
   * Clasifica un array de diffs en grupos semánticos.
   *
   * @param {Array} diffs  resultado de computeDiffs
   * @returns {{ diffsRaiz, diffsDerivados, errores, avisos, liqDiff }}
   */
  function classifyDiffs(diffs) {
    var diffsRaiz      = diffs.filter(function(d) { return ROOT_CONCEPTS.has(d.concept)    && d.status !== 'ok'; });
    var diffsDerivados = diffs.filter(function(d) { return DERIVED_CONCEPTS.has(d.concept) && d.status !== 'ok'; });
    var errores        = diffs.filter(function(d) { return d.status === 'err'; });
    var avisos         = diffs.filter(function(d) { return d.status === 'warn'; });
    var liqDiff        = diffs.find(function(d)   { return d.concept === FINAL_CONCEPT; }) || null;

    return {
      diffsRaiz:      diffsRaiz,
      diffsDerivados: diffsDerivados,
      errores:        errores,
      avisos:         avisos,
      liqDiff:        liqDiff
    };
  }


  // ── SECCIÓN 3: CÁLCULO NETO ───────────────────────────────────────────────
  // El impacto neto se mide SIEMPRE desde el líquido, nunca sumando derivados.

  /**
   * Calcula el delta neto real.
   * - Usa el líquido neto si está disponible (caso normal).
   * - Si no, estima sumando solo las causas raíz (fallback).
   * - Devuelve null si no hay datos suficientes.
   *
   * @param {object} classified  resultado de classifyDiffs
   * @returns {number|null}
   */
  function computeTotalDelta(classified) {
    var liqDiff    = classified.liqDiff;
    var diffsRaiz  = classified.diffsRaiz;

    if (liqDiff) return liqDiff.delta;

    if (diffsRaiz.length > 0) {
      return diffsRaiz.reduce(function(s, d) { return s + (d.delta || 0); }, 0);
    }

    return null;
  }


  // ── SECCIÓN 4: PROPUESTAS DE ACTUALIZACIÓN ────────────────────────────────
  // Detecta qué campos del perfil/histórico difieren del PDF y genera la lista
  // de propuestas. No toca el DOM; devuelve un array puro.

  var _MESES_IDX = {
    Enero:1, Febrero:2, Marzo:3, Abril:4, Mayo:5, Junio:6,
    Julio:7, Agosto:8, Septiembre:9, Octubre:10, Noviembre:11, Diciembre:12
  };

  /**
   * Compara los datos extraídos del PDF con el perfil/histórico actual y
   * devuelve la lista de propuestas de actualización detectadas.
   *
   * @param {object} nomData       datos parseados de la nómina
   * @param {object} profileData   perfil actual del usuario
   * @param {object} simHistorico  profileData.simHistorico (puede ser null)
   * @returns {Array} propuestas
   */
  function buildPropuestasActualizacion(nomData, profileData, simHistorico) {
    var _t2  = nomData.trabajador || {};
    var _ac2 = nomData.acumulados || {};

    var _mesRaw = (nomData.periodo && nomData.periodo.mes) ? nomData.periodo.mes.trim() : null;
    var _mesStr = _mesRaw
      ? (_mesRaw.charAt(0).toUpperCase() + _mesRaw.slice(1).toLowerCase())
      : null;
    var _mesIdx = _mesStr ? (_MESES_IDX[_mesStr] || null) : null;

    var props = [];

    if (_t2.nombre && _t2.nombre !== profileData.fullName)
      props.push({ campo: 'Nombre', clave: 'fullName', nuevo: _t2.nombre,
        tipo: 'perfil', actual: profileData.fullName || '—', checked: true });

    if (_t2.nif && _t2.nif !== profileData.nif)
      props.push({ campo: 'NIF', clave: 'nif', nuevo: _t2.nif,
        tipo: 'perfil', actual: profileData.nif || '—', checked: true });

    if (_t2.nss && _t2.nss !== profileData.nss)
      props.push({ campo: 'Nº SS', clave: 'nss', nuevo: _t2.nss,
        tipo: 'perfil', actual: profileData.nss || '—', checked: true });

    if (_t2.fecha_ingreso && _t2.fecha_ingreso !== profileData.ingreso_display)
      props.push({ campo: 'Fecha ingreso', clave: 'ingreso_display', nuevo: _t2.fecha_ingreso,
        tipo: 'perfil', actual: profileData.ingreso_display || '—', checked: true });

    if (_ac2.base_irpf != null && _mesIdx) {
      var _curB = (simHistorico && simHistorico[_mesIdx])
        ? simHistorico[_mesIdx].bruto : null;
      if (_curB == null || _curB !== _ac2.base_irpf)
        props.push({ campo: 'Acum. Base IRPF (' + _mesStr + ')',
          clave: 'acum_base_irpf', nuevo: _ac2.base_irpf,
          tipo: 'historico', mesIdx: _mesIdx, mesStr: _mesStr,
          actual: _curB != null ? _curB : '—', checked: true });
    }

    if (_ac2.irpf != null && _mesIdx) {
      var _curI = (simHistorico && simHistorico[_mesIdx])
        ? simHistorico[_mesIdx].irpf : null;
      if (_curI == null || _curI !== _ac2.irpf)
        props.push({ campo: 'Acum. IRPF retenido (' + _mesStr + ')',
          clave: 'acum_irpf', nuevo: _ac2.irpf,
          tipo: 'historico', mesIdx: _mesIdx, mesStr: _mesStr,
          actual: _curI != null ? _curI : '—', checked: true });
    }

    if (_ac2.base_irpf != null && !_mesIdx)
      props.push({ campo: 'Acum. Base IRPF (mes no detectado)', clave: 'acum_base_irpf',
        nuevo: _ac2.base_irpf, tipo: 'historico', mesIdx: null, mesStr: null,
        actual: '—', checked: false });

    if (_ac2.irpf != null && !_mesIdx)
      props.push({ campo: 'Acum. IRPF retenido (mes no detectado)', clave: 'acum_irpf',
        nuevo: _ac2.irpf, tipo: 'historico', mesIdx: null, mesStr: null,
        actual: '—', checked: false });

    return props;
  }


  // ── SECCIÓN 5: HISTORIAL — construcción del registro ─────────────────────
  // Construye el objeto record para el historial de auditorías.
  // NO persiste; devuelve el objeto puro. El llamador hace el hstSave().

  /**
   * @param {object} nomData      datos parseados de la nómina
   * @param {Array}  diffs        resultado de computeDiffs
   * @param {number|null} totalDelta
   * @param {Array}  errores      resultado de classifyDiffs
   * @param {Array}  avisos       resultado de classifyDiffs
   * @param {object} ctx          { calcResult, profileData, currentUser, currentNivel, USERS }
   * @returns {object} record listo para persistir
   */
  function buildAuditRecord(nomData, diffs, totalDelta, errores, avisos, ctx) {
    var r   = (ctx && ctx.calcResult)   || {};
    var t   = nomData.totales    || {};
    var tra = nomData.trabajador  || {};
    var per = nomData.periodo     || {};

    var nombre = tra.nombre
      || (ctx && ctx.profileData && ctx.profileData.fullName) || '';
    var cargo  = (ctx && ctx.currentUser && ctx.USERS && ctx.USERS[ctx.currentUser])
      ? (ctx.USERS[ctx.currentUser].funcion || '') : '';
    var nivel  = (ctx && ctx.currentNivel) || '';

    var mesStr = per.mes
      ? (per.mes.charAt(0).toUpperCase() + per.mes.slice(1).toLowerCase()) : '';
    // Soporta tanto 'anyo' (backend) como 'anio' (parser frontend) como 'año'
    var anyo   = per.anyo || per.anio || per.año || '';

    var liqTeorico = typeof r.liquidoReal === 'number' ? r.liquidoReal : null;
    var liqReal    = (t.liquido != null) ? t.liquido : null;
    var diff       = (totalDelta != null) ? totalDelta : null;

    var estado = 'ok';
    if (errores && errores.length > 0) estado = 'alerta';
    else if (avisos && avisos.length > 0) estado = 'aviso';

    var discrepancias = (diffs || [])
      .filter(function(d) { return d.status !== 'ok'; })
      .map(function(d) {
        return {
          concept : d.concept,
          teorico : d.teorico,
          real    : d.real,
          delta   : d.delta,
          status  : d.status
        };
      });

    var ac = nomData.acumulados || {};
    var di = nomData.diasInfo   || {};
    var datosExtraidos = {};
    if (tra.nif)           datosExtraidos.nif             = tra.nif;
    if (tra.nss)           datosExtraidos.nss             = tra.nss;
    if (tra.fecha_ingreso) datosExtraidos.fecha_ingreso   = tra.fecha_ingreso;
    if (nomData.irpf_pct)  datosExtraidos.irpf_pct        = nomData.irpf_pct;
    if (t.total_devengado) datosExtraidos.total_devengado = t.total_devengado;
    if (t.base_irpf)       datosExtraidos.base_irpf       = t.base_irpf;
    if (t.base_ss)         datosExtraidos.base_ss         = t.base_ss;
    if (ac.base_irpf)      datosExtraidos.acum_base_irpf  = ac.base_irpf;
    if (ac.irpf)           datosExtraidos.acum_irpf       = ac.irpf;
    if (di.diasTrabajados) datosExtraidos.dias_trabajados = di.diasTrabajados;

    return {
      id             : Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      fechaAuditoria : new Date().toISOString(),
      mes            : mesStr,
      anyo           : anyo,
      nombre         : nombre,
      cargo          : cargo,
      nivel          : nivel,
      liqTeorico     : liqTeorico,
      liqReal        : liqReal,
      diff           : diff,
      estado         : estado,
      nDiscrepancias : discrepancias.length,
      discrepancias  : discrepancias,
      datosExtraidos : datosExtraidos
    };
  }


  // ── SECCIÓN 6: RECLAMACIONES ──────────────────────────────────────────────
  // Genera el texto plano de la consulta de revisión salarial.
  // No crea Blob ni toca el DOM; devuelve un string puro.
  // El llamador es responsable de la descarga.

  /**
   * @param {Array}  causasRaiz        diffs de tipo raíz con discrepancia
   * @param {number} totalDeltaLiq     delta del líquido neto
   * @param {Array}  nombresDerivados  nombres de conceptos derivados con diferencias
   * @param {object} ctx  { nombre, nif, funLabel, nivel, base, mes, año, fecha }
   * @returns {string}
   */
  function buildReclamacionText(causasRaiz, totalDeltaLiq, nombresDerivados, ctx) {
    var nombre   = ctx.nombre   || '___________';
    var nif      = ctx.nif      || '___________';
    var funLabel = ctx.funLabel || ctx.funcion || '___';
    var nivel    = ctx.nivel    || '___';
    var base     = ctx.base     || 'Canarias';
    var mes      = ctx.mes      || '___';
    var año      = ctx.año      || new Date().getFullYear();
    var fecha    = ctx.fecha    || new Date().toLocaleDateString('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    var fmt = function(v) {
      return Number(v).toLocaleString('es-ES', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      });
    };

    var difNeta    = totalDeltaLiq != null ? totalDeltaLiq : 0;
    var difNetaStr = fmt(Math.abs(difNeta)) + ' €' + (difNeta < 0 ? ' de menos' : ' de más');

    var causaLines = (causasRaiz || []).map(function(e) {
      var delta = e.delta || 0;
      var dir   = delta < 0 ? '↓' : '↑';
      return '  ' + dir + ' ' + e.concept.padEnd(20)
        + ' teorico ' + fmt(e.teorico != null ? e.teorico : 0) + ' €'
        + '  /  nómina ' + fmt(e.real != null ? e.real : 0) + ' €'
        + '  /  dif. ' + fmt(Math.abs(delta)) + ' €';
    }).join('\n');

    var derivadosStr = (nombresDerivados || []).length > 0
      ? 'Nota técnica: Las diferencias observadas en '
        + (nombresDerivados || []).join(', ')
        + ' son consecuencias algebraicas de los conceptos anteriores y no representan impacto adicional independiente.'
      : '';

    var sep = '─'.repeat(52);

    return 'CONSULTA REVISIÓN DE NÓMINA — ' + mes.toUpperCase() + ' ' + año + '\n'
      + sep + '\n\n'
      + 'Fecha            : ' + fecha + '\n'
      + 'Trabajador       : ' + nombre + '\n'
      + 'NIF              : ' + nif + '\n'
      + 'Cargo            : ' + funLabel + ' · Nivel ' + nivel + ' · Base ' + base + '\n\n'
      + sep + '\n'
      + 'RESUMEN EJECUTIVO\n'
      + sep + '\n\n'
      + 'Al cotejar mi nómina de ' + mes + ' de ' + año + ' con el cálculo teórico\n'
      + 'aplicando las tablas del Convenio Colectivo BCSA 2026 (BOE\n'
      + '18/03/2026), he detectado una diferencia estimada sobre el\n'
      + 'líquido neto de ' + difNetaStr + '.\n\n'
      + sep + '\n'
      + 'ORIGEN PROBABLE\n'
      + sep + '\n'
      + (causaLines || '  (No se identifican causas raíz directas)') + '\n\n'
      + sep + '\n'
      + 'NOTA TÉCNICA\n'
      + sep + '\n'
      + (derivadosStr || 'No se han identificado conceptos derivados con diferencias.') + '\n\n'
      + 'Este cálculo es orientativo. Pueden existir variables no\n'
      + 'accesibles desde la nómina (regularizaciones, ajustes por\n'
      + 'incidencias, etc.) que expliquen parte de la diferencia.\n\n'
      + sep + '\n'
      + 'SOLICITUD\n'
      + sep + '\n\n'
      + 'Solicito amablemente la revisión de los conceptos indicados\n'
      + 'y, en caso de confirmarse la diferencia, la corrección\n'
      + 'correspondiente en la próxima liquidación.\n\n'
      + 'Quedo a disposición para cualquier aclaración adicional.\n\n'
      + 'Atentamente,\n'
      + nombre;
  }


  // ── EXPOSICIÓN PÚBLICA ────────────────────────────────────────────────────
  // Patrón window.auditEngine para compatibilidad con scripts no-ES.

  global.auditEngine = {
    // Clasificación
    ROOT_CONCEPTS    : ROOT_CONCEPTS,
    DERIVED_CONCEPTS : DERIVED_CONCEPTS,
    FINAL_CONCEPT    : FINAL_CONCEPT,
    classifyDiffs    : classifyDiffs,

    // Cálculo
    computeDiffs     : computeDiffs,
    computeTotalDelta: computeTotalDelta,

    // Propuestas
    buildPropuestasActualizacion: buildPropuestasActualizacion,

    // Historial
    buildAuditRecord : buildAuditRecord,

    // Reclamaciones
    buildReclamacionText: buildReclamacionText
  };

  console.log('[auditEngine] ✓ cargado (v1.0)');

}(window));
