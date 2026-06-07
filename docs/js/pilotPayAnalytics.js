/**
 * PilotPay Analytics — Telemetría MVP
 *
 * Sistema mínimo de telemetría para beta cerrada.
 * Registra 5 eventos críticos para decisiones de producto.
 *
 * Arquitectura:
 * - localStorage: buffer local (últimos 1000 eventos)
 * - Firebase: eventos crudos por usuario
 * - Sin agregaciones automáticas
 * - Sin dashboards
 *
 * Eventos:
 * 1. audit_complete
 * 2. audit_abandoned
 * 3. module_view
 * 4. error_occurred
 * 5. sync_result
 */

(function(window) {
  'use strict';

  const MAX_LOCAL_EVENTS = 1000;
  const UPLOAD_BATCH_SIZE = 50;

  // Estado de auditoría en progreso (para detectar abandonos)
  let currentAuditSession = null;

  /**
   * Generar ID único para evento
   */
  function generateEventId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * FIX 5: Obtener o generar deviceId único
   */
  function getDeviceId() {
    const DEVICE_ID_KEY = 'pilotpay_device_id';
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generar deviceId único: timestamp + random
      deviceId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      try {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      } catch (e) {
        console.warn('[Analytics] Cannot save deviceId to localStorage:', e);
      }
    }

    return deviceId;
  }

  /**
   * Obtener clave localStorage para usuario actual
   */
  function getStorageKey() {
    if (!window.currentUser) {
      console.warn('[Analytics] No user logged in, using fallback key');
      return 'pilotpay:_anonymous:analytics';
    }
    return `pilotpay:${window.currentUser}:analytics`;
  }

  /**
   * Obtener eventos locales
   */
  function getLocalEvents() {
    try {
      const key = getStorageKey();
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[Analytics] Error reading local events:', e);
      return [];
    }
  }

  /**
   * Guardar eventos locales
   */
  function saveLocalEvents(events) {
    try {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(events));
    } catch (e) {
      console.error('[Analytics] Error saving local events:', e);
    }
  }

  /**
   * Registrar evento
   *
   * @param {string} action - Tipo de evento
   * @param {object} data - Datos del evento
   */
  function track(action, data = {}) {
    if (!window.currentUser) {
      console.warn('[Analytics] Cannot track event without user session');
      return;
    }

    const event = {
      eventId: generateEventId(),
      userId: window.currentUser,
      deviceId: getDeviceId(),  // FIX 5: Usar getDeviceId() en lugar de lectura directa
      action: action,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      ...data
    };

    // Guardar local
    const events = getLocalEvents();
    events.push(event);

    // FIFO: mantener solo últimos MAX_LOCAL_EVENTS
    if (events.length > MAX_LOCAL_EVENTS) {
      events.splice(0, events.length - MAX_LOCAL_EVENTS);
    }

    saveLocalEvents(events);

    // Log en desarrollo
    if (localStorage.getItem('pilotpay_analytics_debug') === '1') {
      console.log('[Analytics] Event tracked:', action, data);
    }

    // Upload batch cada UPLOAD_BATCH_SIZE eventos
    if (events.length % UPLOAD_BATCH_SIZE === 0) {
      uploadBatch(events.slice(-UPLOAD_BATCH_SIZE));
    }
  }

  /**
   * Upload batch de eventos a Firebase
   */
  function uploadBatch(events) {
    if (!window.currentUser) return;
    if (typeof window.fbUpdate !== 'function') {
      console.warn('[Analytics] Firebase not available, skipping upload');
      return;
    }

    events.forEach(event => {
      const path = `pilotpay/analytics/${window.currentUser}/events/${event.eventId}`;
      window.fbUpdate(path, event).catch(err => {
        console.error('[Analytics] Upload failed:', err);
      });
    });

    if (localStorage.getItem('pilotpay_analytics_debug') === '1') {
      console.log('[Analytics] Uploaded batch:', events.length, 'events');
    }
  }

  /**
   * Flush todos los eventos pendientes a Firebase
   */
  function flush() {
    const events = getLocalEvents();
    if (events.length > 0) {
      uploadBatch(events);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUDIT SESSION TRACKING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Iniciar sesión de auditoría
   */
  function startAuditSession(mes, anio) {
    currentAuditSession = {
      mes: mes,
      anio: anio,
      startedAt: Date.now(),
      lastPhase: null,
      hasVariables: false,
      hasCalculation: false,
      hasNomina: false,
      hasComparison: false
    };
  }

  /**
   * Actualizar fase de auditoría
   */
  function updateAuditPhase(phase, success = true) {
    if (!currentAuditSession) return;

    currentAuditSession.lastPhase = phase;

    if (phase === 'variables' && success) {
      currentAuditSession.hasVariables = true;
    } else if (phase === 'calcular' && success) {
      currentAuditSession.hasCalculation = true;
    } else if (phase === 'nomina' && success) {
      currentAuditSession.hasNomina = true;
    } else if (phase === 'comparar' && success) {
      currentAuditSession.hasComparison = true;
    }
  }

  /**
   * Completar auditoría (éxito)
   */
  function completeAudit(data) {
    if (currentAuditSession) {
      const timeSpent = Date.now() - currentAuditSession.startedAt;

      track('audit_complete', {
        mes: currentAuditSession.mes,
        anio: currentAuditSession.anio,
        timeSpent: timeSpent,
        ...data
      });

      currentAuditSession = null;
    } else {
      // Fallback: auditoría completada sin sesión trackeada
      track('audit_complete', data);
    }
  }

  /**
   * Abandonar auditoría
   */
  function abandonAudit(reason = 'unknown') {
    if (!currentAuditSession) return;

    const timeSpent = Date.now() - currentAuditSession.startedAt;

    track('audit_abandoned', {
      mes: currentAuditSession.mes,
      anio: currentAuditSession.anio,
      lastPhase: currentAuditSession.lastPhase,
      timeSpent: timeSpent,
      hasVariables: currentAuditSession.hasVariables,
      hasCalculation: currentAuditSession.hasCalculation,
      hasNomina: currentAuditSession.hasNomina,
      hasComparison: currentAuditSession.hasComparison,
      reason: reason
    });

    currentAuditSession = null;
  }

  /**
   * Verificar si hay auditoría en progreso al cambiar de módulo
   *
   * FIX 3: No disparar abandono en navegación a Historial/Dashboard
   * (flujo normal: ver auditorías previas durante workflow)
   */
  function checkAbandonOnModuleChange(newModule) {
    // Módulos del workspace de auditoría
    const auditModules = ['variables', 'calcular', 'nomina', 'comparar'];

    // FIX 3: Módulos permitidos que NO disparan abandono
    const allowedModules = ['historial', 'dashboard'];

    if (currentAuditSession &&
        !auditModules.includes(newModule) &&
        !allowedModules.includes(newModule)) {
      abandonAudit('module_change');
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PUBLIC API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.PilotPayAnalytics = {
    // Core tracking
    track: track,
    flush: flush,

    // Audit session tracking
    startAuditSession: startAuditSession,
    updateAuditPhase: updateAuditPhase,
    completeAudit: completeAudit,
    abandonAudit: abandonAudit,
    checkAbandonOnModuleChange: checkAbandonOnModuleChange,

    // Utilities
    getLocalEvents: getLocalEvents,

    // Debug
    getCurrentSession: function() {
      return currentAuditSession;
    }
  };

  // FIX 4: Eliminar abandono en beforeunload (causa falsos positivos en F5/refresh)
  // La auditoría puede continuar tras reload desde MonthRecord.
  // Solo flush eventos pendientes (aunque también puede fallar por timeout).
  window.addEventListener('beforeunload', function() {
    flush();
  });

  console.log('[PilotPay Analytics] Initialized');

})(window);
