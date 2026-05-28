import { Router } from 'express';
import { cadastrar, listar, atualizar, excluir } from '../controllers/usuariosController.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.get('/',       listar);
router.post('/',      cadastrar);
router.put('/:id',    atualizar);
router.delete('/:id', excluir);

export default router;
