import { Router } from 'express';
import { listar, proximoNumero, buscarPorNumero, salvar, atualizar, atualizarStatus, excluir } from '../controllers/orcamentosController.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/',                    listar);
router.get('/proximo-numero',      proximoNumero);
router.get('/por-numero/:numero',  buscarPorNumero);
router.post('/',                   salvar);
router.put('/:id',                 atualizar);
router.patch('/:id/status',        atualizarStatus);
router.delete('/:id',              excluir);

export default router;
