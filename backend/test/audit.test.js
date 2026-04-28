import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularNomina } from '../src/engine/payrollEngine.js';
import { compararContraEmpresa } from '../src/engine/compare.js';
import { auditarDistribucionHV } from '../src/engine/tramos.js';

test('la nómina backend devuelve traza auditable con fuente normativa', () => {
  const r = calcularNomina({ funcion: 'CMD', nivel: 1, irpfPct: 20, pagasProrrateadas: true, hv: { t1: 10, t2: 5, t3: 0, t4: 0 } });
  assert.equal(r.versionMotor, '2026.04-audit-v5-payslip-parser');
  assert.ok(r.audit.length >= 6);
  assert.ok(r.audit.some(a => a.codigo === 'SS_BASE_TOPADA'));
  assert.ok(r.audit.some(a => a.fuente === 'CONVENIO_RETRIBUCIONES'));
});

test('compararContraEmpresa marca diferencias fuera de tolerancia', () => {
  const r = calcularNomina({ funcion: 'COP', nivel: 4, irpfPct: 15, pagasProrrateadas: false, hv: { t1: 1 } });
  const c = compararContraEmpresa(r, { liquido: r.totales.liquido + 1 }, 0.01);
  assert.equal(c.ok, false);
  assert.equal(c.diferencias.find(d => d.campo === 'liquido').ok, false);
});

test('auditarDistribucionHV aplica vacaciones y reducción proporcional', () => {
  const r = auditarDistribucionHV(70, { diasMes: 30, diasVacaciones: 6, reduccionPct: 0 });
  assert.equal(r.tramos.factor, 0.8);
  assert.equal(r.distribucion.horasBase, 48);
  assert.equal(r.audit[0].fuente, 'CONVENIO_ART_40');
});
