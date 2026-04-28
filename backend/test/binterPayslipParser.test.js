import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBinterPayslipText, buildEmpresaComparisonFromParsed } from '../src/parsers/binterPayslipParser.js';
import { calcularNomina } from '../src/engine/payrollEngine.js';

const COP_MARZO_2026 = `
A38666897
BINTER CANARIAS S.A
28264239512
05299097N
JAVIER JOSE REY MARTINEZ
02/10/2023 PILOTO 4 EMBRAER 1
Copiloto
01/03/2026 - 31/03/2026
Aeropuerto MAD
30
189
1,0000 1.863,32 Salario Base 1.863,32
1,0000 167,25 Plus De Transporte 167,25
10,0000 26,28 Hora Vuelo T1 262,84
10,0000 29,18 Hora Vuelo T2 291,75
0,5000 31,80 Hora Vuelo T3 15,90
1,0000 310,55 Paga Extra Prorrateada 310,55
10,0000 36,06 Dieta Manutención Exenta 360,60
10,0000 4,08 Dieta Manutención Sujeta 40,76
Otros Conceptos 220,83
Complemento de base 833,33
Intereses Préstamo 41,58
Amortización Del Préstamo 270,75
4,70% 4.058,03 Cotización Cont. Comunes 190,73
0,15% 4.058,03 Cotización MEI 6,09
1,65% 4.058,03 Cotización D+Fp 66,96
21,05% 9,92 Retención A Cuenta Irpf Especie 2,09
21,05% 4.048,11 Retención A Cuenta Del Irpf 852,13
1,0000 9,92 Seguro Vida Especie 9,92
Coste SS Empresa......................... 1533,93
. Cot. SS Empresa CC.................. 957,69
. Cot. SS Empresa MEI.................. 30,43
. Cot. SS Empresa IT/IMS............. 290,15
. Cot. SS Empresa Desempleo..... 223,19
. Cot. SS Empresa FP................... 24,35
. Cot. SS Empresa FOGASA......... 8,12
4.058,03 0,00 4.058,03 4.058,03 4.048,11 4.408,71 1.388,75
3.019,96 Acum. Base IRPF 12.786,89
`;

const CMD_MARZO_2026 = `
21509951Y
ELOY INFANTE SECO DE HERRERA
01/07/2024 PILOTO CMDT. 3 1
Comandante
01/03/2026 - 31/03/2026
1,0000 4.314,56 Salario Base 4.314,56
1,0000 200,70 Plus De Transporte 200,70
10,0000 99,02 Hora Vuelo T1 990,25
2,2000 109,92 Hora Vuelo T2 241,82
2,0000 72,47 Dieta Desplaz. Inter. Pernocta Exenta 144,95
1,0000 66,11 Dieta Desplaz. Inter. Exenta 66,11
1,0000 6,36 Dieta Desplaz. Inter. Sujeta 6,36
9,0000 36,06 Dieta Manutención Exenta 324,54
9,0000 4,08 Dieta Manutención Sujeta 36,68
Otros Conceptos 883,33
Complemento de base 1.500,00
Seguro Médico 20,16
4,70% 5.101,20 Cotización Cont. Comunes 239,76
0,15% 5.101,20 Cotización MEI 7,65
0,19% 510,12 Cot. Adic. Solidaridad. Exceso Primer tramo 0,97
0,21% 2.040,48 Cot. Adic. Solidaridad. Exceso Segundo tramo 4,29
0,24% 1.304,48 Cot. Adic. Solidaridad. Exceso Tercer tramo 3,13
1,65% 5.101,20 Cotización D+Fp 84,17
34,15% 43,33 Retención A Cuenta Irpf Especie 14,80
34,15% 8.173,70 Retención A Cuenta Del Irpf 2.791,32
1,0000 43,33 Seguro Vida Especie 43,33
1,0000 20,16 Seguro Médico No Repercutido 20,16
8.237,19 719,09 5.101,20 5.101,20 8.173,70 8.709,30 3.166,25
5.543,05 Acum. Base IRPF 30.501,12
`;

test('parser detecta copiloto con base SS no topada y sin solidaridad', () => {
  const p = parseBinterPayslipText(COP_MARZO_2026);
  assert.equal(p.trabajador.esCopiloto, true);
  assert.equal(p.resumen.baseSS, 4058.03);
  assert.equal(p.resumen.baseSSTopada, false);
  assert.equal(p.resumen.solidaridadTrabajador, 0);
  assert.ok(p.flags.some(f => f.codigo === 'BASE_NO_TOPADA'));
});

test('parser clasifica préstamo como deducción privada neta', () => {
  const p = parseBinterPayslipText(COP_MARZO_2026);
  assert.equal(p.resumen.deduccionesPrivadas, 312.33);
  assert.ok(p.deduccionesPrivadas.some(d => d.key === 'interesesPrestamo' && d.importe === 41.58));
  assert.ok(p.deduccionesPrivadas.some(d => d.key === 'amortizacionPrestamo' && d.importe === 270.75));
});

test('parser mantiene solidaridad en comandante topado', () => {
  const p = parseBinterPayslipText(CMD_MARZO_2026);
  assert.equal(p.trabajador.esComandante, true);
  assert.equal(p.resumen.baseSS, 5101.20);
  assert.equal(p.resumen.baseSSTopada, true);
  assert.equal(p.resumen.solidaridadTrabajador, 8.39);
});

test('empresa comparable expone campos auditables', () => {
  const empresa = buildEmpresaComparisonFromParsed(parseBinterPayslipText(COP_MARZO_2026));
  assert.equal(empresa.baseSS, 4058.03);
  assert.equal(empresa.irpf, 854.22);
  assert.equal(empresa.deduccionesPrivadas, 312.33);
});

test('motor descuenta préstamo del líquido sin tocar bases', () => {
  const sin = calcularNomina({ funcion: 'COP', nivel: 4, irpfPct: 21.05, hv: { t1: 10, t2: 10, t3: 0.5 }, seguroVida: true, seguroMedico: false, pagasProrrateadas: true });
  const con = calcularNomina({ funcion: 'COP', nivel: 4, irpfPct: 21.05, hv: { t1: 10, t2: 10, t3: 0.5 }, seguroVida: true, seguroMedico: false, pagasProrrateadas: true, deduccionesPrivadas: { interesesPrestamo: 41.58, amortizacionPrestamo: 270.75 } });
  assert.equal(sin.bases.baseSS, con.bases.baseSS);
  assert.equal(sin.bases.baseIRPF, con.bases.baseIRPF);
  assert.equal(Number((sin.totales.liquido - con.totales.liquido).toFixed(2)), 312.33);
});
