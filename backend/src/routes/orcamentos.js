import { Router } from 'express';
import { listar, proximoNumero, salvar, atualizarStatus } from '../controllers/orcamentosController.js';

const router = Router();

router.get('/',                   listar);
router.get('/proximo-numero',     proximoNumero);
router.post('/',                  salvar);
router.patch('/:id/status',       atualizarStatus);

export default router;
