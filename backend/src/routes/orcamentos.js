import { Router } from 'express';
import { listar, proximoNumero, salvar, atualizarStatus, excluir } from '../controllers/orcamentosController.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/',               listar);
router.get('/proximo-numero', proximoNumero);
router.post('/',              salvar);
router.patch('/:id/status',   atualizarStatus);
router.delete('/:id',         excluir);

export default router;
