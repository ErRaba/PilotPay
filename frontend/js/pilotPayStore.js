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

  var VERSION = '2.0.0';

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
    return {
      // Identidad
      schemaVersion : '3.0',
      userId        : userId,
      year          : year,
      month         : month,
      mesLabel      : _monthLabel(month),

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
      regularizacion : null,   // { importeNeto, netoFinalAjustado, nota, fecha, docNombre, registrado }
      reclamacion    : null,   // { generada, texto, referencia } — futuro

      // Audit trail de resolución temporal — por qué este expediente es del mes que es
      // { year, month, mesLabel, source, resolvedAt }
      resolvedPeriod : null,

      // Trazabilidad de fuentes
      sourceIntegrity : {
        variablesParsed   : false,
        nominaParsed      : false,
        auditoriaCompleta : false,
        simulatorDerived  : false,
        regularizado      : false,
        reclamado         : false
      },

      // Reservado: clave futura en IndexedDB
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
        mr.sourceIntegrity.auditoriaCompleta = true;

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
          mr.sourceIntegrity.regularizado = true;
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
      var k   = _monthKey(rp.year, rp.month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, rp.year, rp.month);
      var mr  = _monthly[k];
      var now = new Date().toISOString();
      mr.variablesData = varsData;
      mr.estado = 'pending_calculation';
      mr.sourceIntegrity.variablesParsed = true;
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
      var k   = _monthKey(rp.year, rp.month);
      if (!_monthly[k]) _monthly[k] = _makeMonthRecord(_userId, rp.year, rp.month);
      var mr  = _monthly[k];
      var now = new Date().toISOString();
      mr.calculoTeorico = calcResult;
      if (mr.estado === 'pending_calculation' ||
          mr.estado === 'pending_variables'   ||
          mr.estado === 'pendiente') {
        mr.estado = 'pending_comparison';
      }
      mr.sourceIntegrity.simulatorDerived = true;
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
      return Object.values(_monthly)
        .filter(function (mr) { return mr.estado === 'pending_comparison'; })
        .sort(function (a, b) { return (b.year - a.year) || (b.month - a.month); });
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
      mr.sourceIntegrity.auditoriaCompleta = true;
      mr.sourceIntegrity.nominaParsed = true;

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
        importeNeto       : data.importeNeto,
        netoFinalAjustado : data.netoFinalAjustado,
        nota              : data.nota              || '',
        fecha             : data.fecha             || new Date().toISOString().slice(0, 10),
        docNombre         : data.docNombre         || null,
        registrado        : data.registrado        || new Date().toISOString()
      };
      mr.sourceIntegrity.regularizado = true;

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

    // Resolución temporal canónica — única fuente de verdad del período del expediente
    resolveExpedientePeriod : function (varsData) { return _resolveExpedientePeriod(varsData); },

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
