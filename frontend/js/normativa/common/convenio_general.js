/**
 * convenio_general.js — Reglas operativas del CC BCSA 2026
 *
 * Fuente: BOE-A-2026-6389 (Convenio Colectivo Binter Canarias, vigencia 2026-2031)
 *
 * Contiene SOLO contenido con impacto operativo real en tripulaciones.
 * Excluido: tierra, RRHH, estructura corporativa, régimen disciplinario.
 * Organizado por utilidad operacional, NO por artículo.
 *
 * Capa: L1_CC — base normativa sobre la que operan todos los overrides.
 * Estas reglas aplican a todas las bases salvo override explícito de L2/L3.
 */

'use strict';

var CC_REGLAS = [

  // ══════════════════════════════════════════════════════════════
  // VACACIONES
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_vac_duracion',
    categoria: 'vacaciones',
    titulo:    'Duración de vacaciones — Grupos III y IV',
    texto:     '30 días naturales anuales para Grupos III y IV (tripulaciones técnicas y de cabina). Disfrute de común acuerdo entre empresa y trabajador.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_numerico: 30,
    unidad: 'dias_naturales',
  },

  {
    id:        'cc_vac_fraccionamiento',
    categoria: 'vacaciones',
    titulo:    'Fraccionamiento de vacaciones',
    texto:     'Las vacaciones pueden fraccionarse en hasta 4 períodos. Hasta 4 días pueden reservarse como "días personales" con preaviso mínimo de 45 días.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: { max_periodos: 4, dias_personales_max: 4, preaviso_dias_personales_dias: 45 },
  },

  {
    id:        'cc_vac_caducidad',
    categoria: 'vacaciones',
    titulo:    'Caducidad de vacaciones y prioridad',
    texto:     'Las vacaciones deben disfrutarse antes del 31 de enero del año siguiente. Los días pendientes del año anterior tienen prioridad sobre los del año en curso durante enero.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_texto: 'Límite: 31 de enero del año siguiente. Días anteriores = prioridad en enero.',
  },

  {
    id:        'cc_vac_recuperacion_it',
    categoria: 'vacaciones',
    titulo:    'Vacaciones y baja médica (IT)',
    texto:     'Si caes de baja durante las vacaciones y lo comunicas en 24 horas con el documento oficial de baja, los días que no has podido disfrutar se recuperan cuando el servicio lo permita. Tienes hasta 18 meses desde el final del año en que se originaron para recuperarlos (salvo baja por embarazo, parto o lactancia: sin límite de año natural).',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      comunicacion_horas: 24,
      limite_recuperacion_meses: 18,
      excepcion_maternidad: 'sin_limite_año_natural',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // IT / BAJAS
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_it_carencia_7_dias',
    categoria: 'it_bajas',
    titulo:    '7 días sin complemento de empresa (enfermedad común / AT no laboral)',
    texto:     'Para Grupos III y IV: los primeros 7 días de baja por enfermedad común o accidente no laboral, la empresa NO complementa. Solo cobras la prestación de la Seguridad Social. A partir del día 8, la empresa complementa hasta el 100% de los conceptos retributivos FIJOS.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 49',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      dias_sin_complemento: 7,
      complemento_desde_dia: 8,
      complemento_hasta: '100% conceptos fijos',
      duracion_max_complemento_meses: 6,
      variables_incluidas: false,
    },
    nota_critica: 'Las variables (HV, dietas, imaginarias, etc.) NO se complementan NUNCA durante una baja.',
  },

  {
    id:        'cc_it_condiciones_complemento',
    categoria: 'it_bajas',
    titulo:    'Condiciones para que la empresa complemente la baja',
    texto:     'La empresa complementa la baja (desde el día 8) bajo estas condiciones: (1) No haber acumulado más de 2 bajas en los 3 meses anteriores. (2) Acudir a las citas de control del servicio médico de la empresa. Si no se acude sin justificación, la empresa puede dejar de pagar el complemento. Si el médico de empresa considera la enfermedad grave, el complemento puede mantenerse aunque se supere el criterio de acumulación.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 49',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      max_bajas_3_meses: 2,
      requiere_control_medico_empresa: true,
      excepcion_enfermedad_grave: true,
    },
  },

  {
    id:        'cc_it_accidente_laboral',
    categoria: 'it_bajas',
    titulo:    'Accidente de trabajo o enfermedad profesional — sin carencia',
    texto:     'Si la baja es por accidente de trabajo o enfermedad profesional, la empresa complementa desde el PRIMER día al 100% de los conceptos fijos. No existe período de carencia de 7 días.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 49',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: { complemento_desde_dia: 1, dias_sin_complemento: 0 },
  },

  // ══════════════════════════════════════════════════════════════
  // DÍAS LIBRES Y PROGRAMACIÓN (CC base — sin roster)
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_dias_libres_99',
    categoria: 'dias_libres',
    titulo:    'Mínimo de días libres anuales',
    texto:     '99 días libres mínimo por año natural (Art. 79). Incluye ROFF, vacaciones y demás descansos.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 79',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_numerico: 99,
    unidad: 'dias_libres_anuales_minimo',
  },

  {
    id:        'cc_art80_seis_dias',
    categoria: 'programacion',
    titulo:    'Protección: máximo 5 días consecutivos de actividad (CC base)',
    texto:     'El CC establece que no se programarán seis o más días seguidos de actividad salvo pacto en contra. Si por necesidades del servicio se programan, deben justificarse y notificarse periódicamente al comité de empresa. Siempre que sea posible, los bloques de 5 días estarán precedidos o sucedidos por 2 días libres.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 80',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    nota_override: 'SUSPENDIDA en bases con roster activo. Ver reglas de base.',
  },

  {
    id:        'cc_art80_fin_semana',
    categoria: 'programacion',
    titulo:    'Protección: fin de semana libre al mes (CC base)',
    texto:     'Si un tripulante tiene servicio activo todos los fines de semana del mes, la empresa debe asignarle un fin de semana libre inamovible (S+D + tarde del viernes o mañana del lunes). No aplica si ese mes ya tiene un fin de semana libre por vacaciones, licencias u otro motivo.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 80',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    nota_override: 'SUSPENDIDA en bases con roster activo. Ver reglas de base.',
  },

  // ══════════════════════════════════════════════════════════════
  // HORAS DE VUELO Y VARIABLES
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_hv_tramos_concepto',
    categoria: 'hv',
    titulo:    'Sistema de tramos de horas de vuelo',
    texto:     'Las primeras 60 horas de vuelo mensuales están incluidas en el salario base (no generan variable adicional). A partir de la hora 60 se activan los tramos variables T1-T4, con tarifa creciente. Las horas nocturnas y los festivos especiales (25/12, 1/1, 6/1) se multiplican por 1,5.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 46/47',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      horas_incluidas_en_base: 60,
      tramos: ['T1: 60-70h', 'T2: 70-80h', 'T3: 80-90h', 'T4: +90h'],
      coeficiente_nocturnas: 1.5,
      festivos_especiales: ['25-12', '01-01', '06-01'],
      coeficiente_festivos_especiales: 1.5,
    },
  },

  {
    id:        'cc_imaginaria',
    categoria: 'hv',
    titulo:    'Imaginaria — garantía y condiciones',
    texto:     'Cada imaginaria programada genera 3 unidades de HV, independientemente de si se activa. Si se activa pero no hay vuelo: además cobras la dieta nacional. Si te activan y estás en sala de firmas sin vuelo asignado: cobras 1 HV adicional por cada 2 horas de espera.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 46/47',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      hv_garantizadas_por_imaginaria: 3,
      si_activada_sin_vuelo: ['dieta_nacional', '1HV_por_cada_2h_espera_sala'],
    },
  },

  {
    id:        'cc_libre_volado',
    categoria: 'hv',
    titulo:    'Libre volado — voluntariedad',
    texto:     'Para TCP (Grupo III): el convenio establece expresamente que la aceptación de un libre volado es voluntaria. Para pilotos (Grupo IV): en la práctica también es voluntario. Nadie puede ser sancionado por no aceptar un libre volado.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 46',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_texto: 'Voluntario para TCP (texto literal). Prácticamente voluntario para pilotos (práctica consolidada).',
  },

  {
    id:        'cc_media_variables',
    categoria: 'vacaciones',
    titulo:    'Media de variables durante vacaciones',
    texto:     'Durante las vacaciones se percibe una "media de variables" calculada sobre los conceptos variables de los meses anteriores. Esta media se abona en la nómina del mes SIGUIENTE al disfrute. Si las vacaciones se fraccionan en varios bloques, cada bloque genera su propia media en el mes siguiente a ese bloque.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 46/47',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: 'ambig_media_variables_ajuste_12m', pendiente_validacion: false,
      confianza: 'documentado',
    },
    nota_override: 'El Acta de Cierre amplía los conceptos incluidos en la media y establece un ajuste durante 12 meses.',
  },

  // ══════════════════════════════════════════════════════════════
  // REDUCCIÓN DE JORNADA
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_reduccion_jornada',
    categoria: 'reduccion_jornada',
    titulo:    'Reducción de jornada — efecto en tramos HV',
    texto:     'En reducción de jornada, los tramos de horas de vuelo se reducen proporcionalmente a la reducción aplicada. Ejemplo: con reducción del 50%, el tramo T1 empieza a las 30h (en vez de 60h). Este criterio aplica también durante vacaciones y licencias no retribuidas.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 39 ET + Acta Cierre §SEXTO',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    nota_fuente: 'El principio de proporcionalidad está en el CC; la extensión a vacaciones y LNR fue añadida por el Acta de Cierre §SEXTO.',
  },

  // ══════════════════════════════════════════════════════════════
  // LICENCIAS RETRIBUIDAS (BASE CC)
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_licencias_base',
    categoria: 'licencias',
    titulo:    'Licencias retribuidas — causas básicas (CC)',
    texto:     'El CC establece licencias retribuidas por: matrimonio o pareja de hecho (15 días), nacimiento de hijo (10 días para el otro progenitor), fallecimiento familiar (2-4 días según parentesco y desplazamiento), hospitalización grave familiar (3 días + desplazamiento si aplica), traslado de domicilio (1 día), exámenes oficiales (tiempo necesario), consulta médica propia (tiempo necesario en jornada), consulta médica familiar (hasta 20h/año), y otras causas legalmente establecidas.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 37',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    nota_override: 'El Acta de Cierre añade LRC adicionales por antigüedad para Grupos III y IV.',
  },

  // ══════════════════════════════════════════════════════════════
  // MATERNIDAD / PATERNIDAD / CONCILIACIÓN
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_maternidad_vacaciones',
    categoria: 'licencias',
    titulo:    'Vacaciones y baja por maternidad, parto o lactancia',
    texto:     'Si la baja por embarazo, parto o lactancia impide disfrutar las vacaciones, puedes disfrutarlas una vez terminada la suspensión del contrato, aunque haya terminado el año natural.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 41',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
  },

  // ══════════════════════════════════════════════════════════════
  // UNIFORMIDAD
  // ══════════════════════════════════════════════════════════════

  {
    id:        'cc_uniformidad_pilotos',
    categoria: 'uniformidad',
    titulo:    'Uniformidad pilotos — sistema de puntos (ciclo 3 años)',
    texto:     'Los pilotos renuevan la uniformidad por ciclos de 3 renovaciones anuales. Límite de puntos por ciclo: Año 1: 66 pts, Año 2: 98 pts, Año 3: 120 pts. Al terminar el ciclo se reinicia desde 66. Cada prenda tiene un coste en puntos. Lo que supere el límite del ciclo es a cargo del piloto.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 93 + Anexo',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['CMD', 'COP'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      ciclos: [{ renovacion: 1, limite_pts: 66 }, { renovacion: 2, limite_pts: 98 }, { renovacion: 3, limite_pts: 120 }],
      prendas: [
        { nombre: 'Traje piloto (verano o invierno)', pts: 50 },
        { nombre: 'Camisa manga corta', pts: 7 },
        { nombre: 'Camisa manga larga', pts: 7 },
        { nombre: 'Galón 4 barras + estrella', pts: 5 },
        { nombre: 'Galón 3 barras', pts: 5 },
        { nombre: 'Corbata', pts: 5 },
        { nombre: 'Zapatos (par)', pts: 15 },
        { nombre: 'Chaleco', pts: 10 },
        { nombre: 'Cardigan', pts: 15 },
        { nombre: 'Chaleco Piumino ligero marino', pts: 15 },
        { nombre: 'Cinturón', pts: 5 },
        { nombre: 'Calcetines (pack de 3)', pts: 2 },
        { nombre: 'Nevera portalimentos', pts: 3 },
        { nombre: 'Trolley/Messenger Samsonite', pts: 20 },
        { nombre: 'Trolley cabina rígido / mediano rígido', pts: 20 },
      ],
    },
  },

  {
    id:        'cc_uniformidad_tcp',
    categoria: 'uniformidad',
    titulo:    'Uniformidad TCP — dotación inicial y renovaciones',
    texto:     'Las TCP reciben una dotación inicial completa de uniformidad. Las renovaciones posteriores son por deterioro justificado (no hay sistema de puntos ni ciclos). No existe límite anual de renovación; se solicita cuando la prenda no está en condiciones.',
    _meta: {
      doc: 'cc_bcsa2026', capa: 'L1_CC', articulo: 'Art. 93 + Anexo',
      vigencia_desde: '2026-01-01', vigencia_hasta: null,
      bases: ['MAD', 'TFN', 'LPA'], grupos: ['TCP', 'SCC', 'CC'],
      condicionado_a: null, overrides: [], temporal: false,
      ambiguedad_id: null, pendiente_validacion: false, confianza: 'documentado',
    },
    valor_tabla: {
      tipo: 'dotacion_inicial',
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
  },

];
