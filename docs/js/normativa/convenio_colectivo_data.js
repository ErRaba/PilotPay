/**
 * convenio_colectivo_data.js
 * Texto oficial del Convenio Colectivo Binter Canarias 2026–2031
 * Fuente: BOE-A-2026-6389
 *
 * Estructura de capítulos (BOE):
 *   Cap I    Arts.  1– 9  Disposiciones generales
 *   Cap II   Arts. 10–20  Organización y participación
 *   Cap III  Arts. 21–27  Clasificación profesional
 *   Cap IV   Arts. 28–34  Situaciones
 *   Cap V    Arts. 35–42  Jornada
 *   Cap VI   Arts. 45–54  Retribuciones  (43-44 pendientes de verificación)
 *   Cap VII  Arts. 55–56  Seguridad y salud
 *   Cap VIII Arts. 57–58  Igualdad
 *   Cap IX+  Arts.  59+   Pendiente de extracción
 *
 * ESQUEMA DE ARTÍCULO:
 * {
 *   numero, titulo, estado, colectivos,
 *   texto_oficial,       <- texto verbatim del BOE (null si no cargado)
 *   resumen_operativo,   <- nota PilotPay (null si no aplica)
 *   afectaciones: [],    <- acuerdos posteriores que afectan este artículo
 *   related: [],         <- claves de secciones relacionadas en PilotPay
 *   faqs: [],            <- preguntas frecuentes (arquitectura lista, contenido futuro)
 *   fuente,
 * }
 */

'use strict';

var CONVENIO_CC = {

  meta: {
    nombre:           'Convenio Colectivo Binter Canarias 2026–2031',
    boe:              'BOE-A-2026-6389',
    vigencia_desde:   '2026-01-01',
    vigencia_hasta:   '2031-12-31',
    fuente:           'BOE-A-2026-6389.pdf',
    grupos_cubiertos: ['CMD', 'COP', 'SCC', 'TCP'],
    total_capitulos:  8,
    nota: 'Texto oficial. Los acuerdos posteriores (Acta de Cierre, acuerdos de roster, productividad) pueden complementar o modificar art\xedculos concretos. Las notas PilotPay son contexto operativo, no texto oficial.',
  },

  capitulos: [

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO I — DISPOSICIONES GENERALES (Arts. 1–9)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_I', numero: 'I',
      titulo: 'Disposiciones generales',
      articulos: [
        {
          numero: 1, titulo: 'Partes firmantes y \xe1mbito funcional',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El presente Convenio Colectivo ha sido negociado y suscrito, de una parte, por el Comit\xe9 de Empresa de Las Palmas de Gran Canaria, el Comit\xe9 de Empresa de Tenerife y el Comit\xe9 de Empresa de Madrid, en representaci\xf3n del colectivo de trabajadores; y de otra, por la Direcci\xf3n de la empresa, en representaci\xf3n de Binter Canarias, S.A.\n\n'
            + 'El presente Convenio Colectivo ser\xe1 de aplicaci\xf3n en todos los centros de trabajo de Binter Canarias, S.A., con independencia de la provincia en que se ubiquen.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 2, titulo: '\xc1mbito personal',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El presente Convenio Colectivo ser\xe1 de aplicaci\xf3n a todo el personal que preste sus servicios en Binter Canarias, S.A. y sea contratado por esta empresa, que no forme parte de la alta direcci\xf3n de la empresa y que no ocupe puestos de especial responsabilidad, tales como los mandos intermedios y personal directivo, que por sus caracter\xedsticas propias estar\xe1n excluidos del \xe1mbito del presente Convenio.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 3, titulo: 'Vigencia',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El presente Convenio Colectivo entrar\xe1 en vigor el d\xeda 1 de enero de 2026, independientemente de la fecha de su publicaci\xf3n en el Bolet\xedn Oficial del Estado, y tendr\xe1 una duraci\xf3n hasta el 31 de diciembre de 2031, pudiendo ser denunciado por cualquiera de las partes firmantes mediante escrito dirigido a la otra parte con una antelaci\xf3n m\xednima de dos meses a la fecha de su vencimiento.\n\n'
            + 'En el supuesto de que no se produzca denuncia expresa, el Convenio quedar\xe1 prorrogado t\xe1citamente por a\xf1os naturales, con los efectos previstos en el art\xedculo 86 del Estatuto de los Trabajadores. Denunciado el Convenio, si transcurrido un a\xf1o desde la denuncia no se hubiera acordado un nuevo Convenio, se estar\xe1 a lo dispuesto en el art\xedculo 86 del Estatuto de los Trabajadores.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 4, titulo: 'Vinculaci\xf3n a la totalidad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Las condiciones pactadas forman un todo org\xe1nico e indivisible y, a efectos de su aplicaci\xf3n pr\xe1ctica ser\xe1n consideradas globalmente.\n\n'
            + 'En el supuesto de que los \xf3rganos competentes dictaran resoluci\xf3n firme que declare la nulidad total o parcial o la inaplicaci\xf3n de alg\xfan art\xedculo del presente convenio, las partes se obligan a negociar de buena fe de forma que, respetando la resoluci\xf3n judicial dictada, se restablezca en esencia el conjunto de las condiciones pactadas y el equilibrio de los intereses de las partes.\n\n'
            + 'Las modificaciones afectar\xe1n al convenio en los t\xe9rminos y con el alcance previstos en el ordenamiento jur\xeddico. En el caso de que las modificaciones incidan en la definici\xf3n de \xe1mbitos de este convenio; en la p\xe9rdida retributiva de personal o en condiciones mejoradas del convenio del sector, las partes signatarias analizar\xe1n los efectos de este cambio normativo, procediendo, en su caso, a las correspondientes adaptaciones en la regulaci\xf3n. Hasta tanto, tales adaptaciones se produzcan, el convenio continuar\xe1 aplic\xe1ndose en sus propios t\xe9rminos.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 5, titulo: 'Absorci\xf3n y compensaci\xf3n',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Para el personal del Grupo I cuyo salario fijo bruto anual supere los 24.000 euros, y para el personal del Grupo II cuando dicho salario fijo bruto supere los 28.000 euros, las condiciones recogidas en este convenio, valoradas en su conjunto y en c\xf3mputo anual, compensar\xe1n y absorber\xe1n, hasta donde alcancen todas las mejoras y retribuciones sobre las m\xednimas legales o reglamentariamente satisfechas por la empresa, cualquiera que sea su origen o motivo, denominaci\xf3n, naturaleza o forma, siendo valoradas tambi\xe9n en su conjunto y en c\xf3mputo anual.\n\n'
            + 'Asimismo se compensar\xe1n y ser\xe1n absorbidas, en su conjunto y en c\xf3mputo anual, con las que se fijen y resulten aplicables por disposiciones legales o administrativas con posterioridad a la firma de este convenio, consideradas en su conjunto y en c\xf3mputo anual.\n\n'
            + 'Igualmente, se compensar\xe1n y absorber\xe1n los incrementos salariales derivados de cambios de grupo profesional, independientemente de los topes establecidos en el presente art\xedculo.\n\n'
            + 'Se respetar\xe1n las condiciones establecidas individualmente, cualquiera que sea su origen o motivo, denominaci\xf3n, naturaleza o forma, con anterioridad a la fecha de entrada en vigor de este convenio, con car\xe1cter personal, con un concepto as\xed denominado, si globalmente superan las condiciones del presente convenio, hasta tanto se produzca la compensaci\xf3n y absorci\xf3n por las mejoras contenidas en el mismo.\n\n'
            + 'Durante los a\xf1os 2026, 2027 y 2028, no se absorber\xe1 el complemento personal, salvo los incrementos salariales derivados de cambios de grupo profesional, independientemente de los topes establecidos.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 6, titulo: 'SMI',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Durante la vigencia del presente convenio colectivo, se tendr\xe1n en cuenta todos los conceptos retributivos de naturaleza salarial establecidos en la normativa laboral vigente para establecer el Salario M\xednimo Profesional (SMI) y a la estructura salarial definida por el Estatuto de los Trabajadores y disposiciones complementarias, garantizando que las condiciones pactadas no sean inferiores a las de derecho necesario.\n\n'
            + 'En el supuesto de que, durante la aplicaci\xf3n del convenio, se produzcan modificaciones legales o reglamentarias que afecten a los conceptos retributivos de naturaleza salarial, las partes firmantes del convenio se comprometen a reunir a la Comisi\xf3n Negociadora o a la Comisi\xf3n Paritaria en un plazo m\xe1ximo de treinta d\xedas naturales desde la entrada en vigor de la nueva norma, con el fin de adaptar el contenido del convenio a la regulaci\xf3n vigente y mantener los rangos retributivos.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 7, titulo: 'Normativa supletoria',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Para lograr que las operaciones y actividad de Binter Canarias, SA, se desarrollen conforme a los principios de seguridad, legalidad, regularidad, calidad y econom\xeda, el personal afecto por el presente convenio se somete, en defecto de regulaci\xf3n expresa en el mismo, a lo previsto en la legislaci\xf3n vigente en cada momento, as\xed como a las normas generales.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 8, titulo: 'Norma m\xe1s favorable',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Cuando la aplicaci\xf3n del texto del convenio se prestara a interpretaciones dudosas, se aplicar\xe1, en cada caso concreto, aqu\xe9lla que sea m\xe1s favorable al personal. Este principio no ser\xe1 aplicable cuando ambas partes entiendan soluciones claramente contrapuestas, en cuyo caso deber\xe1 resolver la Comisi\xf3n Paritaria, de acuerdo a lo establecido en el art\xedculo 15 del presente convenio.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 9, titulo: 'Procedimiento de Descuelgue',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'En el caso de que la empresa pretendiera en alg\xfan momento modificar condiciones de este convenio colectivo, de las reguladas en las letras a), b), c), d), e), f) y g), del art\xedculo 82.3 del Estatuto de los Trabajadores, la Direcci\xf3n lo comunicar\xe1 a la representaci\xf3n social, mediante escrito indicando las razones econ\xf3micas, t\xe9cnicas, organizativas o de producci\xf3n que concurran, y facilitando la documentaci\xf3n que acredite su concurrencia. Se abrir\xe1 un periodo de consultas de duraci\xf3n no superior a quince d\xedas naturales, al objeto de llegar a un acuerdo, que requerir\xe1 la conformidad de la mayor\xeda de la representaci\xf3n social, todo ello de acuerdo con lo regulado en el art\xedculo 41.4 del texto refundido del Estatuto de los Trabajadores. En caso de desacuerdo a la conclusi\xf3n del per\xedodo de consultas, la Empresa y la representaci\xf3n social, someter\xe1n las discrepancias a un procedimiento de soluci\xf3n mediante mediaci\xf3n o arbitraje ante el \xf3rgano que resulte competente por raz\xf3n del territorio, en atenci\xf3n al \xe1mbito provincial, auton\xf3mico o estatal del conflicto, de entre los \xf3rganos previstos en el VI Acuerdo sobre Soluci\xf3n Aut\xf3noma de Conflictos Laborales (sistema extrajudicial) publicado en el BOE n\xfamero 334, de 23 de diciembre de 2020.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO II — ORGANIZACI\xd3N Y PARTICIPACI\xd3N (Arts. 10–20)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_II', numero: 'II',
      titulo: 'Organizaci\xf3n y participaci\xf3n',
      articulos: [
        {
          numero: 10, titulo: 'Organización del trabajo',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Organización práctica y técnica del trabajo en Binter Canarias, SA, es facultad de la Empresa.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 11, titulo: 'Salvaguarda de los intereses de la Empresa',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Las personas trabajadoras afectadas por el presente convenio, colaborarán en la consecución de los objetivos de la Empresa, procurando alcanzar una alta calidad del servicio y una óptima atención a sus clientes.\n\n'
            + 'Durante el ejercicio de sus funciones, el personal se obligará a salvaguardar los intereses de la Compañía como propios, tomar las medidas necesarias de protección de vidas y bienes que esta le confíe y evitar toda imprudencia, negligencia o comportamiento que pueda redundar en contra de dichas vidas y bienes, del prestigio de La Compañía o de sus resultados económicos. En especial procurará el bienestar de los clientes, garantizando la puntualidad, regularidad, calidad del servicio y seguridad de los vuelos.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 12, titulo: 'Dedicación, títulos, pericia y conocimientos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El personal cooperará con la Dirección para mantener su pericia, titulación necesaria y conocimientos profesionales al nivel que exijan las misiones que le sean asignadas por la Dirección de la Empresa, aceptando la realización de las pruebas y cursos que al efecto se establezcan, así como los controles e inspecciones que se determinen.\n\n'
            + 'En el caso del personal de vuelo, la Compañía mantendrá el control de las fechas de vencimiento de los títulos y licencias, avisando previamente a su vencimiento y dando las facilidades necesarias para que estos puedan ser renovados. No obstante el personal de tripulación como responsables últimos se comprometen a mantener actualizados los títulos, licencias, certificaciones y/o calificaciones, y cualquier otra documentación necesaria para el normal desempeño de sus funciones, dando la Compañía las facilidades necesarias para ello. El personal de tripulación será responsable del conocimiento y actualización de toda la documentación contenida en el Sistema de Calidad de la Compañía en tiempo y forma, que sea necesaria para el desempeño de las funciones asignadas por la Compañía.\n\n'
            + 'La Compañía se hará cargo de todos los gastos que se originen por el mantenimiento de las licencias, habilitaciones y certificados necesarios por el personal en activo de los grupos laborales III y IV para el desempeño de sus funciones en la compañía.\n\n'
            + 'En los casos de pérdida o deterioro de la documentación necesaria para poder formar parte de la tripulación de un vuelo, el titular se hará cargo de los gastos que se originen para poder volver a incorporarse al servicio activo. En caso de que el robo de la documentación se produzca estando la persona trabajadora en servicio o en un desplazamiento ordenado por la empresa (incluyendo posicionamientos, pernoctas, traslados a/desde bases o guardias), los costes razonables y directamente vinculados a su reposición serán asumidos por la empresa.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 13, titulo: 'Pacto de permanencia',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Cuando la empresa haya invertido en la formaci\xf3n de un trabajador y el coste de dicha formaci\xf3n sea especialmente relevante, se podr\xe1 formalizar un pacto de permanencia con el trabajador, en los t\xe9rminos del art\xedculo 21.4 del Estatuto de los Trabajadores, fijando su duraci\xf3n en un m\xe1ximo de dos a\xf1os.\n\n'
            + 'En el supuesto de que el trabajador abandone la empresa antes de que transcurra el tiempo pactado, deber\xe1 indemnizar a la empresa con el importe proporcional correspondiente al tiempo que reste por cumplir.\n\n'
            + 'En el supuesto de que el trabajador no haya abonado la cantidad correspondiente a la formaci\xf3n recibida, y se produzca un finiquito de la relaci\xf3n laboral, la empresa podr\xe1 descontar de la liquidaci\xf3n del trabajador las cantidades pendientes de abonar. Para ello el trabajador dispondr\xe1 de un plazo de treinta d\xedas para abonar la cantidad que fuera exigible, antes de que la empresa proceda a hacer efectivo dicho descuento.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 14, titulo: 'Exclusividad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los trabajadores afectados por el presente Convenio Colectivo no podr\xe1n realizar actividades en empresas dedicadas al transporte a\xe9reo comercial, salvo autorizaci\xf3n expresa de la Direcci\xf3n de la empresa.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 15, titulo: 'Comisión Paritaria de interpretación del convenio',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Con el fin de facilitar la aplicación del presente convenio, se crea en el seno de la Empresa una Comisión Paritaria compuesta por igual número de representantes de la Dirección y del personal.\n\n'
            + 'Sus componentes, en número de cuatro por cada parte, serán designados por la Dirección y por los Representantes de los Trabajadores, respectivamente. La función de esta Comisión será la interpretación y vigilancia del cumplimiento de las materias reguladas en el presente convenio. Los acuerdos de la Comisión Paritaria serán vinculantes para las partes y para todo el personal incluido en el ámbito de aplicación del presente convenio, sin perjuicio de las acciones que estos pudieran ejercitar, de entender que son lesivos para sus intereses o derechos. Los acuerdos deberán hacerse públicos y tendrán efectividad desde la fecha en que así lo acuerden las partes.\n\n'
            + 'La Comisión Paritaria se reunirá cuando una de las partes así lo proponga, en el plazo máximo de una semana. Ambas partes se obligan a levantar siempre Acta de todas las reuniones, aunque no lleguen a ningún acuerdo, reflejando en la misma las diferentes posiciones y/o exposiciones.\n\n'
            + 'Las representaciones de las partes tendrán acceso a toda la documentación e información necesaria para el cumplimiento de sus funciones.\n\n'
            + 'Así mismo, las partes podrán asistir acompañadas de los asesores en el número que se acuerde en cada caso.\n\n'
            + 'Los miembros representantes de la Dirección en la Comisión de Seguimiento e Interpretación del convenio colectivo serán elegidos por la Dirección de la Empresa.\n\n'
            + 'Los miembros representantes de las personas trabajadoras en la Comisión de Interpretación del convenio colectivo deberán comprometerse a la estricta observancia del secreto profesional durante el tiempo que permanezcan en ella y después de finalizada su permanencia, en lo referente a todas aquellas materias que conozcan por su pertenencia a esta comisión, y muy especialmente, en lo que se refiere a aquellas materias que la dirección señale como reservadas. En todo caso, ningún documento entregado por la empresa a la representación de las personas trabajadoras podrá ser usado fuera del estricto ámbito de aquella, o para fines distintos de los que motivaron su entrega.\n\n'
            + 'En caso de no alcanzar acuerdo en el seno de la Comisión Paritaria, y sin perjuicio de la competencia de la Jurisdicción Social, las partes firmantes del presente convenio acuerdan adherirse, para cuantas cuestiones litigiosas puedan suscitarse como consecuencia de la aplicación o interpretación del mismo, al sistema de resolución extrajudicial de conflictos.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 16, titulo: 'Comité de Empresa',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El Comité de Empresa es el órgano representativo y colegiado del conjunto del personal en la empresa o centros de trabajo de Binter Canarias, SA, para la defensa de sus intereses, constituéndose en cada centro de trabajo cuyo censo sea de cincuenta o más. En su defecto serían los Delegados de Personal.\n\n'
            + 'El Estatuto de los Trabajadores contempla la formación del Comité Intercentros cuando así lo pacten la Empresa y representación legal de las personas trabajadoras en convenio Colectivo. En ejecución de aquella previsión legal, acuerdan que para la constitución del Comité Intercentros será necesario el acuerdo entre las partes firmantes de este convenio, de conformidad con la legislación vigente, de cara a dotarlo de un reglamento de funcionamiento, previa decisión por mayoría simple de los componentes de los distintos Comités de Centro.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 17, titulo: 'Competencias del Comité de Empresa',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El Comité de Empresa tendrá las competencias previstas según la legislación laboral vigente y adicionalmente las siguientes competencias:\n\n'
            + '1. Recibir información, que le será facilitada trimestralmente, al menos, sobre la evolución general del sector económico al que pertenece Binter Canarias, sobre la situación de la producción y ventas de la entidad, sobre su programa de producción y evolución del empleo en la empresa.\n\n'
            + '2. Conocer el balance, la cuenta de resultados, la memoria y en el caso de que la Empresa revista la forma de sociedad por acciones o participaciones, de los demás documentos que se den a conocer a los socios, y en las mismas condiciones que estos.\n\n'
            + '3. Emitir informe con carácter previo a la ejecución por parte del empresario de las decisiones adoptadas por éste sobre las siguientes cuestiones:\na) Reestructuraciones de plantilla y ceses totales o parciales definitivos o temporales de aquella.\nb) Reducciones de jornada, así como traslado total o parcial de las instalaciones.\nc) Planes de formación profesional de la empresa, y todo tipo de subvenciones a los cuales pueda acogerse la empresa para dichos planes de formación.\nd) Implantación o revisión de sistemas de organización y control de trabajo.\ne) Estudio de tiempos, establecimientos de sistemas de primas, incentivos y valoración para la progresión en los puestos de trabajo.\n\n'
            + '4. Emitir informes cuando la fusión, absorción o modificación del «estátus» jurídico de la empresa suponga cualquier incidencia que afecte al volumen de empleo.\n\n'
            + '5. Conocer, los modelos de contrato de trabajo escritos que se utilicen en la empresa, así como de los documentos relativos a la terminación de la relación laboral.\nSe entregará copia básica de todos los contratos para su firma por los representantes de las personas trabajadoras, en los términos legalmente establecidos y antes de su remisión al Servicio Público de Empleo Estatal y Servicio Canario de Empleo.\n\n'
            + '6. Semestralmente la Empresa se reunirá con los representantes de las personas trabajadoras, para tratar la evolución de la Empresa, no obstante, podrá tener cuantas reuniones extraordinarias fuesen necesarias cuando las circunstancias así lo requieran.\n\n'
            + '7. Los representantes de las personas trabajadoras conocerán semestralmente al menos, las estadísticas sobre el índice de absentismo y sus causas, los accidentes de trabajo y enfermedades profesionales y sus consecuencias, los índices de siniestralidad, los estudios periódicos o especiales del medio ambiente laboral y los mecanismos de prevención que se utilizan.\n\n'
            + '8. Los representantes de las personas trabajadoras ejercerán una labor de:\na) De vigilancia en el cumplimiento de las normas vigentes en materia laboral, de Seguridad Social y empleo, así como el resto de los pactos, condiciones y usos de empresa en vigor, formulando, en su caso, las acciones legales oportunas ante el empresario y los organismos o tribunales competentes.\nb) De vigilancia y control de las condiciones de seguridad y salud en el desarrollo del trabajo en la empresa, con las particularidades previstas en este orden en la legislación vigente.\n\n'
            + '9. Participar, como se determine en este convenio colectivo, en la gestión de obras sociales que establezca la empresa, en beneficio del personal o de sus familiares.\n\n'
            + '10. Colaborar con la Dirección de la empresa en conseguir el establecimiento de cuantas medidas procuren el mantenimiento y el incremento de la productividad, de acuerdo con lo pactado en este convenio colectivo.\n\n'
            + '11. Los informes que deba emitir el comité, a tenor de las competencias reconocidas en este artículo, deben elaborarse en un plazo de quince días.\n\n'
            + '12. Los miembros del Comité de Empresa y Delegados Sindicales tendrán las competencias siguientes:\na) Legitimidad para la negociación colectiva con la Dirección de la Empresa, de convenios colectivos y pactos de similar naturaleza, en los términos legalmente establecidos.\nb) Participar en la comisión paritaria y cuantas comisiones se establezcan en este Convenio colectivo, y pactos de similar naturaleza.\nc) Los componentes de las Comisiones de trabajo serán elegidos de acuerdo a lo establecido en el artículo referente a la Comisión Paritaria de interpretación del convenio.\nd) Recibir comunicación de las faltas interpuestas calificadas como graves y muy graves.\n\n'
            + '13. La Empresa y el Comité, en cumplimiento de las previsiones del artículo 21 de la Ley 31/1995, de 8 de noviembre, han aprobado con fecha 19 de febrero de 2026 un Protocolo de actuación sobre las medidas de prevención de riesgos específicamente referidas a la actuación frente a catástrofes y otros fenómenos meteorológicos adversos. Se remiten al contenido del mismo en relación a la información que en lo sucesivo compartirán ante las situaciones que originen su activación en los términos previstos en aquel.\n\n'
            + '14. La Empresa informará al Comité de Empresa sobre «los parámetros, reglas e instrucciones en los que se basan los algoritmos o sistemas de inteligencia artificial que afectan a la toma de decisiones que puedan incidir en las condiciones de trabajo, el acceso y mantenimiento del empleo, incluida la elaboración de perfiles».\n\n'
            + '15. Los Comités de Empresa tendrán derecho «a recibir información, al menos anualmente, relativa a la aplicación en la empresa del derecho de igualdad de trato y de oportunidades entre mujeres y hombres, en la que deberá incluirse el registro previsto en el artículo 28.2 y los datos sobre la proporción de mujeres y hombres en los diferentes niveles profesionales, así como, en su caso, sobre las medidas que se hubieran adoptado para fomentar la igualdad entre mujeres y hombres en la empresa y además sobre la aplicación del Plan de igualdad, para facilitar la labor a los Comités de Empresa para la vigilancia del respeto y aplicación del principio de igualdad de trato y de oportunidades entre mujeres y hombres, especialmente en materia salarial».',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 18, titulo: 'Garantías del Comité de Empresa',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los miembros del Comité de Empresa y los Delegados de Personal, como representantes legales de las personas trabajadoras, tendrán las garantías previstas según la legislación laboral vigente y adicionalmente las siguientes garantías:\n\n'
            + 'a) Apertura de expediente contradictorio en el supuesto de sanciones por faltas graves o muy graves en el que serán oídos, aparte del interesado, el comité de empresa o representantes delegados de personal.\n\n'
            + 'b) Prioridad de permanencia en la Empresa o centro de trabajo respecto de las demás personas trabajadoras, en los supuestos de suspensión o extinción por causas tecnológicas o económicas.\n\n'
            + 'c) No ser despedido ni sancionado durante el ejercicio de sus funciones ni dentro del año siguiente a la expiración de su mandato, salvo en caso de que esta se produzca por revocación o dimisión, siempre que el despido o sanción se base en la acción del trabajador en el ejercicio de su representación, sin perjuicio, por tanto, de lo establecido en el Estatuto de los Trabajadores y Legislación vigente. Asimismo, no podrá ser discriminado en su promoción económica o profesional en razón, precisamente, del desempeño de su representación.\n\n'
            + 'd) Expresar, si se trata del Comité, colegiadamente, con libertad sus opiniones en las materias concernientes a la esfera de su representación, pudiendo publicar y distribuir, sin perturbar el normal desenvolvimiento del trabajo, las publicaciones de interés laboral o social, comunicando a la empresa.\n\n'
            + 'e) Disponer de un crédito horario de acuerdo a lo establecido en el Estatuto de los trabajadores, excepto el presidente/a o secretario/a que dispondrá mensualmente de un crédito adicional de 10 horas laborales a las establecidas en el Estatuto de los Trabajadores, pudiéndose acumular el total de horas al mes en uno o varios delegados del mismo sindicato, sin rebasar el máximo total.\n\n'
            + 'La comunicación de horas sindicales se hará por escrito a la dirección de la Empresa, con una antelación de 48 horas, salvo casos excepcionales.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 19, titulo: 'Capacidad y sigilo profesional',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Las descritas según la normativa laboral vigente.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 20, titulo: 'Secciones Sindicales',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            '1. El personal afiliado a un sindicato podrá, en el ámbito de la empresa o centros de trabajo:\n– Constituir Secciones Sindicales de conformidad con lo establecido en la legislación vigente.\n– Celebrar reuniones, previa notificación al empresario, recaudar cuotas y distribuir información sindical, fuera de las horas de trabajo y sin perturbar la actividad normal en la Empresa.\n– Recibir la información que le remita su sindicato.\n\n'
            + '2. Las Secciones Sindicales de los sindicatos con representación en el comité de Empresa estarán representadas por delegados sindicales, siempre y cuando él centro de trabajo tuviese 250 personas trabajadoras o más, en los términos establecidos en la legislación vigente.\nLos delegados sindicales disfrutarán de los derechos reconocidos en la legislación.\nEl Empresario procederá al descuento de la cuota sindical sobre los salarios y a la correspondiente transferencia a solicitud del sindicato del personal afiliado y previa conformidad de éste.\n\n'
            + '3. Los delegados sindicales deberán ser oídos por la Empresa previamente a la adopción de sanciones y despidos del personal afiliado a un Sindicato, siempre que al empresario le conste su condición de afiliado.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO III — CLASIFICACI\xd3N PROFESIONAL (Arts. 21–27)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_III', numero: 'III',
      titulo: 'Ingreso, clasificaci\xf3n profesional, progresi\xf3n y promoci\xf3n',
      articulos: [
        {
          numero: 21, titulo: 'Ingreso y periodo de prueba',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El ingreso de una persona trabajadora en la Compañía se realizará de acuerdo con las disposiciones legales vigentes y las establecidas en el presente convenio.\n\n'
            + 'Los ingresos se considerarán siempre hechos a título de prueba, incluyendo a tal fin la correspondiente cláusula de período de prueba en el contrato de trabajo, fijándose como tal los períodos establecidos por la legislación vigente.\n\n'
            + 'Estos períodos de prueba serán de aplicación a todas las personas trabajadoras independientemente del tipo de contrato que regule su relación laboral con la Compañía, y sin perjuicio de las excepciones legales y jurisprudenciales que procedan. Durante este período tanto la Empresa como la persona trabajadora podrá rescindir el contrato de trabajo, sin necesidad de preaviso y sin que ninguna de las partes tenga derecho a indemnización alguna.\n\n'
            + 'La empresa podrá utilizar la contratación para sustituir la cobertura de descansos, permisos, licencias, vacaciones y similares, en base a lo establecido en la normativa vigente, así como, para cubrir situaciones ocasionales, previsibles con duración reducida y delimitada.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 22, titulo: 'Contrataciones a tiempo completo',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Previa superación de las pruebas de aptitud y requisitos que determine la Empresa, los ingresos del personal se efectuarán en cada grupo laboral en el nivel que más se adecúe al puesto de trabajo a criterio de la dirección de la compañía, reflejándose en el contrato de trabajo.\n\n'
            + 'Las personas trabajadoras tendrán derecho a «no ser discriminadas directa o indirectamente para el empleo o, una vez empleados, por razones de estado civil, edad dentro de los límites marcados por esta ley, origen racial o étnico, condición social, religión o convicciones, ideas políticas, orientación sexual, identidad sexual, expresión de género, características sexuales, afiliación o no a un sindicato, por razón de lengua dentro del Estado español, discapacidad, así como por razón de sexo, incluido el trato desfavorable dispensado a mujeres u hombres por el ejercicio de los derechos de conciliación o corresponsabilidad de la vida familiar y laboral».\n\n'
            + 'Determinadas dichas condiciones, el personal de Binter Canarias, SA, podrá participar en las pruebas de ingreso en igualdad de oportunidades que el resto de aspirantes, manteniendo una prioridad para la cobertura del puesto en el caso de igualdad de puntuación con los aspirantes no pertenecientes a la Empresa. La empresa podrá utilizar cualquier modalidad de contratación existente en la legislación vigente.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 23, titulo: 'Contratación a tiempo parcial',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se podrá contratar personas trabajadoras a tiempo parcial de acuerdo a lo establecido en las disposiciones legales y en el presente convenio colectivo. El convenio colectivo afectará en los mismos términos a estos contratos y a los de tiempo completo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 24, titulo: 'Requisitos para el ingreso',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los requisitos para la incorporación de personal serán los que estime la dirección de la Compañía.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 25, titulo: 'Clasificaci\xf3n y niveles retributivos',
          estado: 'complementado', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El personal comprendido en el \xe1mbito del presente Convenio Colectivo quedar\xe1 encuadrado en alguno de los grupos profesionales definidos a continuaci\xf3n, en funci\xf3n de los criterios de clasificaci\xf3n profesional definidos, y a los que les corresponde las retribuciones que m\xe1s adelante se establecen.\n\n'
            + 'Los criterios para la definici\xf3n de los grupos profesionales son los siguientes:\n\n'
            + 'a) Conocimiento: factor para cuya valoraci\xf3n se tendr\xe1 en cuenta la formaci\xf3n b\xe1sica necesaria para cumplir correctamente los cometidos; as\xed como los conocimientos pr\xe1cticos que sean necesarios, en funci\xf3n de los t\xedtulos, certificados o cualificaciones necesarios para el desempe\xf1o de las tareas.\n\n'
            + 'b) Iniciativa: factor para cuya valoraci\xf3n se tendr\xe1 en cuenta el grado de dependencia jer\xe1rquica en el desempe\xf1o de las tareas o funciones a desarrollar.\n\n'
            + 'c) Autonom\xeda: factor para cuya valoraci\xf3n se tendr\xe1 en cuenta la mayor o menor dependencia de directrices o normas para la ejecuci\xf3n de las funciones.\n\n'
            + 'd) Responsabilidad: factor para cuya valoraci\xf3n se tendr\xe1 en cuenta el grado de autonom\xeda de acci\xf3n del titular de la funci\xf3n y el impacto de su actuaci\xf3n en los resultados de la empresa.\n\n'
            + 'e) Complejidad: factor cuya valoraci\xf3n estar\xe1 en funci\xf3n del mayor o menor n\xfamero y el mayor o menor grado de integraci\xf3n de los diversos factores enumerados en la tarea o puesto encomendado.\n\n'
            + 'f) Mando: factor para cuya valoraci\xf3n se tendr\xe1 en cuenta el grado de supervisi\xf3n y ordenaci\xf3n de funciones y tareas, la capacidad de interrelaci\xf3n, la naturaleza del colectivo y el n\xfamero de personas sobre las que se ejerce el mando.\n\n'
            + 'Grupo I: El personal administrativo est\xe1 comprendido en este grupo. El personal encuadrado en este grupo realiza funciones de soporte a la organizaci\xf3n en el desarrollo de la actividad de la empresa, principalmente en el \xe1mbito de las \xe1reas de gesti\xf3n corporativa, operaciones comerciales, servicios corporativos y en general cualquier funci\xf3n no operativa que no requiera cualificaci\xf3n espec\xedfica t\xe9cnica aeron\xe1utica.\n\n'
            + 'Grupo II: El personal t\xe9cnico est\xe1 comprendido en este grupo. El personal encuadrado en este grupo realiza tareas que requieren de titulaci\xf3n t\xe9cnica de grado medio o superior y/o cualificaci\xf3n t\xe9cnica aeron\xe1utica, o que desarrollan su actividad en \xe1reas de actividad de especial complejidad, direcci\xf3n o supervisi\xf3n.\n\n'
            + 'Grupo III: El personal de tripulaci\xf3n de cabina de pasajeros (TCP) est\xe1 comprendido en este grupo. En este grupo se encuadra el personal que presta sus servicios a bordo de las aeronaves de la empresa, en funciones de seguridad y asistencia a los pasajeros. Sus niveles retributivos van desde el N1 hasta el N5.\n\n'
            + 'Grupo IV: El personal de pilotos (CMD y COP) que opera aeronaves Embraer de la empresa est\xe1 comprendido en este grupo. Sus niveles retributivos van desde el N1 hasta el N6. El personal que no tenga habilitaci\xf3n de tipo Embraer vigente quedar\xe1 reubicado en el puesto que la empresa le asigne en funci\xf3n de las necesidades organizativas, sin perjuicio de lo establecido en este Convenio Colectivo.',
          resumen_operativo: 'Grupo IV (pilotos Embraer): N1–N6. Grupo III (TCP): N1–N5. El Acta de Cierre \xa7QUINTO introduce el nivel N1+ para ambos grupos. Consultar tablas salariales para las cuant\xedas por nivel.',
          afectaciones: [
            {
              fuente: 'Acta de Cierre 28/11/2025 — \xa7QUINTO',
              tipo: 'adiciona',
              texto: 'Se introduce el nivel N1+ para Grupos III y IV, con cuant\xeda y condiciones de acceso definidas en la propia Acta. Este nivel es adicional al texto original del art\xedculo.',
            },
          ],
          related: ['tablas_salariales'],
          faqs: [],
        },
        {
          numero: 26, titulo: 'Cambio de Nivel',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La promoción por cambio de nivel se realizará dentro de cada grupo laboral y en función de las necesidades existentes. Para ello, la Dirección determinará la necesidad de cobertura de una vacante en el nivel, estableciendo las pruebas y requisitos necesarios para la promoción y determinando, por libre designación, que habrá de cubrirla de entre todos aquellos que cumplan el perfil requerido para la posición.\n\n'
            + 'Los criterios de aplicación son los siguientes:\n\n'
            + 'a) La asignación de los niveles retributivos será facultad de la Compañía, quién asignará a cada persona trabajadora el nivel salarial que estime adecuado.\n\n'
            + 'b) La promoción por cambio de nivel se realizará dentro de cada grupo laboral y en función de las necesidades existentes. Para ello, la Dirección determinará la necesidad de cobertura de una vacante en el nivel, estableciendo las pruebas y requisitos necesarios para la promoción y determinando, por libre designación, la persona trabajadora que habrá de cubrirla de entre todos aquellos que hayan superado dichas pruebas y requisitos. Se entenderá como «vacante en el nivel» la posición que, por progresión, promoción o baja definitiva en la empresa de su anterior ocupante, quede disponible si la empresa no decide su amortización.\n\n'
            + 'c) Por el transcurso de los siguientes períodos de tiempo de permanencia en el nivel anterior:\nGrupo I: Del nivel A al B, progresará a los 2 años.\nGrupo II: Del nivel A al B, progresará a los 3 años.\nGrupo III: Del nivel 5 al 4, progresará a los 2 años.\nGrupo IV: Del nivel 6 al 5, progresará al año. Del nivel 5 al 4, progresará a los 2 años desde la consolidación del nivel 5.\n\n'
            + 'Para todos los Grupos Profesionales del presente convenio, además de lo anteriormente descrito, se podrá progresar al nivel inmediatamente superior siempre y cuando se cumplan los siguientes requisitos:\n– No constar sanción en su expediente sobre el desempeño de su trabajo durante el tiempo de permanencia en el nivel. En este caso la persona trabajadora progresará una vez prescrita la falta y cumplidos todos los demás requisitos.\n– Haber estado en situación de actividad al menos el 75% del tiempo total de trabajo, excepto en los casos de enfermedad o accidente que deberá permanecer el 50%. Las situaciones de accidente laboral o enfermedad profesional no afectarán a este cómputo.\n– Haber superado todos los cursos, pruebas y acciones formativas relacionadas con su trabajo a los que hubiera sido convocado en su nivel actual.\n– Disponer de un informe de valoración técnica y desempeño favorable.\n– Permanecer como mínimo 2 años en el nivel inmediatamente anterior.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 27, titulo: 'Preaviso de baja voluntaria',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Teniendo en cuenta el alto grado de especialización de los tripulantes y personal técnico (Grupo II, III, Grupo IV) y la importancia que en ellos tiene la formación tecnológica, técnica y de seguridad, con el elevado coste que ello implica, las peticiones de baja voluntaria deberán notificarse por escrito con un preaviso mínimo de tres meses para el personal del Grupo Profesional IV, 45 días para el personal del Grupo Profesional III y de 15 días para el Grupo Profesional II, a la fecha en que se pretenda causar baja.\n\n'
            + 'Asimismo, debe hacerse notar la importancia de la planificación de los servicios de vuelo, con la suficiente antelación para el correcto desarrollo de las operaciones y la atención al cliente.\n\n'
            + 'En el supuesto de que la persona trabajadora no observara el plazo de preaviso antes expuesto, la Compañía exigirá, y la persona trabajadora vendrá obligada a cumplir el pago de un día de salario por cada día de preaviso no observado. Las cantidades adeudadas se descontarán de la liquidación, y en el supuesto que el importe fuera negativo, se establece un plazo de treinta días para el abono de las cantidades pendientes por parte de la persona trabajadora.\n\n'
            + 'A los únicos efectos del cálculo de la indemnización por falta de preaviso, se entenderá como salario/día el equivalente a la remuneración total percibida por todos los conceptos fijos más la media de variables generada en los últimos seis meses divididos por 180. La media de variables será calculada con las variables generadas en los últimos 12 meses.\n\n'
            + 'Este preaviso también será aplicable en los casos de solicitud de excedencia voluntaria, y por cuidado de hijos y personas dependientes, salvo acuerdo entre empresa y persona trabajadora que reduzca este plazo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO IV — SITUACIONES (Arts. 28–34)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_IV', numero: 'IV',
      titulo: 'Situaciones',
      articulos: [
        {
          numero: 28, titulo: 'Comisión de Servicios',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se entiende por Comisión de Servicio el desplazamiento de la persona trabajadora a distinto lugar de su centro de trabajo habitual para la realización de un trabajo específico, regulado en las condiciones que se contienen en el presente convenio.\n\n'
            + 'El tiempo computará, desde el momento de partida del centro de trabajo hasta el regreso al mismo, siempre que no medien periodos de descanso durante dicha comisión, en cuyo caso se excluirán éstos del cómputo, y siempre que se regrese en el mismo día.\n\n'
            + 'No se computarán como períodos de descanso, 30 minutos en el desayuno, 45 minutos en la comida, y 45 minutos en la cena.\n\n'
            + 'Si la comisión de servicio durase más de un día el primer día computará desde la salida del centro de trabajo, y a partir del segundo, el tiempo de trabajo efectivo, incorporándose al turno correspondiente.\n\n'
            + 'Los plazos de preaviso para las personas que se encuentren en turno de libranza serán de 24 horas.\n\n'
            + 'En todas las situaciones que se tenga que permanecer fuera del centro de trabajo, por motivos laborales, los transportes y estancia serán por cuenta de la compañía.\n\n'
            + 'Para la designación de las personas que realicen comisiones de servicio programadas de más de un día, se establecerá un sistema de rotación entre las personas trabajadoras disponibles, evitando en lo posible variar los turnos asignados.\n\n'
            + 'Para todos los casos de desplazamiento, la vuelta de la persona trabajadora a su centro de trabajo se realizará en el primer vuelo siguiente a la hora de finalización del servicio.\n\n'
            + 'En todos los casos en que el alojamiento sea a cargo de la Compañía, los hoteles serán los establecidos con carácter general en la Empresa.\n\n'
            + 'Este artículo no es de aplicación al personal perteneciente al Grupos Laborales III y IV.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 29, titulo: 'Traslados',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Podrán realizarse:\na) A solicitud del interesado.\nb) Por acuerdo entre empresa y persona trabajadora.\n\n'
            + 'La Dirección de la Compañía, teniendo en cuenta las condiciones y aptitudes del personal, concederá preferencia de elección según grupo y la antigüedad. También se tendrán en cuenta las circunstancias familiares, condiciones de salud y otras similares.\n\n'
            + 'En el caso a) el interesado no tendrá derecho a indemnización alguna por traslado. En el b) se estará a lo convenido por las partes.\n\n'
            + 'En los supuestos de traslado, dispondrá de cuatro días para incorporarse a su nuevo destino, comenzando a computarse este plazo desde la fecha en que la persona trabajadora afectada cause baja en su anterior destino.\n\n'
            + 'En el caso de que no pudieran aplicarse los dos supuestos anteriores, el traslado forzoso se efectuará por orden inverso de antigüedad.\n\n'
            + 'Este artículo no es de aplicación para el personal perteneciente a los Grupos Laborales III, IV.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 30, titulo: 'Trabajos extraordinarios',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se entiende como trabajo extraordinario el conjunto de tareas encomendadas por la Dirección de la Compañía que requieran ampliar la jornada laboral diaria o la fijación de horarios de trabajo fuera de los establecidos en el presente convenio, con el fin de atender servicios distintos de la operativa de vuelos regulares de la compañía.\n\n'
            + 'No se considerarán trabajos extraordinarios aquellas tareas y/o prolongaciones de jornada que haya que realizar como consecuencia de incidencias que sean fruto del desarrollo de la operativa habitual y normal de la Compañía.\n\n'
            + 'Para aquellos trabajos extraordinarios que puedan presentarse y que por necesidades del servicio requieran urgencia, el personal designado se regirá por las siguientes directrices:\n1. La Compañía determinará los trabajos y desplazamientos necesarios y su realización.\n2. El comienzo de esos trabajos se hará lo más rápidamente posible seleccionando al personal más idóneo.\n3. El personal procurará terminar los trabajos lo antes posible, respetando los tiempos para las comidas, así como los descansos mínimos reglamentarios entre jornadas.\n4. En el caso de que se prevea la terminación de los trabajos dentro de la mitad de tiempo de descanso se procederá en lugar del disfrute del mismo a la finalización de los trabajos.\n\n'
            + 'Los trabajos extraordinarios se compensarán del siguiente modo:\n1. Si el trabajo extraordinario estuviese programado en un día de libranza, se le restituirá el día dejado de disfrutar.\n2. Si los trabajos extraordinarios se realizan en exceso de jornada ordinaria del mismo día y duran más de 4,5 horas, se compensará con un día de libranza. Si son iguales o inferiores, se compensarán con el tiempo equivalente.\n3. Si parte del trabajo extraordinario se realiza entre las 22 horas y las 6 horas, estas horas quedarán compensadas mediante los pluses de flexibilidad y prolongación de jornada, pactados a este fin, resultando de aplicación, en su caso, lo recogido en los apartados anteriores.\n\n'
            + 'Este artículo no es de aplicación a los trabajadores pertenecientes a los Grupos Laborales III, IV.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 31, titulo: 'Excedencia voluntaria',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La excedencia voluntaria es la que se concede por motivos particulares de la persona trabajadora. Para la concesión de la excedencia voluntaria será necesario que la persona trabajadora tenga en la Empresa una antigüedad mínima de un año.\n\n'
            + 'Para el disfrute de una excedencia voluntaria, deberá presentarse un preaviso de 3 meses de antelación a la fecha prevista de inicio, con la obligación por parte de la empresa de dar respuesta a dicha solicitud con al menos 45 días de antelación a la fecha solicitada por la persona trabajadora para el inicio de la excedencia.\n\n'
            + 'No existirá para la empresa obligación de conceder la excedencia voluntaria solicitada cuando existiera en tal situación un número superior al 6% del personal por función, no obstante, cualquier solicitud será analizada para su aprobación, independientemente del porcentaje establecido.\n\n'
            + 'Durante el tiempo que la persona trabajadora permanezca en excedencia voluntaria quedan en suspenso todos sus derechos y obligaciones y, consecuentemente, no percibirá remuneración alguna por ningún concepto, ni le será de cómputo el tiempo de excedencia para su antigüedad.\n\n'
            + 'La excedencia voluntaria se concederá por plazo no inferior a cuatro meses ni superior a cinco años. En ningún caso el tiempo de excedencia acumulada podrá superar el tope de 5 años.\n\n'
            + 'El excedente voluntario que no solicitara el reingreso quince días antes de la terminación del plazo de la excedencia o prórroga, en su caso, perderá el derecho a su puesto en la Empresa.\n\n'
            + 'El derecho a la excedencia voluntaria sólo podrá ser ejercitado otra vez por la misma persona trabajadora si han transcurrido dos años desde el final de la anterior excedencia.\n\n'
            + 'El personal excedente conserva un derecho preferente, sobre la contratación exterior, al reingreso en la Compañía en el grupo laboral en que se encontraba al producirse la excedencia.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 32, titulo: 'Excedencia por cuidado de hijos y de otros familiares',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El derecho a dicha excedencia será el previsto en el Estatuto de los Trabajadores a cuyos términos se ajustará su regulación por la Compañía.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 33, titulo: 'Excedencia forzosa',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Dará lugar a esta situación la designación o elección para un cargo público que imposibilite la asistencia al trabajo.\n\n'
            + 'La persona trabajadora tendrá derecho a la conservación del puesto de trabajo y al cómputo de antigüedad durante su vigencia.\n\n'
            + 'La reincorporación deberá solicitarse por el interesado en el mes siguiente al cese en el cargo público, perdiendo, en caso contrario, el derecho a su puesto en la Compañía.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 34, titulo: 'Jubilación forzosa',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se establece como motivo de extinción del contrato de trabajo el cumplimiento por la persona trabajadora de 68 años de edad, siempre que cumpla con los requisitos exigidos por la normativa de Seguridad Social para tener derecho al cien por ciento de la pensión ordinaria de jubilación en su modalidad contributiva.\n\n'
            + 'Esta medida queda vinculada, como objetivo coherente de política de empleo, al relevo generacional a través de la contratación indefinida y a tiempo completo de, al menos, una nueva persona trabajadora.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO V — JORNADA (Arts. 35–42)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_V', numero: 'V',
      titulo: 'Jornada',
      articulos: [
        {
          numero: 35, titulo: 'Jornada a tiempo completo',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Para el personal perteneciente al grupo laboral I y II, la jornada de trabajo de la Compañía será de 40 horas semanales de trabajo efectivo. La jornada anual se establece en 1.783 horas.\n\n'
            + 'El cómputo de la jornada se efectuará de tal forma que, en todo caso, tanto al comienzo como al final de la misma, la persona trabajadora se encuentre en su puesto de trabajo y dedicado a él.\n\n'
            + 'El personal con jornada continuada de ocho horas como mínimo dispondrá de treinta minutos diarios para el refrigerio y su disfrute se deberá atener a una determinada programación. Dicho tiempo se computará como tiempo efectivo de trabajo.\n\n'
            + 'Durante el tiempo de refrigerio, y en el resto de la jornada de trabajo, no se realizarán actos ajenos a la actividad laboral.\n\n'
            + 'Por el carácter de la actividad de la Empresa no se podrán paralizar los trabajos de carácter perentorio o de fuerza mayor.\n\n'
            + 'La jornada laboral de las personas trabajadoras de los Grupos Laborales III y IV se regula en las normas específicas para dichos grupos, que figuran en el presente convenio.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 36, titulo: 'Régimen de turnos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Debido a la actividad de la Empresa, se establecerán los turnos necesarios para cubrir todos los servicios, en función de la actividad programada.\n\n'
            + 'No obstante lo anterior, se podrán variar los turnos asignados por variación de las cargas de trabajo o cualquier otra causa suficientemente justificada, entendiendo como tal, aquella no prevista en el momento de la realización de la programación.\n\n'
            + 'En cualquier caso, se realizará una distribución equitativa en la asignación de los turnos de trabajo.\n\n'
            + 'En los casos en que así se requiera, los turnos serán cubiertos por grupos de personas trabajadoras. Dichos grupos de personas trabajadoras podrán ser cambiados en su totalidad o parcialmente, atendiendo a necesidades del servicio suficientemente justificadas, siempre que esta sea temporal.\n\n'
            + 'Si para la realización de un turno fuese requerido una persona trabajadora que estuviera disfrutando de un día libre se le restituirá el día dejado de disfrutar y se le dará un día libre adicional.\n\n'
            + 'No obstante, los turnos podrán modificarse en cualquier momento, por acuerdo entre los representantes de los trabajadores y la empresa.\n\n'
            + 'Si no existiese acuerdo en el plazo máximo de quince días se estará a lo dispuesto en la legislación vigente en cada momento.\n\n'
            + 'Este artículo no es de aplicación a los trabajadores pertenecientes a los Grupos Laborales III, IV. La programación de servicios está regulada en las normas específicas para dichos Grupos, que figuran en el presente convenio.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 37, titulo: 'Personal no sujeto a turnos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El horario de trabajo para el personal no sujeto a turnos ser\xe1 el siguiente: De lunes a jueves: 8,5 horas/d\xeda, entrada de 07:30 a 09:00 horas y salida de 16:00 a 17:30 horas. Los viernes: 6 horas, entrada de 8:00 a 09:00 horas y salida de 14:00 a 15:00 horas. En mes de agosto: 6 horas/d\xeda de lunes a viernes, entrada de 08:00 a 09:00 horas y salida de 14:00 a 15:00 horas. Las v\xedsperas de festivo el horario ser\xe1 igual al establecido para los viernes, salvo en el puente de diciembre que se realiza jornada habitual. No obstante, para el horario antes se\xf1alado, se garantizar\xe1 la cobertura del servicio.',
          resumen_operativo: 'Aplicable a personal de oficina no sujeto a turnos (principalmente Grupos I y II). No aplica a pilotos ni TCP en servicio activo de vuelo.',
          afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 38, titulo: 'Licencias retribuidas',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Compañía concederá licencias retribuidas, previo aviso con antelación mínima de 48 horas, salvo en casos de urgencia, y justificación, por las siguientes causas:\n\n'
            + 'a) Matrimonio: se concederá una licencia retribuida de quince días naturales ininterrumpidos.\n\n'
            + 'b) Lactancia: En el caso de los trabajadores, que tengan derecho a permiso de lactancia y se solicite su disfrute de manera acumulada, dicho permiso será concedido por un período de 14 días ininterrumpidos, siempre que las condiciones de actividad lo permitan.\n\n'
            + 'c) Cinco días por accidente o enfermedad graves, hospitalización o intervención quirúrgica sin hospitalización que precise reposo domiciliario del cónyuge, pareja de hecho o parientes hasta el segundo grado por consanguinidad o afinidad, incluido el familiar consanguíneo de la pareja de hecho, así como de cualquier otra persona distinta de las anteriores, que conviva con la persona trabajadora en el mismo domicilio y que requiera el cuidado efectivo de aquella, con la justificación que lo acredite.\n\n'
            + 'd) Funciones sindicales o de representación del personal: cuando las personas trabajadoras ostenten cargos sindicales o de representación del personal tendrán derecho, previa petición, a una licencia retribuida en los términos establecidos legal o convencionalmente.\n\n'
            + 'e) Traslado de domicilio habitual: como consecuencia del traslado de domicilio habitual, la persona trabajadora tendrá derecho a una licencia retribuida de un día de duración.\n\n'
            + 'f) El tiempo indispensable para el cumplimiento de un deber inexcusable de carácter público y/o personal, de conformidad con la legislación vigente.\n\n'
            + 'g) Como consecuencia de la boda de hijos, padres o hermanos, incluso parentesco político, se concederá una licencia retribuida de un día de duración, ampliable a dos en el caso de que ocurriese en distinto lugar del de residencia de la persona trabajadora y suponga un traslado a otra isla del Archipiélago Canario.\n\n'
            + 'h) Hasta cinco días como máximo al año para realización de exámenes o pruebas definitivas de aptitud para aquellos supuestos en que se trate de estudios de Bachiller o Ciclos Formativos y en el caso de estudios medios o superiores en Facultades o Escuelas Especiales o Profesionales, así como Centros que emitan certificaciones oficiales.\nEl personal que desee hacer uso de los días indicados deberá solicitarlo con la mayor antelación posible, junto con la presentación del comprobante de haber realizado la matriculación, ante su Dirección.\nPosteriormente, disfrutado el día o días, la persona trabajadora deberá justificar la realización del examen o exámenes.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 39, titulo: 'Licencia no retribuida',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Anualmente el personal de plantilla fija tendrá derecho a disfrutar de treinta días naturales de licencia sin sueldo durante el año, prorrogables a sesenta días siempre y cuando no haya sido solicitada anteriormente por una persona trabajadora de su mismo grupo laboral, para asuntos particulares, siempre que las necesidades de servicio lo permitan, pudiéndose fraccionar en cuatro períodos de licencia sin sueldo, no siendo en ninguno de los casos inferior a siete días de licencia sin sueldo.\n\n'
            + 'Para el Grupo Profesional III y IV, se podrá reducir el periodo mínimo de Licencia no retribuida a cinco días descontando proporcionalmente el tiempo de descanso.\n\n'
            + 'El límite máximo de concesión de licencias no retribuidas, en cuanto al número de personas trabajadoras que puedan disfrutarlas, será de uno por cada cuarenta o fracción dentro del respectivo grupo laboral.\n\n'
            + 'La petición de esta licencia deberá presentarse con acuse de recibo, como mínimo, con 45 días de antelación al comienzo del mes en que se desee disfrutar –salvo casos urgentes de excepcional gravedad– y, en todo caso, las vacaciones reglamentarias tendrán preferencia sobre las licencias no retribuidas.\n\n'
            + 'Se entenderá concedida la licencia si no hay respuesta por parte de la empresa 15 días antes del comienzo de la misma.\n\n'
            + 'La concesión de estas licencias se realizará por orden de petición y, en caso de coincidencia, por orden de antigüedad.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 40, titulo: 'Reducción de jornada',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Las reducciones de jornada por guarda legal se regularán de acuerdo a lo establecido en la legislación vigente.\n\n'
            + 'En el caso del personal adscrito a los Grupos Laborales III, IV, así como en el del personal perteneciente a los grupos laborales I y II considerados como personal a turnos, la reducción de jornada será efectiva mediante el disfrute de días libres adicionales agrupados estos en un solo bloque mensual y en la proporción correspondiente a la reducción de la actividad laboral. El cálculo del número de días de reducción de jornada se hará tomando como referencia la medía de los días de trabajo efectivo, a la cual se le aplicará el porcentaje de reducción que corresponda.\n\n'
            + 'En el caso de los Grupos Laborales III, IV, se tomará para el cálculo de la media de días de trabajo los que corresponda al personal de la flota, base y función del solicitante y será efectiva mediante el disfrute de días libres completos.\n\n'
            + 'Las peticiones se tendrán que mandar mínimo dos meses antes de su disfrute. De no poder ser atendidas todas por restricciones en la programación, se utilizará un sistema de puntos, igual que el sistema utilizado para las vacaciones, tomando como base las reducciones disfrutadas durante los dos años anteriores, y así progresivamente, para que se adapten lo mejor posible a la fecha solicitada. Todo ello salvo que se acuerde otra cosa entre la persona trabajadora y la empresa, salvo que el acuerdo pudiera afectar negativamente a otros interesados. En caso de coincidir en puntuación, se tomará, como criterio de desempate, la fecha de antigüedad administrativa, incluyendo la antigüedad adquirida en las empresas que hayan sido subrogadas.\n\n'
            + 'Para los períodos de diciembre-enero y julio-agosto se establece lo siguiente para los grupos III, IV:\n– Con el fin de distribuir los períodos de descanso de mayor valoración para todas las personas trabajadoras y garantizar que al menos se pueda disfrutar de uno de ellos, no podrán coincidir solicitudes de la misma persona durante el período 24/25 de Diciembre y 31 de Diciembre y 1 de Enero y el 5 y 6 de enero. Si se vuela alguno de estos períodos y se encuentra reducida en al menos el 50% en los meses de diciembre y enero consecutivos, se podrá librar dos de los periodos referidos.\nEn el período de julio-agosto, no podrán coincidir solicitudes de la misma persona en la última semana de julio y la primera de agosto.\n\n'
            + 'Para los Grupos Laborales III y IV, durante las reducciones de jornada, los tramos de las Horas de Vuelo se verán reducidos en igual proporción a la reducción de jornada aplicada. Este criterio será de aplicación también durante los periodos de vacaciones y de licencia no retribuida.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 41, titulo: 'Vacaciones',
          estado: 'complementado', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La duración de las vacaciones anuales será de 25 días laborales para el personal adscritos a los grupos laborales I y II, y de 30 días naturales para los grupos III y IV, fijando su disfrute de común acuerdo entre la Empresa y la persona trabajadora, pudiendo fraccionar su disfrute en cuatro períodos.\n\n'
            + 'Del total de días de vacaciones el personal podrá reservarse hasta 4 días para atender necesidades de carácter personal, que deberán ser concedidos por parte de la empresa si las necesidades del servicio no lo impiden y si existe un preaviso mínimo por parte del trabajador de 48 horas para los grupos I y II. Dicho periodo de preaviso será de 45 días para los grupos III, IV y V, siendo restados en las fechas en las que las partes acuerden. El resto de vacaciones podrá ser fraccionado en cuatro periodos.\n\n'
            + 'Serán vacacionales los 12 meses del año, y en aquellos períodos que coincidan con la mayor actividad de la Compañía se asegurará la atención de los trabajos.\n\n'
            + 'Si la persona trabajadora durante su período de disfrute de las vacaciones, se encontrase en situación de incapacidad temporal, deberá comunicarlo a la Compañía en el plazo de 24 horas. Los días de vacaciones dejados de disfrutar por esta causa, se disfrutarán cuando las necesidades del servicio lo permitan, y una vez acreditado el internamiento o enfermedad mediante el documento oficial de baja o certificación médica oficial si es en país extranjero.\n\n'
            + 'Las vacaciones anuales deberán disfrutarse en su totalidad antes del 31 de enero del año natural inmediatamente siguiente. «Cuando el periodo de vacaciones fijado en el calendario de vacaciones de la empresa al que se refiere el párrafo anterior coincida en el tiempo con una incapacidad temporal derivada del embarazo, el parto o la lactancia natural o con el periodo de suspensión del contrato de trabajo previsto en los apartados 4, 5 y 7 del artículo 48, se tendrá derecho a disfrutar las vacaciones en fecha distinta a la de la incapacidad temporal o a la del disfrute del permiso que por aplicación de dicho precepto le correspondiera, al finalizar el periodo de suspensión, aunque haya terminado el año natural a que correspondan. En el supuesto de que el periodo de vacaciones coincida con una incapacidad temporal por contingencias distintas a las señaladas en el párrafo anterior que imposibilite al trabajador disfrutarlas, total o parcialmente, durante el año natural a que corresponden, el trabajador podrá hacerlo una vez finalice su incapacidad y a partir siempre que no hayan transcurrido más de dieciocho meses del final del año en que se hayan originado, siempre que no hayan transcurrido más de dieciocho meses del final del año en que se hayan originado».\n\n'
            + 'En enero, las vacaciones del año anterior que resten por disfrutar tendrán prioridad respecto a las del año en curso.\n\n'
            + 'La persona trabajadora que cese en el transcurso del año tendrá derecho a percibir la parte proporcional de vacaciones que no haya disfrutado. En caso de haber disfrutado más tiempo del que le corresponda, deberá resarcir a la empresa del exceso, pudiendo ésta practicar el correspondiente descuento en la liquidación.\n\n'
            + 'La preferencia en la elección de vacaciones se efectuará de acuerdo con el sistema de puntuación que a continuación se detalla, y cuyo funcionamiento es el siguiente:\nPor cada día de vacaciones disfrutado se le asigna la puntuación que le corresponda según el mes de disfrute y para el siguiente año la persona trabajadora de menor puntuación y por ese orden se elegirán los períodos de disfrute, sumando los puntos que le correspondan de ese año para los sucesivos.\nEnero, 10 puntos 1.ª semana, 0 puntos resto de mes.\nFebrero, 0 puntos.\nMarzo, 2 puntos.\nAbril, 4 puntos.\nMayo, 5 puntos.\nJunio, 7 puntos.\nJulio, 11 puntos.\nAgosto, 12 puntos.\nSeptiembre, primera quincena, 10 puntos.\nSeptiembre, segunda quincena, 9 puntos.\nOctubre, 6 puntos.\nNoviembre, 0 puntos.\nDiciembre, primera quincena, 3 puntos.\nDiciembre, segunda quincena, 8 puntos.\n\n'
            + 'Adicionalmente todos los días de Semana Santa se considerarán puntuables con 8 puntos y todos los «puentes» del año con 2 puntos. Estos puntos adicionales serán sumados a los que correspondan en razón del mes en que se disfruten.\n\n'
            + 'La Empresa publicará antes del uno de Enero de cada año una programación con las vacaciones pactadas y los festivos correspondientes, salvo para los grupos III, IV que se programarán antes del uno de diciembre del año anterior.\n\n'
            + 'Al personal de nuevo ingreso se le asignará la puntuación del que la tenga más alta, más 20 puntos adicionales.\n\n'
            + 'Los puntos se publicarán anualmente antes de la programación de las vacaciones.\n\n'
            + 'Los plazos a solicitud, asignación y permutas estarán regulados internamente según los grupos y regímenes de jornada.\n\n'
            + 'Preferentemente, siempre y cuando por necesidades del servicio sea posible, se programará el día previo al inicio de vacaciones en la línea de inicio temprana y el primer día del inicio de actividad se le asignará la línea tardía.',
          resumen_operativo: 'Grupos III y IV: 30 d\xedas naturales, fraccionables en hasta 4 per\xedodos. El Acuerdo de Roster LPA modifica esto a 23 d\xedas laborales mientras el roster 5+3 est\xe9 vigente. Si el roster se suspende, vuelven los 30 d\xedas naturales del CC.',
          afectaciones: [
            {
              fuente: 'Acuerdo Roster LPA 28/11/2025 — QUINTO',
              tipo: 'sustituye (condicionado)',
              texto: 'Con el roster 5+3 activo en LPA, las vacaciones pasan a ser 23 d\xedas laborales. Si el roster se suspende o no se prorroga, se recuperan los 30 d\xedas naturales del CC.',
            },
          ],
          related: ['roster_lpa', 'roster_mad'],
          faqs: [],
        },
        {
          numero: 42, titulo: 'Otros permisos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Grupos I y II.\n\n'
            + 'Para los supuestos de consulta médica:\n– Deberán preavisar fehacientemente, con la máxima antelación posible, para que la empresa, si lo entendiera conveniente, pueda cubrir la ausencia de la persona trabajadora, siendo las horas en las que se efectúe la consulta médica retribuida y no recuperable.\n– La persona trabajadora deberá aportar el justificante médico antes de reiniciar el trabajo (expedido en papel con membrete oficial o de la clínica o facultativo privado) en el que conste el nombre y apellidos del facultativo, su número de colegiado, la fecha de expedición del justificante, la hora de inicio y de fin de la consulta médica.\n– No se tendrá derecho a disfrutar en este permiso si la hora del médico no coincidiera con la de la jornada de la persona trabajadora.\n– De coincidir las horas de permiso con el horario laboral se cifran en dos horas o el tiempo efectivo que certifique el facultativo.\n\n'
            + 'La Empresa podrá autorizar a la persona trabajadora a ausentarse de su puesto de trabajo durante su horario laboral para atender eventualidades médicas de los hijos. Esta ausencia no tendría carácter de licencia retribuida, por lo que tendrá que recuperarse el tiempo utilizado. La persona trabajadora deberá presentar justificante médico en los mismos términos de la consulta médica del mismo.\n\n'
            + 'Grupos III, IV.\n\n'
            + 'Dada las peculiaridades de las personas trabajadoras pertenecientes a estos grupos, para los supuestos de consultas médicas propias o de sus hijos, la empresa facilitará los días libres precisos dentro de sus 99 anuales, debiendo comunicarlo con la máxima antelación posible. Dicha solicitud no será considerada ROFF a efectos de la suma de puntos para solicitudes posteriores.\n\n'
            + 'Si la solicitud se realiza 15 días antes de la publicación de la programación, esta se entenderá concedida, siempre sujeta a la disponibilidad para cubrir dicha ausencia asegurando la continuidad de las operaciones. Si se solicita fuera de plazo, la empresa intentará, en la medida de lo posible, conceder el permiso para asistencia médica propia o de sus hijos a la persona trabajadora que lo solicite. En ambos casos, la negativa por parte de la empresa ha de ser por razones justificadas, las cuales se notificarán a solicitud del Comité de Empresa.\n\n'
            + '– La persona trabajadora deberá aportar, antes de reiniciar el trabajo, el justificante médico (expedido en papel con membrete oficial o de la clínica o facultativo privado) en el que conste el nombre y apellidos del facultativo, su número de colegiado, la fecha de expedición del justificante, la hora de inicio y de fin de la consulta médica.\n– No se tendrá derecho a disfrutar en este permiso si la hora del médico no coincidiera con la de la jornada de la persona trabajadora.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO VI — RETRIBUCIONES (Arts. 45–54)
    // Arts. 43–44: posici\xf3n no confirmada en \xedndice del BOE
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_VI', numero: 'VI',
      titulo: 'Retribuciones',
      _nota_cap: 'Arts. 43–44 pendientes de verificaci\xf3n en BOE.',
      articulos: [
        {
          numero: 43, titulo: 'Conciliación de la vida familiar y laboral',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Empresa promoverá, en todo su ámbito de gestión, todas aquellas medidas que legalmente se establezcan para la mejor conciliación de la vida personal y profesional y expresamente el cumplimiento de la Ley 39/1999, de 5 de noviembre, y modificaciones posteriores.\n\n'
            + 'Con este objetivo, la Empresa, cuando por razones personales o familiares, justificadas, reciba la petición de la persona trabajadora de incorporarse a otro centro de trabajo, una vez superadas las pruebas del proceso de selección, y de encontrarse en situación de empate con otro candidato externo o interno, concederá al solicitante preferencia para ocupar la primera vacante de su grupo profesional, categoría y tipo de trabajo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 44, titulo: 'Convivencia',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Todos los derechos reconocidos en cuanto a permisos y licencias y otros recogidos por la legislación para los cónyuges se entenderán también referidos a las situaciones de convivencia estable de parejas de hecho superior al año, debidamente acreditadas o, si hubiera en su localidad, debidamente registrada.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 45, titulo: 'Retribuci\xf3n Grupos I y II',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El personal encuadrado dentro de los Grupos I y II ser\xe1n retribuidos por los siguientes conceptos:\n\n'
            + 'A. Conceptos Retributivos Fijos.\n\n'
            + '– Salario base.\nLos salarios base establecidos para cada puesto tipo son los expresados en el anexo I. La cuant\xeda anual se abonar\xe1 en 12 mensualidades. El salario base incluye la retribuci\xf3n de la realizaci\xf3n de las horas nocturnas que se generen en el desarrollo de los trabajos programados.\n\n'
            + '– Pagas extraordinarias.\nLa Empresa abonar\xe1 dos pagas extraordinarias al a\xf1o: una en Junio y otra en Diciembre. La cuant\xeda de estas pagas vendr\xe1 determinada por la suma de una mensualidad de los conceptos Salario Base, Plus de Flexibilidad y Plus de Prolongaci\xf3n de Jornada, a la que se a\xf1adir\xe1, una mensualidad de Complemento Ad Personam, para el personal que lo tuvieran reconocido. El devengo de estas pagas ser\xe1 semestral; de enero a junio y de julio a diciembre, respectivamente.\n\nNo obstante, el personal podr\xe1 optar percibirlas mensualmente, de manera prorrateada, si al tiempo de su ingreso en la empresa o antes del 10 de Enero lo solicita por escrito, quedando definida esta opci\xf3n para lo sucesivo, salvo nuevo cambio con igual requerimiento.\n\n'
            + '– Plus de Flexibilidad.\nComplemento de puesto de trabajo que engloba, en su cuant\xeda, la disposici\xf3n de la persona trabajadora a adaptar su horario, en casos de necesidad, a los requerimientos del servicio, incluyendo per\xedodos fuera del horario laboral habitual, nocturnos y festivos. Su cuant\xeda se determina en el anexo I.\n\n'
            + '– Plus de Prolongaci\xf3n de Jornada.\nComplemento de puesto de trabajo que engloba, en su cuant\xeda, la realizaci\xf3n de prolongaciones de jornada, no devengando ninguna otra cantidad por tales situaciones. Su cuant\xeda se determina en el anexo I.\n\n'
            + 'B. Conceptos Compensatorios.\n\n'
            + '– Plus de Transporte.\nComplemento compensatorio que se devenga en concepto del uso del transporte a cargo de la persona trabajadora. Se distribuye en 11 mensualidades. No se devenga en per\xedodos de licencia por d\xeda completo, vacaciones, incapacidades temporales y similares.\n\n'
            + '– Dieta de Desplazamiento.\nImporte correspondiente a la compensaci\xf3n de gastos de manutenci\xf3n ocasionados por desplazamiento de la persona trabajadora fuera de la isla con al menos una pernocta. El coste del transporte y el alojamiento ser\xe1n por cuenta de la empresa.',
          resumen_operativo: 'Art\xedculo de retribuci\xf3n para personal no aeron\xe1utico (Grupos I y II). No aplica directamente a pilotos (G4) ni TCP (G3), que tienen sus propios art\xedculos (Arts. 46 y 47).',
          afectaciones: [], related: ['tablas_salariales'], faqs: [],
        },
        {
          numero: 46, titulo: 'Retribuci\xf3n Grupo III',
          estado: 'complementado', colectivos: ['SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los trabajadores encuadrados dentro del Grupo III ser\xe1n retribuidos por los siguientes conceptos:\n\n'
            + 'A. Conceptos Retributivos Fijos.\n\n'
            + '– Salario Base.\nEn el anexo I est\xe1 expresado el Salario Base y las Pagas Extra de los niveles del Grupo Laboral III, por funci\xf3n y nivel. El salario base incluye la retribuci\xf3n de la realizaci\xf3n de las horas nocturnas que se generen en el desarrollo de los trabajos programados, as\xed como todas aquellas funciones relacionadas con la preparaci\xf3n, desarrollo y fin del vuelo que no tengan asignada una retribuci\xf3n espec\xedfica, incluyendo todas las actividades accesorias y complementarias (tales como asistencia a cursos y otras actividades que no sean de vuelo). Se har\xe1 efectivo en 12 mensualidades.\n\n'
            + '– Pagas extraordinarias.\nLa Empresa abonar\xe1 dos pagas extraordinarias al a\xf1o: una en Junio y otra en Diciembre. La cuant\xeda de estas pagas vendr\xe1 determinada por una mensualidad del concepto Salario Base al que se a\xf1adir\xe1, una mensualidad de Complemento Ad Personam para los trabajadores que lo tuvieran reconocido. El devengo de estas pagas ser\xe1 semestral; de enero a junio y de julio a diciembre, respectivamente.\n\nNo obstante, el personal podr\xe1 optar percibirlas mensualmente, de manera prorrateada, si al tiempo de su ingreso en la empresa o antes del 10 de enero lo solicita por escrito, quedando definida esta opci\xf3n para lo sucesivo, salvo nuevo cambio con igual requerimiento.\n\n'
            + 'B. Conceptos Retributivos Variables.\n\n'
            + '– Hora de vuelo.\nVariable que se genera por el tiempo bloque comercial, de los saltos realizados durante la actividad de vuelo. El tiempo bloque comercial para cada sector ser\xe1 el que defina la Compa\xf1\xeda.\n\nLas horas de vuelo generadas en los d\xedas que la Compa\xf1\xeda establezca como \xabD\xedas de Especial Relevancia\xbb, tendr\xe1n asociado un precio por categor\xeda laboral recogido en la Tabla Salarial. Las horas de vuelo generadas en el resto de los d\xedas, tendr\xe1n un precio distinto y tambi\xe9n recogido en la Tabla Salarial.\n\nSe considerar\xe1n \xabD\xedas de Especial Relevancia\xbb aquellos d\xedas naturales, festivos o laborables, en los que concurren circunstancias que, por la propia naturaleza de la actividad aeron\xe1utica de la empresa, implican un incremento significativo, excepcional y/o estrat\xe9gico de la carga de trabajo, la demanda de servicios o una especial dedicaci\xf3n de los recursos humanos, y que por tanto, justifican la aplicaci\xf3n de condiciones laborales espec\xedficas, mejoradas o compensatorias para el personal afectado. A modo de ejemplo, ser\xe1n D\xedas de Especial Relevancia los periodos estivales, festivos nacionales, as\xed como cualquier otro d\xeda a criterio de la Compa\xf1\xeda.\n\nLos vuelos posicionales posteriores a una actividad de vuelo, generar\xe1n la variable de hora de vuelo por el tiempo bloque comercial de dicho/s vuelo/s posicional/es.\n\nLas horas de vuelo generadas durante los saltos realizados durante la actividad de vuelo que se haya programado o reprogramado invadiendo la franja horaria entre las 01:00-04:59 LT, tendr\xe1n la consideraci\xf3n de horas de vuelo nocturnas y se factorizar\xe1n por un coeficiente de 1,5 a efectos del c\xf3mputo total de horas de vuelo. La hora nocturna queda compensada con el coeficiente de ajuste de unidades de las horas computadas.\n\nTramos:\n– T1: A partir de la hora 60 hasta la hora 70.\n– T2: A partir de la hora 70 hasta la hora 80.\n– T3: A partir de la hora 80 hasta la hora 90.\n– T4: A partir de la hora 90.\n\nEstos tramos se establecen para un mes de referencia de 30 d\xedas, solo reducibles proporcionalmente por las condiciones o situaciones recogidas en este convenio colectivo.\n\n'
            + '– Imaginaria, Imaginaria en el Aeropuerto.\nImaginaria: per\xedodo de tiempo definido y notificado previamente durante el cual el miembro de la tripulaci\xf3n debe estar a disposici\xf3n del operador para que le asigne un vuelo, posicionamiento u otra actividad, sin que medie un per\xedodo de descanso.\n\nA efectos retributivos, cada unidad imaginaria programada, independientemente de su activaci\xf3n, generar\xe1 3 unidades de la variable Hora de vuelo. Adicionalmente, en caso de que se active la imaginaria y finalmente no genera actividad de vuelo, se percibir\xe1 igualmente una compensaci\xf3n econ\xf3mica equivalente al importe de la dieta nacional asociada a la categor\xeda y nivel profesional. Una vez activada la imaginaria y presentado en firmas el tripulante, la compa\xf1\xeda puede solicitar que este permanezca sin actividad asignada durante el periodo permitido por la normativa de actividad y descanso. En este caso se generar\xe1 una unidad de la variable hora de vuelo por cada dos horas sin actividad de vuelo que permanezca el tripulante en la sala de firmas.\n\nImaginaria en el aeropuerto: prestaci\xf3n de imaginaria en el aeropuerto.\nOtra imaginaria: prestaci\xf3n de imaginaria en casa o en un alojamiento adecuado.\n\nLa asignaci\xf3n del servicio de imaginaria deber\xe1 ser repartida de manera equitativa para todos los tripulantes en la programaci\xf3n mensual.\n\n'
            + '– Franco de servicio.\nAquel en que un tripulante puede ser requerido para realizar un vuelo o actividad imprevistos. Este deber\xe1 serle asignado y notificado antes del inicio del per\xedodo m\xednimo de descanso previo al comienzo del franco, por v\xeda telef\xf3nica o por la aplicaci\xf3n de gesti\xf3n de tripulaciones.\n\nSi no le ha sido asignada alguna actividad dentro del plazo marcado en el d\xeda franco de servicio, el tripulante quedar\xe1 relevado de la asignaci\xf3n de cualquier servicio, sin que el franco pase a libre. En el caso de que un tripulante sea requerido por necesidades de la operativa durante el mismo d\xeda del franco, ser\xe1 considerado como d\xeda libre volado, siendo su aceptaci\xf3n de car\xe1cter voluntario. En este caso no generar\xeda la variable de franco.\n\nA efectos retributivos, cada franco programado generar\xe1 2 unidades de la variable Horas de vuelo.\n\nEl franco no activable (FNA) por solicitud de ROFF no generar\xe1 esta variable. Si es a solicitud de la empresa se generar\xe1 esta variable.\n\n'
            + '– Libre Volado.\nUnidad variable generada por cada d\xeda que, estando programado inicialmente como libre, el tripulante realiza finalmente cualquier actividad encomendada por la empresa, de forma voluntaria.\n\nLos Libres Volados se clasifican de la siguiente manera:\n– Libre Volado 24 Horas: Aquel libre solicitado por la empresa al tripulante para una actividad con un intervalo de tiempo inferior a las 24 horas.\n– Libre Volado 24-72 Horas: Aquel libre solicitado por la empresa al tripulante para una actividad con un intervalo de tiempo superior a las 24 horas e inferior a las 72 horas.\n– Libre Volado 72 Horas: Aquel libre solicitado por la empresa al tripulante para una actividad con un intervalo de tiempo superior a las 72 horas.\n\nCada tipo de Libre Volado tiene asociado un importe reflejado en el anexo I, seg\xfan el grupo y categor\xeda laboral.\n\nPara determinar el orden de solicitud de los libres volados, la compa\xf1\xeda los asignar\xe1 mediante un sistema de puntos establecido.\n\n'
            + '– Plus de sobrecargo.\nUnidad variable que se devengar\xe1 por cada per\xedodo de actividad de vuelo seg\xfan tabla salarial vigente, en que un TCP desempe\xf1e la funci\xf3n de sobrecargo. Si la persona trabajadora ejerce la funci\xf3n de sobrecargo como m\xednimo el 75% de su actividad realizada de vuelo, el resto de d\xedas de vuelo del mes en curso hasta llegar al 100% se abonar\xe1 la variable de sobrecargo, independientemente de la funci\xf3n que realice.\n\n'
            + '– Media de variables.\nAsimismo, se devengar\xe1, durante el per\xedodo vacacional disfrutado y en proporci\xf3n al mismo, un concepto salarial denominado \xabMedia de variables\xbb con el promedio de lo percibido en los 12 meses naturales inmediatamente anteriores por todos los conceptos variables establecidos en el convenio colectivo. El importe de dicha variable, correspondiente a 1 d\xeda de vacaciones, ser\xe1 el resultado de dividir entre 30 el referido promedio. Las cantidades se liquidar\xe1n en la n\xf3mina del mes siguiente al disfrute de las vacaciones, de manera proporcional a los d\xedas de vacaciones disfrutados.\n\n'
            + '– Uprouting.\nPor cada hora bloque comercial adicional realizada por un tripulante tras haber realizado el n\xfamero de saltos inicialmente programado, siempre y cuando finalice su actividad posteriormente a la hora de firma original, se generar\xe1n 1,5 unidades de la variable de hora de vuelo.\n\n'
            + '– Split Duty o Escala Programada.\nPor cada Split Duty o escala superior a las 2,5 horas que afecte al tripulante, se generar\xe1 una unidad de la variable de hora de vuelo. Por cada Split Duty o escala superior a las 5 horas que afecte el tripulante, se generar\xe1 dos unidades de la variable de hora de vuelo.\n\n'
            + 'C. Conceptos Compensatorios.\n\n'
            + '– Dieta de Vuelo.\nImporte correspondiente a la compensaci\xf3n de los gastos de manutenci\xf3n ocasionados por cada per\xedodo de actividad de vuelo que le haya sido asignado como tripulante en vuelo, que se determina en las tablas salariales, defini\xe9ndose como dieta nacional, suplemento dieta internacional, suplemento dieta nacional con pernocta y suplemento dieta internacional con pernocta.\n\nSe devengar\xe1 una dieta de vuelo por cada periodo de actividad de vuelo que se realice un servicio o se cancele despu\xe9s de la firma.\n\nAsimismo, para los vuelos posicionales como \xfanica actividad en el d\xeda, se devengar\xe1 una dieta de vuelo; siempre y cuando est\xe9n motivados por la realizaci\xf3n de actividad de vuelo, el d\xeda anterior o posterior al vuelo posicional.\n\nIncluye los gastos de desayuno, almuerzo y cena de los tripulantes por cada d\xeda de trabajo efectivo.\n\n'
            + '– Dieta de Desplazamiento.\nImporte correspondiente a la compensaci\xf3n de gastos de manutenci\xf3n ocasionados por desplazamiento del trabajador fuera de la isla, en funciones ajenas a la actividad de vuelo, que en el caso de desplazamientos interinsulares se devengar\xe1 solo en caso de pernocta, defini\xe9ndose en la tabla salarial valores diferentes para destinos interinsulares canarios, nacionales e internacionales.\n\n'
            + '– Plus de Transporte.\nEs el concepto que compensa los gastos realizados para traslados y aparcamiento, con ocasi\xf3n del servicio en los trayectos terrestres ciudad-aeropuerto-ciudad, en la base del tripulante, a distribuir en 11 mensualidades.\n\nNo se devengar\xe1 en los per\xedodos de licencias ni en los periodos de reducciones de jornada por d\xeda completo, vacaciones, incapacidades temporales y similares.',
          resumen_operativo: 'Retribuci\xf3n completa del Grupo III (TCP/SCC). Define HV con tramos T1-T4 (desde hora 60), imaginaria (3 HV programadas), franco (2 HV), libre volado voluntario (3 modalidades), plus de sobrecargo (umbral 75%), uprouting (1,5 HV/hora extra) y split duty.',
          afectaciones: [
            {
              fuente: 'Acta de Cierre 28/11/2025 — \xa7S\xc9PTIMO (MAD)',
              tipo: 'adiciona (condicionado)',
              texto: 'En la base MAD, el valor de todas las HV (T1-T4) se incrementa un 20% mientras la productividad media colectiva se mantenga en 11 d\xedas de vuelo/tripulante. No cae autom\xe1ticamente: requiere revisi\xf3n formal si var\xeda.',
            },
          ],
          related: ['tablas_salariales', 'imaginaria', 'libre_volado', 'horas_vuelo'],
          faqs: [],
        },
        {
          numero: 47, titulo: 'Retribuci\xf3n Grupo IV',
          estado: 'complementado', colectivos: ['CMD','COP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los trabajadores encuadrados dentro del Grupo IV ser\xe1n retribuidos por los siguientes conceptos:\n\n'
            + 'A. Conceptos Retributivos Fijos.\n\n'
            + '– Salario Base.\nEn el anexo I est\xe1 expresado el Salario Base y las Pagas Extra de los niveles del Grupo Laboral IV, por funci\xf3n y nivel. El salario base incluye la retribuci\xf3n de la realizaci\xf3n de las horas nocturnas que se generen en el desarrollo de los trabajos programados, as\xed como todas aquellas funciones relacionadas con la preparaci\xf3n, desarrollo y fin del vuelo que no tengan asignada una retribuci\xf3n espec\xedfica, incluyendo todas las actividades accesorias y complementarias (tales como asistencia a cursos y otras actividades que no sean de vuelo). Se har\xe1 efectivo en 12 mensualidades.\n\n'
            + '– Pagas extraordinarias.\nLa Empresa abonar\xe1 dos pagas extraordinarias al a\xf1o: una en Junio y otra en Diciembre. La cuant\xeda de estas pagas vendr\xe1 determinada por una mensualidad del concepto Salario Base al que se a\xf1adir\xe1, una mensualidad de Complemento Ad Personam para los trabajadores que lo tuvieran reconocido. El devengo de estas pagas ser\xe1 semestral; de enero a junio y de julio a diciembre, respectivamente.\n\nNo obstante, el personal podr\xe1 optar percibirlas mensualmente, de manera prorrateada, si al tiempo de su ingreso en la empresa o antes del 10 de enero lo solicita por escrito, quedando definida esta opci\xf3n para lo sucesivo, salvo nuevo cambio con igual requerimiento.\n\n'
            + 'B. Conceptos Retributivos Variables.\n\n'
            + '– Hora de vuelo.\nVariable que se genera por el tiempo bloque comercial, de los saltos realizados durante la actividad de vuelo. El tiempo bloque comercial para cada sector ser\xe1 el que defina la Compa\xf1\xeda.\n\nLos vuelos posicionales posteriores a una actividad de vuelo, generar\xe1n la variable de hora de vuelo por el tiempo bloque comercial de dicho/s vuelo/s posicional/es.\n\nLas horas de vuelo generadas durante los saltos realizados durante la actividad de vuelo que se haya programado o reprogramado invadiendo la franja horaria entre las 01:00-04:59 LT, tendr\xe1n la consideraci\xf3n de horas de vuelo nocturnas y se factorizar\xe1n por un coeficiente de 1,5 a efectos del c\xf3mputo total de horas de vuelo. La hora nocturna queda compensada con el coeficiente de ajuste de unidades de las horas computadas.\n\nTramos:\n– T1: A partir de la hora 60 hasta la hora 70.\n– T2: A partir de la hora 70 hasta la hora 80.\n– T3: A partir de la hora 80 hasta la hora 90.\n– T4: A partir de la hora 90.\n\nEstos tramos se establecen para un mes de referencia de 30 d\xedas, solo reducibles proporcionalmente por las condiciones o situaciones recogidas en este convenio colectivo.\n\n'
            + '– Imaginaria, Imaginaria en el Aeropuerto.\nImaginaria: per\xedodo de tiempo definido y notificado previamente durante el cual el miembro de la tripulaci\xf3n debe estar a disposici\xf3n del operador para que le asigne un vuelo, posicionamiento u otra actividad, sin que medie un per\xedodo de descanso.\n\nA efectos retributivos, cada unidad imaginaria programada, independientemente de su activaci\xf3n, generar\xe1 3 unidades de la variable Hora de vuelo. Adicionalmente, en caso de que se active la imaginaria y finalmente no genera actividad de vuelo, se percibir\xe1 igualmente una compensaci\xf3n econ\xf3mica equivalente al importe de la dieta nacional asociada a la categor\xeda y nivel profesional. Una vez activada la imaginaria y presentado en firmas el tripulante, la compa\xf1\xeda puede solicitar que este permanezca sin actividad asignada durante el periodo permitido por la normativa de actividad y descanso. En este caso se generar\xe1 una unidad de la variable hora de vuelo por cada dos horas sin actividad de vuelo que permanezca el tripulante en la sala de firmas.\n\nImaginaria en el aeropuerto: prestaci\xf3n de imaginaria en el aeropuerto.\nOtra imaginaria: prestaci\xf3n de imaginaria en casa o en un alojamiento adecuado.\n\nLa asignaci\xf3n del servicio de imaginaria deber\xe1 ser repartida de manera equitativa para todos los tripulantes en la programaci\xf3n mensual.\n\n'
            + '– Franco de servicio.\nAquel en que un tripulante puede ser requerido para realizar un vuelo o actividad imprevistos. Este deber\xe1 serle asignado y notificado antes del inicio del per\xedodo m\xednimo de descanso previo al comienzo del franco, por v\xeda telef\xf3nica o por la aplicaci\xf3n de gesti\xf3n de tripulaciones.\n\nSi no le ha sido asignada alguna actividad dentro del plazo marcado en el d\xeda franco de servicio, el tripulante quedar\xe1 relevado de la asignaci\xf3n de cualquier servicio, sin que el franco pase a libre. En el caso de que un tripulante sea requerido por necesidades de la operativa durante el mismo d\xeda del franco, ser\xe1 considerado como d\xeda libre volado, siendo su aceptaci\xf3n de car\xe1cter voluntario. En este caso no generar\xeda la variable de franco.\n\nA efectos retributivos, cada franco programado generar\xe1 2 unidades de la variable Horas de vuelo.\n\nEl franco no activable (FNA) por solicitud de ROFF no generar\xe1 esta variable. Si es a solicitud de la empresa se generar\xe1 esta variable.\n\n'
            + '– Libre Volado.\nUnidad variable generada por cada d\xeda que, estando programado inicialmente como libre, el tripulante realiza finalmente cualquier actividad encomendada por la empresa.\n\nLos Libres Volados se clasifican de la siguiente manera:\n– Libre Volado 24 Horas: Aquel libre solicitado por la empresa al tripulante para una actividad con un intervalo de tiempo inferior a las 24 horas.\n– Libre Volado 24-72 Horas: Aquel libre solicitado por la empresa al tripulante para una actividad con un intervalo de tiempo superior a las 24 horas e inferior a las 72 horas.\n– Libre Volado 72 Horas: Aquel libre solicitado por la empresa al tripulante para una actividad con un intervalo de tiempo superior a las 72 horas.\n\nCada tipo de Libre Volado tiene asociado un importe reflejado en el anexo I, seg\xfan el grupo y categor\xeda laboral.\n\nPara determinar el orden de solicitud de los libres volados, la compa\xf1\xeda los asignar\xe1 mediante un sistema de puntos establecido.\n\n'
            + '– Uprouting.\nPor cada hora bloque comercial adicional realizada por un tripulante tras haber realizado el n\xfamero de saltos inicialmente programado, siempre y cuando finalice su actividad posteriormente a la hora de firma original, se generar\xe1n 1,5 unidades de la variable de hora de vuelo.\n\n'
            + '– Split Duty o Escala Programada.\nPor cada Split Duty o escala superior a las 2,5 horas que sufra el tripulante, se generar\xe1 una unidad de la variable de hora de vuelo. Por cada Split Duty o escala superior a las 5 horas que sufra el tripulante, se generar\xe1 dos unidades de la variable de hora de vuelo.\n\n'
            + '– Media de variables.\nAsimismo, se devengar\xe1, durante el per\xedodo vacacional disfrutado y en proporci\xf3n al mismo, un concepto salarial denominado \xabMedia de variables\xbb con el promedio de lo percibido en los 12 meses naturales inmediatamente anteriores por todos los conceptos variables establecidos en el convenio colectivo. El importe de dicha variable, correspondiente a 1 d\xeda de vacaciones, ser\xe1 el resultado de dividir entre 30 el referido promedio. Las cantidades se liquidar\xe1n en la n\xf3mina del mes siguiente al disfrute de las vacaciones, de manera proporcional a los d\xedas de vacaciones disfrutados.\n\n'
            + 'C. Conceptos Compensatorios.\n\n'
            + '– Dieta de Vuelo.\nImporte correspondiente a la compensaci\xf3n de los gastos de manutenci\xf3n ocasionados por cada per\xedodo de actividad de vuelo que le haya sido asignado como tripulante t\xe9cnico en vuelo, que se determina en las tablas salariales, defini\xe9ndose como dieta nacional, suplemento dieta internacional, suplemento dieta nacional con pernocta y suplemento dieta internacional con pernocta.\n\nSe devengar\xe1 una dieta de vuelo por cada periodo de actividad de vuelo que se realice un servicio o se cancele despu\xe9s de la firma.\n\nAsimismo, para los vuelos posicionales como \xfanica actividad en el d\xeda, se devengar\xe1 una dieta de vuelo; siempre y cuando est\xe9n motivados por la realizaci\xf3n de actividad de vuelo, el d\xeda anterior o posterior al vuelo posicional.\n\nIncluye los gastos de desayuno, almuerzo y cena de los tripulantes por cada d\xeda de trabajo efectivo.\n\n'
            + '– Dieta de Desplazamiento.\nImporte correspondiente a la compensaci\xf3n de gastos de manutenci\xf3n ocasionados por desplazamiento del trabajador fuera de la isla, en funciones ajenas a la actividad de vuelo, que en el caso de desplazamientos interinsulares se devengar\xe1 solo en caso de pernocta, defini\xe9ndose en la tabla salarial valores diferentes para destinos interinsulares canarios, nacionales e internacionales.\n\n'
            + '– Plus de Transporte.\nEs el concepto que compensa los gastos realizados para traslados y aparcamiento, con ocasi\xf3n del servicio en los trayectos terrestres ciudad-aeropuerto-ciudad, en la base del tripulante, a distribuir en 11 mensualidades.\n\nNo se devengar\xe1 en los per\xedodos de licencias ni en los periodos de reducciones de jornada por d\xeda completo, vacaciones, incapacidades temporales y similares.',
          resumen_operativo: 'Retribuci\xf3n completa del Grupo IV (CMD/COP). HV con tramos T1-T4 (desde hora 60), imaginaria (3 HV), franco (2 HV), libre volado (3 modalidades — aceptaci\xf3n no expl\xedcitamente voluntaria en G4, a diferencia de G3), uprouting (1,5 HV/hora extra) y split duty. Sin plus de sobrecargo (exclusivo G3).',
          afectaciones: [
            {
              fuente: 'Acta de Cierre 28/11/2025 — \xa7S\xc9PTIMO (MAD)',
              tipo: 'adiciona (condicionado)',
              texto: 'En la base MAD, el valor de todas las HV (T1-T4) se incrementa un 20% mientras la productividad media colectiva se mantenga en 11 d\xedas de vuelo/tripulante. No cae autom\xe1ticamente: requiere revisi\xf3n formal si var\xeda.',
            },
          ],
          related: ['tablas_salariales', 'imaginaria', 'libre_volado', 'horas_vuelo', 'productividad'],
          faqs: [],
        },
        {
          numero: 48, titulo: 'Dirección por objetivos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se establece un Incentivo Económico Anual Bruto de importe variable para el personal incluido en los Grupos III y IV durante la vigencia del convenio, el cual será proporcional al tiempo efectivo de trabajo. Para el personal del Grupo III, se fija un importe de 2.500 euros brutos anuales para quienes ejerzan la función de sobrecargo el 75% o más de cada mes, y de 1.500 euros brutos anuales para el resto del personal del grupo. En cuanto al personal del Grupo IV, el incentivo será de 10.000 euros brutos anuales para Comandantes, 2.500 euros brutos anuales para Copilotos de los niveles 1 al 4, y 1.500 euros brutos anuales para Copilotos de los niveles 5 y 6, siempre condicionado al cumplimiento de los objetivos anuales fijados. Estos objetivos serán definidos por la Dirección de la Compañía, previa información y diálogo con la Representación de los Trabajadores. La retribución variable ligada a objetivos tendrá carácter no consolidable y su devengo estará condicionado a la definición y comunicación previa de dichos objetivos para cada periodo. Finalmente, para el cálculo del porcentaje de concesión, se tendrá en cuenta el nivel de cumplimiento de dichos objetivos, con una variabilidad de concesión que oscilará entre el 0% y el 130%.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 49, titulo: 'Enfermedad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'En el supuesto de incapacidad temporal la persona trabajadora comunicar\xe1 a su jefatura su ausencia.\n\n'
            + '– En los casos en que la persona trabajadora permanezca en situaci\xf3n de baja por accidente de trabajo o enfermedad profesional, la Compa\xf1\xeda complementar\xe1 las prestaciones de la Seguridad Social, hasta el l\xedmite m\xe1ximo del 100% de los conceptos retributivos fijos.\n\n'
            + '– En los casos en que el personal permanezca en situaci\xf3n de baja por enfermedad com\xfan o accidente no laboral, la Compa\xf1\xeda complementar\xe1 las prestaciones de la Seguridad Social, hasta el l\xedmite m\xe1ximo del 100% de los conceptos retributivos fijos hasta los 6 meses, siempre y cuando no haya acumulado m\xe1s de dos bajas en los 3 meses inmediatamente anteriores. En cualquier caso, si el servicio m\xe9dico de la empresa, teniendo en cuenta los informes m\xe9dicos, considera que la enfermedad com\xfan o accidente no laboral es de car\xe1cter grave, la empresa seguir\xe1 abonando el complemento de los conceptos retributivos fijos hasta el 100%; en otro caso, se valorar\xe1 la posibilidad de hacerlo, determinando, en su caso, el \xe1mbito temporal de la medida. Para el personal de producci\xf3n, grupo profesional III y IV, no complementar\xe1 los siete primeros d\xedas de la baja m\xe9dica por necesidades productivas y de organizaci\xf3n del servicio. Esta medida se establece para garantizar la continuidad operativa y la planificaci\xf3n adecuada de los vuelos y servicios t\xe9cnicos.\n\n'
            + '– Las personas trabajadoras que est\xe9n de baja por alguna de estas incapacidades temporales acudir\xe1n a las citas del Servicio M\xe9dico de la empresa para valorar la situaci\xf3n de IT (salvo excepciones de situaci\xf3n m\xe9dica, debidamente justificadas documentalmente, que le imposibilite acudir). En caso de no acudir a esta/s cita/s, la empresa se reserva el derecho de dejar de abonar el complemento de incapacidad mencionado.',
          resumen_operativo: 'G3 y G4: los 7 primeros d\xedas de IT por enfermedad com\xfan o accidente no laboral NO se complementan. Del d\xeda 8 hasta 6 meses: 100% de fijos (m\xe1ximo 2 bajas previas en 3 meses). Accidente laboral/enfermedad profesional: 100% desde el primer d\xeda.',
          afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 50, titulo: 'Días festivos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Para el personal a turnos de los grupos I y II, en las jornadas programadas de trabajo en alguno de los 14 días festivos oficiales, el trabajador percibirá un complemento «festivo trabajado» que le corresponda según las tablas salariales además del día libre compensatorio.\n\n'
            + 'La programación de los días libres compensatorios de dichos festivos se realizará de mutuo acuerdo entre Empresa y persona trabajadora en los seis meses siguientes al día festivo.\n\n'
            + 'Para los grupos profesionales III y IV, las horas de vuelo generadas durante los saltos realizados durante la actividad de vuelo que se haya programado o reprogramado los días 25 de diciembre, 1 de enero y 6 de enero se factorizarán por un coeficiente de 1,5 a efectos del cómputo total de horas de vuelo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 51, titulo: 'Seguro de vida e incapacidad permanente',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Binter Canarias SA mantendrá contratado un seguro de vida para el personal. En todo caso, la compañía abonará las primas, siempre y cuando la persona trabajadora sea aceptada por la compañía aseguradora, para asegurar un capital de 75.126 euros por trabajador en caso de gran incapacidad, Incapacidad Permanente Absoluta, Incapacidad Permanente Total y fallecimiento de la persona trabajadora. En los supuestos en que se produzca la declaración de la Incapacidad con reserva de puesto de trabajo y suspensión a los efectos del 48.2.º ET no existirá derecho a su percibo. Tampoco en los supuestos de ajustes razonables en el puesto que permitan la reincorporación en el mismo puesto ni en los de reubicación en una vacante, regulados en el artículo 49.1.º n) ET.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 52, titulo: 'Seguro médico privado',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Igualmente, para el personal de más de 6 meses de antigüedad, la empresa suscribirá con la compañía aseguradora y en las condiciones que considere oportunas, un seguro médico privado para aquellas personas trabajadoras que estén interesados en adherirse a este beneficio. La empresa, siempre y cuando la persona trabajadora sea aceptada por la compañía aseguradora, abonará el 50% del coste y la persona trabajadora asumirá el otro 50%, que será descontado de su nómina.\n\n'
            + 'Si la persona trabajadora tuviese suscrita una póliza similar podrá optar entre integrarse en la de la empresa o percibir, en su nómina el mismo importe que abona la empresa para el personal adherido, tras justificación del abono de la anualidad correspondiente de la póliza que tiene concertada.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 53, titulo: 'Seguro de p\xe9rdida de licencia',
          estado: 'vigente', colectivos: ['CMD','COP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La empresa suscribir\xe1 un seguro colectivo de vida para el Grupo IV que cubra la p\xe9rdida de la licencia de vuelo por causas de salud, una vez transcurridos seis meses de incapacidad temporal reconocida. El importe de la prima del seguro se distribuir\xe1 al 50% entre la empresa y el trabajador, siendo la parte correspondiente al trabajador descontada mensualmente de su n\xf3mina.\n\n'
            + 'La empresa informar\xe1 a la representaci\xf3n de los trabajadores de las condiciones del seguro suscrito. Como alternativa a la suscripci\xf3n del seguro colectivo, el trabajador podr\xe1 optar por contratar por su cuenta un seguro privado de p\xe9rdida de licencia, asumiendo la empresa el 50% de su coste, con el l\xedmite del importe que hubiera correspondido al seguro colectivo.',
          resumen_operativo: 'Exclusivo G4 (CMD/COP). Prima 50/50 empresa-trabajador, descontada en n\xf3mina. Se activa tras 6 meses de IT reconocida. Alternativa: seguro privado con 50% a cargo de empresa (hasta el coste del colectivo).',
          afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 54, titulo: 'Plan de pensiones',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los trabajadores que tengan una antig\xfcedad m\xednima de un a\xf1o en la empresa podr\xe1n adherirse al Plan de Pensiones de Empresas Vinculadas Sistema Binter, en los t\xe9rminos y condiciones establecidos en el Reglamento del mismo.\n\n'
            + 'El personal procedente de Naysa que haya sido subrogado a Binter Canarias, S.A., mantendr\xe1, en los t\xe9rminos del Reglamento, las aportaciones efectuadas con anterioridad a la subrogaci\xf3n.\n\n'
            + 'Las cuant\xedas de las aportaciones de la empresa y del trabajador al Plan de Pensiones ser\xe1n las establecidas en el Reglamento del mismo.',
          resumen_operativo: 'Acceso con 1 a\xf1o de antig\xfcedad. Cuant\xedas de aportaci\xf3n en el Reglamento del Plan (no en el CC). El personal Naysa subrogado conserva aportaciones previas.',
          afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO VII — SEGURIDAD Y SALUD (Arts. 55–56)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_VII', numero: 'VII',
      titulo: 'Seguridad y salud en el trabajo',
      articulos: [
        {
          numero: 55, titulo: 'Seguridad y salud',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'En cuantas materias afecten a Seguridad y salud en el trabajo, serán de aplicación las disposiciones contenidas en la legislación vigente. A tales efectos se creará un Comité que se denominará de Seguridad y Salud cuya composición será paritaria o se planificarán reuniones con el Delegado de Prevención, según sea el caso.\n\n'
            + 'En el caso de que exista un Comité de Seguridad y Salud, la Empresa y el personal se comprometen a crear su propio reglamento de funcionamiento una vez firmado el convenio.\n\n'
            + 'Anualmente se programará un reconocimiento médico para el personal de Binter Canarias.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 56, titulo: 'Información al Comité de Seguridad y Salud',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Binter Canarias se obliga a suministrar la información necesaria relacionada con los accidentes laborales y enfermedades profesionales al Comité de Seguridad y Salud en el trabajo o al delegado de prevención, de acuerdo con la normativa vigente, y cuantos acuerdos se reflejen en su reglamento.\n\n'
            + 'Los resultados de las evaluaciones de riesgos deberán subsanarse con los medios correctores.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAP\xcdTULO VIII — IGUALDAD (Arts. 57–58)
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_VIII', numero: 'VIII',
      titulo: 'Pol\xedticas de igualdad y en materia de violencia y acoso',
      articulos: [
        {
          numero: 57, titulo: 'Política de Igualdad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se prohíbe toda discriminación por razón de sexo o edad de las personas trabajadoras en materia salarial cuando desarrollen trabajos de igual valor y/o grupo profesional, así como en materia de promoción, ascensos etc.\n\n'
            + 'Ambas partes acuerdan que en cumplimiento de las disposiciones contenidas en la Ley Orgánica 3/2007, de 22 de marzo, para la igualdad efectiva de mujeres y hombres se comprometen a respetar, aplicar y a hacer cumplir el principio de igualdad de trato y de oportunidades entre mujeres y hombres en el seno de la empresa.\n\n'
            + 'Con tal fin, y en cumplimiento de la mencionada Ley Orgánica 3/2007 para la Igualdad Efectiva de Mujeres y Hombres, se adquieren el compromiso de adoptar, de forma negociada entre ambas partes, las medidas necesarias para evitar cualquier tipo de discriminación laboral y garantizar de forma real y efectiva la igualdad de trato y de oportunidades entre mujeres y hombres en la empresa, mediante la aplicación del plan de igualdad, que fue depositado y registrado con fecha 30 de agosto de 2023 con código TG85OD71 a través del REGCON.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 58, titulo: 'Violencia y acoso',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Compañía y la Representación de las personas trabajadoras firmantes del presente convenio colectivo respetan y exigen que se respete la dignidad de todas las personas trabajadoras de su plantilla.\n\n'
            + 'La Compañía prohíbe expresamente el abuso de autoridad y cualquier tipo de violencia o acoso laboral, sexual o por razón de sexo, o aquel que pudiera estar motivado por razón de origen racial o étnico, religión o convicciones, discapacidad, edad u orientación sexual. Todo ello de acuerdo con la legislación vigente, mediante el desarrollo y aplicación de los siguientes criterios que servirán de base para el establecimiento de un protocolo de actuación en esta materia.\n\n'
            + 'Información: se informará sobre esta materia a toda la plantilla y especialmente a las personas que tengan personal a su cargo.\n\n'
            + 'Responsabilidad: todos los empleados tienen la obligación y la responsabilidad de establecer y mantener sus relaciones desde el respeto y la dignidad. Los jefes y mandos adicionalmente tendrán las siguientes responsabilidades:\n1. Asegurarse que las personas a su cargo conocen y comprenden el alcance y contenido de las normas contenidas en el convenio relativas a esta materia.\n2. Garantizar y velar porque no se produzcan situaciones de violencia/acoso dentro del ámbito de su competencia.\n\n'
            + 'Comunicación: se utilizarán todos los medios disponibles para garantizar el conocimiento de este protocolo a todo el personal.\n\n'
            + 'Procedimiento en caso de denuncia. Cualquier persona trabajadora que considere que está siendo objeto de violencia o de acoso lo podrá poner en conocimiento de la Dirección de la Compañía y de los representantes de las personas trabajadoras.\n\n'
            + 'No se tramitarán las denuncias anónimas, ni las que se refieran a materias correspondientes a otro tipo de reclamaciones.\n\n'
            + 'La Dirección de la Compañía en el plazo de 20 días hábiles adoptará las medidas correctivas que estime oportunas.\n\n'
            + 'El presente procedimiento se aplicará independientemente de las acciones legales que la persona denunciante pueda interponer ante cualquier instancia judicial.\n\n'
            + 'En los supuestos de víctima de violencia de género se estará a lo dispuesto en la Ley Orgánica de 28 de diciembre de 2004 de Medidas de Protección Integral contra la Violencia de Género y demás normativa que la desarrolle o modifique.\n\n'
            + 'Para que las víctimas de violencia de género puedan ejercer los derechos que establece la citada ley, deberán acreditar tal situación ante el empresario de la forma establecida en el artículo 23 de dicha ley.\n\n'
            + 'La Compañía, una vez reconocida la situación con la víctima, aplicará los supuestos legales a los que necesitará acogerse y en particular a lo relativo a:\nA. Reducción de jornada, adaptación de la misma, o cualquier otra forma de ordenación del tiempo de trabajo que sea habitual en la Compañía. Estas adecuaciones de la jornada habitual tendrán una duración máxima de 2 años ampliables por resolución judicial.\nB. Cambio de centro de trabajo.\nC. Suspensión del contrato de trabajo por un mínimo de seis meses y un máximo de veinticuatro meses. Durante este periodo la Compañía podrá sustituir a la persona trabajadora mediante un contrato de interinidad con las bonificaciones legalmente previstas.\nD. Extinción voluntaria del contrato de trabajo con derecho a prestación por desempleo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 59, titulo: 'Protocolo de actuación frente al acoso y la violencia contra las personas LGTBI',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La empresa asume como propios los principios de no discriminación e igualdad de \ntrato por razones de sexo; estado civil; edad; origen racial o étnico; condición social; \nreligión o convicciones; ideas políticas; orientación sexual; expresión o identidad de \ngénero; diversidad sexo genérica o familiar; discapacidad; enfermedad; afiliación o no a \nun sindicato; así como por razón de lengua.\nAmbas partes acuerdan que en cumplimiento de las disposiciones contenidas en el \nReal Decreto 1026/2024, de 8 de octubre, para la igualdad y no discriminación de las \npersonas LGTBI en la empresa, se comprometen a respetar, aplicar y a hacer cumplir el \nprincipio de igualdad de trato y de oportunidades de las personas LGTBI en el seno de la \nempresa.\nA tal efecto, y en cumplimiento de la normativa citada, las partes dejan constancia de \nque se ha negociado y acordado el Protocolo para la igualdad y no discriminación y \nprotección frente al acoso y la violencia de las personas LGTBI, como instrumento \nconsensuado entre la representación legal de las personas trabajadoras y la empresa, \nmediante el cual se establecen las medidas necesarias para prevenir cualquier forma de \ndiscriminación laboral y garantizar de manera real y efectiva la igualdad de trato y de \noportunidades del colectivo LGTBI. Se adjunta el protocolo como anexo II.\nCAPÍTULO IX\nRégimen disciplinario',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAPÍTULO IX — Régimen disciplinario
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_IX', numero: 'IX',
      titulo: 'Régimen disciplinario',
      articulos: [
        {
          numero: 60, titulo: 'Clasificación de las faltas',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Corresponde a la Dirección de la Empresa la competencia exclusiva para imponer \nsanciones por la comisión de faltas, de acuerdo con lo establecido en la legalidad \nvigente.\nLas faltas se clasificarán en leves, graves y muy graves, de acuerdo con los \nsiguientes criterios:\n– Gravedad de la infracción.\n– Grado de voluntariedad: imprudencia, intención, malicia y circunstancias.\n– Reincidencia y reiteración.\n– Perjuicio causado a personas y bienes.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 61, titulo: 'Faltas leves',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Son faltas leves:\na) Las de puntualidad inferior a quince minutos, siempre que del retraso no se \nderive perjuicio objetivamente apreciable para el servicio que haya de prestar, en cuyo \ncaso se considerará falta grave.\nb) Abandonar el trabajo sin que medie autorización o motivo justificado.\nc) Incurrir en pequeños descuidos que afecten de forma objetivamente apreciable a \nla conservación de los materiales, útiles o efectos que el trabajador tenga a su cargo, \nincluidos servicios comunes.\nd) La omisión en la cumplimentación de documentos, correspondencia, etc. \nsiempre que ello no comporte perjuicios de consideración a persona o aeronave, como \ndemoras, gastos, etc., en cuyo caso tendrán la consideración de falta grave.\ne) No comunicar a la Empresa con la puntualidad debida los cambios \nexperimentados en la familia que puedan afectar a la Seguridad Social, así como los \ncambios de residencia o domicilio habitual.\nf) Las discusiones en las dependencias o aeronaves de la Empresa con los \ncompañeros de trabajo que alterasen la normal convivencia en las mismas, y, en general, \ntodos aquellos comportamientos que vulneren levemente las normales de convivencia.\ng) La reincidencia se manifiesta en el desconocimiento de sus funciones \nespecíficas.\nh) No comunicar con la antelación debida la falta al trabajo. En caso de incapacidad \ntemporal o enfermedad, la omisión de notificación a las unidades o departamentos \ndesignados al efecto.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 62, titulo: 'Faltas graves',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se consideran faltas graves:\na) Más de tres faltas de puntualidad en la presentación en el puesto de trabajo no \njustificadas y cometidas en un período no superior a treinta días, bastando una sola falta \nno justificada cuando el trabajador tuviera que relevar a un compañero. No obstante, \nprevio acuerdo mutuo y con consentimiento del Jefe correspondiente, podrá alterarse el \nhorario de los relevos.\nb) Negligencia o descuido en el trabajo que afecte sensiblemente a la buena \nmarcha del mismo.\nc) La imprudencia en actos de servicio, si implicase riesgo de accidente para él o \npara sus compañeros o peligro de averías par las instalaciones y aeronaves de la \nCompañía.\nd) La desobediencia a las órdenes recibidas de los superiores en materia \nrelacionada con el servicio, sin perjuicio de que las mismas, una vez cumplimentadas, \npudieran ser objeto de inmediata reclamación. Si la urgencia del trabajo lo permitiera, \npodrá el trabajador manifestar al inmediato responsable su disconformidad con la \nejecución del mismo.\nSi alguna orden dada por un superior implicara la realización por parte del \nsubordinado de un trabajo no recogido en descripción de funciones, este podrá exigir \nque dicha orden le sea comunicada por escrito, sin perjuicio de que esto, por razones de \nurgencia, pueda realizarse con posterioridad al cumplimiento de la orden.\ne) La embriaguez o toxicomanía habitual fuera de servicio que altere la normal \nconvivencia y seguridad de la Compañía.\nf) La desconsideración a las autoridades y personas que se encuentren a bordo o \nen las dependencias de la Empresa.\ng) La reincidencia en la comisión de tres faltas leves en el período de treinta días.\nh) No presentarse al trabajo en la fecha que le haya sido señalada por la Empresa, \nsi no medía justificación suficiente.\ni) Originar frecuentes riñas y pendencias con los compañeros a bordo o en las \ndependencias de la Empresa.\nj) La transgresión grave de las normas de seguridad e higiene establecidas.\nk) La falta de aseo y decoro durante la permanencia en los locales de servicios \ncomunes.\nl) La negligencia que ocasiones el mal estado en los elementos de seguridad.\nm) La caducidad o no disponibilidad de la documentación necesaria para \ndesempeñar las funciones.\nn) Las faltas consideradas como graves referidas en la normativa de seguridad en \nplataforma vigente publicada por AENA en cada aeropuerto según ubicación del centro \nde trabajo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 63, titulo: 'Faltas muy graves',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se consideran faltas muy graves:\na) Hacer negociaciones de comercio o industria relacionadas con el tráfico aéreo \npor cuenta propia o de otra persona sin la expresa autorización de la Dirección.\nb) Hacer desaparecer, inutilizar o causar desperfectos intencionados en materiales, \nútiles, herramientas, maquinaria, aparatos, instalaciones, mercancías que se transporten, \nenseres y documentos.\nc) Embriaguez o toxicomanía en acto de servicio.\nd) Retener o violar el secreto de la correspondencia oficial, particular o documentos \nreservados de la Empresa, así como revelar a elementos extraños al Empresario datos \nde reserva obligada.\ne) Ocultación maliciosa de errores propios que causen perjuicio al Empresario, \ncompañeros o aeronave y la ocultación al Jefe respectivo de los retrasos producidos en \nel trabajo causantes de graves daños.\nf) La simulación de accidente o enfermedad.\ng) Solicitar permisos, licencias o excedencias alegando causas no existentes, o \nexcederse del tiempo concedido para los mismos sin causa justificada.\nh) El abandono o la ausencia en el puesto de trabajo, sin permiso del Jefe \nrespectivo.\ni) No cumplir la orden de embarque sin causa grave que lo justifique.\nj) Quedarse en tierra por su culpa al despegue de la aeronave.\nk) Causar accidentes graves por negligencia o imprudencia inexcusable.\nl) La reiteración de faltas graves, siempre que se cometan dentro del período de la \njornada laboral.\nm) Los malos tratos de palabra u obra y la falta grave de respeto a los jefes, así \ncomo a los compañeros y subordinados.\nn) La reincidencia en faltas de subordinación, disciplina o incumplimiento del \nservicio.\no) El abuso de autoridad por parte de los jefes o superiores respecto a trabajadores \nque les estén subordinados.\np) El abandono del servicio de guardia/imaginaria sin causa que lo justifique.\nq) La estafa, robo o hurto cometidos dentro de las dependencias de la Compañía o \naeronaves o la comisión de cualesquiera otros delitos.\nr) El contrabando o tenencia de mercancías, divisas o productos prohibidos por la \nLey.\ns) La reiterada e inexcusable falta respeto y consideración hacia el cliente.\nt) La inobservancia de las normas de seguridad e higiene que afecten directamente \na la integridad física de las personas, seguridad y deterioro de las instalaciones o \ndependencias de la Compañía.\nu) La ocultación maliciosa del mal estado de los elementos de seguridad.\nv) El incumplimiento de las funciones específicas de los puestos de trabajo.\nw) Falta de asistencia de más de tres días al trabajo en un plazo de treinta días \nnaturales sin causa que lo justifique.\nx) Realizar trabajos por cuenta propia o ajena, estando el trabajador de baja por \nenfermedad o accidente. También se incluirá dentro de este apartado toda manipulación \nhecha para prolongar la situación de baja.\ny) La introducción o posesión en locales de la compañía de drogas, estupefacientes \ny/o la tenencia o transporte de las mismas durante la actividad laboral valiéndose de su \ncondición de empleado.\nz) Simular la presencia de un compañero al fichar o firmar la asistencia al trabajo. \nEsta sanción será extensiva al suplantado, si se prueba su participación en el hecho.\naa) La caducidad o no disponibilidad de la documentación necesaria para \ndesempeñar las funciones a bordo, que repercutan directamente en el buen desarrollo \nde la operativa.\nbb) La falsificación, manipulación o incumplimiento reiterado de la obligación de \nregistrar la jornada laboral de forma veraz y exacta, así como la omisión intencionada del \nfichaje de entrada o salida, salvo causa justificada.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 64, titulo: 'Sanciones',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Sanciones por faltas leves. Serán las siguientes:\n– Amonestación verbal.\n– Amonestación por escrito.\n– Suspensión de empleo y sueldo de hasta dos días.\nSanciones por faltas graves. Podrá imponerse alguna de las siguientes:\n– Suspensión de empleo y sueldo de hasta 15 días.\n– Inhabilitación temporal por plazo no superior a dos años para pasar a categoría \nsuperior o progresión a niveles superiores.\nSanciones por faltas muy graves. Podrá imponerse alguna de las siguientes:\n– Suspensión de empleo y sueldo de hasta tres meses.\n– Inhabilitación temporal por plazo no superior a seis años para pasar a categoría \nsuperior o progresión a niveles superiores.\n– Despido.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 65, titulo: 'Billetes',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se regulará por una normativa interna de Binter Canarias.\nCAPÍTULO X\nNormas específicas de aplicación a los grupos profesionales III, IV\nApartado I. Definiciones y clasificación',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════
    // CAPÍTULO X — Normas específicas Grupos III, IV
    // ══════════════════════════════════════════════════════════════
    {
      id: 'cap_X', numero: 'X',
      titulo: 'Normas específicas de aplicación a los grupos profesionales III, IV',
      articulos: [
        {
          numero: 66, titulo: 'Definiciones',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'En este artículo se definen los conceptos relativos a las materias contempladas en el \nmismo, prevaleciendo su redacción cuando existan contradicciones, lagunas o \nproblemas de interpretación:\n– Tripulante de vuelo: es el tripulante, perteneciente al Grupo Laboral IV, en \nposesión de título, licencia y calificación, a quien la Dirección de la Compañía asigna \nfunciones esenciales, en la cabina de pilotaje, para la preparación, realización y \nfinalización del vuelo.\n– Tripulante de Cabina: Trabajador de Binter Canarias, denominado en el Manual de \nOperaciones como «CC», con contrato como Tripulante de Cabina de Pasajeros \nencuadrado dentro del Grupo Laboral III, en posesión de las oportunas licencias, \ncertificados y habilitaciones en vigor que les posibiliten realizar las funciones de \nTripulantes de Cabina de Pasajeros establecidas en el Manual de Operaciones de la \nCompañía.\n– Promoción: se define como promoción, el cambio de función de Copiloto a \nComandante dentro de un Grupo Laboral IV.\n– Regresión: Se define como regresión, el cambio de función de Comandante a \nCopiloto dentro de un Grupo Laboral IV.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 67, titulo: 'Funciones',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Comandante: Será aquel tripulante técnico, en posesión de título, licencia y \ncalificaciones correspondientes al tipo de aeronave utilizada, considerado apto por la \nDirección de la Compañía para el desempeño, no solo de cualquier función de pilotaje \nsino específicamente para la función de mando de sus aeronaves.\nLa Compañía designará para desempeñar la función de comandante al piloto que, \nteniendo la confianza de la Compañía, haya superado los cursos, pruebas y \nevaluaciones correspondientes.\nLa comandatura es una función que solo puede ocuparse por personas de extrema \nconfianza de la Compañía, dada la responsabilidad, representación y autoridad que lleva \ninherente el desempeño de dicha función. Por tanto, la obtención del puesto y su \npermanencia en él quedan totalmente supeditadas al logro y al mantenimiento de dicha \nconfianza, que se sustenta no solo en cuestiones técnicas, sino en la concurrencia de \notra serie de factores sin cuya existencia no cabe el desempeño de las tareas de \ncomandante.\nEl nombramiento o confirmación exige la libre aceptación por el comandante de las \ncondiciones laborales y económicas fijadas por la Compañía para el ejercicio de dichas \nfunciones.\nLa remoción por la compañía de la función de comandante se efectuará por la \nempresa cuando a su juicio exista pérdida de confianza o razones técnicas, comerciales \no laborales que justifiquen su decisión.\nLos comandantes a los que se les haya retirado la confianza volverán a desempeñar \nlas funciones de copiloto, pasando a percibir las retribuciones del nivel retributivo de la \nfunción de copiloto en el que estuviese encuadrado antes de su nombramiento como \ncomandante.\nCopiloto: Tripulante técnico distinto al que ejerce la función de comandante a bordo \nde la aeronave y que colabora en las funciones de pilotaje con el comandante y le \nsustituye en el mando en casos de ausencia o incapacidad de este.\nSobrecargo: es el miembro de la Tripulación de Cabina de Pasajeros, denominado \nen el Manual de Operaciones como «SCC», designado libremente por la Dirección para \ndesarrollar las funciones de TCPs con la mayor diligencia, así como coordinar y \nsupervisar los trabajos asignados a cada miembro de la tripulación a su cargo, previstos \nen los manuales que les aplique, así como todas aquellas funciones relacionadas con la \npreparación, desarrollo y fin del vuelo, incluyendo todas las actividades posteriores que \nse deriven como consecuencia del mismo.\nEsta figura únicamente se programará cuando la tripulación de cabina esté \ncompuesta por dos o más TCPs.\nDado que es un cargo de confianza está expresamente excluido de la aplicación de \neste convenio a efectos de nombramiento, remoción, deberes y derechos inherentes al \ncargo. La función de sobrecargo solo puede ser ocupada por personas de extrema \nconfianza de la compañía dada la responsabilidad y representación que lleva inherente \nel desempeño de dicha función. Por lo tanto la obtención del puesto y su permanencia en \nél quedan totalmente supeditado al logro y al mantenimiento de dicha confianza. El \nnombramiento o confirmación exige que el Sobrecargo acepte las condiciones laborales \ny económicas fijadas por la Compañía para el ejercicio de dichas funciones. En el caso \nde coincidencia de más de un sobrecargo en una misma tripulación, el ejercicio efectivo \nde la función se determinará en los manuales operativos de la Compañía.\nLa remoción por la compañía de la función de sobrecargo se efectuará por la \nempresa cuando a su juicio exista pérdida de confianza o razones técnicas, comerciales \no laborales. La confianza que la compañía pueda otorgar a un TCP para que pase a \ndesempeñar las funciones de Sobrecargo se sustenta además de en cuestiones \ntécnicas, en la concurrencia de otra serie de factores sin cuya existencia no cabe el \ndesempeño de las tareas de Sobrecargo. Entre esos factores y sin pretender ser \nexhaustivos figuran:\n– El compromiso del sobrecargo con la política empresarial seguida en la Compañía.\n– El interés en el cuidado del cliente, especialmente las acciones decididas por el \nsobrecargo en coordinación con el Comandante del vuelo, en beneficio o perjuicio de los \npasajeros de los vuelos asignados a su responsabilidad.\n– La capacidad de liderar, organizar, controlar y formar a los miembros de las \ntripulaciones puestas por la empresa bajo sus órdenes y reportar el desempeño de los \nservicios relacionados con los vuelos asignados por la empresa.\n– Su capacidad para colaborar en beneficio de los clientes y la empresa con otros \ncolectivos que forman parte de la empresa.\n– La actitud general referida a la empresa.\n– La actitud y comportamiento personal dentro de la empresa. Así como fuera de \nesta cuando pueda repercutir negativamente en la misma.\nLa compañía designará para desempeñar la función de Sobrecargo a cualquier TCP \nque reúna los requisitos determinados por ella, habiendo superado los cursos, pruebas y \nevaluaciones correspondientes.\nLa remoción de la función de Sobrecargo será facultad exclusiva de la dirección de \nBinter al tratarse de un puesto de confianza, indicándose el motivo del cese al afectado. \nLos sobrecargos a los que se les haya retirado la confianza volverán a desempeñar las \nfunciones de TCP con la pérdida de todos los complementos retributivos propios de la \nfunción de Sobrecargo.\nTripulante de Cabina de Pasajeros (TCPs): TCP distinto del Sobrecargo que auxilia a \neste en las funciones que le hayan sido encomendadas por la Compañía a bordo de sus \naviones.\nApartado II. Principios informadores',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 68, titulo: 'Servicios a Terceros',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Wet Lease Out: la empresa podrá asignar a los tripulantes de la plantilla la prestación \nde sus servicios en trayectos pertenecientes a otras compañías nacionales o extranjeras, \nsiempre por tripulaciones técnicas y/o tripulaciones auxiliares completas, de acuerdo a \nlas fórmulas legales existentes en cada momento. Los tripulantes afectados mantendrán \nlas condiciones económicas vigentes en este convenio, así como sus complementos ad \npersonam, si los hubiere.\nWet Lease In: los Tripulantes de Cabina de Pasajeros (Grupo Laboral III), también \npodrán prestar servicios en vuelos de Binter Canarias, operados por terceras compañías, \nque hayan suscrito con Binter Canarias acuerdos de Wet Lease, franquicia o cualquier \notra modalidad mercantil vigente en cada momento.\nVuelos Chárter: vuelos no regulares consistentes en el alquiler de un avión con su \ntripulación por parte de una persona, grupo de personas o a través de empresas \nintermediarias. En este caso los vuelos posicionales y no posicionales serán tratados \neconómicamente como vuelos regulares.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 69, titulo: 'Desempeño de cargos y funciones',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Compañía, respecto a las funciones a desempeñar, y conforme a sus facultades \nde organización y siempre que la normativa vigente lo permita, podrá asignar a un \ntripulante funciones distintas a las propias como tripulante técnico o tripulante de cabina \nde pasajeros, pactándose expresa e individualmente dicha asignación de funciones sin \nperjuicio de lo establecido más adelante, respecto a cargos y aceptación voluntaria.\nEl desempeño voluntario de cargos y/o funciones establecidas por la empresa, \ndistintas de las propias para las que el/la tripulante fue contratado, supondrá la \naceptación a tal efecto de las condiciones económicas y laborales establecidas para \ncada caso. Durante el tiempo de ejercicio quedarán excluidos del ámbito de este \nconvenio y regularán su relación con la empresa a través de los oportunos pactos \nlaborales individuales.\nSiendo la asignación y remoción de estos puestos facultad exclusiva de la empresa, \nal cesar en dicho puesto, cesará igualmente el derecho al disfrute del régimen laboral y \nde los devengos que se hubiesen fijado como compensación económica para el ejercicio \ndel mismo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 70, titulo: 'Renuncia a la función de Comandante',
          estado: 'vigente', colectivos: ['CMD'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los Comandantes podrán cesar voluntariamente en el desempeño de sus funciones \ncomo tal, pasando a realizar las funciones de copiloto, siempre que exista vacante y \nhaya superado las pruebas pertinentes para ello. Cuando un Comandante pase a ejercer \nla función de Copiloto percibirá las retribuciones correspondientes a su nueva función.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 71, titulo: 'Renuncia a la función de sobrecargo',
          estado: 'vigente', colectivos: ['SCC'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los Sobrecargos podrán cesar voluntariamente en el desempeño de sus funciones \ncomo tal, pasando a realizar las funciones de TCP, siempre que exista vacante y \ncumplan con los requisitos exigidos. Cuando un Sobrecargo pase a ejercer la función de \nTCP percibirá las retribuciones correspondientes a su nueva función.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 72, titulo: 'Desempeño temporal de las funciones de Comandante',
          estado: 'vigente', colectivos: ['COP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Compañía podrá utilizar de manera temporal y provisional a Tripulantes Técnicos \npara el desempeño de la función de comandante en sustitución de otro u otros que por \ndiversas circunstancias temporales no se encuentren en disposición de ejercer dicha \nfunción, o bien por necesidades de optimización de la producción.\nUna vez desaparezca la necesidad por la que se le haya nombrado comandante de \nmanera temporal, o en su caso haya transcurrido el período de tiempo para el que fue \ndesignado, volverá a desempeñar funciones de copiloto. El desempeño temporal de las \nfunciones de comandante, nunca supondrá la consolidación definitiva de ese cargo. \nDurante el tiempo que ejerza como comandante percibirá lo establecido en este \nconvenio propio de ese cargo asignado al nivel retributivo A y cesará en esta percepción, \nen el momento de cesar en el desempeño de la comandatura. En lo que se refiere al \nresto de conceptos retributivos mantendrá los del nivel de copiloto al que se encuentre \nadscrito.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 73, titulo: 'Cambio de flota',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'En el caso de que la compañía decida hacer un cambio de flota y que éste requiera \nhacer un curso de conversión o de diferencias, se compensará mediante una retribución \nvariable en función de la duración del mismo.\nAquellos cursos de este tipo, cuya duración sea superior a dos días serán retribuidos \ncomo un día de vuelo por cada día de curso.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 74, titulo: 'Regresión',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La Dirección de la Compañía efectuará el relevo de la función de Comandante o de \nSobrecargo, cuando a su juicio exista pérdida de confianza o razones técnicas, \ncomerciales o laborales que justifiquen su decisión.\nEn el caso de producirse el relevo, el interesado se reincorporará a desempeñar las \nfunciones que como Copiloto o TCP, según proceda, tenía asignadas, dejando de \npercibir las retribuciones vinculadas al ejercicio del cargo de Comandante y encuadrarlo \nen el nivel de Copiloto o TCP, según corresponda.\nApartado III. Régimen de trabajo, actividad y descanso',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 75, titulo: 'Regulación del régimen de trabajo y descanso',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La regulación de los tiempos de trabajo y descanso, así como los máximos \npermitidos, se realizarán de acuerdo a lo establecido en la normativa vigente y/o en el \nManual de Operaciones de la Compañía. Aquellos supuestos no establecidos por la \nnormativa, ni en el Manual de Operaciones, ni regulados en el presente \nconvenio colectivo, si afectan a un grupo de trabajadores, serán pactados por ambas \npartes en el seno de la Comisión de Interpretación del mismo.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 76, titulo: 'Actividad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Cualquier función que deba realizar el tripulante en relación con la actividad \neconómica de la compañía como titular de un AOC.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 77, titulo: 'Período de actividad de vuelo (FDP) y límites máximos',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se entiende como período de actividad de vuelo el tiempo durante el cual un \ntripulante desempeña sus funciones en una aeronave como parte de su tripulación (de \nacuerdo a lo establecido en el Manual de Operaciones del Operador). Este período se \ninicia cuando el tripulante miembro de la tripulación se presenta para un vuelo o serie de \nellos siguiendo instrucciones del operador, y finaliza una vez concluido el último de los \nvuelos en el que el tripulante ha trabajado.\nLos límites máximos serán los establecidos por la normativa vigente.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 78, titulo: 'Descanso',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Periodo ininterrumpido y definido de tiempo durante el cual un tripulante queda \nrelevado de toda actividad y de la prestación de imaginaria en el aeropuerto.\nEn lo que se refiere a notificaciones durante el período de descanso los tripulantes se \nregularán por lo establecido en el artículo de «Chequeo».\nLos periodos de descanso serán los establecidos por la normativa vigente.\nDurante los periodos de descanso, se aplicará la Política de desconexión digital de \nlas personas trabajadoras, publicada en la Web Corporativa, conforme al cumplimiento \nde la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y \nGarantía de Derechos Digitales («LOPDGDD»).',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 79, titulo: 'Chequeo',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Dada la importancia de garantizar que cualquier cambio en la programación sea \ncomunicado, a título orientativo y no limitativo, los tripulantes realizarán chequeos de sus \nservicios programados en las siguientes situaciones:\n– Al finalizar cualquier tipo de actividad o la reincorporación de cualquier tipo de \nabsentismo, permisos, licencias o vacaciones.\nDada la necesidad de establecer contacto inmediato con los tripulantes en servicios \nde imaginaria para facilitar su incorporación sin demora cuando las condiciones lo \nrequieran, servicios que se definen y retribuyen mediante el plus de disponibilidad de los \nartículos 46.b) y 47.b) («Imaginarias») y se cuantifican en las Tablas Salariales de los \nGrupos III y IV por cada día programado en dicho servicio, los tripulantes se obligan a \nfacilitar a la Compañía, y mantener actualizado, al menos, una vía de comunicación \noficial de contacto inmediato.\nNo obstante lo anterior, prevalecerá en cualquier caso, lo establecido en la normativa \naérea y manuales vigentes.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 80, titulo: 'Día Libre, libre solicitado',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Día Libre.\nSe entiende por día libre al día natural del que puede disponer libremente el \ntripulante sin actividad ni trabajo asignado. El mínimo de días libres será el estipulado en \nla normativa vigente y absorberán las fiestas laborales oficiales. Los días libres \nprogramados del mes serán proporcionales a los períodos fraccionados de vacaciones, \nbajas, licencias, etc.\nEl período de descanso formará parte del día libre en los casos en que ambos \ncoincidan en el tiempo.\nEn el año se programarán 99 días libres, incluyendo todos los festivos oficiales de \námbito nacional, regional y local, con un mínimo de 9 días libres por mes de actividad. El \nnúmero de días libres se podrá ver modificado mediante el acuerdo de programación con \npatrón fijo (roster). Esta cifra podrá ser inferior en el caso de que así lo autorice el \ntripulante o como consecuencia de cesión de líneas y/o libres entre tripulantes o a la \nempresa.\nLos días libres individualmente considerados se programaran de acuerdo a lo \nestablecido en la normativa vigente y respetando en cualquier caso los mínimos que en \nellas se establezcan.\nLa modificación de un día libre será de carácter voluntario por parte del tripulante, \nque percibirá una compensación económica, según tablas salariales, en concepto de \n«libre a disposición volado». Su devolución será la pactada entre el tripulante y la \nempresa, se abonará siempre que la empresa le asigne cualquier tipo de actividad al \ntripulante en dicho día, sea o no de vuelo (cursos, oficina, vuelo en situación, reuniones, \nsimuladores, etc.).\nCuando por la extensión de un FDP, se invada o se pernocte fuera de base en un día libre, \neste será devuelto. La referencia para saber si se ha invadido un día libre será que el Duty Time \nfinalice después de las 00:00 del libre programado. Si esta extensión es a solicitud de la \ncompañía y no derivada de la propia operativa programa, se abonará según tabla.\nLibre solicitado.\nLa petición de libres solicitados por el Tripulante deberá enviarse al Departamento de \nProgramación antes del 24 del mes previo a la publicación de la programación, pudiendo \nhacerlo de forma agrupada en la medida de las posibilidades de programación. La \nnegativa de la empresa, en su caso, ha de ser por necesidades reales y justificadas.\nAparecerán en la Programación como ROFF. La concesión por parte de la Empresa \nde días libre solicitados, nunca se hará en perjuicio de los fines de semana libres que le \ncorrespondan a otros tripulantes.\nLa programación de más de 2 ROFF en el mismo mes, puede llevar al Departamento \nde Programación a no poder cumplir con algunas de las protecciones articuladas en el \npresente Convenio en la programación inicial, como por ejemplo programar máximo \ncinco días seguidos de actividad, o dos libres tras una actividad de más de 18 horas de \nbloque, siempre cumpliendo con la normativa vigente.\nAdicionalmente, el operador deberá disponer de una normativa interna que regule los \nlibres solicitados. Esta normativa interna estará consensuada entre empresa y comité.',
          resumen_operativo: null, afectaciones: [{ tipo: 'rosterMAD', descripcion: 'Acuerdo Roster MAD+TFN suspende protecci\'\u00f3n de 6 d\'\u00edas consecutivos y fin de semana mensual' }, { tipo: 'rosterLPA', descripcion: 'Acuerdo Roster LPA suspende las mismas protecciones durante el roster 5+3' }], related: ['roster_lpa', 'roster_mad'], faqs: [],
        },
        {
          numero: 81, titulo: 'Programación',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se entiende por programación la planificación de la distribución de las actividades, \ntrabajos puntuales, períodos de descanso, días libres, vacaciones, y aquellas otras \ntareas susceptibles de ser distribuidas entre los tripulantes. Los códigos a utilizar en las \nmismas serán establecidos por la Compañía.\nLa programación del mes de diciembre se incorporará el día 1 de enero del año \nsiguiente.\nSe tomará como referencia base para el cálculo de los períodos de actividad y \nactividad de vuelo el periodo anterior al inicio del mes de programación.\nEn las programaciones se reservará el tiempo suficiente para que los tripulantes \npuedan mantener los títulos, habilitaciones, certificados, licencias, etc., necesarios para \nel desempeño de sus funciones a bordo de las aeronaves.\nPara la programación se tendrá en cuenta las necesidades operacionales, las \nactividades y descansos, la distribución lo más equitativamente posible entre los \ntripulantes de una misma función y base, y la solidez operacional.\nLas diferencias imposibles de subsanar en un mes determinado, se irán \ncompensando en los sucesivos.\nNo se programarán seis días o más seguidos de actividad salvo pacto en contra. En \ncaso de que por necesidades del servicio se tengan que programar, deberá ser por \ncausas justificadas y tendrán que ser notificadas periódicamente al comité de empresa. \nAdemás, siempre que sea posible, los bloques de servicio de cinco días estarán \nprecedidos o sucedidos por dos días libres.\nLos días programados como comité de empresa contarán como día de trabajo a \nefectos del número máximo de días consecutivos trabajados.\nDurante los períodos navideños, el tripulante elegirá dos períodos como preferentes \npara librar, al menos uno de los cuales le será concedido, siendo los períodos 24/25 de \ndiciembre, 31 de diciembre/1 de enero, y 5/6 de enero. En caso de empate se otorgará \nutilizando los puntos de las vacaciones.\nEn el supuesto que haya muchas solicitudes para un mismo período y no se puedan \notorgar todas, se realizará un sorteo entre los tripulantes por especialidad ante un \nrepresentante de los trabajadores de cada centro y un representante de la empresa.\nPara cada uno de los períodos navideños mencionados, se sorteará la actividad a \nrealizar en cada uno de ellos. De esta forma, comenzando por el primer día de actividad \nse sorteará primero la actividad de vuelo y luego el resto de actividades. Una vez le haya \ntocado a un tripulante actividad de vuelo no le podrá volver a tocar hasta que todos \ntengan al menos una actividad de vuelo en dicho periodo.\nA los tripulantes con servicio activo para el vuelo durante todos los fines de semana \ndel mes, se les asignará un fin de semana libre inamovible, salvo pacto con el tripulante, \nentendiendo fin de semana a Sábado, Domingo, y la tarde del Viernes o la mañana del \nLunes. No se les tendrá que programar si en el transcurso del mes ya disponen de un fin \nde semana por vacaciones, licencias o cualquier otro motivo.\nEl operador deberá disponer de una normativa interna que regule los aspectos \nrelacionados con la programación. Esta normativa interna se elaborará en coordinación \ncon el comité de empresa.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 82, titulo: 'Variaciones de Programación',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Una vez publicada la programación, tanto antes como durante su ejecución, podrá sufrir \nmodificaciones por causas operativas, meteorológicas, técnicas, comerciales o cualquier otra. \nSe podrá reprogramar la realización de sectores adicionales, variación en las rutas previstas, \ncancelaciones, etc. Por tanto, siempre que la tripulación se encuentre dentro de los límites \nestablecidos por la normativa vigente, en el Manual de Operaciones y en el presente \nconvenio, la compañía podrá variar las actividades asignadas para un aprovechamiento \nóptimo de la productividad de sus tripulantes, con el fin de mantener la calidad de servicio \nesperada por el cliente.\nLos valores máximos de cambios sobre la programación inicial serán del 30%, y \nde 1,4 sobre el FDP programado de Binter Airlines, según se refleja en el MO.\nLos cambios de programación deben notificarse al tripulante fuera del período no \ncontactable. El período no contactable es el tiempo mínimo de descanso legal \nprecedente a cualquier actividad. El tripulante no estará en la obligación de estar \ncontactable en el periodo de descanso comprendido entre el final de la última actividad y \nel inicio de la siguiente.\nSerán considerados como cambio los definidos en el MO. Los cambios solicitados \npor el tripulante serán ilimitados.\nEl operador deberá disponer de una normativa interna que regule los aspectos \nrelacionados con la ejecución de la programación. Esta normativa interna se elaborará \nen coordinación con el comité de empresa.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 83, titulo: 'Registro de los períodos de actividad de vuelo, de actividad y de descanso',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El operador garantizará que en el registro personal de los miembros de la tripulación \nse haga constar:\n– Los tiempos de vuelo.\n– El comienzo, la duración y el término de cada uno de los períodos de actividad o \nactividad de vuelo.\n– Los tiempos de descanso y los días libres de toda actividad.\nDichos registros estarán disponibles a solicitud de la Autoridad, organizaciones \nauditoras, representación sindical de los trabajadores o para los tripulantes que lo \nsoliciten (de acuerdo a la normas y plazos que establezca la Compañía).\nEn los casos en que el registro anterior no recoja todos los períodos de actividad de \nvuelo, de actividad y de descanso de un tripulante técnico, este deberá llevar su propio \ndiario de vuelo en el que conste:\n– Los tiempos de vuelo.\n– El comienzo, la duración y el término de cada uno de los períodos de actividad o \nactividad de vuelo.\n– Los tiempos de descanso y los días libres de toda actividad.\nTodos los tripulantes se obligan a comunicar mensualmente a la Compañía, las \nactividades ajenas al operador que puedan afectar a los registros a los que se refiere el \npresente artículo. Además deberán presentar su diario de vuelo a la Dirección cuando \nles sea solicitado.\nApartado IV. Situaciones',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 84, titulo: 'Destacamento',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'El destacamento se produce cuando el trabajador ha de desplazarse fuera de su \ncentro de trabajo habitual, para realizar una actividad encomendada por la Compañía y \nsiempre que se disfrute uno de los días libres mínimos mensuales (9 o su parte \nproporcional) fuera de su base. A modo enunciativo, pero no limitativo, estas actividades \npodrían ser: operar vuelos regulares comerciales, operar vuelos para otro operador \n(ACMI), realizar vuelos privados (Chárter) o bien colaborar en proyectos. Si el trabajador \ndisfruta 9 días libres mensuales o los mínimos mensuales proporcionales en su base, no \nse considerará que haya hecho destacamento.\nQuedarán excluidas de este artículo cualesquiera actividades que realice el \ntrabajador como parte de su formación para poder desempeñar convenientemente su \nactividad normal.\nTodos los desplazamientos que no impliquen un destacamento, tendrán la \nconsideración de forzosos, sin compensación económica por ello.\nLa Compañía pondrá en conocimiento de los afectados la necesidad de un \ndestacamento con una antelación de siete días naturales, siempre que la actividad a \nrealizar lo permita. Será a discreción de la Compañía seleccionar al equipo de personas \nque será destacado, teniendo en cuenta la experiencia y conocimientos de los \ntrabajadores que se presenten voluntarios, así como la adecuación de su perfil con las \nnecesidades de la tarea a llevar a cabo.\nEn el caso de que no se presente el número necesario de trabajadores o, siendo este \nsuficiente, no se consiga el perfil pretendido para poder atender la naturaleza de la \nactividad encomendada por la Compañía, la Compañía designará a los trabajadores \nforzosos necesarios para llevar a cabo dicha tarea. El destacamento forzoso, tendrá una \nduración máxima de un mes. La asignación de los destacamentos forzosos será por \norden inverso a la fecha técnica para uno de los dos miembros de la tripulación técnica y \npara el otro según fecha técnica. Una vez designado para un destacamento forzoso no \npodrá volver a ser asignado hasta que los otros tripulantes de la misma categoría hayan \nsido asignados.\nTanto para los trabajadores voluntarios como forzosos, los costes de los billetes de \ndesplazamiento y los hoteles correrán por cuenta de la Compañía. Durante los \ndestacamentos se percibirán las siguientes cantidades:\nDestacamento voluntario:\n– Todos los conceptos que sean aplicables, según tabla salarial correspondiente en \ncada caso.\n– Variable «Destacamento» por el importe definido en Tabla salarial para los \ntrabajadores del Grupo III y IV, por cada día destacado fuera de base. Esta variable no \nsustituye a ninguno de los conceptos aplicables a la tabla salarial.\nDestacamento forzoso:\n– Todos los conceptos que sean aplicables, según tabla salarial correspondiente en \ncada caso.\n– Variable «Destacamento» por el importe definido en Tabla salarial para los \ntrabajadores del Grupo III, IV y V, por cada día libre disfrutado fuera de base. Esta \nvariable no sustituye a ninguno de los conceptos aplicables a la tabla salarial.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 85, titulo: 'Situaciones de los tripulantes en la plantilla',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los tripulantes en plantilla de la compañía podrán encontrarse en alguna de las \nsituaciones que se describen y regulan por normativa vigente, en las Disposiciones \nGenerales de este convenio y en los artículos siguientes:\n– Tripulantes en actividad o servicio activo.\n– Licencias Retribuidas o no retribuidas.\n– Excedencias Voluntarias, Forzosas o Especiales.\n– Baja por enfermedad o accidente.\n– Suspensión de Actividad.\n– Cese Temporal o Definitivo en vuelo (por pérdida de licencia o pérdida de capacidad).\n– Reducción de Jornada.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 86, titulo: 'Tripulantes en actividad o servicio activo',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Se encontrarán en situación de actividad los Tripulantes que estén desempeñando, \nen los servicios de vuelo de la Compañía, las funciones propias del grupo para las que \nhan sido contratados.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 87, titulo: 'Licencias retribuidas, Licencias no retribuidas, excedencias voluntarias, forzosas, baja por enfermedad o accidente',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Estas situaciones se regulan en las Disposiciones Generales de este convenio.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 88, titulo: 'Cese temporal y definitivo en vuelo por pérdida de licencia o pérdida de capacidad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'A. Se producirá cese temporal en vuelo por alguna de las causas siguientes:\n– Pérdida temporal de la licencia de vuelo.\n– Alteraciones psicofísicas que, sin producir la pérdida de la licencia de vuelo o baja \noficial de la Seguridad Social, impidan, no obstante, desarrollar las actividades de vuelo.\n– Pérdida temporal de licencia por gestación.\nLa Compañía estudiará en cada caso instar a los órganos oficiales administrativos la \nsuspensión del contrato laboral con derecho a reserva de plaza. El personal afectado por \nesta situación y que no se encuentre con el contrato de trabajo suspendido, percibirá \ncomo remuneración durante ese período los conceptos fijos.\nB. Se producirá el cese en vuelo con carácter definitivo por alguna de las siguientes \ncausas:\n– Pérdida de la licencia de vuelo.\n– Alteraciones psicofísicas de carácter irreversible que afecten a las condiciones y \nrequisitos exigidos por el puesto de trabajo.\nEl personal incluido en el apartado B) quedará excluido de este convenio y causará \nbaja en la compañía.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 89, titulo: 'Reentrenamiento y pruebas',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los tripulantes en cualquiera de las situaciones recogidas en los artículos de \nexcedencias, suspensión de actividad o cese temporal de este convenio, deberán \nsometerse a los reentrenamientos y pruebas que determine la Dirección de la Compañía, \nde acuerdo con las normas establecidas por la Autoridad Aeronáutica, inmediatamente \nantes de su reincorporación al servicio activo.\nEn lo que se refiere a los gastos derivados de este proceso serán de cuenta de los \ntripulantes salvo pacto entre las partes y/o en aquéllos casos que deriven directamente \nde un accidente de trabajo o enfermedad grave.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 90, titulo: 'Reincorporación',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'La reincorporación de los tripulantes en cualquiera de las situaciones recogidas en \nlos artículos de excedencias, suspensión de actividad y demás de este convenio, deberá \ntener lugar en el plazo legal establecido desde que desaparecieran las causas que \nmotivaron el pase a dicha situación.\nEn caso contrario causarán baja definitiva en la Compañía. Con carácter general, en \ncualquier situación de reincorporación a la situación de actividad tras una pérdida o \nsuspensión temporal de las licencias/habilitaciones necesarias para el desempeño de las \nfunciones a bordo de las aeronaves, se realizará de acuerdo a lo establecido en la \nnormativa legal e interna de la Compañía vigente en ese momento.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 91, titulo: 'Suspensión de actividad',
          estado: 'vigente', colectivos: ['CMD','COP','SCC','TCP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Es la situación en la que puede encontrarse un tripulante cuando, iniciado un \nexpediente relacionado con su función de tripulante, la Autoridad Judicial o Gubernativa, \no la Dirección de la Compañía, lo declaren provisionalmente en situación de inactividad \npara el vuelo, en espera de la resolución definitiva que se adopte. En aquellos casos en \nlos que se haya establecido que existe responsabilidad por parte del tripulante, quedará \na criterio de la compañía. Igualmente se encontrarán en esta situación las personas que, \ncomo consecuencia de cualquiera de los expedientes indicados en el párrafo anterior, \nestén cumpliendo la sanción principal o accesoria de suspensión temporal de su \nactividad en vuelo. En el supuesto de que el expediente fuese sobreseído, a los \ntripulantes afectados por los mismos, se les garantizarán las condiciones económicas \nderivadas de la media de la flota.\nApartado V. Uniformidad',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 92, titulo: 'Uniformidad Grupo Laboral III',
          estado: 'vigente', colectivos: ['SCC'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los trabajadores del Grupo Laboral III recibirán al iniciar su relación laboral las \nprendas de uniforme que se relacionan en este anexo, y en el que se especifica la \nduración y reposición de las mismas.\nEquipo\nInicial\nRenovación\nVestido manga larga/corta o camisa y pantalón.\n5\nPor deterioro.\nChaqueta bienvenida.\n1\nPor deterioro.\nCorbata.\n2\nPor deterioro.\nChaqueta a bordo.\n1\nPor deterioro.\nAbrigo.\n1\nPor deterioro.\nChaleco rojo.\n1\nPor deterioro.\nTocado.\n1\nPor deterioro.\nDelantal.\n1\nPor deterioro.\nBolso.\n1\nPor deterioro.\nTrolley Samsonite.\n1\nPor deterioro.\nNevera.\n1\nPor deterioro.\nPlaca identificativa.\n4\nPor deterioro.\nEquipo\nInicial\nRenovación\nPañuelo Celeste.\n2\nPor deterioro.\nPañuelo Azul.\n2\nPor deterioro.\nGuantes.\n1\nPor deterioro.\nMedias 20 DEN.\n6\nPor deterioro.\nMedias 40 DEN.\nN/A\nPor deterioro.\nZapatos.\n2\nPor deterioro.\nVestido de verano.\n3\nPor deterioro.\nEl número de prendas será proporcional a la duración de los contratos de un TCP por \naño.\nLa decisión de gabardina o abrigo, será a criterio de la dirección y aplicable al \nconjunto del colectivo.\nLa decisión de bolso de viaje o maleta, será a criterio de la dirección y aplicable al \nconjunto del colectivo. En caso de robo debidamente justificado, o deterioro, podrá \nsustituirse por uno nuevo a criterio de la dirección.\nLas prendas que por mal uso o lavado incorrecto se deterioren, serán abonadas por \nel TCP.\nA aquellos TCP que no puedan hacer uso de las medías o calcetines normales, la \nCompañía les facilitará una dotación de medías o calcetines de descanso, cuya cantidad \nsea equivalente por su precio a los normales.\nDebido a que la empresa vela por la imagen de Binter Canarias en todo momento, y \nen especial, por la imagen que proyecta el Colectivo de TCPs ya que es personal de \nprimera línea, si durante la vigencia del presente convenio la Compañía decidiera \nmodificar, prescindir o añadir, alguna prenda o el uniforme en su totalidad, podrá hacerlo \nprevia comunicación a los representantes del Colectivo de TCPs, informándoles de la \ndotación inicial y renovaciones que aplique.\nLa Dirección de la compañía velará en todo momento por mantener la buena imagen. \nPor este motivo, independientemente de este acuerdo proporcionará la uniformidad \nnecesaria para que esto se cumpla.\nToda la dotación de uniformidad proporcionada, no podrá ser utilizada para otros \nfines que no sean los laborales estipulados y asignados por la compañía.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
        {
          numero: 93, titulo: 'Uniformidad Grupo Laboral IV',
          estado: 'vigente', colectivos: ['CMD','COP'],
          fuente: 'BOE-A-2026-6389',
          texto_oficial:
            'Los trabajadores del Grupo IV de nuevo ingreso recibirán la dotación inicial detallada \nen la siguiente tabla.\nLa solicitud de renovación de la uniformidad se efectuará de acuerdo a la puntuación \nespecificada en la siguiente tabla. La sumatoria de cada prenda solicitada por la \npuntuación asignada a cada una no podrá superar los 66 puntos en la primera \nrenovación anual, 98 en la segunda y 120 en la tercera. Tras ella, se reiniciará el ciclo \ncon la primera renovación. Todo lo que exceda esta puntuación será a cargo del \ntrabajador.\nEquipo\nInicial\nRenovación\nTraje Piloto Verano.\n1 a elegir.\n50 puntos/ud.\nTraje Piloto Invierno.\n50 puntos/ud.\nCamisas manga corta.\n6 entre las dos.\n7 puntos/ud.\nCamisas manga larga.\n7 puntos/ud.\nGalón 4 barras + Estrella.\n–\n5 puntos/ud.\nEquipo\nInicial\nRenovación\nGalón 3 barras.\n–\n5 puntos/ud.\nCorbatas.\n4.\n5 puntos/ud.\nZapatos.\n2 pares.\n15 puntos/ud.\nChaleco.\n1.\n10 puntos/ud/ud.\nCardigan\n1\n15 puntos/ud.\nChaleco Piumino ligero marino\n1\n15 puntos/ud.\nCinturón\n2\n5 puntos/ud.\nCalcetines (pack de 3)\n2\n2 puntos/pack.\nNevera portalimentos\n1\n3 puntos/ud.\nPiloto Samsonite\n1 a elegir\n20 puntos/ud.\nMessenger Samsonite\n20 puntos/ud.\nTrolley cabina rígido\n1 a elegir\n20 puntos/ud.\nTrolley mediano rígido\n20 puntos/ud.\nDado que la persona trabajadora representa la imagen de la Compañía, este deberá \nvelar por el buen estado de la misma, presentándose en su lugar de trabajo con la \nuniformidad en buen estado.',
          resumen_operativo: null, afectaciones: [], related: [], faqs: [],
        },
      ],
    },

  ],

};
