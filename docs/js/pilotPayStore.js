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
  var _userId             = null;
  var _ready              = false;
  var _monthly            = {};     // '2026:5' → MonthRecord
  var _audit              = [];     // lista plana, orden cronológico inverso
  var _isHydratingFromIDB = false;  // guard anti-loop durante hydrateFromIDB()

  // ── P4: Firebase write-through (feature-flagged) ────────────────────────────
  // Sink registrado por setFirebaseSink() desde index.html tras auth exitoso.
  // Con flag apagado toda la infraestructura es no-op; comportamiento idéntico al actual.
  var _p4Sink              = null;   // { update, get, getDeviceId }
  var _p4WriteCount        = 0;     // contador total de sesión (monthly + audit)
  var _p4MonthlyWriteCount = 0;     // contador monthly únicamente (debug)
  var _p4AuditWriteCount   = 0;     // contador audit únicamente (debug)
  var _p4LastPath          = null;  // último path escrito — cualquier tipo (debug)
  var _p4LastAuditPath     = null;  // último path de auditoría escrito (debug)
  var _isPullingFromFirebase = false; // guard anti-concurrencia para pullFromFirebase()
  var _isFlushingP4Queue    = false; // guard flush en curso → indicador sync
  var _lastSyncError        = null;  // string del último error, null si sin error
  var _lastSyncAt           = null;  // ISO del último sync OK (flush + pull)

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
  function _saveMonthly(changedKey, reason) {
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

      // Write-through a IDB — best-effort, no bloquea, se omite durante hydrateFromIDB
      Object.keys(toSave).forEach(function (key) { _idbWriteMonthly(toSave[key]); });

      // Monitoring de tamaño — warning si supera 500 KB
      var kb = Math.round(json.length / 1024);
      if (kb > 500) {
        console.warn('[PilotPayStore] monthly_v1 tamaño:', kb, 'KB —', Object.keys(toSave).length, 'meses');
      } else {
        console.log('[PilotPayStore] monthly_v1 guardado:', kb, 'KB —', Object.keys(toSave).length, 'meses');
      }

      // P4 Fase 2: write-through del nodo exacto modificado hacia Firebase.
      // Guards triple: changedKey presente + _ready (post-init) + no en hydration.
      // Con flag apagado _notifyFirebase() es no-op — comportamiento idéntico al actual.
      if (changedKey && _ready && !_isHydratingFromIDB) {
        var _p4mr = toSave[changedKey];
        if (_p4mr) {
          var _p4path = 'pilotpay/historicos/' + _userId +
                        '/monthly/' + _p4mr.year + '_' + _p4mr.month;
          console.log('[P4] monthly notify:', _p4path, 'reason=' + (reason || 'unknown'));
          _notifyFirebase(_p4path, _p4Decorate(_p4mr));
        } else {
          console.log('[P4] monthly skip hydrate:', changedKey, '(sin datos significativos)');
        }
      }
    } catch (e) { console.warn('[PilotPayStore] _saveMonthly error:', e); }
  }

  // Devuelve { data, changedCount }.
  // changedCount > 0 indica registros migrados — se persistirán en el _saveMonthly de _hydrateMonthly.
  function _loadMonthly() {
    try {
      var raw = localStorage.getItem(_monthlyKey());
      if (!raw) return { data: {}, changedCount: 0 };
      var data = JSON.parse(raw);
      var changedCount = 0;
      Object.keys(data).forEach(function (k) {
        var result = _normalizeMonthRecord(data[k]);
        data[k] = result.mr;
        if (result.changed) changedCount++;
        var issues = _validateMonthRecord(data[k]);
        if (issues.length > 0) _logValidationIssues(k, issues);
      });
      if (changedCount > 0) {
        console.log('[PilotPayStore] normalized', changedCount, 'MonthRecord(s) — se persistirán en el próximo save');
      }
      return { data: data, changedCount: changedCount };
    } catch (e) {
      console.warn('[PilotPayStore] _loadMonthly error:', e);
      return { data: {}, changedCount: 0 };
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

  // ── Clone profundo seguro ────────────────────────────────────────────────────
  // Usa structuredClone si existe, fallback JSON, devuelve null si ambos fallan.
  // NUNCA muta el objeto original.
  function _cloneSnapshot(obj) {
    if (obj === null || obj === undefined) return obj;
    try {
      if (typeof structuredClone === 'function') return structuredClone(obj);
    } catch (e1) { /* structuredClone no soporta este tipo — intentar JSON fallback */ }
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e2) {
      console.error('[PilotPayStore] _cloneSnapshot: imposible clonar objeto —', e2, obj);
      return null;
    }
  }

  // ── Máquina de estados controlada ───────────────────────────────────────────
  // Única función autorizada para cambiar mr.estado.
  // Orden garantizado: validar → loguear → mutar.
  // Devuelve true si el estado cambió o fue confirmado; false si se rechazó.
  function _setEstado(mr, nuevoEstado, opts) {
    opts = opts || {};
    var reason = opts.reason || null;
    var force  = opts.force  === true;

    // 1. Validar que el estado destino existe
    if (ESTADOS_VALIDOS.indexOf(nuevoEstado) === -1) {
      console.warn('[PilotPayStore] _setEstado: estado desconocido "' + nuevoEstado + '"' +
                   (reason ? ' | reason: ' + reason : '') + ' — ignorado');
      return false;
    }

    var estadoActual = mr.estado || '(null)';
    var now = new Date().toISOString();

    // 2a. No-op: mismo estado sin force — no tocar nada
    if (estadoActual === nuevoEstado && !force) {
      return true;
    }

    // 2b. Mismo estado con force — actualizar timestamps y lastTransition
    if (estadoActual === nuevoEstado && force) {
      mr._updatedAt = now;
      if (!mr.metadata) mr.metadata = {};
      mr.metadata.lastTransition = { from: estadoActual, to: nuevoEstado, at: now, reason: reason, forced: true };
      return true;
    }

    // 3. Validar transición (solo si no es force)
    if (!force) {
      var permitidas = TRANSICIONES_VALIDAS[estadoActual] || [];
      if (permitidas.indexOf(nuevoEstado) === -1) {
        console.warn('[PilotPayStore] _setEstado: transición inválida ' + estadoActual + ' → ' + nuevoEstado +
                     (reason ? ' | reason: ' + reason : '') + ' — ignorado');
        return false;
      }
    } else {
      // force:true — advertir si la transición no está en la tabla (para detectar migraciones peligrosas)
      var permitidas2 = TRANSICIONES_VALIDAS[estadoActual] || [];
      if (permitidas2.indexOf(nuevoEstado) === -1) {
        console.warn('[PilotPayStore] forced transition: ' + estadoActual + ' → ' + nuevoEstado +
                     (reason ? ' | reason: ' + reason : ''));
      }
    }

    // 4. Mutar (después de validar y loguear)
    mr.estado = nuevoEstado;
    mr._updatedAt = now;

    if (!mr.metadata) mr.metadata = {};
    mr.metadata.lastTransition = {
      from   : estadoActual,
      to     : nuevoEstado,
      at     : now,
      reason : reason
    };
    if (force) mr.metadata.lastTransition.forced = true;

    return true;
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
    if (mr.auditoria && mr.auditoria.nDiscrepancias > 0 && st !== 'con_diferencias' && st !== 'regularizado' && st !== 'reclamado' && st !== 'cerrado')
                                            wrn('W_DIFF_ESTADO',   'auditoria con nDiscrepancias>0 pero estado es ' + st, 'estado');

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

  // ── P4: Infraestructura de write-through Firebase ───────────────────────────
  //
  // Fase 1 — INFRAESTRUCTURA ÚNICAMENTE. Los call points (_saveMonthly, saveAuditRecord)
  // se conectan en Fase 2 y Fase 3 respectivamente. Con flag apagado todo es no-op.

  function _isP4Enabled() {
    try { return localStorage.getItem('pilotpay_p4_enabled') === '1'; } catch (e) { return false; }
  }

  function _p4GetDeviceId() {
    if (_p4Sink && typeof _p4Sink.getDeviceId === 'function') return _p4Sink.getDeviceId();
    try { return localStorage.getItem('pilotpay_device_id') || 'unknown'; } catch (e) { return 'unknown'; }
  }

  function _p4QueueKey() {
    return _userId ? 'pilotpay:' + _userId + ':p4_queue' : null;
  }

  function _p4LastSyncKey() {
    return _userId ? 'pilotpay:' + _userId + ':last_sync_at' : null;
  }

  function _p4SaveLastSyncAt() {
    var k = _p4LastSyncKey();
    if (!k || !_lastSyncAt) return;
    try { localStorage.setItem(k, _lastSyncAt); } catch (e) {}
  }

  function _p4LoadLastSyncAt() {
    var k = _p4LastSyncKey();
    if (!k) return null;
    try { return localStorage.getItem(k) || null; } catch (e) { return null; }
  }

  // PURO — devuelve copia decorada con metadatos Firebase. No muta el original.
  function _p4Decorate(record) {
    return Object.assign({}, record, {
      _schemaVersion    : 1,
      _updatedAt        : new Date().toISOString(),
      _lastWriterDevice : _p4GetDeviceId()
    });
  }

  // Clave del manifest de upload inicial en localStorage.
  function _p4ManifestKey() {
    return _userId ? 'pilotpay:' + _userId + ':p4_upload_manifest' : null;
  }

  // Decoración para upload inicial: preserva _updatedAt original del registro,
  // añade _uploadedAt (cuándo se subió) en lugar de sobreescribir la fecha del record.
  function _p4DecorateUpload(record) {
    return Object.assign({}, record, {
      _schemaVersion    : 1,
      _uploadedAt       : new Date().toISOString(),
      _lastWriterDevice : _p4GetDeviceId()
    });
  }

  // Convierte un timestamp ISO a milisegundos. Devuelve 0 si falta o es inválido.
  // Usar siempre Date.parse() — NO comparar strings ISO directamente.
  function _parseTs(ts) {
    if (!ts) return 0;
    var ms = Date.parse(ts);
    if (isNaN(ms)) { console.warn('[P4] _parseTs: timestamp inválido —', ts); return 0; }
    return ms;
  }

  // Elimina campos de metadata Firebase antes de escribir en localStorage/IDB.
  var _FB_META = ['_schemaVersion', '_uploadedAt', '_lastWriterDevice'];
  function _stripFbMeta(record) {
    var clean = Object.assign({}, record);
    _FB_META.forEach(function (f) { delete clean[f]; });
    return clean;
  }

  // Encola un write pendiente. fbPath = ruta Firebase relativa al root,
  // p.ej. 'pilotpay/historicos/ESH/monthly/2026_5'.
  // Last-writer-wins por path: si hay ya un item para ese path, se reemplaza.
  function _enqueueP4(fbPath, decorated) {
    var k = _p4QueueKey();
    if (!k) return;
    try {
      var q = JSON.parse(localStorage.getItem(k) || '{}');
      q[fbPath] = decorated;
      localStorage.setItem(k, JSON.stringify(q));
      console.log('[P4] encolado:', fbPath);
    } catch (e) { console.warn('[P4] _enqueueP4 error:', e); }
  }

  // Vacía la cola P4 hacia Firebase. Best-effort: los items que fallen permanecen en cola.
  // Llamar desde el handler 'online' de index.html.
  function _flushP4Queue() {
    if (!_isP4Enabled()) return Promise.resolve();
    if (!_p4Sink || typeof _p4Sink.update !== 'function') return Promise.resolve();
    var k = _p4QueueKey();
    if (!k) return Promise.resolve();
    var q;
    try { q = JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return Promise.resolve(); }
    var paths = Object.keys(q);
    if (paths.length === 0) return Promise.resolve();
    _isFlushingP4Queue = true;
    console.log('[P4] flushing', paths.length, 'item(s) pendiente(s)');
    var promises = paths.map(function (fbPath) {
      return _p4Sink.update(fbPath, q[fbPath])
        .then(function () {
          try {
            var cur = JSON.parse(localStorage.getItem(k) || '{}');
            delete cur[fbPath];
            localStorage.setItem(k, JSON.stringify(cur));
          } catch (e) {}
          console.log('[P4] flush OK:', fbPath);
        })
        .catch(function (err) {
          var msg = err && err.message ? err.message : String(err);
          console.warn('[P4] flush failed:', fbPath, '—', msg, '— permanece en cola');
          _lastSyncError = msg;
        });
    });
    return Promise.all(promises).then(function () {
      _isFlushingP4Queue = false;
      // Actualizar last_sync_at solo si no quedaron errores y la cola está vacía
      var remaining = 0;
      try { remaining = Object.keys(JSON.parse(localStorage.getItem(k) || '{}')).length; } catch (e) {}
      if (!_lastSyncError && remaining === 0) {
        _lastSyncAt = new Date().toISOString();
        _p4SaveLastSyncAt();
      }
    }).catch(function () { _isFlushingP4Queue = false; });
  }

  // Punto de entrada para writes P4 monthly. No-op si flag apagado o sink no registrado.
  // Guards: flag + _isHydratingFromIDB + _ready (aplicado en _saveMonthly antes de llegar aquí).
  function _notifyFirebase(fbPath, decorated) {
    if (!_isP4Enabled()) return;
    if (_isHydratingFromIDB) return;
    _p4WriteCount++;
    _p4MonthlyWriteCount++;
    _p4LastPath = fbPath;
    if (!_p4Sink || typeof _p4Sink.update !== 'function') {
      _enqueueP4(fbPath, decorated);
      console.log('[P4] monthly queued (sin sink):', fbPath);
      return;
    }
    _p4Sink.update(fbPath, decorated)
      .then(function () { console.log('[P4] monthly write OK:', fbPath); })
      .catch(function (err) {
        console.warn('[P4] monthly write failed:', fbPath, '—',
                     err && err.message ? err.message : err);
        _enqueueP4(fbPath, decorated);
        console.log('[P4] monthly queued (error red):', fbPath);
      });
  }

  // Write-through Firebase para un AuditRecord individual.
  // Append-only: cada auditoría escribe su propio nodo vía record.id único.
  // Llamar desde notifyAuditRecord() (public API), que aplica los guards de flag + hydration.
  function _notifyFirebaseAudit(record) {
    var fbPath = 'pilotpay/historicos/' + record.userId + '/auditorias/' + record.id;
    console.log('[P4] audit notify:', fbPath);
    _p4WriteCount++;
    _p4AuditWriteCount++;
    _p4LastPath      = fbPath;
    _p4LastAuditPath = fbPath;
    var decorated = _p4Decorate(record);
    if (!_p4Sink || typeof _p4Sink.update !== 'function') {
      _enqueueP4(fbPath, decorated);
      console.log('[P4] audit queued (sin sink):', fbPath);
      return;
    }
    _p4Sink.update(fbPath, decorated)
      .then(function () { console.log('[P4] audit write OK:', fbPath); })
      .catch(function (err) {
        console.warn('[P4] audit write failed:', fbPath, '—',
                     err && err.message ? err.message : err);
        _enqueueP4(fbPath, decorated);
        console.log('[P4] audit queued (error red):', fbPath);
      });
  }

  // Borra el nodo de auditoría en Firebase y crea tombstone en deletedAuditorias.
  // Usa paths individuales (no PATCH padre) para que cada delete tenga su propia
  // entrada en la cola — evita conflicto last-writer-wins entre múltiples deletes offline.
  // sink.update(path, null) → DELETE HTTP (ver sink en index.html).
  // TODO: GC de tombstones antiguos (>180 días) — no implementar todavía.
  function _notifyFirebaseAuditDelete(auditId) {
    var auditPath     = 'pilotpay/historicos/' + _userId + '/auditorias/'        + auditId;
    var tombstonePath = 'pilotpay/historicos/' + _userId + '/deletedAuditorias/' + auditId;
    var tombstone = {
      id              : auditId,
      deletedAt       : new Date().toISOString(),
      deletedByDevice : _p4GetDeviceId(),
      _schemaVersion  : 1
    };
    console.log('[P4] audit delete notify:', auditPath);

    if (!_p4Sink || typeof _p4Sink.update !== 'function') {
      _enqueueP4(auditPath,     null);       // null → DELETE en flush
      _enqueueP4(tombstonePath, tombstone);  // tombstone → PATCH en flush
      console.log('[P4] audit delete + tombstone queued (sin sink):', auditId);
      return;
    }

    _p4Sink.update(auditPath, null)   // DELETE nodo
      .then(function () { console.log('[P4] audit delete OK:', auditPath); })
      .catch(function (err) {
        console.warn('[P4] audit delete failed:', auditPath, '—', err && err.message ? err.message : err);
        _enqueueP4(auditPath, null);
        console.log('[P4] audit delete queued (error red):', auditId);
      });

    _p4Sink.update(tombstonePath, tombstone)  // PATCH tombstone
      .then(function () { console.log('[P4] tombstone write OK:', auditId); })
      .catch(function (err) {
        console.warn('[P4] tombstone write failed:', auditId, '—', err && err.message ? err.message : err);
        _enqueueP4(tombstonePath, tombstone);
        console.log('[P4] tombstone queued (error red):', auditId);
      });
  }

  // ── IDB write-through ────────────────────────────────────────────────────────
  // Write-through a IDB — best-effort totalmente silencioso.
  // Se salta si _isHydratingFromIDB para evitar el loop:
  //   hydrateFromIDB → _hydrateMonthly → _saveMonthly → _idbWriteMonthly (redundante)
  // No bloquea nunca el flujo financiero local.
  function _idbWriteMonthly(mr) {
    if (_isHydratingFromIDB) return;
    if (typeof PilotPayLocalDB === 'undefined') return;
    try { PilotPayLocalDB.putMonthlyRecord(mr).catch(function() {}); } catch (e) {}
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
        var now = new Date().toISOString();
        var de = rec.datosExtraidos || {};
        mr.auditoria = {
          fechaAuditoria : rec.fechaAuditoria,
          liqTeorico     : rec.liqTeorico     || null,
          liqReal        : rec.liqReal        || null,
          diferenciaNeta : rec.diff           || null,
          nDiscrepancias : rec.nDiscrepancias || 0,
          discrepancias  : _cloneSnapshot(rec.discrepancias || []) || [],
          totalDevengado : de.total_devengado || null,
          baseIRPF       : de.base_irpf       || null,
          baseSS         : de.base_ss         || null,
          irpf_pct       : de.irpf_pct        || null,
          acumulados     : { baseIRPF: de.acum_base_irpf || null, irpf: de.acum_irpf || null },
          diasTrabajados : de.dias_trabajados  || null
        };
        mr._updatedAt = now;  // datos reales cambiaron

        // Audit trail: período resuelto desde nómina PDF (si no lo tenía ya)
        if (!mr.resolvedPeriod) {
          mr.resolvedPeriod = {
            year      : ym.year,
            month     : ym.month,
            mesLabel  : _monthLabel(ym.month),
            source    : 'nominaPDF',
            resolvedAt: now
          };
        }

        // Estado base desde auditoría
        var estadoBase = (rec.nDiscrepancias > 0) ? 'con_diferencias' : 'auditado';

        // Migración lazy: si audit_history_v1 tenía regularizacionFinal y el
        // expediente en monthly_v1 no tiene regularizacion aún, copiarlo clonado.
        // audit_history_v1 NO se modifica — este campo es solo lectura aquí.
        if (rec.regularizacionFinal && !mr.regularizacion) {
          mr.regularizacion = _cloneSnapshot(rec.regularizacionFinal) || rec.regularizacionFinal;
        }

        // Estado final: regularizado si hay regularización, sea de la migración o preexistente.
        // force:true porque la hydration puede saltar estados no contemplados en TRANSICIONES_VALIDAS.
        if (mr.regularizacion != null && estadoBase === 'con_diferencias') {
          _setEstado(mr, 'regularizado', { force: true, reason: 'hydration' });
        } else if (mr.estado !== 'cerrado' && mr.estado !== 'reclamado') {
          // No sobrescribir cerrado/reclamado que ya estuviera en monthly_v1
          _setEstado(mr, estadoBase, { force: true, reason: 'hydration' });
        }
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
      var pd    = _pd();
      var users = window.USERS || {};
      var u     = (_userId && users[_userId]) ? users[_userId] : {};
      return {
        userId      : _userId,
        nombre      : pd.fullName    || u.name     || '',
        funcion     : pd.funcion     || u.funcion  || '',
        // role: alias de funcion — mismo valor, nombre más estándar para futura API/sync
        role        : pd.funcion     || u.funcion  || '',
        // nivelActual: campo canónico editable — nivel (legacy) como alias de lectura
        nivelActual : pd.nivelActual != null ? pd.nivelActual : (pd.nivel || u.nivel || 3),
        nivel       : pd.nivelActual != null ? pd.nivelActual : (pd.nivel || u.nivel || 3),
        base        : pd.base        || u.base     || 'GC',
        // fechaIngresoEmpresa: campo canónico ISO — ingreso (legacy) como alias
        fechaIngresoEmpresa : pd.fechaIngresoEmpresa || pd.ingreso || u.ingreso || null,
        ingreso     : pd.fechaIngresoEmpresa || pd.ingreso || u.ingreso || null,
        fechaOCC    : pd.fechaOCC    != null ? pd.fechaOCC : null,
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
      _saveMonthly(k, 'set');
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

      var snapshot = _cloneSnapshot(varsData);
      if (snapshot === null) {
        console.error('[PilotPayStore] onVariablesConfirmed: _cloneSnapshot devolvió null — abortando');
        return;
      }
      mr.variablesData = snapshot;
      mr._updatedAt    = now;  // datos reales cambiaron

      if (!mr.resolvedPeriod) {
        mr.resolvedPeriod = { year: rp.year, month: rp.month, mesLabel: rp.mesLabel,
                              source: rp.source, resolvedAt: now };
      }
      _setEstado(mr, 'pending_calculation', { reason: 'variables-confirmadas' });
      _saveMonthly(k, 'variables-confirmadas');
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

      // Clonar calcResult ANTES de añadir campos — no mutar el objeto original del frontend
      var snapshot = _cloneSnapshot(calcResult);
      if (snapshot === null) {
        console.error('[PilotPayStore] onCalculationDone: _cloneSnapshot devolvió null — abortando');
        return;
      }
      snapshot.engineVersion   = ENGINE_VERSION;
      snapshot.convenioVersion = CONVENIO_VERSION;
      snapshot.calculatedAt    = now;
      mr.calculoTeorico = snapshot;
      mr._updatedAt     = now;  // datos reales cambiaron

      if (!mr.resolvedPeriod) {
        mr.resolvedPeriod = { year: rp.year, month: rp.month, mesLabel: rp.mesLabel,
                              source: rp.source, resolvedAt: now };
      }
      if (mr.estado === 'pending_calculation' ||
          mr.estado === 'pending_variables'   ||
          mr.estado === 'pendiente') {
        _setEstado(mr, 'pending_comparison', { reason: 'calculo-done' });
      }
      _saveMonthly(k, 'calculo-done');
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

      var now = new Date().toISOString();
      var de = auditRecord.datosExtraidos || {};
      mr.auditoria = {
        fechaAuditoria : auditRecord.fechaAuditoria,
        liqTeorico     : auditRecord.liqTeorico     || null,
        liqReal        : auditRecord.liqReal        || null,
        diferenciaNeta : auditRecord.diff           || null,
        nDiscrepancias : auditRecord.nDiscrepancias || 0,
        discrepancias  : _cloneSnapshot(auditRecord.discrepancias || []) || [],
        totalDevengado : de.total_devengado || null,
        baseIRPF       : de.base_irpf       || null,
        baseSS         : de.base_ss         || null,
        irpf_pct       : de.irpf_pct        || null,
        acumulados     : { baseIRPF: de.acum_base_irpf || null, irpf: de.acum_irpf || null },
        diasTrabajados : de.dias_trabajados  || null
      };
      mr._updatedAt = now;  // datos reales cambiaron

      // Audit trail: período resuelto desde nómina PDF (solo si no tenía ya resolvedPeriod)
      if (!mr.resolvedPeriod) {
        mr.resolvedPeriod = {
          year      : ym.year,
          month     : ym.month,
          mesLabel  : _monthLabel(ym.month),
          source    : 'nominaPDF',
          resolvedAt: now
        };
      }

      // force:true porque una re-auditoría del mismo mes puede venir cuando el estado ya
      // es 'auditado' o 'con_diferencias', transición no contemplada en TRANSICIONES_VALIDAS.
      if (mr.estado !== 'cerrado' && mr.estado !== 'reclamado') {
        var nuevoEstadoAudit = (auditRecord.nDiscrepancias > 0) ? 'con_diferencias' : 'auditado';
        _setEstado(mr, nuevoEstadoAudit, { force: true, reason: 'auditoria-completada' });
      }
      _saveMonthly(k, 'auditoria-completada');
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

      var now = new Date().toISOString();
      mr.regularizacion = {
        tipo              : data.tipo              || 'acuerdo_manual',
        importeNeto       : data.importeNeto,
        netoFinalAjustado : data.netoFinalAjustado,
        nota              : data.nota              || '',
        fecha             : data.fecha             || now.slice(0, 10),
        docNombre         : data.docNombre         || null,
        registrado        : data.registrado        || now
      };
      mr._updatedAt = now;  // datos reales cambiaron

      if (mr.estado === 'con_diferencias') {
        _setEstado(mr, 'regularizado', { reason: 'regularizacion-done' });
      }
      _saveMonthly(k, 'regularizacion-done');
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

      // Capturar identidad antes de borrar el objeto de _monthly
      var mrId    = mr.id;
      var mrYear  = mr.year;
      var mrMonth = mr.month;

      // 1. _monthly + localStorage (vía _saveMonthly)
      delete _monthly[k];
      _saveMonthly();
      console.log('[P4] monthly delete local:', k);

      // 2. IDB — borrado explícito; sin esto hydrateFromIDB restaura el registro
      if (typeof PilotPayLocalDB !== 'undefined' &&
          typeof PilotPayLocalDB.deleteMonthlyRecord === 'function') {
        PilotPayLocalDB.deleteMonthlyRecord(mrId)
          .then(function () { console.log('[P4] monthly delete IDB:', mrId); })
          .catch(function (e) {
            console.warn('[P4] monthly delete IDB failed:', mrId, e && e.message ? e.message : e);
          });
      }

      // 3. Firebase — DELETE nodo monthly; si offline encolar para retry
      if (_isP4Enabled() && _userId) {
        var fbPath = 'pilotpay/historicos/' + _userId + '/monthly/' + mrYear + '_' + mrMonth;
        if (_p4Sink && typeof _p4Sink.update === 'function') {
          _p4Sink.update(fbPath, null)
            .then(function () { console.log('[P4] monthly delete firebase:', fbPath); })
            .catch(function (err) {
              _enqueueP4(fbPath, null);
              console.log('[P4] monthly delete queued (offline):', fbPath,
                          err && err.message ? err.message : err);
            });
        } else {
          _enqueueP4(fbPath, null);
          console.log('[P4] monthly delete queued (sin sink):', fbPath);
        }
      }

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
  // ESTADÍSTICAS FINANCIERAS — stats.getSummary(opts)
  // PURE: sin escrituras, sin normalize, sin repair, sin persist.
  // ══════════════════════════════════════════════════════════════════════════════
  var _ESTADOS_DEFINITIVOS = ['auditado', 'con_diferencias', 'regularizado', 'reclamado', 'cerrado'];

  var stats = {
    getSummary: function (opts) {
      if (!_ready) return null;
      opts = opts || {};
      var filterYear = (opts.year && !isNaN(opts.year)) ? Number(opts.year) : null;

      var allMR = Object.values(_monthly);

      // Aplicar scope de año si se pide
      var scopedMR = filterYear
        ? allMR.filter(function (mr) { return mr.year === filterYear; })
        : allMR;

      // Separar: definitivos con auditoría vs inconsistentes vs pendientes
      var definitivos   = [];
      var inconsistentes = 0;
      var pendientes    = 0;

      scopedMR.forEach(function (mr) {
        var esDefinitivo = _ESTADOS_DEFINITIVOS.indexOf(mr.estado) !== -1;
        if (esDefinitivo && mr.auditoria !== null) {
          definitivos.push(mr);
        } else if (esDefinitivo && mr.auditoria === null) {
          inconsistentes++;
        } else {
          pendientes++;
        }
      });

      // Ordenar definitivos por año/mes (canónico, no por fecha de auditoría)
      definitivos.sort(function (a, b) {
        return a.year !== b.year ? a.year - b.year : a.month - b.month;
      });

      // Contadores de estado
      var mesesAuditados                = definitivos.length;
      var mesesConDiferencias           = 0;  // estado actual con_diferencias
      var mesesConDiferenciasHistoricas = 0;  // nDiscrepancias > 0 en auditoría
      var mesesRegularizados            = 0;
      var mesesReclamados               = 0;

      // Acumuladores financieros
      var totalNetoCobrado        = null;
      var totalRegularizado       = 0;
      var diferenciaNetaAcumulada = 0;
      var sumaLiqReal             = 0;
      var countLiqReal            = 0;
      var sumaNetoEfectivo        = 0;
      var countNetoEfectivo       = 0;
      var mesesSinLiqReal         = 0;

      definitivos.forEach(function (mr) {
        var st  = mr.estado;
        var aud = mr.auditoria;  // garantizado !== null por filtro anterior
        var reg = mr.regularizacion;

        // Contadores de estado
        if (st === 'con_diferencias')  mesesConDiferencias++;
        if (st === 'regularizado')     mesesRegularizados++;
        if (st === 'reclamado')        mesesReclamados++;

        // Diferencias históricas (independiente del estado actual)
        if (aud.nDiscrepancias > 0) mesesConDiferenciasHistoricas++;

        // Diferencia neta acumulada
        if (typeof aud.diferenciaNeta === 'number' && !isNaN(aud.diferenciaNeta)) {
          diferenciaNetaAcumulada += aud.diferenciaNeta;
        }

        // Neto cobrado — fuente canónica: netoFinalAjustado si existe, sino liqReal
        // totalRegularizado acumula el IMPORTE de la regularización (no el neto final total)
        var netoEfectivo = null;
        if (reg && typeof reg.netoFinalAjustado === 'number' && !isNaN(reg.netoFinalAjustado)) {
          netoEfectivo = reg.netoFinalAjustado;
        }
        if (reg && typeof reg.importeNeto === 'number' && !isNaN(reg.importeNeto)) {
          totalRegularizado += reg.importeNeto;
        }

        if (typeof aud.liqReal === 'number' && !isNaN(aud.liqReal)) {
          sumaLiqReal  += aud.liqReal;
          countLiqReal++;
          if (netoEfectivo === null) netoEfectivo = aud.liqReal;
        } else {
          mesesSinLiqReal++;
        }

        if (netoEfectivo !== null) {
          sumaNetoEfectivo += netoEfectivo;
          countNetoEfectivo++;
          if (totalNetoCobrado === null) totalNetoCobrado = 0;
          totalNetoCobrado += netoEfectivo;
        }
      });

      // Redondeo financiero (2 decimales)
      function _r2(v) { return Math.round(v * 100) / 100; }

      totalNetoCobrado        = totalNetoCobrado !== null ? _r2(totalNetoCobrado)        : null;
      totalRegularizado       = _r2(totalRegularizado);
      diferenciaNetaAcumulada = _r2(diferenciaNetaAcumulada);
      var mediaNetaOficial    = countLiqReal      > 0 ? _r2(sumaLiqReal      / countLiqReal)      : null;
      var mediaNetaFinal      = countNetoEfectivo > 0 ? _r2(sumaNetoEfectivo / countNetoEfectivo) : null;

      // Primer y último mes auditado
      var primerMesAuditado = null;
      var ultimoMesAuditado = null;
      if (definitivos.length > 0) {
        var _toRef = function (mr) {
          return {
            year          : mr.year,
            month         : mr.month,
            mesLabel      : mr.mesLabel,
            estado        : mr.estado,
            fechaAuditoria: mr.auditoria ? mr.auditoria.fechaAuditoria : null
          };
        };
        primerMesAuditado = _toRef(definitivos[0]);
        ultimoMesAuditado = _toRef(definitivos[definitivos.length - 1]);
      }

      // Quality flags — _validateMonthRecord sobre todos los registros en scope
      var hasErrors   = false;
      var hasWarnings = false;
      scopedMR.forEach(function (mr) {
        var issues = _validateMonthRecord(mr);
        issues.forEach(function (issue) {
          if (issue.severity === 'error')   hasErrors   = true;
          if (issue.severity === 'warning') hasWarnings = true;
        });
      });

      return {
        generatedAt : new Date().toISOString(),
        userId      : _userId,
        scope       : { year: filterYear },

        mesesAuditados               : mesesAuditados,
        mesesConDiferencias          : mesesConDiferencias,
        mesesConDiferenciasHistoricas: mesesConDiferenciasHistoricas,
        mesesRegularizados           : mesesRegularizados,
        mesesReclamados              : mesesReclamados,
        mesesPendientes              : pendientes,

        totalNetoCobrado        : totalNetoCobrado,
        totalRegularizado       : totalRegularizado,
        diferenciaNetaAcumulada : diferenciaNetaAcumulada,
        mediaNetaOficial        : mediaNetaOficial,
        mediaNetaFinal          : mediaNetaFinal,

        primerMesAuditado : primerMesAuditado,
        ultimoMesAuditado : ultimoMesAuditado,

        mesesSinLiqReal  : mesesSinLiqReal,
        inconsistencias  : inconsistentes,
        hasErrors        : hasErrors,
        hasWarnings      : hasWarnings
      };
    }
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
  // Hidratación async desde IDB — se llama DESPUÉS de init() síncrono.
  // init() sigue siendo la ruta canónica de arranque (localStorage, síncrono, _ready=true).
  // hydrateFromIDB() es aditivo: solo sobrescribe _monthly/_audit si IDB tiene datos
  // distintos a los ya cargados desde localStorage.
  //
  // Retorna Promise<boolean>:
  //   true  → datos importados desde IDB (re-render recomendado si changed)
  //   false → IDB vacío, IDB = localStorage, o fallo silencioso
  function hydrateFromIDB() {
    if (!_userId || typeof PilotPayLocalDB === 'undefined') return Promise.resolve(false);
    if (_isHydratingFromIDB) return Promise.resolve(false);

    _isHydratingFromIDB = true;

    var IDB_META = ['_deviceId', '_hash', '_syncState', '_localVersion', '_remoteVersion'];

    return Promise.all([
      PilotPayLocalDB.getMonthlyRecordsByUser(_userId),
      PilotPayLocalDB.getAuditRecordsByUser(_userId)
    ]).then(function (results) {
      var idbMonthly = results[0];
      var idbAudit   = results[1];

      // Si IDB está vacío en ambos stores → no hay nada que importar
      if (idbMonthly.length === 0 && idbAudit.length === 0) {
        _isHydratingFromIDB = false;
        console.log('[PilotPayStore] hydrateFromIDB: IDB vacío — manteniendo datos de localStorage');
        return false;
      }

      // Comparación ligera por conjuntos de IDs
      // Solo procesamos si hay alguna diferencia real entre IDB y el estado actual del store
      var currentKeys   = Object.keys(_monthly).sort().join(',');
      var idbKeys       = idbMonthly.map(function (mr) { return mr.year + ':' + mr.month; }).sort().join(',');
      var currentAudIds = _audit.map(function (ar) { return ar.id; }).sort().join(',');
      var idbAudIds     = idbAudit.map(function (ar) { return ar.id; }).sort().join(',');

      if (currentKeys === idbKeys && currentAudIds === idbAudIds) {
        _isHydratingFromIDB = false;
        console.log('[PilotPayStore] hydrateFromIDB: IDB idéntico a localStorage — sin cambios');
        return false;
      }

      // Construir dict monthly desde array IDB, stripping de campos IDB meta
      // (no deben contaminar el modelo financiero ni el localStorage)
      var newMonthly = {};
      idbMonthly.forEach(function (mr) {
        var key   = mr.year + ':' + mr.month;
        var clean = Object.assign({}, mr);
        IDB_META.forEach(function (f) { delete clean[f]; });
        newMonthly[key] = clean;
      });

      var newAudit = idbAudit.map(function (ar) {
        var clean = Object.assign({}, ar);
        IDB_META.forEach(function (f) { delete clean[f]; });
        return clean;
      });

      // Actualizar estado interno y rehidratar
      // _isHydratingFromIDB=true impide que los _saveMonthly internos
      // disparen write-through a IDB (redundante — acabamos de leer de ahí)
      _monthly = newMonthly;
      _audit   = newAudit;
      _hydrateMonthly(_audit, _cr());

      _isHydratingFromIDB = false;
      console.log('[PilotPayStore] hydrateFromIDB: importados desde IDB',
        '| monthly:', Object.keys(_monthly).length,
        '| audit:', _audit.length
      );
      return true;

    }).catch(function (e) {
      _isHydratingFromIDB = false;
      console.warn('[PilotPayStore] hydrateFromIDB falló — usando datos de localStorage:', e);
      return false;
    });
  }

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
      var loadResult = _loadMonthly();
      _monthly = loadResult.data;

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
      var auditList  = _loadAuditList();
      _audit         = auditList;
      var loadResult = _loadMonthly();
      _monthly       = loadResult.data;
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
    init            : init,
    refresh         : refresh,
    clear           : clear,
    ready           : ready,
    hydrateFromIDB  : hydrateFromIDB,
    isHydratingFromIDB : function () { return _isHydratingFromIDB; },

    // Resolución temporal canónica — única fuente de verdad del período del expediente
    resolveExpedientePeriod : function (varsData) { return _resolveExpedientePeriod(varsData); },

    // Dominios
    profile    : profile,
    monthly    : monthly,
    audit      : audit,
    simulator  : simulator,
    expedition : expedition,
    stats      : stats,

    // Agregados
    getDashboardSummary : getDashboardSummary,

    // Mantenimiento
    cleanupDuplicateMonthRecords : function () { return monthly.cleanupDuplicateMonthRecords(); },

    // P4: Firebase write-through (feature-flagged)
    // setFirebaseSink: llamar desde index.html tras auth exitoso, UNA SOLA VEZ.
    // flushP4Queue:    llamar desde el handler 'online' de index.html.
    setFirebaseSink : function (sink) {
      _p4Sink = sink;
      console.log('[P4] sink registrado — device:', _p4GetDeviceId());
    },
    flushP4Queue      : function () { return _flushP4Queue(); },
    isP4Enabled       : function () { return _isP4Enabled(); },

    // Estado de sync — consumido por el indicador visual en index.html
    syncStatus : function () {
      var queueLen = 0;
      try {
        var k = _p4QueueKey();
        if (k) queueLen = Object.keys(JSON.parse(localStorage.getItem(k) || '{}')).length;
      } catch (e) {}
      return {
        isFlushing  : _isFlushingP4Queue,
        isPulling   : _isPullingFromFirebase,
        pendingOps  : queueLen,
        lastError   : _lastSyncError,
        lastSyncAt  : _lastSyncAt || _p4LoadLastSyncAt()
      };
    },
    clearSyncError : function () { _lastSyncError = null; },

    pullFromFirebase  : function () {
      if (typeof window !== 'undefined' && window.P4Debug && typeof window.P4Debug.pullFromFirebase === 'function') {
        return window.P4Debug.pullFromFirebase();
      }
      return Promise.resolve(null);
    },

    // Expuesto para prueba en consola: decorar un objeto de muestra.
    // PilotPayStore.p4DecorateTest({foo:'bar'}) → {foo:'bar', _schemaVersion:1, …}
    p4DecorateTest : function (obj) { return _p4Decorate(obj || {}); },

    // P4 Fase 3: write-through individual de auditoría.
    // Llamar desde saveAuditRecord() en index.html, después de hstSave() + IDB.
    // Guards internos: flag, _isHydratingFromIDB, record.id y record.userId.
    // No-op si flag apagado — comportamiento idéntico al actual.
    notifyAuditRecord : function (record) {
      if (!_isP4Enabled()) return;
      if (_isHydratingFromIDB) return;
      if (!record || !record.id || !record.userId) {
        console.warn('[P4] notifyAuditRecord: record inválido — ignorado', record);
        return;
      }
      _notifyFirebaseAudit(record);
    },

    // P4: sincronizar borrado de auditoría hacia Firebase + IDB.
    // Llamar desde hstDelete() en index.html tras filtrar localStorage.
    notifyAuditDelete : function (auditId) {
      if (!_isP4Enabled()) return;
      if (!_userId) { console.warn('[P4] notifyAuditDelete: sin usuario activo'); return; }
      if (!auditId) { console.warn('[P4] notifyAuditDelete: auditId requerido'); return; }
      _notifyFirebaseAuditDelete(auditId);
      // IDB: best-effort, no bloquea
      try {
        if (typeof PilotPayLocalDB !== 'undefined' && typeof PilotPayLocalDB.deleteAuditRecord === 'function') {
          PilotPayLocalDB.deleteAuditRecord(auditId).catch(function (e) {
            console.warn('[P4] audit delete IDB failed:', auditId, e && e.message ? e.message : e);
          });
        }
      } catch (e) { /* no-op */ }
    },

    // Internals expuestos para PilotPayDebug y tests — no usar en UI
    _internal : {
      validateMonthRecord    : _validateMonthRecord,
      normalizeMonthRecord   : _normalizeMonthRecord,
      deriveSourceIntegrity  : _deriveSourceIntegrity,
      cloneSnapshot          : _cloneSnapshot,
      setEstado              : _setEstado,
      SCHEMA_VERSION         : SCHEMA_VERSION,
      ENGINE_VERSION         : ENGINE_VERSION,
      CONVENIO_VERSION       : CONVENIO_VERSION,
      ESTADOS_VALIDOS        : ESTADOS_VALIDOS,
      TRANSICIONES_VALIDAS   : TRANSICIONES_VALIDAS
    }
  };

  // ── P4Debug: objeto de inspección temporal — no usar en UI ni lógica de negocio ──
  // Solo para validación en consola. Se puede quitar en Fase 4+ sin impacto.
  window.P4Debug = {
    get writesCount()        { return _p4WriteCount; },
    get monthlyWritesCount() { return _p4MonthlyWriteCount; },
    get auditWritesCount()   { return _p4AuditWriteCount; },
    get lastWritePath()      { return _p4LastPath; },
    get lastAuditPath()      { return _p4LastAuditPath; },
    get pendingQueue()  {
      var k = _p4QueueKey();
      if (!k) return {};
      try { return JSON.parse(localStorage.getItem(k) || '{}'); } catch (e) { return {}; }
    },
    get isEnabled()     { return _isP4Enabled(); },
    get deviceId()      { return _p4GetDeviceId(); },
    reset: function ()  {
      _p4WriteCount        = 0;
      _p4MonthlyWriteCount = 0;
      _p4AuditWriteCount   = 0;
      _p4LastPath          = null;
      _p4LastAuditPath     = null;
      console.log('[P4Debug] contadores de sesión reseteados');
    }
  };

  // ── P4 Fase 4: upload inicial de históricos locales hacia Firebase ───────────
  // Solo para uso manual en consola. Nunca llamar desde UI ni ciclo de vida.

  // Dry-run síncrono: muestra qué se subiría sin escribir nada en Firebase.
  window.P4Debug.dryRunUpload = function () {
    if (!_userId) { console.warn('[P4] dryRunUpload: sin usuario activo'); return null; }
    var mk = _p4ManifestKey();
    var manifest = {};
    try { manifest = JSON.parse(localStorage.getItem(mk) || '{}'); } catch (e) {}

    var auditList = [];
    try { auditList = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
    var monthlyMap = {};
    try { monthlyMap = JSON.parse(localStorage.getItem(_monthlyKey()) || '{}'); } catch (e) {}

    var mPaths = [], mInvalid = 0;
    Object.keys(monthlyMap).forEach(function (key) {
      var mr = monthlyMap[key];
      if (!mr || !mr.year || !mr.month) {
        console.warn('[P4] upload skip: monthly inválido (sin year/month) —', key);
        mInvalid++;
        return;
      }
      mPaths.push('pilotpay/historicos/' + _userId + '/monthly/' + mr.year + '_' + mr.month);
    });

    var aPaths = [], aInvalid = 0;
    auditList.forEach(function (rec) {
      if (!rec || !rec.id || !rec.userId) {
        console.warn('[P4] upload skip: audit inválido (sin id/userId) —', rec && rec.id);
        aInvalid++;
        return;
      }
      aPaths.push('pilotpay/historicos/' + rec.userId + '/auditorias/' + rec.id);
    });

    var mUploaded = mPaths.filter(function (p) { return !!manifest[p]; });
    var mPending  = mPaths.filter(function (p) { return !manifest[p]; });
    var aUploaded = aPaths.filter(function (p) { return !!manifest[p]; });
    var aPending  = aPaths.filter(function (p) { return !manifest[p]; });

    var result = {
      userId  : _userId,
      monthly : { total: mPaths.length, invalid: mInvalid, alreadyUploaded: mUploaded.length, pending: mPending.length, paths: mPending },
      audit   : { total: aPaths.length, invalid: aInvalid, alreadyUploaded: aUploaded.length, pending: aPending.length, paths: aPending }
    };
    console.log('[P4] dryRunUpload →',
      'monthly:', result.monthly.pending + '/' + result.monthly.total, 'pendientes |',
      'audit:',   result.audit.pending   + '/' + result.audit.total,   'pendientes |',
      'inválidos:', mInvalid + aInvalid
    );
    return result;
  };

  // Upload secuencial write-only hacia Firebase. localStorage/IDB no se tocan.
  // force:false (default) → skip paths ya en manifest.
  // force:true → re-sube todo ignorando manifest (PATCH idempotente, seguro).
  window.P4Debug.uploadLocalToFirebase = async function (opts) {
    opts = opts || {};
    var force = opts.force === true;

    if (!_isP4Enabled()) {
      console.warn('[P4] uploadLocalToFirebase: flag desactivado — activar con localStorage.setItem("pilotpay_p4_enabled","1")');
      return null;
    }
    if (!_p4Sink || typeof _p4Sink.update !== 'function') {
      console.warn('[P4] uploadLocalToFirebase: sink no registrado — la app debe estar iniciada con sesión activa');
      return null;
    }
    if (!_userId) {
      console.warn('[P4] uploadLocalToFirebase: sin usuario activo');
      return null;
    }

    var mk = _p4ManifestKey();
    var manifest = {};
    try { manifest = JSON.parse(localStorage.getItem(mk) || '{}'); } catch (e) {}

    var auditList = [];
    try { auditList = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
    var monthlyMap = {};
    try { monthlyMap = JSON.parse(localStorage.getItem(_monthlyKey()) || '{}'); } catch (e) {}

    // Construir work lists con validación dura
    var monthlyWork = [];
    Object.keys(monthlyMap).forEach(function (key) {
      var mr = monthlyMap[key];
      if (!mr || !mr.year || !mr.month) {
        console.warn('[P4] upload skip: monthly inválido (sin year/month) —', key);
        return;
      }
      monthlyWork.push({
        fbPath : 'pilotpay/historicos/' + _userId + '/monthly/' + mr.year + '_' + mr.month,
        record : mr
      });
    });

    var auditWork = [];
    auditList.forEach(function (rec) {
      if (!rec || !rec.id || !rec.userId) {
        console.warn('[P4] upload skip: audit inválido (sin id/userId) —', rec && rec.id);
        return;
      }
      auditWork.push({
        fbPath : 'pilotpay/historicos/' + rec.userId + '/auditorias/' + rec.id,
        record : rec
      });
    });

    // Calcular skip count para el log inicial
    var mSkip = !force ? monthlyWork.filter(function (e) { return !!manifest[e.fbPath]; }).length : 0;
    var aSkip = !force ? auditWork.filter(function (e)   { return !!manifest[e.fbPath]; }).length : 0;
    var totalAttempted = (monthlyWork.length - mSkip) + (auditWork.length - aSkip);

    console.log('[P4] upload start — monthly:', monthlyWork.length,
                '| audit:', auditWork.length,
                '| skip:', mSkip + aSkip,
                '| a escribir:', totalAttempted,
                force ? '[force=true]' : '');

    var done = 0, failed = 0, skipped = 0;
    var failedPaths = [];

    // Monthly — secuencial
    for (var i = 0; i < monthlyWork.length; i++) {
      var me = monthlyWork[i];
      if (!force && manifest[me.fbPath]) {
        skipped++;
        console.log('[P4] upload skip monthly:', me.fbPath);
        continue;
      }
      try {
        await _p4Sink.update(me.fbPath, _p4DecorateUpload(me.record));
        done++;
        try {
          var cur = JSON.parse(localStorage.getItem(mk) || '{}');
          cur[me.fbPath] = new Date().toISOString();
          localStorage.setItem(mk, JSON.stringify(cur));
        } catch (_e) {}
        console.log('[P4] upload monthly (' + done + '/' + totalAttempted + '):', me.fbPath);
      } catch (err) {
        failed++;
        failedPaths.push(me.fbPath);
        console.warn('[P4] upload fail monthly:', me.fbPath, '—', err && err.message ? err.message : err);
      }
    }

    // Audit — secuencial
    for (var j = 0; j < auditWork.length; j++) {
      var ae = auditWork[j];
      if (!force && manifest[ae.fbPath]) {
        skipped++;
        console.log('[P4] upload skip audit:', ae.fbPath);
        continue;
      }
      try {
        await _p4Sink.update(ae.fbPath, _p4DecorateUpload(ae.record));
        done++;
        try {
          var acur = JSON.parse(localStorage.getItem(mk) || '{}');
          acur[ae.fbPath] = new Date().toISOString();
          localStorage.setItem(mk, JSON.stringify(acur));
        } catch (_e) {}
        console.log('[P4] upload audit (' + done + '/' + totalAttempted + '):', ae.fbPath);
      } catch (err) {
        failed++;
        failedPaths.push(ae.fbPath);
        console.warn('[P4] upload fail audit:', ae.fbPath, '—', err && err.message ? err.message : err);
      }
    }

    console.log('[P4] upload complete — done:', done,
                '| failed:', failed,
                '| skipped:', skipped,
                '| total registros:', monthlyWork.length + auditWork.length);
    if (failedPaths.length > 0) {
      console.warn('[P4] paths con fallo (reintentables en próxima ejecución):', failedPaths);
    }
    return { done: done, failed: failed, skipped: skipped, total: monthlyWork.length + auditWork.length, failedPaths: failedPaths };
  };

  // Muestra el manifest de uploads completados.
  window.P4Debug.showUploadManifest = function () {
    var mk = _p4ManifestKey();
    if (!mk) { console.warn('[P4] showUploadManifest: sin usuario activo'); return null; }
    var manifest = {};
    try { manifest = JSON.parse(localStorage.getItem(mk) || '{}'); } catch (e) {}
    var paths = Object.keys(manifest);
    console.log('[P4] upload manifest —', paths.length, 'path(s) subido(s):');
    paths.forEach(function (p) { console.log('  ', p, '→', manifest[p]); });
    return manifest;
  };

  // Limpia el manifest — permite re-ejecutar el upload completo desde cero.
  // Los datos en Firebase NO se borran; solo se olvida qué se subió.
  window.P4Debug.clearUploadManifest = function () {
    var mk = _p4ManifestKey();
    if (!mk) { console.warn('[P4] clearUploadManifest: sin usuario activo'); return; }
    try { localStorage.removeItem(mk); } catch (e) {}
    console.log('[P4] upload manifest limpiado — próxima ejecución re-subirá todos los registros');
  };

  // ── P4 Fase 5: lectura híbrida Firebase → local ──────────────────────────────
  // Sin hook automático en esta fase — solo manual desde consola.
  // Requiere sink.get (añadido en index.html). Sin writes hacia Firebase.

  Object.defineProperty(window.P4Debug, 'isPulling', {
    get: function () { return _isPullingFromFirebase; },
    enumerable: true
  });

  // Dry-run async: lee Firebase, calcula el merge, sin escribir localmente.
  window.P4Debug.dryRunPullFromFirebase = async function () {
    if (!_userId)        { console.warn('[P4] dryRunPull: sin usuario activo'); return null; }
    if (!_isP4Enabled()) { console.warn('[P4] dryRunPull: flag desactivado'); return null; }
    if (!_p4Sink || typeof _p4Sink.get !== 'function') {
      console.warn('[P4] dryRunPull: sink.get no disponible — añadir método get al sink en index.html');
      return null;
    }

    // Leer estado local
    var localMonthly = {};
    try { localMonthly = JSON.parse(localStorage.getItem(_monthlyKey()) || '{}'); } catch (e) {}
    var localAudit = [];
    try { localAudit = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
    var localAuditIndex = {};
    localAudit.forEach(function (r) { if (r && r.id) localAuditIndex[r.id] = r; });

    // Leer desde Firebase en paralelo
    var fbMonthly = null, fbAudit = null;
    try {
      var res = await Promise.all([
        _p4Sink.get('pilotpay/historicos/' + _userId + '/monthly'),
        _p4Sink.get('pilotpay/historicos/' + _userId + '/auditorias')
      ]);
      fbMonthly = res[0];
      fbAudit   = res[1];
    } catch (err) {
      console.warn('[P4] dryRunPull: error leyendo Firebase —', err && err.message ? err.message : err);
      return null;
    }

    // Calcular diff monthly
    var mNew = 0, mUpdated = 0, mUnchanged = 0, mInvalid = 0;
    if (fbMonthly) {
      Object.keys(fbMonthly).forEach(function (fbKey) {
        var fbRec = fbMonthly[fbKey];
        if (!fbRec || !fbRec.year || !fbRec.month) { mInvalid++; return; }
        var localKey = fbRec.year + ':' + fbRec.month;
        var localRec = localMonthly[localKey];
        if (!localRec) {
          mNew++;
        } else {
          var fbMs    = _parseTs(fbRec._updatedAt);
          var localMs = _parseTs(localRec._updatedAt);
          if (fbMs > localMs) mUpdated++; else mUnchanged++;
        }
      });
    }

    // Calcular diff audit
    var aNew = 0, aUpdated = 0, aUnchanged = 0, aInvalid = 0;
    if (fbAudit) {
      Object.keys(fbAudit).forEach(function (fbId) {
        var fbRec = fbAudit[fbId];
        if (!fbRec || !fbRec.id || !fbRec.userId) { aInvalid++; return; }
        var localRec = localAuditIndex[fbId];
        if (!localRec) {
          aNew++;
        } else {
          var fbMs    = _parseTs(fbRec._updatedAt);
          var localMs = _parseTs(localRec._updatedAt);
          if (fbMs > localMs) aUpdated++; else aUnchanged++;
        }
      });
    }

    var result = {
      userId  : _userId,
      firebase: {
        monthly : fbMonthly ? Object.keys(fbMonthly).length : 0,
        audit   : fbAudit   ? Object.keys(fbAudit).length   : 0
      },
      merge: {
        monthly : { new: mNew, updated: mUpdated, unchanged: mUnchanged, invalid: mInvalid },
        audit   : { new: aNew, updated: aUpdated, unchanged: aUnchanged, invalid: aInvalid }
      }
    };
    console.log('[P4] dryRunPull →',
      'monthly: +' + mNew + ' nuevos ~' + mUpdated + ' actualizados =' + mUnchanged + ' iguales |',
      'audit: +' + aNew + ' nuevos ~' + aUpdated + ' actualizados =' + aUnchanged + ' iguales'
    );
    return result;
  };

  // Pull real: lee Firebase, mergea conservadoramente, escribe local.
  // Guard anti-concurrencia: ignora llamadas si ya hay un pull en curso.
  // NUNCA dispara write-through hacia Firebase (escribe directo a localStorage/IDB).
  window.P4Debug.pullFromFirebase = async function () {
    if (_isPullingFromFirebase) {
      console.warn('[P4] pull: operación ya en curso — ignorado');
      return null;
    }
    if (!_userId)        { console.warn('[P4] pull: sin usuario activo'); return null; }
    if (!_isP4Enabled()) { console.warn('[P4] pull: flag desactivado'); return null; }
    if (!_p4Sink || typeof _p4Sink.get !== 'function') {
      console.warn('[P4] pull: sink.get no disponible');
      return null;
    }

    _isPullingFromFirebase = true;

    try {
      console.log('[P4] pull start: leyendo Firebase monthly + auditorías + tombstones para', _userId);

      // Leer Firebase en paralelo: monthly, auditorías y tombstones
      var fbMonthly = null, fbAudit = null, fbTombstones = null;
      try {
        var res = await Promise.all([
          _p4Sink.get('pilotpay/historicos/' + _userId + '/monthly'),
          _p4Sink.get('pilotpay/historicos/' + _userId + '/auditorias'),
          _p4Sink.get('pilotpay/historicos/' + _userId + '/deletedAuditorias')
        ]);
        fbMonthly    = res[0];
        fbAudit      = res[1];
        fbTombstones = res[2] || {};   // null → vacío, no rompe
      } catch (err) {
        console.warn('[P4] pull: error leyendo Firebase —', err && err.message ? err.message : err);
        return null;
      }

      var tombstoneCount = Object.keys(fbTombstones).length;
      if (tombstoneCount > 0) console.log('[P4] pull tombstones detectados:', tombstoneCount);

      if (!fbMonthly && !fbAudit) {
        console.log('[P4] pull: Firebase sin datos para', _userId, '— sin cambios locales');
        return { monthly: { new: 0, updated: 0, unchanged: 0, invalid: 0 },
                 audit  : { new: 0, updated: 0, unchanged: 0, invalid: 0 },
                 tombstonesApplied: 0, backupSaved: false };
      }

      // Leer estado local actual
      var localMonthly = {};
      try { localMonthly = JSON.parse(localStorage.getItem(_monthlyKey()) || '{}'); } catch (e) {}
      var localAudit = [];
      try { localAudit = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}

      // Guardar backup ANTES de cualquier modificación (para rollback)
      var _bkMk = 'pilotpay:' + _userId + ':p4_pull_backup_monthly';
      var _bkAk = 'pilotpay:' + _userId + ':p4_pull_backup_audit';
      var _bkTk = 'pilotpay:' + _userId + ':p4_pull_backup_ts';
      var backupSaved = false;
      try {
        localStorage.setItem(_bkMk, localStorage.getItem(_monthlyKey()) || '{}');
        localStorage.setItem(_bkAk, localStorage.getItem(_auditKey())   || '[]');
        localStorage.setItem(_bkTk, new Date().toISOString());
        backupSaved = true;
      } catch (e) { console.warn('[P4] pull: backup no guardado —', e.message); }

      // ── Merge monthly ──────────────────────────────────────────────────────
      var mergedMonthly = Object.assign({}, localMonthly);
      var mNew = 0, mUpdated = 0, mUnchanged = 0, mInvalid = 0;
      var mChanged = [];   // solo los nuevos/actualizados → IDB batch

      if (fbMonthly) {
        Object.keys(fbMonthly).forEach(function (fbKey) {
          var fbRec = fbMonthly[fbKey];
          if (!fbRec || !fbRec.year || !fbRec.month) {
            console.warn('[P4] pull skip: monthly inválido en Firebase —', fbKey);
            mInvalid++; return;
          }
          var fbClean  = _stripFbMeta(fbRec);
          var localKey = fbRec.year + ':' + fbRec.month;
          var localRec = mergedMonthly[localKey];

          if (!localRec) {
            mergedMonthly[localKey] = fbClean;
            mChanged.push(fbClean);
            mNew++;
            console.log('[P4] pull monthly nuevo:', localKey);
          } else {
            var fbMs    = _parseTs(fbClean._updatedAt);
            var localMs = _parseTs(localRec._updatedAt);
            if (fbMs > localMs) {
              mergedMonthly[localKey] = fbClean;
              mChanged.push(fbClean);
              mUpdated++;
              console.log('[P4] pull monthly actualizado:', localKey,
                          '(fb=' + fbClean._updatedAt + ' > local=' + localRec._updatedAt + ')');
            } else {
              mUnchanged++;
            }
          }
        });
      }

      // ── Merge audit (tombstone-aware) ──────────────────────────────────────
      var localAuditIndex = {};
      localAudit.forEach(function (r) { if (r && r.id) localAuditIndex[r.id] = r; });
      var aNew = 0, aUpdated = 0, aUnchanged = 0, aInvalid = 0;
      var aChanged = [];   // solo los nuevos/actualizados → IDB batch
      var aTombstoned = 0;
      var idbDeleteIds = [];  // IDs a eliminar de IDB por tombstone

      if (fbAudit) {
        Object.keys(fbAudit).forEach(function (fbId) {
          // Tombstone remoto gana incondicionalmente — auditorías son append-only
          if (fbTombstones[fbId]) {
            console.log('[P4] pull skip: audit con tombstone remoto —', fbId);
            aTombstoned++; return;
          }
          var fbRec = fbAudit[fbId];
          if (!fbRec || !fbRec.id || !fbRec.userId) {
            console.warn('[P4] pull skip: audit inválido en Firebase —', fbId);
            aInvalid++; return;
          }
          var fbClean  = _stripFbMeta(fbRec);
          var localRec = localAuditIndex[fbId];

          if (!localRec) {
            localAuditIndex[fbId] = fbClean;
            aChanged.push(fbClean);
            aNew++;
            console.log('[P4] pull audit nuevo:', fbId);
          } else {
            var fbMs    = _parseTs(fbClean._updatedAt);
            var localMs = _parseTs(localRec._updatedAt);
            if (fbMs > localMs) {
              localAuditIndex[fbId] = fbClean;
              aChanged.push(fbClean);
              aUpdated++;
              console.log('[P4] pull audit actualizado:', fbId);
            } else {
              aUnchanged++;
            }
          }
        });
      }

      // Aplicar tombstones remotos a registros locales (borrar lo que no llegó como delete)
      Object.keys(fbTombstones).forEach(function (tsId) {
        if (localAuditIndex[tsId]) {
          console.log('[P4] pull tombstone aplicado a local:', tsId);
          delete localAuditIndex[tsId];
          idbDeleteIds.push(tsId);
          aTombstoned++;
        }
      });

      if (aTombstoned > 0) console.log('[P4] pull tombstones aplicados total:', aTombstoned);

      // Reconstruir array audit: sort desc por fechaAuditoria, trim MAX 100
      var mergedAudit = Object.values(localAuditIndex)
        .sort(function (a, b) {
          return (b.fechaAuditoria || '').localeCompare(a.fechaAuditoria || '');
        })
        .slice(0, 100);

      console.log('[P4] pull monthly:', Object.keys(fbMonthly || {}).length, 'en Firebase —',
                  '+' + mNew, 'nuevos,', '~' + mUpdated, 'actualizados,', '=' + mUnchanged, 'iguales');
      console.log('[P4] pull audit:',   Object.keys(fbAudit   || {}).length, 'en Firebase —',
                  '+' + aNew, 'nuevos,', '~' + aUpdated, 'actualizados,', '=' + aUnchanged, 'iguales');

      // ── Write localStorage (directo — NO via _saveMonthly → no dispara P4) ─
      var wroteMonthly = false, wroteAudit = false;
      if (mChanged.length > 0) {
        try {
          localStorage.setItem(_monthlyKey(), JSON.stringify(mergedMonthly));
          wroteMonthly = true;
          console.log('[P4] pull write: monthly_v1 →', Object.keys(mergedMonthly).length, 'registros');
        } catch (e) { console.warn('[P4] pull: error escribiendo monthly_v1 —', e.message); }
      }
      if (aChanged.length > 0 || idbDeleteIds.length > 0) {
        try {
          localStorage.setItem(_auditKey(), JSON.stringify(mergedAudit));
          wroteAudit = true;
          console.log('[P4] pull write: audit_history_v1 →', mergedAudit.length, 'registros');
        } catch (e) { console.warn('[P4] pull: error escribiendo audit_history_v1 —', e.message); }
      }

      // ── Write IDB (batch, best-effort — solo registros nuevos/actualizados) ─
      if (typeof PilotPayLocalDB !== 'undefined') {
        if (mChanged.length > 0) {
          PilotPayLocalDB.putManyMonthlyRecords(mChanged)
            .then(function (n) { console.log('[P4] pull IDB monthly:', n, 'registro(s)'); })
            .catch(function (e) { console.warn('[P4] pull IDB monthly (best-effort):', e && e.message); });
        }
        if (aChanged.length > 0) {
          PilotPayLocalDB.putManyAuditRecords(aChanged)
            .then(function (n) { console.log('[P4] pull IDB audit put:', n, 'registro(s)'); })
            .catch(function (e) { console.warn('[P4] pull IDB audit put (best-effort):', e && e.message); });
        }
        // Borrar de IDB los registros eliminados por tombstone
        if (idbDeleteIds.length > 0 && typeof PilotPayLocalDB.deleteAuditRecord === 'function') {
          idbDeleteIds.forEach(function (delId) {
            PilotPayLocalDB.deleteAuditRecord(delId)
              .then(function () { console.log('[P4] pull IDB audit delete (tombstone):', delId); })
              .catch(function (e) { console.warn('[P4] pull IDB audit delete (best-effort):', delId, e && e.message); });
          });
        }
      }

      // ── Reload in-memory mínimo: sin _hydrateMonthly, sin side-effects ────
      // Actualiza _monthly/_audit para que el store refleje el estado merged.
      // No llama _saveMonthly() → no dispara write-through hacia Firebase.
      if (wroteMonthly || wroteAudit) {
        var newAuditList = [];
        try { newAuditList = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
        _audit   = newAuditList;
        var load = _loadMonthly();
        _monthly = load.data;
        console.log('[P4] pull in-memory reload: monthly=' + Object.keys(_monthly).length +
                    ' | audit=' + _audit.length);
      }

      console.log('[P4] pull complete — monthly: +' + mNew + ' ~' + mUpdated + ' =' + mUnchanged +
                  ' | audit: +' + aNew + ' ~' + aUpdated + ' =' + aUnchanged +
                  ' | tombstones: ' + aTombstoned +
                  (backupSaved ? ' | backup guardado' : ''));

      var ret = {
        monthly           : { new: mNew, updated: mUpdated, unchanged: mUnchanged, invalid: mInvalid },
        audit             : { new: aNew, updated: aUpdated, unchanged: aUnchanged, invalid: aInvalid },
        tombstonesApplied : aTombstoned,
        backupSaved       : backupSaved
      };

      // Pull OK → registrar como sync exitoso
      _lastSyncAt    = new Date().toISOString();
      _lastSyncError = null;
      _p4SaveLastSyncAt();
      return ret;

    } catch (e) {
      _lastSyncError = e && e.message ? e.message : String(e);
      throw e;
    } finally {
      _isPullingFromFirebase = false;
    }
  };

  // Rollback al estado pre-pull: restaura localStorage + IDB desde backup.
  // Solo hay un nivel de rollback (el backup se elimina al usarlo).
  window.P4Debug.rollbackPull = function () {
    if (!_userId) { console.warn('[P4] rollbackPull: sin usuario activo'); return false; }
    var _bkMk = 'pilotpay:' + _userId + ':p4_pull_backup_monthly';
    var _bkAk = 'pilotpay:' + _userId + ':p4_pull_backup_audit';
    var _bkTk = 'pilotpay:' + _userId + ':p4_pull_backup_ts';

    var backupTs = null;
    try { backupTs = localStorage.getItem(_bkTk); } catch (e) {}
    if (!backupTs) { console.warn('[P4] rollbackPull: sin backup disponible'); return false; }

    var backupMonthly = null, backupAudit = null;
    try { backupMonthly = localStorage.getItem(_bkMk); } catch (e) {}
    try { backupAudit   = localStorage.getItem(_bkAk); } catch (e) {}
    if (!backupMonthly || !backupAudit) {
      console.warn('[P4] rollbackPull: backup incompleto — abortando');
      return false;
    }

    // Restaurar localStorage
    try {
      localStorage.setItem(_monthlyKey(), backupMonthly);
      localStorage.setItem(_auditKey(),   backupAudit);
    } catch (e) {
      console.warn('[P4] rollbackPull: error restaurando localStorage —', e.message);
      return false;
    }

    // Restaurar IDB desde el backup (batch, best-effort)
    if (typeof PilotPayLocalDB !== 'undefined') {
      var mData = {}, aData = [];
      try { mData = JSON.parse(backupMonthly); } catch (e) {}
      try { aData = JSON.parse(backupAudit);   } catch (e) {}
      var mRecs = Object.values(mData).filter(function (r) { return r && r.id; });
      var aRecs = aData.filter(function (r) { return r && r.id; });
      if (mRecs.length) PilotPayLocalDB.putManyMonthlyRecords(mRecs).catch(function () {});
      if (aRecs.length) PilotPayLocalDB.putManyAuditRecords(aRecs).catch(function () {});
    }

    // Reload in-memory mínimo desde backup restaurado
    var newAuditList = [];
    try { newAuditList = JSON.parse(backupAudit); } catch (e) {}
    _audit   = newAuditList;
    var load = _loadMonthly();
    _monthly = load.data;

    // Eliminar backup (un solo nivel de rollback)
    try {
      localStorage.removeItem(_bkMk);
      localStorage.removeItem(_bkAk);
      localStorage.removeItem(_bkTk);
    } catch (e) {}

    console.log('[P4] rollbackPull: estado restaurado al de', backupTs,
                '| monthly=' + Object.keys(_monthly).length + ' | audit=' + _audit.length);
    return true;
  };

  // Borra manualmente una auditoría de Firebase (consola — testing).
  // Uso: P4Debug.deleteAuditFromFirebase('audit-id-aqui')
  window.P4Debug.deleteAuditFromFirebase = function (auditId) {
    if (!auditId) { console.warn('[P4] deleteAuditFromFirebase: auditId requerido'); return; }
    if (!_isP4Enabled()) { console.warn('[P4] deleteAuditFromFirebase: flag desactivado'); return; }
    if (!_userId) { console.warn('[P4] deleteAuditFromFirebase: sin usuario activo'); return; }
    _notifyFirebaseAuditDelete(auditId);
  };

  // ── Diagnóstico: IDs de auditorías en localStorage ──────────────────────
  // Uso: P4Debug.listLocalAuditIds()
  window.P4Debug.listLocalAuditIds = function () {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
    var ids = list.map(function (r) { return r && r.id; }).filter(Boolean);
    console.log('[P4] listLocalAuditIds (' + ids.length + '):', ids);
    return ids;
  };

  // ── Diagnóstico: IDs de auditorías en Firebase ───────────────────────────
  // Uso: await P4Debug.listFirebaseAuditIds()
  window.P4Debug.listFirebaseAuditIds = async function () {
    if (!_isP4Enabled()) { console.warn('[P4] listFirebaseAuditIds: flag desactivado'); return []; }
    if (!_userId)        { console.warn('[P4] listFirebaseAuditIds: sin usuario activo'); return []; }
    if (!_p4Sink || typeof _p4Sink.get !== 'function') { console.warn('[P4] listFirebaseAuditIds: sin sink'); return []; }
    try {
      var data = await _p4Sink.get('pilotpay/historicos/' + _userId + '/auditorias');
      var ids = data ? Object.keys(data) : [];
      console.log('[P4] listFirebaseAuditIds (' + ids.length + '):', ids);
      return ids;
    } catch (e) {
      console.warn('[P4] listFirebaseAuditIds error:', e && e.message ? e.message : e);
      return [];
    }
  };

  // ── Diagnóstico: IDs con tombstone en Firebase ───────────────────────────
  // Uso: await P4Debug.listTombstoneIds()
  window.P4Debug.listTombstoneIds = async function () {
    if (!_isP4Enabled()) { console.warn('[P4] listTombstoneIds: flag desactivado'); return []; }
    if (!_userId)        { console.warn('[P4] listTombstoneIds: sin usuario activo'); return []; }
    if (!_p4Sink || typeof _p4Sink.get !== 'function') { console.warn('[P4] listTombstoneIds: sin sink'); return []; }
    try {
      var data = await _p4Sink.get('pilotpay/historicos/' + _userId + '/deletedAuditorias');
      var ids = data ? Object.keys(data) : [];
      console.log('[P4] listTombstoneIds (' + ids.length + '):', ids);
      return ids;
    } catch (e) {
      console.warn('[P4] listTombstoneIds error:', e && e.message ? e.message : e);
      return [];
    }
  };

  // ── Diagnóstico: diff completo local vs Firebase ──────────────────────────
  // Uso: await P4Debug.diffAuditSync()
  // Devuelve: { localOnly, firebaseOnly, inSync, localWithTombstone, tombstonedNotLocal }
  window.P4Debug.diffAuditSync = async function () {
    if (!_isP4Enabled()) { console.warn('[P4] diffAuditSync: flag desactivado'); return null; }
    if (!_userId)        { console.warn('[P4] diffAuditSync: sin usuario activo'); return null; }
    if (!_p4Sink || typeof _p4Sink.get !== 'function') { console.warn('[P4] diffAuditSync: sin sink'); return null; }

    var localList = [];
    try { localList = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
    var localIds = {};
    localList.forEach(function (r) { if (r && r.id) localIds[r.id] = true; });

    var fbAuditData, fbTsData;
    try {
      var res = await Promise.all([
        _p4Sink.get('pilotpay/historicos/' + _userId + '/auditorias'),
        _p4Sink.get('pilotpay/historicos/' + _userId + '/deletedAuditorias')
      ]);
      fbAuditData = res[0] || {};
      fbTsData    = res[1] || {};
    } catch (e) {
      console.warn('[P4] diffAuditSync: error leyendo Firebase —', e && e.message ? e.message : e);
      return null;
    }

    var fbIds = Object.keys(fbAuditData);
    var tsIds = Object.keys(fbTsData);

    var result = {
      localOnly          : [],   // en local, NO en Firebase, NO tombstone → candidatos a subir
      firebaseOnly       : [],   // en Firebase, NO en local, NO tombstone → candidatos a bajar
      inSync             : [],   // en ambos
      localWithTombstone : [],   // en local PERO tienen tombstone → deben borrarse de local
      tombstonedNotLocal : []    // tombstone existe pero ya no están en local (OK, limpio)
    };

    Object.keys(localIds).forEach(function (id) {
      if (fbTsData[id])       result.localWithTombstone.push(id);
      else if (fbAuditData[id]) result.inSync.push(id);
      else                    result.localOnly.push(id);
    });

    fbIds.forEach(function (id) {
      if (!localIds[id] && !fbTsData[id]) result.firebaseOnly.push(id);
    });

    tsIds.forEach(function (id) {
      if (!localIds[id]) result.tombstonedNotLocal.push(id);
    });

    console.log('[P4] diffAuditSync resultado:', result);
    console.log('  localOnly (' + result.localOnly.length + '):', result.localOnly);
    console.log('  firebaseOnly (' + result.firebaseOnly.length + '):', result.firebaseOnly);
    console.log('  inSync (' + result.inSync.length + '):', result.inSync);
    console.log('  localWithTombstone (' + result.localWithTombstone.length + ') → tombstoneAudit(id) recomendado:', result.localWithTombstone);
    console.log('  tombstonedNotLocal (' + result.tombstonedNotLocal.length + ') (ya limpio):', result.tombstonedNotLocal);
    return result;
  };

  // ── Cleanup: crear tombstone + limpiar localmente (era pre-tombstone) ─────
  // Uso: await P4Debug.tombstoneAudit('audit-id-aqui')
  // Para auditorías que fueron borradas antes de que existiesen tombstones.
  window.P4Debug.tombstoneAudit = async function (auditId) {
    if (!auditId) { console.warn('[P4] tombstoneAudit: auditId requerido'); return false; }
    if (!_userId) { console.warn('[P4] tombstoneAudit: sin usuario activo'); return false; }
    if (!_isP4Enabled()) { console.warn('[P4] tombstoneAudit: flag desactivado'); return false; }
    if (!_p4Sink || typeof _p4Sink.update !== 'function') { console.warn('[P4] tombstoneAudit: sin sink'); return false; }

    // 1. Escribir tombstone en Firebase
    var tombstonePath = 'pilotpay/historicos/' + _userId + '/deletedAuditorias/' + auditId;
    var tombstone = {
      id              : auditId,
      deletedAt       : new Date().toISOString(),
      deletedByDevice : _p4GetDeviceId(),
      _schemaVersion  : 1
    };
    try {
      await _p4Sink.update(tombstonePath, tombstone);
      console.log('[P4] tombstoneAudit: tombstone creado para', auditId);
    } catch (e) {
      console.warn('[P4] tombstoneAudit: error escribiendo tombstone —', e && e.message ? e.message : e);
      return false;
    }

    // 2. Eliminar de localStorage
    var list = [];
    try { list = JSON.parse(localStorage.getItem(_auditKey()) || '[]'); } catch (e) {}
    var filtered = list.filter(function (r) { return r.id !== auditId; });
    if (filtered.length < list.length) {
      try { localStorage.setItem(_auditKey(), JSON.stringify(filtered)); } catch (e) {}
      _audit = filtered;
      console.log('[P4] tombstoneAudit: eliminado de localStorage', auditId);
    } else {
      console.log('[P4] tombstoneAudit: no estaba en localStorage', auditId);
    }

    // 3. Eliminar de IDB (best-effort)
    if (typeof PilotPayLocalDB !== 'undefined' && typeof PilotPayLocalDB.deleteAuditRecord === 'function') {
      PilotPayLocalDB.deleteAuditRecord(auditId)
        .then(function () { console.log('[P4] tombstoneAudit: eliminado de IDB', auditId); })
        .catch(function (e) { console.warn('[P4] tombstoneAudit: IDB delete failed', auditId, e && e.message ? e.message : e); });
    }

    // 4. Borrar nodo Firebase si aún existe (era pre-tombstone, puede quedar huérfano)
    var auditPath = 'pilotpay/historicos/' + _userId + '/auditorias/' + auditId;
    _p4Sink.update(auditPath, null).catch(function () {});

    console.log('[P4] tombstoneAudit: completado para', auditId);
    return true;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DEBUG/ADMIN — nukeAudits: reset limpio de todas las auditorías
  // Eliminar este bloque completo (hasta el cierre ══) cuando ya no sea necesario.
  //
  // Uso:
  //   P4Debug.nukeAudits()                → dry-run (solo muestra qué borraría)
  //   P4Debug.nukeAudits({ confirm:true }) → ejecuta el borrado real
  // ══════════════════════════════════════════════════════════════════════════
  window.P4Debug.nukeAudits = async function (opts) {
    opts = opts || {};
    var dryRun = opts.confirm !== true;

    if (!_userId) {
      console.warn('[P4] nukeAudits: sin usuario activo — inicia sesión primero');
      return null;
    }

    var auditFbPath     = 'pilotpay/historicos/' + _userId + '/auditorias';
    var tombstoneFbPath = 'pilotpay/historicos/' + _userId + '/deletedAuditorias';
    var auditLsKey      = _auditKey();        // pilotpay:{userId}:audit_history_v1
    var p4QueueLsKey    = _p4QueueKey();      // pilotpay:{userId}:p4_queue
    var bkAuditLsKey    = 'pilotpay:' + _userId + ':p4_pull_backup_audit';
    var bkTsLsKey       = 'pilotpay:' + _userId + ':p4_pull_backup_ts';

    // ── Dry-run: contar qué hay ────────────────────────────────────────────
    var localAuditCount = 0;
    try { localAuditCount = JSON.parse(localStorage.getItem(auditLsKey) || '[]').length; } catch (e) {}

    var p4QueueAuditEntries = 0;
    if (p4QueueLsKey) {
      try {
        var q = JSON.parse(localStorage.getItem(p4QueueLsKey) || '{}');
        Object.keys(q).forEach(function (k) {
          if (k.indexOf('/auditorias/') !== -1 || k.indexOf('/deletedAuditorias/') !== -1) p4QueueAuditEntries++;
        });
      } catch (e) {}
    }

    var fbAuditCount     = '(no leído — sin sink o P4 desactivado)';
    var fbTombstoneCount = '(no leído — sin sink o P4 desactivado)';
    if (_p4Sink && typeof _p4Sink.get === 'function') {
      try { var fa = await _p4Sink.get(auditFbPath);     fbAuditCount     = fa ? Object.keys(fa).length : 0; } catch (e) { fbAuditCount     = 'error: ' + (e.message || e); }
      try { var ft = await _p4Sink.get(tombstoneFbPath); fbTombstoneCount = ft ? Object.keys(ft).length : 0; } catch (e) { fbTombstoneCount = 'error: ' + (e.message || e); }
    }

    console.log('══════════════════════════════════════════════════════════');
    console.log('[P4] nukeAudits' + (dryRun ? ' — DRY RUN (sin cambios)' : ' — EJECUCIÓN REAL'));
    console.log('  userId activo:', _userId);
    console.log('');
    console.log('  FIREBASE (DELETE nodo completo):');
    console.log('    ' + auditFbPath, '→', fbAuditCount, 'registros');
    console.log('    ' + tombstoneFbPath, '→', fbTombstoneCount, 'tombstones');
    console.log('');
    console.log('  LOCALSTORAGE (remove):');
    console.log('    ' + auditLsKey, '→', localAuditCount, 'registros');
    console.log('    ' + p4QueueLsKey + ' (filtro)', '→', p4QueueAuditEntries, 'entradas audit/tombstone (resto intacto)');
    console.log('    ' + bkAuditLsKey, '→ backup audit del último pull');
    console.log('    ' + bkTsLsKey,    '→ timestamp del backup');
    console.log('');
    console.log('  IDB auditHistory: todos los registros del usuario', _userId);
    console.log('');
    console.log('  NO SE TOCA: monthly_v1, p4_pull_backup_monthly, monthly Firebase,');
    console.log('              offline_queue, usuarios, avatares, configuración, IRPF');
    console.log('══════════════════════════════════════════════════════════');

    if (dryRun) {
      console.log('[P4] nukeAudits: para ejecutar → P4Debug.nukeAudits({ confirm: true })');
      return {
        dryRun          : true,
        userId          : _userId,
        fbAudits        : fbAuditCount,
        fbTombstones    : fbTombstoneCount,
        localAudits     : localAuditCount,
        p4QueueAudits   : p4QueueAuditEntries
      };
    }

    // ── Ejecución real ─────────────────────────────────────────────────────
    console.log('[P4] nukeAudits: ejecutando…');
    var errors = [];

    // 1. Firebase: borrar nodo auditorias
    if (_p4Sink && typeof _p4Sink.update === 'function') {
      try {
        await _p4Sink.update(auditFbPath, null);
        console.log('[P4] nukeAudits: ✓ Firebase auditorias borrado');
      } catch (e) {
        var msg1 = e && e.message ? e.message : String(e);
        errors.push('Firebase auditorias: ' + msg1);
        console.warn('[P4] nukeAudits: ✗ Firebase auditorias —', msg1);
      }

      // 2. Firebase: borrar nodo tombstones
      try {
        await _p4Sink.update(tombstoneFbPath, null);
        console.log('[P4] nukeAudits: ✓ Firebase tombstones borrado');
      } catch (e) {
        var msg2 = e && e.message ? e.message : String(e);
        errors.push('Firebase tombstones: ' + msg2);
        console.warn('[P4] nukeAudits: ✗ Firebase tombstones —', msg2);
      }
    } else {
      var fbWarn = 'Firebase no limpiado: ' + (!_isP4Enabled() ? 'P4 desactivado' : 'sin sink');
      errors.push(fbWarn);
      console.warn('[P4] nukeAudits: ✗', fbWarn);
    }

    // 3. localStorage: auditorias
    try {
      localStorage.removeItem(auditLsKey);
      _audit = [];
      console.log('[P4] nukeAudits: ✓ localStorage audit_history_v1 borrado');
    } catch (e) { errors.push('localStorage audit: ' + (e.message || e)); }

    // 4. localStorage: filtrar entradas audit/tombstone de p4_queue (resto intacto)
    if (p4QueueLsKey) {
      try {
        var queue = {};
        try { queue = JSON.parse(localStorage.getItem(p4QueueLsKey) || '{}'); } catch (e2) {}
        var removedFromQueue = 0;
        Object.keys(queue).forEach(function (k) {
          if (k.indexOf('/auditorias/') !== -1 || k.indexOf('/deletedAuditorias/') !== -1) {
            delete queue[k];
            removedFromQueue++;
          }
        });
        localStorage.setItem(p4QueueLsKey, JSON.stringify(queue));
        console.log('[P4] nukeAudits: ✓ p4_queue — eliminadas', removedFromQueue, 'entradas audit/tombstone');
      } catch (e) { errors.push('p4_queue filter: ' + (e.message || e)); }
    }

    // 5. localStorage: backups de pull relacionados con audit
    try { localStorage.removeItem(bkAuditLsKey); } catch (e) {}
    try { localStorage.removeItem(bkTsLsKey);    } catch (e) {}
    console.log('[P4] nukeAudits: ✓ backups de pull (audit) eliminados');

    // 6. IDB: borrar todos los registros auditHistory de este usuario
    if (typeof PilotPayLocalDB !== 'undefined' &&
        typeof PilotPayLocalDB.getAuditRecordsByUser === 'function' &&
        typeof PilotPayLocalDB.deleteAuditRecord === 'function') {
      try {
        var idbAudits = await PilotPayLocalDB.getAuditRecordsByUser(_userId);
        await Promise.all(idbAudits.map(function (r) {
          return PilotPayLocalDB.deleteAuditRecord(r.id).catch(function (e) {
            console.warn('[P4] nukeAudits: IDB delete parcial fallo —', r.id, e && e.message);
          });
        }));
        console.log('[P4] nukeAudits: ✓ IDB auditHistory —', idbAudits.length, 'registros eliminados');
      } catch (e) {
        errors.push('IDB: ' + (e && e.message ? e.message : e));
        console.warn('[P4] nukeAudits: ✗ IDB —', e && e.message ? e.message : e);
      }
    } else {
      console.log('[P4] nukeAudits: IDB no disponible — omitido');
    }

    console.log('══════════════════════════════════════════════════════════');
    if (errors.length === 0) {
      console.log('[P4] nukeAudits: LIMPIEZA COMPLETADA SIN ERRORES');
      console.log('  Recarga la página para confirmar estado limpio.');
    } else {
      console.warn('[P4] nukeAudits: LIMPIEZA COMPLETADA CON ' + errors.length + ' ERROR(ES):', errors);
    }
    console.log('══════════════════════════════════════════════════════════');

    return { done: true, userId: _userId, errors: errors };
  };
  // ══ fin DEBUG/ADMIN nukeAudits ══════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // DEBUG/ADMIN — fullLocalReset: limpieza completa de almacenamiento local
  // No toca Firebase en absoluto. Eliminar este bloque cuando ya no sea necesario.
  //
  // Cubre: localStorage (claves pilotpay*), IndexedDB (PilotPayLocalDB),
  //        Cache Storage y Service Workers (future-proof — hoy vacíos).
  //
  // Uso:
  //   P4Debug.fullLocalReset()                → dry-run (muestra qué borraría)
  //   P4Debug.fullLocalReset({ confirm:true }) → ejecuta el borrado real
  //
  // ⚠  REQUIERE RECARGA tras ejecutar — la app queda sin estado inicializado.
  // ══════════════════════════════════════════════════════════════════════════
  window.P4Debug.fullLocalReset = async function (opts) {
    opts = opts || {};
    var dryRun = opts.confirm !== true;

    // ── Inventario (siempre, antes de actuar) ─────────────────────────────

    // 1. localStorage: todas las claves que empiezan por 'pilotpay'
    var lsKeys = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('pilotpay') === 0) lsKeys.push(k);
      }
    } catch (e) {}

    // 2. Cache Storage
    var hasCacheStorage = typeof caches !== 'undefined' && typeof caches.keys === 'function';
    var cacheNames = [];
    if (hasCacheStorage) {
      try { cacheNames = await caches.keys(); } catch (e) {}
    }

    // 3. Service Workers
    var hasSW = typeof navigator !== 'undefined' &&
                navigator.serviceWorker &&
                typeof navigator.serviceWorker.getRegistrations === 'function';
    var swRegistrations = [];
    if (hasSW) {
      try { swRegistrations = await navigator.serviceWorker.getRegistrations(); } catch (e) {}
    }

    var idbName = 'PilotPayLocalDB';  // debe coincidir con DB_NAME en pilotPayLocalDB.js

    // ── Informe ───────────────────────────────────────────────────────────
    console.log('══════════════════════════════════════════════════════════');
    console.log('[P4] fullLocalReset' + (dryRun ? ' — DRY RUN (sin cambios)' : ' — EJECUCIÓN REAL'));
    console.log('  ⚠  No toca Firebase. Requiere recarga tras ejecutar.');
    console.log('');
    console.log('  localStorage (' + lsKeys.length + ' claves pilotpay*):');
    lsKeys.forEach(function (k) { console.log('    ' + k); });
    console.log('');
    console.log('  IndexedDB: base de datos "' + idbName + '" (eliminación completa)');
    console.log('');
    if (cacheNames.length > 0) {
      console.log('  Cache Storage (' + cacheNames.length + ' caches):');
      cacheNames.forEach(function (n) { console.log('    ' + n); });
    } else {
      console.log('  Cache Storage: ' +
        (hasCacheStorage ? 'sin caches activos (API disponible, hoy vacío)'
                         : 'API no disponible en este contexto'));
    }
    console.log('');
    if (swRegistrations.length > 0) {
      console.log('  Service Workers (' + swRegistrations.length + ' registrados):');
      swRegistrations.forEach(function (r) { console.log('    ' + r.scope); });
    } else {
      console.log('  Service Workers: ' +
        (hasSW ? 'ninguno registrado (API disponible, hoy sin SW)'
               : 'API no disponible en este contexto'));
    }
    console.log('══════════════════════════════════════════════════════════');

    if (dryRun) {
      console.log('[P4] fullLocalReset: para ejecutar → P4Debug.fullLocalReset({ confirm: true })');
      return {
        dryRun        : true,
        lsKeys        : lsKeys,
        idbDatabase   : idbName,
        cacheNames    : cacheNames,
        serviceWorkers: swRegistrations.map(function (r) { return r.scope; })
      };
    }

    // ── Ejecución real ────────────────────────────────────────────────────
    console.log('[P4] fullLocalReset: ejecutando…');
    var errors = [];

    // 1. localStorage — borrar todas las claves pilotpay* (usando array previo, no índices)
    lsKeys.forEach(function (lk) {
      try { localStorage.removeItem(lk); }
      catch (e) { errors.push('localStorage "' + lk + '": ' + (e.message || e)); }
    });
    console.log('[P4] fullLocalReset: ✓ localStorage —', lsKeys.length, 'claves eliminadas');

    // 2. IndexedDB — borrar la base de datos completa
    await new Promise(function (resolve) {
      if (!window.indexedDB) {
        console.log('[P4] fullLocalReset: IDB — API no disponible, omitido');
        resolve(); return;
      }
      var req = window.indexedDB.deleteDatabase(idbName);
      req.onsuccess = function () {
        console.log('[P4] fullLocalReset: ✓ IDB "' + idbName + '" eliminada');
        resolve();
      };
      req.onerror = function () {
        var msg = req.error ? req.error.message : 'error desconocido';
        errors.push('IDB delete: ' + msg);
        console.warn('[P4] fullLocalReset: ✗ IDB —', msg);
        resolve();
      };
      req.onblocked = function () {
        // Ocurre si otra pestaña tiene la DB abierta
        errors.push('IDB delete: bloqueado (cierra otras pestañas de PilotPay y reintenta)');
        console.warn('[P4] fullLocalReset: ✗ IDB bloqueado — cierra otras pestañas y reintenta');
        resolve();
      };
    });

    // 3. Cache Storage — borrar todos los caches encontrados
    if (hasCacheStorage && cacheNames.length > 0) {
      await Promise.all(cacheNames.map(async function (name) {
        try {
          await caches.delete(name);
          console.log('[P4] fullLocalReset: ✓ cache eliminado —', name);
        } catch (e) {
          errors.push('cache "' + name + '": ' + (e.message || e));
          console.warn('[P4] fullLocalReset: ✗ cache', name, '—', e.message || e);
        }
      }));
    } else {
      console.log('[P4] fullLocalReset: Cache Storage — nada que eliminar');
    }

    // 4. Service Workers — desregistrar todos
    if (hasSW && swRegistrations.length > 0) {
      await Promise.all(swRegistrations.map(async function (reg) {
        try {
          await reg.unregister();
          console.log('[P4] fullLocalReset: ✓ SW desregistrado —', reg.scope);
        } catch (e) {
          errors.push('SW "' + reg.scope + '": ' + (e.message || e));
          console.warn('[P4] fullLocalReset: ✗ SW', reg.scope, '—', e.message || e);
        }
      }));
    } else {
      console.log('[P4] fullLocalReset: Service Workers — nada que desregistrar');
    }

    // 5. Invalidar referencias en memoria (evita escrituras fantasma antes de recarga)
    try { _audit   = []; } catch (e) {}
    try { _monthly = {}; } catch (e) {}
    try { _userId  = null; } catch (e) {}

    console.log('══════════════════════════════════════════════════════════');
    if (errors.length === 0) {
      console.log('[P4] fullLocalReset: LIMPIEZA COMPLETADA SIN ERRORES');
    } else {
      console.warn('[P4] fullLocalReset: LIMPIEZA COMPLETADA CON ' + errors.length + ' ERROR(ES):', errors);
    }
    console.log('  ⚠  Recarga la página ahora para iniciar desde cero (login requerido).');
    console.log('══════════════════════════════════════════════════════════');

    return { done: true, errors: errors };
  };
  // ══ fin DEBUG/ADMIN fullLocalReset ══════════════════════════════════════

  console.log('[PilotPayStore] módulo cargado v' + VERSION);

})();
