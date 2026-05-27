import { useState, useEffect, useCallback } from 'react';
import { fmt } from '../utils/fmt';
import { gerarRelatoriosPDF } from '../utils/pdf';

const PERIODOS = [
  { value: 'diario',        label: 'Hoje'         },
  { value: 'semanal',       label: 'Semana'       },
  { value: 'mensal',        label: 'Mês'          },
  { value: 'anual',         label: 'Ano'          },
  { value: 'personalizado', label: 'Personalizado' },
  { value: 'todos',         label: 'Tudo'         },
];

const ICONS = {
  relat:  <svg viewBox="0 0 24 24"><path d="M9 17H7v-3h2v3zm4 0h-2v-7h2v7zm4 0h-2v-5h2v5zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>,
  hist:   <svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 1 0 9 9h-2a7 7 0 1 1-7-7V3zm6.59 2H17v2h4V3h-2v1.41l-3.7-3.7-1.42 1.41L17.59 5z"/></svg>,
  doc:    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>,
  money:  <svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>,
  trend:  <svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>,
  star:   <svg viewBox="0 0 24 24"><path d="M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01L12 1z"/></svg>,
  spin:   <svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>,
  erro:   <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>,
  user:   <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>,
  filter: <svg viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>,
};

export default function Relatorios({ usuario }) {
  const isAdmin = usuario.perfil === 'admin';

  const [periodo,          setPeriodo]          = useState('mensal');
  const [dataInicio,       setDataInicio]        = useState('');
  const [dataFim,          setDataFim]           = useState('');
  const [filtroUsuarioId,  setFiltroUsuarioId]   = useState('todos');
  const [filtroStatus,     setFiltroStatus]      = useState('todos');
  const [listaUsuarios,    setListaUsuarios]     = useState([]);
  const [dados,            setDados]             = useState(null);
  const [carregando,       setCarregando]        = useState(false);
  const [gerandoPDF,       setGerandoPDF]        = useState(false);
  const [erro,             setErro]             = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetch('http://localhost:3001/api/usuarios')
      .then(r => r.json())
      .then(setListaUsuarios)
      .catch(() => {});
  }, [isAdmin]);

  const gerar = useCallback(async () => {
    setErro('');
    if (periodo === 'personalizado' && (!dataInicio || !dataFim)) {
      setErro('Selecione as datas de início e fim.');
      return;
    }
    setCarregando(true);
    try {
      const params = new URLSearchParams({
        periodo,
        usuario_id: usuario.id,
        perfil:     usuario.perfil,
      });
      if (periodo === 'personalizado') {
        params.append('data_inicio', dataInicio);
        params.append('data_fim',    dataFim);
      }
      if (isAdmin && filtroUsuarioId !== 'todos') {
        params.append('filtro_usuario_id', filtroUsuarioId);
      }
      if (filtroStatus !== 'todos') {
        params.append('filtro_status', filtroStatus);
      }
      const res = await fetch(`http://localhost:3001/api/relatorios?${params}`);
      if (!res.ok) throw new Error();
      setDados(await res.json());
    } catch {
      setErro('Não foi possível gerar o relatório. Verifique se o backend está rodando.');
    } finally {
      setCarregando(false);
    }
  }, [periodo, dataInicio, dataFim, filtroUsuarioId, filtroStatus, usuario, isAdmin]);

  useEffect(() => { gerar(); }, [gerar]);

  const stats     = dados?.stats;
  const registros = dados?.registros ?? [];

  const labelPeriodo = PERIODOS.find(p => p.value === periodo)?.label ?? '';

  async function baixarPDF() {
    setGerandoPDF(true);
    try {
      await gerarRelatoriosPDF({
        registros,
        stats,
        labelPeriodo,
        filtroStatus,
        isAdmin,
        geradoPor: usuario.nome,
      });
    } finally {
      setGerandoPDF(false);
    }
  }

  return (
    <>
      {/* ── Filtros ───────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">{ICONS.filter}</div>
          <div>
            <h2>Filtros do Relatório</h2>
            <p>Selecione o período e aplique os filtros desejados</p>
          </div>
        </div>

        <div className="card-body">
          {erro && (
            <div className="usr-erro">{ICONS.erro}{erro}</div>
          )}

          <div className="field">
            <label>Período</label>
            <div className="period-tabs">
              {PERIODOS.map(p => (
                <button
                  key={p.value}
                  className={`period-tab${periodo === p.value ? ' active' : ''}`}
                  onClick={() => setPeriodo(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {periodo === 'personalizado' && (
            <div className="grid-2">
              <div className="field">
                <label>Data início <span className="req">*</span></label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div className="field">
                <label>Data fim <span className="req">*</span></label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>
          )}

          <div className="field" style={{ maxWidth: 360 }}>
            <label>Status do orçamento</label>
            <div className="period-tabs">
              {[{ value: 'todos', label: 'Todos' }, { value: 'pendente', label: '● Pendentes' }, { value: 'concluido', label: '✓ Concluídos' }].map(s => (
                <button
                  key={s.value}
                  className={`period-tab${filtroStatus === s.value ? ' active' : ''}`}
                  onClick={() => setFiltroStatus(s.value)}
                  style={filtroStatus !== s.value && s.value === 'pendente' ? { color: 'var(--yellow-dark)', borderColor: 'var(--yellow-dark)' } : filtroStatus !== s.value && s.value === 'concluido' ? { color: 'var(--green)', borderColor: 'var(--green)' } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="field" style={{ maxWidth: 360 }}>
              <label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'var(--blue)' }}><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                  Filtrar por usuário
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-light)', borderRadius: 4, padding: '1px 5px' }}>ADM</span>
                </span>
              </label>
              <select value={filtroUsuarioId} onChange={e => setFiltroUsuarioId(e.target.value)}>
                <option value="todos">Todos os usuários</option>
                {listaUsuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={gerar}
            disabled={carregando}
            style={{ maxWidth: 240 }}
          >
            <span style={carregando ? { animation: 'spin .8s linear infinite', display: 'flex' } : {}}>
              {carregando ? ICONS.spin : ICONS.relat}
            </span>
            {carregando ? 'Gerando…' : 'Gerar Relatório'}
          </button>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────── */}
      {stats && (
        <div className="dash-stats" style={{ animation: 'slide-in .3s ease' }}>
          <div className="dash-stat">
            <div className="dash-stat-icon" style={{ background: 'var(--blue)' }}>{ICONS.doc}</div>
            <div className="dash-stat-label">Orçamentos</div>
            <div className="dash-stat-value">{stats.total_orcamentos}</div>
            <div className="dash-stat-sub">{labelPeriodo.toLowerCase()}</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon" style={{ background: 'var(--green)' }}>{ICONS.money}</div>
            <div className="dash-stat-label">Valor Total</div>
            <div className="dash-stat-value" style={{ fontSize: stats.valor_total >= 10000 ? 20 : 28 }}>
              {fmt(stats.valor_total)}
            </div>
            <div className="dash-stat-sub">soma do período</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon" style={{ background: '#7C3AED' }}>{ICONS.trend}</div>
            <div className="dash-stat-label">Ticket Médio</div>
            <div className="dash-stat-value" style={{ fontSize: stats.ticket_medio >= 10000 ? 20 : 28 }}>
              {fmt(stats.ticket_medio)}
            </div>
            <div className="dash-stat-sub">média por orçamento</div>
          </div>
          <div className="dash-stat">
            <div className="dash-stat-icon" style={{ background: 'var(--yellow-dark)' }}>{ICONS.star}</div>
            <div className="dash-stat-label">Maior Orçamento</div>
            <div className="dash-stat-value" style={{ fontSize: stats.maior_orcamento >= 10000 ? 20 : 28 }}>
              {fmt(stats.maior_orcamento)}
            </div>
            <div className="dash-stat-sub">valor máximo</div>
          </div>
        </div>
      )}

      {/* ── Tabela de resultados ──────────────────── */}
      {dados && (
        <div className="card" style={{ animation: 'slide-in .3s ease' }}>
          <div className="card-header">
            <div className="card-header-icon">{ICONS.hist}</div>
            <div style={{ flex: 1 }}>
              <h2>Resultados</h2>
              <p>
                {registros.length === 0
                  ? 'Nenhum orçamento no período selecionado'
                  : `${registros.length} orçamento${registros.length > 1 ? 's' : ''} encontrado${registros.length > 1 ? 's' : ''}`}
              </p>
            </div>
            {registros.length > 0 && (
              <button
                className="btn-pdf"
                onClick={baixarPDF}
                disabled={gerandoPDF}
                style={{ flexShrink: 0 }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'currentColor', marginRight: 5, verticalAlign: 'middle', opacity: gerandoPDF ? 0 : 1, animation: gerandoPDF ? 'spin .8s linear infinite' : 'none' }}>
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5v-2z"/>
                </svg>
                {gerandoPDF ? 'Gerando…' : 'Baixar PDF'}
              </button>
            )}
          </div>

          <div className="card-body" style={{ padding: registros.length > 0 ? 0 : undefined }}>
            {registros.length === 0 ? (
              <div className="empty-state">
                {ICONS.doc}
                <p>Nenhum orçamento encontrado neste período.</p>
              </div>
            ) : (
              <div className="hist-wrap">
                <div className={`hist-header relat-status${isAdmin ? '-admin' : ''}`}>
                  <span>Cliente</span>
                  <span>Nº</span>
                  {isAdmin && <span>Usuário</span>}
                  <span>Data</span>
                  <span>Status</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                </div>
                {registros.map(o => (
                  <div key={o.id} className={`hist-row relat-status${isAdmin ? '-admin' : ''}`}>
                    <span className="hist-cliente">{o.cliente || '—'}</span>
                    <span className="hist-num">{o.numero || '—'}</span>
                    {isAdmin && (
                      <span className="hist-data" style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                        {o.usuarios?.nome || '—'}
                      </span>
                    )}
                    <span className="hist-data">
                      {new Date(o.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                    <span>
                      <span className={`status-badge status-${o.status || 'pendente'}`}>
                        {o.status === 'concluido' ? '✓ Concluído' : '● Pendente'}
                      </span>
                    </span>
                    <span className="hist-total">{fmt(parseFloat(o.total) || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
