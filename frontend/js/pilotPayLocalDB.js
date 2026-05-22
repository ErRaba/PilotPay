/**
 * PilotPayLocalDB — capa de acceso a IndexedDB para PilotPay
 *
 * Arquitectura: la app habla SOLO con esta API pública.
 * IndexedDB raw (transactions, cursores, objectStore) queda encapsulado aquí.
 *
 * Fase 0: esquema completo definido, migración localStorage → IDB, sin sync real.
 * Fase 2: añadir pendingSyncQueue y SyncEngine.
 * Fase 3: appSettings, limpieza de localStorage.
 */

var PilotPayLocalDB = (function () {

  // ── Constantes ──────────────────────────────────────────────────────────────

  var DB_NAME    = 'PilotPayLocalDB';
  var DB_VERSION = 1;

  // _syncState semántico por fase:
  //   'local_only' — Fase 0/1: existe solo en este dispositivo, sin sync real
  //   'pending'    — Fase 2: en cola para subir a Firebase
  //   'synced'     — Fase 2: confirmado en Firebase
  //   'conflict'   — Fase 3: conflicto detectado, pendiente de resolución
  var SYNC_LOCAL_ONLY = 'local_only';

  // ── DeviceId ─────────────────────────────────────────────────────────────────

  var _deviceId = null;

  function _getOrCreateDeviceId() {
    if (_deviceId) return _deviceId;
    var stored = localStorage.getItem('pilotpay_device_id');
    if (stored) { _deviceId = stored; return _deviceId; }
    // Genera ID único por dispositivo: prefijo + timestamp + random
    var ts  = Date.now().toString(36);
    var rnd = Math.random().toString(36).slice(2, 8);
    _deviceId = 'dev_' + ts + '_' + rnd;
    localStorage.setItem('pilotpay_device_id', _deviceId);
    return _deviceId;
  }

  // ── Hash ligero (djb2) ───────────────────────────────────────────────────────
  // No criptográfico. Sirve para detectar cambios y comparar versiones.

  function _hash(obj) {
    try {
      var str = JSON.stringify(obj);
      var h = 5381;
      for (var i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i);
        h = h & h; // convierte a int32
      }
      // Devuelve hex unsigned
      return (h >>> 0).toString(16).padStart(8, '0');
    } catch (e) {
      return '00000000';
    }
  }

  // ── Apertura de DB ───────────────────────────────────────────────────────────

  var _dbPromise = null;

  function _openDB() {
    if (_dbPromise) return _dbPromise;

    _dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('[PilotPayLocalDB] IndexedDB no disponible en este entorno'));
        return;
      }

      var req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = function (evt) {
        var db = evt.target.result;

        // ── monthlyRecords ──
        if (!db.objectStoreNames.contains('monthlyRecords')) {
          var mrs = db.createObjectStore('monthlyRecords', { keyPath: 'id' });
          mrs.createIndex('byUser',      'userId',              { unique: false });
          mrs.createIndex('byUserYear',  ['userId', 'year'],    { unique: false });
          mrs.createIndex('byState',     ['userId', 'estado'],  { unique: false });
          mrs.createIndex('byUpdated',   '_updatedAt',          { unique: false });
        }

        // ── auditHistory ──
        if (!db.objectStoreNames.contains('auditHistory')) {
          var ahs = db.createObjectStore('auditHistory', { keyPath: 'id' });
          ahs.createIndex('byUser',      'userId',              { unique: false });
          ahs.createIndex('byUserYear',  ['userId', 'anyo'],    { unique: false });
          ahs.createIndex('byDate',      'fechaAuditoria',      { unique: false });
        }

        // ── pendingSyncQueue (Fase 2) ──
        if (!db.objectStoreNames.contains('pendingSyncQueue')) {
          var psq = db.createObjectStore('pendingSyncQueue', { autoIncrement: true, keyPath: 'id' });
          psq.createIndex('byPriority', 'priority',   { unique: false });
          psq.createIndex('byCreated',  'createdAt',  { unique: false });
          psq.createIndex('byUser',     'userId',     { unique: false });
        }

        // ── syncState (Fase 2) ──
        if (!db.objectStoreNames.contains('syncState')) {
          db.createObjectStore('syncState', { keyPath: 'userId' });
        }

        // ── appSettings (Fase 3) ──
        if (!db.objectStoreNames.contains('appSettings')) {
          db.createObjectStore('appSettings', { keyPath: 'key' });
        }
      };

      req.onsuccess = function (evt) {
        console.log('[PilotPayLocalDB] DB abierta v' + DB_VERSION);
        resolve(evt.target.result);
      };

      req.onerror = function (evt) {
        reject(new Error('[PilotPayLocalDB] Error al abrir DB: ' + evt.target.error));
      };

      req.onblocked = function () {
        console.warn('[PilotPayLocalDB] DB bloqueada — otra pestaña tiene una versión anterior abierta');
      };
    });

    return _dbPromise;
  }

  // ── Helpers internos de transacción ──────────────────────────────────────────

  function _txPut(storeName, record) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction([storeName], 'readwrite');
        var store = tx.objectStore(storeName);
        var req   = store.put(record);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _txGet(storeName, key) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction([storeName], 'readonly');
        var store = tx.objectStore(storeName);
        var req   = store.get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _txGetAllByIndex(storeName, indexName, value) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction([storeName], 'readonly');
        var store = tx.objectStore(storeName);
        var idx   = store.index(indexName);
        var req   = idx.getAll(value);
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _txCount(storeName) {
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction([storeName], 'readonly');
        var store = tx.objectStore(storeName);
        var req   = store.count();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  // Escribe múltiples registros en un solo store en una transaction.
  function _txPutMany(storeName, records) {
    if (!records || records.length === 0) return Promise.resolve(0);
    return _openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx      = db.transaction([storeName], 'readwrite');
        var store   = tx.objectStore(storeName);
        var count   = 0;
        var errors  = [];

        records.forEach(function (rec) {
          var req = store.put(rec);
          req.onsuccess = function () { count++; };
          req.onerror   = function () {
            errors.push({ id: rec.id, err: req.error });
            // No abortamos — continuamos con el resto
          };
        });

        tx.oncomplete = function () {
          if (errors.length) {
            console.warn('[PilotPayLocalDB] ' + errors.length + ' registros fallidos en ' + storeName, errors);
          }
          resolve(count);
        };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  // ── Decorador de metadatos IDB ────────────────────────────────────────────────
  // Añade campos IDB a un registro sin mutar el original.

  function _decorateRecord(record) {
    var deviceId = _getOrCreateDeviceId();
    var copy     = Object.assign({}, record);
    copy._deviceId      = deviceId;
    copy._syncState     = SYNC_LOCAL_ONLY;
    copy._localVersion  = 1;
    copy._remoteVersion = 0;
    // Hash calculado sobre el registro SIN los campos IDB meta (excluir _hash del propio hash)
    var forHash = Object.assign({}, record);
    delete forHash._hash;
    delete forHash._syncState;
    delete forHash._localVersion;
    delete forHash._remoteVersion;
    delete forHash._deviceId;
    copy._hash = _hash(forHash);
    return copy;
  }

  // ── API PÚBLICA: monthlyRecords ───────────────────────────────────────────────

  function putMonthlyRecord(mr) {
    if (!mr || !mr.id) return Promise.reject(new Error('putMonthlyRecord: id requerido'));
    return _txPut('monthlyRecords', mr);
  }

  function getMonthlyRecord(id) {
    return _txGet('monthlyRecords', id);
  }

  function getMonthlyRecordsByUser(userId) {
    return _txGetAllByIndex('monthlyRecords', 'byUser', userId);
  }

  // ── API PÚBLICA: auditHistory ────────────────────────────────────────────────

  function putAuditRecord(ar) {
    if (!ar || !ar.id) return Promise.reject(new Error('putAuditRecord: id requerido'));
    return _txPut('auditHistory', ar);
  }

  function getAuditRecord(id) {
    return _txGet('auditHistory', id);
  }

  function getAuditRecordsByUser(userId) {
    return _txGetAllByIndex('auditHistory', 'byUser', userId);
  }

  // ── MIGRACIÓN ────────────────────────────────────────────────────────────────

  function _migrationKey(userId) {
    return 'pilotpay:' + userId + ':idb_migration_v1';
  }

  function _migrateMonthlyRecords(userId) {
    var raw = localStorage.getItem('pilotpay:' + userId + ':monthly_v1');
    if (!raw) return Promise.resolve({ migrated: 0, failed: 0 });

    var dict;
    try { dict = JSON.parse(raw); } catch (e) {
      console.warn('[PilotPayLocalDB] monthly_v1 JSON inválido — saltando migración mensual');
      return Promise.resolve({ migrated: 0, failed: 0 });
    }

    var records = [];
    var failed  = 0;

    Object.keys(dict).forEach(function (key) {
      try {
        var mr = dict[key];
        // Reconstruir id si falta (registros legacy sin campo id)
        if (!mr.id) {
          mr = Object.assign({}, mr);
          mr.id = userId + ':' + key;
        }
        // Asegurar userId en el registro
        if (!mr.userId) mr.userId = userId;
        records.push(_decorateRecord(mr));
      } catch (e) {
        console.warn('[PilotPayLocalDB] Error procesando monthly key=' + key + ':', e);
        failed++;
      }
    });

    return _txPutMany('monthlyRecords', records).then(function (count) {
      return { migrated: count, failed: failed };
    });
  }

  function _migrateAuditHistory(userId) {
    var raw = localStorage.getItem('pilotpay:' + userId + ':audit_history_v1');
    if (!raw) return Promise.resolve({ migrated: 0, failed: 0 });

    var arr;
    try { arr = JSON.parse(raw); } catch (e) {
      console.warn('[PilotPayLocalDB] audit_history_v1 JSON inválido — saltando migración historial');
      return Promise.resolve({ migrated: 0, failed: 0 });
    }

    if (!Array.isArray(arr)) return Promise.resolve({ migrated: 0, failed: 0 });

    var records = [];
    var failed  = 0;

    arr.forEach(function (ar, idx) {
      try {
        if (!ar.id) {
          console.warn('[PilotPayLocalDB] AuditRecord[' + idx + '] sin id — saltando');
          failed++;
          return;
        }
        var rec = Object.assign({}, ar);
        if (!rec.userId) rec.userId = userId;
        records.push(_decorateRecord(rec));
      } catch (e) {
        console.warn('[PilotPayLocalDB] Error procesando auditHistory[' + idx + ']:', e);
        failed++;
      }
    });

    return _txPutMany('auditHistory', records).then(function (count) {
      return { migrated: count, failed: failed };
    });
  }

  // ── BOOTSTRAP ────────────────────────────────────────────────────────────────
  // Punto de entrada único. Llámalo tras login con el userId autenticado.
  // Asíncrono y no-bloqueante — la app no espera su resolución.

  function bootstrap(userId) {
    if (!userId) {
      console.warn('[PilotPayLocalDB] bootstrap: userId vacío — abortando');
      return Promise.resolve();
    }

    _getOrCreateDeviceId();

    return _openDB()
      .then(function () {
        // ── Migración ──
        var migKey = _migrationKey(userId);
        if (localStorage.getItem(migKey) === 'done') {
          console.log('[PilotPayLocalDB] Migración ya realizada para', userId);
          return _logIDBState(userId);
        }

        console.log('[PilotPayLocalDB] Iniciando migración para', userId, '| device:', _deviceId);

        return Promise.all([
          _migrateMonthlyRecords(userId),
          _migrateAuditHistory(userId)
        ]).then(function (results) {
          var mr  = results[0];
          var aud = results[1];

          console.log('[PilotPayLocalDB] Migración completada:',
            'monthlyRecords migrados=' + mr.migrated + ' fallidos=' + mr.failed,
            '| auditHistory migrados=' + aud.migrated + ' fallidos=' + aud.failed
          );

          // Solo marcar 'done' si no hubo errores totales
          if (mr.failed === 0 && aud.failed === 0) {
            localStorage.setItem(migKey, 'done');
          } else {
            console.warn('[PilotPayLocalDB] Migración parcial — flag NO marcado como done. Se reintentará.');
          }

          return _logIDBState(userId);
        });
      })
      .catch(function (err) {
        console.warn('[PilotPayLocalDB] Bootstrap falló — la app sigue usando localStorage:', err.message);
      });
  }

  // ── DEBUG ────────────────────────────────────────────────────────────────────

  function _logIDBState(userId) {
    return Promise.all([
      _txGetAllByIndex('monthlyRecords', 'byUser', userId),
      _txGetAllByIndex('auditHistory',   'byUser', userId)
    ]).then(function (results) {
      var mrs  = results[0];
      var auds = results[1];
      console.log('[PilotPayLocalDB] Estado IDB para', userId + ':',
        'monthlyRecords=' + mrs.length,
        '| auditHistory=' + auds.length,
        '| device=' + _deviceId
      );
      return { monthlyRecords: mrs, auditHistory: auds };
    });
  }

  // Vuelca contenido IDB a console. Llama con: PilotPayLocalDB.debug(currentUser)
  function debug(userId) {
    if (!userId) { console.warn('[PilotPayLocalDB] debug: userId requerido'); return; }
    Promise.all([
      _txGetAllByIndex('monthlyRecords', 'byUser', userId),
      _txGetAllByIndex('auditHistory',   'byUser', userId)
    ]).then(function (results) {
      var mrs  = results[0];
      var auds = results[1];
      console.group('[PilotPayLocalDB] DEBUG — usuario: ' + userId + ' | device: ' + _deviceId);
      console.log('monthlyRecords (' + mrs.length + '):');
      if (mrs.length) console.table(mrs.map(function (r) {
        return { id: r.id, estado: r.estado, mesLabel: r.mesLabel, year: r.year, month: r.month, _syncState: r._syncState, _hash: r._hash, _deviceId: r._deviceId };
      }));
      console.log('auditHistory (' + auds.length + '):');
      if (auds.length) console.table(auds.map(function (r) {
        return { id: r.id, mes: r.mes, anyo: r.anyo, liqReal: r.liqReal, estado: r.estado, _syncState: r._syncState, _hash: r._hash, _deviceId: r._deviceId };
      }));
      console.groupEnd();
    }).catch(function (e) {
      console.warn('[PilotPayLocalDB] debug error:', e);
    });
  }

  // ── API PÚBLICA ───────────────────────────────────────────────────────────────

  return {
    // Punto de entrada — llamar tras login
    bootstrap: bootstrap,

    // monthlyRecords
    putMonthlyRecord:       putMonthlyRecord,
    getMonthlyRecord:       getMonthlyRecord,
    getMonthlyRecordsByUser: getMonthlyRecordsByUser,

    // auditHistory
    putAuditRecord:         putAuditRecord,
    getAuditRecord:         getAuditRecord,
    getAuditRecordsByUser:  getAuditRecordsByUser,

    // Utilidades
    getDeviceId: _getOrCreateDeviceId,
    hash:        _hash,

    // Debug
    debug: debug
  };

})();
