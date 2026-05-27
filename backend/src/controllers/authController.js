import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

export async function login(req, res) {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ erro: 'Nome e senha são obrigatórios.' });
  }
  if (typeof nome !== 'string' || nome.trim().length > 100) {
    return res.status(400).json({ erro: 'Nome inválido.' });
  }
  if (typeof senha !== 'string' || senha.length > 128) {
    return res.status(400).json({ erro: 'Senha inválida.' });
  }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, senha, perfil, criado_em')
    .eq('nome', nome.trim())
    .single();

  if (error || !usuario) {
    return res.status(401).json({ erro: 'Nome de usuário ou senha inválidos.' });
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
  if (!senhaCorreta) {
    return res.status(401).json({ erro: 'Nome de usuário ou senha inválidos.' });
  }

  const { senha: _, ...usuarioSemSenha } = usuario;

  const token = jwt.sign(
    { id: usuarioSemSenha.id, nome: usuarioSemSenha.nome, perfil: usuarioSemSenha.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return res.json({ mensagem: 'Login realizado com sucesso.', usuario: usuarioSemSenha, token });
}
