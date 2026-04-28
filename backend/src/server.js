import express from 'express';
import cors from 'cors';
import { payrollRouter } from './routes/payroll.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'pilotpay-backend' }));
app.use('/api', payrollRouter);

app.listen(port, () => {
  console.log(`PilotPay backend escuchando en http://localhost:${port}`);
});
