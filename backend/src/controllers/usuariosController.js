import bcrypt from 'bcryptjs';
import { supabase } from '../lib/supabase.js';

const PERFIS_VALIDOS = ['admin', 'operador'];

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function cadastrar(req, res) {
  const { nome, email, senha, perfil } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2 || nome.trim().length > 100) {
    return res.status(400).json({ erro: 'Nome deve ter entre 2 e 100 caracteres.' });
  }
  if (!senha || typeof senha !== 'string') {
    return res.status(400).json({ erro: 'Senha é obrigatória.' });
  }
  if (senha.length < 6 || senha.length > 128) {
    return res.status(400).json({ erro: 'A senha deve ter entre 6 e 128 caracteres.' });
  }
  if (email && !emailValido(email)) {
    return res.status(400).json({ erro: 'E-mail inválido.' });
  }
  if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
    return res.status(400).json({ erro: 'Perfil inválido. Use "admin" ou "operador".' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const { data, error } = await supabase
    .from('usuarios')
    .insert([{
      nome:   nome.trim(),
      email:  email ? email.toLowerCase().trim() : null,
      senha:  senhaHash,
      perfil: perfil || 'operador',
    }])
    .select('id, nome, email, perfil, criado_em')
    .single();

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Este nome de usuário já está cadastrado.' });
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
