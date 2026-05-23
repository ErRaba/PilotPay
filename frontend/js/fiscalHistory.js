/**
 * FiscalHistory v1.0 — histórico fiscal real auditado.
 *
 * Responsabilidades:
 *   - Registrar datos fiscales reales por año y mes
 *   - Leer entradas con campos derivados (tipoEfectivo calculado en lectura, nunca almacenado)
 *   - Migración lazy: simHistorico → historicoFiscal (una sola vez, no destructiva)
 *   - Snapshot para Firebase (solo historicoFiscal)
 *   - Interpretación textual para dashboard (conclusión útil o null — sin números sueltos)
 *
 * Lo que NO hace:
 *   - Gestionar SimulationScenario ni simHistoricoData (espejo de sesión del simulador)
 *   - Calcular proyección futura (→ computarIRPF)
 *   - Guardar en Firebase directamente (→ saveUserData)
 *   - Modificar FinancialProfile (configuración fiscal activa)
 *
 * Estructura de profileData.historicoFiscal:
 *   {
 *     [year: int]: {
 *       [month: int 1-12]: {
 *         brutoAcum:  float,   // bruto YTD acumulado hasta ese mes (€)
 *         irpfAcum:   float,   // IRPF retenido YTD hasta ese mes (€)
 *         origen:     string,  // 'nomina_auditada' | 'manual' | 'parser' | 'migrado_simHistorico'
 *         updatedAt:  string,  // YYYY-MM-DD de última escritura
 *       }
 *     }
 *   }
 *
 * tipoEfectivo = irpfAcum / brutoAcum * 100 — calculado en lectura, nunca persiste.
 */

var FiscalHistory = (function () {
  'use strict';

  // ── record ────────────────────────────────────────────────────────────────
  // Registra o actualiza una entrada. Merge con datos existentes:
  // si data.brutoAcum es null, conserva el valor anterior (permite escribir
  // un solo campo sin sobrescribir el otro).
  // data = { brutoAcum, irpfAcum, origen }
  function record(pd, year, month, data) {
    if (!pd || !year || !month) return;
    if (!pd.historicoFiscal)        pd.historicoFiscal = {};
    if (!pd.historicoFiscal[year])  pd.historicoFiscal[year] = {};
    var existing = pd.historicoFiscal[year][month] || {};
    pd.historicoFiscal[year][month] = {
      brutoAcum:  data.brutoAcum  != null ? data.brutoAcum  : (existing.brutoAcum  != null ? existing.brutoAcum  : null),
      irpfAcum:   data.irpfAcum   != null ? data.irpfAcum   : (existing.irpfAcum   != null ? existing.irpfAcum   : null),
      origen:     data.origen     || existing.origen || 'manual',
      updatedAt:  new Date().toISOString().slice(0, 10),
    };
  }

  // ── getEntry ──────────────────────────────────────────────────────────────
  // Lee un mes con tipoEfectivo derivado.
  function getEntry(pd, year, month) {
    var h = pd && pd.historicoFiscal;
    if (!h || !h[year] || !h[year][month]) return null;
    var e = h[year][month];
    var tipo = (e.brutoAcum != null && e.irpfAcum != null && e.brutoAcum > 0)
      ? Math.round(e.irpfAcum / e.brutoAcum * 10000) / 100
      : null;
    return {
      brutoAcum:    e.brutoAcum,
      irpfAcum:     e.irpfAcum,
      tipoEfectivo: tipo,
      origen:       e.origen,
      updatedAt:    e.updatedAt,
    };
  }

  // ── getLastEntry ──────────────────────────────────────────────────────────
  // Último mes con datos del año (número de mes más alto disponible).
  function getLastEntry(pd, year) {
    var h = pd && pd.historicoFiscal;
    if (!h || !h[year]) return null;
    var months = Object.keys(h[year]).map(Number).filter(function (m) {
      return m >= 1 && m <= 12;
    }).sort(function (a, b) { return b - a; });
    return months.length ? getEntry(pd, year, months[0]) : null;
  }

  // ── migrateFromLegacy ─────────────────────────────────────────────────────
  // Migración lazy: simHistorico { [m]: { bruto, irpf } } → historicoFiscal[year][m].
  // Solo ejecuta si simHistorico existe Y historicoFiscal no existe todavía.
  // No destructiva: simHistorico queda intacto (se vuelve inerte al dejar de escribirse).
  function migrateFromLegacy(pd) {
    if (!pd || !pd.simHistorico) return;
    var year = new Date().getFullYear();
    // Skip only if historicoFiscal already has real data for this year
    if (pd.historicoFiscal && pd.historicoFiscal[year] && Object.keys(pd.historicoFiscal[year]).length > 0) return;
    if (!pd.historicoFiscal) pd.historicoFiscal = {};
    pd.historicoFiscal[year] = {};
    var migrated = 0;
    Object.keys(pd.simHistorico).forEach(function (k) {
      var m = parseInt(k, 10);
      if (isNaN(m) || m < 1 || m > 12) return;
      var e = pd.simHistorico[k] || {};
      var bruto = parseFloat(e.bruto);
      var irpf  = parseFloat(e.irpf);
      if (bruto > 0 || irpf > 0) {
        pd.historicoFiscal[year][m] = {
          brutoAcum:  isNaN(bruto) ? null : bruto,
          irpfAcum:   isNaN(irpf)  ? null : irpf,
          origen:     'migrado_simHistorico',
          updatedAt:  new Date().toISOString().slice(0, 10),
        };
        migrated++;
      }
    });
    if (migrated > 0) {
      console.info('[FiscalHistory] simHistorico migrado a historicoFiscal[' + year + ']: ' + migrated + ' meses');
    }
  }

  // ── toFirebaseSnapshot ────────────────────────────────────────────────────
  // Solo historicoFiscal — para combinar con FinancialProfile.toFirebaseSnapshot()
  // en saveUserData().
  function toFirebaseSnapshot(pd) {
    if (!pd || pd.historicoFiscal === undefined) return {};
    return { historicoFiscal: JSON.parse(JSON.stringify(pd.historicoFiscal)) };
  }

  // ── getInterpretation ─────────────────────────────────────────────────────
  // Conclusión interpretativa para dashboard — devuelve texto o null.
  // Nunca devuelve números sueltos sin contexto.
  // irpfTarget = % declarado en perfil del usuario (el tipo aplicado en nómina).
  function getInterpretation(pd, year, irpfTarget) {
    var entry = getLastEntry(pd, year);
    if (!entry || entry.brutoAcum == null || entry.irpfAcum == null) return null;
    if (irpfTarget == null) return null;
    var efectivo = entry.tipoEfectivo;
    if (efectivo == null) return null;
    var delta = Math.round((efectivo - irpfTarget) * 10) / 10;
    if (Math.abs(delta) < 0.5) {
      return 'La retención efectiva anual está alineada con tu IRPF declarado.';
    }
    if (delta < 0) {
      return 'La retención acumulada está por debajo del tipo esperado (' + Math.abs(delta).toFixed(1) + '%).';
    }
    return 'La retención acumulada supera el tipo aplicado en nómina (' + delta.toFixed(1) + '%).';
  }

  console.log('[FiscalHistory] módulo cargado v1.0');

  return {
    record:             record,
    getEntry:           getEntry,
    getLastEntry:       getLastEntry,
    migrateFromLegacy:  migrateFromLegacy,
    toFirebaseSnapshot: toFirebaseSnapshot,
    getInterpretation:  getInterpretation,
  };

})();
