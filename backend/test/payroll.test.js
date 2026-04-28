import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularSolidaridadTrabajador2026 } from '../src/engine/ss2026.js';
import { distribuirHV } from '../src/engine/tramos.js';
import { calcularNomina } from '../src/engine/payrollEngine.js';

test('solidaridad es cero si no supera base máxima', () => {
  assert.equal(calcularSolidaridadTrabajador2026(5101.20).total, 0);
});

test('solidaridad se calcula solo sobre exceso', () => {
  const r = calcularSolidaridadTrabajador2026(6000);
  assert.equal(r.exceso, 898.80);
  assert.ok(r.total > 0 && r.total < 3);
});

test('distribuye HV con vacaciones proporcionalmente', () => {
  const r = distribuirHV(80, { diasMes: 30, diasVacaciones: 6 });
  assert.equal(r.horasBase, 48);
  assert.equal(r.anchoTramo, 8);
  assert.deepEqual({t1:r.t1,t2:r.t2,t3:r.t3,t4:r.t4}, { t1: 8, t2: 8, t3: 8, t4: 8 });
});

test('calcula una nómina CMD básica', () => {
  const r = calcularNomina({ funcion: 'CMD', nivel: 3, irpfPct: 34.15, hv: { autoTotal: 80 }, tramos: { diasMes: 30, diasVacaciones: 0 }, seguroMedico: true });
  assert.equal(r.grupo, 'IV');
  assert.ok(r.totales.bruto > 0);
  assert.ok(r.deducciones.ss.total > 0);
});

test('modo 14 pagas no devenga paga extra en marzo pero sí mantiene prorrata SS', () => {
  const r = calcularNomina({
    funcion: 'CMD', nivel: 3, mesNomina: 'Marzo', pagasProrrateadas: false,
    irpfPct: 34.15, hv: { t1: 10, t2: 2.2 }, seguroMedico: true,
  });
  assert.equal(r.conceptos.pagaExtraMes, 0);
  assert.equal(r.conceptos.pagasExtra.etiqueta, 'sin-extra-mensual');
  assert.equal(r.bases.prorrataExtrasSS, 719.10);
});

test('modo 14 pagas devenga paga extra completa en julio y no aumenta base SS por la extra cobrada', () => {
  const marzo = calcularNomina({
    funcion: 'CMD', nivel: 3, mesNomina: 'Marzo', pagasProrrateadas: false,
    irpfPct: 34.15, hv: { t1: 10, t2: 2.2 }, seguroMedico: true,
  });
  const julio = calcularNomina({
    funcion: 'CMD', nivel: 3, mesNomina: 'Julio', pagasProrrateadas: false,
    irpfPct: 34.15, hv: { t1: 10, t2: 2.2 }, seguroMedico: true,
  });
  assert.equal(julio.conceptos.pagaExtraMes, 4314.56);
  assert.equal(julio.conceptos.pagasExtra.etiqueta, 'extra-julio');
  assert.equal(julio.bases.baseCotizableSinTope, marzo.bases.baseCotizableSinTope);
  assert.equal(julio.bases.baseSS, marzo.bases.baseSS);
  assert.equal(julio.bases.baseIRPF, Number((marzo.bases.baseIRPF + 4314.56).toFixed(2)));
});

test('modo prorrateado devenga la prorrata mensual de las dos extras', () => {
  const r = calcularNomina({
    funcion: 'COP', nivel: 4, mesNomina: 'Marzo', pagasProrrateadas: true,
    irpfPct: 21.05, hv: { t1: 10, t2: 10, t3: 0.5 }, seguroMedico: false,
  });
  assert.equal(r.conceptos.pagaExtraMes, 310.56);
  assert.equal(r.conceptos.pagasExtra.extra1Dev, 155.28);
  assert.equal(r.conceptos.pagasExtra.extra2Dev, 155.28);
});
