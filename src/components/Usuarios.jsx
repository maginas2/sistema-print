import { useState } from 'react';
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
  if (pts <= 1) return { nivel: 1, label: 'Fraca',  cor: 'var(--red)'        };
  if (pts <= 2) return { nivel: 2, label: 'Média',  cor: 'var(--yellow-dark)' };
  return           { nivel: 3, label: 'Forte',  cor: 'var(--green)'       };
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

  const forca = calcForca(senha);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (!nome.trim())       return setErro('Informe o nome do usuário.');
    if (senha.length < 6)   return setErro('A senha deve ter ao menos 6 caracteres.');
    if (senha !== confirma) return setErro('As senhas não coincidem.');

    setCarregando(true);
    try {
      const res = await apiFetch('/api/usuarios', {
        method: 'POST',
        body: JSON.stringify({ nome: nome.trim(), email: email.trim() || undefined, senha, perfil }),
      });

      const dados = await res.json();

      if (!res.ok) {
        setErro(dados.erro || 'Erro ao cadastrar usuário.');
        return;
      }

      setSucesso(`Usuário "${dados.usuario.nome}" cadastrado com sucesso!`);
      limpar(false);
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

  return (
    <>
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
              <div>
                <strong>Cadastro realizado!</strong>
                <span>{sucesso}</span>
              </div>
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

            {/* Dados pessoais */}
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

            {/* Senha */}
            <div className="section-label">Segurança</div>
            <div className="grid-2" style={{ marginBottom: 8 }}>
              <div className="field">
                <label>Senha<span className="req">*</span></label>
                <div className="input-wrap">
                  <input
                    type={verS ? 'text' : 'password'}
                    className="has-eye"
                    placeholder="Mínimo 6 caracteres"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                  />
                  <button type="button" className="pwd-toggle" onClick={() => setVerS(v => !v)}>
                    {verS ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>
              <div className="field">
                <label>Confirmar senha<span className="req">*</span></label>
                <div className="input-wrap">
                  <input
                    type={verC ? 'text' : 'password'}
                    className="has-eye"
                    placeholder="Repita a senha"
                    value={confirma}
                    onChange={e => setConfirma(e.target.value)}
                  />
                  <button type="button" className="pwd-toggle" onClick={() => setVerC(v => !v)}>
                    {verC ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>
            </div>

            {/* Barra de força */}
            <div className="pwd-strength" style={{ marginBottom: 24 }}>
              <div className="pwd-bar-wrap">
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className="pwd-seg"
                    style={{ background: forca.nivel >= n ? forca.cor : 'var(--gray-200)' }}
                  />
                ))}
              </div>
              {forca.label && (
                <span className="pwd-label" style={{ color: forca.cor }}>
                  {forca.label}
                </span>
              )}
              {!forca.label && senha === '' && (
                <span className="pwd-label" style={{ color: 'var(--gray-400)' }}>
                  Digite uma senha para ver a força
                </span>
              )}
            </div>

            {/* Nível de acesso */}
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
                    {perfil === p.value && (
                      <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    )}
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
