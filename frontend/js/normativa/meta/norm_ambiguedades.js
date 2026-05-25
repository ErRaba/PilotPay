/**
 * norm_ambiguedades.js — Registro de ambigüedades normativas PilotPay Convenio
 *
 * Cada entrada documenta un punto no resuelto o interpretable de los acuerdos.
 * Las ambigüedades son parte fundamental de la credibilidad del sistema:
 * PilotPay nunca debe presentar como certeza algo que no lo es.
 *
 * Estado posible: 'abierta' | 'resuelta' | 'confirmada_empresa' | 'confirmada_sindicato'
 * Urgencia: 'critica' | 'alta' | 'media' | 'baja'
 */

'use strict';

var NORM_AMBIGUEDADES = [

  {
    id:          'ambig_tfn_gap_julio_agosto',
    titulo:      'TFN: posible hueco entre el fin del 6+3 y el inicio del 5+3',
    descripcion: [
      'El roster 6+3 de TFN tiene duración de 6 meses desde 01/01/2026, lo que lo situaría venciendo en torno al 01/07/2026.',
      'El roster 5+3 (prueba temporal) empieza el 01/08/2026.',
      'El documento no especifica qué ocurre en TFN entre ambas fechas.',
      'Posibles escenarios: (a) el 6+3 se prorroga expresamente hasta el 01/08, (b) se regresa al CC común ese mes, (c) existe un acuerdo verbal o complementario no documentado.',
    ],
    lo_que_dice_el_documento: 'El PRIMERO habla de 6 meses + prórroga si ambas partes acuerdan. El TERCERO dice "a partir del 1 de agosto de 2026" sin referirse al 6+3.',
    lo_que_no_dice: 'El documento no conecta explícitamente el fin del 6+3 con el inicio del 5+3 en TFN.',
    afecta_reglas: ['tfn_roster_6_3', 'tfn_roster_5_3'],
    bases:         ['TFN'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
    urgencia:      'alta',
    estado:        'abierta',
    requiere:      'confirmacion_empresa_o_sindicato',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'En TFN, entre julio y agosto 2026 existe una zona de transición no documentada. El roster activo en ese periodo requiere confirmación oficial.',
  },

  {
    id:          'ambig_mad_75pct_funcion',
    titulo:      'MAD: definición de "75% de la función asignada mensualmente"',
    descripcion: [
      'El Acta de Cierre §SÉPTIMO condiciona el complemento de base MAD a que el tripulante haya estado "como mínimo el 75% de la función asignada mensualmente".',
      'El documento no define "función asignada": puede ser días de vuelo efectivos, FDP realizadas, días de actividad total, horas de vuelo respecto al teórico mensual, u otro criterio.',
      'Tampoco especifica qué ocurre si no se alcanza el 75% en un mes dado: ¿se pierde ese mes completo del complemento? ¿se proratea? ¿acumula?',
      'No se menciona cómo interactúa con bajas cortas, reducciones de jornada o vacaciones.',
    ],
    lo_que_dice_el_documento: '"...teniendo en cuenta que hayan estado como mínimo el 75% de la función asignada mensualmente."',
    lo_que_no_dice: 'No define "función asignada". No explica consecuencias de incumplimiento.',
    afecta_reglas: ['mad_comp_cmd', 'mad_comp_cop', 'mad_comp_scc', 'mad_comp_tcp'],
    bases:         ['MAD'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'alta',
    estado:        'abierta',
    requiere:      'confirmacion_empresa',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'El complemento de base MAD requiere estar un mínimo del 75% en tu función asignada mensualmente. La empresa no ha definido públicamente cómo se calcula este porcentaje.',
  },

  {
    id:          'ambig_mad_11_dias_periodo',
    titulo:      'MAD HV +20%: "media de 11 días de vuelo" — ¿mensual o anual?',
    descripcion: [
      'El Acta de Cierre §SÉPTIMO establece que el HV +20% aplica "siempre y cuando se mantenga una productividad de 11 días de vuelo de media por tripulante".',
      'No se especifica el período de la media: mensual, trimestral, semestral o anual.',
      'Por contexto operativo se asume mensual, pero el texto no lo confirma.',
      'Tampoco queda claro si la variación de productividad suspende automáticamente el +20% o solo activa una revisión.',
    ],
    lo_que_dice_el_documento: '"...11 días de vuelo de media por tripulante. En el caso de que la productividad varíe, se revisará con la representación legal de los trabajadores."',
    lo_que_no_dice: 'No dice si la media es mensual, trimestral o anual. No dice si la revisión puede resultar en reducción o suspensión del +20%.',
    afecta_reglas: ['mad_hv_20pct'],
    bases:         ['MAD'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'alta',
    estado:        'abierta',
    requiere:      'confirmacion_empresa_o_sindicato',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'El +20% sobre HV en MAD es colectivo: depende de que el colectivo de la base mantenga una media de 11 días de vuelo. El período de la media y el mecanismo de revisión no están definidos en el documento.',
  },

  {
    id:          'ambig_vac_dia_adicional_tipo',
    titulo:      'Vacaciones: día adicional por antigüedad con roster activo — ¿natural o laboral?',
    descripcion: [
      'El Acta de Cierre añade +1 día adicional "a lo establecido" para tripulantes con antigüedad >14 y >20 años.',
      'Cuando el roster 5+3 está implantado, "lo establecido" pasa de 30 días naturales a 23 días laborales.',
      'El tipo del día adicional (natural vs laboral) no está especificado en el Acta ni en el Acuerdo de Roster.',
    ],
    lo_que_dice_el_documento: '"+ 1 día adicional a lo establecido" (Acta). "23 días laborales para el acuerdo de roster de 5 días de actividad seguidos de 3 días de descanso" (Acuerdo Roster).',
    lo_que_no_dice: 'No especifica el tipo (natural/laboral) del día adicional por antigüedad cuando coexiste con el roster.',
    afecta_reglas: ['acta_vac_ant_14_20', 'acta_vac_ant_20_plus', 'lpa_roster_vac_23_lab', 'tfn_roster_5_3_vac_23_lab'],
    bases:         ['TFN', 'LPA'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'media',
    estado:        'abierta',
    requiere:      'interpretacion_empresa_o_sindicato',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'Con roster 5+3 activo tendrías 23 días laborales + 1 día adicional si tienes más de 14 años de antigüedad. El tipo de ese día adicional (laboral o natural) está pendiente de aclaración.',
  },

  {
    id:          'ambig_oficina_funcion_responsabilidad',
    titulo:      'Roster: "función de responsabilidad" — quién queda excluido del día de oficina en descanso',
    descripcion: [
      'Los acuerdos de roster permiten programar un día de oficina en el bloque de 3 días de descanso, pero solo para "personal sin función de responsabilidad".',
      'El documento no define qué cargos o funciones implican "responsabilidad" en este contexto.',
      'Es relevante para instructores, jefes de base, GTI, LTC, TRI, TRE, y cualquier tripulante con funciones adicionales.',
    ],
    lo_que_dice_el_documento: '"Día de oficina para personal sin función de responsabilidad, se realizará en el primer o último día, dentro del bloque de los 3 días de descanso."',
    lo_que_no_dice: 'No define qué cargo constituye "función de responsabilidad". No da lista de roles excluidos.',
    afecta_reglas: ['mad_actividad_descanso', 'tfn_actividad_descanso', 'lpa_actividad_descanso'],
    bases:         ['MAD', 'TFN', 'LPA'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'media',
    estado:        'abierta',
    requiere:      'confirmacion_empresa',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'La empresa puede programar un día de oficina en tu descanso si no tienes "función de responsabilidad". Qué cargos quedan excluidos no está definido en el documento.',
  },

  {
    id:          'ambig_franco_5_dia_alcance',
    titulo:      'Roster: el "franco después del 5.º día" — ¿aplica solo a MAD o también a TFN en 6+3?',
    descripcion: [
      'El PRIMERO del Acuerdo Roster (que aplica a MAD y TFN conjuntamente) dice: "La empresa procurará asignar un franco después del quinto día de servicio, salvo por causas organizativas justificadas".',
      'El contexto redaccional del "procurará" puede interpretarse como aplicable a MAD, a TFN o a ambos bajo el 6+3.',
      'Para el 5+3 de TFN y LPA no aplica: con 5 días de actividad el último día ya es el 5.º, por lo que la protección carecería de sentido.',
    ],
    lo_que_dice_el_documento: '"La empresa procurará asignar un franco después del quinto día de servicio, salvo por causas organizativas justificadas, las cuales deberán ser comunicadas al comité de empresa." (PRIMERO, cláusula MAD+TFN)',
    lo_que_no_dice: 'No distingue si el "procurará" es solo para MAD o para TFN también durante el 6+3.',
    afecta_reglas: ['mad_roster_franco_5_dia'],
    bases:         ['TFN'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP', 'CC'],
    urgencia:      'media',
    estado:        'abierta',
    requiere:      'confirmacion_empresa_o_sindicato',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'En TFN con roster 6+3, el derecho a un franco después del 5.º día de actividad está redactado en el mismo acuerdo que MAD, pero no queda claro si aplica a ambas bases.',
  },

  {
    id:          'ambig_media_variables_ajuste_12m',
    titulo:      'Media de variables: "ajuste al nuevo modelo retributivo" durante 12 meses',
    descripcion: [
      'El TERCERO del Acta de Cierre indica que "durante los próximos 12 meses siguientes a la firma del convenio, la media de variables se ajustará al nuevo modelo retributivo".',
      'No define qué es el "nuevo modelo retributivo".',
      'No especifica qué cambia en la fórmula de la media, qué conceptos se incluyen o excluyen, ni en qué dirección se ajusta.',
      'El período de 12 meses desde la firma (28/11/2025) vence aproximadamente en noviembre/diciembre de 2026.',
    ],
    lo_que_dice_el_documento: '"A parte de los conceptos variables establecidos en el convenio colectivo, se tendrán en cuenta todos los demás conceptos variables retribuidos a la persona trabajadora. Durante los próximos 12 meses siguientes a la firma del convenio, la media de variables se ajustará al nuevo modelo retributivo."',
    lo_que_no_dice: 'No define el "nuevo modelo". No dice qué cambia exactamente en el cálculo.',
    afecta_reglas: ['cc_media_variables'],
    bases:         ['MAD', 'TFN', 'LPA'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'alta',
    estado:        'abierta',
    requiere:      'confirmacion_empresa',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'La media de variables que se paga en vacaciones incluirá todos los conceptos variables (no solo los del CC). Durante 2026 habrá un ajuste a un "nuevo modelo" cuyo detalle no está publicado.',
  },

  {
    id:          'ambig_matrices_dpo_ausentes',
    titulo:      'DPO 2026: matrices de consecución no incluidas en el documento',
    descripcion: [
      'El Acuerdo de Productividad 2026 menciona dos matrices que determinan el importe a percibir:',
      '— "Matriz eficiencia de combustible / puntualidad" (para TDV)',
      '— "Matriz calidad de servicio a bordo / puntualidad" (para TCP)',
      'Estas matrices no aparecen en el PDF del acuerdo.',
      'Sin ellas, el importe exacto del bono DPO no puede calcularse ni estimarse.',
      'El documento tampoco indica importes máximos ni base sobre la que se aplican los porcentajes.',
    ],
    lo_que_dice_el_documento: '"La cuantía a percibir por ambos conceptos vendrá determinada por la matriz eficiencia de combustible/puntualidad."',
    lo_que_no_dice: 'La propia matriz y los importes base. El DPO base por rol tampoco aparece en este documento (solo en el convenio general).',
    afecta_reglas: ['prod_tdv_co2_objetivo', 'prod_tcp_servicio_bordo', 'prod_puntualidad_comun'],
    bases:         ['MAD', 'TFN', 'LPA'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'critica',
    estado:        'abierta',
    requiere:      'documento_empresa',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'PilotPay puede explicar cómo funciona el sistema de productividad 2026, pero no puede calcular el importe exacto porque la empresa no ha publicado las matrices de consecución en el documento oficial.',
  },


  {
    id:          'ambig_dpo_scc_funcion_75pct',
    titulo:      'DPO SCC: "función de Sobrecargo" al 75% — definición distinta del complemento MAD',
    descripcion: [
      'El Acuerdo de Productividad 2026 condiciona el DPO de SCC a haber ejercido la función de Sobrecargo ≥75% del tiempo mensual.',
      'La ambigüedad ambig_mad_75pct_funcion existe para el complemento de base MAD (§SÉPTIMO Acta de Cierre).',
      'Aunque la condición es nominalmente similar, el contexto es distinto: el DPO de productividad puede tener criterios de medición diferentes a los del complemento de base.',
      'El documento de productividad no define cómo se acredita que el SCC ha ejercido el 75% de su función.',
      'No queda claro si los días de baja IT, formación o repositionamiento cuentan a favor o en contra.',
    ],
    lo_que_dice_el_documento: '"Para el caso de los sobrecargos, la condición será que hayan ejercido la función de sobrecargo el 75% del tiempo."',
    lo_que_no_dice: 'Cómo se mide el porcentaje. Si la definición de "función" es la misma que en el complemento MAD. Qué pasa cuando no se alcanza.',
    afecta_reglas: ['prod_tcp_scc_75pct'],
    bases:         ['MAD', 'TFN', 'LPA'],
    grupos:        ['SCC'],
    urgencia:      'media',
    estado:        'abierta',
    requiere:      'confirmacion_empresa',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'El DPO de Sobrecargo requiere haber ejercido la función el 75% del tiempo mensual. La empresa no ha definido cómo se calcula este porcentaje en el contexto del DPO.',
  },

  {
    id:          'ambig_mad_complemento_durante_it',
    titulo:      'MAD: ¿los días de baja IT cuentan para el 75% de función asignada del complemento?',
    descripcion: [
      'El complemento de base MAD (CMD/COP/SCC/TCP) requiere haber estado el 75% de la función asignada mensualmente.',
      'El documento no define qué ocurre durante una baja por incapacidad temporal (IT): si los días de baja cuentan como días en función, como días fuera de función, o si se pondera el denominador.',
      'En una baja de 10 días sobre un mes de 22 días hábiles, el tripulante solo habría podido ejercer su función 12 días — podría no alcanzar el 75% si el denominador es el mes completo.',
      'El Acta no menciona IT en el contexto del complemento MAD. El CC sí tiene reglas de IT pero no las vincula al complemento MAD.',
      'Esta ambigüedad es distinta de ambig_mad_75pct_funcion (que trata la definición de "función") porque aquí la pregunta es sobre el tratamiento de la ausencia.',
    ],
    lo_que_dice_el_documento: '"...teniendo en cuenta que hayan estado como mínimo el 75% de la función asignada mensualmente." (Acta §SÉPTIMO)',
    lo_que_no_dice: 'Nada sobre IT, bajas parciales, o cómo se trata la ausencia involuntaria para el cómputo del 75%.',
    afecta_reglas: ['mad_comp_cmd', 'mad_comp_cop', 'mad_comp_scc', 'mad_comp_tcp'],
    bases:         ['MAD'],
    grupos:        ['CMD', 'COP', 'SCC', 'TCP'],
    urgencia:      'alta',
    estado:        'abierta',
    requiere:      'confirmacion_empresa',
    pendiente_desde: '2026-05-25',
    como_mostrar:  'Si estás de baja durante parte del mes, no está claro si eso afecta al complemento de base MAD. La empresa no ha definido cómo se trata la baja IT para el cómputo del 75% de función asignada.',
  },

];
