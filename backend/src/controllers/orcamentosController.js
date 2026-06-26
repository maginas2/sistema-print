import { supabase } from '../lib/supabase.js';

const PERIODOS_VALIDOS = ['diario', 'semanal', 'mensal', 'anual', 'personalizado', 'todos'];
const STATUS_VALIDOS   = ['pendente', 'concluido'];

export async function listar(req, res) {
  const { perfil, id: usuario_id } = req.usuario;

  let query = supabase
    .from('orcamentos')
    .select('id, cliente, numero, total, criado_em, status, usuarios(nome), itens_orcamento(largura, altura)')
    .order('criado_em', { ascending: false })
    .limit(200);

  if (perfil !== 'admin') {
    query = query.eq('usuario_id', usuario_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: 'Erro ao buscar orçamentos.' });
  return res.json(data);
}

export async function proximoNumero(req, res) {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('numero')
    .order('id', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ erro: 'Erro ao gerar número.' });

  const ultimo = data?.[0]?.numero ? parseInt(data[0].numero, 10) : 0;
  const numero = String((isNaN(ultimo) ? 0 : ultimo) + 1).padStart(4, '0');
  return res.json({ numero });
}

export async function buscarPorNumero(req, res) {
  const { numero } = req.params;
  if (!numero || typeof numero !== 'string' || numero.length > 20) {
    return res.status(400).json({ erro: 'Número inválido.' });
  }

  const { data, error } = await supabase
    .from('orcamentos')
    .select('id, cliente, numero, total, observacao, criado_em, status, usuarios(nome), itens_orcamento(id, produto_nome, preco_m2, largura, altura, quantidade, total)')
    .eq('numero', numero)
    .order('id', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ erro: 'Erro ao buscar orçamento.' });
  if (!data || data.length === 0) return res.status(404).json({ erro: 'Orçamento não encontrado.' });
  return res.json(data[0]);
}

export async function salvar(req, res) {
  const { usuario_id, cliente, numero, total, observacao, itens } = req.body;

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
      observacao: observacao ? String(observacao).slice(0, 1000) : null,
      status:     'pendente',
    }])
    .select('id, numero, status')
    .single();

  if (error) return res.status(500).json({ erro: 'Erro ao salvar orçamento.' });

  if (Array.isArray(itens) && itens.length > 0) {
    const registros = itens.map(item => ({
      orcamento_id: data.id,
      produto_nome: String(item.produto || item.produto_nome || '').slice(0, 300),
      preco_m2:    parseFloat(item.preco   || item.preco_m2)  || 0,
      largura:     parseFloat(item.largura) || 0,
      altura:      parseFloat(item.altura)  || 0,
      quantidade:  parseInt(item.quantidade) || 1,
      total:       parseFloat(item.total)   || 0,
    }));
    await supabase.from('itens_orcamento').insert(registros);
  }

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

export async function atualizar(req, res) {
  const { id } = req.params;
  const { cliente, observacao, itens } = req.body;

  if (!id || typeof id !== 'string' || id.length > 50) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }
  if (!cliente || typeof cliente !== 'string' || cliente.trim().length > 200) {
    return res.status(400).json({ erro: 'Cliente inválido.' });
  }

  const novoTotal = Array.isArray(itens) && itens.length > 0
    ? itens.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
    : null;

  const updateObj = {
    cliente:    cliente.trim(),
    observacao: observacao ? String(observacao).slice(0, 1000) : null,
  };
  if (novoTotal !== null) updateObj.total = novoTotal;

  const { data, error } = await supabase
    .from('orcamentos')
    .update(updateObj)
    .eq('id', id)
    .select('id, numero, cliente, total, status')
    .single();

  if (error) return res.status(500).json({ erro: 'Erro ao atualizar orçamento.' });

  if (Array.isArray(itens)) {
    await supabase.from('itens_orcamento').delete().eq('orcamento_id', id);
    if (itens.length > 0) {
      const registros = itens.map(item => ({
        orcamento_id: parseInt(id),
        produto_nome: String(item.produto_nome || item.produto || '').slice(0, 300),
        preco_m2:    parseFloat(item.preco_m2 || item.preco || 0) || 0,
        largura:     parseFloat(item.largura)  || 0,
        altura:      parseFloat(item.altura)   || 0,
        quantidade:  parseInt(item.quantidade) || 1,
        total:       parseFloat(item.total)    || 0,
      }));
      await supabase.from('itens_orcamento').insert(registros);
    }
  }

  return res.json({ orcamento: data });
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
