# BASELINE — Reglas RTDB desplegadas (pre-1.5)

**Fecha:** 2026-06-18
**Origen:** Firebase Console → Realtime Database → Rules (copia literal del usuario).
**Estado:** **baseline desplegado pre-1.5** — artefacto de **documentación / rollback**.
**Relacionado:** `docs/PHASE_1.5_PREREQ_RB_RULES_CHECK.md` (verificación R-B = PASS con delta menor).

> ⚠️ **Este archivo NO son reglas a desplegar.** Es la captura exacta del ruleset **actualmente activo** en producción, conservada como:
> - línea base de diseño para `PHASE_1.5_FINAL_RULES_SPEC.md` (transición "actual → final"),
> - **artefacto de rollback** de Fase 1.5 (re-desplegar este contenido restaura el estado pre-1.5).
>
> NO ejecutar `firebase deploy` con este archivo como parte de guardarlo. NO modifica reglas ni RTDB.

---

## Notas de estado (confirmadas en Console)

- **Anonymous Auth = ENABLED.**
- **`usuarios.$code.validate` = ACTIVO** (exige `pass`; byte-idéntico al repo `247644d`).
- **`pilotpay/deletedUsers` EXISTE** (`.read`/`.write: auth != null`), **pero falta** el sub-`.validate` de `deletedUsers/$userId` (presente en el repo). Delta menor → R-B = PASS con delta menor (ver doc de prerequisito).
- Resto de nodos (`perfiles`, `permisos`, `historicos` + validates, `rutas`, `solicitudes`) **idénticos** al repo.

---

## Ruleset desplegado (copia literal)

```json
{
  "rules": {

    // ── Denegar todo por defecto ──────────────────────────────────────────
    // Cualquier path no listado explícitamente queda bloqueado.
    ".read":  false,
    ".write": false,

    "pilotpay": {

      // ── Bloque por defecto dentro del namespace ──────────────────────────
      ".read":  false,
      ".write": false,

      // ── /pilotpay/usuarios ───────────────────────────────────────────────
      // Contiene identidad de cada usuario: nombre, contraseña (hash app-layer),
      // función, nivel, base, flag admin, bloqueado.
      //
      // READ: todos los usuarios autenticados.
      //   Necesario: el login se valida client-side contra este nodo.
      //   Limitación conocida: las contraseñas son visibles a cualquier
      //   sesión anónima autenticada. Mitigación real: migrar a Firebase
      //   Custom Auth con backend que valide credenciales y emita tokens.
      //
      // WRITE: todos los autenticados (anónimos con token válido).
      //   La restricción "solo admin" se aplica únicamente en cliente.
      //   Sin backend no es posible restringirlo más con anonymous auth.
      "usuarios": {
        ".read":  "auth != null",
        ".write": "auth != null",
        "$code": {
          // Valida que cada registro tenga los campos mínimos de identidad.
          // !newData.exists() permite DELETEs (datos nuevos = null).
          ".validate": "!newData.exists() || (newData.hasChildren(['pass', 'name', 'funcion', 'nivel', 'base']) && newData.child('pass').isString() && newData.child('name').isString() && newData.child('funcion').isString())"
        }
      },

      // ── /pilotpay/perfiles ───────────────────────────────────────────────
      // Perfil financiero personal: nif, irpf, ccaa, historicoFiscal, etc.
      // Escrito via PATCH (fbUpdate) de forma incremental — validar solo
      // campos atómicos, no estructura completa.
      "perfiles": {
        ".read":  "auth != null",
        ".write": "auth != null"
      },

      // ── /pilotpay/permisos ───────────────────────────────────────────────
      // Permisos por usuario: qué funciones y bases puede calcular.
      "permisos": {
        ".read":  "auth != null",
        ".write": "auth != null"
      },

      // ── /pilotpay/historicos ─────────────────────────────────────────────
      // Datos de auditoría P4 scoped por userId (código de usuario, ej. "ESH").
      //
      // LIMITACIÓN: el $userId en el path es el código de la app (ESH, COP…),
      // NO el auth.uid de Firebase (que es un UUID anónimo sin correlación).
      // Por tanto no es posible hacer auth.uid === $userId en las reglas.
      // La separación por usuario es enforced solo en cliente.
      //
      // Para aislamiento real se requiere: migrar a Firebase Custom Auth
      // donde el backend emite tokens con uid = código_usuario_app.
      "historicos": {
        ".read":  false,
        ".write": false,

        "$userId": {
          ".read":  "auth != null",
          ".write": "auth != null",

          "monthly": {
            "$monthKey": {
              // MonthRecord mínimo: userId, year (2020-2100), month (1-12), estado.
              // Acepta DELETE (!newData.exists()) y PATCH de campos individuales
              // (newData representa el documento merged tras el PATCH).
              ".validate": "!newData.exists() || (newData.hasChildren(['userId', 'year', 'month', 'estado']) && newData.child('userId').isString() && newData.child('year').isNumber() && newData.child('month').isNumber() && newData.child('year').val() >= 2020 && newData.child('year').val() <= 2100 && newData.child('month').val() >= 1 && newData.child('month').val() <= 12)"
            }
          },

          "auditorias": {
            "$auditId": {
              // AuditRecord mínimo: id, userId, mes (nombre del mes).
              ".validate": "!newData.exists() || (newData.hasChildren(['id', 'userId', 'mes']) && newData.child('id').isString() && newData.child('userId').isString())"
            }
          },

          "deletedAuditorias": {
            // Tombstones: registran borrados para sync multi-device.
            // Mínimo: id (auditId referenciado) y deletedAt (ISO timestamp).
             "$auditId": {
              ".validate": "!newData.exists() || (newData.hasChildren(['id', 'deletedAt']) && newData.child('id').isString() && newData.child('deletedAt').isString())"
            }
          }
        }
      },

      "deletedUsers": {
        ".read":  "auth != null",
        ".write": "auth != null"
      },
      // ── /pilotpay/rutas ──────────────────────────────────────────────────
      // Tabla de rutas vuelo → horas bloque. Compartida entre usuarios.
      // Solo admin puede escribir (enforced en cliente).
      "rutas": {
        ".read":  "auth != null",
        ".write": "auth != null",
        "$key": {
          ".validate": "!newData.exists() || (newData.hasChildren(['vuelo', 'origen', 'destino', 'hb']) && newData.child('hb').isNumber())"
        }
      },

      // ── /pilotpay/solicitudes ────────────────────────────────────────────
      // Solicitudes de cambio de base/cargo. Enviadas por usuarios, leídas
      // por admin. No contienen datos financieros pero sí datos personales.
      "solicitudes": {
        ".read":  "auth != null",
        ".write": "auth != null",
        "$key": {
          ".validate": "!newData.exists() || (newData.hasChildren(['usuario', 'tipo', 'fecha', 'estado']) && newData.child('usuario').isString() && newData.child('tipo').isString())"
        }
      }
    }
  }
}
```

---

**Uso previsto:** referencia de diseño para 1.5 y, si fuera necesario revertir el deploy de 1.5, re-desplegar exactamente este contenido para restaurar el estado pre-1.5. La purga de `pass` (1.5) requerirá además **backup RTDB** para revertir datos.
