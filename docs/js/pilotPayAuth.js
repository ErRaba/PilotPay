/**
 * pilotPayAuth.js — Módulo de autenticación Email/Password (Fase 1.1, commit C3)
 *
 * ADITIVO. NO sustituye doLogin() ni toca el flujo actual de la app.
 * No se carga en index.html todavía (integración en Fase 1.3).
 * Único símbolo global: window.PilotPayAuth.
 *
 * Convive con el stack anónimo existente (fbSignIn/getAuthToken) sin tocarlo.
 *
 * Modelo de identidad (Fase 1.0 / CLI C2):
 *   - email   : {code en minúsculas}@pilotpay.internal
 *   - claims  : { role, code } embebidos en el idToken (los fija el Admin SDK)
 *   - sesión  : localStorage.pilotpay_auth_session = { refreshToken, uid, code, role, email, savedAt }
 *
 * NOTA sobre la API key: es PÚBLICA por diseño (ya está en index.html). No es un
 * secreto. La seguridad viene de Firebase Auth + reglas, no de ocultarla.
 */
(function () {
  'use strict';

  // ── Config pública del proyecto (idéntica a index.html) ──────────────────
  var FB_KEY = 'AIzaSyAPgJfxBoqv_bKuVDDjvU927nQe-b0cCbQ';
  var FB_URL = 'https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app';
  var EMAIL_DOMAIN = 'pilotpay.internal';
  var SESSION_KEY = 'pilotpay_auth_session';
  var EXP_MARGIN_MS = 60000; // renovar 60s antes de caducar (igual que fbSignIn actual)

  // ── Estado en memoria (no global) ────────────────────────────────────────
  var _idToken = null;
  var _idTokenExp = 0;
  var _refreshToken = null;
  var _session = null; // { uid, code, role, email }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function emailFor(code) { return String(code).toLowerCase() + '@' + EMAIL_DOMAIN; }

  // Decodifica el payload de un JWT (base64url) sin verificar firma.
  // La verificación la hace Firebase en cada uso del token; aquí solo leemos claims.
  function decodeJwtPayload(idToken) {
    try {
      var part = idToken.split('.')[1];
      var b64 = part.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      var json = decodeURIComponent(
        atob(b64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(json);
    } catch (e) {
      return {};
    }
  }

  function persistSession() {
    if (!_session || !_refreshToken) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        refreshToken: _refreshToken,
        uid: _session.uid,
        code: _session.code,
        role: _session.role,
        email: _session.email,
        savedAt: new Date().toISOString()
      }));
    } catch (e) { /* almacenamiento lleno o bloqueado — no fatal */ }
  }

  function clearPersistedSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  // Mapea errores de Firebase a mensajes neutros (no filtra si el código existe).
  function neutralAuthError(fbMessage) {
    if (fbMessage === 'USER_DISABLED') {
      return new Error('Cuenta deshabilitada. Contacta con el administrador.');
    }
    // INVALID_LOGIN_CREDENTIALS (enumeration protection ON), o los legacy
    // EMAIL_NOT_FOUND / INVALID_PASSWORD si estuviera OFF → mismo mensaje.
    return new Error('Código o contraseña incorrectos.');
  }

  // ── API pública ─────────────────────────────────────────────────────────

  /**
   * Inicia sesión con código + contraseña.
   * @returns {Promise<{code, role, uid}>}
   */
  async function signIn(code, password) {
    if (!code || !password) throw new Error('Código y contraseña requeridos.');
    var resp = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + FB_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailFor(code), password: password, returnSecureToken: true })
      }
    );
    var data = await resp.json().catch(function () { return {}; });
    if (!resp.ok) {
      throw neutralAuthError((data.error || {}).message || '');
    }

    _idToken = data.idToken;
    _refreshToken = data.refreshToken;
    _idTokenExp = Date.now() + parseInt(data.expiresIn, 10) * 1000;

    var claims = decodeJwtPayload(_idToken);
    _session = {
      uid: data.localId,
      code: claims.code || null,
      role: claims.role || null,
      email: data.email || emailFor(code)
    };
    persistSession();
    return { code: _session.code, role: _session.role, uid: _session.uid };
  }

  /**
   * Devuelve un idToken vigente, renovando con el refresh token si hace falta.
   * Sin red y sin token en memoria → null (contrato compatible con getAuthToken()).
   */
  async function getToken() {
    if (_idToken && Date.now() < _idTokenExp - EXP_MARGIN_MS) return _idToken;
    if (!_refreshToken) return _idToken && Date.now() < _idTokenExp ? _idToken : null;

    try {
      var r = await fetch(
        'https://securetoken.googleapis.com/v1/token?key=' + FB_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(_refreshToken)
        }
      );
      if (!r.ok) {
        // Refresh token revocado (disable/reset) o inválido → sesión muerta.
        return null;
      }
      var d = await r.json();
      _idToken = d.id_token;
      _refreshToken = d.refresh_token; // securetoken rota el refresh token → re-persistir
      _idTokenExp = Date.now() + parseInt(d.expires_in, 10) * 1000;
      persistSession();
      return _idToken;
    } catch (e) {
      // Sin red: devolver el token en memoria solo si aún es válido.
      return _idToken && Date.now() < _idTokenExp ? _idToken : null;
    }
  }

  /** Sesión actual (claims), sin red. */
  function getSession() {
    return _session ? { code: _session.code, role: _session.role, uid: _session.uid } : null;
  }

  /**
   * Restaura la sesión persistida al arrancar. NO hace red (offline-first):
   * deja el refresh token listo para renovar de forma perezosa en getToken().
   * @returns {boolean} true si había sesión restaurable.
   */
  function restoreSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return false;
      var s = JSON.parse(raw);
      if (!s || !s.refreshToken || !s.uid) return false;
      _refreshToken = s.refreshToken;
      _session = { uid: s.uid, code: s.code || null, role: s.role || null, email: s.email || null };
      _idToken = null;       // se obtiene perezosamente con getToken()
      _idTokenExp = 0;
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Cierra sesión: borra estado en memoria y persistido. */
  function signOut() {
    _idToken = null;
    _idTokenExp = 0;
    _refreshToken = null;
    _session = null;
    clearPersistedSession();
  }

  /** true si hay una sesión restaurable/activa. */
  function isAvailable() {
    return !!(_session && _refreshToken);
  }

  window.PilotPayAuth = {
    signIn: signIn,
    getToken: getToken,
    getSession: getSession,
    restoreSession: restoreSession,
    signOut: signOut,
    isAvailable: isAvailable,
    // expuesto solo para el harness de pruebas / diagnóstico:
    _emailFor: emailFor,
    _fbUrl: FB_URL
  };
})();
