import express from 'express';
import { calcularNomina } from '../engine/payrollEngine.js';
import { compararContraEmpresa } from '../engine/compare.js';
import { distribuirHV, getTramosParams, auditarDistribucionHV } from '../engine/tramos.js';
import { calcularTipoRetencionReglamentario } from '../engine/irpf.js';
import { FUENTES } from '../config/sourceRegistry.js';
import { parseBinterPayslipText, buildEmpresaComparisonFromParsed } from '../parsers/binterPayslipParser.js';

export const payrollRouter = express.Router();

payrollRouter.post('/calcular-nomina', (req, res) => {
  try {
    const audit = req.query.audit !== '0';
    res.json({ ok: true, resultado: calcularNomina(req.body || {}, { audit }) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.post('/comparar-nomina', (req, res) => {
  try {
    const { input, empresa, tolerancia } = req.body || {};
    const calculado = calcularNomina(input || {}, { audit: true });
    const comparativa = compararContraEmpresa(calculado, empresa || {}, tolerancia ?? 0.01);
    res.json({ ok: true, resultado: { calculado, comparativa } });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.post('/irpf/reglamentario', (req, res) => {
  try {
    const audit = req.query.audit !== '0';
    res.json({ ok: true, resultado: calcularTipoRetencionReglamentario(req.body || {}, { audit }) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.post('/distribuir-hv', (req, res) => {
  try {
    const { totalHV, tramos } = req.body || {};
    res.json({ ok: true, resultado: distribuirHV(totalHV, tramos) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.post('/auditar-hv', (req, res) => {
  try {
    const { totalHV, tramos } = req.body || {};
    res.json({ ok: true, resultado: auditarDistribucionHV(totalHV, tramos) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.post('/tramos', (req, res) => {
  try {
    res.json({ ok: true, resultado: getTramosParams(req.body || {}) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});


payrollRouter.post('/parsear-nomina-binter-texto', (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: 'Falta campo text con el contenido extraído del PDF de nómina.' });
    const parsed = parseBinterPayslipText(text);
    res.json({ ok: true, resultado: parsed, empresaComparable: buildEmpresaComparisonFromParsed(parsed) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.post('/auditar-nomina-binter-texto', (req, res) => {
  try {
    const { text, input, tolerancia } = req.body || {};
    if (!text) return res.status(400).json({ ok: false, error: 'Falta campo text con el contenido extraído del PDF de nómina.' });
    const parsed = parseBinterPayslipText(text);
    const empresa = buildEmpresaComparisonFromParsed(parsed);
    const calculado = input ? calcularNomina(input, { audit: true }) : null;
    const comparativa = calculado ? compararContraEmpresa(calculado, empresa, tolerancia ?? 0.01) : null;
    res.json({ ok: true, resultado: { parsed, empresa, calculado, comparativa } });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

payrollRouter.get('/fuentes', (_req, res) => {
  res.json({ ok: true, fuentes: FUENTES });
});
