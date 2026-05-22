/**
 * UserProfile v1.0 — normalización, aliases y helpers derivados del perfil.
 *
 * P1-a: aliases de compatibilidad (nivelActual, fechaIngresoEmpresa, role),
 *        normalización de base, campos derivados internos (_antiguedadLabel, etc.).
 *
 * No toca: cálculos, auditorías, sync, Firebase, dashboard.
 *
 * Regla: PilotPay avisa, no decide.
 *   - nivelActual es editable por el usuario y se usa en cálculos.
 *   - calcularProximoCambioNivel() existe internamente pero NO está conectado
 *     a la UI hasta validar UMBRAL_NIVEL contra convenio BCSA-2024.
 */

var UserProfile = (function () {
  'use strict';

  // ── Normalización de base ────────────────────────────────────────────────────
  // Delega en window.getBaseCode() si está disponible (definida en index.html).
  // Fallback propio con la misma lógica si el contexto no la tiene.
  function normalizeBase(base) {
    if (typeof window.getBaseCode === 'function') return window.getBaseCode(base);
    if (!base) return 'GC';
    var s = String(base).trim();
    if (s === 'GC' || s === 'TFN' || s === 'MAD') return s;
    return parseFloat(s) > 1 ? 'MAD' : 'GC';
  }

  // ── normalizeProfile ─────────────────────────────────────────────────────────
  // Toma profileData raw (de Firebase, localStorage o USERS seed) y devuelve
  // una copia normalizada con aliases canónicos añadidos.
  //
  // Campos nuevos añadidos:
  //   role              ← alias de funcion (para compatibilidad futura sync/API)
  //   nivelActual       ← alias canónico de nivel, editable, usado en cálculos
  //   fechaIngresoEmpresa ← alias canónico de ingreso, formato ISO
  //   fechaOCC          ← campo nuevo, null si no existe
  //
  // Campos legacy mantenidos sin cambio:
  //   funcion, nivel, ingreso — siguen funcionando igual para todo el código existente
  //
  // Función PURA — sin side effects, sin escritura.
  function normalizeProfile(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    var p = Object.assign({}, raw);

    // role: alias de funcion — no renombrar todavía (78 usos en codebase)
    p.role = p.funcion || null;

    // nivelActual: campo canónico — nivel (legacy) sigue como alias de lectura
    if (p.nivelActual == null) {
      p.nivelActual = (p.nivel != null) ? p.nivel : 3;
    }

    // fechaIngresoEmpresa: campo canónico ISO — ingreso (legacy) sigue como alias
    if (!p.fechaIngresoEmpresa) {
      p.fechaIngresoEmpresa = p.ingreso || null;
    }

    // fechaOCC: garantizar existencia del campo (null si no definido)
    if (!Object.prototype.hasOwnProperty.call(p, 'fechaOCC')) {
      p.fechaOCC = null;
    }

    // base: normalizar formato siempre ('1.2' → 'MAD', etc.)
    // Usa la misma lógica que getBaseCode() en index.html
    if (p.base) p.base = normalizeBase(p.base);

    // hijos, discapacidad: garantizar tipo numérico (venían como strings en legacy)
    if (typeof p.hijos === 'string')        p.hijos        = parseInt(p.hijos, 10)      || 0;
    if (typeof p.discapacidad === 'string') p.discapacidad = parseFloat(p.discapacidad) || 0;

    return p;
  }

  // ── deriveProfile ────────────────────────────────────────────────────────────
  // Añade campos calculados en runtime al perfil normalizado.
  // Los campos derivados empiezan con '_' — nunca se persisten en Firebase ni
  // localStorage. Se recalculan en cada llamada.
  function deriveProfile(p) {
    if (!p || typeof p !== 'object') return p;
    var derived = Object.assign({}, p);
    var hoy    = new Date();
    var MS_ANIO = 365.25 * 24 * 3600 * 1000;
    var MS_MES  = 30.44  * 24 * 3600 * 1000;

    // Antigüedad en empresa
    var fechaIngreso = p.fechaIngresoEmpresa || p.ingreso;
    if (fechaIngreso) {
      var ingreso = new Date(fechaIngreso);
      if (!isNaN(ingreso)) {
        derived._antiguedadAnios = (hoy - ingreso) / MS_ANIO;
        derived._antiguedadLabel = _formatPeriodo(hoy, ingreso, MS_MES);
      }
    }

    // Años en función:
    //   CMD con fechaOCC → cuenta desde OCC
    //   Resto            → cuenta desde ingreso
    var fechaRef = (p.funcion === 'CMD' && p.fechaOCC)
      ? p.fechaOCC
      : fechaIngreso;
    if (fechaRef) {
      var ref = new Date(fechaRef);
      if (!isNaN(ref)) {
        derived._aniosEnFuncion      = (hoy - ref) / MS_ANIO;
        derived._aniosEnFuncionLabel = _formatPeriodo(hoy, ref, MS_MES);
      }
    }

    // Próximo cambio de nivel — FEATURE FLAG: desactivado hasta validar
    // la tabla UMBRAL_NIVEL contra el convenio BCSA-2024.
    // derived._proximoCambioNivel = _calcProximoCambioNivel(p);
    // ↑ Descomentar en la fase correspondiente tras validación.

    return derived;
  }

  function _formatPeriodo(hoy, desde, MS_MES) {
    var totalMeses = Math.floor((hoy - desde) / MS_MES);
    if (totalMeses < 0) totalMeses = 0;
    var anos  = Math.floor(totalMeses / 12);
    var mRest = totalMeses % 12;
    if (anos === 0)  return mRest + (mRest === 1 ? ' mes'  : ' meses');
    if (mRest === 0) return anos  + (anos  === 1 ? ' año'  : ' años');
    return anos + (anos === 1 ? ' año' : ' años') + ' y ' +
           mRest + (mRest === 1 ? ' mes' : ' meses');
  }

  // ── calcularProximoCambioNivel ───────────────────────────────────────────────
  // INTERNO — no conectado a UI hasta validar UMBRAL_NIVEL vs convenio BCSA-2024.
  // Disponible para debug/testing: UserProfile._calcProximoCambioNivel(profile).
  //
  // Tabla PROVISIONAL — los umbrales (años desde fechaRef para alcanzar ese nivel)
  // deben verificarse contra el texto del convenio antes de mostrarse al usuario.
  var _UMBRAL_NIVEL = {
    2: 1, 3: 2, 4: 3, 5: 5, 6: 7, 7: 9, 8: 12, 9: 15
  };

  function _calcProximoCambioNivel(p) {
    var nivel = p.nivelActual != null ? p.nivelActual : (p.nivel || 1);
    if (nivel >= 9) {
      return { proximoNivel: null, puedeRevisar: false, nota: 'Nivel máximo alcanzado' };
    }

    var fechaRef = (p.funcion === 'CMD' && p.fechaOCC)
      ? p.fechaOCC
      : (p.fechaIngresoEmpresa || p.ingreso);
    if (!fechaRef) {
      return { proximoNivel: null, puedeRevisar: false, nota: 'Sin fecha de referencia' };
    }

    var ref = new Date(fechaRef);
    if (isNaN(ref)) {
      return { proximoNivel: null, puedeRevisar: false, nota: 'Fecha inválida' };
    }

    var umbral = _UMBRAL_NIVEL[nivel + 1];
    if (umbral == null) {
      return { proximoNivel: null, puedeRevisar: false };
    }

    var hoy          = new Date();
    var MS_ANIO      = 365.25 * 24 * 3600 * 1000;
    var fechaProxima = new Date(ref.getTime() + umbral * MS_ANIO);
    var mesesRest    = Math.round((fechaProxima - hoy) / (30.44 * 24 * 3600 * 1000));
    var puedeRevisar = fechaProxima <= hoy;

    return {
      proximoNivel   : nivel + 1,
      fechaEstimada  : fechaProxima.toISOString().slice(0, 10),
      mesesRestantes : Math.max(0, mesesRest),
      puedeRevisar,
      nota           : 'PROVISIONAL — pendiente validación convenio BCSA-2024'
    };
  }

  // ── Helpers de acceso semántico ──────────────────────────────────────────────
  // Fachada sobre el perfil normalizado. Cada helper acepta un objeto perfil
  // (preferiblemente ya procesado por normalizeProfile) y devuelve el campo
  // correspondiente con fallback seguro.
  //
  // Propósito: lectura semántica sin acceso directo a campos legacy ni raw.
  // No modifican el perfil. Todos son puros.

  function getRole(p) {
    return (p && (p.role || p.funcion)) || null;
  }

  function getNivelActual(p) {
    if (!p) return 3;
    return p.nivelActual != null ? p.nivelActual : (p.nivel != null ? p.nivel : 3);
  }

  function getFechaIngresoEmpresa(p) {
    return (p && (p.fechaIngresoEmpresa || p.ingreso)) || null;
  }

  function getFechaOCC(p) {
    if (!p) return null;
    return p.fechaOCC != null ? p.fechaOCC : null;
  }

  // Base helpers — extraen base del perfil y la interpretan.
  // Delegan en window.* si están disponibles (fuente canónica en index.html)
  // para garantizar consistencia absoluta.

  function _baseVal(p) { return p ? (p.base || null) : null; }

  function getBaseCode(p) {
    var b = _baseVal(p);
    if (typeof window.getBaseCode === 'function') return window.getBaseCode(b);
    if (!b) return 'GC';
    if (b === 'GC' || b === 'TFN' || b === 'MAD') return b;
    return parseFloat(b) > 1 ? 'MAD' : 'GC';
  }

  function getBaseLabel(p) {
    var b = _baseVal(p);
    if (typeof window.getBaseLabel === 'function') return window.getBaseLabel(b);
    if (b === 'MAD' || parseFloat(b) > 1) return 'Madrid';
    if (b === 'TFN') return 'Tenerife';
    return 'Gran Canaria';
  }

  function getBaseFactor(p) {
    var b = _baseVal(p);
    if (typeof window.getBaseFactor === 'function') return window.getBaseFactor(b);
    if (b === 'MAD' || parseFloat(b) > 1) return '1.2';
    return '1';
  }

  console.log('[UserProfile] módulo cargado v1.1');

  // ── API PÚBLICA ───────────────────────────────────────────────────────────────
  return {
    // Normalización
    normalizeBase   : normalizeBase,
    normalizeProfile: normalizeProfile,

    // Derivados en runtime (no persisten)
    deriveProfile   : deriveProfile,

    // Helpers de acceso semántico (fachada sobre perfil normalizado)
    getRole                : getRole,
    getNivelActual         : getNivelActual,
    getFechaIngresoEmpresa : getFechaIngresoEmpresa,
    getFechaOCC            : getFechaOCC,
    getBaseCode            : getBaseCode,
    getBaseLabel           : getBaseLabel,
    getBaseFactor          : getBaseFactor,

    // Interno — disponible para debug/testing, NO para UI todavía
    _calcProximoCambioNivel: _calcProximoCambioNivel
  };

})();
