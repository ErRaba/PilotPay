import { euros } from '../config/constants.js';

export function compararContraEmpresa(calculado, empresa = {}, tolerancia = 0.01) {
  const campos = [
    ['bruto', calculado?.totales?.bruto],
    ['baseSS', calculado?.bases?.baseSS],
    ['baseIRPF', calculado?.bases?.baseIRPF],
    ['ssTrabajador', calculado?.deducciones?.ss?.total],
    ['irpf', calculado?.deducciones?.irpf],
    ['liquido', calculado?.totales?.liquido],
  ];
  const diferencias = campos
    .filter(([k]) => empresa[k] !== undefined && empresa[k] !== null && empresa[k] !== '')
    .map(([k, app]) => {
      const emp = euros(Number(empresa[k]));
      const dif = euros(app - emp);
      return { campo: k, app: euros(app), empresa: emp, diferencia: dif, ok: Math.abs(dif) <= tolerancia };
    });
  return {
    tolerancia,
    diferencias,
    ok: diferencias.every(d => d.ok),
    resumen: diferencias.filter(d => !d.ok).length === 0 ? 'Sin diferencias fuera de tolerancia.' : 'Hay diferencias fuera de tolerancia.',
  };
}
