# Parser de nómina Binter — v5

## Objetivo

Convertir el texto extraído de una nómina Binter en un objeto auditable, separando:

- Devengos salariales.
- Dietas exentas.
- Dietas sujetas.
- Especies repercutidas y no repercutidas.
- Deducciones legales.
- Deducciones privadas/netas, como préstamos.
- Bases y acumulados informados por la empresa.

## Endpoints

### `POST /api/parsear-nomina-binter-texto`

Entrada:

```json
{
  "text": "contenido extraído del PDF"
}
```

Salida:

```json
{
  "ok": true,
  "resultado": { "trabajador": {}, "conceptos": [], "resumen": {}, "flags": [] },
  "empresaComparable": {}
}
```

### `POST /api/auditar-nomina-binter-texto`

Entrada:

```json
{
  "text": "contenido extraído del PDF",
  "input": { "funcion": "COP", "nivel": 4 },
  "tolerancia": 0.01
}
```

Si se incluye `input`, compara el cálculo del motor contra los valores extraídos de la nómina.

## Reglas añadidas en v5

### Base SS no topada

Si la base SS informada por la nómina es inferior a `5.101,20 €`, el parser marca:

```json
{
  "codigo": "BASE_NO_TOPADA"
}
```

En ese caso, la cotización adicional de solidaridad debe ser cero.

### Préstamos

Los conceptos:

- `Intereses Préstamo`
- `Amortización Del Préstamo`

se clasifican como `deduccion_privada_neta`.

Esto significa:

- reducen el líquido;
- no reducen la base SS;
- no reducen la base IRPF.

## Validación actual

Tests incluidos:

- Copiloto marzo 2026 con base SS `4.058,03 €`, sin solidaridad.
- Préstamo total `312,33 €` (`41,58 + 270,75`).
- Comandante marzo 2026 con base SS topada `5.101,20 €` y solidaridad.
- Motor de cálculo: el préstamo reduce solo el líquido, sin tocar bases.
