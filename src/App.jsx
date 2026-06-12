import { useState, useRef, useEffect } from 'react';
import { apiFetch } from './lib/api.js';
import { useProdutos } from './hooks/useProdutos';
import { useHistorico } from './hooks/useHistorico';
import Calculadora from './components/Calculadora';
import Produtos from './components/Produtos';
import Dashboard from './components/Dashboard';
import Usuarios from './components/Usuarios';
import Relatorios from './components/Relatorios';
import Orcamentos from './components/Orcamentos';
import PedidoVenda from './components/PedidoVenda';
import Login from './components/Login';
import printLogo from './assets/print logo.png';

const ICONS = {
  dash: <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  user: <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>,
  calc: <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  prod: <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  info: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
  sair:  <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  relat: <svg viewBox="0 0 24 24"><path d="M9 17H7v-3h2v3zm4 0h-2v-7h2v7zm4 0h-2v-5h2v5zm2 2H5V5h14v14zm0-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>,
  orc:    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8zm0-4h5v2H8z"/></svg>,
  pedido: <svg viewBox="0 0 24 24"><path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zm-1.5 15c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h13v1zm0-3H6V4h12v11zM8 9h8v2H8zm0 4h8v2H8z"/></svg>,
  moon:  <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>,
  sun:   <svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 16a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1zm9-9a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2h2zM5 12a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1zm11.95-6.364a1 1 0 0 1 0 1.414l-1.414 1.414a1 1 0 1 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 0zM8.464 15.536a1 1 0 0 1 0 1.414L7.05 18.364a1 1 0 1 1-1.414-1.414l1.414-1.414a1 1 0 0 1 1.414 0zm9.9 2.828a1 1 0 0 1-1.414 0l-1.414-1.414a1 1 0 0 1 1.414-1.414l1.414 1.414a1 1 0 0 1 0 1.414zM8.464 8.464a1 1 0 0 1-1.414 0L5.636 7.05A1 1 0 0 1 7.05 5.636l1.414 1.414a1 1 0 0 1 0 1.414z"/></svg>,
};

const PAGE_META = {
  dashboard:   { title: 'Visão',          highlight: 'Geral',    desc: 'Resumo de orçamentos, histórico e acesso rápido às funcionalidades.' },
  calculadora: { title: 'Calculadora de', highlight: 'Preços',   desc: 'Calcule orçamentos por metro quadrado e gere PDFs profissionais.' },
  produtos:    { title: 'Tabela de',      highlight: 'Produtos', desc: 'Gerencie e organize sua tabela de produtos e preços.' },
  usuarios:    { title: 'Cadastro de',    highlight: 'Usuários',   desc: 'Crie e gerencie os acessos ao sistema.' },
  relatorios:  { title: 'Relatórios de', highlight: 'Orçamentos',     desc: 'Analise orçamentos por período, usuário e valor.' },
  orcamentos:  { title: 'Gestão de',     highlight: 'Orçamentos',     desc: 'Visualize, filtre e gerencie todos os orçamentos registrados.' },
  pedido:      { title: 'Pedido de',     highlight: 'Venda',           desc: 'Gere pedidos de venda em PDF a partir de orçamentos existentes.' },
};

function lerSessao() {
  try { return JSON.parse(localStorage.getItem('print_usuario')) ?? null; }
  catch { return null; }
}

function lerTema() {
  return localStorage.getItem('print_tema') ?? 'light';
}

export default function App() {
  const [usuario, setUsuario] = useState(lerSessao);
  const [aba, setAba] = useState('dashboard');
  const [tema, setTema] = useState(lerTema);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('print_tema', tema);
  }, [tema]);

  function toggleTema() {
    setTema(t => t === 'light' ? 'dark' : 'light');
  }
  const { produtos, adicionar, atualizar, remover } = useProdutos();
  const { historico, salvarOrcamento, limparHistorico, carregando, recarregar } = useHistorico(usuario);
  const produtoParaUsar = useRef(null);

  useEffect(() => {
    function onSessionExpired() {
      setUsuario(null);
      setAba('dashboard');
    }
    window.addEventListener('session-expired', onSessionExpired);
    return () => window.removeEventListener('session-expired', onSessionExpired);
  }, []);

  function handleLogin(u, token) {
    localStorage.setItem('print_usuario', JSON.stringify(u));
    localStorage.setItem('print_token', token);
    setUsuario(u);
  }

  async function atualizarStatus(id, novoStatus) {
    try {
      await apiFetch(`/api/orcamentos/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: novoStatus }),
      });
      recarregar();
    } catch { /* silently fail */ }
  }

  async function excluirOrcamento(id) {
    try {
      await apiFetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
      recarregar();
    } catch { /* silently fail */ }
  }

  function handleLogout() {
    localStorage.removeItem('print_usuario');
    localStorage.removeItem('print_token');
    setUsuario(null);
    setAba('dashboard');
  }

  function usarNaCalculadora(p) {
    produtoParaUsar.current = p;
    setAba('calculadora');
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />;
  }

  const meta = PAGE_META[aba];
  const iniciais = usuario.nome.split(' ').slice(0, 2).map(n => n[0].toUpperCase()).join('');

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={printLogo} alt="Print Gráfica" />
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">Menu</p>

          <button className={`nav-item${aba === 'dashboard' ? ' active' : ''}`} onClick={() => setAba('dashboard')}>
            <span className="nav-icon">{ICONS.dash}</span>
            <span className="nav-label">Visão Geral</span>
          </button>

          <button className={`nav-item${aba === 'calculadora' ? ' active' : ''}`} onClick={() => setAba('calculadora')}>
            <span className="nav-icon">{ICONS.calc}</span>
            <span className="nav-label">Calculadora</span>
          </button>

          <button className={`nav-item${aba === 'produtos' ? ' active' : ''}`} onClick={() => setAba('produtos')}>
            <span className="nav-icon">{ICONS.prod}</span>
            <span className="nav-label">Produtos</span>
            {produtos.length > 0 && <span className="nav-badge">{produtos.length}</span>}
          </button>

          <button className={`nav-item${aba === 'orcamentos' ? ' active' : ''}`} onClick={() => setAba('orcamentos')}>
            <span className="nav-icon">{ICONS.orc}</span>
            <span className="nav-label">Orçamentos</span>
          </button>

          <button className={`nav-item${aba === 'pedido' ? ' active' : ''}`} onClick={() => setAba('pedido')}>
            <span className="nav-icon">{ICONS.pedido}</span>
            <span className="nav-label">Pedido de Venda</span>
          </button>

          <button className={`nav-item${aba === 'relatorios' ? ' active' : ''}`} onClick={() => setAba('relatorios')}>
            <span className="nav-icon">{ICONS.relat}</span>
            <span className="nav-label">Relatórios</span>
          </button>

          {usuario.perfil === 'admin' && (
            <button className={`nav-item${aba === 'usuarios' ? ' active' : ''}`} onClick={() => setAba('usuarios')}>
              <span className="nav-icon">{ICONS.user}</span>
              <span className="nav-label">Usuários</span>
              </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-tema" onClick={toggleTema} title={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}>
            <span className="nav-icon">{tema === 'dark' ? ICONS.sun : ICONS.moon}</span>
            <span className="nav-label">{tema === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{iniciais}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-nome">{usuario.nome}</div>
              <div className="sidebar-user-perfil">{usuario.perfil}</div>
            </div>
            <button className="btn-logout-icon" onClick={handleLogout} title="Sair do sistema">
              {ICONS.sair}
            </button>
          </div>
          <div className="sidebar-footer-inner">
            <span className="nav-icon">{ICONS.info}</span>
            <span>Print Gráfica &amp; Comunicação Visual</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="page-header">
          <h1>{meta.title} <span>{meta.highlight}</span></h1>
          <p>{meta.desc}</p>
        </div>

        <div className={`tab-panel${aba === 'dashboard' ? ' active' : ''}`}>
          <Dashboard
            historico={historico}
            produtos={produtos}
            onIrParaCalculadora={() => setAba('calculadora')}
            onIrParaProdutos={() => setAba('produtos')}
            onLimparHistorico={limparHistorico}
            onRecarregar={recarregar}
            onAtualizarStatus={atualizarStatus}
            carregando={carregando}
            usuario={usuario}
          />
        </div>
        <div className={`tab-panel${aba === 'calculadora' ? ' active' : ''}`}>
          <Calculadora produtos={produtos} produtoInicial={produtoParaUsar} onSalvarHistorico={salvarOrcamento} usuarioId={usuario.id} />
        </div>
        <div className={`tab-panel${aba === 'orcamentos' ? ' active' : ''}`}>
          <Orcamentos
            historico={historico}
            onRecarregar={recarregar}
            onAtualizarStatus={atualizarStatus}
            onExcluir={excluirOrcamento}
            carregando={carregando}
            usuario={usuario}
          />
        </div>
        <div className={`tab-panel${aba === 'relatorios' ? ' active' : ''}`}>
          <Relatorios usuario={usuario} />
        </div>
        <div className={`tab-panel${aba === 'pedido' ? ' active' : ''}`}>
          <PedidoVenda usuario={usuario} />
        </div>
        <div className={`tab-panel${aba === 'usuarios' ? ' active' : ''}`}>
          <Usuarios />
        </div>
        <div className={`tab-panel${aba === 'produtos' ? ' active' : ''}`}>
          <Produtos
            produtos={produtos}
            adicionar={adicionar}
            atualizar={atualizar}
            remover={remover}
            onUsarNaCalculadora={usarNaCalculadora}
            isAdmin={usuario.perfil === 'admin'}
          />
        </div>
      </main>
    </div>
  );
}
