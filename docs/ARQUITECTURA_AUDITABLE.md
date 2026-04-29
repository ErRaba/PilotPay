# Arquitectura auditable PilotPay

## Principio

El frontend no debe ser fuente de verdad. La fuente de verdad debe ser el backend.

## Capas

```text
frontend/
  index.html          UI legacy conservada
  api-client.js       Cliente API

backend/
  src/config/         Constantes, tablas y registro de fuentes
  src/engine/         Motor determinista de cálculo
  src/routes/         API HTTP
  test/               Pruebas automatizadas
```

## Endpoints

- `GET /health`
- `POST /api/calcular-nomina?audit=1`
- `POST /api/comparar-nomina`
- `POST /api/distribuir-hv`
- `POST /api/auditar-hv`
- `GET /api/fuentes`

## Qué hace profesional esta versión

1. Motor de cálculo separado de la interfaz.
2. Resultado con `versionMotor`.
3. Trazabilidad por cada fórmula crítica.
4. Fuentes codificadas en `sourceRegistry.js`.
5. Comparador backend contra nómina de empresa.
6. Tests automatizados.
7. Avisos explícitos donde aún no hay cálculo reglamentario completo.

## Pendientes duros

- Sustituir IRPF por motor reglamentario completo AEAT.
- Migrar parser PDF al backend.
- Eliminar el motor legacy del HTML cuando haya concordancia sistemática contra nóminas reales.
- Añadir base de datos y autenticación segura en backend.
- Sacar Firebase/configuración sensible del HTML.
