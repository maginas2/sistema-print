import { fmt } from '../utils/fmt';

export default function Dashboard({
  historico, produtos,
  onIrParaCalculadora, onIrParaProdutos,
  onLimparHistorico, onRecarregar, onAtualizarStatus,
  carregando, usuario,
}) {
  const isAdmin        = usuario?.perfil === 'admin';
  const totalOrcamentos = historico.length;
  const valorTotal      = historico.reduce((s, o) => s + o.total, 0);
  const ticketMedio     = totalOrcamentos > 0 ? valorTotal / totalOrcamentos : 0;
  const maxPreco        = produtos.length > 0 ? Math.max(...produtos.map(p => p.preco)) : 1;
  const ultimos         = historico.slice(0, 6);

  const pendentes  = historico.filter(o => o.status === 'pendente').length;
  const concluidos = historico.filter(o => o.status === 'concluido').length;

  function handleLimpar() {
    if (window.confirm('Limpar todo o histórico de orçamentos?')) onLimparHistorico();
  }

  function toggleStatus(o) {
    const novo = o.status === 'concluido' ? 'pendente' : 'concluido';
    onAtualizarStatus(o.id, novo);
  }

  const wrapClass = `hist-wrap hist-status${isAdmin ? '-admin' : ''}`;

  return (
    <>
      {/* Stats */}
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat-icon" style={{ background: 'var(--blue)' }}>
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
          </div>
          <div className="dash-stat-label">Orçamentos gerados</div>
          <div className="dash-stat-value">{totalOrcamentos}</div>
          <div className="dash-stat-sub">{pendentes} pendente{pendentes !== 1 ? 's' : ''} · {concluidos} concluído{concluidos !== 1 ? 's' : ''}</div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-icon" style={{ background: 'var(--green)' }}>
            <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
          </div>
          <div className="dash-stat-label">Valor total orçado</div>
          <div className="dash-stat-value" style={{ fontSize: valorTotal >= 100000 ? 18 : valorTotal >= 10000 ? 22 : 28 }}>{fmt(valorTotal)}</div>
          <div className="dash-stat-sub">soma de todos os PDFs</div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-icon" style={{ background: '#7C3AED' }}>
            <svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
          </div>
          <div className="dash-stat-label">Ticket médio</div>
          <div className="dash-stat-value" style={{ fontSize: ticketMedio >= 100000 ? 18 : ticketMedio >= 10000 ? 22 : 28 }}>{fmt(ticketMedio)}</div>
          <div className="dash-stat-sub">média por orçamento</div>
        </div>

        <div className="dash-stat">
          <div className="dash-stat-icon" style={{ background: 'var(--yellow-dark)' }}>
            <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          </div>
          <div className="dash-stat-label">Produtos no catálogo</div>
          <div className="dash-stat-value">{produtos.length}</div>
          <div className="dash-stat-sub">{produtos.length === 1 ? '1 produto' : `${produtos.length} produtos`} cadastrados</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="dash-grid">

        {/* Histórico */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon">
              <svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm6.59 2H17v2h4V3h-2v1.41l-3.7-3.7-1.42 1.41L17.59 5z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <h2>Histórico de Orçamentos</h2>
              <p>{ultimos.length > 0 ? `Últimos ${ultimos.length} PDFs gerados` : 'Nenhum PDF gerado ainda'}</p>
            </div>
            <button
              className="btn-limpar-hist"
              onClick={onRecarregar}
              disabled={carregando}
              style={{ opacity: carregando ? .5 : 1 }}
              title="Atualizar"
            >
              <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'currentColor', marginRight: 5, verticalAlign: 'middle', animation: carregando ? 'spin .8s linear infinite' : 'none' }}><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </button>
            {historico.length > 0 && (
              <button className="btn-limpar-hist" onClick={handleLimpar} style={{ marginLeft: 6 }}>Limpar tudo</button>
            )}
          </div>

          <div className="card-body" style={{ padding: ultimos.length > 0 ? 0 : undefined }}>
            {ultimos.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
                <p>Nenhum orçamento gerado ainda.<br />Gere um PDF na calculadora para aparecer aqui.</p>
              </div>
            ) : (
              <div className={wrapClass}>
                <div className="hist-header">
                  <span>Cliente</span>
                  <span>Nº</span>
                  {isAdmin && <span>Feito por</span>}
                  <span>Data</span>
                  <span>Status</span>
                  <span>Ação</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>
                {ultimos.map(o => (
                  <div key={o.id} className="hist-row">
                    <span className="hist-cliente">{o.cliente}</span>
                    <span className="hist-num">{o.numero}</span>
                    {isAdmin && <span className="hist-data" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{o.usuario_nome}</span>}
                    <span className="hist-data">{o.data}</span>
                    <span>
                      <span className={`status-badge status-${o.status}`}>
                        {o.status === 'concluido' ? '✓ Concluído' : '● Pendente'}
                      </span>
                    </span>
                    <span>
                      <button
                        className={`btn-status-toggle ${o.status === 'concluido' ? 'btn-toggle-reabrir' : 'btn-toggle-concluir'}`}
                        onClick={() => toggleStatus(o)}
                      >
                        {o.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                      </button>
                    </span>
                    <span className="hist-total">{fmt(o.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Atalhos */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v2h2V5h14v14H5v-2H3v2c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM3 11h8V9l3 3-3 3v-2H3v-2z"/></svg>
              </div>
              <div>
                <h2>Atalhos Rápidos</h2>
                <p>Acesse as funcionalidades</p>
              </div>
            </div>
            <div className="card-body">
              <button className="btn-shortcut" onClick={onIrParaCalculadora}>
                <div className="shortcut-icon" style={{ background: 'var(--blue-light)' }}>
                  <svg viewBox="0 0 24 24" style={{ fill: 'var(--blue)' }}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="shortcut-title">Novo Orçamento</div>
                  <div className="shortcut-sub">Calculadora de preços</div>
                </div>
                <svg className="shortcut-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button className="btn-shortcut" onClick={onIrParaProdutos}>
                <div className="shortcut-icon" style={{ background: 'var(--green-light)' }}>
                  <svg viewBox="0 0 24 24" style={{ fill: 'var(--green)' }}><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="shortcut-title">Gerenciar Produtos</div>
                  <div className="shortcut-sub">Catálogo de materiais</div>
                </div>
                <svg className="shortcut-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>

          {/* Gráfico de preços */}
          <div className="card">
            <div className="card-header">
              <div className="card-header-icon">
                <svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zM16.2 13h2.8v6h-2.8v-6z"/></svg>
              </div>
              <div>
                <h2>Preços por Produto</h2>
                <p>Comparativo em R$/m²</p>
              </div>
            </div>
            <div className="card-body">
              {produtos.length === 0 ? (
                <div className="empty-state">
                  <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>
                  <p>Nenhum produto cadastrado.</p>
                </div>
              ) : (
                <div className="prod-chart">
                  {[...produtos].sort((a, b) => b.preco - a.preco).map(p => (
                    <div key={p.id} className="prod-chart-item">
                      <div className="prod-chart-name">{p.nome}</div>
                      <div className="prod-chart-row">
                        <div className="prod-chart-bar-wrap">
                          <div className="prod-chart-bar" style={{ width: `${(p.preco / maxPreco) * 100}%` }} />
                        </div>
                        <div className="prod-chart-price">{fmt(p.preco)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
