import { Router } from 'express';
import { gerar } from '../controllers/relatoriosController.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/', gerar);

export default router;
