import { Router } from 'express';
import { cadastrar, listar } from '../controllers/usuariosController.js';

const router = Router();

router.post('/',   cadastrar);
router.get('/',    listar);

export default router;
