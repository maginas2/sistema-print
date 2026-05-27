import { Router } from 'express';
import { gerar } from '../controllers/relatoriosController.js';

const router = Router();

router.get('/', gerar);

export default router;
