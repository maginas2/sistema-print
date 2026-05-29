import { supabase } from '../lib/supabase.js';

const PERIODOS_VALIDOS = ['diario', 'semanal', 'mensal', 'anual', 'personalizado', 'todos'];
const STATUS_VALIDOS   = ['pendente', 'concluido', 'todos'];
const DATE_REGEX       = /^\d{4}-\d{2}-\d{2}$/;

export async function gerar(req, res) {
  const { periodo, data_inicio, data_fim, usuario_id, perfil, filtro_usuario_id, filtro_status } = req.query;

  if (!PERIODOS_VALIDOS.includes(periodo)) {
    return res.status(400).json({ erro: 'Período inválido.' });
  }
  if (filtro_status && !STATUS_VALIDOS.includes(filtro_status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  if (periodo === 'personalizado') {
    if (!data_inicio || !data_fim || !DATE_REGEX.test(data_inicio) || !DATE_REGEX.test(data_fim)) {
      return res.status(400).json({ erro: 'Datas inválidas para período personalizado.' });
    }
  }

  let query = supabase
    .from('orcamentos')
    .select('id, cliente, numero, total, criado_em, status, usuario_id, usuarios(nome), itens_orcamento(largura, altura)')
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
    if (filtro_usuario_id && filtro_usuario_id !== 'todos') {
      query = query.eq('usuario_id', filtro_usuario_id);
    }
  } else if (usuario_id) {
    query = query.eq('usuario_id', usuario_id);
  }

  if (filtro_status && filtro_status !== 'todos') {
    query = query.eq('status', filtro_status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: 'Erro ao gerar relatório.' });

  const totais      = data.map(o => parseFloat(o.total) || 0);
  const valorTotal  = totais.reduce((s, v) => s + v, 0);
  const maiorValor  = totais.length > 0 ? Math.max(...totais) : 0;
  const ticketMedio = data.length > 0 ? valorTotal / data.length : 0;

  return res.json({
    registros: data,
    stats: {
      total_orcamentos: data.length,
      valor_total:      valorTotal,
      ticket_medio:     ticketMedio,
      maior_orcamento:  maiorValor,
    },
  });
}
