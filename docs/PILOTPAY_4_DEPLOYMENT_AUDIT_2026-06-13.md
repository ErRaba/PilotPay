# AUDITORÍA DE DESPLIEGUE — PilotPay 4.0 (Fase 1.25)

**Fecha:** 2026-06-13
**Rama auditada:** `pilotpay-4-security-phase-0`
**Producción:** `avatars-redesign` @ `3290d33` (GitHub Pages desde `avatars-redesign/docs/`)
**Naturaleza:** auditoría de reconciliación funcional + registro de cierre de riesgo.
**Relacionado:** `docs/PILOTPAY_4_ARCHITECTURE_AUDIT_2026-06-13.md` (auditoría estratégica integral).

---

## 0. Objeto

Determinar si la rama de seguridad es desplegable como *producción + capa de seguridad*,
reconciliando función por función `avatars-redesign` ↔ `pilotpay-4-security-phase-0`.

---

## 1. Reconciliación funcional (frontend/ = fuente de verdad)

| Módulo | Igual | Equivalente | Diferente | Riesgo |
|---|:---:|:---:|:---:|---|
| `auditEngine.js`, Parser V2, IRPF AutoDetect | ✅ | | | Ninguno |
| `getUserPerms` | ✅ | | | Ninguno (idéntico) |
| `savePermsToFirebase` | ✅ | | | Ninguno (idéntico) |
| `getAuthToken` (E1) | | ✅ | | Bajo — embudo de token latente (`isAvailable()=false` sin Auth) |
| `doLogin` (E2) | | ✅ | | Bajo — path legacy equivalente; Auth primario aditivo, cae a legacy |
| `doLogout` (E2/E3a) | | ✅ | | Bajo — añade `signOut()` + limpieza cachés permisos |
| `loadPermsFromFirebase` (E3a) | | | ⚠️ | Medio-bajo — siempre activo: no-admin lee solo `permisos/{user}` |
| `SECURITY_MODE` (9 bloques) | | ✅ | | Ninguno — flag OFF por defecto (inerte) |
| `pilotPayAuth.js` (nuevo) | | ✅ | | Bajo — latente; falla con gracia sin provisión Auth |
| `pilotPayAnalytics.js` (E3b) | | ✅ | | Ninguno — subida gated OFF (buffer local) |
| `test-auth.html` / `parser-diagnostic.html` | | | ⚠️ | Ninguno en deploy — no se publican (dev only) |
| `migrate.html` | ✅ | | | Eliminado en ambas ramas |
| **`docs/index.html` (build publicado)** | ✅ | | | **CERRADO** — ver §2 (antes: ALTO, build stale) |

---

## 2. Riesgo «docs/ stale» — CERRADO

**Estado anterior:** el build publicado (`docs/`) estaba congelado en el commit SECURITY_MODE
(`5881551`, 2026-06-10) y **no contenía E1/E2/E3a/E3b**. Desplegar `docs/` tal cual habría
entregado la app SIN la capa de seguridad → bloqueante de despliegue sobre el artefacto.

**Acción de cierre:** `npm run sync` (frontend/ → docs/), commiteado.

**Commit de cierre:**
```
3dd7919bc4cc14aabecd10c6d9fb99be6707c811
deploy(phase-1.25): sync docs/ con frontend/ — cierra docs stale
```

**Evidencia verificada (2026-06-13):**

- ✅ `docs/index.html` **byte-idéntico** a `frontend/index.html`
- ✅ `docs/js/pilotPayAnalytics.js` **byte-idéntico** a `frontend/js/pilotPayAnalytics.js`
- ✅ `docs/js/pilotPayAuth.js` **existe** (203 líneas / 7864 bytes) y **byte-idéntico** a `frontend/js/pilotPayAuth.js`
- ✅ E1 presente en `docs/`: `getAuthToken` con embudo de token (guard `getSession().code === currentUser`)
- ✅ E2 presente: `doLogin` doble login (Auth primario `signIn(u,p)` + fallback legacy `USERS[u].pass===p`)
- ✅ E3a presente: `loadPermsFromFirebase` role-aware (`isAdmin()` → nodo; else `permisos/{user}`) + `doLogout` limpia `pilotpay_perms_cache` y `pilotpay_admin_perms`
- ✅ E3b presente: `_uploadEnabled()` (`pilotpay_analytics_enabled==='1'`) + `uploadBatch` pausado por defecto
- ✅ Cache-busting `?v=3.0.1` intacto (8 ocurrencias, incl. `pilotPayAuth.js?v=3.0.1`)
- ✅ Sin archivos inesperados — solo los 3 del sync; `.claude/settings.local.json` y `docs/PHASE_1.3_RULES_TRANSITION_DESIGN.md` excluidos del commit

**Resultado:** `docs/` (build) alineado con `frontend/` (fuente). Paridad total en lo que gestiona `sync-docs.js` (`index.html`, `api-client.js`, `js/`, `assets/`).

---

## 3. Veredicto

| | Veredicto | Motivo |
|---|---|---|
| **Antes** | **C) NO DESPLEGAR TODAVÍA** | Build publicado stale: `docs/` sin E1/E2/E3a/E3b |
| **Ahora** | **B) DESPLEGAR DESPUÉS DE VALIDACIONES** | Riesgo de artefacto cerrado; restan validaciones funcionales/operativas |

El código fuente es funcionalmente equivalente a *producción + seguridad latente*; la única
diferencia siempre-activa (E3a, perms escopados) es de bajo riesgo y dirección correcta.

---

## 4. Pendientes antes de desplegar (no bloqueados por este cierre)

- [ ] Validación E2 doble login: usuario beta real **online** (fallback legacy al fallar Auth) y **offline**
- [ ] Validación E3a permisos: lectura escopada **user** + panel completo **admin**
- [ ] Smoke **multi-device**: PC Chrome / iPhone PWA / iPad PWA
- [ ] Definir **vía de integración final** con `avatars-redesign` (fuente de GitHub Pages; ramas divergentes) y estrategia de remoto/push
- [ ] **No avanzar a 1.4 / 1.5** hasta cerrar lo anterior

---

## 5. Trazabilidad

| Hito | Commit |
|---|---|
| Cierre docs stale (sync build↔fuente) | `3dd7919` |
| Auditoría arquitectónica integral (Fase L) | `21346e1` |
| E3a perms role-aware + logout cleanup | `2581ea8` |
| E3b analytics pausado | `05c8a04` |
| E2 doble login | `ec6f00f` |
| E1 embudo de token | `30602f6` |
