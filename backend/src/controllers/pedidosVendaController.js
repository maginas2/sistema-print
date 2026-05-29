import { supabase } from '../lib/supabase.js';

const PERIODOS_VALIDOS = ['diario', 'semanal', 'mensal', 'anual', 'todos'];
const DATE_REGEX       = /^\d{4}-\d{2}-\d{2}$/;

export async function salvar(req, res) {
  const { orcamento_id, numero_orcamento, cliente, usuario_id, vendedor_nome, total_produtos, desconto, total_final, situacao, condicoes } = req.body;

  if (!numero_orcamento || !cliente || !usuario_id) {
    return res.status(400).json({ erro: 'Campos obrigatórios: numero_orcamento, cliente, usuario_id.' });
  }

  const { data, error } = await supabase
    .from('pedidos_venda')
    .insert({
      orcamento_id:     orcamento_id ?? null,
      numero_orcamento: String(numero_orcamento),
      cliente:          String(cliente),
      usuario_id:       Number(usuario_id),
      vendedor_nome:    vendedor_nome ?? null,
      total_produtos:   Number(total_produtos) || 0,
      desconto:         Number(desconto) || 0,
      total_final:      Number(total_final) || 0,
      situacao:         situacao ?? null,
      condicoes:        condicoes ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ erro: 'Erro ao salvar pedido de venda.' });
  return res.status(201).json(data);
}

export async function listar(req, res) {
  const { periodo = 'todos', data_inicio, data_fim, usuario_id, perfil } = req.query;

  if (!PERIODOS_VALIDOS.includes(periodo)) {
    return res.status(400).json({ erro: 'Período inválido.' });
  }
  if (periodo === 'personalizado') {
    if (!data_inicio || !data_fim || !DATE_REGEX.test(data_inicio) || !DATE_REGEX.test(data_fim)) {
      return res.status(400).json({ erro: 'Datas inválidas para período personalizado.' });
    }
  }

  let query = supabase
    .from('pedidos_venda')
    .select('id, numero_orcamento, cliente, vendedor_nome, total_produtos, desconto, total_final, situacao, condicoes, criado_em, usuario_id')
    .order('criado_em', { ascending: false });

  const agora = new Date();

  if (periodo === 'diario') {
    const inicio = new Date(agora); inicio.setHours(0, 0, 0, 0);
    const fim    = new Date(agora); fim.setHours(23, 59, 59, 999);
    query = query.gte('criado_em', inicio.toISOString()).lte('criado_em', fim.toISOString());

  } else if (periodo === 'semanal') {
    const inicio = new Date(agora); inicio.setDate(agora.getDate() - 6); inicio.setHours(0, 0, 0, 0);
    query = query.gte('criado_em', inicio.toISOString());

  } else if (periodo === 'mensal') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    query = query.gte('criado_em', inicio.toISOString());

  } else if (periodo === 'anual') {
    const inicio = new Date(agora.getFullYear(), 0, 1);
    query = query.gte('criado_em', inicio.toISOString());

  } else if (periodo === 'personalizado') {
    const fim = new Date(data_fim); fim.setHours(23, 59, 59, 999);
    query = query
      .gte('criado_em', new Date(data_inicio).toISOString())
      .lte('criado_em', fim.toISOString());
  }

  if (perfil === 'admin') {
    // admin vê todos
  } else if (usuario_id) {
    query = query.eq('usuario_id', usuario_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: 'Erro ao listar pedidos de venda.' });

  const totais      = data.map(p => parseFloat(p.total_final) || 0);
  const valorTotal  = totais.reduce((s, v) => s + v, 0);
  const maiorValor  = totais.length > 0 ? Math.max(...totais) : 0;
  const ticketMedio = data.length > 0 ? valorTotal / data.length : 0;

  return res.json({
    registros: data,
    stats: {
      total_pedidos: data.length,
      valor_total:   valorTotal,
      ticket_medio:  ticketMedio,
      maior_pedido:  maiorValor,
    },
  });
}
