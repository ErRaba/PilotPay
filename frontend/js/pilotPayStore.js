/**
 * PilotPayStore v1.0.0 — PilotPay Beta 3.0
 *
 * Capa central de datos. DOM-agnostic:
 *   - no lee inputs del formulario
 *   - no modifica HTML
 *   - no renderiza UI
 *
 * En Fase 1 actúa como reorganizador de datos existentes
 * (profileData, calcResult, localStorage) sin ser todavía
 * fuente de verdad propia. Eso es intencionado y transitorio.
 *
 * Estructura central: userId → year → month (MonthRecord)
 */
(function () {
  'use strict';

  var VERSION          = '2.0.0';

  // ── Constantes de esquema y motor ───────────────────────────────────────────
  var SCHEMA_VERSION   = 1;             // Integer — independiente de la versión del producto
  var ENGINE_VERSION   = '1.0';
  var CONVENIO_VERSION = 'BCSA-2024';

  var ESTADOS_VALIDOS = [
    'pendiente', 'pending_variables', 'pending_calculation', 'pending_comparison',
    'auditado', 'con_diferencias', 'regularizado', 'reclamado', 'cerrado'
  ];

  var TRANSICIONES_VALIDAS = {
    'pendiente'           : ['pending_variables','pending_calculation','pending_comparison','auditado','con_diferencias'],
    'pending_variables'   : ['pending_calculation','pending_comparison'],
    'pending_calculation' : ['pending_comparison'],
    'pending_comparison'  : ['auditado','con_diferencias'],
    'auditado'            : ['cerrado'],
    'con_diferencias'     : ['regularizado','reclamado','cerrado'],
    'regularizado'        : ['cerrado'],
    'reclamado'           : ['cerrado'],
    'cerrado'             : []
  };

  // ── Tabla de meses ──────────────────────────────────────────────────────────
  var MESES_IDX = {
    'Enero':1,'Febrero':2,'Marzo':3,'Abril':4,'Mayo':5,'Junio':6,
    'Julio':7,'Agosto':8,'Septiembre':9,'Octubre':10,'Noviembre':11,'Diciembre':12,
    'enero':1,'febrero':2,'marzo':3,'abril':4,'mayo':5,'junio':6,
    'julio':7,'agosto':8,'septiembre':9,'octubre':10,'noviembre':11,'diciembre':12
  };
  var MESES_LABEL = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
                     'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // ── Estado privado ──────────────────────────────────────────────────────────
  var _userId  = null;
  var _ready   = false;
  var _monthly = {};   // '2026:5' → MonthRecord
  var _audit   = [];   // lista plana, orden cronológico inverso

  // ── Acceso live a globales de index.html ────────────────────────────────────
  // PP_getters se registra desde initApp() justo antes de PilotPayStore.init().
  // Usar window.PP_getters en lugar de captura directa para evitar problemas
  // de scope entre distintos bloques <script>.
  function _pd()  { return window.PP_getters ? window.PP_getters.profileData()      : {}; }
  function _cr()  { return window.PP_getters ? window.PP_getters.calcResult()        : null; }
  function _sh()  { return window.PP_getters ? window.PP_getters.simHistoricoData()  : {}; }
  function _ni()  { return window.PP_getters ? window.PP_getters.currentNivel()      : 3; }

  // ── Clave de auditorías en localStorage ────────────────────────────────────
  function _auditKey() {
    return window.storageKey
      ? window.storageKey('audit_history_v1')
      : 'pilotpay:' + (_userId || '_') + ':audit_history_v1';
  }

  // ── Clave de meses en progreso en localStorage ──────────────────────────────
  function _monthlyKey() {
    return window.storageKey
      ? window.storageKey('monthly_v1')
      : 'pilotpay:' + (_userId || '_') + ':monthly_v1';
  }

  // Persiste todos los meses con datos significativos.
  // monthly_v1 es el expediente vivo — incluye meses auditados, regularizados, etc.
  // audit_history_v1 es el log de eventos de auditoría (append-only, no se toca aquí).
  function _saveMonthly() {
    try {
      var k = _monthlyKey();
      if (!k) return;
      var toSave = {};
      Object.keys(_monthly).forEach(function (key) {
        var mr = _monthly[key];
        // Guardar si hay alguna fuente de datos relevante
        var hasData = mr.variablesData !== null ||
                      mr.calculoTeorico !== null ||
                      mr.auditoria !== null ||
                      mr.regularizacion !== null;
        if (hasData) toSave[key] = mr;
      });
      var json = JSON.stringify(toSave);
      localStorage.setItem(k, json);

      // Monitoring de tamaño — warning si supera 500 KB
      var kb = Math.round(json.length / 1024);
      if (kb > 500) {
        console.warn('[PilotPayStore] monthly_v1 tamaño:', kb, 'KB —', Object.keys(toSave).length, 'meses');
      } else {
        console.log('[PilotPayStore] monthly_v1 guardado:', kb, 'KB —', Object.keys(toSave).length, 'meses');
      }
    } catch (e) { console.warn('[PilotPayStore] _saveMonthly error:', e); }
  }

  function _loadMonthly() {
    try {
      var raw = localStorage.getItem(_monthlyKey());
      if (!raw) return {};
      var data = JSON.parse(raw);
      // Normalizar y validar cada registro en memoria
      // El guardado ocurre al final de _hydrateMonthly via _saveMonthly
      Object.keys(data).forEach(function (k) {
        var result = _normalizeMonthRecord(data[k]);
        data[k] = result.mr;
        var issues = _validateMonthRecord(data[k]);
        if (issues.length > 0) _logValidationIssues(k, issues);
      });
      return data;
    } catch (e) {
      console.warn('[PilotPayStore] _loadMonthly error:', e);
      return {};
    }
  }

  // ── Helpers internos ────────────────────────────────────────────────────────
  function _monthLabel(m) {
    return MESES_LABEL[m] || '';
  }

  function _monthKey(year, month) {
    return year + ':' + month;
  }

  // ── Resolución canónica del período del expediente ───────────────────────────
  // Función PURA — sin side effects, sin escritura al store, sin DOM.
  // TODA creación y búsqueda de MonthRecord debe pasar por aquí.
  //
  // El expediente se identifica por el MES DE NÓMINA/COBRO, no por el período operativo.
  // Ejemplo: variables de Abril (_periodoFin = 30/04/2026) → expediente Mayo 2026.
  // El período operativo queda como metadata dentro del expediente (variablesData).
  //
  // source posibles:
  //   'periodoFin'        — resolución canónica desde PDF de variables (alta confianza)
  //   'nominaPDF'         — resolución desde PDF de nómina (alta confianza)
  //   'calendarioFallback'— sin datos del PDF, usa fecha del sistema (BAJA CONFIANZA)
  function _resolveExpedientePeriod(varsData) {
    // _periodoFin puede ser Date (live) o string ISO (desde localStorage)
    var finRaw = varsData && varsData._periodoFin;
    var fin    = finRaw ? new Date(finRaw) : null;

    if (fin && !isNaN(fin)) {
      var nomi = new Date(fin.getFullYear(), fin.getMonth() + 1, 1);
      var yr   = nomi.getFullYear();
      var mo   = nomi.getMonth() + 1;
      return {
        year     : yr,
        month    : mo,
        mesLabel : _monthLabel(mo),
        source   : 'periodoFin'
      };
    }

    // Fallback calendario — estado de baja confianza, debe ser excepcional
    var now = new Date();
    var yr  = now.getFullYear();
    var mo  = now.getMonth() + 1;
    console.warn('[PilotPayStore] resolveExpedientePeriod: _periodoFin no disponible — calendarioFallback para', yr + ':' + mo);
    return {
      year     : yr,
      month    : mo,
      mesLabel : _monthLabel(mo),
      source   : 'calendarioFallback'
    };
  }

  function _inferYearMonth(record) {
    var year  = record.anyo ? parseInt(record.anyo, 10) : null;
    var month = record.mes  ? (MESES_IDX[record.mes]   || null) : null;
    if (!year || !month || isNaN(year)) return null;
    return { year: year, month: month };
  }

  // ── MonthRecord factory ─────────────────────────────────────────────────────
  // Estado del expediente mensual:
  // 'pendiente' → 'pending_variables' → 'pending_calculation' → 'pending_comparison'
  //   → 'auditado' | 'con_diferencias' → 'regularizado' → 'reclamado' → 'cerrado'
  // 'cerrado' SOLO se establece de forma explícita, nunca automática.
  function _makeMonthRecord(userId, year, month) {
    var now = new Date().toISOString();
    return {
      // Identidad
      schemaVersion : SCHEMA_VERSION,
      id            : userId + ':' + year + ':' + month,
      userId        : userId,
      year          : year,
      month         : month,
      mesLabel      : _monthLabel(month),

      // Metadatos de creación
      metadata : { createdFrom: null, migratedAt: null },

      // Máquina de estados
      estado : 'pendiente',

      // Fuentes de datos (pobladas incrementalmente)
      nominaData     : null,   // snapshot acotado del PDF de nómina (datos financieros clave)
      variablesData  : null,   // snapshot del PDF de variables
      calculoTeorico : null,   // snapshot CONGELADO de calcResult — nunca regenerar

      // Resultado de auditoría
      // { fechaAuditoria, liqTeorico, liqReal, diferenciaNeta, nDiscrepancias,
      //   discrepancias[], totalDevengado, baseIRPF, baseSS, irpf_pct,
      //   acumulados: {baseIRPF, irpf}, diasTrabajados }
      auditoria : null,

      // Eventos posteriores a la auditoría — capas aditivas, no modifican auditoria
      regularizacion : null,   // { tipo, importeNeto, netoFinalAjustado, nota, fecha, docNombre, registrado }
      reclamacion    : null,   // { generada, texto, referencia } — futuro

      // Audit trail de resolución temporal — por qué este expediente es del mes que es
      // { year, month, mesLabel, source, resolvedAt }
      resolvedPeriod : null,

      // Reservado: clave futura en IndexedDB
      pdfRef : null,

      // Metadatos de tiempo
      _createdAt : now,
      _updatedAt : now
    };
  }

  // ── Integridad derivada (pura, sin side effects) ────────────────────────────
  function _deriveSourceIntegrity(mr) {
    return {
      variablesParsed   : !!(mr.variablesData && mr.variablesData._periodoFin),
      nominaParsed      : !!(mr.nominaData    || mr.auditoria),
      auditoriaCompleta : !!(mr.auditoria),
      simulatorDerived  : !!(mr.calculoTeorico),
      regularizado      : !!(mr.regularizacion),
      reclamado         : !!(mr.reclamacion)
    };
  }

  // ── Validación de MonthRecord ────────────────────────────────────────────────
  // Devuelve [{ severity: 'error'|'warn', code, message, field }]
  function _validateMonthRecord(mr) {
    var issues = [];
    function err(code, message, field) { issues.push({ severity: 'error', code: code, message: message, field: field || null }); }
    function wrn(code, message, field) { issues.push({ severity: 'warn',  code: code, message: message, field: field || null }); }

    // ── Errores de identidad ─────────────────────────────────────────────────
    if (!mr.userId)                         err('E_NO_USERID',     'userId ausente',                         'userId');
    if (!mr.year || isNaN(mr.year) || mr.year < 2020)
                                            err('E_YEAR_INVALID',  'year inválido: ' + mr.year,              'year');
    if (!mr.month || mr.month < 1 || mr.month > 12)
                                            err('E_MONTH_INVALID', 'month inválido: ' + mr.month,            'month');
    if (mr.schemaVersion === null || mr.schemaVersion === undefined || typeof mr.schemaVersion !== 'number')
                                            err('E_SCHEMA_TYPE',   'schemaVersion debe ser number: ' + JSON.stringify(mr.schemaVersion), 'schemaVersion');

    // ── Errores de estado ────────────────────────────────────────────────────
    if (ESTADOS_VALIDOS.indexOf(mr.estado) === -1)
                                            err('E_ESTADO_INVALID','estado no reconocido: ' + mr.estado,    'estado');
    var st = mr.estado;
    if (st === 'pending_comparison' && !mr.calculoTeorico)
                                            err('E_PEND_NO_CALC',  'pending_comparison sin calculoTeorico',  'calculoTeorico');
    if ((st === 'auditado' || st === 'con_diferencias') && !mr.auditoria)
                                            err('E_AUDIT_NO_DATA', st + ' sin auditoria',                    'auditoria');
    if (st === 'regularizado' && !mr.regularizacion)
                                            err('E_REG_NO_DATA',   'regularizado sin regularizacion',        'regularizacion');

    // ── Error de coherencia temporal ─────────────────────────────────────────
    if (mr.resolvedPeriod) {
      var rp = mr.resolvedPeriod;
      if (rp.year !== mr.year || rp.month !== mr.month)
                                            err('E_PERIOD_MISMATCH','resolvedPeriod (' + rp.year + ':' + rp.month + ') ≠ registro (' + mr.year + ':' + mr.month + ')', 'resolvedPeriod');
    }

    // ── Warnings ─────────────────────────────────────────────────────────────
    if (!mr.mesLabel)                       wrn('W_NO_MESLABEL',   'mesLabel ausente',                       'mesLabel');
    if (typeof mr.schemaVersion === 'number' && mr.schemaVersion < SCHEMA_VERSION)
                                            wrn('W_SCHEMA_OLD',    'schemaVersion ' + mr.schemaVersion + ' < actual ' + SCHEMA_VERSION, 'schemaVersion');
    if (!mr.id)                             wrn('W_NO_ID',         'id ausente (migración pendiente)',        'id');
    if (!mr.metadata)                       wrn('W_NO_METADATA',   'metadata ausente (migración pendiente)',  'metadata');
    if (!mr._createdAt)                     wrn('W_NO_CREATEDAT',  '_createdAt ausente',                     '_createdAt');
    if (!mr._updatedAt)                     wrn('W_NO_UPDATEDAT',  '_updatedAt ausente',                     '_updatedAt');

    // Warnings de período
    var pendingStates = ['pending_calculation','pending_comparison','auditado','con_diferencias','regularizado','reclamado','cerrado'];
    if (!mr.resolvedPeriod && pendingStates.indexOf(st) !== -1)
                                            wrn('W_NO_RESOLVED',   'resolvedPeriod null en estado ' + st,    'resolvedPeriod');
    if (mr.resolvedPeriod && mr.resolvedPeriod.source === 'calendarioFallback')
                                            wrn('W_FALLBACK_SRC',  'resolvedPeriod.source es calendarioFallback (baja confianza)', 'resolvedPeriod');

    // Warnings de datos
    if (mr.variablesData && !mr.variablesData._periodoFin)
                                            wrn('W_VARS_NO_FIN',   'variablesData presente pero sin _periodoFin', 'variablesData');
    if (st === 'pending_comparison' && !mr.variablesData)
                                            wrn('W_PEND_NO_VARS',  'pending_comparison sin variablesData',    'variablesData');
    if (mr.auditoria && mr.auditoria.diferenciaNeta && mr.auditoria.diferenciaNeta !== 0 && st !== 'con_diferencias' && st !== 'regularizado' && st !== 'reclamado' && st !== 'cerrado')
                                            wrn('W_DIFF_ESTADO',   'auditoria con diferencias pero estado es ' + st, 'estado');

    // Warnings de regularizacion
    if (mr.regularizacion) {
      if (!mr.regularizacion.tipo)          wrn('W_REG_NO_TIPO',   'regularizacion sin tipo',                 'regularizacion.tipo');
      if (!mr.regularizacion.fecha)         wrn('W_REG_NO_FECHA',  'regularizacion sin fecha',                'regularizacion.fecha');
      if (mr.regularizacion.importeNeto == null) wrn('W_REG_NO_IMPORTE','regularizacion sin importeNeto',     'regularizacion.importeNeto');
    }

    // Warnings de calculoTeorico (legacy sin versioning)
    if (mr.calculoTeorico) {
      if (!mr.calculoTeorico.engineVersion)   wrn('W_CALC_NO_ENGINE',  'calculoTeorico sin engineVersion (legacy)',   'calculoTeorico.engineVersion');
      if (!mr.calculoTeorico.convenioVersion) wrn('W_CALC_NO_CONV',    'calculoTeorico sin convenioVersion (legacy)', 'calculoTeorico.convenioVersion');
      if (!mr.calculoTeorico.calculatedAt)    wrn('W_CALC_NO_TS',      'calculoTeorico sin calculatedAt (legacy)',    'calculoTeorico.calculatedAt');
    }

    return issues;
  }

  function _logValidationIssues(key, issues) {
    var errors = issues.filter(function (i) { return i.severity === 'error'; });
    var warns  = issues.filter(function (i) { return i.severity === 'warn';  });
    if (errors.length > 0) {
      console.error('[PilotPayStore] validate[' + key + '] —', errors.length, 'error(s):',
        errors.map(function (i) { return i.code + '(' + i.field + ')'; }).join(', '));
    }
    if (warns.length > 0) {
      console.warn('[PilotPayStore] validate[' + key + '] —', warns.length, 'warn(s):',
        warns.map(function (i) { return i.code + '(' + i.field + ')'; }).join(', '));
    }
  }

  // ── Normalización de MonthRecord ─────────────────────────────────────────────
  // Migración lazy in-memory. Devuelve { mr, changed }.
  // El guardado lo hace _hydrateMonthly/_saveMonthly — no aquí.
  function _normalizeMonthRecord(mr) {
    var changed = false;
    var now = new Date().toISOString();

    // Migrar schemaVersion string '3.0' → integer
    if (mr.schemaVersion === '3.0' || typeof mr.schemaVersion !== 'number') {
      mr.schemaVersion = SCHEMA_VERSION;
      changed = true;
    }

    // Añadir id si falta
    if (!mr.id && mr.userId && mr.year && mr.month) {
      mr.id = mr.userId + ':' + mr.year + ':' + mr.month;
      changed = true;
    }

    // Añadir metadata si falta
    if (!mr.metadata) {
      mr.metadata = { createdFrom: null, migratedAt: now };
      changed = true;
    }

    // Añadir timestamps si faltan
    if (!mr._createdAt) { mr._createdAt = now; changed = true; }
    if (!mr._updatedAt) { mr._updatedAt = now; changed = true; }

    // Añadir mesLabel si falta
    if (!mr.mesLabel && mr.month) { mr.mesLabel = _monthLabel(mr.month); changed = true; }

    // Eliminar sourceIntegrity (ahora se deriva, no se persiste)
    if (mr.sourceIntegrity !== undefined) {
      delete mr.sourceIntegrity;
      changed = true;
    }

    // regularizacion: añadir tipo por defecto si falta
    if (mr.regularizacion && !mr.regularizacion.tipo) {
      mr.regularizacion.tipo = 'acuerdo_manual';
      changed = true;
    }

    // calculoTeorico legacy: añadir versioning si falta
    if (mr.calculoTeorico) {
      if (!mr.calculoTeorico.engineVersion) {
        mr.calculoTeorico.engineVersion   = 'legacy';
        mr.calculoTeorico.convenioVersion = mr.calculoTeorico.convenioVersion || 'legacy';
        mr.calculoTeorico.calculatedAt    = mr.calculoTeorico.calculatedAt    || mr._createdAt || now;
        changed = true;
      }
    }

    return { mr: mr, changed: changed };
  }

  // ── Carga de auditorías ─────────────────────────────────────────────────────
  function _loadAuditList() {
    try {
      return JSON.parse(localStorage.getItem(_auditKey()) || '[]');
    } catch (e) { return []; }
  }

  // ── Hydration ───────────────────────────────────────────────────────────────
  // Enriquece _monthly (cargado desde monthly_v1) con datos de audit_history_v1.
  // audit_history_v1 es append-only: esta función nunca lo escribe.
  // Aplica migración lazy: AuditRecord.regularizacionFinal → MonthRecord.regularizacion.
  function _hydrateMonthly(auditList, calcResult) {
    // Construir MonthRecords desde registros de auditoría existentes.
    // auditList ya está ordenado más-reciente-primero.
    auditList.forEach(function (rec) {
      var ym = _inferYearMonth(rec);
      if (!ym) return;

      var k  = _monthKey(ym.year, ym.month);
      if (!_monthly[k]) {
        _monthly[k] = _makeMonthRecord(_userId, ym.year, ym.month);
      }
      var mr = _monthly[k];

      // Solo el registro más reciente define la auditoría del mes.
      if (!mr.auditoria) {
        var de = rec.datosExtraidos || {};
        mr.auditoria = {
          fechaAuditoria : rec.fechaAuditoria,
          liqTeorico     : rec.liqTeorico     || null,
          liqReal        : rec.liqReal        || null,
          diferenciaNeta : rec.diff           || null,
          nDiscrepancias : rec.nDiscrepancias || 0,
          discrepancias  : rec.discrepancias  || [],
          totalDevengado : de.total_devengado || null,
          baseIRPF       : de.base_irpf       || null,
          baseSS         : de.base_ss         || null,
          irpf_pct       : de.irpf_pct        || null,
          acumulados     : { baseIRPF: de.acum_base_irpf || null, irpf: de.acum_irpf || null },
          diasTrabajados : de.dias_trabajados  || null
        };
        // Audit trail: período resuelto desde nómina PDF (si no lo tenía ya)
        if (!mr.resolvedPeriod) {
          mr.resolvedPeriod = {
            year      : ym.year,
            month     : ym.month,
            mesLabel  : _monthLabel(ym.month),
            source    : 'nominaPDF',
            resolvedAt: new Date().toISOString()
          };
        }

        // Estado base desde auditoría
        var estadoBase = (rec.nDiscrepancias > 0) ? 'con_diferencias' : 'auditado';

        // Migración lazy: si audit_history_v1 tenía regularizacionFinal y el
        // expediente en monthly_v1 no tiene regularizacion aún, copiarlo.
        // audit_history_v1 NO se modifica — este campo es solo lectura aquí.
        if (rec.regularizacionFinal && !mr.regularizacion) {
          mr.regularizacion = rec.regularizacionFinal;
        }

        // Estado final: regularizado si hay regularización, sea de la migración o preexistente
        if (mr.regularizacion != null && estadoBase === 'con_diferencias') {
          mr.estado = 'regularizado';
        } else if (mr.estado !== 'cerrado' && mr.estado !== 'reclamado') {
          // No sobrescribir cerrado/reclamado que ya estuviera en monthly_v1
          mr.estado = estadoBase;
        }

        mr._updatedAt = new Date().toISOString();
      }
    });

    // ── Limpieza de zombies ─────────────────────────────────────────────────
    // MonthRecords en pending_comparison cuyo mes de nómina correcto (calculado via
    // _resolveExpedientePeriod) ya tiene una auditoría completada.
    var _zombieKeys = [];
    Object.keys(_monthly).forEach(function (key) {
      var mr = _monthly[key];
      if (mr.estado !== 'pending_comparison') return;
      if (!mr.variablesData) return;

      var rp = _resolveExpedientePeriod(mr.variablesData);
      if (rp.source === 'calendarioFallback') return; // sin _periodoFin — no se puede detectar zombie

      var nomiKey = _monthKey(rp.year, rp.month);

      // Si la clave del zombie ya coincide con el expediente correcto, no es zombie
      if (nomiKey === key) return;

      // Si el mes de nómina tiene MonthRecord auditado → este es zombie
      var nomiMR = _monthly[nomiKey];
      if (nomiMR && (nomiMR.estado === 'auditado' ||
                     nomiMR.estado === 'con_diferencias' ||
                     nomiMR.estado === 'regularizado')) {
        _zombieKeys.push(key);
        console.log('[PilotPayStore] zombie eliminado:', key, '→ nómina ya auditada en', nomiKey, '(' + nomiMR.estado + ')');
        return;
      }

      // Si hay AuditRecord para el mes de nómina pero el MonthRecord aún no se creó,
      // el zombie también se puede eliminar (la hidratación creará el correcto).
      var hasAudit = auditList.some(function (rec) {
        var ym2 = _inferYearMonth(rec);
        return ym2 && ym2.year === rp.year && ym2.month === rp.month;
      });
      if (hasAudit) {
        _zombieKeys.push(key);
        console.log('[PilotPayStore] zombie eliminado:', key, '→ AuditRecord existe en', nomiKey);
      }
    });
    _zombieKeys.forEach(function (key) { delete _monthly[key]; });

    // El bloque "calcResult → new Date()" fue eliminado intencionalmente.
    // El calculoTeorico solo se gestiona via onCalculationDone(varsData, calcResult),
    // que usa _resolveExpedientePeriod para la clave. El mes calendario nunca es fuente.

    // Limpiar ghosts calendarioFallback de sesiones anteriores al bug
    monthly.cleanupDuplicateMonthRecords();

    _saveMonthly();
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMINIO: profile
  // Lee desde profileData live a través de PP_getters.
  // Transitorio: a medio plazo el store será la fuente de verdad.
  // ══════════════════════════════════════════════════════════════════════════════
  var profile = {
    get: function () {
      var pd = _pd();
      var users = window.USERS || {};
      var u = (_userId && users[_userId]) ? users[_userId] : {};
      return {
        userId      : _userId,
        nombre      : pd.fullName    || u.name     || '',
        funcion     : pd.funcion     || u.funcion  || '',
        nivel       : pd.nivel       || u.nivel    || 3,
        base        : pd.base        || u.base     || 'GC',
        irpf        : pd.irpf        != null ? pd.irpf : (u.irpf || 30),
        nif         : pd.nif         || '',
        nss         : pd.nss         || '',
        theme       : pd.theme       || 'emb2',
        estadoCivil : pd.estadoCivil || 'soltero',
        ccaa        : pd.ccaa || pd.sim_ccaa || 'can'
      };
    },
    getField: function (key) {
      return this.get()[key];
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMINIO: monthly
  // Datos mensuales indexados por year:month.
  // ══════════════════════════════════════════════════════════════════════════════
  var monthly = {
    get: function (year, month) {
      return _monthly[_monthKey(year, month)] || null;
    },
    set: function (year, month, data) {
      var k = _monthKey(year, month);
      if (!_monthly[k]) {
        _monthly[k] = _makeMonthRecord(_userId, year, month);
      }
      var ts = new Date().toISOString();
      Object.assign(_monthly[k], data, { _updatedAt: ts });
      _saveMonthly();
    },

    // Llamar desde _varsNotifyStore() cuando el usuario confirma el PDF de variables.
    // La resolución temporal es interna: usa _resolveExpedientePeriod(varsData).
    // El frontend NO calcula year/month — solo pasa varsData.
    onVariablesConfirmed: function (varsData) {
      var rp  = _resolveExpedientePeriod(varsData);
      if (rp.source === 'calendarioFallback') {
        console.warn('[PilotPayStore] onVariablesConfirmed: calendarioFallback — expediente no creado sin _periodoFin fiable');
        return;
      }
      var k   = _monthKey(rp.year, rp.month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, rp.year, rp.month);
      var mr  = _monthly[k];
      var now = new Date().toISOString();
      mr.variablesData = varsData;
      mr.estado = 'pending_calculation';
      if (!mr.resolvedPeriod) {
        mr.resolvedPeriod = { year: rp.year, month: rp.month, mesLabel: rp.mesLabel,
                              source: rp.source, resolvedAt: now };
      }
      mr._updatedAt = now;
      _saveMonthly();
    },

    // Llamar desde _recalcNotifyStore() cuando se completa un cálculo teórico.
    // La resolución temporal es interna: usa _resolveExpedientePeriod(varsData).
    // El calculoTeorico se congela en este momento — no se regenera nunca.
    onCalculationDone: function (varsData, calcResult) {
      var rp  = _resolveExpedientePeriod(varsData);
      if (rp.source === 'calendarioFallback') {
        console.warn('[PilotPayStore] onCalculationDone: calendarioFallback — expediente no creado sin _periodoFin fiable');
        return;
      }
      var k   = _monthKey(rp.year, rp.month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, rp.year, rp.month);
      var mr  = _monthly[k];
      var now = new Date().toISOString();
      mr.calculoTeorico = Object.assign({}, calcResult, {
        engineVersion   : ENGINE_VERSION,
        convenioVersion : CONVENIO_VERSION,
        calculatedAt    : now
      });
      if (mr.estado === 'pending_calculation' ||
          mr.estado === 'pending_variables'   ||
          mr.estado === 'pendiente') {
        mr.estado = 'pending_comparison';
      }
      if (!mr.resolvedPeriod) {
        mr.resolvedPeriod = { year: rp.year, month: rp.month, mesLabel: rp.mesLabel,
                              source: rp.source, resolvedAt: now };
      }
      mr._updatedAt = now;
      _saveMonthly();
    },
    getEstado: function (year, month) {
      var mr = this.get(year, month);
      return mr ? mr.estado : 'pendiente';
    },
    list: function (year) {
      return Object.values(_monthly)
        .filter(function (mr) { return mr.year === year; })
        .sort(function (a, b) { return b.month - a.month; });
    },
    getCurrent: function () {
      var now = new Date();
      return this.get(now.getFullYear(), now.getMonth() + 1);
    },
    getAll: function () {
      return Object.values(_monthly)
        .sort(function (a, b) {
          return (b.year - a.year) || (b.month - a.month);
        });
    },
    getPendingComparisons: function () {
      var seen    = {};
      var result  = [];
      // Ordenar más-reciente-primero para conservar el más nuevo en caso de duplicado legacy
      var all = Object.values(_monthly)
        .filter(function (mr) { return mr.estado === 'pending_comparison'; })
        .sort(function (a, b) {
          return (b._updatedAt || '').localeCompare(a._updatedAt || '');
        });
      all.forEach(function (mr) {
        var uid = mr.userId || _userId;
        var key = uid + ':' + mr.year + ':' + mr.month;
        if (seen[key]) {
          console.warn('[PilotPayStore] getPendingComparisons: duplicado legacy detectado —', key, '— ignorado');
          return;
        }
        seen[key] = true;
        result.push(mr);
      });
      return result.sort(function (a, b) { return (b.year - a.year) || (b.month - a.month); });
    },

    // Elimina y migra MonthRecords pending con estado temporal incoherente.
    //
    // Patrones detectados:
    //   Ghost 1 — resolvedPeriod=null + sin variablesData._periodoFin
    //             (registro pre-Fase-A sin período fiable)
    //   Ghost 2 — resolvedPeriod.source='calendarioFallback' + sin variablesData._periodoFin
    //             (creado sin variables cargadas, key por mes calendario)
    //   Zombie  — resolvedPeriod.source='periodoFin'|'nominaPDF' + sin variablesData._periodoFin
    //             (variablesData fue sobreescrito con datos incompletos; estado incoherente,
    //             el expediente no puede cerrarse nunca)
    //   Migrar  — resolvedPeriod=null o 'calendarioFallback' + variablesData._periodoFin presente
    //             (recuperar resolvedPeriod desde variablesData en lugar de eliminar)
    //
    // NUNCA toca registros auditados, regularizados, reclamados ni cerrados.
    cleanupDuplicateMonthRecords: function () {
      var removed  = 0;
      var migrated = 0;
      var toDelete = [];
      var now = new Date().toISOString();

      Object.keys(_monthly).forEach(function (k) {
        var mr = _monthly[k];
        if (!mr) return;

        // Nunca tocar expedientes con datos definitivos consolidados
        if (mr.auditoria || mr.regularizacion || mr.reclamacion) return;
        if (mr.estado === 'cerrado'        || mr.estado === 'reclamado'       ||
            mr.estado === 'auditado'       || mr.estado === 'con_diferencias' ||
            mr.estado === 'regularizado')  return;

        var tieneVariables = !!(mr.variablesData && mr.variablesData._periodoFin);
        var rp = mr.resolvedPeriod;
        var source = rp ? rp.source : null;

        // ── Caso: período no fiable (null o calendarioFallback) ─────────────────
        var sinPeriodoFiable = !rp || source === 'calendarioFallback';
        if (sinPeriodoFiable) {
          if (tieneVariables) {
            // Tiene _periodoFin → migrar resolvedPeriod en lugar de eliminar
            var resolv = _resolveExpedientePeriod(mr.variablesData);
            if (resolv.source !== 'calendarioFallback') {
              mr.resolvedPeriod = { year: resolv.year, month: resolv.month,
                                    mesLabel: resolv.mesLabel,
                                    source: resolv.source, resolvedAt: now };
              mr._updatedAt = now;
              migrated++;
              console.log('[PilotPayStore] cleanupDuplicateMonthRecords: migrado', k,
                          '→ resolvedPeriod', resolv.source);
            } else {
              toDelete.push(k); // _periodoFin presente pero inválido → ghost
            }
          } else {
            toDelete.push(k); // sin variables → ghost
          }
          return;
        }

        // ── Caso: período fiable pero variablesData corrupto (zombie incoherente) ─
        // resolvedPeriod.source='periodoFin'|'nominaPDF' pero variablesData sin _periodoFin.
        // Root cause: onVariablesConfirmed(varsData_empty) sobreescribió variablesData.
        // El expediente no puede completar el flujo → zombie permanente → eliminar.
        if ((source === 'periodoFin' || source === 'nominaPDF') && !tieneVariables) {
          console.warn('[PilotPayStore] cleanupDuplicateMonthRecords: zombie incoherente', k,
                       '| source:', source, '| variablesData._periodoFin: undefined');
          toDelete.push(k);
          return;
        }
      });

      toDelete.forEach(function (k) {
        console.log('[PilotPayStore] cleanupDuplicateMonthRecords: eliminando', k,
                    '| estado:', _monthly[k].estado,
                    '| source:', (_monthly[k].resolvedPeriod || {}).source,
                    '| variablesData:', _monthly[k].variablesData ? 'present' : 'null');
        delete _monthly[k];
        removed++;
      });

      if (removed > 0 || migrated > 0) _saveMonthly();
      if (removed  > 0) console.log('[PilotPayStore] cleanupDuplicateMonthRecords:', removed,  'registro(s) eliminado(s)');
      if (migrated > 0) console.log('[PilotPayStore] cleanupDuplicateMonthRecords:', migrated, 'registro(s) migrado(s)');

      return { removed: removed, migrated: migrated };
    },

    // Llamar desde saveAuditRecord() en index.html tras guardar en audit_history_v1.
    // audit_history_v1 permanece inmutable — este método construye el expediente en monthly_v1.
    onAuditoriaCompletada: function (auditRecord) {
      var ym = _inferYearMonth(auditRecord);
      if (!ym) return;
      var k = _monthKey(ym.year, ym.month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, ym.year, ym.month);
      var mr = _monthly[k];

      var de = auditRecord.datosExtraidos || {};
      mr.auditoria = {
        fechaAuditoria : auditRecord.fechaAuditoria,
        liqTeorico     : auditRecord.liqTeorico     || null,
        liqReal        : auditRecord.liqReal        || null,
        diferenciaNeta : auditRecord.diff           || null,
        nDiscrepancias : auditRecord.nDiscrepancias || 0,
        discrepancias  : auditRecord.discrepancias  || [],
        totalDevengado : de.total_devengado || null,
        baseIRPF       : de.base_irpf       || null,
        baseSS         : de.base_ss         || null,
        irpf_pct       : de.irpf_pct        || null,
        acumulados     : { baseIRPF: de.acum_base_irpf || null, irpf: de.acum_irpf || null },
        diasTrabajados : de.dias_trabajados  || null
      };
      // Audit trail: período resuelto desde nómina PDF (solo si no tenía ya resolvedPeriod)
      if (!mr.resolvedPeriod) {
        mr.resolvedPeriod = {
          year      : ym.year,
          month     : ym.month,
          mesLabel  : _monthLabel(ym.month),
          source    : 'nominaPDF',
          resolvedAt: new Date().toISOString()
        };
      }

      if (mr.estado !== 'cerrado' && mr.estado !== 'reclamado') {
        mr.estado = (auditRecord.nDiscrepancias > 0) ? 'con_diferencias' : 'auditado';
      }
      mr._updatedAt = new Date().toISOString();
      _saveMonthly();
    },

    // Llamar desde hstRegularizar() en index.html.
    // Guarda la regularización en el expediente mensual.
    // audit_history_v1 NO se modifica — la regularización vive aquí.
    onRegularizacionDone: function (auditRecord, data) {
      var ym = _inferYearMonth(auditRecord);
      if (!ym) return;
      var k = _monthKey(ym.year, ym.month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, ym.year, ym.month);
      var mr = _monthly[k];

      mr.regularizacion = {
        tipo              : data.tipo              || 'acuerdo_manual',
        importeNeto       : data.importeNeto,
        netoFinalAjustado : data.netoFinalAjustado,
        nota              : data.nota              || '',
        fecha             : data.fecha             || new Date().toISOString().slice(0, 10),
        docNombre         : data.docNombre         || null,
        registrado        : data.registrado        || new Date().toISOString()
      };

      if (mr.estado === 'con_diferencias') {
        mr.estado = 'regularizado';
      }
      mr._updatedAt = new Date().toISOString();
      _saveMonthly();
    },

    // Helper: devuelve el MonthRecord correspondiente a un AuditRecord.
    // Útil para que el código de renderizado acceda al expediente desde el registro histórico.
    getByAuditRecord: function (auditRecord) {
      if (!auditRecord) return null;
      var ym = _inferYearMonth(auditRecord);
      if (!ym) return null;
      return _monthly[_monthKey(ym.year, ym.month)] || null;
    },

    // Integridad de fuentes del expediente — derivada en tiempo real, nunca persistida.
    getSourceIntegrity: function (year, month) {
      var mr = this.get(year, month);
      return mr ? _deriveSourceIntegrity(mr) : null;
    },

    // Eliminar una previsión pendiente del expediente.
    // Solo opera sobre monthly_v1 — no toca audit_history_v1.
    // Uso: botón de borrado manual en la sección "Previsiones pendientes".
    deletePending: function (year, month) {
      var k  = _monthKey(year, month);
      var mr = _monthly[k];
      if (!mr) return false;
      // Solo eliminar si está en un estado pending — nunca borrar expedientes auditados
      var isPending = mr.estado === 'pending_comparison' ||
                      mr.estado === 'pending_calculation' ||
                      mr.estado === 'pending_variables'   ||
                      mr.estado === 'pendiente';
      if (!isPending) {
        console.warn('[PilotPayStore] deletePending: el expediente', k, 'no está en estado pending —', mr.estado);
        return false;
      }
      delete _monthly[k];
      _saveMonthly();
      console.log('[PilotPayStore] previsión pendiente eliminada:', k);
      return true;
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMINIO: audit
  // Historial de auditorías completo. Lee desde localStorage user-scoped.
  // ══════════════════════════════════════════════════════════════════════════════
  var audit = {
    getAll: function () {
      return _audit.slice();
    },
    getLast: function () {
      return _audit[0] || null;
    },
    getByMonth: function (year, month) {
      return _audit.filter(function (r) {
        var ym = _inferYearMonth(r);
        return ym && ym.year === year && ym.month === month;
      });
    },
    count: function () {
      return _audit.length;
    },
    countWithDiffs: function () {
      return _audit.filter(function (r) { return r.nDiscrepancias > 0; }).length;
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMINIO: simulator
  // Configuración e histórico IRPF. Lee desde profileData live.
  // ══════════════════════════════════════════════════════════════════════════════
  var simulator = {
    get: function () {
      var pd = _pd();
      return {
        mes        : pd.sim_mes        || '',
        ccaa       : pd.sim_ccaa       || 'can',
        civil      : pd.sim_civil      || 'soltero',
        hijos      : pd.sim_hijos      || 0,
        brutoResto : pd.sim_brutoResto || '',
        irpfActual : pd.sim_irpfActual || '',
        historico  : _sh()
      };
    }
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // DOMINIO: expedition
  // Estructura preparada para el expediente de nóminas.
  // En Fase 1 no tiene datos propios — reorganiza monthly[].
  // En Fase 2+: stats, regularizaciones, comparativas anuales, PDFs en IndexedDB.
  // ══════════════════════════════════════════════════════════════════════════════
  var expedition = {
    getYear: function (year) {
      return {
        year   : year,
        months : monthly.list(year)
        // Fase 2+: summary stats, regularizaciones, comparativaAnual
      };
    },
    getMonth: function (year, month) {
      return monthly.get(year, month);
    },
    getAvailableYears: function () {
      var years = {};
      Object.values(_monthly).forEach(function (mr) { years[mr.year] = true; });
      return Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
    }
    // Fase 2+:
    // getPdf(year, month)           → resuelve pdfRef en IndexedDB
    // getStats(year)                → evolución salarial, acumulados, medias
    // getRegularizaciones(year)     → lista de correcciones históricas
    // getComparativaAnual(year)     → diferencias acumuladas año completo
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // AGREGADO: getDashboardSummary
  // Primer consumidor previsto en Fase 1. Compila todo lo que el Dashboard
  // necesita en un único objeto sin acceder al DOM.
  // ══════════════════════════════════════════════════════════════════════════════
  function getDashboardSummary() {
    if (!_ready) return null;

    var prof  = profile.get();
    var cr    = _cr();
    var last  = audit.getLast();
    var total = audit.count();
    var diffs = audit.countWithDiffs();
    var now   = new Date();
    var curMR = monthly.getCurrent();
    var allMR = monthly.getAll();

    // MonthRecord más reciente con estado pending_comparison (puede ser cualquier mes,
    // no solo el mes calendario actual — el usuario puede estar en junio con Mayo pendiente).
    var pendingComp = null;
    allMR.forEach(function (mr) {
      if (mr.estado === 'pending_comparison') {
        if (!pendingComp || mr.year > pendingComp.year ||
            (mr.year === pendingComp.year && mr.month > pendingComp.month)) {
          pendingComp = mr;
        }
      }
    });

    return {
      profile : prof,

      currentCalc : cr ? {
        liquidoReal    : cr.liquidoReal,
        totalDevengado : cr.totalDevengado,
        baseIRPF       : cr.baseIRPF,
        baseSS         : cr.baseSS,
        retencionIRPF  : cr.retencionIRPF,
        nivel          : _ni()
      } : null,

      // null si no hay previsión pendiente de nómina oficial para ningún mes
      pendingComparison : pendingComp,

      auditStats : {
        total          : total,
        conDiferencias : diffs,
        sinDiferencias : total - diffs,
        ultimaFecha    : last ? last.fechaAuditoria : null,
        ultimoEstado   : last ? last.estado         : null,
        ultimoDiff     : last ? last.diff           : null
      },

      mesActual : {
        year   : now.getFullYear(),
        month  : now.getMonth() + 1,
        label  : _monthLabel(now.getMonth() + 1),
        estado : curMR ? curMR.estado : 'pendiente',
        record : curMR
      },

      expedition : {
        totalMeses         : allMR.length,
        mesesAuditados     : allMR.filter(function (m) { return m.auditoria !== null; }).length,
        mesesConDifs       : allMR.filter(function (m) { return m.estado === 'con_diferencias'; }).length,
        mesesRegularizados : allMR.filter(function (m) { return m.estado === 'regularizado'; }).length,
        mesesReclamados    : allMR.filter(function (m) { return m.estado === 'reclamado'; }).length,
        mesesCerrados      : allMR.filter(function (m) { return m.estado === 'cerrado'; }).length,
        anosDisponibles    : expedition.getAvailableYears()
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CICLO DE VIDA
  // ══════════════════════════════════════════════════════════════════════════════
  function init(userId) {
    if (!userId) {
      console.warn('[PilotPayStore] init() llamado sin userId');
      return;
    }
    try {
      _userId  = userId;
      _ready   = false;
      _audit   = [];

      // Cargar expedientes desde monthly_v1 (todos los estados).
      // _hydrateMonthly enriquece con audit_history_v1 pero no lo modifica.
      _monthly = _loadMonthly();

      var auditList = _loadAuditList();
      _audit = auditList;
      _hydrateMonthly(auditList, _cr());

      _ready = true;
      console.log(
        '[PilotPayStore] init OK',
        '| user:', userId,
        '| auditorías:', _audit.length,
        '| meses indexados:', Object.keys(_monthly).length
      );
    } catch (e) {
      console.warn('[PilotPayStore] init error:', e);
      _ready = false;
    }
  }

  function refresh() {
    if (!_ready || !_userId) return;
    try {
      var auditList = _loadAuditList();
      _audit   = auditList;
      _monthly = _loadMonthly();
      _hydrateMonthly(auditList, _cr());   // incluye cleanupDuplicateMonthRecords
    } catch (e) {
      console.warn('[PilotPayStore] refresh error:', e);
    }
  }

  function clear() {
    _userId  = null;
    _ready   = false;
    _monthly = {};
    _audit   = [];
    console.log('[PilotPayStore] cleared');
  }

  function ready() {
    return _ready && _userId !== null;
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  window.PilotPayStore = {
    version : VERSION,

    // Ciclo de vida
    init    : init,
    refresh : refresh,
    clear   : clear,
    ready   : ready,

    // Resolución temporal canónica — única fuente de verdad del período del expediente
    resolveExpedientePeriod : function (varsData) { return _resolveExpedientePeriod(varsData); },

    // Dominios
    profile    : profile,
    monthly    : monthly,
    audit      : audit,
    simulator  : simulator,
    expedition : expedition,

    // Agregados
    getDashboardSummary : getDashboardSummary,

    // Mantenimiento
    cleanupDuplicateMonthRecords : function () { return monthly.cleanupDuplicateMonthRecords(); },

    // Internals expuestos para PilotPayDebug y tests — no usar en UI
    _internal : {
      validateMonthRecord    : _validateMonthRecord,
      normalizeMonthRecord   : _normalizeMonthRecord,
      deriveSourceIntegrity  : _deriveSourceIntegrity,
      SCHEMA_VERSION         : SCHEMA_VERSION,
      ENGINE_VERSION         : ENGINE_VERSION,
      CONVENIO_VERSION       : CONVENIO_VERSION,
      ESTADOS_VALIDOS        : ESTADOS_VALIDOS,
      TRANSICIONES_VALIDAS   : TRANSICIONES_VALIDAS
    }
  };

  console.log('[PilotPayStore] módulo cargado v' + VERSION);

})();
