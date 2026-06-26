import { Router } from 'express';
import { cadastrar, listar, atualizar, excluir } from '../controllers/usuariosController.js';
import { autenticar, somenteAdmin } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/',       listar);
router.post('/',      somenteAdmin, cadastrar);
router.put('/:id',    somenteAdmin, atualizar);
router.delete('/:id', somenteAdmin, excluir);

export default router;
