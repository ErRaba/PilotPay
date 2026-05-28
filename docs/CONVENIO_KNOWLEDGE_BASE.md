# Base de Conocimiento Laboral — Binter Canarias (BCSA 2026)

**Convenio**: BOE-A-2026-6389 · Vigencia: 01/01/2026 – 31/12/2031  
**Actualización**: 2026-05-25  
**Enfoque**: conocimiento práctico para tripulaciones (Grupos III y IV)

> Este documento es la fuente de verdad del módulo de Conocimiento de PilotPay.  
> NO describe cómo calcula la app — responde dudas reales del tripulante.

---

## Tipos de fuente

| Código | Significado |
|--------|-------------|
| `convenio` | Texto literal del BCSA 2026 |
| `practica_empresa` | Práctica de Binter no recogida literalmente en el convenio |
| `interpretacion` | Interpretación del convenio, puede variar |
| `pendiente` | Pendiente de contrastar con nóminas reales |

---

## Sección 1 — Nómina y variables

### HV-01 · Tramos de horas de vuelo
**Fuente**: Art. 46 (Gr.III) / Art. 47 (Gr.IV) · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Las horas de vuelo se acumulan mes a mes y se cobran por tramos progresivos. A más horas, mayor tarifa por cada hora adicional.

| Tramo | Rango |
|-------|-------|
| T1 | Horas 60 a 70 |
| T2 | Horas 70 a 80 |
| T3 | Horas 80 a 90 |
| T4 | Horas >90 |

Los tramos se calculan para un mes de 30 días. Si hay vacaciones, IT u otras situaciones reducibles previstas en el convenio, los límites de tramo se reducen proporcionalmente.

**Importante**: Las horas se cuentan en "unidades" de hora de vuelo, no necesariamente en horas de bloque puras. Imaginarias, francos, uprouting y split duty generan unidades adicionales que se acumulan en este contador.

**Tarifa TCP**: diferencia entre días ordinarios (T-O) y días de especial relevancia (T-R). Los T-R tienen tarifas más altas.

---

### HV-02 · Horas nocturnas — multiplicador 1,5
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Las horas de vuelo generadas en sectores programados o reprogramados que invadan la franja **01:00–04:59 LT** se multiplican por **1,5** a efectos del cómputo de HV.

El coeficiente 1,5 está ya incluido como compensación — no genera ningún otro concepto adicional.

*Ejemplo: un sector de 1h de bloque que termine a las 04:00 LT computa como 1,5 unidades de HV.*

---

### HV-03 · Festivos especiales — multiplicador 1,5
**Fuente**: Art. 50 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Las horas de vuelo generadas en los días **25 de diciembre, 1 de enero y 6 de enero** se multiplican por **1,5**.

*Nota TCP*: este multiplicador se suma (o combina) con la tarifa T-R si el festivo coincide con un día de especial relevancia — pendiente confirmar con nóminas reales (`pendiente`).

---

### HV-04 · Imaginaria
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

| Situación | Genera |
|-----------|--------|
| Imaginaria programada (cualquier tipo) | **3 unidades de HV** |
| Activada pero sin vuelo asignado | Además: **1 dieta nacional** |
| Activada, en sala de firmas sin actividad | **1 HV adicional por cada 2h** en sala |

La imaginaria **FNA por ROFF** (solicitada por el tripulante) no genera estas variables.  
La imaginaria FNA solicitada por la empresa sí genera la variable.

La asignación de imaginarias debe distribuirse equitativamente entre todos los tripulantes.

---

### HV-05 · Franco de servicio
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Cada franco programado genera **2 unidades de HV**.

Si durante el propio día del franco la empresa requiere al tripulante de forma imprevista (mismo día), pasa a ser **libre volado** y su aceptación es voluntaria. En ese caso no genera la variable de franco.

Si el tripulante no recibe asignación en el plazo marcado, queda relevado. El franco no pasa a día libre.

**FNA por ROFF** → no genera variable franco.  
**FNA a solicitud de la empresa** → sí genera variable franco.

---

### HV-06 · Libre volado
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Variable por cada día que, estando programado como **libre**, el tripulante realiza actividad encomendada por la empresa de forma voluntaria.

| Tipo | Intervalo |
|------|-----------|
| Libre Volado <24h | Solicitud con menos de 24h de antelación |
| Libre Volado 24-72h | Solicitud entre 24h y 72h |
| Libre Volado >72h | Solicitud con más de 72h de antelación |

**Importes por grupo y nivel (Anexo I):**

| Tipo | TCP N1 | TCP N2 | TCP N3 | TCP N4 | TCP N5 |
|------|--------|--------|--------|--------|--------|
| <24h | 225€ | 200€ | 175€ | 150€ | 125€ |
| 24-72h | 135€ | 110€ | 95€ | 80€ | 65€ |
| >72h | 90€ | 80€ | 70€ | 60€ | 50€ |

| Tipo | COP N1 | COP N2 | COP N3 | COP N4 | COP N5 | COP N6 |
|------|--------|--------|--------|--------|--------|--------|
| <24h | 475€ | 450€ | 425€ | 400€ | 375€ | 350€ |
| 24-72h | 350€ | 325€ | 300€ | 275€ | 250€ | 225€ |
| >72h | 225€ | 200€ | 175€ | 150€ | 125€ | 100€ |

| Tipo | CMD N1 | CMD N2 | CMD N3 | CMD N4 | CMD N5 | CMD N6 |
|------|--------|--------|--------|--------|--------|--------|
| <24h | 750€ | 700€ | 650€ | 600€ | 550€ | 500€ |
| 24-72h | 500€ | 475€ | 450€ | 425€ | 400€ | 375€ |
| >72h | 375€ | 350€ | 325€ | 300€ | 275€ | 250€ |

La empresa asigna los libres volados mediante un sistema de puntos.

**Nota crítica Gr.III**: el convenio especifica "de forma voluntaria" en el artículo de TCP. Para Gr.IV la redacción omite "voluntaria" — misma práctica en la realidad, pero el convenio TCP lo explicita más claramente.

---

### HV-07 · Uprouting
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Por cada hora de bloque comercial **adicional** realizada tras haber completado los saltos inicialmente programados, siempre que el tripulante finalice su actividad después de la hora de firma original:

**→ 1,5 unidades de HV por hora de bloque adicional**

---

### HV-08 · Split duty / escala programada
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

| Duración de la escala | Genera |
|-----------------------|--------|
| >2,5 horas | 1 unidad de HV |
| >5 horas | 2 unidades de HV |

---

### HV-09 · Media de variables en vacaciones
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Durante el período vacacional disfrutado, la empresa abona un concepto llamado "media de variables":

**Cálculo**: promedio mensual de todos los conceptos variables cobrados en los **12 meses naturales inmediatamente anteriores**, dividido entre **30**, multiplicado por los días de vacaciones disfrutados.

**Cuándo se paga**: en la nómina del mes **siguiente** al disfrute de vacaciones, de forma proporcional.

*Ejemplo: 30 días de vacaciones en julio → la media de variables aparece en la nómina de agosto.*

---

### HV-10 · Incentivo por objetivos (DPO)
**Fuente**: Art. 48 · `convenio`  
**Grupos**: CMD, COP, SCC (≥75%), TCP  
**Calculable**: parcialmente — depende del % de cumplimiento de objetivos

Incentivo económico anual bruto, proporcional al tiempo efectivo de trabajo. No consolidable.

| Función | Importe anual bruto |
|---------|---------------------|
| CMD | 10.000€ |
| COP N1-4 | 2.500€ |
| COP N5-6 | 1.500€ |
| SCC (≥75% actividad como SCC) | 2.500€ |
| TCP | 1.500€ |

El porcentaje de concesión varía entre **0% y 130%** según los objetivos fijados por la Dirección (comunicados previamente). Si los objetivos no han sido definidos y comunicados antes del período, no puede exigirse el cumplimiento ni la penalización.

---

### HV-11 · Plus de sobrecargo (TCP)
**Fuente**: Art. 46 · `convenio`  
**Grupos**: SCC (TCP en función sobrecargo)  
**Calculable**: sí

Variable que se devenga por cada período de actividad de vuelo en que un TCP desempeña la función de sobrecargo.

Si el TCP ejerce como SCC en **≥75%** de su actividad mensual, el resto de días de vuelo del mes (hasta el 100%) también se abonan al tarifa de sobrecargo.

**Importes por período de actividad:**

| Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 | Nivel 5 |
|---------|---------|---------|---------|---------|
| 20,80€ | 19,50€ | 17,17€ | 14,27€ | 10,93€ |

---

### HV-12 · Dietas de vuelo
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Se genera **una dieta de vuelo por cada período de actividad** (vuelo realizado o cancelado después de la firma).

**Importes TCP Gr.III (por nivel):**

| Concepto | N1 | N2 | N3 | N4 | N5 |
|----------|----|----|----|----|-----|
| Dieta nacional | 26,50€ | 22,70€ | 21,13€ | 16,07€ | 11,45€ |
| Suplemento internacional | 4,80€ | 4,40€ | 4,25€ | 3,86€ | 3,29€ |
| Supl. pernocta nacional | 17,86€ | 17,86€ | 17,86€ | 17,86€ | 17,86€ |
| Supl. pernocta internacional | 34,67€ | 34,67€ | 34,67€ | 34,67€ | 34,67€ |

**Importes CMD/COP Gr.IV:**

| Concepto | CMD todos | COP N1-4 | COP N5-6 |
|----------|-----------|----------|----------|
| Dieta nacional | 40,14€ | 40,14€ | 40,14€ |
| Suplemento internacional | 33,45€ | 33,45€ | **13,38€** |
| Supl. pernocta nacional | 18,96€ | 18,96€ | 18,96€ |
| Supl. pernocta internacional | 61,33€ | 61,33€ | **35,68€** |

**Atención COP N5-6**: el suplemento internacional y pernocta internacional son significativamente inferiores a N1-4. Es un diferencial concreto en el convenio.

También se genera dieta de vuelo en vuelos posicionales como única actividad del día, si están motivados por actividad de vuelo el día anterior o posterior.

---

### HV-13 · Plus de transporte
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Compensación por traslados ciudad–aeropuerto–ciudad. Se paga en **11 mensualidades** (no se devenga en periodos de vacaciones, IT, licencias de día completo).

| Función | Importe |
|---------|---------|
| TCP | 117,08€/año (≈10,64€/mes × 11) |
| COP | 167,25€/mes × 11 |
| CMD | 200,70€/mes × 11 |

---

## Sección 2 — Cuando no vuelo (IT / Bajas)

### IT-01 · Los 7 primeros días sin complemento de empresa
**Fuente**: Art. 49 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC (Gr.III y IV)  
**Calculable**: sí

Para el personal de producción (Grupos III y IV), la empresa **no complementa los 7 primeros días** de baja médica por enfermedad común o accidente no laboral.

Durante esos 7 días, el tripulante solo percibe la prestación de la Seguridad Social (generalmente el 60% de la base reguladora).

A partir del día 8 y hasta 6 meses: la empresa complementa hasta el 100% de los conceptos retributivos **fijos** (salario base + extras).

**Las variables no se complementan nunca durante una baja** — solo los conceptos fijos.

---

### IT-02 · Baja por accidente laboral o enfermedad profesional
**Fuente**: Art. 49 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

En caso de **accidente de trabajo o enfermedad profesional**: la empresa complementa desde **el primer día** hasta el 100% de los conceptos retributivos fijos, sin límite temporal explicitado en el artículo (hasta recuperación o declaración de IP).

No aplica el periodo de carencia de 7 días.

---

### IT-03 · Baja por enfermedad común — condiciones y duración
**Fuente**: Art. 49 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: parcialmente

Condiciones para el complemento:
- Enfermedad común o accidente no laboral
- La empresa complementa hasta 6 meses al 100% de conceptos fijos
- **Excepción**: si el trabajador ha acumulado **más de 2 bajas en los 3 meses anteriores**, puede no complementar
- Si el servicio médico de la empresa considera la enfermedad **grave**, el complemento continúa más allá del criterio de acumulación

Obligaciones del trabajador:
- Acudir a las citas del servicio médico de la empresa (control IT)
- Si no acude (sin justificación médica documentada): la empresa puede dejar de pagar el complemento

---

### IT-04 · IT durante vacaciones
**Fuente**: Art. 41 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no (gestión administrativa)

Si el tripulante cae de baja durante las vacaciones:
1. Debe comunicarlo a la empresa en **24 horas**
2. Los días de vacaciones no disfrutados por IT se recuperan cuando las necesidades del servicio lo permitan
3. Se requiere documento oficial de baja médica
4. Si la IT es por embarazo, parto o lactancia: derecho a disfrutar las vacaciones al terminar la suspensión del contrato, aunque haya terminado el año natural

**¿Pierdo las vacaciones si caigo de baja en navidades?** No. Tienes derecho a recuperarlas cuando se pueda, con hasta 18 meses de margen desde el fin del año.

---

## Sección 3 — Vacaciones y descansos

### VAC-01 · Duración y fraccionamiento
**Fuente**: Art. 41 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC (Gr.III/IV)  
**Calculable**: no

- **30 días naturales** de vacaciones anuales
- Pueden fraccionarse en hasta **4 periodos**
- Hasta **4 días** pueden reservarse como "días personales" (preaviso mínimo 45 días para Gr.III/IV)
- Las vacaciones del año anterior pendientes tienen **prioridad en enero** sobre las del año en curso
- Deben disfrutarse antes del **31 de enero del año siguiente**
- Las vacaciones no disfrutadas por IT tienen hasta **18 meses** desde fin del año para recuperarse

---

### VAC-02 · Sistema de puntos para elección de vacaciones
**Fuente**: Art. 41 / Art. 18 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no (gestión de programación)

La empresa publica la programación de vacaciones antes del **1 de diciembre del año anterior** para Gr.III/IV.

Sistema de puntuación por mes de disfrute (puntos acumulados año a año; más puntos = peor posición el año siguiente):

| Mes | Puntos |
|-----|--------|
| Enero (1.ª semana) | 10 |
| Enero (resto) | 0 |
| Febrero | 0 |
| Marzo | 2 |
| Abril | 4 |
| Mayo | 5 |
| Junio | 7 |
| Julio | 11 |
| Agosto | 12 |
| Septiembre 1.ª quincena | 10 |
| Septiembre 2.ª quincena | 9 |
| Octubre | 6 |
| Noviembre | 0 |
| Diciembre 1.ª quincena | 3 |
| Diciembre 2.ª quincena | 8 |
| Semana Santa (todos los días) | 8 |
| Puentes del año | 2 adicionales |

Personal nuevo: se le asigna la puntuación más alta más 20 puntos adicionales.  
En caso de empate: desempata la antigüedad administrativa.

---

### VAC-03 · Navidades — periodos preferentes
**Fuente**: Art. 81 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

Cada tripulante elige **dos periodos preferentes** para librar en navidades. Al menos **uno** le será concedido.

Periodos navideños:
- 24/25 de diciembre
- 31 de diciembre / 1 de enero
- 5/6 de enero

Si hay muchas solicitudes para el mismo periodo: sorteo ante representante de trabajadores y empresa. El tripulante que le toca actividad de vuelo no le puede volver a tocar hasta que todos hayan tenido al menos una.

---

### VAC-04 · Media de variables en vacaciones — cuándo y cuánto
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí

Durante las vacaciones, además del salario base y extras, se percibe la media de variables. Se paga en la **nómina del mes siguiente** al disfrute.

**Cálculo**: suma de todas las variables de los últimos 12 meses ÷ 12 meses ÷ 30 × días de vacaciones disfrutados.

*Impacto real*: si en julio se cogen 15 días de vacaciones, la media de variables aparece en agosto. Si se fraccionan las vacaciones, la media correspondiente aparece el mes siguiente a cada fracción.

---

### VAC-05 · Reducción de jornada y tramos de HV
**Fuente**: Art. 40 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: sí con normativa interna

En periodos de reducción de jornada (guarda legal), los tramos de HV se reducen proporcionalmente a la reducción aplicada. Este criterio también aplica durante vacaciones y licencias no retribuidas.

La reducción se materializa en días libres adicionales agrupados en un bloque mensual. Las peticiones deben enviarse con **mínimo 2 meses** de antelación.

---

## Sección 4 — Mis permisos

### PER-01 · Licencia no retribuida
**Fuente**: Art. 39 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

- Petición con **mínimo 45 días** de antelación al comienzo del mes de disfrute (con acuse de recibo)
- Máximo **1 persona por cada 40** del respectivo grupo laboral simultáneamente
- Las vacaciones reglamentarias tienen **preferencia** sobre licencias no retribuidas
- Se entiende **concedida** si no hay respuesta de la empresa **15 días antes** del inicio
- Asignación: por orden de petición; empate → por antigüedad

---

### PER-02 · Consultas médicas (Gr.III/IV)
**Fuente**: Art. 42 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

Para Gr.III/IV, la empresa facilita días libres de los **99 anuales** para consultas médicas propias o de hijos. No se consideran ROFF (no suma puntos en el sistema de solicitudes posteriores).

- Si se solicita **15 días antes** de la publicación de la programación: se considera concedido (sujeto a disponibilidad operativa)
- Si se solicita fuera de plazo: la empresa lo intentará conceder si es posible
- La negativa debe ser justificada (comunicable al Comité de Empresa)
- Requiere justificante médico antes de reincorporarse

---

### PER-03 · Excedencias
**Fuente**: Art. 87 (remite a Disposiciones Generales) + legislación vigente  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

Las excedencias (voluntaria, forzosa, especial) se regulan por las Disposiciones Generales del convenio y por la legislación laboral vigente. El convenio remite a la normativa general — consultar con representación sindical.

---

## Sección 5 — Días libres y actividad

### LIB-01 · Los 99 días libres anuales
**Fuente**: Art. 80 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

- **99 días libres/año** incluyendo festivos oficiales (nacionales, regionales, locales)
- Mínimo **9 días libres por mes** de actividad
- Los días libres absorben los festivos oficiales
- Pueden modificarse con acuerdo de programación (roster con patrón fijo)

---

### LIB-02 · ROFF — libre solicitado
**Fuente**: Art. 80 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

- Petición al Departamento de Programación **antes del día 24 del mes anterior**
- Aparece en la programación como ROFF
- La empresa no puede denegarlo sin razones reales y justificadas
- Más de **2 ROFF en el mismo mes** puede dificultar que Programación cumpla otras protecciones del convenio (ej. máx. 5 días seguidos de actividad)

---

### LIB-03 · FNA — franco no activable
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

Un franco puede ser "no activable" (FNA). La diferencia crucial:

| Quién lo solicita | Genera variable franco |
|-------------------|----------------------|
| ROFF (el propio tripulante) | NO |
| La empresa | SÍ |

---

### LIB-04 · Máximo de días consecutivos de actividad
**Fuente**: Art. 81 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: no

- No se programarán **6 o más días seguidos** de actividad, salvo pacto en contrario
- En caso de necesidad del servicio: debe ser justificado y notificado periódicamente al Comité de Empresa
- Los bloques de 5 días deben ir precedidos o seguidos de 2 días libres cuando sea posible
- Los días de Comité de Empresa cuentan como día de trabajo a efectos del máximo consecutivo

---

### LIB-05 · Libre volado en un día de franco — ¿qué pasa?
**Fuente**: Art. 46 / Art. 47 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC

Si la empresa requiere al tripulante **el mismo día del franco** (imprevisto de último momento), el franco pasa a considerarse **libre volado** y su aceptación es **voluntaria**. En ese caso no se genera la variable de franco.

---

## Sección 6 — Mis beneficios

### BEN-01 · Seguro de vida
**Fuente**: Art. 51 · `convenio`  
**Grupos**: Todos (Gr.I, II, III, IV)  
**Calculable**: no

La empresa mantiene un seguro de vida colectivo. Capital asegurado: **75.126€** por trabajador en caso de:
- Gran incapacidad
- Incapacidad Permanente Absoluta (IPA)
- Incapacidad Permanente Total (IPT)
- Fallecimiento

La prima la paga íntegramente la empresa.  
No aplica en situaciones de incapacidad con reserva de puesto de trabajo ni en casos de reubicación.

---

### BEN-02 · Seguro médico privado
**Fuente**: Art. 52 · `convenio`  
**Grupos**: Todos (>6 meses antigüedad)  
**Calculable**: parcialmente

Para trabajadores con **más de 6 meses de antigüedad**:
- La empresa suscribe seguro médico privado para los interesados
- Coste: **50% empresa / 50% trabajador** (descontado de nómina)

Alternativa: si ya tienes seguro médico propio, puedes optar por cobrar el mismo importe que pagaría la empresa, justificando el pago de tu póliza.

---

### BEN-03 · Seguro de pérdida de licencia
**Fuente**: Art. 53 · `convenio`  
**Grupos**: Gr.IV exclusivamente (CMD y COP, >6 meses antigüedad)  
**Calculable**: no

Solo para pilotos (Grupo IV):
- La empresa suscribe seguro colectivo de pérdida de licencia
- Coste: **50% empresa / 50% piloto** (descontado de nómina)
- Si el piloto tiene ya un seguro privado de pérdida de licencia: la empresa puede abonar el 50% de ese seguro (hasta el máximo que hubiera pagado en el colectivo)

---

### BEN-04 · Plan de pensiones
**Fuente**: Art. 54 · `convenio`  
**Grupos**: Todos (>1 año antigüedad)  
**Calculable**: no

Participación en el Plan de Pensiones de Empresas Vinculadas del Sistema Binter:
- Requiere **1 año de antigüedad** en la empresa
- Adhesión voluntaria
- Las cuantías en el Reglamento del Plan de Pensiones

---

### BEN-05 · Billetes de empresa
**Fuente**: Art. 65 · `convenio` / normativa interna  
**Grupos**: Todos  
**Calculable**: no · `practica_empresa`

El convenio únicamente indica que se regulará por normativa interna de Binter. Las condiciones concretas (tipos de billetes, prioridades, acompañantes) están fuera del texto del convenio.

---

### BEN-06 · Uniformidad TCP (Gr.III)
**Fuente**: Art. 92 + tabla Anexo · `convenio`  
**Grupos**: TCP, SCC, CC  
**Calculable**: no

**Dotación inicial al ingreso**:

| Prenda | Cantidad inicial |
|--------|-----------------|
| Vestido manga larga/corta o camisa y pantalón | 5 |
| Chaqueta bienvenida | 1 |
| Corbata | 2 |
| Chaqueta a bordo | 1 |
| Abrigo | 1 |
| Chaleco rojo | 1 |
| Tocado | 1 |
| Delantal | 1 |
| Bolso | 1 |
| Trolley Samsonite | 1 |
| Nevera | 1 |
| Placas identificativas | 4 |
| Pañuelo celeste | 2 |
| Pañuelo azul | 2 |
| Guantes | 1 |
| Medias 20 DEN | 6 |
| Zapatos | 2 pares |
| Vestido de verano | 3 |

**Renovación**: por deterioro (no hay sistema de puntos para TCP).  
Las prendas deterioradas por mal uso o lavado incorrecto son a cargo del TCP.

---

### BEN-07 · Uniformidad pilotos (Gr.IV)
**Fuente**: Art. 93 + tabla Anexo · `convenio`  
**Grupos**: CMD, COP  
**Calculable**: sí (sistema de puntos)

**Sistema de renovación por puntos** (ciclo de 3 renovaciones anuales, luego se reinicia):

| Renovación | Tope de puntos |
|------------|----------------|
| 1.ª renovación | 66 puntos |
| 2.ª renovación | 98 puntos |
| 3.ª renovación | 120 puntos |
| → se reinicia con 1.ª | — |

**Puntos por prenda:**

| Prenda | Puntos |
|--------|--------|
| Traje piloto (verano o invierno) | 50 pts/ud |
| Camisa manga corta | 7 pts/ud |
| Camisa manga larga | 7 pts/ud |
| Galón 4 barras + estrella | 5 pts/ud |
| Galón 3 barras | 5 pts/ud |
| Corbata | 5 pts/ud |
| Zapatos | 15 pts/par |
| Chaleco | 10 pts/ud |
| Cardigan | 15 pts/ud |
| Chaleco Piumino ligero marino | 15 pts/ud |
| Cinturón | 5 pts/ud |
| Calcetines (pack de 3) | 2 pts/pack |
| Nevera portalimentos | 3 pts/ud |
| Piloto Samsonite / Messenger Samsonite | 20 pts/ud |
| Trolley cabina rígido / Trolley mediano rígido | 20 pts/ud |

Lo que supere el límite de puntos es a cargo del piloto.

---

## Sección 7 — Situaciones especiales

### ESP-01 · Cese temporal en vuelo
**Fuente**: Art. 88 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC  
**Calculable**: no

El tripulante pasa a cese temporal en vuelo por:
- Pérdida temporal de la licencia
- Alteraciones psicofísicas sin pérdida de licencia ni baja SS que impidan volar
- Pérdida temporal de licencia por **gestación**

Durante el cese temporal (si el contrato no está suspendido): se perciben solo los **conceptos retributivos fijos**.

---

### ESP-02 · Cese definitivo en vuelo
**Fuente**: Art. 88 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC  
**Calculable**: no

Causas:
- Pérdida definitiva de la licencia
- Alteraciones psicofísicas irreversibles

En este caso: el trabajador queda **excluido del convenio** y causa baja en la empresa.

---

### ESP-03 · Regresión CMD → COP
**Fuente**: Art. 74 · `convenio`  
**Grupos**: CMD  
**Calculable**: no

Si la empresa revoca la función de Comandante (pérdida de confianza, razones técnicas, comerciales o laborales), el piloto vuelve a funciones de COP.

**Retribución**: la del **nivel de COP en el que estuviese antes de ser nombrado CMD**. Los complementos de comandante cesan inmediatamente.

El Comandante también puede solicitar voluntariamente la regresión (Art. 70), si hay vacante y supera las pruebas.

---

### ESP-04 · Regresión SCC → TCP
**Fuente**: Art. 74 / Art. 71 · `convenio`  
**Grupos**: SCC  
**Calculable**: no

Si la empresa revoca la función de Sobrecargo (cargo de confianza): el TCP vuelve a funciones de TCP con **pérdida de todos los complementos retributivos de sobrecargo**.

El Sobrecargo también puede solicitar voluntariamente el cese (Art. 71), si hay vacante.

---

### ESP-05 · Destacamento
**Fuente**: Art. 84 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC, CC  
**Calculable**: parcialmente

Se produce destacamento cuando el tripulante disfruta alguno de los días libres mínimos mensuales (9 o proporcional) fuera de su base.

**Compensación**:

| Tipo | Genera |
|------|--------|
| Voluntario | Variable "Destacamento" por cada día destacado fuera de base |
| Forzoso | Variable "Destacamento" por cada día libre disfrutado fuera de base |

**Importes (Anexo I):**

| Función | Destacamento NAC | Destacamento INT |
|---------|-----------------|-----------------|
| TCP N1-5 | 20,07€/día | 28,89€/día |
| COP N1-4 | 29,59€/día | 34,67€/día |
| COP N5-6 | 28,43€/día | 31,78€/día |
| CMD (todos) | 44,65€/día | 44,65€/día |

---

### ESP-06 · Suspensión de actividad
**Fuente**: Art. 91 · `convenio`  
**Grupos**: CMD, COP, TCP, SCC  
**Calculable**: parcialmente

Situación en que la Autoridad o la empresa declaran al tripulante en inactividad provisional para el vuelo durante un expediente.

Si el expediente es **sobreseído**: se garantizan las condiciones económicas derivadas de la **media de la flota**.

---

## Tablas salariales 2026 — Resumen

### Grupo III (TCP) — Salario base

| Función | N1 | N2 | N3 | N4 | N5 |
|---------|----|----|----|----|-----|
| TCP/SCC — SB (€/mes) | 950,10 | 940,50 | 932,00 | 913,60 | 891,60 |
| Extra junio/diciembre (€/mes base) | 79,20 | 78,40 | 77,70 | 76,10 | 74,30 |

### Grupo IV (Pilotos) — Salario base

| Función | N1 | N2 | N3 | N4 | N5 | N6 |
|---------|----|----|----|----|----|----|
| COP — SB (€/mes) | 2.731,55 | 2.490,54 | 2.252,36 | 1.863,32 | 1.671,95 | 1.349,08 |
| COP — Extra (€/mes) | 227,63 | 207,54 | 187,70 | 155,28 | 139,33 | 112,42 |
| CMD — SB (€/mes) | 5.156,11 | 4.784,02 | 4.314,56 | 4.033,05 | 3.788,03 | 3.371,19 |
| CMD — Extra (€/mes) | 429,68 | 398,67 | 359,55 | 336,09 | 315,67 | 280,93 |

### Grupo IV — HV (€/hora de bloque)

**CMD:**

| Tramo | N1 | N2 | N3 | N4 | N5 | N6 |
|-------|----|----|----|----|----|----|
| T1 | 95,51 | 85,96 | 82,52 | 79,22 | 74,47 | 65,53 |
| T2 | 106,02 | 95,41 | 91,60 | 87,93 | 82,66 | 72,74 |
| T3 | 115,57 | 104,01 | 99,85 | 95,86 | 90,10 | 79,29 |
| T4 | 127,98 | 115,19 | 110,58 | 106,15 | 99,79 | 87,81 |

**COP:**

| Tramo | N1 | N2 | N3 | N4 | N5 | N6 |
|-------|----|----|----|----|----|----|
| T1 | 34,21 | 31,47 | 27,38 | 21,90 | 21,03 | 18,92 |
| T2 | 37,97 | 34,93 | 30,39 | 24,31 | 23,34 | 21,01 |
| T3 | 41,39 | 38,08 | 33,13 | 26,50 | 25,44 | 22,90 |
| T4 | 45,84 | 42,17 | 36,69 | 29,35 | 28,18 | 25,36 |

**TCP (T-O / días ordinarios):**

| Tramo | N1 | N2 | N3 | N4 | N5 |
|-------|----|----|----|----|-----|
| T1 | 11,00 | 10,63 | 10,29 | 9,57 | 8,71 |
| T2 | 14,85 | 14,34 | 13,89 | 12,92 | 11,76 |
| T3 | 17,60 | 17,00 | 16,47 | 15,31 | 13,94 |
| T4 | 19,80 | 19,13 | 18,53 | 17,23 | 15,68 |

**TCP (T-R / días de especial relevancia):**

| Tramo | N1 | N2 | N3 | N4 | N5 |
|-------|----|----|----|----|-----|
| T1 | 13,44 | 12,99 | 12,58 | 11,70 | 10,65 |
| T2 | 18,15 | 17,53 | 16,98 | 15,79 | 14,37 |
| T3 | 21,51 | 20,78 | 20,13 | 18,72 | 17,03 |
| T4 | 24,20 | 23,38 | 22,64 | 21,06 | 19,16 |

---

## Correcciones vs datos previos

| Campo | Dato previo (incorrecto) | Dato correcto | Fuente |
|-------|--------------------------|---------------|--------|
| IT días sin complemento empresa | 3 días (Gr.III/IV) | **7 días** | Art. 49 |
| COP N5-6 suplemento INT | 33,45€ (como N1-4) | **13,38€** | Anexo I |
| COP N5-6 pernocta INT | 61,33€ (como N1-4) | **35,68€** | Anexo I |
| TCP T-R tariffs | no documentadas | ver tabla arriba | Anexo I |
| DPO SCC ≥75% | no especificado | 2.500€ | Art. 48 |

---

## Pendientes de validación

| ID | Tema | Qué falta |
|----|------|-----------|
| `hv_tr_festivos` | Interacción multiplicador 1,5 festivos + tarifa T-R en TCP | Contrastar con nóminas |
| `dpo_pct_concesion` | Porcentaje real de concesión del DPO en 2026 | Pendiente de publicación de objetivos |
| `billetes_condiciones` | Tipos de billetes, prioridades, acompañantes | Normativa interna empresa |
| `uniformidad_tcp_colores` | ¿Diferencia dotación inicial masculino/femenino? | Normativa interna empresa |
| `it_dias_ss_calculo` | Cómo calcula la SS exactamente en los 7 días sin complemento | Verificar con nóminas |
