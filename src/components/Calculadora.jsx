import { useState, useEffect } from 'react';
import { fmt } from '../utils/fmt';
import { gerarPDF } from '../utils/pdf';

export default function Calculadora({ produtos, produtoInicial, onSalvarHistorico }) {
  const [cliente, setCliente] = useState('');
  const [numero, setNumero]   = useState('');
  const [catalogoId, setCatalogoId] = useState('');
  const [produto, setProduto] = useState('');
  const [preco, setPreco]     = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura]   = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [resultado, setResultado]   = useState(null);
  const [itens, setItens]           = useState([]);

  useEffect(() => {
    if (produtoInicial?.current) {
      const p = produtoInicial.current;
      setProduto(p.nome);
      setPreco(String(p.preco));
      setCatalogoId(String(p.id));
      produtoInicial.current = null;
    }
  });

  function selecionarDoCatalogo(e) {
    const id = parseInt(e.target.value);
    setCatalogoId(e.target.value);
    if (!id) return;
    const p = produtos.find(x => x.id === id);
    if (!p) return;
    setProduto(p.nome);
    setPreco(String(p.preco));
  }

  function calcular() {
    if (!produto.trim())          { alert('Informe o nome do produto ou material.'); return; }
    if (parseFloat(preco) <= 0)   { alert('Informe o preço por m² maior que zero.'); return; }
    if (parseFloat(largura) <= 0 || parseFloat(altura) <= 0) { alert('Informe largura e altura maiores que zero.'); return; }

    const p = parseFloat(preco);
    const l = parseFloat(largura);
    const h = parseFloat(altura);
    const q = parseInt(quantidade) || 1;
    const area      = l * h;
    const valorUnit = area * p;
    const total     = valorUnit * q;
    setResultado({ produto: produto.trim(), preco: p, largura: l, altura: h, quantidade: q, area, valorUnit, total });
  }

  function adicionarAoOrcamento() {
    if (!resultado) return;
    setItens(prev => [...prev, { ...resultado, id: Date.now() }]);
    setResultado(null);
    limparForm();
  }

  function removerItem(id) {
    setItens(prev => prev.filter(i => i.id !== id));
  }

  function limparForm() {
    setProduto(''); setPreco(''); setLargura(''); setAltura('');
    setQuantidade('1'); setCatalogoId('');
  }

  function novoCalculo() {
    setResultado(null);
    limparForm();
  }

  function novoOrcamento() {
    setResultado(null);
    setItens([]);
    setCliente(''); setNumero('');
    limparForm();
  }

  async function handleGerarPDF() {
    const todosItens = [...itens, ...(resultado ? [resultado] : [])];
    if (todosItens.length === 0) return;
    const dadosOrcamento = {
      cliente: cliente.trim() || 'Não informado',
      numero: numero.trim() || '—',
      data: new Date().toLocaleDateString('pt-BR'),
      itens: todosItens,
      total: todosItens.reduce((s, i) => s + i.total, 0),
    };
    await gerarPDF(dadosOrcamento);
    onSalvarHistorico?.(dadosOrcamento);
  }

  const totalGeral = itens.reduce((s, i) => s + i.total, 0);
  const handleKeyDown = e => { if (e.key === 'Enter') calcular(); };

  return (
    <>
      {/* ── Formulário ───────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
          </div>
          <div>
            <h2>Dados do Orçamento</h2>
            <p>Preencha para calcular e gerar o PDF</p>
          </div>
        </div>

        <div className="card-body">

          <div className="section-label">Informações do cliente</div>
          <div className="grid-2">
            <div className="field">
              <label>Nome do cliente</label>
              <input type="text" placeholder="Ex: João Silva" value={cliente} onChange={e => setCliente(e.target.value)} onKeyDown={handleKeyDown} />
            </div>
            <div className="field">
              <label>Nº do orçamento</label>
              <input type="text" placeholder="Ex: 0042" value={numero} onChange={e => setNumero(e.target.value)} onKeyDown={handleKeyDown} />
            </div>
          </div>

          <div className="section-label">Selecionar do catálogo</div>
          <div className="catalog-select-wrap">
            <div className="catalog-hint">
              <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Selecione um produto para preencher nome e preço automaticamente
            </div>
            <select value={catalogoId} onChange={selecionarDoCatalogo}>
              <option value="">— Escolher produto do catálogo (opcional) —</option>
              {produtos.map(p => (
                <option key={p.id} value={p.id}>{p.nome} — {fmt(p.preco)}/m²</option>
              ))}
            </select>
          </div>

          <div className="section-label">Material e preço</div>
          <div className="grid-2">
            <div className="field">
              <label>Nome do produto / material<span className="req">*</span></label>
              <input type="text" placeholder="Ex: Lona Fosca, Adesivo Vinil…" value={produto} onChange={e => setProduto(e.target.value)} onKeyDown={handleKeyDown} />
            </div>
            <div className="field">
              <label>Preço por m²<span className="req">*</span></label>
              <div className="input-wrap">
                <span className="input-prefix">R$</span>
                <input type="number" className="has-prefix" placeholder="0,00" min="0" step="0.01" value={preco} onChange={e => setPreco(e.target.value)} onKeyDown={handleKeyDown} />
              </div>
            </div>
          </div>

          <div className="section-label">Dimensões e quantidade</div>
          <div className="grid-4">
            <div className="field">
              <label>Largura<span className="req">*</span></label>
              <div className="input-wrap">
                <input type="number" className="has-suffix" placeholder="0,00" min="0" step="0.01" value={largura} onChange={e => setLargura(e.target.value)} onKeyDown={handleKeyDown} />
                <span className="input-suffix">m</span>
              </div>
            </div>
            <div className="field">
              <label>Altura<span className="req">*</span></label>
              <div className="input-wrap">
                <input type="number" className="has-suffix" placeholder="0,00" min="0" step="0.01" value={altura} onChange={e => setAltura(e.target.value)} onKeyDown={handleKeyDown} />
                <span className="input-suffix">m</span>
              </div>
            </div>
            <div className="field">
              <label>Quantidade</label>
              <input type="number" className="plain" min="1" step="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} onKeyDown={handleKeyDown} />
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label style={{ opacity: 0 }}>.</label>
              <button className="btn-primary" style={{ height: 48, fontSize: 14 }} onClick={calcular}>
                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                Calcular
              </button>
            </div>
          </div>

          {resultado && (
            <div className="result">
              <div className="result-header">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                <span>Cálculo concluído</span>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <div className="r-label">Produto</div>
                  <div className="r-value" style={{ fontSize: 13, lineHeight: 1.3 }}>{resultado.produto}</div>
                </div>
                <div className="result-item">
                  <div className="r-label">Área (m²)</div>
                  <div className="r-value">{resultado.area.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} m²</div>
                </div>
                <div className="result-item">
                  <div className="r-label">Qtd × Unitário</div>
                  <div className="r-value" style={{ fontSize: 13 }}>{resultado.quantidade}× {fmt(resultado.valorUnit)}</div>
                </div>
                <div className="result-item highlight">
                  <div className="r-label">Total</div>
                  <div className="r-value">{fmt(resultado.total)}</div>
                </div>
              </div>
              <div className="result-actions">
                <button className="btn-add-item" onClick={adicionarAoOrcamento}>
                  <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Adicionar ao orçamento
                </button>
                <button className="btn-pdf" onClick={handleGerarPDF}>
                  <svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>
                  Gerar PDF
                </button>
                <button className="btn-reset" onClick={novoCalculo}>Cancelar</button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Lista de itens ───────────────────────── */}
      {itens.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-header-icon">
              <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15h8v2H8zm0-4h8v2H8z"/></svg>
            </div>
            <div>
              <h2>Itens do Orçamento</h2>
              <p>{itens.length} {itens.length === 1 ? 'produto adicionado' : 'produtos adicionados'}</p>
            </div>
          </div>

          <div className="card-body">
            <div className="orcamento-lista">
              {itens.map((item, idx) => (
                <div key={item.id} className="orcamento-item">
                  <div className="oi-num">{idx + 1}</div>
                  <div className="oi-info">
                    <div className="oi-nome">{item.produto}</div>
                    <div className="oi-det">
                      {item.largura}m × {item.altura}m &nbsp;·&nbsp; {item.quantidade} un. &nbsp;·&nbsp; {fmt(item.preco)}/m²
                    </div>
                  </div>
                  <div className="oi-total">{fmt(item.total)}</div>
                  <button className="oi-del" onClick={() => removerItem(item.id)} title="Remover item">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="orcamento-total-bar">
              <span>Total do orçamento</span>
              <strong>{fmt(totalGeral)}</strong>
            </div>

            <div className="result-actions">
              <button className="btn-pdf" onClick={handleGerarPDF}>
                <svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>
                Gerar PDF do Orçamento
              </button>
              <button className="btn-reset" onClick={novoOrcamento}>Novo orçamento</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Como funciona ────────────────────────── */}
      <div className="info-card">
        <h3>
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Como funciona
        </h3>
        <div className="steps">
          <div className="step"><div className="step-num">1</div><p><strong>Cliente e número:</strong> preencha o nome do cliente e o número do orçamento — valem para todos os produtos do mesmo orçamento.</p></div>
          <div className="step"><div className="step-num">2</div><p><strong>Catálogo:</strong> selecione um produto cadastrado para preencher automaticamente nome e preço, ou preencha manualmente.</p></div>
          <div className="step"><div className="step-num">3</div><p><strong>Calcular e adicionar:</strong> clique em "Calcular", confira o resultado e clique em <strong>"Adicionar ao orçamento"</strong> para incluir na lista. Repita para cada produto.</p></div>
          <div className="step"><div className="step-num">4</div><p><strong>PDF completo:</strong> clique em <strong>"Gerar PDF do Orçamento"</strong> para baixar um PDF com todos os produtos, totais e validade.</p></div>
        </div>
      </div>
    </>
  );
}
