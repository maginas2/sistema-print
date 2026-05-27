import { supabase } from '../lib/supabase.js';

export async function listar(req, res) {
  const { usuario_id, perfil } = req.query;

  let query = supabase
    .from('orcamentos')
    .select('id, cliente, numero, total, criado_em')
    .order('criado_em', { ascending: false })
    .limit(50);

  if (perfil !== 'admin' && usuario_id) {
    query = query.eq('usuario_id', usuario_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: 'Erro ao buscar orçamentos.' });
  return res.json(data);
}

export async function proximoNumero(req, res) {
  const { count, error } = await supabase
    .from('orcamentos')
    .select('*', { count: 'exact', head: true });

  if (error) return res.status(500).json({ erro: 'Erro ao gerar número.' });

  const numero = String((count || 0) + 1).padStart(4, '0');
  return res.json({ numero });
}

export async function salvar(req, res) {
  const { usuario_id, cliente, numero, total } = req.body;

  const { data, error } = await supabase
    .from('orcamentos')
    .insert([{ usuario_id: usuario_id || null, cliente, numero, total }])
    .select('id, numero')
    .single();

  if (error) return res.status(500).json({ erro: 'Erro ao salvar orçamento.' });
  return res.status(201).json({ orcamento: data });
}
