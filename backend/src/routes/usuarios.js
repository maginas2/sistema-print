import { Router } from 'express';
import { cadastrar, listar } from '../controllers/usuariosController.js';
import { autenticar } from '../middleware/auth.js';

const router = Router();

router.use(autenticar);
router.post('/', cadastrar);
router.get('/',  listar);

export default router;
