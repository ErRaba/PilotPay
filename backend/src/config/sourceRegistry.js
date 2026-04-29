// Registro interno de fuentes. La clave es estable y se usa en la traza de auditoría.
// Mantener estas referencias sincronizadas con docs/FUENTES_NORMATIVAS.md.
export const FUENTES = Object.freeze({
  CONVENIO_BINTER_2026: {
    id: 'CONVENIO_BINTER_2026',
    tipo: 'convenio',
    titulo: 'Convenio colectivo de Binter Canarias, SA',
    publicacion: 'BOE-A-2026-6389',
    vigencia: '2026-01-01/2031-12-31',
  },
  CONVENIO_ART_25: { id: 'CONVENIO_ART_25', parent: 'CONVENIO_BINTER_2026', articulo: '25', descripcion: 'Clasificación profesional: Grupo III TCP y Grupo IV pilotos Embraer.' },
  CONVENIO_ART_26: { id: 'CONVENIO_ART_26', parent: 'CONVENIO_BINTER_2026', articulo: '26', descripcion: 'Cambio de nivel y progresión por grupos.' },
  CONVENIO_ART_40: { id: 'CONVENIO_ART_40', parent: 'CONVENIO_BINTER_2026', articulo: '40', descripcion: 'Reducción de jornada y reducción proporcional de tramos HV para Grupos III y IV, también vacaciones/licencia no retribuida.' },
  CONVENIO_ART_41: { id: 'CONVENIO_ART_41', parent: 'CONVENIO_BINTER_2026', articulo: '41', descripcion: 'Vacaciones: 30 días naturales para Grupos III y IV.' },
  CONVENIO_RETRIBUCIONES: { id: 'CONVENIO_RETRIBUCIONES', parent: 'CONVENIO_BINTER_2026', capitulo: 'VI', descripcion: 'Retribuciones y anexos salariales por grupo, función y nivel.' },
  SS_ORDEN_2026: { id: 'SS_ORDEN_2026', tipo: 'normativa', descripcion: 'Orden de cotización 2026. Base máxima mensual y cotización adicional de solidaridad.' },
  IRPF_PORCENTAJE_INFORMADO: { id: 'IRPF_PORCENTAJE_INFORMADO', tipo: 'criterio_app', descripcion: 'Cálculo manual: aplica el porcentaje informado por el usuario o la nómina.' },
  IRPF_REGLAMENTO_ART_81: { id: 'IRPF_REGLAMENTO_ART_81', tipo: 'normativa', norma: 'Real Decreto 439/2007', articulo: '81', descripcion: 'Límite cuantitativo excluyente de la obligación de retener.' },
  IRPF_REGLAMENTO_ART_82: { id: 'IRPF_REGLAMENTO_ART_82', tipo: 'normativa', norma: 'Real Decreto 439/2007', articulo: '82', descripcion: 'Procedimiento general para determinar el importe de la retención.' },
  IRPF_REGLAMENTO_ART_83: { id: 'IRPF_REGLAMENTO_ART_83', tipo: 'normativa', norma: 'Real Decreto 439/2007', articulo: '83', descripcion: 'Base para calcular el tipo de retención.' },
  IRPF_REGLAMENTO_ART_84: { id: 'IRPF_REGLAMENTO_ART_84', tipo: 'normativa', norma: 'Real Decreto 439/2007', articulo: '84', descripcion: 'Mínimo personal y familiar para calcular el tipo de retención.' },
  IRPF_REGLAMENTO_ART_85: { id: 'IRPF_REGLAMENTO_ART_85', tipo: 'normativa', norma: 'Real Decreto 439/2007', articulo: '85', descripcion: 'Cuota de retención y escala aplicable.' },
  IRPF_REGLAMENTO_ART_86: { id: 'IRPF_REGLAMENTO_ART_86', tipo: 'normativa', norma: 'Real Decreto 439/2007', articulo: '86', descripcion: 'Tipo de retención.' },
  IRPF_RD_142_2024: { id: 'IRPF_RD_142_2024', tipo: 'normativa', norma: 'Real Decreto 142/2024', descripcion: 'Modifica los artículos 81 y 83 del Reglamento IRPF en materia de retenciones.' },
});
