import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';

export async function login(req, res) {
  const { nome, senha } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ erro: 'Nome e senha são obrigatórios.' });
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
  return res.json({ mensagem: 'Login realizado com sucesso.', usuario: usuarioSemSenha });
}
