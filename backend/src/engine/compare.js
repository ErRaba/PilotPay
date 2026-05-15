import { euros } from '../config/constants.js';

/**
 * Compara el resultado de la calculadora contra los datos reales de la empresa.
 *
 * REGLA ANTI-DOBLE-CONTEO:
 *   Los conceptos individuales de devengo (SB, HV, DPO, etc.) se comparan
 *   directamente. El Total Devengado NO se incluye en el listado de diferencias
 *   porque ya es la suma de esos conceptos → incluirlo duplicaría la discrepancia.
 *
 *   El Líquido Neto se calcula siempre como (real − teórico) directo y se
 *   presenta como dato informativo final, nunca dentro del acumulado de errores.
 *
 * @param {object} calculado  Resultado de la calculadora (calcResult shape)
 * @param {object} empresa    Datos extraídos del PDF por buildEmpresaComparisonFromParsed
 * @param {number} tolerancia Diferencia máxima (€) para considerar OK (default 0.01)
 * @returns {{ diferencias, liquidoDirecto, ok, resumen, totalDelta }}
 */
export function compararContraEmpresa(calculado, empresa = {}, tolerancia = 0.01) {
  // ── Conceptos individuales (nunca incluir Total Devengado) ──────────────
  const campos = [
    ['bruto',        calculado?.totales?.bruto,             'Total Devengado'],   // renaming for clarity only
    ['baseSS',       calculado?.bases?.baseSS,              'Base SS'],
    ['baseIRPF',     calculado?.bases?.baseIRPF,            'Base IRPF'],
    ['ssTrabajador', calculado?.deducciones?.ss?.total,     'SS Trabajador'],
    ['irpf',         calculado?.deducciones?.irpf,          'Retención IRPF'],
  ];

  const diferencias = campos
    .filter(([k]) => empresa[k] !== undefined && empresa[k] !== null && empresa[k] !== '')
    .map(([k, app, label]) => {
      const emp = euros(Number(empresa[k]));
      const dif = euros(app - emp);
      return {
        campo:      k,
        label:      label || k,
        app:        euros(app),
        empresa:    emp,
        diferencia: dif,
        ok:         Math.abs(dif) <= tolerancia,
      };
    });

  // ── Líquido: directo (real − teórico), nunca acumulado ─────────────────
  const liqApp     = calculado?.totales?.liquido;
  const liqEmp     = empresa.liquido != null ? euros(Number(empresa.liquido)) : null;
  const liquidoDirecto = liqEmp != null
    ? { app: euros(liqApp), empresa: liqEmp, diferencia: euros(liqEmp - liqApp), ok: Math.abs(liqEmp - liqApp) <= tolerancia }
    : null;

  // totalDelta: solo suma conceptos individuales (excluye líquido)
  const totalDelta = diferencias.filter(d => !d.ok).reduce((s, d) => s + d.diferencia, 0);

  return {
    tolerancia,
    diferencias,
    liquidoDirecto,
    totalDelta,
    ok:      diferencias.every(d => d.ok) && (liquidoDirecto?.ok ?? true),
    resumen: diferencias.filter(d => !d.ok).length === 0 && (liquidoDirecto?.ok ?? true)
      ? 'Sin diferencias fuera de tolerancia.'
      : 'Hay diferencias fuera de tolerancia.',
  };
}
