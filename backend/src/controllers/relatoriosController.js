import { supabase } from '../lib/supabase.js';

export async function gerar(req, res) {
  const { periodo, data_inicio, data_fim, usuario_id, perfil, filtro_usuario_id, filtro_status } = req.query;

  let query = supabase
    .from('orcamentos')
    .select('id, cliente, numero, total, criado_em, status, usuario_id, usuarios(nome)')
    .order('criado_em', { ascending: false });

  // ── Filtro de data ─────────────────────────────
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
    if (data_inicio) query = query.gte('criado_em', new Date(data_inicio).toISOString());
    if (data_fim) {
      const fim = new Date(data_fim); fim.setHours(23, 59, 59, 999);
      query = query.lte('criado_em', fim.toISOString());
    }
  }
  // 'todos' → sem filtro de data

  // ── Filtro de usuário ──────────────────────────
  if (perfil === 'admin') {
    if (filtro_usuario_id && filtro_usuario_id !== 'todos') {
      query = query.eq('usuario_id', filtro_usuario_id);
    }
    // admin sem filtro → vê tudo
  } else if (usuario_id) {
    query = query.eq('usuario_id', usuario_id);
  }

  // ── Filtro de status ──────────────────────────
  if (filtro_status && filtro_status !== 'todos') {
    query = query.eq('status', filtro_status);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ erro: 'Erro ao gerar relatório.' });

  const totais = data.map(o => parseFloat(o.total) || 0);
  const valorTotal   = totais.reduce((s, v) => s + v, 0);
  const maiorValor   = totais.length > 0 ? Math.max(...totais) : 0;
  const ticketMedio  = data.length > 0 ? valorTotal / data.length : 0;

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
