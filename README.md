# PilotPay — Backend/Frontend auditable v5

Versión v5: añade parser específico de nóminas Binter y soporte de deducciones privadas/netas como préstamos.

## Arranque backend

```bash
cd backend
npm install
npm start
```

API por defecto: `http://localhost:3000/api`.

## Tests

```bash
cd backend
npm test
```

Resultado esperado en esta versión: `17/17` tests correctos.

## Cambios principales v5

- Nuevo módulo `backend/src/parsers/binterPayslipParser.js`.
- Nuevos endpoints:
  - `POST /api/parsear-nomina-binter-texto`
  - `POST /api/auditar-nomina-binter-texto`
- Soporte de nóminas de copiloto con base SS no topada.
- Regla: si `baseSS <= 5.101,20`, no hay solidaridad.
- Préstamos tratados como deducción privada/neto:
  - `Intereses Préstamo`
  - `Amortización Del Préstamo`
- El motor permite `deduccionesPrivadas` y las descuenta del líquido sin alterar bases.

## Estado

Auditable y extensible. Pendiente: conectar lectura directa de PDF binario en backend o mantener extracción PDF.js en frontend y enviar texto al parser.


## Pagas extra

El backend soporta dos modos por usuario:

- Pagas prorrateadas: la prorrata mensual se devenga cada mes.
- 14 pagas: enero-junio/agosto-noviembre sin devengo de extra; julio y diciembre devengan paga completa.

La paga extra completa suma a Base IRPF en el mes de cobro, pero no incrementa la Base SS mensual porque la cotización ya incorpora la prorrata de pagas extra.
