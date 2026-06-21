# CLAUDE.md — PilotPay Beta 3.0

**Versión**: Beta 3.0  
**Rama activa**: `avatars-redesign`  
**Tag estable**: `v3.0.0-beta-sync-stable`  
**GitHub Pages**: desde `avatars-redesign/docs/`

---

## 1. Qué es PilotPay

PilotPay es una plataforma de auditoría salarial y simulación financiera para personal aeronáutico de Binter Canarias.

**No es solo una calculadora de nóminas.** Es un sistema de trazabilidad, auditoría y reclamación.

Prioridades del proyecto:
- Trazabilidad y auditoría
- Precisión financiera
- Interpretación inteligente de discrepancias
- Estabilidad técnica
- Generación profesional de informes y reclamaciones

Perfiles cubiertos:
- CMD (Comandante)
- COP (Copiloto)
- TCP (Tripulante de Cabina)

Motor más desarrollado: pilotos (Grupo IV, convenio BCSA).

---

## 2. Arquitectura actual

### 2.1 Capas de datos — local-first / offline-first

PilotPay es **local-first**. El dispositivo es la fuente de verdad operativa. Firebase es una capa de sincronización secundaria, no autoritativa.

```
localStorage          ← fuente primaria de todos los datos
IndexedDB (IDB)       ← capa de persistencia secundaria (write-through)
Firebase RTDB         ← sincronización multi-device (write-through, nunca pull autoritativo)
```

**Invariante crítico**: ninguna lectura de Firebase debe sobrescribir datos locales sin comparación de timestamps. El merge es siempre conservador (`fbMs > localMs` → Firebase gana; en caso de duda → local gana).

### 2.2 Módulo de sync — P4

El módulo P4 gestiona toda la sincronización Firebase. Está en `frontend/js/pilotPayStore.js`.

- **Flag**: `localStorage.getItem('pilotpay_p4_enabled') === '1'`
- Activable via URL `?p4=1` (solo para testing)
- Sin flag activo: toda la infraestructura P4 es no-op

**Rutas Firebase usadas por P4:**
```
pilotpay/historicos/{userId}/monthly/{year}_{month}
pilotpay/historicos/{userId}/auditorias/{auditId}
pilotpay/historicos/{userId}/deletedAuditorias/{auditId}
```

Documentación detallada del flujo sync: `docs/ARCHITECTURE_SYNC.md`

### 2.3 Frontend

Monolito en `frontend/index.html`. Contiene:
- Lógica de UI y renderizado
- Parser PDF de nóminas
- Dashboard, Comparativa, Simulador, Historial
- Generación PDF, reclamaciones
- Motor explicativo de discrepancias

Módulos JS separados en `frontend/js/`:
- `pilotPayStore.js` — store central, P4, sync
- `pilotPayLocalDB.js` — IndexedDB (IDB v1)
- `auditEngine.js` — motor de auditoría puro
- `userProfile.js` — perfil, aliases canónicos
- `userAdmin.js` — gestión de usuarios (admin)
- `financialProfile.js` — perfil financiero
- `fiscalHistory.js` — historial fiscal
- `avatarManager.js` — sistema de avatares

### 2.4 Backend

`backend/` — motor determinista de cálculo (en desarrollo progresivo):
- Tablas salariales BCSA
- Seguridad Social, IRPF
- Endpoints API (Express)
- Tests automatizados

El frontend **todavía NO está completamente desacoplado** del backend. La lógica de cálculo sigue duplicada parcialmente en el HTML. No introducir nueva lógica de cálculo en frontend si puede centralizarse en backend.

---

## 3. Claves de almacenamiento — NO CAMBIAR

### localStorage
```
pilotpay:{userId}:monthly_v1          ← MonthRecords (fuente de expediente)
pilotpay:{userId}:audit_history_v1    ← historial de auditorías
pilotpay:{userId}:p4_queue            ← cola de sync Firebase pendiente
pilotpay:{userId}:offline_queue       ← cola legacy (perfil/permisos)
pilotpay:{userId}:last_sync_at        ← timestamp del último sync OK
pilotpay:{userId}:p4_pull_backup_*    ← backups previos al pull
pilotpay_v2_{userId}                  ← caché de perfil
pilotpay_theme_{userId}               ← tema del usuario
pilotpay_perms_cache                  ← caché de permisos
pilotpay_admin_perms                  ← permisos admin
pilotpay_p4_enabled                   ← flag P4 (no escobar por userId)
pilotpay_device_id                    ← ID único del dispositivo
pp_ui_mode_v1                         ← modo UI
```

Estas claves son estables. **Cambiarlas rompe la migración de datos existentes.**

### IndexedDB
```
DB: PilotPayLocalDB  (DB_VERSION = 1)
Stores: monthlyRecords, auditHistory
```

### Firebase RTDB paths (activos en app)
```
pilotpay/usuarios/{code}
pilotpay/perfiles/{code}
pilotpay/permisos/{code}
pilotpay/historicos/{userId}/monthly/{year}_{month}
pilotpay/historicos/{userId}/auditorias/{auditId}
pilotpay/historicos/{userId}/deletedAuditorias/{auditId}
pilotpay/solicitudes/{key}
```

Estos paths son estables. **Cambiarlos rompe el sync multi-device.**

### Firebase RTDB paths (retirados de la app, datos preservados)
```
pilotpay/rutas/{key}   ← tabla de rutas ICAO — retirada en Beta 3.0
                          datos en Firebase conservados para fase futura
                          regla de seguridad activa pero UI/código eliminados
```

---

## 4. Seguridad Firebase (P5)

### Reglas activas
Archivo: `firebase-database.rules.json`  
Documentación: `docs/FIREBASE_SECURITY.md`

- **Deny-by-default** en root
- **Reglas por claim (Fase 1.5)**: acceso por `auth.token.code === $userId/$code`; admin por `auth.token.role === 'admin'`. Sin tolerancia anónima.
- Nodos `rutas`/`solicitudes` mantienen `auth != null` (no escopados; pendiente endurecer)
- Validación estructural en nodos críticos (monthly, auditorías, tombstones)
- DELETEs permitidos via `!newData.exists()`

### Auth model
**Firebase Auth Email/Password** (Fase 1.5). Anonymous Auth **DESHABILITADO**. Token Auth (con claims `code`/`role`) adjuntado como `?auth=<token>` en cada llamada vía REST. Sin SDK. El cliente no solicita tokens anónimos (`getAuthToken` es Auth-only).

### Aislamiento por usuario (cerrado en Fase 1.5)
Las reglas RTDB validan `auth.token.code`/`auth.token.role` (claims emitidos por Admin SDK). El usuario A solo accede a `historicos/A`, `perfiles/A`, `permisos/A`, `usuarios/A`; el nodo completo de `usuarios`/`permisos` solo es legible por admin. R3 (cross-user) cerrado a nivel reglas para usuarios Auth.

---

## 5. Principios críticos — NO NEGOCIABLES

### 5.1 Nunca duplicar conceptos derivados
Separar siempre:
- **Causas raíz**: horas de vuelo, DPO, salario base
- **Consecuencias derivadas**: total devengado, base IRPF, retención, líquido neto

Los derivados NO deben sumarse varias veces. La auditoría debe clasificar discrepancias como causa / derivado / neto.

### 5.2 Precisión financiera
- No redondear prematuramente
- Mantener precisión hasta resultado final
- Revisar impacto de cualquier cambio sobre Base SS, Base IRPF, Retención, Líquido neto

### 5.3 Estabilidad > refactor
- Sin reescrituras masivas
- Sin refactors sin motivo real
- Sin cambios estructurales de storage, schemas, paths

### 5.4 Local-first / offline-first
- El dispositivo siempre puede operar sin red
- Firebase es sync, no source of truth
- El pull nunca puede borrar datos locales sin tombstone

### 5.5 Compatibilidad multi-device
- PC Chrome, iPhone Safari PWA, iPad Safari PWA
- Cualquier cambio debe verificarse en los tres
- El P4 Debug Panel es la herramienta de diagnóstico sin consola móvil

### 5.6 Regla Fundacional de Temporalidad — INVARIANTE DEL DOMINIO

**Las variables del mes M se pagan en la nómina del mes M+1.** Nunca en el mismo mes.

```
Variables Enero   → Nómina Febrero
Variables Febrero → Nómina Marzo
Variables Marzo   → Nómina Abril
Variables Abril   → Nómina Mayo
```

Esto **no es una hipótesis, observación, regla temporal ni preferencia de implementación**: es una
**verdad de negocio del modelo retributivo Binter**, asumida como invariante mientras no exista
evidencia documental en contra.

**Aplicación obligatoria** en: Parser Variables, Parser Nómina, Auditorías, Comparativas, Histórico,
Dashboard, Previsión de nómina, Lectura de programación, futuras funcionalidades IA, descubrimiento de
reglas de negocio, validaciones empíricas e informes técnicos.

**Queda expresamente PROHIBIDO:**
- Comparar variables y nómina del **mismo** mes.
- Validar conceptos de variables contra una nómina del mismo periodo.
- Inferir reglas económicas ignorando el desfase M+1.
- Elaborar auditorías o estudios sin aplicar esta correlación temporal.

**Evidencia empírica validada** (solo posible aplicando Variables Febrero → Nómina Marzo):
```
Variables Febrero:  HV 52.19 · Imaginarias 2 · Comité Empresa 1 · Horas Pago 62.19
Reconstrucción:     52.19 + (2 × 3) + (1 × 4) = 62.19
Conclusión:         COMITÉ DE EMPRESA computa como 4 HV.
```

> ⚠️ **Antes de iniciar cualquier análisis relacionado con variables o nóminas, verificar que se está
> aplicando la correlación temporal M → M+1.**

#### Unidad económica fundamental: la HORA DE PAGO

**La unidad económica fundamental del motor de variables es la HORA DE PAGO.** Las actividades deben
transformarse primero a HV equivalentes **antes** de estimar nómina, comparar variables o generar previsión.

```
Actividad → Factor HV → Horas de Pago → Tramos / conceptos económicos → Nómina M+1
```

#### Tabla maestra de equivalencias a HV

| Actividad | Factor | Estado regla | Implementación motor |
|---|---|---|---|
| Hora de Vuelo (HV) | 1 HV | ✅ validado | ✅ implementado (base) |
| Imaginaria | 3 HV | ✅ validado | ✅ implementado (incluida en HB) |
| Franco | 2 HV | ✅ validado | ✅ implementado (incluida en HB) |
| Comité de Empresa | 4 HV | ✅ validado | ⚠️ **pendiente** (no sumado en HB) |
| Oficina / OFC | 4 HV | ✅ validado | ⚠️ **pendiente** (no sumado en HB) |
| GTI (instrucción tierra) | 0,5 HV/hora impartida + suplemento | 🟡 alta confianza (sin validar doc.) | ⚠️ pendiente |
| LTC | HV equivalentes + suplemento ~100 € | 🟡 alta confianza (sin validar doc.) | ⚠️ pendiente |
| LRC | — | ⏳ pendiente validar | ⚠️ pendiente |
| EQE2 | — | ⏳ pendiente validar | ⚠️ pendiente |

> **Estado de implementación:** el motor ya calcula "Horas de Pago Totales (HB)" incorporando Imaginarias×3
> y Francos×2. **Comité de Empresa (×4) y Oficina/OFC (×4) están validados empíricamente pero NO sumados aún
> en HB** → su integración en Parser Variables / motor queda **pendiente**. LTC/GTI/LRC/EQE2 pendientes de
> validar factor antes de implementar.

### 5.7 Base de conocimiento retributivo (en construcción)

> ⚠️ Esta subsección **NO es normativa firme**. Recoge conocimiento del modelo retributivo Binter en
> distintos grados de certeza. **Solo los ítems en nivel 1-2 pueden usarse para cálculo**; el resto es
> contexto para futura validación. No implementar nivel 3-4 sin confirmar.

**Niveles de confianza (no mezclar estados):**
1. **Validada documentalmente** — convenio/acuerdo escrito.
2. **Validada empíricamente** — reconstruida de nóminas reales.
3. **Alta confianza, pendiente de validación documental** — fuente interna fiable (p.ej. Comité de Empresa).
4. **Implementación pendiente** — regla conocida pero aún no modelada en el motor.

**Principio del motor** (ver §5.6): la unidad económica fundamental **no es la actividad, es la Hora de Pago**.
Modelo: `Actividad → Factor HV → Horas de Pago → Concepto económico → Nómina M+1` (Regla Fundacional §5.6).

#### Clasificación de actividades por efecto retributivo
- **TIPO A — generan HV**: Imaginaria, Franco, Comité, Oficina.
- **TIPO B — generan HV + suplemento económico**: GTI, LTC (probable).
- **TIPO C — generan suplemento económico**: Inspecciones, Auditorías.

#### Casuística informada (nivel 3 — alta confianza, sin validar doc.)

| Concepto | Información recibida | Genera HV | Suplemento | Estado |
|---|---|---|---|---|
| **GTI** (instructor tierra) | `HV_GTI = horas impartidas × 0,5` (curso 8h → 4 HV) | Sí (0,5/h) | Sí (importe desconocido) | nivel 3 |
| **LTC** | HV equivalentes + suplemento aprox. **100 €** (exacto no publicado) | Sí | ~100 € | nivel 3 |
| **Inspecciones** | Suplemento **200 €**; ¿genera HV? desconocido; aparición en nómina desconocida | ? | 200 € | nivel 3 |
| **Auditorías** | Suplemento **350 €**; ¿genera HV? desconocido; aparición en nómina desconocida | ? | 350 € | nivel 3 |

#### Ausencias / situaciones especiales (nivel 3-4 — pendiente modelado y validación)
- **Reducciones**: reducen conceptos fijos y complemento de base proporcionalmente. *(pendiente modelado exacto)*
- **Licencias retribuidas**: mantienen la mayor parte de conceptos ordinarios; actualmente reducen complemento de base; situación bajo negociación. *(pendiente validación doc.)*
- **Licencias no retribuidas**: sin evidencia suficiente. *(pendiente documentación real)*
- **Maternidad / Paternidad**: la Seguridad Social abona el 100 % de la base de cotización. *(pendiente nómina real + modelado)*
- **Incapacidad Temporal (IT)**: reduce conceptos fijos y complemento de base; SS paga desde día 4, empresa complementa desde día 7; concepto esperado "Complemento IT"; regla aprox. informada `60 % base cotización / 30 días` entre día 4 y día 20. *(pendiente validación doc.)*
- **Media de variables** (se aplica con vacaciones): `(variables últimos 12 meses ÷ 12 ÷ 30) × días VAC`. Requiere histórico real de 12 meses; sin histórico suficiente → estimar o marcar confianza reducida. *(nivel 3, alta confianza)*

---

## 6. Motor de auditoría

### Clasificación de discrepancias

| Tipo | Descripción | Ejemplo |
|---|---|---|
| **Causa** | Origen de la discrepancia real | Horas de vuelo, DPO, salario base |
| **Derivado** | Consecuencia automática de otra causa | Total devengado, base IRPF, retención |
| **Neto** | Impacto económico final percibido | Líquido neto diferencial |

**Reglas críticas:**
- Los derivados NO generan impacto independiente
- La diferencia total NO suma derivados múltiples
- La auditoría debe explicar: origen probable, impacto real, consecuencias automáticas

> **Correlación temporal obligatoria (ver §5.6):** la auditoría compara `variables[M]` contra `nómina[M+1]`,
> nunca contra la nómina del mismo mes.

---

## 7. Parser PDF de nóminas

- Priorizar precisión, seguridad y trazabilidad
- **Nunca usar NIF empresa como NIF trabajador**
- Si el NIF no puede detectarse con seguridad: devolver vacío o "No detectado"
- La actualización de perfil/histórico desde parser NO es automática: requiere validación visual y confirmación explícita del usuario

> **Correlación temporal obligatoria (ver §5.6):** una nómina del mes M+1 paga las variables del mes M.
> El parser y todo análisis deben enlazar `variables[M]` ↔ `nómina[M+1]`, nunca el mismo mes.

---

## 8. UI / UX

Imagen: **premium, profesional, limpia, sobria, técnica.**

Evitar: aspecto gaming, exceso de colores agresivos, ruido visual, botones redundantes, badges innecesarios.

Principios:
- Menos bloques, mejor jerarquía
- El dashboard es un panel operativo, no un menú
- Layouts fluidos y responsive (móvil, tablet, desktop)
- Cualquier nuevo módulo debe comprobarse en los tres formatos

---

## 9. Flujo de cambios

### Cambios pequeños (visuales, textos, alineaciones)
Pueden aplicarse directamente.

### Cambios grandes
Claude debe:
1. Explicar qué entiende del problema
2. Indicar archivos afectados, riesgos y dependencias
3. Esperar confirmación antes de implementar

### Cambios críticos — requieren análisis previo
Antes de tocar cualquiera de estos:
- Cálculo de nómina o IRPF
- Parser PDF
- Motor de auditoría (auditEngine.js)
- Comparativa
- Backend
- Histórico / schemas de MonthRecord o AuditRecord
- Storage keys, IDB stores, Firebase paths
- Lógica de sync (P4)
- Reglas Firebase

Claude debe: analizar dependencias, evitar regresiones silenciosas, proponer diff antes de implementar.

### Diagnóstico antes de fixes
Antes de cualquier fix de sync o resurrección de datos:
1. Usar P4 Debug Panel en el dispositivo problemático
2. Ejecutar `await P4Debug.inspectMonthly()` en consola
3. Comparar conteos entre dispositivos
4. Identificar la capa exacta donde divergen los datos
5. Solo entonces proponer fix quirúrgico

---

## 10. Git y checkpoints

Rama activa: `avatars-redesign`  
Publicación: GitHub Pages desde `avatars-redesign/docs/`  
Sync: `npm run sync` (copia `frontend/` → `docs/`)

Tags estables:
```
v2.2.0-stable
v2.3.0-p4-write-upload-ok
v2.4.0-p4-sync-complete
v2.5.0-p5-security-sync-stable
v3.0.0-beta-sync-stable          ← actual
```

Crear checkpoint antes de:
- Cambios UI grandes
- Parser o comparativa
- Motor de cálculo
- Backend
- Dashboard
- Cualquier cambio en P4/sync

---

## 11. Estado funcional actual (Beta 3.0)

### Operativo y estable
- Dashboard con expediente activo y última auditoría separados
- Calculadora de nómina (CMD/COP/TCP)
- Variables mensuales (parser PDF + pegar texto)
- Simulador IRPF
- Comparativa inteligente
- Historial de auditorías con clasificación causa/derivado/neto
- **Parser Nómina V2** — validado en producción: extrae IRPF %, SS %, coste empresa, acumulados y `tablaConceptos` completa; clasificación ~100% en muestras; fallback automático a V1 si confidence < 0.5
- **Persistencia nominaV2** — `AuditRecord.nominaV2` completa (localStorage + IDB + Firebase); base del motor de inteligencia histórica
- **IRPF AUTO-DETECT (Fase 1)** — detecta el IRPF real de la nómina y permite recálculo manual de la auditoría; persiste `irpfMetadata`; NO sobrescribe `profileData.irpf`
- Parser PDF de nóminas V1 (fallback de seguridad) con extracción de acumulados
- Generación de reclamaciones y PDF de nómina
- Gestión de perfiles y avatares
- Sync multi-device (P4): monthly, auditorías, tombstones, pull, queue
- Firebase Security Rules: reglas por claim (Fase 1.5, ver §4) — aislamiento por usuario
- Monitor de sincronización (admin, solo lectura)
- Backend motor de cálculo (parcial, en progreso)

> **Fuente documental ampliada:** el detalle de estado, validaciones, evidencias y decisiones de estos
> bloques de producto (Parser Nómina V2, persistencia nominaV2, IRPF AUTO-DETECT, Dashboard 2.x, Biblioteca
> Normativa, roadmap de Proyección Operativa) vive en `docs/CLAUDE.md` §13.x. Este root resume el estado;
> `docs/CLAUDE.md` es la referencia canónica de producto.

### Retirado en Beta 3.0 (sin eliminar datos)
- **Panel de rutas ICAO (Admin)**: código eliminado; datos en `pilotpay/rutas` preservados en Firebase
- **Modo "PDF Prog." en Variables**: placeholder eliminado; feature no implementada

### Limitaciones conocidas
- `usuarios.$code` permite self-write (incl. `bloqueado`); no enforced field-level — deuda menor (claim-based evita escalada admin)
- `rutas`/`solicitudes` con `auth != null` (no escopados por claim) — pendiente endurecer
- Rama raíz `/usuarios` duplicada: inaccesible (deny-by-default), pendiente limpieza con backup
- Frontend no completamente desacoplado del backend
- GC de tombstones >180 días pendiente (TODO en código)

### Fase 1.5 — Cierre (2026-06)

Estado: **CERRADA**

Evidencias:
- Cliente Auth-only desplegado.
- Claims verificados:
  - ESH → role=admin, code=ESH
  - BZP → role=user, code=BZP
- Reglas claim-based desplegadas en RTDB.
- V6 PASS: BZP no puede acceder a `historicos/ESH`.
- Matriz V1–V11 PASS (PC/iPhone/iPad).
- Campo `pass` eliminado de usuarios ESH y BZP.
- Anonymous Authentication deshabilitado.
- R2 y R3 cerrados.

Riesgos residuales:
- `usuarios.$code` permite self-write.
- `rutas` y `solicitudes` continúan con `auth != null`.
- nodo raíz `/usuarios` pendiente de limpieza futura.

---

## 11-bis. Diseños aprobados pendientes de implementación

> Esta sección recoge **diseños aprobados que NO están implementados**. No forman parte del estado
> funcional actual (§11) ni del roadmap completado. No usar como referencia de funcionalidad existente.

### VariableRecordV2 — Diseño aprobado · NO implementado

**Propósito:** persistir el **lado-variables** del mes para habilitar Media de Variables 12m, previsión,
comparativas históricas y auditoría más precisa. Es la única pieza hoy inexistente (el lado-variables vive
en `varsData`, runtime efímero). Se almacena como sub-objeto del `MonthRecord` del **mes de actividad**.

**Estructura (Versión B aprobada):**
```jsonc
"variableRecordV2": {
  "schemaVersion": "vr2.0",
  "mesActividad": 2, "anioActividad": 2026,         // clave por ACTIVIDAD (no por mes de nómina)
  "periodoInicio": "2026-02-01", "periodoFin": "2026-02-28",
  "hvReales": 52.19,
  "horasPagoPublicada": 62.19,                        // autoridad del PDF de variables
  "tramos": { "t1": 8, "t2": 6.19, "t3": null, "t4": null },
  "actividades": { "imaginarias": 2, "francos": 0, "comite": 1 }, // solo factores demostrados
  "diasVacaciones": 0,
  "economicas": { "dpo": 0, "compMad": 1500, "dietaVuelo": 9 },
  "totalVariablesMes": 0.0,                           // € de variables del mes (para media 12m)
  "otros": [],                                        // {etiqueta,valor} — gaps e hipótesis no demostradas
  "gapHV": 0.0,                                        // horasPagoPublicada − reconstrucción (si ≠ 0)
  "nominaPago": "2026:03",                            // M+1 (cacheado para queries)
  "tramosPagadosNomina": { "t1": 8, "t2": 6.2 },     // prueba real del enlace M→M+1
  "validadoContraNomina": false,
  "confidence": 0.0,
  "requiereRevisionManual": false,
  "_updatedAt": "..."                                 // merge por timestamp (igual que MonthRecord)
}
```

**Reglas arquitectónicas (vinculantes):**
1. `VariableRecordV2` almacena **exclusivamente** información del **mes de actividad (M)**.
2. `nominaV2` sigue siendo la **fuente de verdad de la nómina M+1**. VR2 no la duplica.
3. `AuditRecord` sigue siendo la **fuente de verdad de auditorías**.
4. VR2 **no persistirá campos derivados** (factor VAC, base/ancho ajustados, horasPagoCalculadas, mediaDía → se calculan al vuelo).
5. VR2 **no tendrá campos dedicados para hipótesis no demostradas** (GTI, LTC, OFC, inspecciones, auditorías…). Hasta su validación vivirán en `otros[]`.
6. VR2 debe **reutilizar nombres y semántica de `varsData`** siempre que sea posible (VR2 ≈ snapshot persistido de `varsData`).

**Integración:** sub-objeto dentro de `MonthRecord` (`monthly_v1`), sin nuevas storage keys (CLAUDE.md §3) y sin tocar la máquina de estados ni el sync P4. Aditivo y retrocompatible (`variableRecordV2: null` en registros antiguos). Correlación temporal: ver §5.6.

---

## 12. Roadmap — fases futuras (no activas en Beta 3.0)

Funcionalidades identificadas pero explícitamente aplazadas:

### Lectura de programación y forecast mensual
- Parser de PDF de programación eCrew (sistema de programación de Binter)
- Carga automática de horas bloque por ruta desde tabla ICAO
- Forecast de nómina a partir de la programación del mes
- La tabla `pilotpay/rutas` en Firebase es la infraestructura de datos reservada para esta fase
- **No desarrollar hasta que Beta 3.0 esté estabilizada y se decida retomar**

### Firebase Custom Auth + backend
- Aislamiento real por usuario en reglas Firebase (`auth.uid === $userId`)
- Requiere backend (Cloud Function) que emita custom tokens
- Documentado en `docs/FIREBASE_SECURITY.md`

---

## 13. Filosofía general

PilotPay no busca añadir funciones rápidamente, llenar pantallas ni parecer complejo.

Busca:
- Precisión y claridad
- Utilidad real para el usuario
- Auditoría profesional y trazable
- Experiencia premium y estable
- Compatibilidad multi-device sin fricciones
