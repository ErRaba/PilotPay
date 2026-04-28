# PilotPay — separación frontend/backend

## Estado de esta entrega

Se ha creado una base separada real:

- `frontend/`: conserva el HTML actual y añade `api-client.js`.
- `backend/`: API Express con motor inicial de cálculo.
- `backend/src/engine/`: cálculo de tramos, Seguridad Social 2026, IRPF por porcentaje y nómina.
- `backend/test/`: pruebas básicas.

## Qué se ha migrado al backend

1. Tablas salariales Grupo IV: CMD/COP.
2. Tablas salariales Grupo III: SCC/CC.
3. Reparto de horas de vuelo por tramos.
4. Reducción proporcional de tramos por vacaciones/reducción.
5. Base máxima SS 2026: 5.101,20 €/mes.
6. Cuota de solidaridad calculada solo sobre exceso sobre base máxima.
7. Plus transporte TCP dividido entre 11 mensualidades.
8. DPO Grupo III/IV como parámetro mensual proporcional.

## Qué NO está terminado todavía

1. Sustituir todos los `recalc()` del frontend por llamadas backend.
2. Migrar parser de nómina PDF al backend.
3. Migrar parser eCrew al backend.
4. Simulador reglamentario completo de IRPF: ahora el backend aplica porcentaje informado.
5. Autenticación segura: Firebase sigue en frontend legacy.
6. Auditoría por concepto con fuente normativa por línea.

## Cómo arrancar

```bash
cd backend
npm install
npm test
npm run dev
```

API:

```bash
POST http://localhost:3000/api/calcular-nomina
POST http://localhost:3000/api/distribuir-hv
POST http://localhost:3000/api/tramos
```

## Ejemplo de payload

```json
{
  "funcion": "CMD",
  "nivel": 3,
  "irpfPct": 34.15,
  "pagasProrrateadas": true,
  "seguroMedico": true,
  "hv": { "autoTotal": 80 },
  "tramos": { "diasMes": 30, "diasVacaciones": 0 },
  "dietas": { "mant_nac": 10 }
}
```

## 2026-04-28 · Paso 2: puente frontend → backend

Se ha añadido una capa de migración en `frontend/index.html` que intercepta `recalc()` y `recalcTCP()`.

Comportamiento actual:

1. Ejecuta primero el cálculo local legacy para mantener la pantalla completa funcionando.
2. Construye un payload normalizado para el backend.
3. Llama a `POST /api/calcular-nomina` mediante `frontend/api-client.js`.
4. Añade una tarjeta de “Validación backend” debajo de la nómina con:
   - total devengado backend,
   - base SS backend,
   - base IRPF backend,
   - SS trabajador backend,
   - IRPF backend,
   - líquido backend.

Esto NO elimina todavía el motor legacy del HTML. Es una migración segura: permite comparar el cálculo local contra el nuevo motor backend antes de sustituir definitivamente la lógica de frontend.

Pendiente:

- Migrar el render completo de la nómina para que el backend devuelva todas las líneas de devengo/deducción.
- Igualar al céntimo los conceptos específicos ya calibrados en el HTML legacy.
- Completar el motor IRPF reglamentario; por ahora el backend aplica el porcentaje informado.

## v6 — Pagas extra 14 pagas / prorrateadas

Se añade soporte backend auditable para dos modos de paga extra por usuario:

- `pagasProrrateadas: true`: el motor devenga mensualmente la prorrata de ambas extras (`extra * 2`) y la integra en Base IRPF.
- `pagasProrrateadas: false`: el motor no devenga paga extra en meses ordinarios; en julio devenga la primera paga completa (`salarioBase`) y en diciembre la segunda paga completa (`salarioBase`).

Regla de cotización: la Base SS mensual mantiene siempre la prorrata de pagas extra (`extra * 2`) y no aumenta por cobrar la extra completa en julio/diciembre. La paga extra completa sí aumenta el devengo y la Base IRPF del mes de cobro.

Tests añadidos:

- 14 pagas sin extra en marzo y con prorrata SS.
- 14 pagas con extra completa en julio sin aumento de Base SS.
- Paga prorrateada mensual para copiloto.
