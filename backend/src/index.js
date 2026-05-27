import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usuariosRoutes from './routes/usuarios.js';
import authRoutes from './routes/auth.js';
import orcamentosRoutes from './routes/orcamentos.js';
import relatoriosRoutes from './routes/relatorios.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5175' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
