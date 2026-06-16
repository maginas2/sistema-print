import { useState, useEffect } from 'react';
import { fmt } from '../utils/fmt';
import { gerarPDF } from '../utils/pdf';
import { apiFetch } from '../lib/api.js';

async function buscarProximoNumero() {
  try {
    const res = await apiFetch('/api/orcamentos/proximo-numero');
    const dados = await res.json();
    return dados.numero ?? '';
  } catch {
    return '';
  }
}

export default function Calculadora({ produtos, produtoInicial, onSalvarHistorico, usuarioId }) {
  const [cliente, setCliente] = useState('');
  const [numero, setNumero]   = useState('');
  const [observacao, setObservacao] = useState('');
  const [modo,      setModo]        = useState('m2'); // 'm2' | 'servico'
  const [catalogoId, setCatalogoId] = useState('');
  const [produto, setProduto] = useState('');
  const [preco, setPreco]     = useState('');
  const [largura, setLargura] = useState('');
  const [altura, setAltura]   = useState('');
  const [quantidade, setQuantidade] = useState('1');
  // campos exclusivos do modo serviço
  const [nomeServico,  setNomeServico]  = useState('');
  const [precoServico, setPrecoServico] = useState('');
  const [qtdServico,   setQtdServico]   = useState('1');
  const [resultado, setResultado]   = useState(null);
  const [itens, setItens]           = useState([]);
  const [desconto,  setDesconto]    = useState('');
  const [acrescimo, setAcrescimo]   = useState('');
  const [savedModal, setSavedModal] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [salvando,   setSalvando]   = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  useEffect(() => {
    buscarProximoNumero().then(n => { if (n) setNumero(n); });
  }, []);

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
    const toNum = v => parseFloat(String(v).replace(',', '.').replace(/\.$/, '')) || 0;
    if (!produto.trim())        { setErrorModal('Informe o nome do produto ou material.'); return; }
    if (toNum(preco) <= 0)      { setErrorModal('Informe o preço por m² maior que zero.'); return; }
    if (toNum(largura) <= 0 || toNum(altura) <= 0) { setErrorModal('Informe largura e altura maiores que zero.'); return; }

    const p = toNum(preco);
    const l = toNum(largura);
    const h = toNum(altura);
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
    setNomeServico(''); setPrecoServico(''); setQtdServico('1');
  }

  function calcularServico() {
    const toNum = v => parseFloat(String(v).replace(',', '.').replace(/\.$/, '')) || 0;
    if (!nomeServico.trim())   { setErrorModal('Informe o nome do serviço.'); return; }
    if (toNum(precoServico) <= 0) { setErrorModal('Informe o preço maior que zero.'); return; }
    const p = toNum(precoServico);
    const q = parseInt(qtdServico) || 1;
    setResultado({ produto: nomeServico.trim(), preco: p, largura: 0, altura: 0, quantidade: q, area: 0, valorUnit: p, total: p * q, tipo: 'servico' });
  }

  function novoCalculo() {
    setResultado(null);
    limparForm();
  }

  async function novoOrcamento() {
    setResultado(null);
    setItens([]);
    setCliente('');
    setObservacao('');
    setDesconto('');
    setAcrescimo('');
    limparForm();
    const n = await buscarProximoNumero();
    setNumero(n);
  }

  async function salvarOrcamento(dadosOrcamento) {
    try {
      await apiFetch('/api/orcamentos', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: usuarioId,
          cliente:    dadosOrcamento.cliente,
          numero:     dadosOrcamento.numero,
          total:      dadosOrcamento.total,
          observacao: dadosOrcamento.observacao,
          itens:      dadosOrcamento.itens,
        }),
      });
    } catch { /* não bloqueia o fluxo */ }
    onSalvarHistorico?.(dadosOrcamento);
    const n = await buscarProximoNumero();
    setNumero(n);
  }

  async function handleGerarPDF() {
    if (gerandoPdf) return;
    const todosItens = [...itens, ...(resultado ? [resultado] : [])];
    if (todosItens.length === 0) return;
    setGerandoPdf(true);
    try {
      const dadosOrcamento = {
        cliente:    cliente.trim() || 'Não informado',
        numero:     numero.trim() || '—',
        data:       new Date().toLocaleDateString('pt-BR'),
        observacao: observacao.trim() || '',
        itens:      todosItens,
        total:      todosItens.reduce((s, i) => s + i.total, 0),
      };
      await gerarPDF(dadosOrcamento);
    } finally {
      setGerandoPdf(false);
    }
  }

  async function handleSalvar() {
    if (gerandoPdf || salvando) return;
    const todosItens = [...itens, ...(resultado ? [resultado] : [])];
    if (todosItens.length === 0) return;
    setSalvando(true);
    try {
      const bruto = todosItens.reduce((s, i) => s + i.total, 0);
      const desc  = toNum(desconto);
      const acres = toNum(acrescimo);
      const dadosOrcamento = {
        cliente:    cliente.trim() || 'Não informado',
        numero:     numero.trim() || '—',
        data:       new Date().toLocaleDateString('pt-BR'),
        observacao: observacao.trim() || '',
        itens:      todosItens,
        total:      bruto - desc + acres,
      };
      await salvarOrcamento(dadosOrcamento);
      setSavedModal(true);
    } finally {
      setSalvando(false);
    }
  }

  const toNum = v => parseFloat(String(v).replace(',', '.').replace(/\.$/, '')) || 0;
  const totalGeral     = itens.reduce((s, i) => s + i.total, 0);
  const valorDesconto  = toNum(desconto);
  const valorAcrescimo = toNum(acrescimo);
  const totalFinal     = totalGeral - valorDesconto + valorAcrescimo;
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
              <label>Nº do orçamento <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--green)', background: 'var(--green-light)', borderRadius: 4, padding: '1px 6px', marginLeft: 4 }}>auto</span></label>
              <input type="text" placeholder="Gerando…" value={numero} readOnly style={{ background: 'var(--gray-50)', color: 'var(--gray-600)', cursor: 'default' }} />
            </div>
          </div>

          <div className="field" style={{ marginTop: 4 }}>
            <label>Observação <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-600)' }}>(opcional)</span></label>
            <textarea
              placeholder="Ex: Entregar na loja, instalar na fachada, prazo 3 dias…"
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={4}
              style={{ resize: 'vertical', minHeight: 96 }}
            />
          </div>

          {/* ── Toggle de modo ─────────────────── */}
          <div style={{ display: 'flex', gap: 8, margin: '4px 0 8px' }}>
            <button
              type="button"
              onClick={() => { setModo('m2'); setResultado(null); limparForm(); }}
              className={modo === 'm2' ? 'btn-primary' : 'period-tab'}
              style={{ flex: 1, height: 40, fontSize: 13, borderRadius: 10 }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor', marginRight: 6, verticalAlign: 'middle' }}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
              Cálculo por m²
            </button>
            <button
              type="button"
              onClick={() => { setModo('servico'); setResultado(null); limparForm(); }}
              className={modo === 'servico' ? 'btn-primary' : 'period-tab'}
              style={{ flex: 1, height: 40, fontSize: 13, borderRadius: 10 }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'currentColor', marginRight: 6, verticalAlign: 'middle' }}><path d="M22 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2zm-4 10H4V5h14v14z"/></svg>
              Serviço Fixo
            </button>
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

          {modo === 'm2' ? (<>
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
                  <input type="text" inputMode="decimal" className="has-prefix" placeholder="0,00" value={preco} onChange={e => setPreco(e.target.value)} onKeyDown={handleKeyDown} />
                </div>
              </div>
            </div>

            <div className="section-label">Dimensões e quantidade</div>
            <div className="grid-4">
              <div className="field">
                <label>Largura<span className="req">*</span></label>
                <div className="input-wrap">
                  <input type="text" inputMode="decimal" className="has-suffix" placeholder="0,00" value={largura} onChange={e => setLargura(e.target.value)} onKeyDown={handleKeyDown} />
                  <span className="input-suffix">m</span>
                </div>
              </div>
              <div className="field">
                <label>Altura<span className="req">*</span></label>
                <div className="input-wrap">
                  <input type="text" inputMode="decimal" className="has-suffix" placeholder="0,00" value={altura} onChange={e => setAltura(e.target.value)} onKeyDown={handleKeyDown} />
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
          </>) : (<>
            <div className="section-label">Serviço e valor</div>
            <div className="grid-2">
              <div className="field">
                <label>Nome do serviço<span className="req">*</span></label>
                <input type="text" placeholder="Ex: Colar adesivo em carro, Troca de lona…" value={nomeServico} onChange={e => setNomeServico(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') calcularServico(); }} />
              </div>
              <div className="field">
                <label>Preço do serviço<span className="req">*</span></label>
                <div className="input-wrap">
                  <span className="input-prefix">R$</span>
                  <input type="text" inputMode="decimal" className="has-prefix" placeholder="0,00" value={precoServico} onChange={e => setPrecoServico(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') calcularServico(); }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'end' }}>
              <div className="field">
                <label>Quantidade</label>
                <input type="number" className="plain" min="1" step="1" value={qtdServico} onChange={e => setQtdServico(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') calcularServico(); }} />
              </div>
              <div className="field">
                <label style={{ opacity: 0 }}>.</label>
                <button className="btn-primary" style={{ height: 48, fontSize: 14 }} onClick={calcularServico}>
                  <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  Calcular serviço
                </button>
              </div>
            </div>
          </>)}

          {resultado && (
            <div className="result">
              <div className="result-header">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                <span>{resultado.tipo === 'servico' ? 'Serviço calculado' : 'Cálculo concluído'}</span>
              </div>
              <div className="result-grid">
                <div className="result-item">
                  <div className="r-label">{resultado.tipo === 'servico' ? 'Serviço' : 'Produto'}</div>
                  <div className="r-value" style={{ fontSize: 13, lineHeight: 1.3 }}>{resultado.produto}</div>
                </div>
                {resultado.tipo !== 'servico' && (
                  <div className="result-item">
                    <div className="r-label">Área (m²)</div>
                    <div className="r-value">{resultado.area.toLocaleString('pt-BR', { maximumFractionDigits: 4 })} m²</div>
                  </div>
                )}
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
                <button className="btn-pdf" onClick={handleGerarPDF} disabled={gerandoPdf || salvando}>
                  <svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>
                  {gerandoPdf ? 'Gerando…' : 'Gerar PDF'}
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
                    <div className="oi-nome" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {item.produto}
                      {item.tipo === 'servico'
                        ? <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--blue-light)', color: 'var(--blue)', borderRadius: 4, padding: '1px 6px', letterSpacing: .3 }}>SERVIÇO</span>
                        : <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--green-light)', color: 'var(--green)', borderRadius: 4, padding: '1px 6px', letterSpacing: .3 }}>M²</span>
                      }
                    </div>
                    <div className="oi-det">
                      {item.tipo === 'servico'
                        ? <>{item.quantidade} un. &nbsp;·&nbsp; {fmt(item.valorUnit)}/un.</>
                        : <>{item.largura}m × {item.altura}m &nbsp;·&nbsp; {item.quantidade} un. &nbsp;·&nbsp; {fmt(item.preco)}/m²</>
                      }
                    </div>
                  </div>
                  <div className="oi-total">{fmt(item.total)}</div>
                  <button className="oi-del" onClick={() => removerItem(item.id)} title="Remover item">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, margin: '12px 0 4px' }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label style={{ fontSize: 12 }}>Desconto (R$)</label>
                <div className="input-wrap">
                  <span className="input-prefix">R$</span>
                  <input type="text" inputMode="decimal" className="has-prefix" placeholder="0,00" value={desconto} onChange={e => setDesconto(e.target.value)} />
                </div>
              </div>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                <label style={{ fontSize: 12 }}>Acréscimo (R$)</label>
                <div className="input-wrap">
                  <span className="input-prefix">R$</span>
                  <input type="text" inputMode="decimal" className="has-prefix" placeholder="0,00" value={acrescimo} onChange={e => setAcrescimo(e.target.value)} />
                </div>
              </div>
            </div>

            {(valorDesconto > 0 || valorAcrescimo > 0) ? (
              <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 10, padding: '12px 16px', marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--gray-600)', marginBottom: 6 }}>
                  <span>Subtotal</span>
                  <span>{fmt(totalGeral)}</span>
                </div>
                {valorDesconto > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#DC2626', marginBottom: 6 }}>
                    <span>Desconto</span>
                    <span>− {fmt(valorDesconto)}</span>
                  </div>
                )}
                {valorAcrescimo > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--green)', marginBottom: 6 }}>
                    <span>Acréscimo</span>
                    <span>+ {fmt(valorAcrescimo)}</span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: 'var(--gray-800)' }}>
                  <span>Total final</span>
                  <span style={{ color: 'var(--blue)' }}>{fmt(totalFinal)}</span>
                </div>
              </div>
            ) : (
              <div className="orcamento-total-bar">
                <span>Total do orçamento</span>
                <strong>{fmt(totalGeral)}</strong>
              </div>
            )}

            <div className="result-actions">
              <button className="btn-pdf" onClick={handleGerarPDF} disabled={gerandoPdf || salvando}>
                <svg viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/></svg>
                {gerandoPdf ? 'Gerando…' : 'Gerar PDF do Orçamento'}
              </button>
              <button className="btn-salvar" onClick={handleSalvar} disabled={gerandoPdf || salvando}>
                <svg viewBox="0 0 24 24"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm3-10H5V5h10v4z"/></svg>
                {salvando ? 'Salvando…' : 'Salvar no Sistema'}
              </button>
              <button className="btn-reset" onClick={novoOrcamento}>Novo orçamento</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de erro ───────────────────────── */}
      {errorModal && (
        <div className="modal-overlay" onClick={() => setErrorModal(null)}>
          <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: '#DC2626' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>Campo obrigatório</h3>
            <p style={{ fontSize: 14, color: '#ffffff', marginBottom: 24 }}>{errorModal}</p>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: '#DC2626', borderColor: '#DC2626' }} onClick={() => setErrorModal(null)}>OK</button>
          </div>
        </div>
      )}

      {/* ── Modal salvo ──────────────────────────── */}
      {savedModal && (
        <div className="modal-overlay" onClick={() => setSavedModal(false)}>
          <div className="modal-box" style={{ maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--green-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg viewBox="0 0 24 24" style={{ width: 28, height: 28, fill: 'var(--green)' }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>Orçamento salvo!</h3>
            <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 24 }}>O orçamento foi registrado com sucesso no sistema.</p>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSavedModal(false)}>OK</button>
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
