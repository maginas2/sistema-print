import { useState } from 'react';
import { fmt } from '../utils/fmt';

export default function Produtos({ produtos, adicionar, atualizar, remover, onUsarNaCalculadora }) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [editId, setEditId] = useState(null);

  const editando = editId !== null;
  const precos = produtos.map(p => p.preco);

  function salvar() {
    const n = nome.trim();
    const p = parseFloat(preco);
    if (!n)      { alert('Informe o nome do produto.'); return; }
    if (!(p > 0)) { alert('Informe um preço maior que zero.'); return; }

    if (editando) {
      atualizar(editId, n, p);
      cancelar();
    } else {
      adicionar(n, p);
      setNome(''); setPreco('');
    }
  }

  function iniciarEdicao(p) {
    setEditId(p.id);
    setNome(p.nome);
    setPreco(String(p.preco));
  }

  function cancelar() {
    setEditId(null); setNome(''); setPreco('');
  }

  function excluir(p) {
    if (confirm(`Excluir "${p.nome}"?`)) remover(p.id);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') salvar();
    if (e.key === 'Escape') cancelar();
  }

  return (
    <>
      {/* Stats */}
      <div className="card">
        <div className="card-body" style={{ padding: '20px 28px' }}>
          <div className="stats-bar">
            <div className="stat-card">
              <div className="stat-label">Total de produtos</div>
              <div className="stat-value">{produtos.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Menor preço/m²</div>
              <div className="stat-value">{produtos.length ? fmt(Math.min(...precos)) : '—'}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Maior preço/m²</div>
              <div className="stat-value">{produtos.length ? fmt(Math.max(...precos)) : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </div>
          <div>
            <h2>{editando ? 'Editar Produto' : 'Cadastrar Produto'}</h2>
            <p>{editando ? 'Altere os dados e clique em Atualizar' : 'Adicione um novo produto à tabela de preços'}</p>
          </div>
        </div>
        <div className="card-body">
          <div className="section-label">Dados do produto</div>
          <div className="grid-2">
            <div className="field">
              <label>Nome do produto<span className="req">*</span></label>
              <input type="text" placeholder="Ex: Metro Lona Brilho" value={nome} onChange={e => setNome(e.target.value)} onKeyDown={handleKeyDown} autoFocus={editando} />
            </div>
            <div className="field">
              <label>Preço por m²<span className="req">*</span></label>
              <div className="input-wrap">
                <span className="input-prefix">R$</span>
                <input type="number" className="has-prefix" placeholder="0,00" min="0" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
            </div>
          </div>
          <div className="prod-form-actions">
            <button className="btn-primary" onClick={salvar}>
              <svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
              {editando ? 'Atualizar Produto' : 'Salvar Produto'}
            </button>
            {editando && (
              <button className="btn-cancel" onClick={cancelar}>Cancelar</button>
            )}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          </div>
          <div>
            <h2>Produtos Cadastrados</h2>
            <p>Clique no ícone verde para usar na calculadora</p>
          </div>
        </div>
        <div className="card-body">
          <div className="prod-list">
            {produtos.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                Nenhum produto cadastrado ainda.<br/>Use o formulário acima para adicionar.
              </div>
            ) : (
              produtos.map((p, idx) => (
                <div key={p.id} className={`prod-item${editId === p.id ? ' editing' : ''}`}>
                  <div className="prod-num">{idx + 1}</div>
                  <div className="prod-info">
                    <div className="prod-name">{p.nome}</div>
                    <div className="prod-meta">Preço por metro quadrado</div>
                  </div>
                  <div className="prod-price">{fmt(p.preco)}/m²</div>
                  <div className="prod-actions">
                    <button className="btn-use-prod" title="Usar na calculadora" onClick={() => onUsarNaCalculadora(p)}>
                      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                    </button>
                    <button className="btn-edit-prod" title="Editar" onClick={() => iniciarEdicao(p)}>
                      <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button className="btn-del-prod" title="Excluir" onClick={() => excluir(p)}>
                      <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
