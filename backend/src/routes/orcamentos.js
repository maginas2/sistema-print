import { Router } from 'express';
import { listar, proximoNumero, salvar } from '../controllers/orcamentosController.js';

const router = Router();

router.get('/', listar);
router.get('/proximo-numero', proximoNumero);
router.post('/', salvar);

export default router;
