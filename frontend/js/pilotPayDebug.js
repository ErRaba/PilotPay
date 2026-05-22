/**
 * PilotPayDebug — Herramientas de diagnóstico y pruebas internas.
 * Solo para desarrollo. No exportar en producción.
 * Requiere PilotPayStore cargado.
 */
(function () {
  'use strict';

  function _store(requireReady) {
    if (typeof PilotPayStore === 'undefined') {
      console.error('[PilotPayDebug] PilotPayStore no disponible');
      return null;
    }
    if (requireReady !== false && !PilotPayStore.ready()) {
      console.warn('[PilotPayDebug] PilotPayStore no está ready — inicia sesión primero');
      return null;
    }
    return PilotPayStore;
  }

  // ── Helper compartido de asserts ─────────────────────────────────────────────
  function _runner() {
    var passed = 0;
    var failed = 0;
    function assert(desc, condition, note) {
      if (condition) {
        passed++;
        console.log('  ✓ ' + desc);
      } else {
        failed++;
        console.error('  ✗ FAIL: ' + desc +
          (note !== undefined ? ' — got: ' + JSON.stringify(note) : ''));
      }
    }
    function summary(label) {
      var total = passed + failed;
      if (failed === 0) {
        console.log('%c' + label + ': ' + passed + '/' + total + ' PASSED ✓',
                    'color:green;font-weight:bold');
      } else {
        console.error(label + ': ' + failed + ' FAILED de ' + total);
      }
      return { passed: passed, failed: failed, total: total };
    }
    return { assert: assert, summary: summary, get: function() { return { passed: passed, failed: failed }; } };
  }

  // ── Clave monthly_v1 en localStorage ────────────────────────────────────────
  function _findMonthlyKey() {
    if (window.storageKey) return window.storageKey('monthly_v1');
    var found = null;
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('monthly_v1') !== -1) found = k;
    });
    return found;
  }

  window.PilotPayDebug = {

    // ── Diagnóstico: dump de MonthRecords ────────────────────────────────────
    dumpMonthly: function () {
      var s = _store(); if (!s) return;
      var rows = s.monthly.getAll().map(function (mr) {
        return {
          key            : mr.userId + ':' + mr.year + ':' + mr.month,
          estado         : mr.estado,
          resolvedSource : mr.resolvedPeriod ? mr.resolvedPeriod.source : '—',
          hasVariables   : !!(mr.variablesData && mr.variablesData._periodoFin),
          hasCalculo     : !!mr.calculoTeorico,
          hasAuditoria   : !!mr.auditoria,
          hasReg         : !!mr.regularizacion,
          schemaVersion  : mr.schemaVersion,
          updatedAt      : mr._updatedAt ? mr._updatedAt.slice(0, 16) : '—'
        };
      });
      if (rows.length === 0) { console.log('[PilotPayDebug] No hay MonthRecords'); return; }
      console.table(rows);
      return rows;
    },

    // ── Diagnóstico: dump de AuditRecords ────────────────────────────────────
    dumpAudit: function () {
      var s = _store(); if (!s) return;
      var rows = s.audit.getAll().map(function (r) {
        return {
          mes            : r.mes + ' ' + r.anyo,
          fechaAuditoria : r.fechaAuditoria ? r.fechaAuditoria.slice(0, 10) : '—',
          liqTeorico     : r.liqTeorico,
          liqReal        : r.liqReal,
          diff           : r.diff,
          nDiscrepancias : r.nDiscrepancias
        };
      });
      if (rows.length === 0) { console.log('[PilotPayDebug] No hay AuditRecords'); return; }
      console.table(rows);
      return rows;
    },

    // ── Diagnóstico: un MonthRecord concreto ─────────────────────────────────
    getMonth: function (year, month) {
      var s = _store(); if (!s) return null;
      var mr = s.monthly.get(year, month);
      if (!mr) { console.log('[PilotPayDebug] No existe MonthRecord para', year + ':' + month); return null; }
      console.log('[PilotPayDebug] MonthRecord', year + ':' + month, mr);
      return mr;
    },

    // ── Diagnóstico: validación completa del store ────────────────────────────
    validateStore: function () {
      var s = _store(); if (!s) return;
      var all = s.monthly.getAll();
      if (all.length === 0) { console.log('[PilotPayDebug] No hay MonthRecords que validar'); return; }

      var totalErrors = 0;
      var totalWarns  = 0;
      all.forEach(function (mr) {
        var key    = mr.year + ':' + mr.month;
        var issues = s._internal.validateMonthRecord(mr);
        var errors = issues.filter(function (i) { return i.severity === 'error'; });
        var warns  = issues.filter(function (i) { return i.severity === 'warn';  });
        totalErrors += errors.length;
        totalWarns  += warns.length;
        if (errors.length > 0) {
          console.error('[PilotPayDebug] ' + key + ' — ' + errors.length + ' ERROR(S):',
            errors.map(function (i) { return i.code; }).join(', '));
        }
        if (warns.length > 0) {
          console.warn('[PilotPayDebug] ' + key + ' — ' + warns.length + ' WARN(S):',
            warns.map(function (i) { return i.code; }).join(', '));
        }
      });
      console.log('[PilotPayDebug] validateStore: ' + all.length + ' registros | ' +
                  totalErrors + ' errores | ' + totalWarns + ' warnings');
      return { records: all.length, errors: totalErrors, warns: totalWarns };
    },

    // ── Diagnóstico: tamaño de localStorage ──────────────────────────────────
    sizeReport: function () {
      var report = {};
      var total  = 0;
      ['monthly_v1', 'audit_history_v1', 'profileData', 'pilotpay'].forEach(function (hint) {
        Object.keys(localStorage).forEach(function (k) {
          if (k.indexOf(hint) !== -1 && !report[k]) {
            var kb = Math.round((localStorage.getItem(k) || '').length / 1024 * 10) / 10;
            report[k] = kb + ' KB';
            total += kb;
          }
        });
      });
      report['_TOTAL_ESTIMADO'] = Math.round(total * 10) / 10 + ' KB';
      console.table(report);
      return report;
    },

    // ── Diagnóstico: snapshot legible del estado actual ───────────────────────
    verifyState: function () {
      var s = _store(); if (!s) return null;

      var all     = s.monthly.getAll();
      var pending = s.monthly.getPendingComparisons();
      var estados = {};
      all.forEach(function (mr) {
        estados[mr.estado] = (estados[mr.estado] || 0) + 1;
      });

      var userId = '?';
      try { userId = s.profile.get().userId || '?'; } catch (e) {}

      console.group('[PilotPayDebug] verifyState()');
      console.log('userId              :', userId);
      console.log('Expedientes totales :', all.length);
      console.log('Previsiones pend.   :', pending.length);
      console.log('Por estado          :', estados);

      if (all.length > 0) {
        console.group('Detalle por expediente');
        all.forEach(function (mr) {
          var lt = mr.metadata && mr.metadata.lastTransition;
          console.log(
            mr.year + ':' + mr.month,
            '|', mr.estado,
            '| upd:', mr._updatedAt ? mr._updatedAt.slice(0, 16) : '—',
            '| lastTrans:', lt ? (lt.from + '→' + lt.to + ' (' + (lt.reason || '?') + ')') : '—',
            '| vars:', !!(mr.variablesData && mr.variablesData._periodoFin),
            '| calc:', !!mr.calculoTeorico,
            '| audit:', !!mr.auditoria,
            '| reg:', !!mr.regularizacion
          );
        });
        console.groupEnd();
      }

      var totalErrors = 0;
      all.forEach(function (mr) {
        var issues = s._internal.validateMonthRecord(mr);
        totalErrors += issues.filter(function (i) { return i.severity === 'error'; }).length;
      });
      if (totalErrors === 0) {
        console.log('%c✓ validateMonthRecord: cero errores críticos', 'color:green');
      } else {
        console.error('✗ validateMonthRecord:', totalErrors,
                      'error(s) críticos — ejecutar validateStore() para detalle');
      }

      console.groupEnd();
      return { userId: userId, total: all.length, pending: pending.length, estados: estados, errors: totalErrors };
    },

    // ── STUB ──────────────────────────────────────────────────────────────────
    repairMonth: function (year, month) {
      console.warn('[PilotPayDebug] repairMonth(' + year + ', ' + month + '): no implementado todavía.');
      console.log('[PilotPayDebug] Para inspeccionar: PilotPayStore.monthly.get(' + year + ', ' + month + ')');
    },

    // ════════════════════════════════════════════════════════════════════════════
    // CAPA 1 — Unit tests (sin login, sin localStorage, funciones puras)
    // ════════════════════════════════════════════════════════════════════════════
    testUnit: function () {
      var s = typeof PilotPayStore !== 'undefined' ? PilotPayStore : null;
      if (!s || !s._internal) {
        console.error('[PilotPayDebug] testUnit: PilotPayStore._internal no disponible');
        return null;
      }

      var internal  = s._internal;
      var clone     = internal.cloneSnapshot;
      var setEstado = internal.setEstado;
      var validate  = internal.validateMonthRecord;
      var normalize = internal.normalizeMonthRecord;

      var r = _runner();
      var assert = r.assert;

      console.group('[PilotPayDebug] testUnit()');

      // ── _cloneSnapshot ───────────────────────────────────────────────────────
      console.group('_cloneSnapshot');

      var src = { a: 1, b: { c: [2, 3] } };
      var c   = clone(src);
      assert('devuelve objeto distinto (!==)', c !== src);
      assert('valores deep iguales', JSON.stringify(c.b) === JSON.stringify(src.b));

      c.b.c.push(99);
      assert('mutar clon no afecta original', src.b.c.length === 2, src.b.c);

      var src2 = { x: 42 };
      var c2   = clone(src2);
      src2.x   = 999;
      assert('mutar original no afecta clon', c2.x === 42, c2.x);

      assert('clone(null) → null',      clone(null)      === null);
      assert('clone(undefined) → undefined', clone(undefined) === undefined);
      assert('no lanza con Date', (function () {
        try { var r2 = clone({ d: new Date() }); return r2 !== null; } catch (e) { return false; }
      })());

      console.groupEnd();

      // ── _setEstado ───────────────────────────────────────────────────────────
      console.group('_setEstado');

      function makeMR(estado) {
        return { estado: estado, metadata: {}, _updatedAt: '2026-01-01T00:00:00.000Z' };
      }

      // Transición válida
      var mr1  = makeMR('pending_calculation');
      var ok1  = setEstado(mr1, 'pending_comparison', { reason: 'test' });
      assert('transición válida → true', ok1 === true);
      assert('transición válida actualiza estado', mr1.estado === 'pending_comparison', mr1.estado);
      assert('transición válida actualiza _updatedAt', mr1._updatedAt !== '2026-01-01T00:00:00.000Z');
      assert('lastTransition.from correcto', mr1.metadata.lastTransition.from === 'pending_calculation');
      assert('lastTransition.to correcto',   mr1.metadata.lastTransition.to   === 'pending_comparison');
      assert('lastTransition.reason correcto', mr1.metadata.lastTransition.reason === 'test');
      assert('lastTransition.at presente',   !!mr1.metadata.lastTransition.at);

      // Misma transición sin force — no-op, no toca _updatedAt
      var mr2 = makeMR('auditado');
      var ts2 = mr2._updatedAt;
      var ok2 = setEstado(mr2, 'auditado');
      assert('misma transición sin force → true (no-op)', ok2 === true);
      assert('misma transición sin force: _updatedAt intacto', mr2._updatedAt === ts2);
      assert('misma transición sin force: estado intacto',     mr2.estado === 'auditado');

      // CASO 1: transición inválida explícita — auditado → pending_variables
      var mr3  = makeMR('auditado');
      var ts3  = mr3._updatedAt;
      var ok3  = setEstado(mr3, 'pending_variables', { reason: 'test-invalida' });
      assert('[1] auditado→pending_variables sin force → false', ok3 === false, ok3);
      assert('[1] estado intacto tras transición inválida',      mr3.estado === 'auditado', mr3.estado);
      assert('[1] _updatedAt intacto tras transición inválida',  mr3._updatedAt === ts3);

      // Estado desconocido
      var mr4 = makeMR('pending_comparison');
      var ok4 = setEstado(mr4, 'estado_inventado');
      assert('estado desconocido → false',    ok4 === false);
      assert('estado desconocido: no muta', mr4.estado === 'pending_comparison');

      // force:true en transición no tabulada
      var mr5 = makeMR('auditado');
      var ok5 = setEstado(mr5, 'pendiente', { force: true, reason: 'test-force' });
      assert('force en transición no tabulada → true', ok5 === true);
      assert('force actualiza estado',  mr5.estado === 'pendiente', mr5.estado);
      assert('force marca forced:true', mr5.metadata.lastTransition.forced === true);

      console.groupEnd();

      // ── _validateMonthRecord ─────────────────────────────────────────────────
      console.group('_validateMonthRecord');

      function makeFull(overrides) {
        return Object.assign({}, {
          schemaVersion  : 1,
          id             : 'u1:2026:5',
          userId         : 'u1',
          year           : 2026,
          month          : 5,
          mesLabel       : 'Mayo',
          estado         : 'auditado',
          metadata       : {},
          resolvedPeriod : { year: 2026, month: 5, mesLabel: 'Mayo', source: 'periodoFin', resolvedAt: '2026-05-01T00:00:00.000Z' },
          variablesData  : { _periodoFin: '2026-04-30T00:00:00.000Z' },
          calculoTeorico : { liquidoReal: 4200, engineVersion: '1.0', convenioVersion: 'BCSA-2024', calculatedAt: '2026-05-01T00:00:00.000Z' },
          auditoria      : { fechaAuditoria: '2026-05-15', nDiscrepancias: 0, discrepancias: [] },
          regularizacion : null,
          reclamacion    : null,
          nominaData     : null,
          pdfRef         : null,
          _createdAt     : '2026-05-01T00:00:00.000Z',
          _updatedAt     : '2026-05-15T00:00:00.000Z'
        }, overrides || {});
      }

      function hasCode(issues, code) {
        return issues.some(function (i) { return i.code === code; });
      }

      var fullIssues = validate(makeFull());
      var fullErrors = fullIssues.filter(function (i) { return i.severity === 'error'; });
      assert('record válido — cero errores', fullErrors.length === 0,
             fullErrors.map(function (i) { return i.code; }));

      assert('sin userId → E_NO_USERID',
             hasCode(validate(makeFull({ userId: null })), 'E_NO_USERID'));
      assert('year 1990 → E_YEAR_INVALID',
             hasCode(validate(makeFull({ year: 1990 })), 'E_YEAR_INVALID'));
      assert('estado inventado → E_ESTADO_INVALID',
             hasCode(validate(makeFull({ estado: 'inventado' })), 'E_ESTADO_INVALID'));

      // CASO 3: resolvedPeriod inconsistente (year/month no coinciden)
      assert('[3] resolvedPeriod mismatch → E_PERIOD_MISMATCH',
             hasCode(validate(makeFull({
               resolvedPeriod: { year: 2025, month: 12, mesLabel: 'Diciembre', source: 'periodoFin', resolvedAt: '2026-01-01T' }
             })), 'E_PERIOD_MISMATCH'));

      assert('pending_comparison sin calculoTeorico → E_PEND_NO_CALC',
             hasCode(validate(makeFull({
               estado: 'pending_comparison', auditoria: null, calculoTeorico: null
             })), 'E_PEND_NO_CALC'));

      // CASO 2: expediente legacy corrupto — pending_comparison sin variablesData
      assert('[2] pending_comparison sin variablesData → W_PEND_NO_VARS',
             hasCode(validate(makeFull({
               estado: 'pending_comparison', variablesData: null, auditoria: null,
               calculoTeorico: { liquidoReal: 4200, engineVersion: '1.0', convenioVersion: 'BCSA-2024', calculatedAt: '2026-05-01T' }
             })), 'W_PEND_NO_VARS'));

      console.groupEnd();

      // ── _normalizeMonthRecord ────────────────────────────────────────────────
      console.group('_normalizeMonthRecord');

      var legacyMR = {
        schemaVersion  : '3.0',
        userId         : 'u1',
        year           : 2026,
        month          : 5,
        estado         : 'auditado',
        sourceIntegrity: { auditoriaCompleta: true },
        _createdAt     : '2026-01-01T00:00:00.000Z',
        _updatedAt     : '2026-01-01T00:00:00.000Z'
      };
      var norm = normalize(legacyMR);
      assert('schemaVersion string → number', typeof norm.mr.schemaVersion === 'number', norm.mr.schemaVersion);
      assert('schemaVersion migra a 1',            norm.mr.schemaVersion === 1);
      assert('changed === true tras migración', norm.changed === true);
      assert('sourceIntegrity eliminado',          norm.mr.sourceIntegrity === undefined);
      assert('id añadido',                    !!norm.mr.id, norm.mr.id);
      assert('metadata añadida',              !!norm.mr.metadata);

      var alreadyNorm = {
        schemaVersion : 1,
        id            : 'u1:2026:5',
        userId        : 'u1',
        year          : 2026,
        month         : 5,
        mesLabel      : 'Mayo',
        metadata      : { createdFrom: null, migratedAt: null },
        estado        : 'auditado',
        _createdAt    : '2026-01-01T00:00:00.000Z',
        _updatedAt    : '2026-01-01T00:00:00.000Z'
      };
      var norm2 = normalize(alreadyNorm);
      assert('ya normalizado: changed === false', norm2.changed === false, norm2.changed);

      console.groupEnd();

      var result = r.summary('[PilotPayDebug] testUnit');
      console.groupEnd();
      return result;
    },

    // ════════════════════════════════════════════════════════════════════════════
    // CAPA 2 — Store integration tests (requiere login; usa año 2099; limpia al acabar)
    // ════════════════════════════════════════════════════════════════════════════
    testStore: function () {
      var s = _store();
      if (!s) return null;

      var r      = _runner();
      var assert = r.assert;

      // Año 2099 — imposible confundir con nóminas reales; > 2020 supera la validación
      var TEST_YEAR  = 2099;
      var TEST_MONTH = 5;   // _periodoFin 30 abril 2099 → expediente mayo 2099

      var fakeVarsData = {
        _periodoFin    : new Date(2099, 3, 30).toISOString(),
        _periodoInicio : new Date(2099, 3, 1).toISOString(),
        horas_vuelo    : 70,
        dpo            : 3
      };
      var fakeCalc1 = { liquidoReal: 4200, totalDevengado: 6100, baseIRPF: 5500, baseSS: 5200, retencionIRPF: 1900 };
      var fakeCalc2 = { liquidoReal: 4350, totalDevengado: 6250, baseIRPF: 5650, baseSS: 5350, retencionIRPF: 1900 };

      var fakeAuditDiffs = {
        mes: 'Mayo', anyo: '2099',
        fechaAuditoria : new Date().toISOString(),
        liqTeorico     : 4200,
        liqReal        : 4112.5,
        diff           : -87.5,
        nDiscrepancias : 2,
        discrepancias  : [{ concepto: 'horas', diferencia: -50 }, { concepto: 'dpo', diferencia: -37.5 }],
        datosExtraidos : { total_devengado: 6050, base_irpf: 5450, base_ss: 5150, irpf_pct: 0.30 }
      };

      // Guardar estado actual de monthly_v1 para restaurar al acabar
      var lsKey      = _findMonthlyKey();
      var lsSnapshot = lsKey ? localStorage.getItem(lsKey) : null;

      console.group('[PilotPayDebug] testStore() — año de prueba ' + TEST_YEAR);

      try {

        // ── 1. Crear previsión ─────────────────────────────────────────────────
        console.group('1. Crear previsión (Variables→Calcular)');

        s.monthly.onVariablesConfirmed(fakeVarsData);
        s.monthly.onCalculationDone(fakeVarsData, fakeCalc1);

        var mr = s.monthly.get(TEST_YEAR, TEST_MONTH);
        assert('MonthRecord creado', !!mr);
        assert('estado pending_comparison', mr && mr.estado === 'pending_comparison', mr && mr.estado);
        assert('calculoTeorico presente', !!(mr && mr.calculoTeorico));
        assert('calculoTeorico.engineVersion = 1.0', mr && mr.calculoTeorico.engineVersion === '1.0',
               mr && mr.calculoTeorico.engineVersion);
        assert('calculoTeorico !== fakeCalc1 (clon, no referencia)', mr && mr.calculoTeorico !== fakeCalc1);
        assert('variablesData._periodoFin presente', !!(mr && mr.variablesData && mr.variablesData._periodoFin));
        assert('variablesData !== fakeVarsData (clon, no referencia)', mr && mr.variablesData !== fakeVarsData);
        assert('metadata.lastTransition registrada', !!(mr && mr.metadata && mr.metadata.lastTransition));

        var pendList = s.monthly.getPendingComparisons().filter(function (x) {
          return x.year === TEST_YEAR && x.month === TEST_MONTH;
        });
        assert('exactamente 1 pending_comparison para el mes de prueba', pendList.length === 1, pendList.length);

        console.groupEnd();

        // ── 2. Recalcular × 3 ─────────────────────────────────────────────────
        console.group('2. Recalcular mismo mes × 3');

        s.monthly.onCalculationDone(fakeVarsData, fakeCalc2);
        s.monthly.onCalculationDone(fakeVarsData, fakeCalc1);
        s.monthly.onCalculationDone(fakeVarsData, fakeCalc2);

        var mrR = s.monthly.get(TEST_YEAR, TEST_MONTH);
        assert('sigue 1 MonthRecord', !!mrR);
        assert('estado sigue pending_comparison', mrR && mrR.estado === 'pending_comparison', mrR && mrR.estado);
        assert('calculoTeorico actualizado al último (fakeCalc2)',
               mrR && mrR.calculoTeorico.liquidoReal === fakeCalc2.liquidoReal,
               mrR && mrR.calculoTeorico.liquidoReal);

        var pendAfter = s.monthly.getPendingComparisons().filter(function (x) {
          return x.year === TEST_YEAR && x.month === TEST_MONTH;
        });
        assert('sin duplicados tras recalcular ×3', pendAfter.length === 1, pendAfter.length);

        console.groupEnd();

        // ── 3. Snapshot independence ───────────────────────────────────────────
        console.group('3. Snapshot independence');

        var mrSnap       = s.monthly.get(TEST_YEAR, TEST_MONTH);
        var savedFin     = mrSnap && mrSnap.variablesData && mrSnap.variablesData._periodoFin;
        var savedHoras   = mrSnap && mrSnap.variablesData && mrSnap.variablesData.horas_vuelo;
        var savedLiquido = mrSnap && mrSnap.calculoTeorico && mrSnap.calculoTeorico.liquidoReal;

        // Mutar los objetos originales DESPUÉS de haberlos pasado al store
        fakeVarsData._periodoFin = null;
        fakeVarsData.horas_vuelo = 9999;
        fakeCalc2.liquidoReal    = 8888;

        var mrMut = s.monthly.get(TEST_YEAR, TEST_MONTH);
        assert('_periodoFin guardado intacto tras mutar varsData',
               mrMut && mrMut.variablesData && mrMut.variablesData._periodoFin === savedFin,
               mrMut && mrMut.variablesData && mrMut.variablesData._periodoFin);
        assert('horas_vuelo guardadas intactas tras mutar varsData',
               mrMut && mrMut.variablesData && mrMut.variablesData.horas_vuelo === savedHoras,
               mrMut && mrMut.variablesData && mrMut.variablesData.horas_vuelo);
        assert('calculoTeorico intacto tras mutar fakeCalc2',
               mrMut && mrMut.calculoTeorico && mrMut.calculoTeorico.liquidoReal === savedLiquido,
               mrMut && mrMut.calculoTeorico && mrMut.calculoTeorico.liquidoReal);

        // Restaurar para tests siguientes
        fakeVarsData._periodoFin = new Date(2099, 3, 30).toISOString();
        fakeVarsData.horas_vuelo = 70;
        fakeCalc2.liquidoReal    = 4350;

        console.groupEnd();

        // ── 4. Auditoría con diferencias ──────────────────────────────────────
        console.group('4. Auditoría con diferencias');

        var varsBefore = JSON.stringify(s.monthly.get(TEST_YEAR, TEST_MONTH).variablesData);

        s.monthly.onAuditoriaCompletada(fakeAuditDiffs);

        var mrA = s.monthly.get(TEST_YEAR, TEST_MONTH);
        assert('estado con_diferencias', mrA && mrA.estado === 'con_diferencias', mrA && mrA.estado);
        assert('auditoria.nDiscrepancias === 2',
               mrA && mrA.auditoria && mrA.auditoria.nDiscrepancias === 2,
               mrA && mrA.auditoria && mrA.auditoria.nDiscrepancias);
        assert('variablesData intacta tras auditoría',
               JSON.stringify(mrA && mrA.variablesData) === varsBefore);
        assert('lastTransition.reason = auditoria-completada',
               mrA && mrA.metadata && mrA.metadata.lastTransition &&
               mrA.metadata.lastTransition.reason === 'auditoria-completada',
               mrA && mrA.metadata && mrA.metadata.lastTransition && mrA.metadata.lastTransition.reason);
        assert('discrepancias guardadas son clon (no la misma referencia)',
               mrA && mrA.auditoria && mrA.auditoria.discrepancias !== fakeAuditDiffs.discrepancias);

        console.groupEnd();

        // ── 5. Regularización sin mutar auditoría (CASO 5) ────────────────────
        console.group('5. Regularización — auditoría original intacta');

        var auditSnapshot = JSON.stringify(s.monthly.get(TEST_YEAR, TEST_MONTH).auditoria);

        s.monthly.onRegularizacionDone(fakeAuditDiffs, {
          importeNeto       : 87.5,
          netoFinalAjustado : 4287.5,
          nota              : 'Test regularización B.1'
        });

        var mrReg = s.monthly.get(TEST_YEAR, TEST_MONTH);
        assert('estado regularizado', mrReg && mrReg.estado === 'regularizado', mrReg && mrReg.estado);
        assert('regularizacion.importeNeto === 87.5',
               mrReg && mrReg.regularizacion && mrReg.regularizacion.importeNeto === 87.5,
               mrReg && mrReg.regularizacion && mrReg.regularizacion.importeNeto);
        assert('regularizacion.netoFinalAjustado === 4287.5',
               mrReg && mrReg.regularizacion && mrReg.regularizacion.netoFinalAjustado === 4287.5);
        assert('regularizacion.tipo = acuerdo_manual',
               mrReg && mrReg.regularizacion && mrReg.regularizacion.tipo === 'acuerdo_manual',
               mrReg && mrReg.regularizacion && mrReg.regularizacion.tipo);
        assert('[5] auditoría original no mutada por regularización',
               JSON.stringify(mrReg && mrReg.auditoria) === auditSnapshot);

        console.groupEnd();

        // ── 6. deletePending bloquea estados definitivos ───────────────────────
        console.group('6. deletePending bloquea regularizados');

        var wasDeleted = s.monthly.deletePending(TEST_YEAR, TEST_MONTH);
        assert('deletePending → false en regularizado', wasDeleted === false, wasDeleted);
        assert('MonthRecord sigue existiendo tras intento de borrado', !!s.monthly.get(TEST_YEAR, TEST_MONTH));

        console.groupEnd();

        // ── 7. Persistencia localStorage (CASO 4) ─────────────────────────────
        console.group('7. Persistencia localStorage [CASO 4]');

        var rawLS = lsKey ? localStorage.getItem(lsKey) : null;
        assert('monthly_v1 escrito en localStorage', !!rawLS);

        if (rawLS) {
          try {
            var parsed    = JSON.parse(rawLS);
            var testKey   = TEST_YEAR + ':' + TEST_MONTH;
            var persisted = parsed[testKey];
            assert('clave de prueba presente en localStorage', !!persisted, Object.keys(parsed));
            assert('estado correcto en localStorage',
                   persisted && persisted.estado === 'regularizado', persisted && persisted.estado);
            assert('schemaVersion es number en localStorage',
                   persisted && typeof persisted.schemaVersion === 'number', persisted && persisted.schemaVersion);
            assert('sourceIntegrity ausente en localStorage',
                   !(persisted && persisted.sourceIntegrity !== undefined));
            assert('metadata.lastTransition presente en localStorage',
                   !!(persisted && persisted.metadata && persisted.metadata.lastTransition));
          } catch (e) {
            assert('sin error parseando localStorage', false, String(e));
          }
        }

        console.groupEnd();

        // ── 8. validateMonthRecord — cero errores críticos ────────────────────
        console.group('8. validateMonthRecord — cero errores críticos');

        var mrFinal  = s.monthly.get(TEST_YEAR, TEST_MONTH);
        if (mrFinal) {
          var issues  = s._internal.validateMonthRecord(mrFinal);
          var errors  = issues.filter(function (i) { return i.severity === 'error'; });
          assert('cero errores críticos tras flujo completo', errors.length === 0,
                 errors.map(function (i) { return i.code; }));
        }

        console.groupEnd();

      } finally {
        // Restaurar monthly_v1 original (siempre, aunque fallen los tests)
        if (lsKey) {
          if (lsSnapshot !== null) {
            localStorage.setItem(lsKey, lsSnapshot);
          } else {
            localStorage.removeItem(lsKey);
          }
          try { s.refresh(); } catch (e) {}
          console.log('[PilotPayDebug] testStore: localStorage restaurado — datos de prueba eliminados');
        }
      }

      var result = r.summary('[PilotPayDebug] testStore');
      console.groupEnd();
      return result;
    }

  };

  console.log('[PilotPayDebug] módulo cargado — ' +
              'testUnit() | testStore() [requiere login] | verifyState() | validateStore() | dumpMonthly()');

})();
