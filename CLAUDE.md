# CLAUDE.md — PilotPay

## 1. Qué es PilotPay

PilotPay es una plataforma de auditoría salarial y simulación financiera orientada principalmente a personal aeronáutico de Binter Canarias.

No es únicamente una calculadora de nóminas.

La prioridad del proyecto es:

- trazabilidad,
- estabilidad,
- auditoría,
- precisión financiera,
- interpretación inteligente de discrepancias,
- generación profesional de informes y reclamaciones.

Actualmente la app cubre principalmente:

- CMD (Comandante)
- COP (Copiloto)
- TCP (Tripulante de Cabina)

El motor más desarrollado actualmente es el de pilotos (Grupo IV convenio BCSA).

---

# 2. Arquitectura actual

PilotPay utiliza actualmente una arquitectura híbrida.

## Frontend

Frontend legacy basado principalmente en:

```text
frontend/index.html
```

Contiene todavía:

- lógica crítica,
- renderizado,
- parser visual,
- dashboard,
- comparativa,
- simulador,
- gestión de historial,
- UI premium,
- generación PDF,
- motor explicativo de discrepancias.

## Backend

Backend progresivamente desacoplado:

```text
backend/
```

Contiene:

- motor determinista de cálculo,
- tablas salariales,
- Seguridad Social,
- IRPF,
- endpoints API,
- parser parcial,
- tests automatizados.

## Situación real actual

El frontend todavía NO debe considerarse completamente desacoplado.

Muchas funcionalidades críticas siguen temporalmente en el HTML legacy.

No introducir nueva lógica compleja innecesaria en frontend si puede centralizarse posteriormente en backend.

---

# 3. Principios críticos del proyecto

## 3.1 Nunca duplicar conceptos derivados

Separar SIEMPRE:

- causas raíz
- consecuencias automáticas

Ejemplo:

Causas:
- Horas de vuelo
- DPO

Consecuencias derivadas:
- Total devengado
- Base IRPF
- Retención IRPF
- Líquido neto

Los derivados NO deben sumarse varias veces.

---

## 3.2 Mantener precisión financiera

- No redondear prematuramente.
- Mantener precisión hasta resultado final.
- Evitar recalcular bases innecesariamente.
- Revisar impacto de cualquier cambio sobre:
  - Base SS
  - Base IRPF
  - Retención
  - Líquido neto

---

## 3.3 Estabilidad > refactor

Evitar:
- reescrituras masivas,
- refactors innecesarios,
- cambios estructurales sin motivo real.

PilotPay prioriza:
- estabilidad,
- auditabilidad,
- continuidad funcional.

---

## 3.4 Auditoría > estética

La estética es importante, pero nunca debe comprometer:
- claridad,
- trazabilidad,
- interpretación,
- estabilidad.

---

# 4. Motor de auditoría

PilotPay incluye un sistema de auditoría inteligente.

## Clasificación de discrepancias

### Causa
Concepto origen de discrepancia real.

Ejemplos:
- Horas de vuelo
- DPO
- salario base

### Derivado
Consecuencia automática de otros conceptos.

Ejemplos:
- Total devengado
- Base IRPF
- Retención
- Líquido neto

### Neto
Impacto económico final percibido por el trabajador.

---

## Reglas críticas

- Los derivados NO generan impacto independiente.
- La diferencia total NO debe sumar derivados múltiples.
- La auditoría debe explicar:
  - origen probable,
  - impacto real,
  - consecuencias automáticas.

---

# 5. Parser PDF de nóminas

El parser debe priorizar:
- precisión,
- seguridad,
- trazabilidad.

## Reglas importantes

### NIF trabajador
Nunca usar:
- CIF/NIF empresa
como:
- NIF trabajador.

Si el NIF no puede detectarse con seguridad:
- devolver vacío,
- o "No detectado".

Nunca inferir datos inseguros.

---

## Datos críticos extraídos

- Nombre
- NIF
- Nº SS
- Fecha ingreso
- Acumulado Base IRPF
- Acumulado IRPF retenido
- Días trabajados
- Códigos:
  - EN
  - AC
  - VA
  - MA
  - ER
  - PA
  - RE
  - HU
  - AU

---

## Actualización de perfil/histórico

La actualización NO debe hacerse automáticamente.

Debe existir:
- validación visual,
- selección manual,
- confirmación explícita del usuario.

---

# 6. UI / UX

PilotPay debe mantener una imagen:

- premium,
- profesional,
- limpia,
- sobria,
- técnica.

Evitar:
- aspecto gaming,
- exceso de colores agresivos,
- ruido visual,
- exceso de botones,
- badges innecesarios,
- bloques redundantes.

---

## Principios visuales

- Menos bloques, mejor jerarquía.
- Priorizar lectura rápida.
- Mantener alineaciones limpias.
- Evitar etiquetas desalineadas.
- Mantener densidad visual equilibrada.
- El dashboard es un panel operativo, no un menú gigante.

---

# 7. Responsive y compatibilidad

PilotPay debe funcionar correctamente en:

- móviles,
- tablets,
- portátiles,
- monitores grandes,
- Windows,
- macOS,
- iPadOS.

## Reglas

- No diseñar solo para desktop.
- Evitar tablas que rompan mobile.
- Mantener layouts fluidos y responsive.
- Evitar modales gigantes en móvil.
- Priorizar legibilidad.
- Cualquier nuevo módulo debe comprobarse:
  - desktop,
  - tablet,
  - mobile.

---

# 8. Flujo de cambios

## Cambios grandes

Claude debe:
1. Explicar primero qué entiende.
2. Indicar:
   - archivos afectados,
   - riesgos,
   - dependencias.
3. Esperar confirmación.

---

## Cambios pequeños

Cambios:
- visuales,
- alineaciones,
- textos,
- badges,
- responsive

pueden aplicarse directamente.

---

## Cambios críticos

Antes de tocar:
- cálculo,
- parser,
- IRPF,
- comparativa,
- backend,
- histórico

Claude debe:
- analizar dependencias,
- evitar romper cálculos existentes,
- evitar regresiones silenciosas.

---

# 9. Git y checkpoints

Realizar checkpoints frecuentes:

```bash
git add .
git commit -m "mensaje"
```

Especialmente antes de:
- cambios UI grandes,
- parser,
- motor cálculo,
- backend,
- dashboard,
- comparativa.

---

# 10. Estado funcional actual

PilotPay incluye actualmente:

- Dashboard operativo
- Calculadora de nómina
- Variables
- Simulador IRPF
- Comparativa inteligente
- Historial de auditorías
- Motor explicativo
- Clasificación causa/derivado/neto
- Parser PDF de nóminas
- Extracción de acumulados
- Actualización controlada de perfil/histórico
- Generación de reclamaciones
- Generación PDF de nómina
- Gestión de perfiles
- Sistema de avatares
- Convenio integrado
- Backend parcial auditable
- Tests backend iniciales

---

# 11. Filosofía general

PilotPay no busca:
- añadir funciones rápidamente,
- llenar pantallas,
- parecer complejo artificialmente.

Busca:
- precisión,
- claridad,
- utilidad real,
- auditoría profesional,
- experiencia premium,
- estabilidad técnica.
