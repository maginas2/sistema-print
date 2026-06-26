import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import usuariosRoutes from './routes/usuarios.js';
import authRoutes from './routes/auth.js';
import orcamentosRoutes from './routes/orcamentos.js';
import relatoriosRoutes from './routes/relatorios.js';
import pedidosVendaRoutes from './routes/pedidosVenda.js';

const app = express();

const origensPermitidas = [
  'http://localhost:5173',
  'http://localhost:5175',
  ...(process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : []),
];

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origensPermitidas.includes(origin)) return cb(null, true);
    cb(new Error('CORS não permitido'));
  },
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/usuarios',   usuariosRoutes);
app.use('/api/auth',       authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/relatorios',   relatoriosRoutes);
app.use('/api/pedidos-venda', pedidosVendaRoutes);

app.use((err, _req, res, _next) => {
  console.error('[ERRO]', err.message, err.stack);
  res.status(500).json({ erro: err.message });
});

export default app;
