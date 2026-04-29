import { euros } from '../config/constants.js';

export function auditStep({ codigo, concepto, formula, entradas = {}, resultado, fuente, notas = [] }) {
  return {
    codigo,
    concepto,
    formula,
    entradas: normalizar(entradas),
    resultado: typeof resultado === 'number' ? euros(resultado) : resultado,
    fuente,
    notas,
  };
}

function normalizar(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'number' ? euros(v) : v]));
}

export function assertNumero(nombre, valor, { min = 0, max = Number.POSITIVE_INFINITY, requerido = false } = {}) {
  if ((valor === undefined || valor === null || valor === '') && !requerido) return 0;
  const n = Number(valor);
  if (!Number.isFinite(n)) throw new Error(`${nombre} debe ser numérico`);
  if (n < min) throw new Error(`${nombre} no puede ser inferior a ${min}`);
  if (n > max) throw new Error(`${nombre} no puede ser superior a ${max}`);
  return n;
}
