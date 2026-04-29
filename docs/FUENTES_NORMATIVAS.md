# Fuentes normativas y criterios de cálculo

## Convenio Binter 2026

Fuente principal: `BOE-A-2026-6389.pdf` incorporado al proyecto.

Claves usadas en el motor:

- `CONVENIO_ART_25`: clasificación profesional. Grupo III = TCP; Grupo IV = tripulantes de vuelo flota Embraer.
- `CONVENIO_ART_26`: progresión/cambio de nivel.
- `CONVENIO_ART_40`: reducción proporcional de tramos de horas de vuelo durante reducción de jornada, vacaciones y licencia no retribuida.
- `CONVENIO_ART_41`: vacaciones: 30 días naturales para Grupos III y IV.
- `CONVENIO_RETRIBUCIONES`: capítulo VI y anexos retributivos usados para tablas salariales.

## Seguridad Social 2026

Clave: `SS_ORDEN_2026`.

Criterios codificados:

- Base máxima mensual: 5.101,20 €.
- Cotización del trabajador:
  - Contingencias comunes: 4,70%.
  - MEI trabajador: 0,15%.
  - Desempleo + formación profesional trabajador: 1,65%.
- Solidaridad: se aplica solo sobre el exceso de retribución sobre la base máxima, por tramos.

## IRPF reglamentario core

Claves:

- `IRPF_REGLAMENTO_ART_81`: mínimos excluidos de retención.
- `IRPF_REGLAMENTO_ART_82`: procedimiento general.
- `IRPF_REGLAMENTO_ART_83`: base para calcular el tipo.
- `IRPF_REGLAMENTO_ART_84`: mínimo personal y familiar.
- `IRPF_REGLAMENTO_ART_85`: cuota y escala.
- `IRPF_REGLAMENTO_ART_86`: tipo de retención.
- `IRPF_RD_142_2024`: actualización de los arts. 81 y 83.

El motor `backend/src/engine/irpf.js` calcula:

1. retribuciones anuales previsibles;
2. mínimo excluido de retención por situación familiar;
3. base de retención minorando SS, gasto general y reducción por rendimientos del trabajo;
4. mínimo personal/familiar;
5. cuota por escala;
6. tipo de retención con dos decimales;
7. retención mensual sobre la retribución mensual sujeta.

Limitaciones declaradas:

- No sustituye todavía al programa oficial AEAT.
- No cubre todos los casos especiales del modelo 145.
- No implementa regularización compleja intraanual con histórico de retenciones practicadas, aunque deja estructura para añadirla.
- Si no se informa `irpf.retribucionesAnuales`, estima las retribuciones anuales desde la nómina actual.

## IRPF manual

Clave: `IRPF_PORCENTAJE_INFORMADO`.

Sigue disponible como modo de respaldo: aplica el porcentaje informado por el usuario o extraído de la nómina.
