/**
 * convenioKnowledge.js — Base de conocimiento laboral BCSA 2026
 *
 * Fuente: BOE-A-2026-6389 (convenio colectivo Binter Canarias, vigencia 2026-2031)
 *
 * Este módulo contiene conocimiento práctico para tripulaciones.
 * NO es el motor de cálculo. NO expone internals de payrollEngine.
 * Es la fuente de FAQs, reglas, herramientas de simulación y asistentes.
 *
 * Arquitectura:
 *   CREW_SECTIONS   — 7 secciones navegables por el tripulante
 *   CREW_KNOWLEDGE  — reglas y respuestas prácticas
 *   CREW_FAQS       — preguntas frecuentes directas
 *   KnowledgeEngine — API de consulta
 */

'use strict';

// ── Secciones de navegación ──────────────────────────────────────────────────

var CREW_SECTIONS = [
  {
    id: 'nomina',
    label: 'Nómina y variables',
    desc: 'Horas de vuelo, tramos, imaginarias, francos, libres volados, dietas y más.',
  },
  {
    id: 'bajas',
    label: 'Cuando no vuelo',
    desc: 'Incapacidad temporal, qué cobra la empresa, qué pierde el tripulante.',
  },
  {
    id: 'vacaciones',
    label: 'Vacaciones y descansos',
    desc: 'Duración, fraccionamiento, media de variables, sistema de puntos.',
  },
  {
    id: 'permisos',
    label: 'Mis permisos',
    desc: 'Licencias retribuidas y no retribuidas, consultas médicas, excedencias.',
  },
  {
    id: 'dias_libres',
    label: 'Días libres y actividad',
    desc: 'Los 99 días libres, ROFF, FNA, francos, programación máximos.',
  },
  {
    id: 'beneficios',
    label: 'Mis beneficios',
    desc: 'Seguros, plan de pensiones, billetes, uniformidad.',
  },
  {
    id: 'situaciones',
    label: 'Situaciones especiales',
    desc: 'Cese temporal, regresión, destacamento, suspensión de actividad.',
  },
];

// ── Tipos de fuente ──────────────────────────────────────────────────────────
// 'convenio'        → texto literal del BCSA 2026
// 'practica_empresa'→ práctica de Binter no recogida literalmente en el convenio
// 'interpretacion'  → interpretación, puede variar
// 'pendiente'       → pendiente de contrastar con nóminas reales

// ── Conocimiento práctico ────────────────────────────────────────────────────

var CREW_KNOWLEDGE = [

  // ── SECCIÓN: NÓMINA Y VARIABLES ──────────────────────────────────────────

  {
    id: 'hv_tramos',
    section: 'nomina',
    titulo: 'Tramos de horas de vuelo',
    pregunta: '¿Cómo funcionan los tramos de horas de vuelo?',
    respuesta: 'Las horas de vuelo se acumulan mes a mes y se cobran en tramos progresivos: cuantas más horas, más alta es la tarifa de cada hora adicional. El sistema tiene cuatro tramos: T1 (horas 60–70), T2 (70–80), T3 (80–90) y T4 (a partir de la hora 90). Los tramos se calculan para un mes de referencia de 30 días, y se reducen proporcionalmente si hay vacaciones, IT u otras situaciones previstas en el convenio.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 (Gr.III) / Art. 47 (Gr.IV)', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Las imaginarias, francos, uprouting y split duty generan "unidades de HV" que se acumulan en este mismo contador.',
    relacionados: ['hv_nocturnas', 'hv_festivos', 'imaginaria', 'franco', 'uprouting', 'split_duty'],
    faq_ids: ['faq_hv_tramos'],
  },

  {
    id: 'hv_nocturnas',
    section: 'nomina',
    titulo: 'Horas nocturnas',
    pregunta: '¿Qué son las horas nocturnas y cómo se pagan?',
    respuesta: 'Las horas de vuelo generadas en sectores que invadan la franja horaria 01:00–04:59 LT se multiplican por 1,5 a efectos del cómputo de HV. Este multiplicador es la propia compensación — no genera ningún otro concepto adicional.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 / Art. 47', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'La hora nocturna queda compensada con el coeficiente 1,5. Un sector de 1h que termina a las 04:00 LT computa como 1,5 unidades de HV.',
    relacionados: ['hv_tramos', 'hv_festivos'],
    faq_ids: [],
  },

  {
    id: 'hv_festivos',
    section: 'nomina',
    titulo: 'Festivos especiales — coeficiente 1,5',
    pregunta: '¿Qué días festivos tienen coeficiente especial?',
    respuesta: 'Las horas de vuelo generadas los días 25 de diciembre, 1 de enero y 6 de enero se multiplican por 1,5. Solo estos tres días tienen este tratamiento; el resto de festivos no.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 50', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Para TCP: pendiente confirmar cómo interactúa el coeficiente 1,5 festivo con la tarifa T-R (días de especial relevancia). Son dos mecanismos distintos que pueden coincidir.',
    relacionados: ['hv_tramos', 'hv_nocturnas'],
    faq_ids: ['faq_festivos_1_5'],
  },

  {
    id: 'imaginaria',
    section: 'nomina',
    titulo: 'Imaginaria',
    pregunta: '¿Cuánto cobra una imaginaria?',
    respuesta: 'Cada imaginaria programada — independientemente de si se activa — genera 3 unidades de la variable Hora de vuelo. Si se activa pero no hay vuelo: además se percibe una dieta nacional. Si el tripulante permanece en la sala de firmas sin vuelo asignado: 1 HV adicional por cada 2 horas en sala.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 (Gr.III) / Art. 47 (Gr.IV)', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'La imaginaria FNA solicitada por el propio tripulante (ROFF) no genera la variable. La FNA solicitada por la empresa sí la genera.',
    relacionados: ['hv_tramos', 'franco', 'fna'],
    faq_ids: ['faq_imaginaria'],
  },

  {
    id: 'franco',
    section: 'nomina',
    titulo: 'Franco de servicio',
    pregunta: '¿Qué genera un franco de servicio?',
    respuesta: 'Cada franco programado genera 2 unidades de la variable Hora de vuelo. Si durante el día del franco la empresa requiere al tripulante de forma imprevista, el franco pasa a ser "libre volado" (aceptación voluntaria) y en ese caso NO genera la variable de franco.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 (Gr.III) / Art. 47 (Gr.IV)', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'FNA por ROFF no genera variable. FNA a solicitud empresa sí genera.',
    relacionados: ['imaginaria', 'libre_volado', 'fna'],
    faq_ids: [],
  },

  {
    id: 'libre_volado',
    section: 'nomina',
    titulo: 'Libre volado',
    pregunta: '¿Qué es un libre volado y cuánto se cobra?',
    respuesta: 'Un libre volado es la compensación por trabajar en un día que estaba programado como libre, de forma voluntaria. Se clasifica en tres categorías según la antelación con que la empresa lo solicita. Cada categoría tiene un importe fijo según función y nivel.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 (Gr.III) / Art. 47 (Gr.IV) + Anexo I', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Para TCP el convenio especifica explícitamente "de forma voluntaria". Para Gr.IV la aceptación también es voluntaria en la práctica. La empresa asigna por sistema de puntos.',
    tabla: {
      tipo: 'libre_volado',
      grupos: {
        TCP: {
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5'],
          categorias: {
            'menos_24h': [225, 200, 175, 150, 125],
            'entre_24_72h': [135, 110, 95, 80, 65],
            'mas_72h': [90, 80, 70, 60, 50],
          },
        },
        COP: {
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
          categorias: {
            'menos_24h': [475, 450, 425, 400, 375, 350],
            'entre_24_72h': [350, 325, 300, 275, 250, 225],
            'mas_72h': [225, 200, 175, 150, 125, 100],
          },
        },
        CMD: {
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
          categorias: {
            'menos_24h': [750, 700, 650, 600, 550, 500],
            'entre_24_72h': [500, 475, 450, 425, 400, 375],
            'mas_72h': [375, 350, 325, 300, 275, 250],
          },
        },
      },
    },
    relacionados: ['franco', 'imaginaria'],
    faq_ids: ['faq_libre_volado'],
  },

  {
    id: 'uprouting',
    section: 'nomina',
    titulo: 'Uprouting',
    pregunta: '¿Qué es el uprouting y cómo se paga?',
    respuesta: 'El uprouting se produce cuando, habiendo completado los saltos programados, el tripulante realiza horas de bloque adicionales y termina su actividad después de la hora de firma original. Por cada hora de bloque adicional genera 1,5 unidades de HV.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 / Art. 47', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['hv_tramos', 'split_duty'],
    faq_ids: [],
  },

  {
    id: 'split_duty',
    section: 'nomina',
    titulo: 'Split duty / escala programada',
    pregunta: '¿Cuánto genera una escala larga (split duty)?',
    respuesta: 'Por cada escala programada superior a 2,5 horas: 1 unidad de HV. Por cada escala superior a 5 horas: 2 unidades de HV. Solo se aplica a escalas "programadas" — no a cualquier espera operativa.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 / Art. 47', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['hv_tramos', 'uprouting'],
    faq_ids: [],
  },

  {
    id: 'media_variables',
    section: 'nomina',
    titulo: 'Media de variables en vacaciones',
    pregunta: '¿Qué es la media de variables y cuándo se cobra?',
    respuesta: 'Durante las vacaciones no se generan variables (no hay vuelos), pero el convenio reconoce una "media de variables": el promedio de todas las variables de los últimos 12 meses, dividido entre 30, multiplicado por los días de vacaciones disfrutados. Se paga en la nómina del mes SIGUIENTE al disfrute.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 / Art. 47', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Si se cogen 15 días de vacaciones en julio, la media de variables aparece en agosto. Si las vacaciones están fraccionadas en varios periodos, la media se paga el mes siguiente a cada fracción.',
    relacionados: ['hv_tramos', 'vacaciones_duracion'],
    faq_ids: ['faq_media_variables'],
  },

  {
    id: 'dpo',
    section: 'nomina',
    titulo: 'Incentivo por objetivos (DPO)',
    pregunta: '¿En qué consiste el incentivo por objetivos?',
    respuesta: 'Es un incentivo económico anual bruto, proporcional al tiempo efectivo de trabajo. Su concesión oscila entre 0% y 130% según el grado de cumplimiento de objetivos fijados por la Dirección. Los objetivos deben ser comunicados previamente al personal.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC'],
    fuente: { articulo: 'Art. 48', tipo: 'convenio' },
    calculable: false,
    normativa_interna: true,
    pendiente_validacion: false,
    notas: 'El importe base es: CMD 10.000€, COP N1-4 2.500€, COP N5-6 1.500€, SCC (≥75% función) 2.500€, TCP 1.500€. El porcentaje real de concesión depende de los objetivos definidos.',
    tabla: {
      tipo: 'dpo_importes',
      datos: [
        { funcion: 'CMD', importe_base: 10000 },
        { funcion: 'COP N1-4', importe_base: 2500 },
        { funcion: 'COP N5-6', importe_base: 1500 },
        { funcion: 'SCC (≥75%)', importe_base: 2500 },
        { funcion: 'TCP', importe_base: 1500 },
      ],
    },
    relacionados: [],
    faq_ids: ['faq_dpo'],
  },

  {
    id: 'plus_sobrecargo',
    section: 'nomina',
    titulo: 'Plus de sobrecargo',
    pregunta: '¿Cuándo y cuánto cobra el plus de sobrecargo un TCP?',
    respuesta: 'El plus de sobrecargo se genera por cada período de actividad de vuelo en que un TCP ejerce la función de Sobrecargo (SCC). Si el TCP ejerce como SCC en el 75% o más de su actividad mensual, el resto de días de vuelo del mes también se abonan con la tarifa de sobrecargo.',
    grupos: ['SCC', 'TCP'],
    fuente: { articulo: 'Art. 46', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    tabla: {
      tipo: 'plus_sobrecargo',
      niveles: ['N1', 'N2', 'N3', 'N4', 'N5'],
      importes_por_actividad: [20.80, 19.50, 17.17, 14.27, 10.93],
    },
    relacionados: ['dpo'],
    faq_ids: [],
  },

  {
    id: 'dietas_vuelo',
    section: 'nomina',
    titulo: 'Dietas de vuelo',
    pregunta: '¿Cómo funcionan las dietas de vuelo?',
    respuesta: 'Se genera una dieta de vuelo por cada período de actividad (vuelo realizado o cancelado después de la firma). Las dietas son compensaciones de manutención — incluyen desayuno, almuerzo y cena del día de trabajo efectivo. Hay cuatro conceptos: dieta nacional, suplemento internacional, suplemento pernocta nacional y suplemento pernocta internacional.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 / Art. 47 + Anexo I', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Importante: COP N5-6 tiene suplemento INT y pernocta INT significativamente inferiores al resto de COP. No es un error — está así en el Anexo I del convenio.',
    tabla: {
      tipo: 'dietas_vuelo',
      datos: {
        TCP: {
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5'],
          dieta_nac: [26.50, 22.70, 21.13, 16.07, 11.45],
          supl_int: [4.80, 4.40, 4.25, 3.86, 3.29],
          supl_pernocta_nac: [17.86, 17.86, 17.86, 17.86, 17.86],
          supl_pernocta_int: [34.67, 34.67, 34.67, 34.67, 34.67],
        },
        COP: {
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
          dieta_nac: [40.14, 40.14, 40.14, 40.14, 40.14, 40.14],
          supl_int: [33.45, 33.45, 33.45, 33.45, 13.38, 13.38],
          supl_pernocta_nac: [18.96, 18.96, 18.96, 18.96, 18.96, 18.96],
          supl_pernocta_int: [61.33, 61.33, 61.33, 61.33, 35.68, 35.68],
        },
        CMD: {
          niveles: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'],
          dieta_nac: [40.14, 40.14, 40.14, 40.14, 40.14, 40.14],
          supl_int: [33.45, 33.45, 33.45, 33.45, 33.45, 33.45],
          supl_pernocta_nac: [18.96, 18.96, 18.96, 18.96, 18.96, 18.96],
          supl_pernocta_int: [61.33, 61.33, 61.33, 61.33, 61.33, 61.33],
        },
      },
    },
    relacionados: ['imaginaria'],
    faq_ids: ['faq_dietas_cop_n5n6'],
  },

  // ── SECCIÓN: CUANDO NO VUELO (IT / BAJAS) ────────────────────────────────

  {
    id: 'it_7_dias',
    section: 'bajas',
    titulo: 'Los 7 días sin complemento de empresa',
    pregunta: '¿Qué pasa económicamente los primeros días de baja?',
    respuesta: 'Para los Grupos III y IV (tripulaciones), la empresa no complementa los 7 primeros días de baja por enfermedad común o accidente no laboral. Durante esos 7 días solo se percibe la prestación de la Seguridad Social. A partir del día 8, la empresa complementa hasta el 100% de los conceptos retributivos fijos (salario base + extras) durante hasta 6 meses.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 49', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Las variables (HV, imaginarias, francos, dietas, etc.) nunca se complementan durante una baja — solo los conceptos fijos. Accidente laboral/enfermedad profesional: el complemento aplica desde el día 1 sin período de carencia.',
    relacionados: ['it_accidente_laboral', 'it_enfermedad_comun'],
    faq_ids: ['faq_it_dias'],
  },

  {
    id: 'it_accidente_laboral',
    section: 'bajas',
    titulo: 'Accidente de trabajo o enfermedad profesional',
    pregunta: '¿Qué cobra si la baja es por accidente laboral?',
    respuesta: 'En caso de accidente de trabajo o enfermedad profesional, la empresa complementa desde el primer día hasta el 100% de los conceptos retributivos fijos. No existe el período de carencia de 7 días. El complemento se extiende sin límite temporal explícito en el artículo.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 49', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['it_7_dias', 'it_enfermedad_comun'],
    faq_ids: [],
  },

  {
    id: 'it_enfermedad_comun',
    section: 'bajas',
    titulo: 'Baja por enfermedad común — condiciones del complemento',
    pregunta: '¿Bajo qué condiciones la empresa complementa la baja?',
    respuesta: 'La empresa complementa hasta el 100% de conceptos fijos durante un máximo de 6 meses, con estas condiciones: (1) No haber acumulado más de 2 bajas en los 3 meses anteriores. (2) Acudir a las citas de control del servicio médico de la empresa — si no se acude sin justificación, la empresa puede dejar de abonar el complemento. Si el médico de empresa considera la enfermedad grave, el complemento puede mantenerse aunque se supere el criterio de acumulación.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 49', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['it_7_dias'],
    faq_ids: [],
  },

  {
    id: 'it_en_vacaciones',
    section: 'bajas',
    titulo: 'Baja durante las vacaciones',
    pregunta: '¿Qué pasa si caigo de baja durante las vacaciones?',
    respuesta: 'Si caes de baja durante tus vacaciones: tienes 24 horas para comunicarlo a la empresa. Los días de vacaciones que no has podido disfrutar se recuperan después, cuando las necesidades del servicio lo permitan. Necesitas aportar documento oficial de baja. Si la IT es por embarazo, parto o lactancia: puedes disfrutar las vacaciones al terminar la suspensión, aunque haya pasado el año natural. Para otras IT: tienes hasta 18 meses desde el final del año en que se originaron para recuperar los días.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 41', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['vacaciones_duracion', 'it_7_dias'],
    faq_ids: ['faq_it_vacaciones'],
  },

  // ── SECCIÓN: VACACIONES Y DESCANSOS ─────────────────────────────────────

  {
    id: 'vacaciones_duracion',
    section: 'vacaciones',
    titulo: 'Duración y fraccionamiento',
    pregunta: '¿Cuántos días de vacaciones tengo y puedo dividirlos?',
    respuesta: '30 días naturales de vacaciones anuales para Grupos III y IV. Pueden fraccionarse en hasta 4 periodos. Hasta 4 de esos días pueden reservarse como "días personales" (con preaviso mínimo de 45 días). Las vacaciones deben disfrutarse antes del 31 de enero del año siguiente. Si hay días pendientes del año anterior en enero, tienen prioridad sobre las del año en curso.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 41', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['vacaciones_puntos', 'media_variables', 'it_en_vacaciones'],
    faq_ids: [],
  },

  {
    id: 'vacaciones_puntos',
    section: 'vacaciones',
    titulo: 'Sistema de puntos para elección de vacaciones',
    pregunta: '¿Cómo se decide quién elige las vacaciones primero?',
    respuesta: 'Mediante un sistema de puntos acumulativos. Por cada día de vacaciones disfrutado se asignan los puntos que corresponden según el mes. El año siguiente, quien menos puntos acumule, elige primero. Los puntos se suman cada año: coger siempre agosto o julio incrementa la puntuación y "empeora" la posición en años sucesivos.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 41', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Personal nuevo: se le asigna la puntuación máxima existente más 20 puntos adicionales. Empate → desempata antigüedad administrativa.',
    tabla: {
      tipo: 'puntos_vacaciones',
      datos: [
        { mes: 'Enero (1.ª semana)', puntos: 10 },
        { mes: 'Enero (resto)', puntos: 0 },
        { mes: 'Febrero', puntos: 0 },
        { mes: 'Marzo', puntos: 2 },
        { mes: 'Abril', puntos: 4 },
        { mes: 'Mayo', puntos: 5 },
        { mes: 'Junio', puntos: 7 },
        { mes: 'Julio', puntos: 11 },
        { mes: 'Agosto', puntos: 12 },
        { mes: 'Septiembre 1.ª quincena', puntos: 10 },
        { mes: 'Septiembre 2.ª quincena', puntos: 9 },
        { mes: 'Octubre', puntos: 6 },
        { mes: 'Noviembre', puntos: 0 },
        { mes: 'Diciembre 1.ª quincena', puntos: 3 },
        { mes: 'Diciembre 2.ª quincena', puntos: 8 },
        { mes: 'Semana Santa (todos los días)', puntos: 8 },
        { mes: 'Puentes del año', puntos: 2, nota: 'adicionales al mes' },
      ],
    },
    relacionados: ['vacaciones_duracion', 'navidades'],
    faq_ids: [],
  },

  {
    id: 'navidades',
    section: 'vacaciones',
    titulo: 'Navidades — periodos preferentes',
    pregunta: '¿Cómo funciona la elección de vacaciones en navidades?',
    respuesta: 'Cada tripulante elige 2 periodos navideños como preferentes para librar. La empresa garantiza que al menos 1 de los 2 elegidos será concedido. Los tres periodos son: 24/25 de diciembre, 31 de diciembre / 1 de enero, y 5/6 de enero. Si hay exceso de solicitudes para un mismo periodo: se realiza sorteo. El que le toca actividad de vuelo no puede volver a repetirle hasta que todos hayan tenido al menos una.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 81', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'En empate de puntuación: se usa el sistema de puntos de vacaciones. Normativa interna del operador regula los detalles del proceso.',
    relacionados: ['vacaciones_puntos'],
    faq_ids: [],
  },

  // ── SECCIÓN: MIS PERMISOS ────────────────────────────────────────────────

  {
    id: 'licencia_no_retribuida',
    section: 'permisos',
    titulo: 'Licencia no retribuida',
    pregunta: '¿Cómo solicito una licencia sin sueldo?',
    respuesta: 'La petición debe presentarse con al menos 45 días de antelación al inicio del mes en que se quiera disfrutar, con acuse de recibo. El límite es 1 persona por cada 40 del grupo laboral de forma simultánea. Las vacaciones reglamentarias tienen preferencia. Si la empresa no responde, la licencia se entiende concedida 15 días antes del inicio. El orden de concesión es por fecha de petición; en empate, por antigüedad.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 39', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Los tramos de HV se reducen proporcionalmente durante licencias no retribuidas (igual que en vacaciones).',
    relacionados: ['vacaciones_duracion'],
    faq_ids: [],
  },

  {
    id: 'permiso_medico',
    section: 'permisos',
    titulo: 'Consultas médicas (Gr.III/IV)',
    pregunta: '¿Cómo gestiono una cita médica si soy tripulación?',
    respuesta: 'La empresa facilita los días libres de los 99 anuales para consultas médicas propias o de hijos. No computan como ROFF (no suman puntos en el sistema de solicitud de libres). Si la solicitud llega con 15 días de antelación a la publicación de programación, se entiende concedida salvo problemas de cobertura operativa. Requiere justificante médico antes de reincorporarse.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 42', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'La negativa de la empresa debe ser justificada y comunicable al Comité de Empresa.',
    relacionados: ['dias_libres_99', 'roff'],
    faq_ids: [],
  },

  {
    id: 'reduccion_jornada',
    section: 'permisos',
    titulo: 'Reducción de jornada por guarda legal',
    pregunta: '¿Cómo funciona la reducción de jornada para tripulaciones?',
    respuesta: 'Para Grupos III y IV, la reducción de jornada se materializa en días libres adicionales agrupados en un bloque mensual, proporcionales al porcentaje de reducción. Los tramos de HV se reducen en la misma proporción. Hay restricciones de programación en diciembre-enero y julio-agosto para evitar que la misma persona coincida en los periodos de mayor valoración.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 40', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Petición con mínimo 2 meses de antelación. Si hay conflicto entre solicitudes: sistema de puntos similar al de vacaciones.',
    relacionados: ['hv_tramos', 'vacaciones_puntos'],
    faq_ids: [],
  },

  // ── SECCIÓN: DÍAS LIBRES Y ACTIVIDAD ────────────────────────────────────

  {
    id: 'dias_libres_99',
    section: 'dias_libres',
    titulo: 'Los 99 días libres anuales',
    pregunta: '¿Cuántos días libres tengo al año?',
    respuesta: '99 días libres al año incluyendo todos los festivos oficiales (nacionales, regionales y locales). El mínimo es 9 días libres por mes de actividad. Los días libres absorben los festivos — no se computan aparte. Esta cifra puede modificarse con un acuerdo de programación con patrón fijo (roster).',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 80', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['roff', 'franco', 'libre_volado'],
    faq_ids: [],
  },

  {
    id: 'roff',
    section: 'dias_libres',
    titulo: 'ROFF — libre solicitado',
    pregunta: '¿Qué es el ROFF y cómo se solicita?',
    respuesta: 'El ROFF es un libre solicitado por el propio tripulante. La petición debe enviarse al Departamento de Programación antes del día 24 del mes anterior a la publicación. Aparece como ROFF en la programación. La empresa no puede denegarlo sin razones reales y justificadas. Más de 2 ROFF en un mismo mes puede dificultar a Programación cumplir otras protecciones del convenio (como el máximo de 5 días seguidos de actividad).',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 80', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Los libres ROFF no son gratuitos en términos de programación: al solicitar más de 2, la empresa no garantiza las mismas protecciones.',
    relacionados: ['dias_libres_99', 'fna', 'imaginaria'],
    faq_ids: [],
  },

  {
    id: 'fna',
    section: 'dias_libres',
    titulo: 'FNA — franco no activable',
    pregunta: '¿La diferencia entre FNA por ROFF y FNA por empresa?',
    respuesta: 'Un franco no activable (FNA) significa que el tripulante está programado en franco pero no puede ser requerido para volar. La diferencia clave: si el FNA es a solicitud del propio tripulante (ROFF), no genera la variable de franco (2 unidades de HV). Si el FNA es a solicitud de la empresa, sí genera la variable de franco.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 46 / Art. 47', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['franco', 'roff'],
    faq_ids: [],
  },

  {
    id: 'max_dias_consecutivos',
    section: 'dias_libres',
    titulo: 'Máximo de días seguidos de actividad',
    pregunta: '¿Cuántos días seguidos me pueden programar trabajando?',
    respuesta: 'La regla general es un máximo de 5 días consecutivos de actividad. No deben programarse 6 o más seguidos salvo pacto. Si por necesidades del servicio se superan los 5, debe ser justificado y notificado al Comité de Empresa. Los bloques de 5 días deberían ir precedidos o seguidos de 2 días libres cuando sea posible. Los días de Comité de Empresa cuentan como actividad a estos efectos.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 81', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['roff', 'dias_libres_99'],
    faq_ids: [],
  },

  // ── SECCIÓN: MIS BENEFICIOS ─────────────────────────────────────────────

  {
    id: 'seguro_vida',
    section: 'beneficios',
    titulo: 'Seguro de vida',
    pregunta: '¿Qué seguro de vida tiene la empresa?',
    respuesta: 'Binter mantiene un seguro de vida colectivo pagado íntegramente por la empresa para todo el personal. Capital asegurado: 75.126€ por trabajador en caso de fallecimiento, gran incapacidad, Incapacidad Permanente Absoluta (IPA) o Incapacidad Permanente Total (IPT).',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 51', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'No aplica en situaciones de incapacidad con reserva de puesto de trabajo ni en reubicaciones del art. 49.1.n ET.',
    relacionados: ['seguro_medico', 'seguro_licencia'],
    faq_ids: [],
  },

  {
    id: 'seguro_medico',
    section: 'beneficios',
    titulo: 'Seguro médico privado',
    pregunta: '¿Tengo seguro médico privado? ¿Qué paga la empresa?',
    respuesta: 'Sí, para trabajadores con más de 6 meses de antigüedad. La empresa paga el 50% de la prima y el trabajador el otro 50% (descontado de nómina). Alternativa: si ya tienes una póliza médica propia, puedes optar por que la empresa te abone directamente su parte (50%) en nómina, justificando el pago de tu póliza.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 52', tipo: 'convenio' },
    calculable: false,
    normativa_interna: true,
    pendiente_validacion: false,
    notas: 'El importe exacto depende de la póliza contratada por la empresa, que puede variar.',
    relacionados: ['seguro_vida', 'seguro_licencia'],
    faq_ids: [],
  },

  {
    id: 'seguro_licencia',
    section: 'beneficios',
    titulo: 'Seguro de pérdida de licencia',
    pregunta: '¿Qué es el seguro de pérdida de licencia? ¿Lo tengo?',
    respuesta: 'Solo para pilotos (Grupo IV) con más de 6 meses de antigüedad. La empresa suscribe un seguro colectivo de pérdida de licencia: 50% empresa / 50% piloto. Si ya tienes un seguro privado de pérdida de licencia, la empresa puede abonar el 50% de ese seguro, con el tope de lo que hubiera pagado en el colectivo.',
    grupos: ['CMD', 'COP'],
    fuente: { articulo: 'Art. 53', tipo: 'convenio' },
    calculable: false,
    normativa_interna: true,
    pendiente_validacion: false,
    notas: 'Los TCP (Grupo III) no tienen este beneficio.',
    relacionados: ['seguro_vida', 'seguro_medico', 'cese_temporal_vuelo'],
    faq_ids: [],
  },

  {
    id: 'plan_pensiones',
    section: 'beneficios',
    titulo: 'Plan de pensiones',
    pregunta: '¿Cuándo puedo acceder al plan de pensiones?',
    respuesta: 'Con 1 año de antigüedad en la empresa y adhesión voluntaria al Plan de Pensiones de Empresas Vinculadas del Sistema Binter. Las cuantías de aportación están en el Reglamento del Plan.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 54', tipo: 'convenio' },
    calculable: false,
    normativa_interna: true,
    pendiente_validacion: false,
    notas: null,
    relacionados: [],
    faq_ids: [],
  },

  {
    id: 'uniformidad_tcp',
    section: 'beneficios',
    titulo: 'Uniformidad TCP',
    pregunta: '¿Cómo funciona la uniformidad para TCP?',
    respuesta: 'Al ingreso se recibe una dotación inicial de prendas (listada en el convenio). La renovación es "por deterioro" — no hay sistema de puntos. Las prendas deterioradas por mal uso o lavado incorrecto son a cargo del TCP. Si la empresa modifica el uniforme, debe comunicarlo previamente a los representantes.',
    grupos: ['TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 92 + tabla Anexo', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    tabla: {
      tipo: 'dotacion_tcp',
      prendas: [
        { nombre: 'Vestido manga larga/corta o camisa y pantalón', cantidad: 5 },
        { nombre: 'Chaqueta bienvenida', cantidad: 1 },
        { nombre: 'Corbata', cantidad: 2 },
        { nombre: 'Chaqueta a bordo', cantidad: 1 },
        { nombre: 'Abrigo', cantidad: 1 },
        { nombre: 'Chaleco rojo', cantidad: 1 },
        { nombre: 'Tocado', cantidad: 1 },
        { nombre: 'Delantal', cantidad: 1 },
        { nombre: 'Bolso', cantidad: 1 },
        { nombre: 'Trolley Samsonite', cantidad: 1 },
        { nombre: 'Nevera portalimentos', cantidad: 1 },
        { nombre: 'Placas identificativas', cantidad: 4 },
        { nombre: 'Pañuelo celeste', cantidad: 2 },
        { nombre: 'Pañuelo azul', cantidad: 2 },
        { nombre: 'Guantes', cantidad: 1 },
        { nombre: 'Medias 20 DEN', cantidad: 6 },
        { nombre: 'Medias 40 DEN', cantidad: null },
        { nombre: 'Zapatos', cantidad: 2 },
        { nombre: 'Vestido de verano', cantidad: 3 },
      ],
    },
    relacionados: ['uniformidad_pilotos'],
    faq_ids: [],
  },

  {
    id: 'uniformidad_pilotos',
    section: 'beneficios',
    titulo: 'Uniformidad pilotos — sistema de puntos',
    pregunta: '¿Cómo funciona el sistema de puntos de uniformidad?',
    respuesta: 'Los pilotos renuevan la uniformidad mediante un sistema de puntos con un ciclo de 3 renovaciones anuales que luego se reinicia. Cada prenda tiene un coste en puntos. El límite de puntos varía por ciclo: 66 en la 1.ª renovación, 98 en la 2.ª y 120 en la 3.ª. Lo que supere el límite es a cargo del piloto.',
    grupos: ['CMD', 'COP'],
    fuente: { articulo: 'Art. 93 + tabla Anexo', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    tabla: {
      tipo: 'puntos_uniformidad',
      ciclos: [
        { renovacion: 1, limite: 66 },
        { renovacion: 2, limite: 98 },
        { renovacion: 3, limite: 120 },
      ],
      prendas: [
        { nombre: 'Traje piloto (verano o invierno)', puntos: 50 },
        { nombre: 'Camisa manga corta', puntos: 7 },
        { nombre: 'Camisa manga larga', puntos: 7 },
        { nombre: 'Galón 4 barras + estrella', puntos: 5 },
        { nombre: 'Galón 3 barras', puntos: 5 },
        { nombre: 'Corbata', puntos: 5 },
        { nombre: 'Zapatos (par)', puntos: 15 },
        { nombre: 'Chaleco', puntos: 10 },
        { nombre: 'Cardigan', puntos: 15 },
        { nombre: 'Chaleco Piumino ligero marino', puntos: 15 },
        { nombre: 'Cinturón', puntos: 5 },
        { nombre: 'Calcetines (pack de 3)', puntos: 2 },
        { nombre: 'Nevera portalimentos', puntos: 3 },
        { nombre: 'Piloto Samsonite / Messenger Samsonite', puntos: 20 },
        { nombre: 'Trolley cabina rígido / Trolley mediano rígido', puntos: 20 },
      ],
    },
    relacionados: ['uniformidad_tcp'],
    faq_ids: ['faq_uniformidad_pilotos'],
  },

  // ── SECCIÓN: SITUACIONES ESPECIALES ─────────────────────────────────────

  {
    id: 'cese_temporal_vuelo',
    section: 'situaciones',
    titulo: 'Cese temporal en vuelo',
    pregunta: '¿Qué pasa si pierdo temporalmente la licencia?',
    respuesta: 'Si el cese temporal es por pérdida temporal de licencia, alteraciones psicofísicas que impidan volar (sin baja SS), o pérdida temporal de licencia por gestación: mientras el contrato no esté suspendido, el tripulante percibe únicamente los conceptos retributivos fijos.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC'],
    fuente: { articulo: 'Art. 88', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: 'Para la pérdida de licencia por gestación, la empresa puede solicitar la suspensión del contrato con reserva de puesto.',
    relacionados: ['seguro_licencia', 'regresion_cmd'],
    faq_ids: [],
  },

  {
    id: 'regresion_cmd',
    section: 'situaciones',
    titulo: 'Regresión de Comandante a Copiloto',
    pregunta: '¿Qué retribución tengo si bajo de CMD a COP?',
    respuesta: 'Si la empresa revoca la función de Comandante (pérdida de confianza o razones técnicas/comerciales/laborales), el piloto vuelve a funciones de COP con la retribución del nivel de COP en el que estaba antes de ser nombrado CMD. Los complementos de comandante cesan de inmediato. La regresión voluntaria también es posible si hay vacante y se superan las pruebas.',
    grupos: ['CMD'],
    fuente: { articulo: 'Art. 74 / Art. 70', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['cese_temporal_vuelo'],
    faq_ids: [],
  },

  {
    id: 'regresion_scc',
    section: 'situaciones',
    titulo: 'Regresión de Sobrecargo a TCP',
    pregunta: '¿Qué pasa económicamente si el SCC vuelve a ser TCP?',
    respuesta: 'Si la empresa revoca la función de Sobrecargo (cargo de confianza), el TCP vuelve a funciones de TCP con pérdida de todos los complementos retributivos de sobrecargo. La regresión voluntaria también es posible si hay vacante.',
    grupos: ['SCC'],
    fuente: { articulo: 'Art. 74 / Art. 71', tipo: 'convenio' },
    calculable: false,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    relacionados: ['plus_sobrecargo', 'dpo'],
    faq_ids: [],
  },

  {
    id: 'destacamento',
    section: 'situaciones',
    titulo: 'Destacamento',
    pregunta: '¿Qué es un destacamento y qué cobra el tripulante?',
    respuesta: 'Se produce destacamento cuando el tripulante disfruta sus días libres mínimos mensuales fuera de su base. Hay destacamento voluntario (el tripulante lo solicita) y forzoso (la empresa lo designa). En ambos casos se percibe una variable "Destacamento" además de todos los conceptos normales. La diferencia: voluntario → variable por cada día destacado fuera de base; forzoso → variable por cada día libre disfrutado fuera de base.',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    fuente: { articulo: 'Art. 84', tipo: 'convenio' },
    calculable: true,
    normativa_interna: false,
    pendiente_validacion: false,
    notas: null,
    tabla: {
      tipo: 'destacamento',
      datos: {
        TCP: { nac: 20.07, int: 28.89 },
        COP_N1_4: { nac: 29.59, int: 34.67 },
        COP_N5_6: { nac: 28.43, int: 31.78 },
        CMD: { nac: 44.65, int: 44.65 },
      },
    },
    relacionados: [],
    faq_ids: [],
  },

];

// ── FAQs directas ────────────────────────────────────────────────────────────

var CREW_FAQS = [

  {
    id: 'faq_it_dias',
    pregunta: '¿Qué pierdo económicamente si estoy de baja?',
    respuesta: 'Los primeros 7 días de baja por enfermedad común, la empresa (Grupos III y IV) no complementa nada: solo cobras la prestación de la Seguridad Social. A partir del día 8, la empresa complementa hasta el 100% de tu salario fijo durante hasta 6 meses. Las variables (HV, dietas, imaginarias...) no se compensan nunca durante una baja.',
    fuente: 'Art. 49 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['it_7_dias'],
  },

  {
    id: 'faq_it_vacaciones',
    pregunta: '¿Pierdo los días de vacaciones si caigo de baja durante ellas?',
    respuesta: 'No. Si caes de baja durante las vacaciones y lo comunicas en 24 horas, los días de vacaciones que no has podido disfrutar se recuperan cuando el servicio lo permita. Necesitas el documento oficial de baja. Si la baja es por embarazo, parto o lactancia: puedes recuperarlas aunque haya pasado el año natural.',
    fuente: 'Art. 41 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['it_en_vacaciones'],
  },

  {
    id: 'faq_hv_tramos',
    pregunta: '¿Por qué en algunos meses las horas de vuelo parecen cobrar más?',
    respuesta: 'El sistema de tramos hace que cuanto más vueles en un mes, más valen las horas adicionales. Las primeras 60 horas están incluidas en el salario base. A partir de la hora 60 empiezan los tramos T1, T2, T3 y T4 — cada uno con tarifa más alta. Si además tienes horas nocturnas o festivos especiales (25/12, 1/1, 6/1), se multiplican por 1,5.',
    fuente: 'Art. 46/47 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['hv_tramos', 'hv_nocturnas', 'hv_festivos'],
  },

  {
    id: 'faq_festivos_1_5',
    pregunta: '¿Todos los festivos tienen coeficiente 1,5 en las horas de vuelo?',
    respuesta: 'No. Solo los tres festivos especiales: 25 de diciembre, 1 de enero y 6 de enero. El resto de festivos se vuelen como días ordinarios (con la tarifa T-O para TCP o la tarifa normal para pilotos).',
    fuente: 'Art. 50 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['hv_festivos'],
  },

  {
    id: 'faq_imaginaria',
    pregunta: '¿Cobro la imaginaria aunque no me activen?',
    respuesta: 'Sí. Cada imaginaria programada genera 3 unidades de HV independientemente de si se activa o no. Si se activa pero no hay vuelo: además cobras la dieta nacional. Si te activan y estás en sala de firmas sin vuelo asignado: cobras 1 HV adicional por cada 2 horas de espera en sala.',
    fuente: 'Art. 46/47 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['imaginaria'],
  },

  {
    id: 'faq_libre_volado',
    pregunta: '¿Tengo que aceptar un libre volado si la empresa me llama en mi día libre?',
    respuesta: 'Para TCP (Grupo III): el convenio establece explícitamente que la aceptación es voluntaria. Para pilotos (Grupo IV): en la práctica también es voluntario. Nadie puede ser sancionado por no aceptar un libre volado.',
    fuente: 'Art. 46 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['libre_volado'],
  },

  {
    id: 'faq_media_variables',
    pregunta: '¿Cuándo aparece en la nómina la media de variables de las vacaciones?',
    respuesta: 'La media de variables se paga en la nómina del mes SIGUIENTE al disfrute de las vacaciones. Si coges vacaciones en julio, la media aparece en agosto. Si fracionas las vacaciones en varios bloques, cada bloque genera su media de variables en el mes siguiente a ese bloque.',
    fuente: 'Art. 46/47 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC', 'CC'],
    verificada: true,
    concepto_ids: ['media_variables'],
  },

  {
    id: 'faq_dpo',
    pregunta: '¿El incentivo DPO está garantizado?',
    respuesta: 'No. El DPO depende del cumplimiento de objetivos fijados por la Dirección cada año, y puede oscilar entre el 0% y el 130% del importe base. Si los objetivos no han sido definidos y comunicados antes del período, no puede exigirse el cumplimiento. Los importes base son: CMD 10.000€, COP N1-4 2.500€, COP N5-6 1.500€, SCC (≥75%) 2.500€, TCP 1.500€ anuales brutos.',
    fuente: 'Art. 48 BCSA 2026',
    grupos: ['CMD', 'COP', 'TCP', 'SCC'],
    verificada: true,
    concepto_ids: ['dpo'],
  },

  {
    id: 'faq_dietas_cop_n5n6',
    pregunta: '¿Por qué mi suplemento internacional es más bajo que el de otros copilotos?',
    respuesta: 'Los copilotos de niveles 5 y 6 tienen tarifas de dieta internacional inferiores al resto. El suplemento internacional es 13,38€ (vs 33,45€ en N1-4) y el suplemento de pernocta internacional es 35,68€ (vs 61,33€ en N1-4). Esto está así en el Anexo I del convenio — no es un error de nómina.',
    fuente: 'Anexo I BCSA 2026',
    grupos: ['COP'],
    verificada: true,
    concepto_ids: ['dietas_vuelo'],
  },

  {
    id: 'faq_uniformidad_pilotos',
    pregunta: '¿Cómo sé cuántos puntos de uniformidad me quedan?',
    respuesta: 'El sistema funciona por ciclos de 3 renovaciones anuales. En la 1.ª renovación tienes 66 puntos, en la 2.ª 98 puntos, en la 3.ª 120 puntos. Después vuelve a empezar desde 66. Cada prenda tiene un coste fijo en puntos (un traje = 50 pts, zapatos = 15 pts, camisa = 7 pts, etc.). Lo que supere tu límite del ciclo es a tu cargo.',
    fuente: 'Art. 93 + Anexo BCSA 2026',
    grupos: ['CMD', 'COP'],
    verificada: true,
    concepto_ids: ['uniformidad_pilotos'],
  },

];

// ── Motor de consulta ────────────────────────────────────────────────────────

var KnowledgeEngine = (function () {

  function getKnowledge(id) {
    for (var i = 0; i < CREW_KNOWLEDGE.length; i++) {
      if (CREW_KNOWLEDGE[i].id === id) return CREW_KNOWLEDGE[i];
    }
    return null;
  }

  function getBySection(sectionId) {
    return CREW_KNOWLEDGE.filter(function (k) { return k.section === sectionId; });
  }

  function getByGrupo(grupo) {
    return CREW_KNOWLEDGE.filter(function (k) {
      return k.grupos.indexOf(grupo) !== -1;
    });
  }

  function getFAQ(id) {
    for (var i = 0; i < CREW_FAQS.length; i++) {
      if (CREW_FAQS[i].id === id) return CREW_FAQS[i];
    }
    return null;
  }

  function getFAQsByGrupo(grupo) {
    return CREW_FAQS.filter(function (f) {
      return f.grupos.indexOf(grupo) !== -1;
    });
  }

  function getFAQsByConcepto(conceptoId) {
    return CREW_FAQS.filter(function (f) {
      return f.concepto_ids.indexOf(conceptoId) !== -1;
    });
  }

  function search(query) {
    if (!query || query.length < 2) return [];
    var q = query.toLowerCase();
    var results = [];
    var seen = {};

    CREW_KNOWLEDGE.forEach(function (k) {
      if (seen[k.id]) return;
      var match = (
        k.titulo.toLowerCase().indexOf(q) !== -1 ||
        k.pregunta.toLowerCase().indexOf(q) !== -1 ||
        k.respuesta.toLowerCase().indexOf(q) !== -1
      );
      if (match) { results.push({ tipo: 'knowledge', item: k }); seen[k.id] = true; }
    });

    CREW_FAQS.forEach(function (f) {
      if (seen[f.id]) return;
      var match = (
        f.pregunta.toLowerCase().indexOf(q) !== -1 ||
        f.respuesta.toLowerCase().indexOf(q) !== -1
      );
      if (match) { results.push({ tipo: 'faq', item: f }); seen[f.id] = true; }
    });

    return results;
  }

  function getSection(sectionId) {
    for (var i = 0; i < CREW_SECTIONS.length; i++) {
      if (CREW_SECTIONS[i].id === sectionId) return CREW_SECTIONS[i];
    }
    return null;
  }

  function stats() {
    var total = CREW_KNOWLEDGE.length;
    var calculables = CREW_KNOWLEDGE.filter(function (k) { return k.calculable; }).length;
    var pendientes = CREW_KNOWLEDGE.filter(function (k) { return k.pendiente_validacion; }).length;
    return { total: total, calculables: calculables, pendientes: pendientes, faqs: CREW_FAQS.length };
  }

  return {
    getKnowledge: getKnowledge,
    getBySection: getBySection,
    getByGrupo: getByGrupo,
    getFAQ: getFAQ,
    getFAQsByGrupo: getFAQsByGrupo,
    getFAQsByConcepto: getFAQsByConcepto,
    search: search,
    getSection: getSection,
    stats: stats,
    sections: CREW_SECTIONS,
  };
}());
