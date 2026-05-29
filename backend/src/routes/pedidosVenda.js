import { Router } from 'express';
import { salvar, listar } from '../controllers/pedidosVendaController.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.post('/', salvar);
router.get('/',  listar);

export default router;
