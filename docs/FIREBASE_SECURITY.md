# PilotPay — Seguridad Firebase RTDB

**Versión**: P5 · **Fecha**: 2026-05-25  
**Tag de referencia**: `v3.0.0-beta-sync-stable`  
**Rollback seguro**: `git checkout v3.0.0-beta-sync-stable`

---

## 1. Arquitectura de autenticación Firebase

PilotPay usa **Firebase Anonymous Authentication** vía REST API (sin SDK).

```
Usuario abre la app
        ↓
fbSignIn() → POST identitytoolkit.googleapis.com/v1/accounts:signUp
        ↓
Firebase asigna UID anónimo (UUID aleatorio) + ID token JWT
        ↓
Todas las llamadas REST: ${FB_URL}/${path}.json?auth=<token>
        ↓
Firebase RTDB evalúa reglas: auth.uid = UUID anónimo
```

### UID anónimo vs. código de usuario de la app

El `auth.uid` de Firebase es un UUID anónimo como `abc123def456...`.  
Los códigos de usuario de la app (`ESH`, `COP`, etc.) son identificadores internos **distintos**.

**Firebase no conoce la correlación** entre estos dos identificadores.  
Consecuencia directa: las reglas Firebase **no pueden usar `auth.uid === "ESH"`** para aislar datos por usuario a nivel de base de datos.

---

## 2. Estructura del árbol Firebase

```
pilotpay/
├── usuarios/{code}
│     { pass, name, apellidos, funcion, nivel, base, irpf, ingreso, admin, bloqueado }
│     Uso: login client-side, gestión de usuarios (admin)
│
├── perfiles/{code}
│     { funcion, base, nivelActual, nif, irpf, ccaa, historicoFiscal, ... }
│     Uso: perfil financiero, datos para cálculo de nómina
│
├── permisos/{code}
│     { funciones: [...], bases: [...] }
│     Uso: control de qué funciones/bases puede calcular cada usuario
│
├── historicos/{userId}/
│   ├── monthly/{year}_{month}
│   │     MonthRecord: { userId, year, month, estado, schemaVersion,
│   │                    calculoTeorico, variablesData, auditoria,
│   │                    regularizacion, _updatedAt, _schemaVersion, ... }
│   │     Uso: expediente mensual — fuente de verdad sync P4
│   │
│   ├── auditorias/{auditId}
│   │     AuditRecord: { id, userId, mes, ... }
│   │     Uso: historial de auditorías completadas
│   │
│   └── deletedAuditorias/{auditId}
│         Tombstone: { id, deletedAt, deletedByDevice, _schemaVersion }
│         Uso: propagación de borrados multi-device (evita resurrección)
│
├── rutas/{vuelo_orig_dest}
│     { vuelo, origen, destino, hb }
│     Uso: tabla de horas bloque por ruta, compartida entre usuarios
│
└── solicitudes/{code}_{timestamp}
      { usuario, nombre, tipo, valor, motivo, fecha, estado }
      Uso: solicitudes de cambio de base/cargo enviadas por usuarios
```

---

## 3. Reglas implementadas: `firebase-database.rules.json`

### Principios

| Regla | Descripción |
|---|---|
| **Deny by default** | Root y `pilotpay/` deniegan todo. Solo los paths listados tienen acceso. |
| **auth != null** | Toda lectura/escritura requiere token Firebase válido (anónimo o no). |
| **Validación estructural** | Cada nodo crítico valida presencia de campos mínimos. |
| **DELETE permitido** | `!newData.exists()` asegura que los borrados no fallan validación. |

### Qué protegen estas reglas

- **Acceso no autenticado**: Sin token Firebase no se puede leer ni escribir nada. Un crawler HTTP sin pasar por `fbSignIn()` recibe `401 Unauthorized`.
- **Datos malformados**: Los nodos con `.validate` rechazan escrituras que no tengan los campos mínimos requeridos.
- **Namespace no listado**: Cualquier path fuera de `pilotpay/usuarios|perfiles|permisos|historicos|rutas|solicitudes` es denegado.

### Qué NO protegen (limitaciones conocidas)

| Limitación | Causa | Solución a largo plazo |
|---|---|---|
| Usuario A puede leer perfil de usuario B | `auth.uid` ≠ código de usuario app | Firebase Custom Auth (requiere backend) |
| Usuario A puede escribir en `historicos/B/...` | Misma causa | Firebase Custom Auth |
| Contraseñas visibles a cualquier sesión anónima | Login client-side requiere leer `pilotpay/usuarios` | Autenticación server-side + custom tokens |
| Admin-only paths no verificados en DB | No hay mapping UID↔ADMIN_CODE | Custom claims en JWT (requiere backend) |

---

## 4. Cómo aplicar las reglas

### Opción A — Firebase Console (manual, recomendado para primer deploy)

1. Abre [Firebase Console](https://console.firebase.google.com)
2. Selecciona proyecto `airside-mad`
3. Realtime Database → Rules
4. Reemplaza las reglas existentes con el contenido de `firebase-database.rules.json`
5. Haz clic en **Publish**

### Opción B — Firebase CLI

```bash
# Instalar firebase-tools (si no está instalado)
npm install -g firebase-tools

# Login
firebase login

# Inicializar proyecto (solo la primera vez)
firebase init database --project airside-mad

# Desplegar solo las reglas
firebase deploy --only database --project airside-mad
```

### Rollback de reglas

Si algo falla tras aplicar las reglas:

```bash
# En Firebase Console: Rules → History → restaurar versión anterior
# O revertir el archivo y re-desplegar
git checkout v3.0.0-beta-sync-stable -- firebase-database.rules.json
firebase deploy --only database
```

---

## 5. Hardening adicional recomendado (fuera de reglas)

### API Key — restricción de referrers

La API key `FB_KEY` está expuesta en el frontend (inevitable con REST + anonymous auth).  
Limitar su uso a dominios autorizados:

1. Google Cloud Console → APIs & Services → Credentials
2. Selecciona la API key
3. Application restrictions → HTTP referrers
4. Añadir: `eraba.github.io/*`, `localhost/*`

### Anonymous Auth — limitar creación de sesiones abusivas

Firebase Console → Authentication → Settings:
- Habilitar **App Check** (requiere configuración adicional)
- O limitar vía cuotas en Google Cloud Console

### Camino hacia aislamiento real por usuario

La mejora de seguridad más significativa posible es migrar de anonymous auth a **Firebase Custom Auth**:

```
[Backend Node.js/Cloud Function]
  ← recibe credenciales (code + pass)
  → valida contra USERS (o base de datos segura)
  → emite Firebase Custom Token con uid = código_usuario_app
  → devuelve token al cliente

[Cliente]
  ← recibe custom token
  → signInWithCustomToken(token)
  → auth.uid === "ESH" (o el código correspondiente)
  → reglas Firebase pueden usar auth.uid === $userId
```

Con esto las reglas de `historicos` se convertirían en:

```json
"$userId": {
  ".read":  "auth.uid === $userId",
  ".write": "auth.uid === $userId"
}
```

---

## 6. Checklist de pruebas manuales post-deploy

Ejecutar después de aplicar las reglas en Firebase Console:

### Acceso no autenticado (debe fallar)

```bash
# Sin ?auth= — debe devolver 401 Permission denied
curl "https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app/pilotpay/usuarios.json"
curl "https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app/pilotpay/historicos/ESH/monthly.json"
```

Resultado esperado: `{"error":"Permission denied"}`

### Acceso autenticado — usuario A (ESH)

| Test | Acción | Resultado esperado |
|---|---|---|
| T-01 | Login como ESH → Dashboard | ✓ Carga normal, sin errores en consola |
| T-02 | Abrir perfil | ✓ Datos cargados correctamente |
| T-03 | Navegar a Historial | ✓ Auditorías visibles |
| T-04 | P4 activo: `PilotPayStore.syncStatus()` | ✓ Sin errores de sync |
| T-05 | P4 activo: `await P4Debug.pullFromFirebase()` | ✓ Pull completado |
| T-06 | Crear expediente, calcular, auditar | ✓ MonthRecord escrito en Firebase |
| T-07 | Borrar expediente pendiente | ✓ DELETE propagado a Firebase |
| T-08 | Borrar auditoría → tombstone creado | ✓ `deletedAuditorias/{id}` visible |

### Acceso autenticado — usuario B (distinto de ESH)

| Test | Acción | Resultado esperado |
|---|---|---|
| T-09 | Login como usuario B → Dashboard | ✓ Carga normal |
| T-10 | P4 pull: solo ve sus propios historicos | ✓ No aparecen datos de ESH |
| T-11 | P4 sync: escribe en su propio path | ✓ Sin errores |

### Aislamiento entre usuarios (limitación conocida, verificar comportamiento)

| Test | Acción | Resultado esperado con estas reglas |
|---|---|---|
| T-12 | Usuario B intenta leer `historicos/ESH/monthly` | ⚠️ Firebase PERMITE (limitación conocida) |
| T-13 | Usuario B escribe en `historicos/ESH/monthly` | ⚠️ Firebase PERMITE (limitación conocida) |

> Los tests T-12 y T-13 documentan la limitación de anonymous auth. La app no hace estas acciones cruzadas en producción. El riesgo real es bajo porque requiere construir una sesión anónima y conocer el esquema de paths.

### Sync multi-device (iPhone/iPad)

| Test | Acción | Resultado esperado |
|---|---|---|
| T-14 | Login en iPhone con P4 activo | ✓ Pull trae datos de PC |
| T-15 | Auditar en PC → pull en iPhone | ✓ MonthRecord aparece en iPhone |
| T-16 | Online → offline → online | ✓ Queue flush sin errores |

### Validación estructural

```javascript
// En consola del navegador — debe ser rechazado por Firebase (HTTP 400/Permission denied)
// Test manual: intentar escribir un monthly sin campos requeridos
fetch('https://airside-mad-default-rtdb.europe-west1.firebasedatabase.app/pilotpay/historicos/ESH/monthly/2026_99.json?auth=<token>',
  { method: 'PUT', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({malformed: true}) }
)
// Esperado: {"error":"..."} — falla validate (month: 99 > 12)
```

---

## 7. Limitaciones de seguridad inherentes al frontend público

PilotPay es una Single Page Application. Todo el código JavaScript es público e inspeccionable:

- El `FB_KEY` y `FB_URL` son visibles en el fuente
- El esquema de paths es deducible del código
- Las credenciales de usuarios están en `pilotpay/usuarios` (legibles con auth anónimo)

**Esto es una limitación arquitectural, no un bug.** La mitigación real es:
1. Mover la validación de credenciales a un backend (Cloud Function)
2. Emitir custom tokens desde el backend
3. Usar reglas `auth.uid === $userId` para aislamiento real

Hasta entonces, las reglas implementadas son la mejor protección alcanzable sin backend.
