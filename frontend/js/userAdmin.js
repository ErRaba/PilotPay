/**
 * UserAdmin v1.0 — lógica administrativa centralizada.
 *
 * Responsabilidades:
 *   - Cambio atómico de rol/base/nivel (propagación a todos los nodos)
 *   - Validación y normalización de nivel según función
 *   - Actualización coherente: Firebase /usuarios + /perfiles + /permisos
 *                              runtime USERS/perms/profileData
 *                              localStorage caché de perfil y permisos
 *
 * Lo que NO hace:
 *   - Llamar a initApp() — usa refresh selectivo
 *   - Gestionar nombre/apellidos/pass/alias — son campos de identidad personal
 *   - Gestionar datos fiscales, simulador, auditorías
 *   - Sincronización remota / offline queue
 *
 * Accede a globals de index.html via window.* (arquitectura híbrida actual).
 */

var UserAdmin = (function () {
  'use strict';

  // ── Rangos de nivel por función ──────────────────────────────────────────
  // Fuente: onAdmFuncionChange() y editarUsuario() en index.html
  //   TCP   (SCC/CC):  niveles 1-5
  //   Piloto (CMD/COP): niveles 1-6
  var _NIVEL_MAX = { CMD: 6, COP: 6, SCC: 5, CC: 5 };

  function clampNivelForRole(role, nivel) {
    var max = _NIVEL_MAX[role] || 6;
    var n   = parseInt(nivel, 10);
    if (isNaN(n) || n < 1) n = 1;
    return Math.min(n, max);
  }

  // ── Helpers internos ─────────────────────────────────────────────────────

  function _resolveBase(base) {
    if (typeof window.getBaseCode === 'function') return window.getBaseCode(base);
    if (base === 'GC' || base === 'TFN' || base === 'MAD') return base;
    return parseFloat(base) > 1 ? 'MAD' : 'GC';
  }

  function _fbUpdate(path, data) {
    return (typeof window.fbUpdate === 'function')
      ? window.fbUpdate(path, data)
      : Promise.resolve();
  }

  function _fbSet(path, data) {
    return (typeof window.fbSet === 'function')
      ? window.fbSet(path, data)
      : Promise.resolve();
  }

  // ── Refresh selectivo del usuario activo ─────────────────────────────────
  // No llama a initApp(). Actualiza solo los elementos afectados por un
  // cambio de rol: badge/header, selectores calculadora, nivel dots,
  // dashboard y perfil si están renderizados.
  function _refreshActiveUserUI() {
    var userId = window.currentUser;
    var u  = (window.USERS && userId) ? (window.USERS[userId] || {}) : {};
    var pd = window.profileData || {};

    var fn  = pd.funcion || u.funcion || '';
    var nvl = pd.nivelActual != null ? pd.nivelActual
            : (pd.nivel     != null ? pd.nivel : (u.nivel || ''));
    var base     = pd.base || u.base || '';
    var isAdmin  = userId === window.ADMIN_CODE;
    var fnBadge  = { CMD:'CMD', COP:'COP', SCC:'SCC', CC:'CC' };
    var baseLabel = (typeof window.getBaseLabelShort === 'function')
      ? window.getBaseLabelShort(base) : base;

    // 1. Header badge
    var badgeEl = document.getElementById('header-badge');
    if (badgeEl) {
      badgeEl.textContent = (fnBadge[fn] || fn)
        + ' · NVL' + nvl
        + ' · ' + baseLabel
        + (isAdmin ? ' · ADMIN' : '');
    }

    // 2. Selectores en calculadora (funcion / base)
    var funcEl = document.getElementById('funcion');
    var baseEl = document.getElementById('base');
    if (funcEl) funcEl.value = fn;
    if (baseEl && typeof window.getBaseFactor === 'function') {
      baseEl.value = window.getBaseFactor(base);
    }

    // 2b. Panel piloto↔TCP y permisos de calculadora (sin applyUserPerms bloqueará el selector)
    if (typeof window.applyUserPerms  === 'function') window.applyUserPerms();
    if (typeof window.onFuncionChange === 'function') window.onFuncionChange();
    if (typeof window.onBaseChange    === 'function') window.onBaseChange();

    // 3. Nivel dots
    if (typeof window.highlightNivel === 'function') window.highlightNivel();

    // 4. Dashboard (solo si ya está renderizado — es idempotente)
    if (typeof window.renderDashboard === 'function') window.renderDashboard();

    // 5. Perfil (solo si la pestaña existe)
    if (typeof window.renderPerfil === 'function') window.renderPerfil();
  }

  // ── atomicRoleChange ─────────────────────────────────────────────────────
  // Propaga cambio de funcion/nivel/base a todos los nodos de forma atómica.
  //
  // Orden de escritura (de menor a mayor impacto en caso de fallo parcial):
  //   A) Firebase /usuarios  — identidad admin
  //   B) Firebase /perfiles  — perfil del usuario
  //   C) Firebase /permisos  — permisos de calculadora
  //   D) Runtime: USERS, perms, profileData (si es currentUser)
  //   E) localStorage: caché perfil y perms
  //
  // Devuelve siempre un resultado estructurado. Nunca lanza.
  async function atomicRoleChange(code, opts) {
    var funcion  = opts.funcion;
    var base     = _resolveBase(opts.base);
    var nivel    = clampNivelForRole(funcion, opts.nivel);
    var warnings = [];

    // Patch para /usuarios: usa 'nivel' (legacy) + 'nivelActual' (canónico)
    var identityPatch = {
      funcion    : funcion,
      nivel      : nivel,     // legacy mirror — /usuarios aún lo usa para display
      nivelActual: nivel,
      base       : base,
    };

    // Patch para /perfiles: incluye 'role' (alias canónico P1-a)
    var perfilPatch = {
      funcion    : funcion,
      role       : funcion,
      nivel      : nivel,
      nivelActual: nivel,
      base       : base,
    };

    // Permisos bloqueados a la nueva función y base
    var newPerms = { funciones: [funcion], bases: [base] };

    try {
      // A) Firebase /usuarios
      await _fbUpdate('pilotpay/usuarios/' + code, identityPatch);

      // B) Firebase /perfiles
      await _fbUpdate('pilotpay/perfiles/' + code, perfilPatch);

      // C) Firebase /permisos
      await _fbSet('pilotpay/permisos/' + code, newPerms);

      // D-1) Runtime: USERS
      if (window.USERS && window.USERS[code]) {
        window.USERS[code] = Object.assign({}, window.USERS[code], identityPatch);
      }

      // D-2) Runtime: perms (cache en memoria)
      if (window.perms) window.perms[code] = newPerms;

      // D-3) Cache local de perms (sin re-subir — ya se hizo en C)
      try {
        localStorage.setItem('pilotpay_perms_cache', JSON.stringify(window.perms || {}));
      } catch (e) {
        warnings.push('perms-cache-localStorage: ' + e.message);
      }

      // E) Si es el usuario activo — propagar a profileData y caché local
      if (code === window.currentUser) {
        if (window.profileData) {
          window.profileData.funcion     = funcion;
          window.profileData.role        = funcion;
          window.profileData.nivelActual = nivel;
          window.profileData.nivel       = nivel;
          window.profileData.base        = base;
        }
        window.currentNivel = nivel;

        try {
          localStorage.setItem(
            'pilotpay_v2_' + code,
            JSON.stringify(window.profileData || {})
          );
        } catch (e) {
          warnings.push('profile-localStorage: ' + e.message);
        }

        // Refresh UI selectivo (sin initApp)
        _refreshActiveUserUI();
      }

    } catch (err) {
      return {
        ok      : false,
        code    : code,
        error   : err.message || String(err),
        updated : null,
        warnings: warnings,
        source  : 'admin',
      };
    }

    return {
      ok     : true,
      code   : code,
      updated: { funcion: funcion, role: funcion, nivelActual: nivel, base: base },
      warnings: warnings,
      source  : 'admin',
    };
  }

  console.log('[UserAdmin] módulo cargado v1.0');

  // ── API PÚBLICA ───────────────────────────────────────────────────────────
  return {
    // Validación
    clampNivelForRole: clampNivelForRole,

    // Operación central
    atomicRoleChange: atomicRoleChange,
  };

})();
