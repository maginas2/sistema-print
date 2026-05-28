import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import usuariosRoutes from './routes/usuarios.js';
import authRoutes from './routes/auth.js';
import orcamentosRoutes from './routes/orcamentos.js';
import relatoriosRoutes from './routes/relatorios.js';

const app = express();

const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin === 'http://localhost:5175') return cb(null, true);
    if (process.env.VERCEL && origin.endsWith('.vercel.app')) return cb(null, true);
    if (extraOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS não permitido'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/usuarios',   usuariosRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.use((err, _req, res, _next) => {
  console.error('[ERRO]', err.message, err.stack);
  res.status(500).json({ erro: err.message });
});

export default app;
