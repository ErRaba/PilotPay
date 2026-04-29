// Cliente API separado. En desarrollo: window.PILOTPAY_API_BASE = 'http://localhost:3000/api'
window.PilotPayAPI = {
  baseUrl: window.PILOTPAY_API_BASE || 'http://localhost:3000/api',
  async request(path, payload, options = {}) {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: options.method || 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: options.method === 'GET' ? undefined : JSON.stringify(payload || {}),
    });
    const data = await r.json();
    if (!r.ok || !data.ok) throw new Error(data.error || 'Error backend');
    return data.resultado ?? data;
  },
  calcularNomina(payload, { audit = true } = {}) {
    return this.request(`/calcular-nomina?audit=${audit ? '1' : '0'}`, payload);
  },
  compararNomina(input, empresa, tolerancia = 0.01) {
    return this.request('/comparar-nomina', { input, empresa, tolerancia });
  },
  distribuirHV(totalHV, tramos) {
    return this.request('/distribuir-hv', { totalHV, tramos });
  },
  auditarHV(totalHV, tramos) {
    return this.request('/auditar-hv', { totalHV, tramos });
  },
  calcularIRPFReglamentario(payload, { audit = true } = {}) {
    return this.request(`/irpf/reglamentario?audit=${audit ? '1' : '0'}`, payload);
  },
  parsearNominaBinterTexto(text) {
    return this.request('/parsear-nomina-binter-texto', { text });
  },
  auditarNominaBinterTexto(text, input = null, tolerancia = 0.01) {
    return this.request('/auditar-nomina-binter-texto', { text, input, tolerancia });
  },
  fuentes() {
    return this.request('/fuentes', null, { method: 'GET' });
  },
};
