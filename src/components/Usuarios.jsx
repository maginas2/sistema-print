import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

const EyeOn = () => (
  <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
);
const EyeOff = () => (
  <svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.61 17 4.5 12 4.5c-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zm8.53 8.53l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>
);

const PERFIS = [
  {
    value: 'operador',
    label: 'Operador',
    desc: 'Acessa calculadora e produtos. Visualiza apenas o próprio histórico.',
    iconBg: 'var(--green-light)',
    iconColor: 'var(--green)',
    icon: <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>,
  },
  {
    value: 'admin',
    label: 'Administrador',
    desc: 'Acesso total ao sistema. Relatórios, usuários e todas as funções.',
    iconBg: 'var(--blue-light)',
    iconColor: 'var(--blue)',
    icon: <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93C9.33 17.79 7 14.5 7 11V7.18L12 5z"/></svg>,
  },
];

function calcForca(s) {
  if (!s) return { nivel: 0, label: '', cor: '' };
  let pts = 0;
  if (s.length >= 8)           pts++;
  if (/[A-Z]/.test(s))         pts++;
  if (/[0-9]/.test(s))         pts++;
  if (/[^A-Za-z0-9]/.test(s)) pts++;
  if (pts <= 1) return { nivel: 1, label: 'Fraca',  cor: 'var(--red)'         };
  if (pts <= 2) return { nivel: 2, label: 'Média',  cor: 'var(--yellow-dark)' };
  return           { nivel: 3, label: 'Forte',  cor: 'var(--green)'        };
}

function fmtData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function AvatarLetra({ nome, perfil }) {
  const cor = perfil === 'admin' ? 'var(--blue)' : 'var(--green)';
  const bg  = perfil === 'admin' ? 'var(--blue-light)' : 'var(--green-light)';
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: bg, color: cor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: 14, flexShrink: 0,
    }}>
      {nome?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function BadgePerfil({ perfil }) {
  const isAdmin = perfil === 'admin';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: isAdmin ? 'var(--blue-light)' : 'var(--green-light)',
      color:      isAdmin ? 'var(--blue)'       : 'var(--green)',
    }}>
      {isAdmin ? 'Admin' : 'Operador'}
    </span>
  );
}

function ModalEditar({ usuario, onClose, onSalvo }) {
  const [nome,       setNome]       = useState(usuario.nome);
  const [email,      setEmail]      = useState(usuario.email ?? '');
  const [perfil,     setPerfil]     = useState(usuario.perfil);
  const [senha,      setSenha]      = useState('');
  const [confirma,   setConfirma]   = useState('');
  const [verS,       setVerS]       = useState(false);
  const [verC,       setVerC]       = useState(false);
  const [erro,       setErro]       = useState('');
  const [carregando, setCarregando] = useState(false);

  const forca = calcForca(senha);

  async function handleSalvar(e) {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) return setErro('Informe o nome.');
    if (senha && senha.length < 6) return setErro('A senha deve ter ao menos 6 caracteres.');
    if (senha && senha !== confirma) return setErro('As senhas não coincidem.');

    setCarregando(true);
    try {
      const body = { nome: nome.trim(), email: email.trim() || null, perfil };
      if (senha) body.senha = senha;

      const res  = await apiFetch(`/api/usuarios/${usuario.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const dados = await res.json();
      if (!res.ok) return setErro(dados.erro || 'Erro ao salvar.');
      onSalvo(dados.usuario);
    } catch {
      setErro('Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>Editar usuário</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSalvar} noValidate>
          {erro && (
            <div className="usr-erro" style={{ margin: '0 0 16px' }}>
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {erro}
            </div>
          )}

          <div className="section-label">Dados pessoais</div>
          <div className="grid-2" style={{ marginBottom: 20 }}>
            <div className="field">
              <label>Nome completo<span className="req">*</span></label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="section-label">Nova senha <span style={{ fontWeight: 400, color: 'var(--gray-400)', fontSize: 11 }}>(deixe em branco para manter)</span></div>
          <div className="grid-2" style={{ marginBottom: 8 }}>
            <div className="field">
              <label>Senha</label>
              <div className="input-wrap">
                <input type={verS ? 'text' : 'password'} className="has-eye" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} />
                <button type="button" className="pwd-toggle" onClick={() => setVerS(v => !v)}>{verS ? <EyeOff /> : <EyeOn />}</button>
              </div>
            </div>
            <div className="field">
              <label>Confirmar senha</label>
              <div className="input-wrap">
                <input type={verC ? 'text' : 'password'} className="has-eye" placeholder="Repita a senha" value={confirma} onChange={e => setConfirma(e.target.value)} />
                <button type="button" className="pwd-toggle" onClick={() => setVerC(v => !v)}>{verC ? <EyeOff /> : <EyeOn />}</button>
              </div>
            </div>
          </div>

          {senha && (
            <div className="pwd-strength" style={{ marginBottom: 16 }}>
              <div className="pwd-bar-wrap">
                {[1,2,3].map(n => (
                  <div key={n} className="pwd-seg" style={{ background: forca.nivel >= n ? forca.cor : 'var(--gray-200)' }} />
                ))}
              </div>
              <span className="pwd-label" style={{ color: forca.cor }}>{forca.label}</span>
            </div>
          )}

          <div className="section-label">Nível de acesso</div>
          <div className="usr-perfis" style={{ marginBottom: 20 }}>
            {PERFIS.map(p => (
              <label key={p.value} className={`usr-perfil-card${perfil === p.value ? ' selected' : ''}`}>
                <input type="radio" name="perfil-edit" value={p.value} checked={perfil === p.value} onChange={() => setPerfil(p.value)} />
                <div className="usr-perfil-icon" style={{ background: p.iconBg }}>
                  <svg viewBox="0 0 24 24" style={{ fill: p.iconColor, width: 18, height: 18 }}>{p.icon.props.children}</svg>
                </div>
                <div className="usr-perfil-texto">
                  <div className="usr-perfil-nome">{p.label}</div>
                  <div className="usr-perfil-desc">{p.desc}</div>
                </div>
                <div className={`usr-perfil-radio${perfil === p.value ? ' checked' : ''}`}>
                  {perfil === p.value && <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                </div>
              </label>
            ))}
          </div>

          <div className="usr-form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={carregando} style={{ flex: 1, height: 48, fontSize: 14 }}>
              {carregando ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Usuarios() {
  const [nome,       setNome]       = useState('');
  const [email,      setEmail]      = useState('');
  const [senha,      setSenha]      = useState('');
  const [confirma,   setConfirma]   = useState('');
  const [perfil,     setPerfil]     = useState('operador');
  const [verS,       setVerS]       = useState(false);
  const [verC,       setVerC]       = useState(false);
  const [erro,       setErro]       = useState('');
  const [sucesso,    setSucesso]    = useState('');
  const [carregando, setCarregando] = useState(false);

  const [usuarios,       setUsuarios]       = useState([]);
  const [loadingLista,   setLoadingLista]   = useState(true);
  const [excluindoId,    setExcluindoId]    = useState(null);
  const [confirmandoId,  setConfirmandoId]  = useState(null);
  const [editando,       setEditando]       = useState(null);

  const forca = calcForca(senha);

  const carregarUsuarios = useCallback(async () => {
    setLoadingLista(true);
    try {
      const res  = await apiFetch('/api/usuarios');
      const data = await res.json();
      if (res.ok) setUsuarios(data);
    } finally {
      setLoadingLista(false);
    }
  }, []);

  useEffect(() => { carregarUsuarios(); }, [carregarUsuarios]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setSucesso('');
    if (!nome.trim())       return setErro('Informe o nome do usuário.');
    if (senha.length < 6)   return setErro('A senha deve ter ao menos 6 caracteres.');
    if (senha !== confirma) return setErro('As senhas não coincidem.');

    setCarregando(true);
    try {
      const res  = await apiFetch('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nome: nome.trim(), email: email.trim() || undefined, senha, perfil }),
      });
      const dados = await res.json();
      if (!res.ok) return setErro(dados.erro || 'Erro ao cadastrar usuário.');
      setSucesso(`Usuário "${dados.usuario.nome}" cadastrado com sucesso!`);
      limpar(false);
      carregarUsuarios();
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setCarregando(false);
    }
  }

  function limpar(limparSucesso = true) {
    setNome(''); setEmail(''); setSenha(''); setConfirma('');
    setPerfil('operador'); setErro('');
    if (limparSucesso) setSucesso('');
    setVerS(false); setVerC(false);
  }

  async function handleExcluir(id) {
    setExcluindoId(id);
    try {
      const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsuarios(prev => prev.filter(u => u.id !== id));
      }
    } finally {
      setExcluindoId(null);
      setConfirmandoId(null);
    }
  }

  function handleSalvoEdicao(usuarioAtualizado) {
    setUsuarios(prev => prev.map(u => u.id === usuarioAtualizado.id ? usuarioAtualizado : u));
    setEditando(null);
  }

  return (
    <>
      {/* Modal de edição */}
      {editando && (
        <ModalEditar
          usuario={editando}
          onClose={() => setEditando(null)}
          onSalvo={handleSalvoEdicao}
        />
      )}

      {/* Formulário de cadastro */}
      <div className="card">
        <div className="card-header">
          <div className="card-header-icon">
            <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <div>
            <h2>Novo Usuário</h2>
            <p>Preencha os dados para criar um acesso ao sistema</p>
          </div>
        </div>

        <div className="card-body">
          {sucesso && (
            <div className="usr-aviso">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              <div><strong>Cadastro realizado!</strong><span>{sucesso}</span></div>
              <button className="usr-aviso-close" onClick={() => setSucesso('')}>✕</button>
            </div>
          )}

          {erro && (
            <div className="usr-erro">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="section-label">Dados pessoais</div>
            <div className="grid-2" style={{ marginBottom: 24 }}>
              <div className="field">
                <label>Nome completo<span className="req">*</span></label>
                <input type="text" placeholder="Ex: João Silva" value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div className="field">
                <label>E-mail</label>
                <input type="text" placeholder="Ex: joao@email.com" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div className="section-label">Segurança</div>
            <div className="grid-2" style={{ marginBottom: 8 }}>
              <div className="field">
                <label>Senha<span className="req">*</span></label>
                <div className="input-wrap">
                  <input type={verS ? 'text' : 'password'} className="has-eye" placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} />
                  <button type="button" className="pwd-toggle" onClick={() => setVerS(v => !v)}>{verS ? <EyeOff /> : <EyeOn />}</button>
                </div>
              </div>
              <div className="field">
                <label>Confirmar senha<span className="req">*</span></label>
                <div className="input-wrap">
                  <input type={verC ? 'text' : 'password'} className="has-eye" placeholder="Repita a senha" value={confirma} onChange={e => setConfirma(e.target.value)} />
                  <button type="button" className="pwd-toggle" onClick={() => setVerC(v => !v)}>{verC ? <EyeOff /> : <EyeOn />}</button>
                </div>
              </div>
            </div>

            <div className="pwd-strength" style={{ marginBottom: 24 }}>
              <div className="pwd-bar-wrap">
                {[1,2,3].map(n => (
                  <div key={n} className="pwd-seg" style={{ background: forca.nivel >= n ? forca.cor : 'var(--gray-200)' }} />
                ))}
              </div>
              {forca.label
                ? <span className="pwd-label" style={{ color: forca.cor }}>{forca.label}</span>
                : <span className="pwd-label" style={{ color: 'var(--gray-400)' }}>Digite uma senha para ver a força</span>
              }
            </div>

            <div className="section-label">Nível de acesso</div>
            <div className="usr-perfis" style={{ marginBottom: 24 }}>
              {PERFIS.map(p => (
                <label key={p.value} className={`usr-perfil-card${perfil === p.value ? ' selected' : ''}`}>
                  <input type="radio" name="perfil" value={p.value} checked={perfil === p.value} onChange={() => setPerfil(p.value)} />
                  <div className="usr-perfil-icon" style={{ background: p.iconBg }}>
                    <svg viewBox="0 0 24 24" style={{ fill: p.iconColor, width: 18, height: 18 }}>{p.icon.props.children}</svg>
                  </div>
                  <div className="usr-perfil-texto">
                    <div className="usr-perfil-nome">{p.label}</div>
                    <div className="usr-perfil-desc">{p.desc}</div>
                  </div>
                  <div className={`usr-perfil-radio${perfil === p.value ? ' checked' : ''}`}>
                    {perfil === p.value && <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                  </div>
                </label>
              ))}
            </div>

            <div className="usr-form-actions">
              <button type="button" className="btn-cancel" onClick={limpar}>Limpar</button>
              <button type="submit" className="btn-primary" disabled={carregando} style={{ flex: 1, height: 48, fontSize: 14 }}>
                {carregando
                  ? <><svg viewBox="0 0 24 24" style={{ animation: 'spin .8s linear infinite' }}><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>Salvando...</>
                  : <><svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Cadastrar usuário</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lista de usuários */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '18px 20px' }}>
          <div className="card-header-icon" style={{ background: 'var(--blue-light)' }}>
            <svg viewBox="0 0 24 24" style={{ fill: 'var(--blue)' }}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <h2>Usuários Cadastrados</h2>
            <p>{loadingLista ? 'Carregando...' : `${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} no sistema`}</p>
          </div>
        </div>

        {/* Cabeçalho da tabela */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '8px 20px',
          background: 'var(--gray-50)',
          borderTop: '1.5px solid var(--gray-200)',
          borderBottom: '1.5px solid var(--gray-200)',
        }}>
          <div style={{ width: 34, flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.6px' }}>Nome</div>
          <div style={{ width: 200, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.6px', flexShrink: 0 }}>E-mail</div>
          <div style={{ width: 96, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.6px', flexShrink: 0 }}>Perfil</div>
          <div style={{ width: 88, fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.6px', flexShrink: 0, textAlign: 'right' }}>Cadastro</div>
          <div style={{ width: 68, flexShrink: 0 }} />
        </div>

        {loadingLista && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
            Carregando usuários...
          </div>
        )}

        {!loadingLista && usuarios.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
            Nenhum usuário encontrado.
          </div>
        )}

        {!loadingLista && usuarios.map((u, idx) => (
          <div key={u.id} style={{ borderBottom: idx < usuarios.length - 1 || confirmandoId === u.id ? '1px solid var(--gray-200)' : 'none' }}>
            {/* Linha do usuário */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 20px',
              transition: 'background .12s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <AvatarLetra nome={u.nome} perfil={u.perfil} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.nome}
                </div>
              </div>

              <div style={{ width: 200, fontSize: 12, color: 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {u.email || '—'}
              </div>

              <div style={{ width: 96, flexShrink: 0 }}>
                <BadgePerfil perfil={u.perfil} />
              </div>

              <div style={{ width: 88, fontSize: 12, color: 'var(--gray-400)', flexShrink: 0, textAlign: 'right' }}>
                {fmtData(u.criado_em)}
              </div>

              <div style={{ width: 68, display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0 }}>
                <button
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--blue-light)', transition: 'background .15s',
                  }}
                  title="Editar"
                  onClick={() => { setEditando(u); setConfirmandoId(null); }}
                  onMouseEnter={e => e.currentTarget.style.background = '#C7D7F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-light)'}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'var(--blue)' }}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                </button>
                <button
                  style={{
                    width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#FEE2E2', color: '#DC2626', transition: 'background .15s',
                  }}
                  title="Excluir"
                  onClick={() => setConfirmandoId(confirmandoId === u.id ? null : u.id)}
                  onMouseEnter={e => e.currentTarget.style.background = '#FECACA'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FEE2E2'}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: 'currentColor' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
              </div>
            </div>

            {/* Confirmação de exclusão */}
            {confirmandoId === u.id && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end',
                padding: '10px 20px',
                borderTop: '1px solid var(--gray-200)',
                borderLeft: '3px solid var(--red)',
                background: 'var(--card-bg)',
                fontSize: 12,
              }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'var(--red)', flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                <span style={{ flex: 1, color: 'var(--red)', fontWeight: 600 }}>
                  Excluir <strong>"{u.nome}"</strong>? Esta ação não pode ser desfeita.
                </span>
                <button
                  onClick={() => handleExcluir(u.id)}
                  disabled={excluindoId === u.id}
                  style={{
                    background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7,
                    padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  {excluindoId === u.id ? 'Excluindo...' : 'Sim, excluir'}
                </button>
                <button
                  onClick={() => setConfirmandoId(null)}
                  style={{
                    background: 'var(--card-bg)', border: '1.5px solid var(--gray-200)', borderRadius: 7,
                    padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    color: 'var(--gray-600)', flexShrink: 0,
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info card */}
      <div className="info-card">
        <h3>
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Sobre os perfis de acesso
        </h3>
        <div className="steps">
          <div className="step">
            <div className="step-num" style={{ background: 'var(--blue)' }}>A</div>
            <p><strong>Administrador:</strong> acesso completo ao sistema — relatórios individuais, gerenciamento de usuários e produtos.</p>
          </div>
          <div className="step">
            <div className="step-num" style={{ background: 'var(--green)' }}>O</div>
            <p><strong>Operador:</strong> acessa calculadora e catálogo de produtos. Visualiza apenas o próprio histórico de orçamentos.</p>
          </div>
        </div>
      </div>
    </>
  );
}
