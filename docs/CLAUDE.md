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
- Biblioteca Normativa
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
- **`auth != null`** requerido en todos los paths
- Validación estructural en nodos críticos (monthly, auditorías, tombstones)
- DELETEs permitidos via `!newData.exists()`

### Auth model
**Firebase Anonymous Auth** via REST API. Sin SDK. Token adjuntado como `?auth=<token>` en cada llamada.

### Limitación conocida (documentada, no resoluble sin backend)
El `auth.uid` anónimo no está correlacionado con los códigos de usuario de la app (`ESH`, `COP`…). Firebase **no puede** verificar que el usuario A solo acceda a `historicos/A/`. El aislamiento por usuario es enforced únicamente en cliente.

La solución real (Firebase Custom Auth + backend) está documentada en `docs/FIREBASE_SECURITY.md` pero **no está en el roadmap inmediato**.

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

---

## 7. Parser PDF de nóminas

- Priorizar precisión, seguridad y trazabilidad
- **Nunca usar NIF empresa como NIF trabajador**
- Si el NIF no puede detectarse con seguridad: devolver vacío o "No detectado"
- La actualización de perfil/histórico desde parser NO es automática: requiere validación visual y confirmación explícita del usuario

**Nota:** Estos principios se aplican a todos los parsers de PilotPay:
- Parser Nómina V1 (activo)
- Parser Nómina V2 (implementado, validación completa pendiente → 13.1)
- Parser Variables V2 (diseño aprobado, implementación pendiente → 13.12)

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

### Filosofía visual validada

PilotPay debe sentirse como:

* herramienta profesional
* panel operativo
* briefing financiero
* sistema de auditoría

**NO como:**

* banca personal
* trading
* criptomonedas
* dashboard de marketing

La información debe priorizar:

* **claridad**
* **contexto**
* **siguiente acción**

por encima del impacto visual de una cifra aislada.

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
- Dashboard 2.x: briefing financiero con expediente activo, última auditoría separados, y Evolución anual (ver 13.9)
- Calculadora de nómina (CMD/COP/TCP)
- Variables mensuales (parser PDF + pegar texto)
- Simulador IRPF
- Comparativa inteligente
- Historial de auditorías con clasificación causa/derivado/neto
- Parser PDF de nóminas V1 con extracción de acumulados
- Parser Nómina V2: implementado y validado con nóminas reales, persistencia nominaV2 pendiente merge a main (ver 13.1, 13.2)
- Generación de reclamaciones y PDF de nómina
- Gestión de perfiles y avatares
- Sync multi-device (P4): monthly, auditorías, tombstones, pull, queue
- Firebase Security Rules (P5): deny-by-default + auth requerida
- Monitor de sincronización (admin, solo lectura)
- Backend motor de cálculo (parcial, en progreso)
- Biblioteca Normativa: Convenio Colectivo, Acuerdos, Productividad, glosario contextual, referencias cruzadas (ver 13.11)

### Retirado en Beta 3.0 (sin eliminar datos)
- **Panel de rutas ICAO (Admin)**: código eliminado; datos en `pilotpay/rutas` preservados en Firebase
- **Modo "PDF Prog." en Variables**: placeholder eliminado; feature no implementada

### Limitaciones conocidas
- Cross-user isolation solo en cliente (no en Firebase rules)
- Contraseñas en `pilotpay/usuarios` visibles a sesiones anónimas autenticadas
- Frontend no completamente desacoplado del backend
- GC de tombstones >180 días pendiente (TODO en código)

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

## 13. Decisiones arquitectónicas y funcionales validadas

Esta sección documenta decisiones ya validadas mediante código, auditoría o pruebas reales durante el desarrollo de PilotPay Beta 3.0.

### 13.1 Parser Nómina V2

**Estado:** Validado con nóminas reales CMD y COP.

**Rama:** `parser-nomina-v2`

**Clasificación conseguida:** 100% en muestras auditadas.

**Extracción validada de campos nuevos (vs V1):**

| Campo | Detectado | Crítico |
|---|---|---|
| **IRPF %** | ✅ SÍ | SÍ |
| **SS CC %** | ✅ SÍ | SÍ |
| **SS MEI %** | ✅ SÍ | SÍ |
| **SS D+FP %** | ✅ SÍ | SÍ |
| **Coste empresa completo** | ✅ SÍ | NO |
| **Acumulados desglosados** | ✅ SÍ | SÍ |
| **Nivel** | ✅ SÍ | SÍ |
| **Puesto** | ✅ SÍ | NO |
| **Complemento MAD** | ✅ SÍ | NO |
| **Incentivo movilidad** | ✅ SÍ | NO |
| **Seguro pérdida licencia** | ✅ SÍ | NO |
| **Plan pensiones** | ✅ SÍ | NO |
| **Préstamos** | ✅ SÍ | NO |
| **Solidaridad (TR1/2/3)** | ✅ SÍ | NO |
| **tablaConceptos completa** | ✅ SÍ | SÍ |
| **calendarioMensual completo** | ✅ SÍ | NO |

**Arquitectura de parsing:**

- **Parser V2:** Extracción documental completa con clasificación de conceptos
- **Parser V1:** Permanece como fallback de seguridad
- **Fallback automático:** Si V2 falla o confidence < umbral, usa V1 silenciosamente
- **Modo debug:** `localStorage.setItem('pilotpay_parser_debug', '1')` para inspeccionar V2

**Validación realizada:**
- 8 nóminas reales CMD/COP procesadas
- Todos los campos críticos detectados correctamente
- 0 errores de clasificación en conceptos conocidos
- Compatibilidad total con V1 (no rompe nada)

---

### 13.2 Persistencia nominaV2

**Decisión aprobada:** `AuditRecord` almacenará `nominaV2` completa.

**Objetivo:**
Conservar toda la información estructurada extraída de la nómina para:
- Estadísticas futuras
- Análisis históricos
- Mejora de precisión en auditorías
- Trazabilidad completa de datos fuente

**Restricciones de privacidad y tamaño:**
- ❌ NO almacenar PDF bruto
- ❌ NO almacenar `raw.text` completo
- ❌ NO almacenar `raw.lines` completo
- ❌ NO almacenar `rawLine` en `tablaConceptos`
- ✅ SÍ almacenar estructura completa V2 limpia

**Estructura `AuditRecord.nominaV2`:**
```javascript
{
  empresa: { nif, nombre },
  trabajador: { nombre, nif, nss, fecha_ingreso, funcion, nivel, base, puesto, categoria, grupo_profesional, centro_trabajo },
  periodo: { mes, anio, fecha_inicio, fecha_fin },
  tablaConceptos: [
    { tipo, subtipo, concepto, unidades, porcentaje, base, devengo, retencion, importe, especieInfo, confidence }
    // NO incluye rawLine (privacidad)
  ],
  devengos: { ...todos },
  deducciones: { ...todos },
  bases: { base_ss, base_irpf },
  totales: { total_devengado, total_deducciones, base_irpf, base_ss, liquido },
  costeEmpresa: { total, cc, mei, solidaridad_tr1/2/3, it_ims, desempleo, fp, fogasa },
  acumulados: { base_irpf, irpf, cotiz_ss, base_esp_rep, irpf_esp_rep, base_esp_norep, irpf_esp_norep },
  calendarioMensual: { diasInfo, bajaInfo },
  confidence: { ...por campo + global },
  warnings: [...],
  metadata: { parsingTimeMs, linesClassified, linesUnclassified }
}
```

**Estado actual:**
- ✅ Implementado en `frontend/js/auditEngine.js` (commit `dab9221`)
- ✅ Sincronizado a `docs/js/auditEngine.js`
- ⏳ Pendiente: validación completa de persistencia localStorage + IDB + Firebase
- ⏳ Pendiente: merge a `main`

**Tamaño estimado:** ~8-12 KB por AuditRecord (vs ~1-2 KB actual)

**Compatibilidad:** Auditorías antiguas sin `nominaV2` siguen funcionando (`nominaV2: null`)

---

### 13.3 Regularización — Sistema existente validado

**Descubrimiento:** La regularización **YA EXISTE** y funciona correctamente.

**Fuente de verdad:** `MonthRecord.regularizacion`

**Estructura actual:**
```javascript
MonthRecord.regularizacion = {
  tipo: 'acuerdo_manual',           // tipo de regularización
  importeNeto: number,              // diferencia regularizada
  netoFinalAjustado: number,        // líquido + importeNeto
  nota: string,                     // texto descriptivo del ajuste
  fecha: string (YYYY-MM-DD),       // fecha del evento
  docNombre: string | null,         // nombre documento asociado
  registrado: string (ISO)          // timestamp de registro
}
```

**Almacenamiento validado:**
- ✅ localStorage: `pilotpay:{userId}:monthly_v1` (campo `regularizacion`)
- ✅ IndexedDB: store `monthlyRecords` (campo `regularizacion`)
- ✅ Firebase: `pilotpay/historicos/{userId}/monthly/{year}_{month}` (campo `regularizacion`)

**Sincronización validada:**
- ✅ Write-through a IndexedDB (best-effort)
- ✅ Write-through a Firebase (P4, si activo)
- ✅ Pull desde Firebase (merge por timestamp)

**Recuperación validada:**
- ✅ Fuente primaria: `MonthRecord.regularizacion`
- ✅ Fallback legacy: `AuditRecord.regularizacionFinal` (compatibilidad)
- ✅ Renderizado en historial: badge `'ok'` forzado si regularizada

**Impacto en estado:**
- Al regularizar: `MonthRecord.estado` cambia a `'regularizado'`
- Badge visual en historial forzado a `'ok'` aunque haya diferencias

**Decisión:**
❌ **NO crear** sistemas alternativos de `notaAjuste` o notas de auditoría.  
✅ **SÍ usar** `MonthRecord.regularizacion` existente.

---

### 13.4 Arquitectura de datos validada

#### MonthRecord — Expediente mensual

**Concepto:** Expediente mensual vivo y mutable.

**Responsabilidades:**
- Almacenar **estado actual** del mes
- Consolidar datos de múltiples fuentes: variables, cálculo, nómina, auditoría
- Actuar como **fuente de verdad** para regularización
- Mantener **máquina de estados** del expediente
- Permitir **re-auditorías** (estado mutable)

**Clave única:** `userId:year:month` (1 expediente por mes/año/usuario)

**Storage:**
- localStorage: `pilotpay:{userId}:monthly_v1` (dict por `year:month`)
- IndexedDB: store `monthlyRecords` (key = `id`)
- Firebase: `pilotpay/historicos/{userId}/monthly/{year}_{month}`

**Estados:**
- `'pendiente'` — mes futuro/sin datos
- `'con_datos'` — tiene variables o cálculo
- `'auditado'` — tiene auditoría
- `'con_diferencias'` — auditoría con discrepancias
- `'regularizado'` — diferencias regularizadas

---

#### AuditRecord — Registro histórico

**Concepto:** Registro histórico inmutable (append-only en concepto).

**Responsabilidades:**
- Almacenar **snapshot completo** de cada auditoría realizada
- Preservar **trazabilidad** de todas las auditorías de un mes
- Contener **nominaV2 completa** para análisis históricos
- Servir de **fuente para estadísticas** y tendencias

**Clave única:** `timestamp_random` (ID único global, permite múltiples auditorías del mismo mes)

**Storage:**
- localStorage: `pilotpay:{userId}:audit_history_v1` (array, trim a 100)
- IndexedDB: store `auditHistory` (key = `id`)
- Firebase: `pilotpay/historicos/{userId}/auditorias/{id}`

**Inmutabilidad:** Una vez creado, NO se modifica (no existe `updateAuditRecord()`)

---

#### Relación MonthRecord ↔ AuditRecord

```
1 mes/año/usuario → 1 MonthRecord (expediente mutable)
                  → N AuditRecords (historial inmutable)
```

**MonthRecord.auditoria:**
- Snapshot de la **última auditoría** del mes
- NO es referencia a AuditRecord (es copia independiente)
- Puede quedar huérfano si se borra el AuditRecord

**Problema conocido:** Borrar `AuditRecord` NO actualiza `MonthRecord.auditoria`  
**Estado:** Pendiente de resolución (requiere cascada de borrado)

---

### 13.5 Auditoría única por mes

#### Decisión funcional aprobada

**Regla:** Solo puede existir **una auditoría cerrada válida** por usuario/mes/año.

```
1 usuario + 1 mes + 1 año = 1 auditoría cerrada válida
```

**Objetivo:**
- Mantener historial limpio y preciso
- Evitar confusión sobre qué auditoría es la válida
- Facilitar estadísticas y análisis

**Esta decisión funcional está aprobada.**

---

#### Propuesta de diseño (pendiente de validación)

**IMPORTANTE:** Lo siguiente es una propuesta de implementación que aún forma parte de la auditoría técnica en curso. NO está aprobada ni implementada.

**Propuesta de flujo de sustitución:**

1. Usuario intenta cerrar auditoría de un mes ya auditado
2. PilotPay detecta auditoría cerrada existente
3. Modal de confirmación (texto propuesto)
4. Si sustituye: marcaje como reemplazada

**Propuesta de campos nuevos:**
```javascript
// PROPUESTA — NO IMPLEMENTAR hasta aprobar diseño final
AuditRecord = {
  // ... campos actuales ...
  estadoCiclo?: string,         // propuesto: 'cerrada', 'validada', 'reemplazada'
  fechaCierre?: string (ISO),   // propuesto: timestamp cierre por usuario
  reemplaza?: string | null,    // propuesto: ID de auditoría anterior
  reemplazadaPor?: string | null // propuesto: ID de auditoría sustituta
}
```

**Estado propuesta:** ❓ Pendiente de validación técnica

**Preguntas abiertas:**
- ¿Cómo implementar "auditoría cerrada" sin romper guardado actual?
- ¿Dónde validar duplicados? (antes de guardar vs después)
- ¿Cómo sincronizar `estadoCiclo` multi-device?
- ¿Qué pasa si se cierra auditoría offline y hay conflict al sincronizar?
- ¿Cómo gestionar `reemplazadaPor` en pull desde Firebase?
- ¿Cómo afecta esto a `MonthRecord.auditoria`?

**Estas preguntas se responderán al finalizar la auditoría técnica del flujo de guardado.**

---

### 13.6 Meses faltantes

#### Decisión funcional aprobada

**Regla:** Avisar solo de meses faltantes **del año actual**, hasta la **última auditoría cerrada**.

```
Solo detectar meses del año natural en curso
Solo hasta la última auditoría cerrada
```

**NO revisar:**
- ❌ Años anteriores
- ❌ Meses futuros
- ❌ Meses posteriores a la última auditoría cerrada
- ❌ Mes actual si no está cerrado

**Ejemplo validado:**
```
Año actual: 2026
Última auditoría cerrada: Mayo 2026
Auditorías cerradas: Enero, Febrero, Abril, Mayo

Detectar faltante: Marzo 2026
NO detectar: Junio 2026 (posterior a última cerrada)
```

**Esta decisión funcional está aprobada.**

---

#### Propuesta de diseño (pendiente de validación)

**IMPORTANTE:** Lo siguiente es una propuesta de implementación. NO está aprobada ni implementada.

**Propuesta de algoritmo:**
```javascript
// PROPUESTA — NO IMPLEMENTAR hasta aprobar diseño final
function detectMesesFaltantes(userId) {
  const year = new Date().getFullYear();
  const auditsCerradas = getAuditoriasCerradas(userId, year);
  
  if (auditsCerradas.length === 0) {
    return [];  // Sin auditorías → sin alertas
  }
  
  const maxMes = Math.max(...auditsCerradas.map(a => mesIndex(a.mes)));
  
  const faltantes = [];
  for (let i = 0; i <= maxMes; i++) {
    if (!auditsCerradas.some(a => mesIndex(a.mes) === i)) {
      faltantes.push(mesesNombres[i]);
    }
  }
  
  return faltantes;
}
```

**Propuesta de UI:**
Badge discreto en dashboard (texto propuesto):
```
"📋 Faltan meses por auditar: febrero 2026, marzo 2026.

Mantener el historial completo mejora la precisión de PilotPay."

[Ir a comparativa]
```

**Estado propuesta:** ❓ Pendiente de validación técnica

**Preguntas abiertas:**
- ¿Cómo definir "auditoría cerrada" si no existe `estadoCiclo` todavía?
- ¿Dónde renderizar el aviso? (dashboard, historial, ambos)
- ¿Con qué frecuencia verificar? (cada load, cada día)
- ¿Cómo manejar usuario sin auditorías cerradas del año?
- ¿Debe persistir el estado "ya vi este aviso"?

**Estas preguntas se responderán al finalizar la auditoría técnica del flujo de guardado.**

---

### 13.7 IRPF real — Decisión aprobada para fase futura

**Decisión funcional:** Utilizar el **porcentaje IRPF real detectado** en la nómina para cálculos futuros.

**Objetivo:**
Alinear cálculos, simulaciones y comparativas con el porcentaje IRPF realmente aplicado por la empresa, en lugar del porcentaje configurado manualmente por el usuario.

**Flujo aprobado:**
1. Parser V2 detecta IRPF % en nómina real
2. Se almacena en `nominaV2.deducciones.irpf_pct`
3. PilotPay sugiere actualizar `profileData.irpf` con el valor detectado
4. Usuario confirma o rechaza
5. Si acepta: simulaciones y cálculos usan IRPF real actualizado

**Campos involucrados:**
- **Fuente:** `nominaV2.deducciones.irpf_pct` (extraído del PDF)
- **Destino:** `profileData.irpf` (perfil usuario)
- **Uso:** Motor de cálculo, simulador IRPF, comparativas

**Ventajas:**
- Mayor precisión en simulaciones futuras
- Detecta cambios automáticos de IRPF por empresa
- Reduce discrepancias por IRPF desactualizado

**Estado:** ⏳ Pendiente de implementación (fase futura, post-Beta 3.0)

---

#### Distinción conceptual obligatoria

PilotPay debe diferenciar tres conceptos:

1. **IRPF estimado del usuario** — configurado en perfil
2. **IRPF detectado en nómina empresa** — extraído del PDF real
3. **IRPF utilizado para comparativa** — valor usado en cálculo teórico

Estos valores pueden coincidir o no.

**Nunca asumir automáticamente que son el mismo dato.**

---

**Objetivo futuro:**

Cuando exista suficiente confianza documental:

* Detectar IRPF real desde Parser Nómina V2
* Permitir actualizar IRPF del perfil mediante confirmación explícita del usuario
* Utilizar IRPF real para mejorar precisión de comparativas y simulaciones

**Sin sobrescribir silenciosamente la configuración fiscal del usuario.**

---

### 13.8 Bloqueo arquitectónico actual

**IMPORTANTE:** Las siguientes áreas están **bloqueadas para modificaciones** hasta finalizar la auditoría técnica completa del flujo de guardado.

**Áreas bloqueadas:**
- ❌ Ciclo de vida de auditorías
- ❌ Concepto "auditoría cerrada"
- ❌ Guardado automático vs guardado explícito
- ❌ Historial de auditorías
- ❌ Sincronización multi-device (P4)
- ❌ Esquemas `AuditRecord` o `MonthRecord` (salvo `nominaV2`)
- ❌ Borrado de auditorías
- ❌ Borrado de usuarios

**Motivo:** Auditoría técnica en curso del flujo completo:
```
Variables
  ↓
Cálculo
  ↓
Nómina
  ↓
Comparativa
  ↓
AuditRecord
  ↓
MonthRecord
  ↓
localStorage
  ↓
IndexedDB
  ↓
Firebase
  ↓
Historial
```

**Estado auditoría:** En progreso (junio 2026)

**Decisiones pendientes de auditoría:**
1. ¿Cuándo se debe guardar una auditoría? (automático vs botón "Cerrar")
2. ¿Cómo validar mes duplicado antes de guardar?
3. ¿Cómo gestionar borrado de auditorías? (cascada a MonthRecord)
4. ¿Cómo gestionar borrado de usuarios? (purga completa)
5. ¿Cómo prevenir resurrección de datos desde colas P4/offline?
6. ¿Cómo resolver conflicts multi-device en auditorías del mismo mes?

**Documentos de auditoría:**
- Informe completo de persistencia y borrado (junio 2026)
- Mapa de riesgos detectados (18 preguntas críticas respondidas)
- Propuestas de corrección (pendientes de aprobación)

**Hasta que la auditoría finalice:**
- ✅ Permitido: Parser V2, persistencia nominaV2, UI no relacionada con guardado
- ❌ Prohibido: Cambios en ciclo de vida, guardado, borrado, sync

---

### 13.9 Dashboard 2.x — Filosofía validada

**Estado:** Implementado y validado mediante uso real.

**Objetivo:**
El Dashboard no es un menú ni una pantalla financiera tradicional.

Su función es actuar como un:

**Briefing financiero profesional.**

Debe responder en pocos segundos a tres preguntas:

1. ¿Cómo estoy?
2. ¿Qué es normal para mí?
3. ¿Qué tengo pendiente?

---

#### Arquitectura validada

Hero financiero de tres bloques:

* Último salario auditado
* Referencia habitual
* Próximo ciclo

La información debe leerse de izquierda a derecha:

Situación actual
→ Referencia
→ Próxima acción

---

#### Principios validados

* El Dashboard NO es una app bancaria.
* El Dashboard NO gira alrededor de una cifra gigante.
* El salario debe destacar, pero no dominar.
* El contexto es tan importante como el importe.
* El usuario debe entender su situación, no contemplar una cifra.

---

#### Elementos eliminados deliberadamente

Se consideran ruido en Dashboard:

* Actividad reciente
* Auditorías recientes
* Días restantes hasta cierre
* Antigüedad
* Nivel salarial
* Datos históricos secundarios
* Información disponible en otras pantallas

---

#### Evolución anual

El Dashboard incorpora la sección:

"Evolución 2026"

Características:

* SVG inline
* Curva histórica de meses auditados
* Sin etiquetas permanentes sobre los puntos
* Línea de referencia de media anual
* Tooltip por hover en Desktop
* Preparada para forecast futuro eCrew

**Representación de datos:**

* Los meses mostrados corresponden únicamente a meses auditados
* No se representan meses futuros sin datos
* El histórico se expande automáticamente conforme se auditan nuevos meses

La gráfica tiene función orientativa y visual.

No sustituye al Historial.

---

### 13.10 UX Multi-dispositivo

**Estado:** Filosofía validada.

PilotPay no presenta necesariamente la misma experiencia en todos los dispositivos.

La experiencia debe adaptarse al contexto de uso.

---

#### Desktop

**Objetivo:** Visión completa del expediente.

**Características:**
* Dashboard completo
* Evolución anual visible
* Hover tooltips
* Máxima densidad informativa aceptable

---

#### Mobile Portrait

**Objetivo:** Estado inmediato.

El usuario normalmente consulta PilotPay:

* en aeropuerto
* durante escalas
* en transporte
* en briefing room

Debe responder rápidamente:

* cómo estoy
* qué cobré
* qué tengo pendiente

**Principio:**

Portrait = Estado

---

#### Mobile Landscape

**Objetivo:** Análisis rápido de evolución.

**Principio:**

Landscape = Evolución

La gráfica puede adquirir mayor protagonismo.

---

#### Tablet Portrait

Comportamiento intermedio entre móvil y desktop.

**Prioridad:** Estado actual del ciclo.

---

#### Tablet Landscape

**Principio validado:**

Siempre que el ancho disponible lo permita, se prioriza conservar paneles laterales y experiencia cercana a Desktop.

---

### 13.11 Biblioteca Normativa — Módulo consolidado

**Estado:** Operativo y validado en Desktop, iPad, iPhone.

---

#### Alcance del módulo

La Biblioteca Normativa proporciona acceso navegable a:

* **Convenio Colectivo** — Texto completo del convenio BCSA aplicable
* **Acuerdos y Aplicación** — Acuerdos específicos de aplicación del convenio
* **Acuerdo de Productividad** — Normativa de productividad y roster
* **Referencias cruzadas** — Enlaces bidireccionales entre documentos. Las referencias deben apuntar únicamente a fuentes documentales reales.
* **Glosario contextual** — Definiciones de términos técnicos y legales
* **Tablas salariales documentales** — No utilizan `renderSalaryBlock`. Se presentan mediante modal documental contextual.

---

#### Separación funcional

**Principio arquitectónico validado:**

```
Biblioteca Normativa ≠ Motor de cálculo
```

La Biblioteca Normativa es un **visor documental**.

Las referencias documentales abren documentación, **nunca** herramientas de cálculo.

---

#### Reglas de navegación validadas

* Referencias a Productividad y Roster navegan al visor Acuerdos
* Tablas salariales se presentan mediante modal documental
* El glosario NO sustituye al contenido, lo complementa

---

#### Glosario contextual

**Características:**

* **Contextual:** Solo aparece cuando el término está presente en el contenido visible
* **Bidireccional:** Funciona tanto en Convenio como en Acuerdos
* **Selectivo:** Solo términos técnicos, legales o de convenio

---

#### Filosofía visual

La Biblioteca Normativa debe sentirse como:

* visor documental premium
* herramienta profesional
* consulta jurídica navegable

**NO como:** wiki, PDF incrustado, formulario administrativo.

---

### 13.12 Parser Variables V2

**Estado:** Diseño aprobado. Implementación pendiente.

---

#### Flujo operativo actual

PilotPay ya dispone de un flujo operativo de Variables:

```
PDF Variables
  ↓
Interpretación
  ↓
Presentación al usuario
  ↓
Corrección manual
  ↓
Validación
  ↓
Paso a Calculadora
```

**Este flujo NO debe cambiar.**

---

#### Objetivo de Variables V2

El objetivo de Variables V2 **NO es automatizar completamente**.

**El objetivo es:**

* Aumentar capacidad de interpretación
* Reducir correcciones manuales
* Detectar conceptos aunque cambie su redacción

---

#### Principio arquitectónico validado

**PilotPay NO debe depender de textos exactos.**

Los PDFs de variables son generados manualmente por personas.

Un mismo concepto puede aparecer escrito de formas distintas.

**Ejemplos:**
- Horas vuelo
- Horas de vuelo
- Horas Voladas
- H.Vuelo

**Todos deben converger al mismo concepto interno.**

---

#### Principio obligatorio

```
Interpretación inteligente + validación humana
```

**La validación final siempre pertenece al usuario.**

Nunca asumir automáticamente que la interpretación es correcta.

---

### 13.13 Historial documental

**Decisión funcional aprobada.**

---

#### Qué NO interesa almacenar

* ❌ Cualquier nómina cargada
* ❌ Pruebas
* ❌ Auditorías descartadas

---

#### Qué SÍ interesa almacenar

* ✅ Auditorías validadas
* ✅ Auditorías cerradas
* ✅ Histórico mensual consolidado

---

#### Objetivo

**Mantener una base histórica limpia y fiable.**

La calidad del histórico es más importante que la cantidad de registros.

---

**Importante:**

Esta es una decisión funcional sobre el objetivo del histórico.

La implementación técnica (filtros, validaciones de guardado, políticas de retención) está pendiente de diseño.

Actualmente PilotPay almacena cualquier auditoría generada sin aplicar estos criterios de calidad.

---

### 13.14 Regla maestra de auditoría

**Regla funcional aprobada:**

```
1 usuario + 1 mes + 1 año = 1 auditoría válida
```

**Objetivo:** Evitar duplicados, mantener estadísticas limpias, garantizar trazabilidad clara.

**Documentación completa:** Ver sección 13.5 "Auditoría única por mes", que documenta la decisión funcional aprobada y la propuesta de diseño técnico (pendiente de validación).

---

### 13.15 Política de borrado

**Principio arquitectónico aprobado:**

```
Borrado significa borrado real
```

**IMPORTANTE:** La implementación actual NO cumple completamente estos principios.

La auditoría técnica del flujo de guardado (sección 13.8) identificó múltiples gaps de borrado que requieren corrección.

Este principio establece el estándar objetivo, no el estado actual del sistema.

---

#### NO se permiten

* ❌ Registros huérfanos
* ❌ Datos fantasma
* ❌ Datos resucitados
* ❌ Referencias rotas

---

#### Propagación obligatoria

Todo borrado debe propagarse a:

* localStorage
* IndexedDB
* Firebase
* Colas de sincronización
* Caches
* Referencias relacionadas

---

#### Objetivo

**Garantizar consistencia multi-dispositivo.**

**Principio crítico:**

La sincronización nunca debe recrear información eliminada por el usuario.

---

### 13.16 Inteligencia histórica

**Objetivo estratégico validado.**

---

#### Más allá de la trazabilidad

La persistencia completa de `nominaV2` NO existe únicamente por trazabilidad.

**Su objetivo futuro es permitir:**

* Evolución salarial
* Evolución IRPF real
* Productividad histórica
* Análisis de tendencias
* Forecast financiero
* Detección de anomalías
* Mejora progresiva de precisión

---

#### Principio estratégico

**Cada auditoría cerrada aumenta el conocimiento histórico del sistema.**

PilotPay debe mejorar su precisión con el paso del tiempo gracias al histórico consolidado.

---

## 14. Filosofía general

PilotPay no busca añadir funciones rápidamente, llenar pantallas ni parecer complejo.

Busca:
- Precisión y claridad
- Utilidad real para el usuario
- Auditoría profesional y trazable
- Experiencia premium y estable
- Compatibilidad multi-device sin fricciones

---

## 15. Identidad, autenticación y licenciamiento (visión futura)

### Principios aprobados

**1. El sistema actual de códigos de 3 letras es una solución temporal para la beta cerrada.**

Durante la beta cerrada, los usuarios se identifican mediante códigos de 3-5 letras asignados manualmente por el administrador. Este modelo es válido y suficiente para un entorno controlado de 10-20 usuarios conocidos.

**2. En producción el administrador NO gestionará credenciales de usuarios.**

El modelo de gestión manual de altas y contraseñas NO es escalable ni apropiado para un sistema de producción con usuarios autónomos.

**3. Los usuarios deberán poder:**

- Registrarse de forma autónoma
- Elegir su contraseña
- Recuperar su contraseña automáticamente
- Gestionar su acceso sin intervención administrativa

**4. La identidad futura NO debe depender del código de 3 letras.**

El identificador técnico del sistema debe ser:
- Único y persistente
- Compatible con plataformas de pago
- Compatible con App Store / Google Play
- Independiente de alias visibles

**5. El código de 3 letras podrá mantenerse como alias visible interno o identificador operativo para usuarios que deseen utilizarlo.**

Los beta testers actuales podrán conservar su código como alias. Los usuarios nuevos podrán elegir uno opcionalmente. El código NO será el identificador técnico subyacente.

**6. Debe existir una separación clara entre:**

- **Usuario**: Identidad y autenticación
- **Suscripción**: Plan activo y estado de pago
- **Funciones activas**: Qué módulos puede usar
- **Permisos administrativos**: Rol dentro de la aplicación

**7. El sistema deberá soportar en el futuro:**

- App Web
- App Store (iOS)
- Google Play (Android)
- Suscripciones recurrentes
- Planes comerciales diferenciados
- Activación selectiva de funciones

---

### Decisiones NO aprobadas todavía

Las siguientes cuestiones técnicas quedan **expresamente pendientes de diseño**:

- Sistema definitivo de autenticación
- Firebase Auth vs otras soluciones
- Método de registro de usuarios
- Método de recuperación de contraseña
- Modelo de suscripciones (mensual, anual, etc.)
- Stripe vs otras pasarelas de pago
- Integración con App Store billing
- Integración con Google Play billing
- Migración de usuarios beta → producción
- Estructura final de nodos Firebase para usuarios
- Identificador técnico definitivo (UUID, Firebase UID, otro)

**Nota importante:**

Estas decisiones forman parte de una futura fase de arquitectura de identidad y licenciamiento y **no deben condicionar el desarrollo actual de la beta cerrada**.

Durante la beta, el modelo de códigos de 3 letras y gestión manual es válido y suficiente. La transición a producción se diseñará e implementará cuando sea necesario, sin afectar la funcionalidad actual.
