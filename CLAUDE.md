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

### Firebase RTDB paths
```
pilotpay/usuarios/{code}
pilotpay/perfiles/{code}
pilotpay/permisos/{code}
pilotpay/historicos/{userId}/monthly/{year}_{month}
pilotpay/historicos/{userId}/auditorias/{auditId}
pilotpay/historicos/{userId}/deletedAuditorias/{auditId}
pilotpay/rutas/{key}
pilotpay/solicitudes/{key}
```

Estos paths son estables. **Cambiarlos rompe el sync multi-device.**

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
- Variables mensuales (parser PDF)
- Simulador IRPF
- Comparativa inteligente
- Historial de auditorías con clasificación causa/derivado/neto
- Parser PDF de nóminas con extracción de acumulados
- Generación de reclamaciones y PDF de nómina
- Gestión de perfiles y avatares
- Sync multi-device (P4): monthly, auditorías, tombstones, pull, queue
- Firebase Security Rules (P5): deny-by-default + auth requerida
- P4 Debug Panel (admin, solo lectura)
- Backend motor de cálculo (parcial, en progreso)

### Limitaciones conocidas
- Cross-user isolation solo en cliente (no en Firebase rules)
- Contraseñas en `pilotpay/usuarios` visibles a sesiones anónimas autenticadas
- Frontend no completamente desacoplado del backend
- P4 Debug Panel es temporal (retirar cuando no sea necesario)
- GC de tombstones >180 días pendiente (TODO en código)

---

## 12. Filosofía general

PilotPay no busca añadir funciones rápidamente, llenar pantallas ni parecer complejo.

Busca:
- Precisión y claridad
- Utilidad real para el usuario
- Auditoría profesional y trazable
- Experiencia premium y estable
- Compatibilidad multi-device sin fricciones
