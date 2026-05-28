import { supabase } from '../lib/supabase.js';

const PERIODOS_VALIDOS = ['diario', 'semanal', 'mensal', 'anual', 'personalizado', 'todos'];
const STATUS_VALIDOS   = ['pendente', 'concluido'];

export async function listar(req, res) {
  const { usuario_id, perfil } = req.query;

  let query = supabase
    .from('orcamentos')
    .select('id, cliente, numero, total, criado_em, status, usuarios(nome)')
    .order('criado_em', { ascending: false })
    .limit(200);

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

  if (!cliente || typeof cliente !== 'string' || cliente.trim().length > 200) {
    return res.status(400).json({ erro: 'Cliente inválido.' });
  }
  if (!numero || typeof numero !== 'string' || numero.length > 20) {
    return res.status(400).json({ erro: 'Número de orçamento inválido.' });
  }
  const totalNum = parseFloat(total);
  if (isNaN(totalNum) || totalNum < 0) {
    return res.status(400).json({ erro: 'Total inválido.' });
  }

  const { data, error } = await supabase
    .from('orcamentos')
    .insert([{
      usuario_id: usuario_id || null,
      cliente:    cliente.trim(),
      numero,
      total:      totalNum,
      status:     'pendente',
    }])
    .select('id, numero, status')
    .single();

  if (error) return res.status(500).json({ erro: 'Erro ao salvar orçamento.' });
  return res.status(201).json({ orcamento: data });
}

export async function excluir(req, res) {
  const { id } = req.params;
  if (!id || typeof id !== 'string' || id.length > 50) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  const { error } = await supabase
    .from('orcamentos')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ erro: 'Erro ao excluir orçamento.' });
  return res.json({ ok: true });
}

export async function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  if (!id || typeof id !== 'string' || id.length > 50) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  const { data, error } = await supabase
    .from('orcamentos')
    .update({ status })
    .eq('id', id)
    .select('id, status')
    .single();

  if (error) return res.status(500).json({ erro: 'Erro ao atualizar status.' });
  return res.json({ orcamento: data });
}
