# FASE 1.25 — COMMIT E3b: ESPECIFICACIÓN — PAUSA DE ANALYTICS

**Fecha:** 2026-06-12
**Commit:** E3b (analytics) — primera mitad de E3 (diseño D11 `3543dc5`).
**Estado:** 🟡 **ESPECIFICACIÓN — NO implementar. Sin cambios de código/reglas/Firebase.**
**Recomendación (ver §17):** **IMPLEMENTAR E3b** — trivial, bajo riesgo, limpia consola y escrituras inútiles.

---

## 1. INVENTARIO EXACTO DE `pilotPayAnalytics.js`
| Elemento | Detalle |
|---|---|
| Patrón | IIFE `(function(window){...})(window)`; export `window.PilotPayAnalytics` (277) |
| Constantes | `MAX_LOCAL_EVENTS = 1000` (24), `UPLOAD_BATCH_SIZE = 50` (25) |
| Estado | `currentAuditSession` (28) — para detectar abandonos |
| Funciones | `generateEventId` (33), `getDeviceId` (40), `getStorageKey` (60), `getLocalEvents` (71), `saveLocalEvents` (85), `track` (100), `uploadBatch` (141), `flush` (163), `startAuditSession` (177), `updateAuditPhase` (193), `completeAudit` (212), `abandonAudit` (233), `checkAbandonOnModuleChange` (259) |
| API pública | `track, flush, startAuditSession, updateAuditPhase, completeAudit, abandonAudit, checkAbandonOnModuleChange, getLocalEvents, getCurrentSession` (277-296) |
| Listener | `beforeunload → flush()` (301-303) |
| Log de carga | `console.log('[PilotPay Analytics] Initialized')` (305) |

## 2. DÓNDE SE CARGA
`frontend/index.html:6308` — `<script src="js/pilotPayAnalytics.js"></script>` (sin `?v=`, sin flag de activación). Se sincroniza a `docs/js/` por la regla recursiva de `js/`.

## 3. QUÉ EVENTOS CAPTURA
5 tipos (cabecera 13-18): `audit_complete`, `audit_abandoned`, `module_view`, `error_occurred`, `sync_result`.
Call-sites en `index.html` (×7): `completeAudit` (6443), `checkAbandonOnModuleChange` (10346), `track('module_view')` (10368), `startAuditSession` (16621), `updateAuditPhase` (16622), `track('error_occurred')` (22231, 22264).

## 4. DÓNDE GUARDA BUFFER LOCAL
`localStorage` key **escopada por usuario**: `pilotpay:{currentUser}:analytics` (getStorageKey 60-66; fallback `pilotpay:_anonymous:analytics`). FIFO hasta `MAX_LOCAL_EVENTS=1000` (track 121-123).
Contenido por evento: `eventId, userId, deviceId, action, timestamp, date` + datos (`mes, anio, timeSpent, lastPhase, hasVariables/Calculation/Nomina/Comparison, reason`...).

## 5. QUÉ RUTA FIREBASE INTENTA ESCRIBIR
`pilotpay/analytics/{currentUser}/events/{eventId}` — PATCH vía `window.fbUpdate` (uploadBatch 148-153).
**Disparadores de subida:**
- `track()` cada `UPLOAD_BATCH_SIZE=50` eventos → `uploadBatch(últimos 50)` (133-135).
- `flush()` → `uploadBatch(todos los locales, hasta 1000)` (163-167).
- `beforeunload` → `flush()` (301-303).

## 6. POR QUÉ FALLA ACTUALMENTE
`pilotpay/analytics` **no existe** en `firebase-database.rules.json` → **deny-by-default** → cada `fbUpdate`
devuelve HTTP permission-denied → la Promise rechaza. (Confirmado en G2: nodo `pilotpay/analytics` vacío/inexistente.)

## 7. QUÉ RUIDO GENERA EN CONSOLA
`uploadBatch` (150-152): `window.fbUpdate(path, event).catch(err => console.error('[Analytics] Upload failed:', err))`.
- Por **batch de 50** (track) → hasta **50 `console.error`**.
- Por **flush/beforeunload** → hasta **1000 `console.error`** (uno por evento del buffer) + 1000 escrituras denegadas.
Además `console.log('[PilotPay Analytics] Initialized')` al cargar (benigno, no error).
**NO falla en silencio:** ensucia consola y emite tráfico denegado, especialmente al cerrar/recargar la página.

## 8. RIESGO DE PRIVACIDAD / localStorage
El buffer `pilotpay:{code}:analytics` acumula hasta 1000 eventos con **metadatos operativos** (mes/año de
auditoría, tiempos, fases completadas, motivos de abandono, datos de error) **sin cifrar**. No es PII
financiera directa, pero sí comportamiento de uso por usuario. `doLogout` **no lo limpia**. La limpieza/cifrado
del buffer es deuda separada (Fase 3 cifrado) — **E3b no lo borra** (requisito explícito).

## 9. DISEÑO PROPUESTO
- **Flag default OFF:** `pilotpay_analytics_enabled === '1'` (ausente/≠'1' → analytics de envío pausado).
- **No subir a Firebase:** `uploadBatch()` hace early-return si el flag no está activo → cero `fbUpdate`, cero `console.error`.
- **No borrar histórico local:** el buffer `pilotpay:{code}:analytics` **no se toca**. `track()` puede seguir
  escribiendo local (preserva histórico), pero **nada se sube**.
- **API estable:** no se quita el `<script>` ni se cambia la firma de ningún método → los 7 call-sites siguen
  funcionando (`track`, `completeAudit`, etc.) sin `ReferenceError`.
- **Punto único de control:** gatear `uploadBatch()` cubre ambos disparadores (batch de track **y** flush/beforeunload),
  porque ambos pasan por `uploadBatch`.

> Decisión de alcance: E3b gatea **solo el ENVÍO** (uploadBatch). El tracking local sigue (no se borra histórico).
> Si además se quisiera detener la acumulación local, se gatearía `track()` — **opcional, no requerido** por el
> objetivo ("pausar el envío a Firebase"). Recomendación: gatear solo `uploadBatch` en E3b.

## 10. PSEUDODIFF (`frontend/js/pilotPayAnalytics.js`)
```diff
+  // E3b: flag de envío de analytics (default OFF). El envío a Firebase está
+  // pausado hasta que pilotpay/analytics tenga reglas (Fase 1.3+). El tracking
+  // local y la API pública NO cambian.
+  function _uploadEnabled() {
+    try { return localStorage.getItem('pilotpay_analytics_enabled') === '1'; }
+    catch (e) { return false; }
+  }
+
   function uploadBatch(events) {
+    if (!_uploadEnabled()) return;   // E3b: pausa de envío (default OFF) → sin fbUpdate, sin console.error
     if (!window.currentUser) return;
     if (typeof window.fbUpdate !== 'function') { ...; return; }
     events.forEach(event => {
       const path = `pilotpay/analytics/${window.currentUser}/events/${event.eventId}`;
       window.fbUpdate(path, event).catch(err => { console.error('[Analytics] Upload failed:', err); });
     });
     ...
   }
```
~6 líneas añadidas. `flush()` (que llama `uploadBatch`) hereda la pausa sin tocarse. `track()` intacto.

## 11. RIESGOS
| # | Riesgo | Sev | Nota |
|---|---|---|---|
| A1 | Pérdida de analytics remoto | Nula | Nunca funcionó (denegado); pérdida real = 0 |
| A2 | Romper algún caller | Muy baja | API sin cambios; `track`/`completeAudit`/etc. siguen no-op-de-subida pero funcionales |
| A3 | Flag mal leído (excepción localStorage) | Muy baja | `try/catch` → default OFF (pausa) |
| A4 | Buffer local sigue creciendo | Baja | FIFO cap 1000; no se sube; limpieza/cifrado = Fase 3 (fuera de E3b) |
| A5 | `console.log Initialized` permanece | Nula | Log informativo, no error; opcional retirarlo (no requerido) |

## 12. MITIGACIONES
- A1/A4: documentado; el envío se reactivará (flag '1') cuando `pilotpay/analytics` tenga reglas (1.3+).
- A2: pseudodiff no toca firmas ni el `<script>`; verificar en pruebas que los 7 call-sites no lanzan.
- A3: `try/catch` con default OFF.
- A5: dejar el log o retirarlo en el mismo commit (decisión menor; recomendación: dejarlo para minimizar superficie).

## 13. PRUEBAS
| # | Prueba | Esperado |
|---|---|---|
| 1 | **App carga** | `index.html` sin errores; `typeof PilotPayAnalytics === 'object'` |
| 2 | **No errores analytics** | Tras generar >50 eventos / recargar (beforeunload) → **0** `[Analytics] Upload failed` en consola |
| 3 | **No escrituras a `pilotpay/analytics`** | DevTools Network: ningún PATCH a `…/analytics/…`; nodo sigue inexistente |
| 4 | **Callers no rompen** | Flujo de auditoría completo (variables→calcular→nómina→comparar→completeAudit), cambio de módulo, error_occurred → sin `ReferenceError`; la app funciona igual |
| 5 | **Consola limpia** | Sin `console.error` de analytics en uso normal ni al recargar |
| 6 | **Buffer local intacto** | `pilotpay:{code}:analytics` sigue presente (no borrado); `getLocalEvents()` devuelve lo de antes |
| 7 | **Reactivable** | `localStorage.setItem('pilotpay_analytics_enabled','1')` → uploadBatch vuelve a intentar (y vuelve a fallar mientras no haya reglas — esperado) |

## 14. ROLLBACK EXACTO
- `git revert <E3b>` → `uploadBatch` vuelve a subir incondicionalmente (estado actual).
- O `flip` del flag: `pilotpay_analytics_enabled='1'` reactiva el envío sin revertir código.
- Solo toca `pilotPayAnalytics.js`. Sin reglas/datos/producción. **Punto de no retorno: NINGUNO.**

## 15. CRITERIOS DE ÉXITO
1. App carga sin errores; `PilotPayAnalytics` disponible.
2. Cero `console.error` de analytics en uso normal y al recargar.
3. Cero escrituras a `pilotpay/analytics`.
4. Los 7 call-sites siguen funcionando (sin ReferenceError); la app opera igual.
5. Buffer local `pilotpay:{code}:analytics` **no borrado**.
6. Reactivable por flag.

## 16. CRITERIOS DE BLOQUEO
- Algún call-site lanza `ReferenceError`/`TypeError` tras el cambio.
- Sigue habiendo `console.error [Analytics] Upload failed` con el flag OFF.
- Se borra o corrompe el buffer local.
- La app deja de funcionar en algún flujo que llama a analytics.

## 17. RECOMENDACIÓN FINAL

## ✅ IMPLEMENTAR E3b
Cambio **trivial** (~6 líneas en un solo archivo, `pilotPayAnalytics.js`), **bajo riesgo** (API estable,
default OFF, reversible por flag), **beneficio inmediato**: limpia el ruido de consola (`[Analytics] Upload
failed`, hasta 1000 al recargar) y corta escrituras denegadas. Es además **prerrequisito de higiene** para
validar E3a sin ruido. No borra histórico local (requisito respetado).

**Orden sugerido:** E3b **antes** de E3a (limpia la consola para validar E3a sin interferencias).
**Pendiente menor a confirmar:** ¿retirar también `console.log('[PilotPay Analytics] Initialized')`? (Recomendación: dejarlo.)

**FIN DE LA ESPECIFICACIÓN E3b — No implementar hasta autorización explícita.**
