import { useState, useMemo } from 'react';
import { fmt } from '../utils/fmt';
import { apiFetch } from '../lib/api.js';
import { gerarPDF } from '../utils/pdf.js';

const STATUS_TABS = [
  { value: 'todos',     label: 'Todos'      },
  { value: 'pendente',  label: 'Pendentes'  },
  { value: 'concluido', label: 'Concluídos' },
];

const toNum = v => parseFloat(String(v).replace(',', '.')) || 0;

const PERIODOS_LISTA = [
  { v: 'todos',   l: 'Tudo'        },
  { v: 'diario',  l: 'Hoje'        },
  { v: 'semanal', l: 'Semana'      },
  { v: 'mensal',  l: 'Mês'         },
  { v: 'anual',   l: 'Ano'         },
];

function filtrarPorPeriodo(registros, periodo) {
  if (periodo === 'todos') return registros;
  const agora = new Date();
  let inicio;
  if (periodo === 'diario')  { inicio = new Date(agora); inicio.setHours(0,0,0,0); }
  else if (periodo === 'semanal') { inicio = new Date(agora); inicio.setDate(agora.getDate()-6); inicio.setHours(0,0,0,0); }
  else if (periodo === 'mensal')  { inicio = new Date(agora.getFullYear(), agora.getMonth(), 1); }
  else if (periodo === 'anual')   { inicio = new Date(agora.getFullYear(), 0, 1); }
  return registros.filter(o => o.criado_em && new Date(o.criado_em) >= inicio);
}

function tipoOrcamento(o) {
  const itens = o.itens_orcamento || [];
  if (itens.length === 0) return null;
  const temM2  = itens.some(i => parseFloat(i.largura) > 0 || parseFloat(i.altura) > 0);
  const temSrv = itens.some(i => parseFloat(i.largura) === 0 && parseFloat(i.altura) === 0);
  if (temM2 && temSrv) return 'misto';
  if (temM2) return 'm2';
  return 'servico';
}

export default function Orcamentos({ historico, onRecarregar, onAtualizarStatus, onExcluir, carregando, usuario }) {
  const isAdmin = usuario?.perfil === 'admin';

  /* ── Filtros ──────────────────────────────────── */
  const [busca,          setBusca]          = useState('');
  const [statusFiltro,   setStatusFiltro]   = useState('todos');
  const [tipoFiltro,     setTipoFiltro]     = useState('todos');
  const [periodoFiltro,  setPeriodoFiltro]  = useState('todos');
  const [pagina,         setPagina]         = useState(1);

  const POR_PAGINA = 10;

  /* ── Download ─────────────────────────────────── */
  const [baixando, setBaixando] = useState(null);

  /* ── Modal exclusão ───────────────────────────── */
  const [orcParaExcluir, setOrcParaExcluir] = useState(null);

  /* ── Modal visualização ──────────────────────── */
  const [orcVisualizando, setOrcVisualizando] = useState(null);
  const [carregandoView,  setCarregandoView]  = useState(false);

  async function abrirVisualizacao(o) {
    setCarregandoView(true);
    setOrcVisualizando({ ...o, itens_orcamento: [] });
    try {
      const res = await apiFetch(`/api/orcamentos/por-numero/${encodeURIComponent(o.numero)}`);
      if (res.ok) setOrcVisualizando(await res.json());
    } catch { /* silencioso */ }
    finally { setCarregandoView(false); }
  }

  /* ── Modal edição ─────────────────────────────── */
  const [orcEditando,    setOrcEditando]    = useState(null);
  const [carregandoEdit, setCarregandoEdit] = useState(false);
  const [editCliente,    setEditCliente]    = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [editItens,      setEditItens]      = useState([]);
  const [editModo,       setEditModo]       = useState('m2');
  // form m²
  const [eProduto,  setEProduto]  = useState('');
  const [ePreco,    setEPreco]    = useState('');
  const [eLargura,  setELargura]  = useState('');
  const [eAltura,   setEAltura]   = useState('');
  const [eQtd,      setEQtd]      = useState('1');
  // form serviço
  const [eServico,  setEServico]  = useState('');
  const [ePrecoSrv, setEPrecoSrv] = useState('');
  const [eQtdSrv,   setEQtdSrv]   = useState('1');
  // ações
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [baixandoEdit, setBaixandoEdit] = useState(false);

  /* ── Helpers download ─────────────────────────── */
  function montarItensParaPDF(itens, totalFallback) {
    if (itens.length > 0) {
      return itens.map(item => {
        const area      = (parseFloat(item.largura) || 0) * (parseFloat(item.altura) || 0);
        const pm2       = parseFloat(item.preco_m2) || 0;
        const qty       = parseInt(item.quantidade) || 1;
        const tot       = parseFloat(item.total) || 0;
        const valorUnit = item.valorUnit ?? (area > 0 ? pm2 * area : (pm2 > 0 ? pm2 : tot / qty));
        return {
          produto:    item.produto_nome || item.produto,
          largura:    parseFloat(item.largura)  || 0,
          altura:     parseFloat(item.altura)   || 0,
          quantidade: parseInt(item.quantidade) || 1,
          preco:      parseFloat(item.preco_m2 || item.preco) || 0,
          area,
          valorUnit,
          total:      parseFloat(item.total) || 0,
        };
      });
    }
    return [{ produto: 'Conforme orçamento', largura: 0, altura: 0, quantidade: 1, preco: 0, area: 0, valorUnit: totalFallback, total: totalFallback }];
  }

  async function handleDownload(o) {
    setBaixando(o.id);
    try {
      const res = await apiFetch(`/api/orcamentos/por-numero/${encodeURIComponent(o.numero)}`);
      if (!res.ok) return;
      const dados = await res.json();
      await gerarPDF({
        cliente: dados.cliente,
        numero:  dados.numero,
        data:    dados.criado_em ? new Date(dados.criado_em).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        itens:   montarItensParaPDF(dados.itens_orcamento || [], parseFloat(dados.total) || 0),
      });
    } catch { /* silencioso */ }
    finally { setBaixando(null); }
  }

  /* ── Helpers edição ───────────────────────────── */
  async function abrirEdicao(o) {
    setCarregandoEdit(true);
    setOrcEditando(o);
    setEditCliente(''); setEditObservacao(''); setEditItens([]);
    setEditModo('m2');
    limparFormEdit();
    try {
      const res = await apiFetch(`/api/orcamentos/por-numero/${encodeURIComponent(o.numero)}`);
      if (!res.ok) return;
      const dados = await res.json();
      setOrcEditando(dados);
      setEditCliente(dados.cliente || '');
      setEditObservacao(dados.observacao || '');
      setEditItens(dados.itens_orcamento || []);
    } catch { /* silencioso */ }
    finally { setCarregandoEdit(false); }
  }

  function fecharEdicao() {
    setOrcEditando(null);
    limparFormEdit();
  }

  function limparFormEdit() {
    setEProduto(''); setEPreco(''); setELargura(''); setEAltura(''); setEQtd('1');
    setEServico(''); setEPrecoSrv(''); setEQtdSrv('1');
  }

  function removerItemEdit(idx) {
    setEditItens(prev => prev.filter((_, i) => i !== idx));
  }

  function adicionarM2() {
    if (!eProduto.trim()) { alert('Informe o nome do produto.'); return; }
    const p = toNum(ePreco), l = toNum(eLargura), h = toNum(eAltura), q = parseInt(eQtd) || 1;
    if (p <= 0 || l <= 0 || h <= 0) { alert('Informe preço, largura e altura maiores que zero.'); return; }
    const area = l * h;
    setEditItens(prev => [...prev, { id: Date.now(), produto_nome: eProduto.trim(), preco_m2: p, largura: l, altura: h, quantidade: q, total: p * area * q }]);
    setEProduto(''); setEPreco(''); setELargura(''); setEAltura(''); setEQtd('1');
  }

  function adicionarServico() {
    if (!eServico.trim()) { alert('Informe o nome do serviço.'); return; }
    const p = toNum(ePrecoSrv), q = parseInt(eQtdSrv) || 1;
    if (p <= 0) { alert('Informe o preço maior que zero.'); return; }
    setEditItens(prev => [...prev, { id: Date.now(), produto_nome: eServico.trim(), preco_m2: p, largura: 0, altura: 0, quantidade: q, total: p * q, valorUnit: p, tipo: 'servico' }]);
    setEServico(''); setEPrecoSrv(''); setEQtdSrv('1');
  }

  async function salvarEdicao() {
    setSalvandoEdit(true);
    try {
      await apiFetch(`/api/orcamentos/${orcEditando.id}`, {
        method: 'PUT',
        body: JSON.stringify({ cliente: editCliente, observacao: editObservacao, itens: editItens }),
      });
      onRecarregar();
      fecharEdicao();
    } catch { /* silencioso */ }
    finally { setSalvandoEdit(false); }
  }

  async function baixarPDFEdit() {
    setBaixandoEdit(true);
    try {
      const dataStr = orcEditando.criado_em
        ? new Date(orcEditando.criado_em).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
      await gerarPDF({
        cliente: editCliente,
        numero:  orcEditando.numero,
        data:    dataStr,
        itens:   montarItensParaPDF(editItens, parseFloat(orcEditando.total) || 0),
      });
    } catch { /* silencioso */ }
    finally { setBaixandoEdit(false); }
  }

  const editTotal = editItens.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

  /* ── Exclusão ─────────────────────────────────── */
  function executarExcluir() {
    if (orcParaExcluir) onExcluir(orcParaExcluir.id);
    setOrcParaExcluir(null);
  }

  /* ── Filtros ──────────────────────────────────── */
  const filtrados = useMemo(() => {
    setPagina(1);
    return filtrarPorPeriodo(historico, periodoFiltro)
      .filter(o => statusFiltro === 'todos' || o.status === statusFiltro)
      .filter(o => {
        if (tipoFiltro === 'todos') return true;
        const t = tipoOrcamento(o);
        if (tipoFiltro === 'sem-itens') return t === null;
        return t === tipoFiltro;
      })
      .filter(o => {
        if (!busca.trim()) return true;
        const q = busca.toLowerCase();
        return o.cliente.toLowerCase().includes(q) || o.numero.toLowerCase().includes(q) || (o.usuario_nome && o.usuario_nome.toLowerCase().includes(q));
      });
  }, [historico, periodoFiltro, statusFiltro, tipoFiltro, busca]);

  const totalPaginas  = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual   = Math.min(pagina, totalPaginas);
  const inicio        = (paginaAtual - 1) * POR_PAGINA;
  const visiveis      = filtrados.slice(inicio, inicio + POR_PAGINA);

  const contagens = useMemo(() => ({
    todos:     historico.length,
    pendente:  historico.filter(o => o.status === 'pendente').length,
    concluido: historico.filter(o => o.status === 'concluido').length,
  }), [historico]);

  function toggleStatus(o) {
    onAtualizarStatus(o.id, o.status === 'concluido' ? 'pendente' : 'concluido');
  }

  /* ── Render ───────────────────────────────────── */
  const OVERLAY = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  };

  return (
    <>
      {/* ═══════════════════════════════════════════ */}
      {/* LISTA                                       */}
      {/* ═══════════════════════════════════════════ */}
      <div className="card" style={{ overflow: 'visible' }}>
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Gerenciamento de Orçamentos</h2>
            <p>
              {contagens.todos} registrado{contagens.todos !== 1 ? 's' : ''} —&nbsp;
              <span style={{ color: 'rgba(255,255,255,.6)' }}>
                {contagens.pendente} pendente{contagens.pendente !== 1 ? 's' : ''},&nbsp;
                {contagens.concluido} concluído{contagens.concluido !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
          <button className="btn-limpar-hist" onClick={onRecarregar} disabled={carregando} style={{ opacity: carregando ? .5 : 1, flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'currentColor', marginRight: 4, verticalAlign: 'middle', animation: carregando ? 'spin .8s linear infinite' : 'none' }}>
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
            {carregando ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>

        <div className="orc-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: .6, marginRight: 4 }}>Período:</span>
            {PERIODOS_LISTA.map(p => (
              <button
                key={p.v}
                className={`period-tab${periodoFiltro === p.v ? ' active' : ''}`}
                onClick={() => setPeriodoFiltro(p.v)}
              >{p.l}</button>
            ))}
          </div>
          <div className="orc-search-wrap">
            <svg viewBox="0 0 24 24" className="orc-search-icon">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input type="text" className="orc-search-input" placeholder="Buscar por cliente ou nº do orçamento…" value={busca} onChange={e => setBusca(e.target.value)} />
            {busca && <button className="orc-search-clear" onClick={() => setBusca('')}>✕</button>}
          </div>
          <div className="orc-tabs">
            {STATUS_TABS.map(t => (
              <button key={t.value} className={`orc-tab${statusFiltro === t.value ? ' active' : ''}`} onClick={() => setStatusFiltro(t.value)}>
                {t.value === 'pendente'  && <span className="orc-tab-dot" style={{ background: 'var(--yellow-dark)' }} />}
                {t.value === 'concluido' && <span className="orc-tab-dot" style={{ background: 'var(--green)' }} />}
                {t.label}
                <span className="orc-tab-count">{contagens[t.value]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filtro por tipo ───────────────────────── */}
        <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: .6, marginRight: 4 }}>Tipo:</span>
          {[
            { v: 'todos',     l: 'Todos' },
            { v: 'm2',        l: 'Sob Medida',  bg: 'var(--green-light)',  color: 'var(--green)' },
            { v: 'servico',   l: 'Serviço',     bg: 'var(--blue-light)',   color: 'var(--blue)'  },
            { v: 'misto',     l: 'Misto',       bg: 'var(--gray-100)',     color: 'var(--gray-600)' },
            { v: 'sem-itens', l: 'Sem itens',   bg: 'var(--gray-100)',     color: 'var(--gray-400)' },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => setTipoFiltro(opt.v)}
              style={{
                height: 26, padding: '0 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all .15s',
                background: tipoFiltro === opt.v ? (opt.bg || 'var(--blue)') : 'transparent',
                color: tipoFiltro === opt.v ? (opt.color || '#fff') : 'var(--gray-600)',
                outline: tipoFiltro === opt.v ? `2px solid ${opt.color || 'var(--blue)'}` : '2px solid transparent',
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>

        <div className={`orc-table-wrap${isAdmin ? ' orc-admin' : ''}`}>
          <div className="orc-thead">
            <span>Nº</span><span>Cliente</span>
            {isAdmin && <span>Feito por</span>}
            <span>Data</span><span>Status</span>
            <span>Tipo</span>
            <span className="orc-align-right">Total</span>
            <span style={{ textAlign: 'center' }}>Ação</span>
          </div>

          {filtrados.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 20px' }}>
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
              <p>{busca ? 'Nenhum resultado para sua busca.' : 'Nenhum orçamento nesta categoria.'}</p>
            </div>
          ) : visiveis.map(o => (
            <div key={o.id} className="orc-row">
              <span className="orc-num">#{o.numero}</span>
              <span className="orc-cliente">{o.cliente}</span>
              {isAdmin && <span className="orc-feito-por">{o.usuario_nome}</span>}
              <span className="orc-data">{o.data}</span>
              <span>
                <span className={`status-badge status-${o.status}`}>
                  {o.status === 'concluido' ? '✓ Concluído' : '● Pendente'}
                </span>
              </span>
              <span>
                {(() => {
                  const t = tipoOrcamento(o);
                  if (!t) return <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>—</span>;
                  if (t === 'm2')     return <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green)', borderRadius: 5, padding: '2px 8px' }}>Sob Medida</span>;
                  if (t === 'servico') return <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 5, padding: '2px 8px' }}>Serviço</span>;
                  return <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 5, padding: '2px 8px' }}>Misto</span>;
                })()}
              </span>
              <span className="orc-total">{fmt(o.total)}</span>
              <span className="orc-align-center orc-acoes">
                <button className={`btn-status-toggle ${o.status === 'concluido' ? 'btn-toggle-reabrir' : 'btn-toggle-concluir'}`} onClick={() => toggleStatus(o)}>
                  {o.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                </button>
                {/* Visualizar */}
                <button className="btn-excluir-orc" onClick={() => abrirVisualizacao(o)} title="Visualizar orçamento" style={{ color: 'var(--gray-600)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor' }}><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </button>
                {/* Editar */}
                <button className="btn-excluir-orc" onClick={() => abrirEdicao(o)} title="Editar orçamento" style={{ color: 'var(--gray-600)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor' }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                {/* Baixar PDF */}
                <button className="btn-excluir-orc" onClick={() => handleDownload(o)} disabled={baixando === o.id} title="Baixar PDF" style={{ color: 'var(--blue)' }}>
                  {baixando === o.id
                    ? <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor', animation: 'spin .8s linear infinite' }}><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                    : <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor' }}><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                  }
                </button>
                {/* Excluir (admin) */}
                {isAdmin && (
                  <button className="btn-excluir-orc" onClick={() => setOrcParaExcluir(o)} title="Excluir orçamento">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>

        {filtrados.length > 0 && (
          <div className="orc-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span>
              Mostrando <strong>{inicio + 1}–{Math.min(inicio + POR_PAGINA, filtrados.length)}</strong> de <strong>{filtrados.length}</strong> orçamento{filtrados.length !== 1 ? 's' : ''}
              {busca && <> para "<strong>{busca}</strong>"</>}
            </span>
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  style={{ height: 28, padding: '0 12px', borderRadius: 6, border: '1.5px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-800)', fontSize: 13, fontWeight: 600, cursor: paginaAtual === 1 ? 'default' : 'pointer', opacity: paginaAtual === 1 ? .4 : 1 }}
                >← Anterior</button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: n === paginaAtual ? 'var(--blue)' : 'transparent', color: n === paginaAtual ? '#fff' : 'var(--gray-600)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >{n}</button>
                ))}
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  style={{ height: 28, padding: '0 12px', borderRadius: 6, border: '1.5px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-800)', fontSize: 13, fontWeight: 600, cursor: paginaAtual === totalPaginas ? 'default' : 'pointer', opacity: paginaAtual === totalPaginas ? .4 : 1 }}
                >Próximo →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL VISUALIZAÇÃO                          */}
      {/* ═══════════════════════════════════════════ */}
      {orcVisualizando && (
        <div style={OVERLAY} onClick={() => setOrcVisualizando(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.4)', border: '1px solid var(--gray-200)' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, background: 'var(--blue)', borderRadius: '16px 16px 0 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: '#fff' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Orçamento <span style={{ opacity: .85 }}>#{orcVisualizando.numero}</span></div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>{orcVisualizando.cliente}</div>
              </div>
              <button onClick={() => setOrcVisualizando(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '6px 10px', borderRadius: 8 }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {carregandoView ? (
                <div style={{ textAlign: 'center', color: 'var(--gray-600)', padding: 32 }}>Carregando…</div>
              ) : (<>

                {/* Info resumida */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Cliente',  value: orcVisualizando.cliente },
                    { label: 'Vendedor', value: orcVisualizando.usuarios?.nome || '—' },
                    { label: 'Data',     value: orcVisualizando.criado_em ? new Date(orcVisualizando.criado_em).toLocaleDateString('pt-BR') : '—' },
                    { label: 'Nº',       value: `#${orcVisualizando.numero}` },
                    { label: 'Status',   value: orcVisualizando.status === 'concluido' ? '✓ Concluído' : '● Pendente' },
                    { label: 'Total',    value: fmt(parseFloat(orcVisualizando.total) || 0) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--gray-200)' }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-600)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .4 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Observação */}
                {orcVisualizando.observacao && (
                  <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'var(--blue)', flexShrink: 0, marginTop: 1 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>Observação</div>
                      <div style={{ fontSize: 13, color: 'var(--gray-800)', lineHeight: 1.5 }}>{orcVisualizando.observacao}</div>
                    </div>
                  </div>
                )}

                {/* Itens */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 8 }}>
                    Itens — {(orcVisualizando.itens_orcamento || []).length > 0 ? `${orcVisualizando.itens_orcamento.length} registrado(s)` : 'sem itens individuais'}
                  </div>
                  {(orcVisualizando.itens_orcamento || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gray-400)', fontSize: 13 }}>
                      Orçamento anterior ao registro de itens individuais.<br />Total: <strong>{fmt(parseFloat(orcVisualizando.total) || 0)}</strong>
                    </div>
                  ) : (
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
                      {orcVisualizando.itens_orcamento.map((item, idx) => {
                        const ehServico = parseFloat(item.largura) === 0 && parseFloat(item.altura) === 0;
                        return (
                          <div key={item.id ?? idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '10px 14px', borderBottom: idx < orcVisualizando.itens_orcamento.length - 1 ? '1px solid var(--gray-200)' : 'none', background: idx % 2 === 0 ? 'var(--gray-50)' : 'var(--card-bg)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {item.produto_nome}
                                {ehServico
                                  ? <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 4, padding: '1px 5px' }}>SERVIÇO</span>
                                  : <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green)', borderRadius: 4, padding: '1px 5px' }}>M²</span>
                                }
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>
                                {ehServico
                                  ? `${item.quantidade}× · ${fmt((parseFloat(item.total) || 0) / (parseInt(item.quantidade) || 1))}/un.`
                                  : `${Number(item.largura).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m × ${Number(item.altura).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m · ${item.quantidade}× · ${fmt(item.preco_m2)}/m²`
                                }
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 14, whiteSpace: 'nowrap', alignSelf: 'center' }}>{fmt(parseFloat(item.total) || 0)}</div>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--blue)' }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Total</span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: 16 }}>{fmt(parseFloat(orcVisualizando.total) || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>)}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={() => { setOrcVisualizando(null); abrirEdicao(orcVisualizando); }} style={{ height: 40, padding: '0 18px', borderRadius: 10, border: '2px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-800)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'currentColor' }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                Editar
              </button>
              <button onClick={() => { handleDownload(orcVisualizando); }} style={{ height: 40, padding: '0 18px', borderRadius: 10, border: '2px solid var(--blue)', background: 'transparent', color: 'var(--blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'currentColor' }}><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                Baixar PDF
              </button>
              <button onClick={() => setOrcVisualizando(null)} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: 'var(--gray-100)', color: 'var(--gray-800)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL EXCLUSÃO                              */}
      {/* ═══════════════════════════════════════════ */}
      {orcParaExcluir && (
        <div style={OVERLAY} onClick={() => setOrcParaExcluir(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card-bg)', borderRadius: 16, padding: '32px 28px', width: 360, boxShadow: '0 24px 64px rgba(0,0,0,.35)', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'var(--red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, fill: 'var(--red)' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--gray-800)' }}>Excluir orçamento</div>
                <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 2 }}>Essa ação não pode ser desfeita</div>
              </div>
            </div>
            <div style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, border: '1px solid var(--gray-200)' }}>
              <div style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 4 }}>Orçamento selecionado</div>
              <div style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 15 }}>#{orcParaExcluir.numero} — {orcParaExcluir.cliente}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 2 }}>Total: {fmt(parseFloat(orcParaExcluir.total) || 0)}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setOrcParaExcluir(null)} style={{ flex: 1, height: 42, borderRadius: 10, border: '2px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-800)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={executarExcluir} style={{ flex: 1, height: 42, borderRadius: 10, border: 'none', background: 'var(--red)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Sim, excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* MODAL EDIÇÃO                                */}
      {/* ═══════════════════════════════════════════ */}
      {orcEditando && (
        <div style={OVERLAY} onClick={fecharEdicao}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card-bg)', borderRadius: 16, width: '100%', maxWidth: 680,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,.4)', border: '1px solid var(--gray-200)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: 'var(--blue)' }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--gray-800)' }}>
                  Editar Orçamento <span style={{ color: 'var(--blue)' }}>#{orcEditando.numero}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 1 }}>Altere os dados e clique em Salvar</div>
              </div>
              <button onClick={fecharEdicao} style={{ background: 'none', border: 'none', color: 'var(--gray-600)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            {/* Body scrollável */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {carregandoEdit ? (
                <div style={{ textAlign: 'center', color: 'var(--gray-600)', padding: 32 }}>Carregando orçamento…</div>
              ) : (<>

                {/* Informações */}
                <div>
                  <div className="section-label">Informações do cliente</div>
                  <div className="grid-2">
                    <div className="field">
                      <label>Nome do cliente</label>
                      <input type="text" value={editCliente} onChange={e => setEditCliente(e.target.value)} placeholder="Nome do cliente" />
                    </div>
                    <div className="field">
                      <label>Observação <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-600)' }}>(opcional)</span></label>
                      <input type="text" value={editObservacao} onChange={e => setEditObservacao(e.target.value)} placeholder="Ex: Entregar pela manhã…" />
                    </div>
                  </div>
                </div>

                {/* Itens atuais */}
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>
                    Itens do orçamento <span style={{ fontWeight: 400, color: 'var(--gray-600)' }}>({editItens.length})</span>
                  </div>
                  {editItens.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-600)', fontSize: 13 }}>Nenhum item — adicione abaixo.</div>
                  ) : (
                    <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
                      {editItens.map((item, idx) => {
                        const ehServico = item.tipo === 'servico' || (parseFloat(item.largura) === 0 && parseFloat(item.altura) === 0);
                        return (
                          <div key={item.id ?? idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: idx < editItens.length - 1 ? '1px solid var(--gray-200)' : 'none', background: idx % 2 === 0 ? 'var(--gray-50)' : 'var(--card-bg)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {item.produto_nome}
                                {ehServico
                                  ? <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>SERVIÇO</span>
                                  : <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>M²</span>
                                }
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--gray-600)', marginTop: 2 }}>
                                {ehServico
                                  ? `${item.quantidade}× · ${fmt(item.total / item.quantidade)}/un.`
                                  : `${Number(item.largura).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m × ${Number(item.altura).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m · ${item.quantidade}× · ${fmt(item.preco_m2)}/m²`
                                }
                              </div>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 14, whiteSpace: 'nowrap' }}>{fmt(parseFloat(item.total) || 0)}</div>
                            <button onClick={() => removerItemEdit(idx)} style={{ background: 'var(--red-light)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'var(--red)' }}><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                            </button>
                          </div>
                        );
                      })}
                      {/* Total */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--blue)', borderTop: '2px solid var(--blue)' }}>
                        <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>Total</span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: 16 }}>{fmt(editTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Adicionar item */}
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Adicionar item</div>
                  {/* Toggle modo */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button type="button" onClick={() => setEditModo('m2')} className={editModo === 'm2' ? 'btn-primary' : 'btn-limpar-hist'} style={{ flex: 1, height: 36, fontSize: 12, borderRadius: 8 }}>
                      Cálculo por m²
                    </button>
                    <button type="button" onClick={() => setEditModo('servico')} className={editModo === 'servico' ? 'btn-primary' : 'btn-limpar-hist'} style={{ flex: 1, height: 36, fontSize: 12, borderRadius: 8 }}>
                      Serviço Fixo
                    </button>
                  </div>

                  {editModo === 'm2' ? (
                    <>
                      <div className="grid-2" style={{ marginBottom: 8 }}>
                        <div className="field">
                          <label>Produto / material</label>
                          <input type="text" placeholder="Ex: Lona Fosca…" value={eProduto} onChange={e => setEProduto(e.target.value)} />
                        </div>
                        <div className="field">
                          <label>Preço por m²</label>
                          <div className="input-wrap">
                            <span className="input-prefix">R$</span>
                            <input type="text" inputMode="decimal" className="has-prefix" placeholder="0,00" value={ePreco} onChange={e => setEPreco(e.target.value)} />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px auto', gap: 8, alignItems: 'end' }}>
                        <div className="field">
                          <label>Largura (m)</label>
                          <div className="input-wrap"><input type="text" inputMode="decimal" className="has-suffix" placeholder="0,00" value={eLargura} onChange={e => setELargura(e.target.value)} /><span className="input-suffix">m</span></div>
                        </div>
                        <div className="field">
                          <label>Altura (m)</label>
                          <div className="input-wrap"><input type="text" inputMode="decimal" className="has-suffix" placeholder="0,00" value={eAltura} onChange={e => setEAltura(e.target.value)} /><span className="input-suffix">m</span></div>
                        </div>
                        <div className="field">
                          <label>Qtd</label>
                          <input type="number" className="plain" min="1" value={eQtd} onChange={e => setEQtd(e.target.value)} />
                        </div>
                        <button className="btn-primary" style={{ height: 48, padding: '0 16px', fontSize: 13 }} onClick={adicionarM2}>
                          <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor', marginRight: 4, verticalAlign: 'middle' }}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                          Add
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 80px auto', gap: 8, alignItems: 'end' }}>
                      <div className="field">
                        <label>Nome do serviço</label>
                        <input type="text" placeholder="Ex: Colar adesivo em carro…" value={eServico} onChange={e => setEServico(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Preço</label>
                        <div className="input-wrap">
                          <span className="input-prefix">R$</span>
                          <input type="text" inputMode="decimal" className="has-prefix" placeholder="0,00" style={{ width: 120 }} value={ePrecoSrv} onChange={e => setEPrecoSrv(e.target.value)} />
                        </div>
                      </div>
                      <div className="field">
                        <label>Qtd</label>
                        <input type="number" className="plain" min="1" value={eQtdSrv} onChange={e => setEQtdSrv(e.target.value)} />
                      </div>
                      <button className="btn-primary" style={{ height: 48, padding: '0 16px', fontSize: 13 }} onClick={adicionarServico}>
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'currentColor', marginRight: 4, verticalAlign: 'middle' }}><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add
                      </button>
                    </div>
                  )}
                </div>

              </>)}
            </div>

            {/* Footer sticky */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={fecharEdicao} style={{ height: 42, padding: '0 20px', borderRadius: 10, border: '2px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-800)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={baixarPDFEdit} disabled={baixandoEdit || carregandoEdit} style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '2px solid var(--blue)', background: 'transparent', color: 'var(--blue)', fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {baixandoEdit
                  ? <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor', animation: 'spin .8s linear infinite' }}><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                  : <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor' }}><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                }
                Baixar PDF
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdit || carregandoEdit} style={{ flex: 1, height: 42, borderRadius: 10, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {salvandoEdit
                  ? <><svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor', animation: 'spin .8s linear infinite' }}><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg> Salvando…</>
                  : <><svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor' }}><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z"/></svg> Salvar alterações</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
