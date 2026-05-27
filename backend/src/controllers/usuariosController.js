import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';

export async function cadastrar(req, res) {
  const { nome, email, senha, perfil } = req.body;

  if (!nome || !senha) {
    return res.status(400).json({ erro: 'Nome e senha são obrigatórios.' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres.' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nome, email: email ? email.toLowerCase().trim() : null, senha: senhaHash, perfil: perfil || 'operador' }])
    .select('id, nome, email, perfil, criado_em')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
    }
    return res.status(500).json({ erro: 'Erro ao cadastrar usuário.' });
  }

  return res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso.', usuario: data });
}

export async function listar(req, res) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, perfil, criado_em')
    .order('criado_em', { ascending: false });

  if (error) return res.status(500).json({ erro: 'Erro ao buscar usuários.' });

  return res.json(data);
}
