/**
 * FinancialProfile v1.0 — configuración fiscal real y persistente del usuario.
 *
 * Responsabilidades:
 *   - Definir qué campos son REALES (persisten a Firebase) vs temporales
 *   - Proporcionar snapshot filtrado para saveUserData (sin sim_*, sin deprecated)
 *   - Construir punto de partida para SimulationScenario (sin mutar profileData)
 *   - Migración lazy: promover sim_ccaa → ccaa si el campo real faltaba
 *
 * Lo que NO hace:
 *   - Gestionar histórico fiscal (→ FiscalHistory)
 *   - Guardar directamente en Firebase (→ saveUserData)
 *   - Gestionar SimulationScenario ni DOM del simulador
 *   - Calcular nada (función de datos puros)
 *
 * Deuda técnica documentada:
 *   REAL_FIELDS mezcla dominios: fiscal, identidad personal, identidad profesional,
 *   fechas OCC, preferencias UI. Separación futura prevista:
 *     saveFinancialProfile()   — fiscal + identidad real
 *     savePreferences()        — theme, UI
 *     saveOperationalProfile() — estado operativo de sesión
 *   No resolver en esta fase.
 */

var FinancialProfile = (function () {
  'use strict';

  // Campos que representan la realidad financiera y personal del usuario.
  // Persisten a Firebase /perfiles y localStorage en cada saveUserData().
  var REAL_FIELDS = [
    // Fiscal / tributario
    'irpf', 'estadoCivil', 'hijos', 'discapacidad', 'residencia', 'ccaa', 'pagaExtra',
    // Identidad personal
    'name', 'apellidos', 'alias', 'nif', 'nss',
    // Identidad profesional (admin-managed; incluida en snapshot completo del perfil)
    'funcion', 'role', 'base', 'nivel', 'nivelActual',
    // Fechas clave
    'ingreso', 'fechaIngresoEmpresa', 'fechaOCC',
    // Preferencias UI
    'theme', 'firstAccess',
  ];

  // Campos de simulación — SOLO sesión, NUNCA persisten a Firebase ni localStorage.
  // Se crean en memoria durante el uso del simulador y se descartan al cerrar sesión.
  var SIM_FIELDS = [
    'sim_ccaa', 'sim_civil', 'sim_hijos', 'sim_discap', 'sim_residencia',
    'sim_hijos3', 'sim_ascendientes', 'sim_asc75', 'sim_pension',
    'sim_mes', 'sim_brutoAcum', 'sim_irpfAcum', 'sim_brutoResto',
    'sim_irpfActual', 'sim_avanzado',
  ];

  // Campos deprecated — se dejan de escribir; quedan inertes en Firebase
  // hasta que un GC manual los elimine. No requieren migración activa.
  var DEPRECATED_FIELDS = ['brutoAcum', 'irpfAcum', 'mesAcum', 'simHistorico'];

  // ── get ───────────────────────────────────────────────────────────────────
  // Copia defensiva del perfil financiero real — sin sim_*, sin deprecated.
  // No usa Object.freeze (compatibilidad con contextos legacy).
  function get(pd) {
    if (!pd || typeof pd !== 'object') return {};
    var out = {};
    REAL_FIELDS.forEach(function (k) {
      if (pd[k] !== undefined) out[k] = pd[k];
    });
    return out;
  }

  // ── normalize ─────────────────────────────────────────────────────────────
  // Migración lazy: si profileData.ccaa no existe pero sim_ccaa sí, promover.
  // Muta profileData directamente (compatible con flujo existente de normalización).
  function normalize(pd) {
    if (!pd || typeof pd !== 'object') return pd;
    if (!pd.ccaa && pd.sim_ccaa) {
      pd.ccaa = pd.sim_ccaa;
    }
    return pd;
  }

  // ── toFirebaseSnapshot ────────────────────────────────────────────────────
  // Solo REAL_FIELDS — excluye sim_*, deprecated, e historicoFiscal (gestionado por FiscalHistory).
  // Combinar con FiscalHistory.toFirebaseSnapshot() en saveUserData() para el snapshot completo.
  function toFirebaseSnapshot(pd) {
    if (!pd || typeof pd !== 'object') return {};
    var snap = {};
    REAL_FIELDS.forEach(function (k) {
      if (pd[k] !== undefined) snap[k] = pd[k];
    });
    return snap;
  }

  // ── toSimulationDefaults ──────────────────────────────────────────────────
  // Punto de partida para SimulationScenario — objeto mutable de sesión, NUNCA persiste.
  // El simulador puede modificarlo libremente sin afectar profileData.
  // Los acumulados (brutoAcum, irpfAcum) los provee FiscalHistory si existen.
  function toSimulationDefaults(pd) {
    return {
      ccaa:         (pd && pd.ccaa)         || 'can',
      estadoCivil:  (pd && pd.estadoCivil)  || 'soltero',
      hijos:        (pd && pd.hijos)        || 0,
      hijos3:       0,
      discapacidad: (pd && pd.discapacidad) || 0,
      residencia:   (pd && pd.residencia)   || 'no',
      ascendientes: 0,
      asc75:        0,
      pension:      0,
      avanzado:     false,
      brutoAcum:    null,
      irpfAcum:     null,
      brutoResto:   null,
      irpfActual:   (pd && pd.irpf) || null,
    };
  }

  console.log('[FinancialProfile] módulo cargado v1.0');

  return {
    REAL_FIELDS:          REAL_FIELDS,
    SIM_FIELDS:           SIM_FIELDS,
    DEPRECATED_FIELDS:    DEPRECATED_FIELDS,
    get:                  get,
    normalize:            normalize,
    toFirebaseSnapshot:   toFirebaseSnapshot,
    toSimulationDefaults: toSimulationDefaults,
  };

})();
