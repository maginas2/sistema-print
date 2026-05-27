import { useState, useMemo } from 'react';
import { fmt } from '../utils/fmt';

const STATUS_TABS = [
  { value: 'todos',     label: 'Todos'       },
  { value: 'pendente',  label: 'Pendentes'   },
  { value: 'concluido', label: 'Concluídos'  },
];

export default function Orcamentos({ historico, onRecarregar, onAtualizarStatus, carregando, usuario }) {
  const isAdmin = usuario?.perfil === 'admin';
  const [busca,        setBusca]        = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');

  const filtrados = useMemo(() => {
    return historico
      .filter(o => statusFiltro === 'todos' || o.status === statusFiltro)
      .filter(o => {
        if (!busca.trim()) return true;
        const q = busca.toLowerCase();
        return (
          o.cliente.toLowerCase().includes(q) ||
          o.numero.toLowerCase().includes(q) ||
          (o.usuario_nome && o.usuario_nome.toLowerCase().includes(q))
        );
      });
  }, [historico, statusFiltro, busca]);

  const contagens = useMemo(() => ({
    todos:     historico.length,
    pendente:  historico.filter(o => o.status === 'pendente').length,
    concluido: historico.filter(o => o.status === 'concluido').length,
  }), [historico]);

  function toggleStatus(o) {
    onAtualizarStatus(o.id, o.status === 'concluido' ? 'pendente' : 'concluido');
  }

  return (
    <div className="card" style={{ overflow: 'visible' }}>
      {/* ── Header ──────────────────────────────── */}
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
        <button
          className="btn-limpar-hist"
          onClick={onRecarregar}
          disabled={carregando}
          style={{ opacity: carregando ? .5 : 1, flexShrink: 0 }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, fill: 'currentColor', marginRight: 4, verticalAlign: 'middle', animation: carregando ? 'spin .8s linear infinite' : 'none' }}>
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
          </svg>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {/* ── Busca + Tabs ─────────────────────────── */}
      <div className="orc-toolbar">
        <div className="orc-search-wrap">
          <svg viewBox="0 0 24 24" className="orc-search-icon">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            className="orc-search-input"
            placeholder={`Buscar por cliente ou nº do orçamento…`}
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && (
            <button className="orc-search-clear" onClick={() => setBusca('')}>✕</button>
          )}
        </div>

        <div className="orc-tabs">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              className={`orc-tab${statusFiltro === t.value ? ' active' : ''}`}
              onClick={() => setStatusFiltro(t.value)}
            >
              {t.value === 'pendente' && <span className="orc-tab-dot" style={{ background: 'var(--yellow-dark)' }} />}
              {t.value === 'concluido' && <span className="orc-tab-dot" style={{ background: 'var(--green)' }} />}
              {t.label}
              <span className="orc-tab-count">{contagens[t.value]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabela ───────────────────────────────── */}
      <div className={`orc-table-wrap${isAdmin ? ' orc-admin' : ''}`}>
        <div className="orc-thead">
          <span>Nº</span>
          <span>Cliente</span>
          {isAdmin && <span>Feito por</span>}
          <span>Data</span>
          <span>Status</span>
          <span className="orc-align-right">Total</span>
          <span className="orc-align-center">Ação</span>
        </div>

        {filtrados.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 20px' }}>
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
            <p>{busca ? 'Nenhum resultado para sua busca.' : 'Nenhum orçamento nesta categoria.'}</p>
          </div>
        ) : (
          filtrados.map(o => (
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
              <span className="orc-total">{fmt(o.total)}</span>
              <span className="orc-align-center">
                <button
                  className={`btn-status-toggle ${o.status === 'concluido' ? 'btn-toggle-reabrir' : 'btn-toggle-concluir'}`}
                  onClick={() => toggleStatus(o)}
                >
                  {o.status === 'concluido' ? 'Reabrir' : 'Concluir'}
                </button>
              </span>
            </div>
          ))
        )}
      </div>

      {/* ── Footer ───────────────────────────────── */}
      {filtrados.length > 0 && (
        <div className="orc-footer">
          Mostrando <strong>{filtrados.length}</strong> de <strong>{historico.length}</strong> orçamentos
          {busca && <> para "<strong>{busca}</strong>"</>}
        </div>
      )}
    </div>
  );
}
