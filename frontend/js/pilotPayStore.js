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

  var VERSION = '1.1.0';

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

  // Persiste solo meses en progreso (pending_*).
  // Meses auditados viven en audit_history_v1; no necesitan monthly_v1.
  // Esto garantiza que cuando _hydrateMonthly cierra un pending_comparison,
  // la siguiente llamada a _saveMonthly lo elimina de monthly_v1 automáticamente.
  function _saveMonthly() {
    try {
      var k = _monthlyKey();
      if (!k) return;
      var toSave = {};
      Object.keys(_monthly).forEach(function (key) {
        var mr = _monthly[key];
        var isPending = mr.variablesData !== null && (
          mr.estado === 'pending_variables'   ||
          mr.estado === 'pending_calculation' ||
          mr.estado === 'pending_comparison'
        );
        if (isPending) toSave[key] = mr;
      });
      localStorage.setItem(k, JSON.stringify(toSave));
    } catch (e) { console.warn('[PilotPayStore] _saveMonthly error:', e); }
  }

  function _loadMonthly() {
    try {
      var raw = localStorage.getItem(_monthlyKey());
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  // ── Helpers internos ────────────────────────────────────────────────────────
  function _monthLabel(m) {
    return MESES_LABEL[m] || '';
  }

  function _monthKey(year, month) {
    return year + ':' + month;
  }

  function _inferYearMonth(record) {
    var year  = record.anyo ? parseInt(record.anyo, 10) : null;
    var month = record.mes  ? (MESES_IDX[record.mes]   || null) : null;
    if (!year || !month || isNaN(year)) return null;
    return { year: year, month: month };
  }

  // ── MonthRecord factory ─────────────────────────────────────────────────────
  function _makeMonthRecord(userId, year, month) {
    return {
      // Identidad
      userId   : userId,
      year     : year,
      month    : month,
      mesLabel : _monthLabel(month),

      // Máquina de estados
      // 'pendiente' → 'auditado' | 'con_diferencias' → 'reclamado' → 'corregido'
      estado : 'pendiente',

      // Fuentes de datos (pobladas incrementalmente, null hasta que llegan)
      nominaData     : null,   // extraído del PDF de nómina
      variablesData  : null,   // extraído del PDF de variables
      calculoTeorico : null,   // snapshot de calcResult en momento de auditoría

      // Resultado de auditoría
      auditoria : null,
      // { fechaAuditoria, diferenciaNeta, nDiscrepancias, discrepancias, datosExtraidos }

      // Resumen financiero
      acumulados : { baseIRPF: null, irpf: null },
      diasInfo   : { trabajados: null },

      // Integridad/calidad de datos — estructura preparada para Fase 2
      // Indica qué fuentes han contribuido datos al mes.
      // No tiene lógica funcional todavía; es trazabilidad de origen.
      sourceIntegrity : {
        nominaParsed      : false,   // PDF de nómina parseado
        variablesParsed   : false,   // PDF de variables parseado
        auditoriaCompleta : false,   // comparativa ejecutada y guardada
        simulatorDerived  : false    // cálculo teórico disponible
      },

      // Futuro: clave en IndexedDB al PDF original del mes
      pdfRef : null,

      // Metadatos
      _createdAt : new Date().toISOString(),
      _updatedAt : new Date().toISOString()
    };
  }

  // ── Carga de auditorías ─────────────────────────────────────────────────────
  function _loadAuditList() {
    try {
      return JSON.parse(localStorage.getItem(_auditKey()) || '[]');
    } catch (e) { return []; }
  }

  // ── Hydration ───────────────────────────────────────────────────────────────
  function _hydrateMonthly(auditList, calcResult) {
    var _pendingClosed = false;

    // Construir MonthRecords desde registros de auditoría existentes.
    auditList.forEach(function (rec) {
      var ym = _inferYearMonth(rec);
      if (!ym) return; // no parseable → ignorar sin descartar del audit[]

      var k  = _monthKey(ym.year, ym.month);
      if (!_monthly[k]) {
        _monthly[k] = _makeMonthRecord(_userId, ym.year, ym.month);
      }
      var mr = _monthly[k];

      // El registro más reciente del mes gana (auditList ya está en orden inverso)
      if (!mr.auditoria) {
        // Si tenía previsión pendiente y ahora llega una auditoría, hay que
        // eliminar el mes de monthly_v1 tras el loop.
        if (mr.estado === 'pending_comparison') _pendingClosed = true;

        mr.auditoria = {
          fechaAuditoria : rec.fechaAuditoria,
          diferenciaNeta : rec.diff,
          nDiscrepancias : rec.nDiscrepancias || 0,
          discrepancias  : rec.discrepancias  || [],
          datosExtraidos : rec.datosExtraidos || {}
        };
        mr.estado = (rec.nDiscrepancias > 0) ? 'con_diferencias' : 'auditado';
        mr.sourceIntegrity.auditoriaCompleta = true;

        // Promover acumulados y días desde datosExtraidos
        var de = rec.datosExtraidos || {};
        if (de.acum_base_irpf != null) mr.acumulados.baseIRPF   = de.acum_base_irpf;
        if (de.acum_irpf      != null) mr.acumulados.irpf        = de.acum_irpf;
        if (de.dias_trabajados != null) mr.diasInfo.trabajados   = de.dias_trabajados;

        mr._updatedAt = new Date().toISOString();
      }
    });

    // Si algún pending_comparison fue cerrado por una auditoría, persistir
    // inmediatamente para que ese mes quede eliminado de monthly_v1.
    if (_pendingClosed) _saveMonthly();

    // Mes en curso: añadir calculoTeorico desde live calcResult solo si el mes
    // no tiene ya un snapshot guardado desde monthly_v1 (onCalculationDone).
    // Sobreescribir destruiría el cálculo real del usuario con los defaults de login.
    if (calcResult) {
      var now   = new Date();
      var year  = now.getFullYear();
      var month = now.getMonth() + 1;
      var k     = _monthKey(year, month);
      if (!_monthly[k]) {
        _monthly[k] = _makeMonthRecord(_userId, year, month);
      }
      if (!_monthly[k].calculoTeorico) {
        _monthly[k].calculoTeorico = calcResult;
        _monthly[k].sourceIntegrity.simulatorDerived = true;
      }
    }
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

    // Llamar desde varsConfirmarPeriodo() cuando el usuario confirma el PDF de variables.
    // year/month deben venir de varsData._periodoInicio (fecha del PDF, no mes calendario).
    onVariablesConfirmed: function (year, month, varsData) {
      var k = _monthKey(year, month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, year, month);
      var mr = _monthly[k];
      mr.variablesData = varsData;
      mr.estado = 'pending_calculation';
      mr.sourceIntegrity.variablesParsed = true;
      mr._updatedAt = new Date().toISOString();
      _saveMonthly();
    },

    // Llamar desde recalc() cuando se completa un cálculo teórico.
    // year/month deben coincidir con el mes del PDF cargado en variables.
    onCalculationDone: function (year, month, calcResult) {
      var k = _monthKey(year, month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, year, month);
      var mr = _monthly[k];
      mr.calculoTeorico = calcResult;
      if (mr.estado === 'pending_calculation' ||
          mr.estado === 'pending_variables'   ||
          mr.estado === 'pendiente') {
        mr.estado = 'pending_comparison';
      }
      mr.sourceIntegrity.simulatorDerived = true;
      mr._updatedAt = new Date().toISOString();
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
      return Object.values(_monthly)
        .filter(function (mr) { return mr.estado === 'pending_comparison'; })
        .sort(function (a, b) { return (b.year - a.year) || (b.month - a.month); });
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
        totalMeses      : allMR.length,
        mesesAuditados  : allMR.filter(function (m) { return m.estado !== 'pendiente'; }).length,
        mesesConDifs    : allMR.filter(function (m) { return m.estado === 'con_diferencias'; }).length,
        mesesReclamados : allMR.filter(function (m) { return m.estado === 'reclamado'; }).length,
        anosDisponibles : expedition.getAvailableYears()
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

      // Cargar meses en progreso primero, luego enriquecer con auditorías.
      // _hydrateMonthly no sobreescribe auditoria si ya existe.
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
      _monthly = _loadMonthly();   // preservar meses en progreso entre refreshes
      _hydrateMonthly(auditList, _cr());
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

    // Dominios
    profile    : profile,
    monthly    : monthly,
    audit      : audit,
    simulator  : simulator,
    expedition : expedition,

    // Agregados
    getDashboardSummary : getDashboardSummary
  };

  console.log('[PilotPayStore] módulo cargado v' + VERSION);

})();
