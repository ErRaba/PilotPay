import test from 'node:test';
import assert from 'node:assert/strict';
import { aplicarEscalaRetencion, calcularTipoRetencionReglamentario, minimoExcluidoRetencion } from '../src/engine/irpf.js';
import { calcularNomina } from '../src/engine/payrollEngine.js';

test('escala IRPF aplica los tramos del art. 85', () => {
  assert.equal(aplicarEscalaRetencion(12450), 2365.5);
  assert.equal(aplicarEscalaRetencion(20200), 4225.5);
  assert.equal(aplicarEscalaRetencion(60000), 17901.5);
});

test('mínimo excluido art.81 para situación 3 sin hijos', () => {
  assert.equal(minimoExcluidoRetencion({ situacion: 'situacion3', descendientes: [] }), 15876);
});

test('IRPF reglamentario devuelve tipo cero bajo mínimo excluido', () => {
  const r = calcularTipoRetencionReglamentario({ retribucionesAnuales: 15000, situacion: 'situacion3' });
  assert.equal(r.tipo, 0);
});

test('IRPF reglamentario calcula tipo y traza auditada', () => {
  const r = calcularTipoRetencionReglamentario({ retribucionesAnuales: 80000, ssAnual: 6000, situacion: 'situacion3', retribucionMensualSujeta: 6500 }, { audit: true });
  assert.ok(r.tipo > 20);
  assert.ok(r.audit.some(a => a.codigo === 'IRPF_ART_86_TIPO'));
});

test('calcularNomina puede activar modo IRPF reglamentario', () => {
  const r = calcularNomina({ funcion: 'CMD', nivel: 3, irpfModo: 'reglamentario', hv: { autoTotal: 80 }, tramos: { diasMes: 30, diasVacaciones: 0 }, irpf: { situacion: 'situacion3', edad: 52 } });
  assert.equal(r.deducciones.irpfModo, 'reglamentario');
  assert.ok(r.deducciones.irpfPct > 0);
  assert.ok(r.audit.some(a => a.codigo === 'IRPF_ART_82_PROCEDIMIENTO'));
});
