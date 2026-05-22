/**
 * PilotPayDebug — Herramientas de diagnóstico de consola.
 * Solo para desarrollo. No exportar en producción.
 * Requiere PilotPayStore cargado y ready().
 */
(function () {
  'use strict';

  function _store() {
    if (typeof PilotPayStore === 'undefined') {
      console.error('[PilotPayDebug] PilotPayStore no disponible');
      return null;
    }
    if (!PilotPayStore.ready()) {
      console.warn('[PilotPayDebug] PilotPayStore no está ready — inicia sesión primero');
      return null;
    }
    return PilotPayStore;
  }

  window.PilotPayDebug = {

    // Muestra todos los MonthRecords en console.table
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

    // Muestra todos los AuditRecords en console.table
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

    // Devuelve el MonthRecord completo de un mes concreto
    getMonth: function (year, month) {
      var s = _store(); if (!s) return null;
      var mr = s.monthly.get(year, month);
      if (!mr) { console.log('[PilotPayDebug] No existe MonthRecord para', year + ':' + month); return null; }
      console.log('[PilotPayDebug] MonthRecord', year + ':' + month, mr);
      return mr;
    },

    // Ejecuta _validateMonthRecord sobre todos los registros y agrupa por severidad
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

    // Informe de uso de localStorage (KB por clave relevante)
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

    // STUB — implementación futura
    repairMonth: function (year, month) {
      console.warn('[PilotPayDebug] repairMonth(' + year + ', ' + month + '): no implementado todavía.');
      console.log('[PilotPayDebug] Para reparar manualmente: PilotPayStore.monthly.get(' + year + ', ' + month + ')');
    }

  };

  console.log('[PilotPayDebug] módulo cargado — usa PilotPayDebug.dumpMonthly(), .validateStore(), .sizeReport()');

})();
