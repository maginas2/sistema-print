import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import { fmt } from '../utils/fmt';
import { gerarPedidoVendaPDF } from '../utils/pdf';

const PERIODOS = [
  { v: 'todos',   l: 'Todos' },
  { v: 'mensal',  l: 'Este mês' },
  { v: 'semanal', l: 'Esta semana' },
  { v: 'anual',   l: 'Este ano' },
];

export default function PedidoVenda({ usuario }) {
  const [orcamentos,  setOrcamentos]  = useState([]);
  const [carregando,  setCarregando]  = useState(false);
  const [selecionado, setSelecionado] = useState(null);
  const [buscandoDet, setBuscandoDet] = useState(false);
  const [erroDet,     setErroDet]     = useState('');
  const [situacao,    setSituacao]    = useState('');
  const [condicoes,   setCondicoes]   = useState('');
  const [desconto,    setDesconto]    = useState('');
  const [gerando,     setGerando]     = useState(false);
  const [busca,       setBusca]       = useState('');

  const [historico,         setHistorico]         = useState([]);
  const [statsHist,         setStatsHist]         = useState(null);
  const [carregandoHist,    setCarregandoHist]    = useState(false);
  const [periodoHist,       setPeriodoHist]       = useState('todos');

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;
    setCarregando(true);
    try {
      const params = new URLSearchParams({ usuario_id: usuario.id, perfil: usuario.perfil });
      const res = await apiFetch(`/api/orcamentos?${params}`);
      if (res.ok) setOrcamentos(await res.json());
    } catch { /* silencioso */ }
    finally { setCarregando(false); }
  }, [usuario]);

  const carregarHistorico = useCallback(async (periodo = periodoHist) => {
    if (!usuario?.id) return;
    setCarregandoHist(true);
    try {
      const params = new URLSearchParams({ usuario_id: usuario.id, perfil: usuario.perfil, periodo });
      const res = await apiFetch(`/api/pedidos-venda?${params}`);
      if (res.ok) {
        const json = await res.json();
        setHistorico(json.registros || []);
        setStatsHist(json.stats || null);
      }
    } catch { /* silencioso */ }
    finally { setCarregandoHist(false); }
  }, [usuario, periodoHist]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { carregarHistorico(periodoHist); }, [periodoHist, usuario]);

  async function selecionar(orc) {
    setBuscandoDet(true);
    setErroDet('');
    setSelecionado(null);
    setSituacao('');
    setCondicoes('');
    setDesconto('');
    try {
      const res = await apiFetch(`/api/orcamentos/por-numero/${encodeURIComponent(orc.numero)}`);
      if (!res.ok) { setErroDet('Erro ao carregar detalhes.'); return; }
      setSelecionado(await res.json());
    } catch { setErroDet('Erro ao conectar com o servidor.'); }
    finally { setBuscandoDet(false); }
  }

  async function handleGerarPDF() {
    if (!selecionado) return;
    setGerando(true);
    try {
      const descNum2   = parseFloat((desconto || '0').replace(',', '.')) || 0;
      const itens2     = selecionado.itens_orcamento || [];
      const valProd    = itens2.length > 0
        ? itens2.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
        : (parseFloat(selecionado.total) || 0);
      const valTotal   = valProd - descNum2;
      const vendedorNm = selecionado.usuarios?.nome || usuario?.nome || '—';

      await gerarPedidoVendaPDF({
        cliente:        selecionado.cliente,
        numero:         selecionado.numero,
        vendedor:       vendedorNm,
        situacao,
        condicoes,
        desconto:       descNum2,
        itens:          itens2,
        totalOrcamento: parseFloat(selecionado.total) || 0,
      });

      try {
        await apiFetch('/api/pedidos-venda', {
          method: 'POST',
          body: JSON.stringify({
            orcamento_id:     selecionado.id,
            numero_orcamento: selecionado.numero,
            cliente:          selecionado.cliente,
            usuario_id:       usuario.id,
            vendedor_nome:    vendedorNm,
            total_produtos:   valProd,
            desconto:         descNum2,
            total_final:      valTotal,
            situacao,
            condicoes,
          }),
        });
        carregarHistorico(periodoHist);
      } catch { /* não bloqueia a geração do PDF */ }
    } finally { setGerando(false); }
  }

  const itens         = selecionado?.itens_orcamento || [];
  const descNum       = parseFloat((desconto || '0').replace(',', '.')) || 0;
  const valorProdutos = itens.length > 0
    ? itens.reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
    : (parseFloat(selecionado?.total) || 0);
  const valorTotal = valorProdutos - descNum;

  const filtrados = orcamentos.filter(o => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return o.cliente?.toLowerCase().includes(q) || o.numero?.toLowerCase().includes(q);
  });

  /* ── LISTA ─────────────────────────────────────── */
  if (!selecionado) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zm-1.5 15c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h13v1zm0-3H6V4h12v11zM8 9h8v2H8zm0 4h8v2H8z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Pedido de Venda</h2>
            <p>Selecione um orçamento para gerar o pedido</p>
          </div>
          <button
            className="btn-limpar-hist"
            onClick={carregar}
            disabled={carregando}
            style={{ opacity: carregando ? .5 : 1, flexShrink: 0 }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'currentColor', marginRight: 4, verticalAlign: 'middle', animation: carregando ? 'spin .8s linear infinite' : 'none' }}>
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="orc-toolbar" style={{ borderTop: 'none' }}>
            <div className="orc-search-wrap">
              <svg viewBox="0 0 24 24" className="orc-search-icon">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                className="orc-search-input"
                placeholder="Filtrar por cliente ou nº do orçamento…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
              {busca && (
                <button className="orc-search-clear" onClick={() => setBusca('')}>✕</button>
              )}
            </div>
          </div>

          {erroDet && (
            <div style={{ padding: '10px 20px', color: 'var(--red, #dc2626)', fontWeight: 500, fontSize: 13 }}>
              {erroDet}
            </div>
          )}

          {filtrados.length === 0 && !carregando ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
              <p>Nenhum orçamento encontrado.</p>
            </div>
          ) : (
            <div className="hist-wrap hist-status-admin">
              <div className="hist-header">
                <span>Nº</span>
                <span>Cliente</span>
                <span>Feito por</span>
                <span>Data</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span style={{ textAlign: 'center' }}>Ação</span>
              </div>
              {filtrados.map(o => {
                const dataStr = o.criado_em
                  ? new Date(o.criado_em).toLocaleDateString('pt-BR')
                  : (o.data || '—');
                return (
                  <div key={o.id} className="hist-row">
                    <span className="hist-num">{o.numero}</span>
                    <span className="hist-cliente">{o.cliente}</span>
                    <span className="hist-data" style={{ fontWeight: 600 }}>
                      {o.usuarios?.nome || o.usuario_nome || '—'}
                    </span>
                    <span className="hist-data">{dataStr}</span>
                    <span>
                      <span className={`status-badge status-${o.status || 'pendente'}`}>
                        {o.status === 'concluido' ? '✓ Concluído' : '● Pendente'}
                      </span>
                    </span>
                    <span className="hist-total">{fmt(parseFloat(o.total) || 0)}</span>
                    <span style={{ textAlign: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 14px', fontSize: 13 }}
                        onClick={() => selecionar(o)}
                        disabled={buscandoDet}
                      >
                        {buscandoDet ? '…' : 'Selecionar'}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Histórico de Pedidos Gerados ─────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon" style={{ background: 'var(--blue-light)' }}>
            <svg viewBox="0 0 24 24" style={{ fill: 'var(--blue)' }}><path d="M9 17H7v-3h2v3zm4 0h-2v-7h2v7zm4 0h-2v-5h2v5zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Histórico de Pedidos Gerados</h2>
            <p>{statsHist ? `${statsHist.total_pedidos} pedido(s) no período` : 'Carregando…'}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {PERIODOS.map(p => (
              <button
                key={p.v}
                onClick={() => setPeriodoHist(p.v)}
                className={periodoHist === p.v ? 'btn-primary' : 'btn-limpar-hist'}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {statsHist && (
          <div className="dash-stats" style={{ padding: '12px 20px 0' }}>
            <div className="dash-stat">
              <div className="stat-value">{statsHist.total_pedidos}</div>
              <div className="stat-label">Pedidos gerados</div>
            </div>
            <div className="dash-stat">
              <div className="stat-value">{fmt(statsHist.valor_total)}</div>
              <div className="stat-label">Valor total</div>
            </div>
            <div className="dash-stat">
              <div className="stat-value">{fmt(statsHist.ticket_medio)}</div>
              <div className="stat-label">Ticket médio</div>
            </div>
            <div className="dash-stat">
              <div className="stat-value">{fmt(statsHist.maior_pedido)}</div>
              <div className="stat-label">Maior pedido</div>
            </div>
          </div>
        )}

        <div className="card-body" style={{ padding: 0 }}>
          {carregandoHist ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-600)', fontSize: 13 }}>Carregando…</div>
          ) : historico.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24"><path d="M9 17H7v-3h2v3zm4 0h-2v-7h2v7zm4 0h-2v-5h2v5zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
              <p>Nenhum pedido gerado neste período.</p>
            </div>
          ) : (
            <div className="hist-wrap" style={{ margin: 0 }}>
              <div className="hist-header" style={{ gridTemplateColumns: '80px 1fr 130px 90px 110px' }}>
                <span>Nº Orç.</span>
                <span>Cliente</span>
                <span>Vendedor</span>
                <span>Data</span>
                <span style={{ textAlign: 'right' }}>Total Final</span>
              </div>
              {historico.map(p => (
                <div key={p.id} className="hist-row" style={{ gridTemplateColumns: '80px 1fr 130px 90px 110px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.numero_orcamento}</span>
                  <span style={{ color: 'var(--gray-800)' }}>{p.cliente}</span>
                  <span style={{ color: 'var(--gray-600)', fontSize: 12 }}>{p.vendedor_nome || '—'}</span>
                  <span style={{ color: 'var(--gray-600)', fontSize: 12 }}>
                    {p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '—'}
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(parseFloat(p.total_final) || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    );
  }

  /* ── FORMULÁRIO ────────────────────────────────── */
  const vendedor = selecionado.usuarios?.nome || usuario?.nome || '—';
  const dataOrc  = selecionado.criado_em
    ? new Date(selecionado.criado_em).toLocaleDateString('pt-BR')
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Cabeçalho do pedido ─────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zm-1.5 15c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h13v1zm0-3H6V4h12v11zM8 9h8v2H8zm0 4h8v2H8z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Pedido de Venda <span style={{ color: 'var(--blue)' }}>#{selecionado.numero}</span></h2>
            <p>{selecionado.cliente} · {dataOrc} · Vendedor: {vendedor}</p>
          </div>
          <button className="btn-limpar-hist" onClick={() => setSelecionado(null)} style={{ flexShrink: 0 }}>
            ← Voltar à lista
          </button>
        </div>

        {/* Sumário cliente */}
        <div className="card-body" style={{ paddingTop: 0 }}>
          <div className="result-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="result-item">
              <div className="r-label">Cliente</div>
              <div className="r-value" style={{ fontSize: 15 }}>{selecionado.cliente}</div>
            </div>
            <div className="result-item">
              <div className="r-label">Vendedor</div>
              <div className="r-value">{vendedor}</div>
            </div>
            <div className="result-item">
              <div className="r-label">Orçamento</div>
              <div className="r-value">#{selecionado.numero} · {dataOrc}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Observação ──────────────────────────── */}
      {selecionado.observacao && (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'var(--blue)', flexShrink: 0, marginTop: 1 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Observação</div>
              <div style={{ fontSize: 14, color: 'var(--gray-800)', lineHeight: 1.5 }}>{selecionado.observacao}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Itens ───────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon" style={{ background: 'var(--green-light, #d1fae5)' }}>
            <svg viewBox="0 0 24 24" style={{ fill: 'var(--green, #059669)' }}><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          </div>
          <div>
            <h2>Itens do Orçamento</h2>
            <p>{itens.length > 0 ? `${itens.length} item(s) registrado(s)` : 'Total consolidado do orçamento'}</p>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="hist-wrap" style={{ margin: 0 }}>
            <div className="hist-header" style={{ gridTemplateColumns: '70px 1fr 60px 110px' }}>
              <span>Ref.</span>
              <span>Descrição</span>
              <span style={{ textAlign: 'center' }}>Qtd</span>
              <span style={{ textAlign: 'right' }}>Total</span>
            </div>

            {itens.length > 0 ? itens.map((item, idx) => (
              <div key={item.id} className="hist-row" style={{ gridTemplateColumns: '70px 1fr 60px 110px' }}>
                <span style={{ fontWeight: 700, color: 'var(--blue)' }}>
                  {String(idx + 1).padStart(6, '0')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray-800)' }}>
                  <span>{item.produto_nome}</span>
                  {item.largura > 0 && item.altura > 0 && (
                    <span style={{
                      background: 'var(--blue-light)',
                      color: 'var(--blue)',
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>
                      {Number(item.largura).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}×{Number(item.altura).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m
                    </span>
                  )}
                </span>
                <span style={{ textAlign: 'center', color: 'var(--gray-800)' }}>{item.quantidade}</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>
                  {fmt(parseFloat(item.total) || 0)}
                </span>
              </div>
            )) : (
              <div className="hist-row" style={{ gridTemplateColumns: '70px 1fr 60px 110px' }}>
                <span style={{ fontWeight: 700, color: 'var(--blue)' }}>000001</span>
                <span style={{ color: 'var(--gray-800)' }}>Conforme orçamento nº {selecionado.numero}</span>
                <span style={{ textAlign: 'center', color: 'var(--gray-800)' }}>1</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>
                  {fmt(parseFloat(selecionado.total) || 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detalhes do pedido ───────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/></svg>
          </div>
          <div>
            <h2>Detalhes do Pedido</h2>
            <p>Situação, condições e desconto</p>
          </div>
        </div>

        <div className="card-body">
          <div className="section-label">Informações do pedido</div>
          <div className="grid-2">
            <div className="field">
              <label>Situação Atual</label>
              <input
                type="text"
                placeholder="Ex: Entrega direto para o cliente"
                value={situacao}
                onChange={e => setSituacao(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Condições de Pagamento</label>
              <input
                type="text"
                placeholder="Ex: À vista, 50% entrada…"
                value={condicoes}
                onChange={e => setCondicoes(e.target.value)}
              />
            </div>
          </div>

          <div className="section-label">Desconto e totais</div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
            <div className="field">
              <label>Desconto (R$)</label>
              <div className="input-wrap">
                <span className="input-prefix">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="has-prefix"
                  placeholder="0,00"
                  value={desconto}
                  onChange={e => setDesconto(e.target.value)}
                />
              </div>
            </div>

            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Valor Produtos</span>
                <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{fmt(valorProdutos)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)' }}>
                <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>Desconto</span>
                <span style={{ fontWeight: 600, color: descNum > 0 ? 'var(--red)' : 'var(--gray-400)' }}>
                  − {fmt(descNum)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 16px', background: 'var(--blue)' }}>
                <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>Valor Total</span>
                <span style={{ fontWeight: 800, color: '#fff', fontSize: 20 }}>{fmt(valorTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Botão gerar ─────────────────────────── */}
      <button
        className="btn-primary"
        onClick={handleGerarPDF}
        disabled={gerando}
        style={{ padding: '14px 0', fontSize: 15, borderRadius: 10, width: '100%' }}
      >
        {gerando
          ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor', animation: 'spin .8s linear infinite' }}><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
              Gerando PDF…
            </span>
          : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              Gerar Pedido de Venda (PDF)
            </span>
        }
      </button>
    </div>
  );
}
