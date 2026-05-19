# Arquitectura auditable — PilotPay

## Principio general

PilotPay es una plataforma de auditoría salarial y simulación financiera especializada en personal aeronáutico.

La aplicación NO debe entenderse únicamente como una calculadora de nóminas.

El objetivo del proyecto es proporcionar:

- trazabilidad,
- estabilidad,
- comparación auditable,
- simulación financiera,
- interpretación inteligente de discrepancias,
- generación documental profesional.

La prioridad técnica es:

```text
precisión > automatización agresiva
estabilidad > refactor
auditoría > estética
```

---

# Arquitectura actual

PilotPay utiliza actualmente una arquitectura híbrida en transición progresiva hacia backend auditable.

## Estructura principal

```text
frontend/
  index.html
  api-client.js
  assets/
  js/

backend/
  src/
    config/
    engine/
    parsers/
    routes/
  test/
```

---

# Frontend

## Estado actual

El frontend sigue siendo parcialmente legacy.

Actualmente concentra todavía:

- renderizado principal,
- dashboard,
- simulador,
- comparativa,
- generación PDF,
- parser visual parcial,
- historial de auditorías,
- motor explicativo,
- reclamaciones,
- navegación,
- UX/UI,
- persistencia local.

## Funcionalidades actuales del frontend

### Dashboard operativo
Incluye:
- última auditoría,
- estado financiero,
- alertas,
- actividad del mes,
- acceso contextual a módulos.

### Calculadora de nómina
Soporta:
- CMD,
- COP,
- TCP,
- pagas prorrateadas/14 pagas,
- vacaciones,
- IT,
- DPO,
- variables,
- horas de vuelo,
- HB/HV,
- especies,
- préstamos,
- dietas.
### Comparativa inteligente
La comparativa ya no se limita a mostrar diferencias brutas.

Actualmente:
- clasifica conceptos,
- detecta causas raíz,
- identifica derivados,
- calcula impacto neto real,
- evita duplicidades,
- genera explicaciones técnicas.

### Motor explicativo
Clasifica:
- causa,
- derivado,
- neto.

Evita:
- sumar consecuencias automáticas múltiples,
- inflar diferencias totales,
- interpretaciones erróneas.

### Historial de auditorías
Persistencia local mediante localStorage.

Guarda:
- auditorías,
- discrepancias,
- diferencias netas,
- datos extraídos,
- resumen técnico.

### Generación documental
Actualmente genera:
- nóminas PDF,
- reclamaciones técnicas,
- comparativas auditables.

### Sistema de perfiles
Incluye:
- perfil usuario,
- configuración,
- avatares,
- navegación contextual,
- sincronización parcial de datos.

---

# Backend

## Objetivo del backend

El backend es la futura fuente de verdad del proyecto.

La migración sigue siendo progresiva.

El frontend todavía contiene lógica crítica temporal.

## Funcionalidades actuales backend

### Motor determinista de cálculo
Incluye:
- tablas salariales,
- cálculo tramos,
- Seguridad Social,
- IRPF parcial,
- especies,
- préstamos,
- pagas extra,
- dietas,
- bases.

### API

Endpoints principales:

```text
GET  /health
POST /api/calcular-nomina
POST /api/comparar-nomina
POST /api/distribuir-hv
POST /api/auditar-hv
GET  /api/fuentes
```

### Parser backend parcial
Migración progresiva desde frontend.

Actualmente:
- parser híbrido,
- validación parcial,
- auditoría comparativa.

### Tests automatizados

```text
backend/test/
```

Cubren:
- cálculo,
- tramos,
- SS,
- IRPF,
- préstamos,
- topes,
- pagas extra.

---

# Motor de auditoría

## Filosofía

PilotPay NO interpreta cualquier diferencia como impacto independiente.

El sistema distingue entre:

### Causas raíz
Conceptos origen reales.

Ejemplos:
- Horas de vuelo,
- DPO,
- salario base,
- variables.

### Derivados
Consecuencias automáticas.

Ejemplos:
- Base IRPF,
- retención,
- total devengado,
- líquido.

### Neto
Impacto económico final real.
---

## Reglas críticas

- Los derivados NO deben sumarse varias veces.
- La diferencia total debe reflejar impacto económico real.
- Las explicaciones deben separar:
  - origen,
  - consecuencia,
  - efecto final.

---

# Persistencia y estado

PilotPay utiliza actualmente persistencia híbrida.

## LocalStorage

Se utiliza para:
- historial auditorías,
- simulador,
- perfil usuario,
- avatar seleccionado,
- configuraciones,
- acumulados.

## Firebase

Actualmente sigue parcialmente integrado en frontend legacy.

Pendiente:
- migración segura,
- desacoplamiento,
- backend autenticado.

---

# Parser de nómina

## Objetivo

Convertir una nómina Binter en un objeto auditable estructurado.

## Datos extraídos

- Nombre
- NIF
- Nº Seguridad Social
- Fecha ingreso
- Bases
- Retenciones
- Acumulados IRPF
- Días trabajados
- Incidencias:
  - EN
  - AC
  - VA
  - MA
  - ER
  - PA
  - RE
  - HU
  - AU

## Reglas importantes

### NIF trabajador
Nunca utilizar:
- CIF empresa,
- NIF empresa

como:
- NIF trabajador.

Si no existe certeza:
- devolver vacío,
- no actualizar perfil automáticamente.

### Actualización controlada
Los datos extraídos:
- NO actualizan automáticamente,
- requieren validación visual,
- requieren confirmación manual.

---

# Responsive y UX

PilotPay debe funcionar correctamente en:

- móviles,
- tablets,
- portátiles,
- desktop,
- Windows,
- macOS,
- iPadOS.

## Principios UI

- diseño premium,
- limpio,
- sobrio,
- profesional,
- sin ruido visual.

Evitar:
- exceso de botones,
- dashboards saturados,
- aspecto gaming,
- badges innecesarios,
- modales gigantes,
- tablas no responsive.
---

# Limitaciones actuales

## IRPF
El motor todavía NO sustituye completamente:
- programa oficial AEAT,
- regularizaciones complejas intraanuales,
- todos los escenarios modelo 145.

## Frontend legacy
El frontend todavía contiene:
- lógica crítica,
- cálculos,
- renderizado financiero.

Pendiente:
- migración progresiva backend.

## Parser
El parser sigue siendo híbrido y dependiente de formatos reales de nómina.

---

# Objetivos futuros

## Prioridades reales

1. Consolidar backend como fuente de verdad.
2. Completar migración parser backend.
3. Mejorar trazabilidad normativa.
4. Añadir validación documental real.
5. Mantener estabilidad del motor financiero.
6. Reducir dependencia del HTML legacy.

---

# Filosofía final

PilotPay no busca:
- parecer complejo,
- añadir funciones artificialmente,
- llenar pantallas.

Busca:
- precisión,
- claridad,
- auditoría real,
- estabilidad,
- experiencia premium,
- utilidad profesional.