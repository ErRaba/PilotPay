# Parser de nómina Binter — PilotPay

## Objetivo

El parser de nómina de PilotPay convierte una nómina PDF de Binter Canarias en una estructura auditable y reutilizable por el resto de módulos de la aplicación.

El parser NO debe entenderse únicamente como un extractor de texto.

Actualmente alimenta:

- comparativa,
- auditoría,
- simulador,
- dashboard,
- histórico,
- reclamaciones,
- actualización parcial de perfil.

---

# Filosofía del parser

## Prioridades

```text
precisión > automatización agresiva
seguridad > inferencia
trazabilidad > comodidad
```

---

# Objetivos funcionales

El parser debe:

1. Extraer datos estructurados fiables.
2. Detectar discrepancias relevantes.
3. Separar conceptos salariales reales.
4. Evitar inferencias inseguras.
5. Mantener compatibilidad con auditoría.
6. Alimentar módulos dependientes sin duplicidades.

---

# Arquitectura actual

Actualmente el parser funciona en modelo híbrido:

## Frontend
Contiene:
- extracción inicial,
- normalización parcial,
- renderizado comparativa,
- sincronización visual,
- actualización controlada.

## Backend
Contiene:
- validaciones,
- parsing progresivo,
- auditoría,
- clasificación,
- normalización futura.

---

# Flujo general

```text
PDF nómina
    ↓
Extracción texto
    ↓
Normalización parser
    ↓
Objeto auditable
    ↓
Comparativa / simulador / histórico / reclamación
```

---

# Datos extraídos

## Datos trabajador

- Nombre y apellidos
- NIF
- Nº Seguridad Social
- Fecha ingreso
- Cargo
- Nivel
- Base

---

## Datos económicos

- Total devengado
- Base IRPF
- Retención IRPF
- Líquido neto
- Base SS
- Cuota SS
- Acumulado Base IRPF
- Acumulado IRPF retenido

---

## Conceptos nómina

El parser identifica:
- salario base,
- horas de vuelo,
- DPO,
- dietas,
- pluses,
- especies,
- préstamos,
- deducciones,
- IRPF,
- Seguridad Social.

---

# Clasificación de conceptos

## Devengo salarial
Conceptos que forman parte del salario bruto.

## Dieta exenta
No computa en IRPF/SS.

## Dieta sujeta
Sí computa.

## Especie
Concepto retributivo en especie.

## Deducción legal
- IRPF
- Seguridad Social

## Deducción privada neta
Ejemplos:
- amortización préstamo
- préstamos privados

No deben reducir:
- Base SS
- Base IRPF
---

# Reglas críticas

## NIF trabajador

Nunca utilizar:
- CIF empresa,
- NIF empresa

como:
- NIF trabajador.

Si existen varios identificadores:
- priorizar el bloque trabajador,
- ignorar bloque empresa.

Si no existe certeza:
- devolver vacío,
- marcar “No detectado”.

Nunca actualizar perfil automáticamente con un NIF inseguro.

---

## Actualización controlada

Los datos extraídos NO deben sobrescribir automáticamente:
- perfil,
- histórico,
- simulador.

La actualización debe:
1. mostrar datos extraídos,
2. permitir selección manual,
3. requerir confirmación explícita.

---

# Días trabajados e incidencias

El parser detecta días codificados en nómina.

## Códigos soportados

- EN → Enfermedad
- AC → Accidente
- MA → Maternidad
- ER → ERE
- VA → Vacaciones
- PA → Paternidad
- RE → Riesgo embarazo
- HU → Huelga
- AU → Ausencia

---

# Comparativa inteligente

El parser alimenta directamente el motor de auditoría.

## Objetivo

Separar:
- causas raíz,
- derivados automáticos,
- impacto neto real.

---

## Causas raíz

Ejemplos:
- horas de vuelo,
- DPO,
- salario base,
- variables.

---

## Derivados automáticos

Ejemplos:
- Base IRPF,
- Total devengado,
- Retención,
- Líquido neto.

Los derivados NO deben sumarse múltiples veces.

---

# Historial de auditorías

Los resultados normalizados pueden almacenarse en:

```text
localStorage
```

Actualmente se guarda:
- resumen auditoría,
- diferencias,
- datos clave,
- discrepancias principales,
- impacto neto.

No se almacena todavía el PDF completo.

---

# Reclamaciones técnicas

El parser alimenta el generador de reclamaciones.

## Objetivo

Generar:
- consultas profesionales,
- técnicas,
- auditables,
- sobrias,
- claras.

Evitar:
- lenguaje jurídico artificial,
- bloques excesivamente largos,
- duplicidad de conceptos derivados.

---

# Validaciones actuales

## Base SS

Validación:
- base máxima,
- topes,
- solidaridad,
- inconsistencias.

---

## Préstamos

Clasificación:
- amortización préstamo,
- intereses préstamo.

Regla:
- afectan líquido,
- no deben alterar incorrectamente bases.

---

## Acumulados IRPF

El parser detecta:
- acumulado base IRPF,
- acumulado IRPF retenido.

Pueden sincronizar:
- simulador,
- histórico acumulado.

La actualización debe ser manual.

---

# Limitaciones actuales

## Parser híbrido

Actualmente sigue dependiendo parcialmente:
- estructura PDF,
- formato nómina,
- extracción textual.

---

## Variabilidad formatos

El parser debe tolerar:
- pequeñas diferencias,
- OCR imperfecto,
- cambios menores de maquetación.

---

## No inferencia agresiva

PilotPay prioriza:
- no inventar datos,
- no asumir conceptos ambiguos,
- no completar información insegura.

---

# Objetivos futuros

1. Migración parser backend completa.
2. Normalización documental avanzada.
3. Validación estructural automática.
4. Parser tolerante multiempresa.
5. Trazabilidad normativa por concepto.
6. Indexación documental futura.

---

# Filosofía final

El parser de PilotPay no busca únicamente:
- leer PDFs.

Busca:
- convertir nóminas reales en estructuras auditables,
- alimentar simulación y auditoría,
- mantener trazabilidad financiera,
- reducir errores interpretativos,
- generar explicaciones profesionales fiables.
