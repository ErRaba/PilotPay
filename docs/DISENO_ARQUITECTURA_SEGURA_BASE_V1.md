# 🏗️ DISEÑO DE ARQUITECTURA SEGURA BASE — PilotPay 4.0

**Fecha:** 10/06/2026  
**Base:** Auditoría de Arquitectura Actual V1  
**Objetivo:** Arquitectura mínima segura que elimine los 5 riesgos críticos.

**DOCUMENTO EXTENSO — Continúa en próximo mensaje**

## RESUMEN EJECUTIVO

**Riesgos críticos a eliminar:**
1. ❌ API Key Firebase expuesta
2. ❌ Contraseñas visibles a sesiones autenticadas
3. ❌ Cross-user data access
4. ❌ Datos sensibles sin cifrar en localStorage
5. ❌ Login client-side bypassable

**Solución:** Firebase Auth real + aislamiento uid + cifrado client-side

**Tiempo estimado implementación:** 8-12 semanas

---

## 1. NUEVO MODELO DE IDENTIDAD

### Decisión Arquitectónica

❌ **Eliminar:** Firebase Anonymous Auth  
✅ **Adoptar:** Firebase Email/Password Auth

### Flujo Propuesto

```
Usuario introduce: código (ESH) + contraseña
  ↓
Frontend mapea: ESH → esh@pilotpay.internal
  ↓
firebase.auth().signInWithEmailAndPassword()
  ↓
Firebase Auth valida server-side (hash bcrypt)
  ↓
Retorna: { uid, email, idToken, refreshToken }
  ↓
Frontend usa idToken para RTDB operations
  ↓
Firebase Rules: auth.uid === $userId ✅
```

**Resultado:** ✅ Contraseñas NUNCA en cliente, validación server-side real

---

## 2. NUEVO MODELO DE DATOS FIREBASE

```
pilotpay/
├─ users/{auth.uid}/          ← Datos identidad
├─ profiles/{auth.uid}/       ← Perfil financiero
├─ audits/{auth.uid}/         ← Auditorías
├─ monthly/{auth.uid}/        ← Expedientes
├─ documents/{auth.uid}/      ← Metadatos docs
├─ config/{auth.uid}/         ← Configuración
├─ tombstones/{auth.uid}/     ← Borrados
├─ logs/{auth.uid}/           ← Audit trail
└─ shared/                    ← Datos públicos
```

**Regla crítica:** `auth.uid === $userId` en TODAS las rutas

---

## 3. REGLAS FIREBASE PROPUESTAS

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    
    "pilotpay": {
      "users": {
        "$userId": {
          ".read": "auth.uid === $userId",
          ".write": "auth.uid === $userId"
        }
      },
      
      "audits": {
        "$userId": {
          ".read": "auth.uid === $userId",
          ".write": "auth.uid === $userId"
        }
      }
    }
  }
}
```

**Resultado:** ✅ Aislamiento real cross-user

---

## 4. DATOS QUE NO PUEDEN ESTAR EN LOCALSTORAGE

❌ **NUNCA en localStorage:**
- NIF, NSS
- Nóminas completas
- Datos fiscales sin cifrar
- Contraseñas (ni hash)
- Permisos admin

✅ **Solo en localStorage CIFRADO:**
- Auditorías (con AES-256-GCM)
- MonthRecords con variables
- Metadatos sensibles

---

## 5. DATOS PERMITIDOS LOCALMENTE

✅ **Permitido sin cifrar:**
- Config UI (tema, preferencias)
- Device ID
- Timestamps sync
- Colas pendientes (sin payload sensible)

✅ **Permitido CIFRADO:**
- Auditorías completas
- Variables mensuales
- Caches de datos sensibles

**Condición:** Clave de cifrado derivada de sesión (rotación automática)

---

## 6. ESTRATEGIA DE MIGRACIÓN

### Fase 0: CONTENCIÓN (Semana 1)

**Acción inmediata:**
```
1. Rotar API Key Firebase
2. Bloquear nuevas altas usuario hasta Fase 1
3. Aviso beta testers: "Actualización seguridad en curso"
4. Backup completo Firebase RTDB
```

### Fase 1: IDENTIDAD SEGURA (Semanas 2-4)

**Migración auth:**
```
1. Implementar Firebase Email/Password Auth
2. Migrar usuarios existentes:
   - Crear cuenta Firebase Auth por código
   - Generar contraseña temporal
   - Enviar credenciales vía canal seguro
3. Mapear uid ↔ code en pilotpay/userCodes/
4. Eliminar pilotpay/usuarios/{code}/pass
```

### Fase 2: DATOS AISLADOS (Semanas 5-7)

**Migración estructura:**
```
1. Crear nueva estructura pilotpay/{users|audits}/{auth.uid}/
2. Migrar datos desde {code} a {auth.uid}
3. Validar integridad post-migración
4. Eliminar nodos antiguos
```

### Fase 3: CIFRADO LOCAL (Semanas 8-10)

**Implementar cifrado:**
```
1. Librería: crypto-js (AES-256-GCM)
2. Derivar clave de idToken (rotación automática)
3. Cifrar antes localStorage.setItem()
4. Descifrar después localStorage.getItem()
```

### Fase 4: BACKEND DOCUMENTAL (Semanas 11-12)

**Mover parsers:**
```
1. Upload PDF → backend via endpoint seguro
2. Parser ejecuta server-side
3. Retorna estructura limpia (sin PDF)
4. Frontend solo renderiza
```

### Fase 5: ESCALABILIDAD (Futuro)

- Cloud Functions triggers
- Rate limiting
- Audit trail automatizado
- Backup automatizado

---

## 7. DECISIÓN BACKEND

### QUÉ PUEDE SEGUIR EN FRONTEND

✅ **Permitido frontend:**
- UI y renderizado
- Lógica de presentación
- Validaciones UX
- Caches no sensibles

### QUÉ DEBE PASAR A BACKEND (OBLIGATORIO)

❌ **CRÍTICO migrar a backend:**
- Validación de credenciales
- Gestión de sesiones
- Upload/procesamiento PDFs
- Generación de tokens
- Operaciones admin

⚠️ **RECOMENDADO migrar:**
- Calculadora nómina (futuro)
- Motor auditoría (futuro)
- Parsers PDF (prioridad)

### QUÉ PUEDE ESPERAR

⏳ **Fase posterior:**
- Calculadora (puede quedar en frontend si se acepta riesgo manipulación)
- Motor auditoría (ídem)
- Generación PDFs

**Nota:** Calculadora en cliente NO es riesgo seguridad datos, solo precisión.

---

## 8. ROADMAP POR FASES

### FASE 0: CONTENCIÓN
**Duración:** 1 semana  
**Objetivo:** Detener hemorragia

- [ ] Rotar API Key Firebase
- [ ] Comunicar beta testers
- [ ] Backup completo RTDB
- [ ] Bloquear nuevas altas
- [ ] Tag checkpoint pre-migración

---

### FASE 1: IDENTIDAD SEGURA
**Duración:** 3 semanas  
**Objetivo:** Eliminar R

IESGOS C1, C2, C5

**Semana 1:**
- [ ] Implementar Firebase Email/Password Auth
- [ ] Crear endpoint backend creación usuarios
- [ ] Testing auth flow local

**Semana 2:**
- [ ] Migrar usuarios beta existentes
- [ ] Generar credenciales temporales
- [ ] Distribuir credenciales vía canal seguro
- [ ] Crear tabla userCodes/{code} → uid

**Semana 3:**
- [ ] Eliminar login client-side
- [ ] Eliminar campo `pass` de RTDB
- [ ] Validar auth flow en producción
- [ ] Testing multi-device

**Riesgos eliminados:**
✅ C1: API Key expuesta → Protegida en backend  
✅ C2: Contraseñas visibles → Eliminadas de RTDB  
✅ C5: Login client-side → Migrado a Firebase Auth

---

### FASE 2: DATOS AISLADOS
**Duración:** 3 semanas  
**Objetivo:** Eliminar RIESGO C3

**Semana 4:**
- [ ] Diseñar schema nuevo: pilotpay/{resource}/{auth.uid}/
- [ ] Implementar reglas Firebase con auth.uid
- [ ] Script migración datos

**Semana 5:**
- [ ] Ejecutar migración pilotpay/historicos/
- [ ] Ejecutar migración pilotpay/perfiles/
- [ ] Validar integridad datos

**Semana 6:**
- [ ] Actualizar frontend lectura desde {auth.uid}/
- [ ] Testing completo multi-user
- [ ] Eliminar nodos legacy
- [ ] Validar aislamiento cross-user

**Riesgos eliminados:**
✅ C3: Cross-user access → Aislamiento enforced por Firebase

---

### FASE 3: CIFRADO LOCAL
**Duración:** 3 semanas  
**Objetivo:** Eliminar RIESGO C4

**Semana 7:**
- [ ] Integrar crypto-js (AES-256-GCM)
- [ ] Implementar derivación clave desde idToken
- [ ] Wrapper localStorage cifrado

**Semana 8:**
- [ ] Migrar audit_history_v1 a cifrado
- [ ] Migrar monthly_v1 a cifrado
- [ ] Testing lectura/escritura cifrada

**Semana 9:**
- [ ] Migrar IndexedDB a cifrado
- [ ] Testing multi-device cifrado
- [ ] Validar rotación clave automática
- [ ] Documentar flujo cifrado

**Riesgos eliminados:**
✅ C4: Datos sin cifrar → localStorage/IDB cifrados

---

### FASE 4: BACKEND DOCUMENTAL
**Duración:** 2 semanas  
**Objetivo:** Minimizar exposición datos sensibles

**Semana 10:**
- [ ] Endpoint POST /api/upload/nomina
- [ ] Endpoint POST /api/upload/variables
- [ ] Parser Nómina V2 server-side

**Semana 11:**
- [ ] Firebase Storage para PDFs
- [ ] Metadata en RTDB, contenido en Storage
- [ ] Security Rules Storage

**Semana 12:**
- [ ] Testing upload/parse/download
- [ ] Migrar frontend a upload-only
- [ ] Validar producción

---

### FASE 5: ESCALABILIDAD (Futuro)
**Duración:** TBD  
**Objetivo:** Hardening y operaciones

- Cloud Functions audit trail
- Rate limiting (Cloud Armor)
- Backup automatizado
- Monitoring y alertas
- GDPR compliance tools

---

## TIEMPO TOTAL ESTIMADO

| Fase | Duración | Acumulado |
|------|----------|-----------|
| Fase 0: Contención | 1 semana | 1 semana |
| Fase 1: Identidad | 3 semanas | 4 semanas |
| Fase 2: Aislamiento | 3 semanas | 7 semanas |
| Fase 3: Cifrado | 3 semanas | 10 semanas |
| Fase 4: Backend | 2 semanas | **12 semanas** |
| Fase 5: Escalabilidad | TBD | Futuro |

**Total mínimo viable:** **12 semanas (3 meses)**

---

## VALIDACIÓN FINAL

**Pregunta clave:** ¿Es seguro subir datos reales después de Fase 4?

✅ **SÍ** si se completan Fases 0-4:
- Autenticación real (no bypassable)
- Aislamiento cross-user
- Cifrado localStorage/IDB
- Parsers server-side

⚠️ **Pendientes Fase 5:**
- Audit trail
- Rate limiting
- GDPR full compliance
- Backups automatizados

**Recomendación:** Beta cerrada OK post-Fase 4, producción abierta requiere Fase 5.

---

**FIN DE DISEÑO DE ARQUITECTURA SEGURA BASE V1**
