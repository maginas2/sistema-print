import { useState, useRef } from 'react';
import { useProdutos } from './hooks/useProdutos';
import Calculadora from './components/Calculadora';
import Produtos from './components/Produtos';
import printLogo from './assets/print logo.png';

const ICONS = {
  calc: <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>,
  prod: <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  info: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>,
};

const PAGE_META = {
  calculadora: { title: 'Calculadora de', highlight: 'Preços', desc: 'Calcule orçamentos por metro quadrado e gere PDFs profissionais.' },
  produtos:    { title: 'Tabela de',      highlight: 'Produtos', desc: 'Gerencie e organize sua tabela de produtos e preços.' },
};

export default function App() {
  const [aba, setAba] = useState('calculadora');
  const { produtos, adicionar, atualizar, remover } = useProdutos();
  const produtoParaUsar = useRef(null);

  function usarNaCalculadora(p) {
    produtoParaUsar.current = p;
    setAba('calculadora');
  }

  const meta = PAGE_META[aba];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={printLogo} alt="Print Gráfica" />
        </div>

        <nav className="sidebar-nav">
          <p className="nav-section-label">Menu</p>

          <button className={`nav-item${aba === 'calculadora' ? ' active' : ''}`} onClick={() => setAba('calculadora')}>
            <span className="nav-icon">{ICONS.calc}</span>
            <span className="nav-label">Calculadora</span>
            <span className="nav-arrow">{ICONS.arrow}</span>
          </button>

          <button className={`nav-item${aba === 'produtos' ? ' active' : ''}`} onClick={() => setAba('produtos')}>
            <span className="nav-icon">{ICONS.prod}</span>
            <span className="nav-label">Produtos</span>
            {produtos.length > 0 && <span className="nav-badge">{produtos.length}</span>}
            <span className="nav-arrow">{ICONS.arrow}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
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

        <div className={`tab-panel${aba === 'calculadora' ? ' active' : ''}`}>
          <Calculadora produtos={produtos} produtoInicial={produtoParaUsar} />
        </div>
        <div className={`tab-panel${aba === 'produtos' ? ' active' : ''}`}>
          <Produtos
            produtos={produtos}
            adicionar={adicionar}
            atualizar={atualizar}
            remover={remover}
            onUsarNaCalculadora={usarNaCalculadora}
          />
        </div>
      </main>
    </div>
  );
}
