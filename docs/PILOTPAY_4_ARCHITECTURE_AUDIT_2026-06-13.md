# AUDITORÍA ARQUITECTÓNICA INTEGRAL — PilotPay 4.0

**Fecha:** 2026-06-13
**Autor:** Auditoría técnica externa (arquitecto principal)
**Alcance:** estado real a fecha de hoy, basado en código, docs, commits y estructura reales.
**Naturaleza:** SOLO auditoría. Sin código, sin commits, sin cambios.

---

## 0. HALLAZGO DE CABECERA (leer primero)

**La migración de seguridad está BIFURCADA en dos planos que no coinciden:**

| Plano | Estado |
|---|---|
| **Código** (Fase 0 → L, 30 commits) | Solo en rama local `pilotpay-4-security-phase-0`. **SIN push. NO en producción.** |
| **Datos / Firebase** (Auth + RTDB) | **Aplicados al proyecto Firebase compartido REAL** (`airside-mad`): cuentas Auth ESH/BZP creadas, huérfanos RTDB eliminados (limpieza Fase L cerrada/validada — D18) |

**Consecuencia:** producción (`avatars-redesign` @ `3290d33`, GitHub Pages) ejecuta el **código pre-seguridad**
(login legacy, sin embudo, sin doble login, sin SECURITY_MODE, sin permisos role-aware) **contra un Firebase
parcialmente migrado**. Esto es **seguro por diseño** (el trabajo fue aditivo y la coexistencia preserva el
login legacy + `pass`), pero implica que **ninguno de los riesgos de seguridad está cerrado en producción todavía**.

---

## 1. ESTADO ACTUAL DEL SISTEMA

### 1.1 Qué existe y funciona
- **Producción (GitHub Pages, `avatars-redesign`):** beta 3.0 funcional — login legacy, dashboard, variables,
  calculadora, parser V1/V2, comparativa, simulador IRPF, historial, biblioteca normativa, P4 sync, admin.
  Único cambio de seguridad presente: **retirada de `migrate.html`** (`3290d33`).
- **Rama de seguridad (local, sin push):** todo lo anterior + integración Auth (E1-E3), CLI admin, SECURITY_MODE.
- **Firebase compartido (real):** RTDB con datos de ESH/BZP (limpiada de huérfanos); Auth con ESH/BZP
  (Email/Password) + ~816 cuentas anónimas; reglas `auth != null` (sin endurecer).
- **Backend Express:** existe en `backend/` (motor de cálculo) pero **NO desplegado** (sin Dockerfile/hosting;
  el frontend lo invoca en `localhost:3000` → falla en producción con `ERR_CONNECTION_REFUSED`, sin impacto
  porque el cálculo está duplicado en el frontend).

### 1.2 Desplegado vs solo-local
| Elemento | Producción | Rama local | Firebase real |
|---|---|---|---|
| Código beta 3.0 | ✅ | ✅ | — |
| Retirada migrate.html | ✅ (`3290d33`) | ✅ (cherry-pick) | — |
| SECURITY_MODE (Fase 0) | ❌ | ✅ | — |
| Auth infra / doble login / embudo (1.1/1.25) | ❌ | ✅ | — |
| Permisos role-aware / analytics pausado (E3) | ❌ | ✅ | — |
| CLI admin (`tools/admin-cli`) | ❌ (no es web) | ✅ | — |
| Cuentas Auth ESH/BZP + userCodes | — | — | ✅ (creadas) |
| Limpieza huérfanos RTDB (Fase L) | — | — | ✅ (ejecutada) |
| Reglas por claim | ❌ | (diseñadas, no desplegadas) | ❌ (siguen `auth!=null`) |

### 1.3 Diferencia clave
Producción ≈ beta 3.0 (menos migrate.html). **El salto a 4.0 está construido pero no entregado.**

---

## 2. INVENTARIO DE MÓDULOS

| Módulo | Finalidad | Dependencias | Criticidad | Estado |
|---|---|---|---|---|
| **Frontend** (`index.html`, ~20k líneas) | Monolito UI + lógica | módulos `js/`, Firebase REST | CRÍTICA | Estable (prod) / extendido (rama) |
| **Backend** (`backend/` Express) | Motor cálculo determinista (irpf, ss2026, tramos, audit, compare, payrollEngine) | Node/Express | MEDIA | **No desplegado**; cálculo duplicado en frontend |
| **Firebase RTDB** | Persistencia sync | REST + token | CRÍTICA | Operativo; limpio (post-L) |
| **Auth** | Identidad | Anonymous + Email/Password | CRÍTICA | Coexistencia (anon prod + Auth rama) |
| **P4** (`pilotPayStore.js`) | Sync multi-device de `historicos` | flag, embudo token, IDB | CRÍTICA | Operativo; pull manual; flag-gated |
| **Admin CLI** (`tools/admin-cli`) | Gestión Auth/usuarios/limpieza | firebase-admin | ALTA | Funcional (local); 9 subcomandos |
| **Parser** (V1/V2, `binterPayslipParser`) | Extracción nómina PDF | pdf.js | ALTA | Validado en producción |
| **Normativa** (`js/normativa/*`) | Convenio/acuerdos/productividad/bases | datos estáticos | MEDIA | Estable |
| **Auditorías** (`auditEngine.js`) | Clasificación causa/derivado/neto + nominaV2 | parser, store | CRÍTICA | Estable |
| **Históricos** | AuditRecord + MonthRecord | store, IDB, Firebase | CRÍTICA | Operativo (solo ESH tiene datos) |
| **Analytics** (`pilotPayAnalytics.js`) | Telemetría MVP | Firebase | BAJA | **Pausado en rama** (E3b); activo-pero-denegado en prod |
| **Biblioteca/Convenio/Acuerdos** | Visor documental | normativa | MEDIA | Estable |
| **Dashboard 2.x** | Briefing financiero | store | ALTA | Estable |
| **Variables / Simulador / Comparador** | Flujo de cálculo/auditoría | calc, parser | ALTA | Estable |
| **Admin** (panel) | Gestión usuarios/permisos | `userAdmin.js`, isAdmin | ALTA | Estable; depende de `isAdmin()`=ADMIN_CODE |
| **pilotPayAuth.js** | Cliente Auth (login/token/claims) | Firebase REST | CRÍTICA (futuro) | Integrado en rama; **no en prod** |

---

## 3. INVENTARIO DE DATOS

### 3.1 RTDB (post-limpieza Fase L, verificado en vivo)
| Nodo | Contenido | Usuarios | Riesgo |
|---|---|---|---|
| `usuarios/{BZP,ESH}` | identidad + **`pass` texto plano** + flags | 2 | **R2: pass legible por cualquier sesión auth** |
| `perfiles/{BZP,ESH}` | NIF, IRPF, fiscal | 2 | PII sin cifrar (R4) |
| `permisos/{BZP}` | funciones/bases | 1 (ESH por fallback admin) | bajo |
| `historicos/ESH` | nominaV2, auditorías (monthly 5 / aud 5 / tombstones 19) | 1 | PII fiscal sin cifrar (R4) |
| `userCodes/{BZP,ESH}` | mapping code→uid | 2 | bajo |
| `deletedUsers/*` | 3 tombstones de prueba | — | bajo |
| `rutas/*` | 8 rutas ICAO (reservado Proyección Operativa) | — | bajo |
| `analytics` | **no existe** | — | — |
| `solicitudes` | **no existe** | — | — |
**Base limpia** tras Fase L (sin huérfanos). Cierre formal ✅ COMPLETADO (D18 `c4f0a43`): re-auditoría `perfiles`=2 / `permisos`=1 + smoke ESH/BZP PASS.

### 3.2 Auth
- **Providers:** Anonymous (**habilitado**) + Email/Password (**habilitado**, enumeration protection ON).
- **Cuentas:** ESH (admin), BZP (user) — Email/Password con claims `{role, code}`. **~816 cuentas anónimas**
  acumuladas (1 por recarga; basura, sin datos asociados).
- **Claims:** `{role, code}` solo en ESH/BZP. Las anónimas no tienen claim.
- **Dependencias:** el cliente de la rama usa el claim `code` para el embudo y `role` para admin; producción no.

### 3.3 Storage
- **Uso actual:** ninguno (Firebase Storage no usado).
- **Uso futuro:** previsto en Fase 4 (backend documental: PDFs en Storage, parse server-side). No iniciado.

---

## 4. MAPA DE SEGURIDAD

### Riesgos CERRADOS
- **Exposición de `migrate.html`** (escritura no autenticada pública) → **CERRADO** (retirada en prod, `3290d33`).
- **Contraseña admin hardcodeada publicada** (`'7800'`) → **MITIGADO** (rotada, G3) — aunque el patrón `DEFAULT_USERS` con `pass` sigue en código (rama y prod).
- **Datos huérfanos RTDB** (PII de ex-usuarios) → **CERRADO** (Fase L, en Firebase real; cierre formal validado D18 — re-auditoría confirma `perfiles`={BZP,ESH}, `permisos`={BZP}).

### Riesgos PARCIALMENTE cerrados
- **R3 (cross-user access):** infraestructura lista (claims + cliente role-aware) pero **reglas no desplegadas** → **abierto en producción**. Se cerraría en 1.3/1.5.
- **R5 (login client-side bypassable):** doble login Auth construido (rama) pero no en prod; legacy sigue siendo el único activo en producción → **abierto en prod**.

### Riesgos ABIERTOS

| Riesgo | Nivel | Impacto | Mitigación actual | Fase que lo cierra |
|---|---|---|---|---|
| **R2 — `pass` texto plano en RTDB** | **CRÍTICO** | Cualquier sesión auth lee contraseñas de todos | Ninguna efectiva (sigue presente) | **1.4** (borrar pass) |
| **R1 — API key pública + Anonymous + reglas laxas** | **ALTO** | Token anónimo gratis → acceso a todo bajo `auth!=null` | Ninguna (Anonymous habilitado) | **1.5** (deshabilitar Anonymous + reglas) |
| **R3 — sin aislamiento por usuario** | **ALTO** | Usuario A puede leer/escribir datos de B | Solo cliente (no reglas) | **1.3/1.5** |
| **R5 — login bypassable** | **ALTO** | Validación cliente contra pass; DevTools | Aditivo en rama (no prod) | **1.4** |
| **R4 — datos sin cifrar (LS/IDB/RTDB)** | **MEDIO-ALTO** | NIF/NSS/nóminas en claro | Ninguna | **Fase 3** (rediseño pendiente) |
| **Backdoor `DEFAULT_USERS`** | **MEDIO** | Sin red, login valida contra '7800' hardcodeado | Aceptado temporal | **1.4** |
| **Backend no desplegado / cálculo duplicado** | **BAJO-MEDIO** | Frontend mantiene lógica de cálculo crítica | Funciona en frontend | Fase 4 (no prioritaria) |
| **~816 cuentas anónimas basura** | **BAJO** | Ruido en Auth | — | 1.5/1.6 (purga `purge-anon`) |

> **Lectura ejecutiva:** en **producción** los riesgos críticos/altos (R1, R2, R3, R5) **siguen totalmente
> abiertos** porque el código de seguridad no está desplegado y las reglas no se han endurecido. El trabajo
> hecho es **preparación**, no cierre efectivo en producción.

---

## 5. DEUDA TÉCNICA REAL (detectada en código)

### Aceptable
- **Coexistencia doble login + dos contraseñas** (Auth nueva / legacy antigua) durante 1.25-1.4: intencional, temporal.
- **`permisos/ESH` ausente:** correcto (admin por `isAdmin()`).
- **Backend Express local sin desplegar:** aceptable mientras el cálculo viva en frontend; deuda si se quiere desacoplar.

### Peligrosa
- **Cálculo financiero duplicado** (frontend `index.html` + `backend/src/engine`): dos fuentes de verdad de
  IRPF/SS/tramos → riesgo de divergencia silenciosa. CLAUDE.md ya lo señala ("no completamente desacoplado").
- **`DEFAULT_USERS` con `pass` hardcodeado** en frontend (rama y prod): backdoor + secreto en código.
- **Gap de borrado** (CLAUDE.md §13.15, confirmado empíricamente en Fase L): `purgeUser` dejó huérfanos
  (`perfiles` sin `usuarios`); `permisos/TEST` sobrevivió a una purga. El flujo de borrado no es transaccional.
- **`pilotpay_ck_ctx` / buffer analytics local:** claves no escopadas por usuario / PII operativa sin cifrar en localStorage.
- **Monolito de ~20k líneas** (`index.html`): superficie de regresión alta; el propio proceso de esta migración
  lo evidencia (cada cambio exige auditoría manual exhaustiva).

### Bloqueante (para fases siguientes)
- **`loadUsersFromFirebase` lee el nodo `usuarios` entero pre-login** → impide escopar `usuarios` por claim →
  **bloquea el cierre de R2/R3 hasta eliminar el login legacy (1.4)**. Es la dependencia que fija el orden del roadmap.
- **Diseño de cifrado (Fase 3) inviable como estaba** (crypto-js sin GCM, clave derivada de idToken que rota cada
  hora → rompería offline-first). Requiere rediseño antes de implementar.

---

## 6. AUDITORÍA DE SINCRONIZACIÓN (P4)

**Cómo funciona hoy:** `pilotPayStore.js`. Flag `pilotpay_p4_enabled`. Write-through localStorage → IDB →
Firebase (`historicos/{code}/...`). Token vía embudo `getAuthToken` (anónimo en prod; Auth en rama si sesión).
**Pull NO automático** — manual (`P4Debug.pullFromFirebase`), gated por flag. Merge por timestamp (conservador).

**Fortalezas:** local-first real (opera sin red); write-through redundante; merge conservador; tombstones para
borrados; agnóstico al token (sobrevive a la migración Auth sin cambios).

**Debilidades:** **pull manual** → un dispositivo nuevo arranca vacío hasta pull explícito (visto en validación E1:
0 local / 5 en Firebase). Flag-gated → si está off, no hay sync. Solo sincroniza `historicos` (perfiles/permisos no).

**Riesgos de corrupción/pérdida:** bajos por diseño (merge por timestamp, tombstones), pero: GC de tombstones
>180 días pendiente (TODO); el gap de borrado puede dejar `historicos` huérfanos; sin pull automático, un usuario
podría creer que "perdió" datos que están en Firebase (UX, no pérdida real).

---

## 7. AUDITORÍA DE AUTENTICACIÓN

| Componente | Estado en PRODUCCIÓN | Estado en RAMA |
|---|---|---|
| **Login legacy** (`USERS[u].pass===p`) | **Único activo** | Fallback (tras Auth) |
| **Auth Email/Password** | No usado por el código | Primario (doble login E2) |
| **Anonymous** | Habilitado; token de toda la E/S | Habilitado; usado si no hay sesión Auth |
| **Claims `{role,code}`** | No leídos | Leídos (embudo + admin) |
| **Permisos** | Nodo entero para todos | Role-aware (admin entero / user scoped) |

**Qué queda por migrar:** desplegar el código de la rama a producción; endurecer reglas (1.3/1.5); borrar `pass` +
retirar legacy + `DEFAULT_USERS` (1.4); deshabilitar Anonymous (1.5).
**Qué ya puede eliminarse:** nada en producción todavía (el legacy sigue siendo el único login en prod).
**Qué NO debe tocarse aún:** `pass` y login legacy (hasta que el cliente Auth esté en prod y validado); reglas
(hasta diseño/go-no-go); Anonymous (hasta 1.5).

---

## 8. ROADMAP REALISTA (partiendo del estado actual, sin inventar fases)

- **Fase L ✅ COMPLETADA** (D18 `c4f0a43`) — base RTDB limpia y validada (ya no es trabajo pendiente).

Siguiente, partiendo del estado actual:
1. **Decisión inmediata: publicar el código de la rama de seguridad a producción.** Hoy todo el trabajo 1.1/1.25
   está en local sin push. **Sin este paso, nada de lo construido protege a los usuarios reales.** Es el
   prerequisito olvidado: el cliente Auth debe estar EN PRODUCCIÓN y validado (ESH/BZP entran por Auth online)
   antes de endurecer reglas.
2. **Fase 1.3/1.5 (fusionadas, Opción 2 recomendada):** con base limpia y 2 usuarios migrados, ir directo a
   reglas finales por claim + deshabilitar Anonymous, tras 1.4.
3. **Fase 1.4** (irreversible): borrar `pass`, retirar legacy + `DEFAULT_USERS`, actualizar `.validate`. Gate duro:
   todos los dispositivos con el código nuevo.
4. **Purga de anónimas** (`purge-anon`) tras deshabilitar Anonymous.
5. **Fase 3 (cifrado):** **rediseñar primero** (WebCrypto, clave estable) — el diseño actual es inviable.
6. **Fase 4 (backend documental):** desacoplar cálculo y mover parsers — no prioritaria; resuelve además la deuda
   de cálculo duplicado.

**Riesgos a evitar:** endurecer reglas (1.3/1.5) **antes** de desplegar el cliente Auth a producción (rompería a
todos); borrar `pass` (1.4) antes de confirmar que todos los dispositivos usan el código nuevo.

---

## 9. DECISIONES ESTRATÉGICAS

**Irreversibles (ya tomadas):**
- Datos/Auth migrados en el Firebase real (cuentas ESH/BZP creadas; huérfanos borrados). No se revierte sin coste.
- Email/Password como modelo de identidad; `{code}@pilotpay.internal`; claims `{role,code}`.
- Retirada de `migrate.html` de producción.

**Aún reversibles:**
- Todo el código de seguridad (en rama local, sin push) → revertible sin impacto.
- Opción 1 vs 2 para reglas (recomendada Opción 2: fusionar 1.3→1.5).
- Destino de `PHASE_1.3_RULES_TRANSITION_DESIGN.md` (commit histórico o descartar).
- Rediseño de cifrado (Fase 3) — aún en blanco.

**Que deberían tomarse ahora:**
- **Cuándo publicar el código de seguridad a producción** (decisión bloqueante para que el trabajo tenga valor real).
- Confirmar **Opción 2** (fusionar 1.3→1.5) y secuencia con 1.4.
- Política de retención del **backup pre-cleanup** (contiene PII de ex-usuarios).

---

## 10. VEREDICTO FINAL

### ¿En qué % está completada la transformación a PilotPay 4.0?

**~35% global** — con una distinción crítica entre **trabajo realizado** y **riesgo cerrado en producción**:

| Lente | % | Justificación |
|---|---|---|
| **Diseño + construcción** | ~70% | Identidad (infra Auth, CLI, doble login, embudo, permisos role-aware) diseñada, construida y validada en local; datos migrados; base RTDB limpia. Documentación exhaustiva. |
| **Riesgo cerrado EN PRODUCCIÓN** | **~10%** | Solo `migrate.html` retirado + contraseña rotada + huérfanos limpiados. R1/R2/R3/R5 **siguen abiertos en prod**; R4 (cifrado) sin empezar. |
| **Transformación total (incl. cifrado + backend)** | **~35%** | Fase 0 ✅, Fase 1 identidad ~60% (1.1/1.2/1.25/L hechas; 1.3/1.4/1.5 pendientes), Fase 3 cifrado 0% (requiere rediseño), Fase 4 backend 0%. |

**Justificación del 35%:** la capa de identidad —la más compleja— está mayoritariamente **construida y con los
datos ya migrados**, lo que representa un avance sustancial. Pero **el trabajo no protege a ningún usuario real
todavía**: nada está desplegado en producción, las reglas siguen en `auth!=null`, `pass` sigue en claro y Anonymous
sigue habilitado. Además, dos fases enteras de la visión 4.0 (cifrado local y backend documental) están sin
empezar, y una (cifrado) necesita rediseño. El proyecto ha hecho **la parte difícil de pensar y construir la
identidad**, pero le queda **la parte arriesgada de desplegarla y endurecerla** (1.3/1.4/1.5) más **dos fases
nuevas completas** (3 y 4).

**Riesgo estratégico nº1:** la brecha entre "construido en rama" y "desplegado en producción". Cuanto más tiempo
pase, mayor el riesgo de divergencia entre el Firebase ya migrado y el código de producción que no lo usa. La
decisión más urgente no es técnica sino de **entrega**: publicar y validar el cliente Auth en producción.

**Nota sobre el cierre de Fase L (D18):** no altera el porcentaje (35% / 10% / 70%). Fase L era **precondición de
higiene** (base RTDB limpia para reglas finales), **no el cierre de ninguno de los riesgos R1-R5**. Su cierre
formal aumenta la **confianza** en la base de datos, no la **protección efectiva en producción** — que sigue
dependiendo del despliegue + 1.3/1.4/1.5 + cifrado.

---

## INFORMACIÓN QUE FALTA / NO VERIFICADA (honestidad)
- No verificado byte-a-byte el diff producción vs beta-anterior (se infiere del historial que la seguridad no está en prod).
- Reglas desplegadas == repo: confirmado estructuralmente (G1), no re-verificado hoy.
- Estado real del backend en cuanto a paridad de cálculo con el frontend: no auditado en profundidad (fuera del foco de seguridad).
- Nº exacto de cuentas anónimas: ~816 (estimación de un conteo previo; no re-contado hoy).

**FIN DE LA AUDITORÍA INTEGRAL — solo diagnóstico. Sin cambios.**
