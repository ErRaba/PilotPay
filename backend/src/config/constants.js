export const SS_2026 = Object.freeze({
  BASE_MAX_MENSUAL: 5101.20,
  CC_TRABAJADOR: 0.0470,
  MEI_TRABAJADOR: 0.0015,
  DESEMPLEO_FP_TRABAJADOR: 0.0165,
  SOLIDARIDAD_T1: 0.0019,
  SOLIDARIDAD_T2: 0.0021,
  SOLIDARIDAD_T3: 0.0024,
});

export const ESPECIE = Object.freeze({
  SEGURO_MEDICO: 20.16,
  SEGURO_LICENCIA: 93.00,
  SEGURO_VIDA: 43.33,
});

export const DIETAS = Object.freeze({
  mant_nac: { total: 40.14, exenta: 36.06 },
  nac_sp: { total: 54.64, exenta: 36.06 },
  nac_cp: { total: 54.64, exenta: 53.34 },
  int_sp: { total: 72.48, exenta: 66.11 },
  int_cp: { total: 72.48, exenta: 72.48 },
  dest_nac: { total: 44.65, exenta: 44.65 },
  dest_int: { total: 44.65, exenta: 44.65 },
});

export const ROUND_CENTS = 100;
export function euros(value) {
  return Math.round((Number(value) || 0) * ROUND_CENTS) / ROUND_CENTS;
}
