/**
 * avatarManager.js — PilotPay Avatar Management Module
 * Rava Tech. 2026
 *
 * Responsibilities:
 *  - Load avatars.json from the server (with simple empty fallback on failure)
 *  - Provide filtered avatar lists by role/gender
 *  - Persist selected avatar per user in Firebase / localStorage
 *  - Expose a simple API consumed by profileUI and adminUI
 *
 * ⚠️ This module does NOT touch: nómina, IRPF, SS, IT, dietas,
 *    parsers, comparativa, tablas salariales or any calculation logic.
 */

'use strict';

const AvatarManager = (() => {

  // ── CONFIG ──────────────────────────────────────────────────────────────
  const AVATARS_JSON_PATH = 'assets/avatars/avatars.json';
  const STORAGE_KEY_PREFIX = 'pilotpay_avatar_';
  const DEFAULT_AVATAR_ID  = null; // null = show initials

  // ── STATE ────────────────────────────────────────────────────────────────
  let _avatars    = [];   // full list loaded from JSON
  let _loaded     = false;
  let _loadError  = null;

  // ── LOAD ─────────────────────────────────────────────────────────────────

  /**
   * Initialise: fetch avatars.json.
   * On failure falls back to an empty list (initials display used).
   * @returns {Promise<Avatar[]>}
   */
  async function init() {
    if (_loaded) return _avatars;

    try {
      const res = await fetch(AVATARS_JSON_PATH, { cache: 'default' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _avatars = Array.isArray(data.avatars) ? data.avatars : [];
      _loaded  = true;
      console.info(`[AvatarManager] Loaded ${_avatars.length} avatars from ${AVATARS_JSON_PATH}`);
    } catch (err) {
      _loadError = err;
      console.warn(`[AvatarManager] JSON load failed (${err.message}). No avatars available — using initials.`);
      _avatars = _buildFallback();
      _loaded  = true;
    }

    return _avatars;
  }

  /**
   * Build a minimal generic fallback avatar list.
   * Used when avatars.json cannot be fetched AND no embedded AVATARS[] exists.
   * Returns an empty array — the UI will fall back to initials display.
   * NO base64-embedded images are used as fallback.
   */
  function _buildFallback() {
    // No embedded fallback: return empty list.
    // The UI handles the empty case by showing user initials.
    console.info('[AvatarManager] No avatars available — initials display will be used.');
    return [];
  }

  // ── QUERY ────────────────────────────────────────────────────────────────

  /** Return all active avatars */
  function getAll() {
    return _avatars.filter(a => a.active !== false);
  }

  /**
   * Filter by role and/or gender.
   * @param {Object} filters  { role: 'cmd'|'cop'|'tcp', gender: 'male'|'female' }
   */
  function getFiltered({ role = null, gender = null } = {}) {
    return getAll().filter(a =>
      (!role   || a.role   === role)   &&
      (!gender || a.gender === gender)
    );
  }

  /** Find a single avatar by id */
  function getById(id) {
    return _avatars.find(a => a.id === id) || null;
  }

  /**
   * Resolve the display src for an avatar entry.
   * Returns external src path (file). Data URIs are also supported if present.
   */
  function resolveSrc(avatar) {
    if (!avatar) return null;
    // If src is a data URI, use it directly
    if (avatar.src && avatar.src.startsWith('data:')) return avatar.src;
    // Otherwise return external path (relative to app root)
    return avatar.src || null;
  }

  // ── PERSISTENCE ──────────────────────────────────────────────────────────

  /**
   * Get the selected avatar id for a user.
   * Reads from profileData if available, otherwise localStorage.
   */
  function getSelectedId(userCode) {
    // Prefer in-memory profile
    if (typeof profileData !== 'undefined' && profileData.avatar !== undefined) {
      return profileData.avatar; // may be numeric index (legacy) or string id
    }
    try {
      return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userCode}`) || DEFAULT_AVATAR_ID;
    } catch { return DEFAULT_AVATAR_ID; }
  }

  /**
   * Resolve legacy numeric index to avatar object.
   * Old code stored array index; new code stores string id.
   */
  function resolveSelection(userCode) {
    const sel = getSelectedId(userCode);
    if (sel === null || sel === undefined) return null;

    // New format: string id like "avatar_03"
    if (typeof sel === 'string' && sel.startsWith('avatar_')) {
      return getById(sel);
    }
    // Legacy format: numeric index into AVATARS[]
    if (typeof sel === 'number' || /^\d+$/.test(String(sel))) {
      const idx = parseInt(sel, 10);
      return _avatars[idx] || null;
    }
    return null;
  }

  /**
   * Persist avatar selection.
   * Updates profileData.avatar (string id) and localStorage.
   * Does NOT call saveUserData — caller is responsible.
   */
  function setSelection(userCode, avatarId) {
    // Persist in profileData
    if (typeof profileData !== 'undefined') {
      profileData.avatar = avatarId;
    }
    // Persist in localStorage as backup
    try {
      if (avatarId !== null) {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${userCode}`, avatarId);
      } else {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userCode}`);
      }
    } catch { /* ignore */ }
  }

  // ── DOM HELPERS ──────────────────────────────────────────────────────────

  /**
   * Update all avatar display elements in the DOM for the current user.
   * Reads selection from profileData / localStorage.
   */
  function updateDOM(userCode) {
    const avatar = resolveSelection(userCode);
    const src    = avatar ? resolveSrc(avatar) : null;

    // Header pill
    _setAvatarEl('user-avatar-header', 'user-initials-header', src,
                 userCode ? `${userCode} ↩` : '↩');

    // Profile hero
    _setAvatarEl('prf-avatar-img', 'prf-avatar-initials', src, '👤');
  }

  function _setAvatarEl(imgId, fallbackId, src, fallbackText) {
    const img      = document.getElementById(imgId);
    const fallback = document.getElementById(fallbackId);
    if (!img || !fallback) return;

    if (src) {
      img.src              = src;
      img.style.display    = 'block';
      fallback.style.display = 'none';
    } else {
      img.style.display    = 'none';
      fallback.textContent = fallbackText;
      fallback.style.display = '';
    }
  }

  // ── ADMIN OPERATIONS ─────────────────────────────────────────────────────

  /**
   * Return ALL avatars including inactive ones (for admin view).
   */
  function getAllIncludingInactive() {
    return [..._avatars];
  }

  /**
   * Toggle the active flag of an avatar by id.
   * Updates the in-memory list immediately.
   * Persisting to server is out of scope (static JSON) — caller may
   * snapshot the state via getAllIncludingInactive() if needed.
   * @param {string} id
   * @returns {boolean} new active state
   */
  function toggleActive(id) {
    const av = _avatars.find(a => a.id === id);
    if (!av) return false;
    av.active = !av.active;
    return av.active;
  }

  /**
   * Add a new avatar to the in-memory list.
   * Auto-generates an id based on current list length.
   * @param {{ name, role, gender, src }} fields
   * @returns {object} the new avatar entry
   */
  function addAvatar({ name, role, gender, src }) {
    const idx  = _avatars.length + 1;
    const id   = `avatar_${String(idx).padStart(2, '0')}`;
    const entry = {
      id,
      role:   role   || 'cmd',
      gender: gender || 'male',
      name:   name   || `Avatar ${idx}`,
      src:    src    || '',
      active: true,
    };
    _avatars.push(entry);
    return entry;
  }

  // ── PUBLIC API ───────────────────────────────────────────────────────────

  return {
    init,
    getAll,
    getFiltered,
    getById,
    resolveSrc,
    getSelectedId,
    resolveSelection,
    setSelection,
    updateDOM,
    // Admin
    getAllIncludingInactive,
    toggleActive,
    addAvatar,
    /** Raw array access for admin panel (same as getAllIncludingInactive) */
    _getRaw: getAllIncludingInactive,

    /** True once init() has completed */
    get loaded() { return _loaded; },

    /** Last load error, or null */
    get loadError() { return _loadError; },
  };

})();

// Make available globally (consumed by inline scripts in index.html)
if (typeof window !== 'undefined') {
  window.AvatarManager = AvatarManager;
}

// ES module export (for future bundler use)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AvatarManager;
}
