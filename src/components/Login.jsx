import { useState } from 'react';
import printLogo from '../assets/print logo.png';

const ICONS = {
  eye: <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>,
  eyeOff: <svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>,
  enter: <svg viewBox="0 0 24 24"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg>,
  spin: <svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>,
  erro: <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>,
  shield: <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4c1.4 0 2.8 1.4 2.8 3S13.4 11 12 11s-2.8-1.4-2.8-3S10.6 5 12 5zm0 12c-2.33 0-4.4-1.24-5.6-3.08C7.5 12.54 9.73 12 12 12s4.5.54 5.6 1.92C16.4 15.76 14.33 17 12 17z"/></svg>,
};

export default function Login({ onLogin }) {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !senha) {
      setErro('Preencha o nome e a senha.');
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim(), senha }),
      });

      const dados = await res.json();

      if (!res.ok) {
        setErro(dados.erro || 'Erro ao fazer login.');
        return;
      }

      onLogin(dados.usuario);
    } catch {
      setErro('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-layout">
      <div className="login-center">
        <img src={printLogo} alt="Print Gráfica" className="login-logo-top" />

        <div className="login-card">
          <div className="card-header">
            <div className="card-header-icon">{ICONS.shield}</div>
            <div>
              <h2>Acesso ao Sistema</h2>
              <p>Entre com suas credenciais para continuar</p>
            </div>
          </div>

          <div className="card-body">
            <form onSubmit={handleSubmit} className="login-form">
              {erro && (
                <div className="usr-erro">
                  {ICONS.erro}
                  {erro}
                </div>
              )}

              <div className="field">
                <label htmlFor="login-nome">
                  Nome de usuário <span className="req">*</span>
                </label>
                <input
                  id="login-nome"
                  type="text"
                  placeholder="Seu nome cadastrado"
                  value={nome}
                  onChange={e => { setNome(e.target.value); setErro(''); }}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="field">
                <label htmlFor="login-senha">
                  Senha <span className="req">*</span>
                </label>
                <div className="input-wrap">
                  <input
                    id="login-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={senha}
                    onChange={e => { setSenha(e.target.value); setErro(''); }}
                    className="has-eye"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pwd-toggle"
                    onClick={() => setMostrarSenha(v => !v)}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? ICONS.eyeOff : ICONS.eye}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={carregando}
                style={{ marginTop: 8 }}
              >
                <span className={carregando ? 'login-spin-icon' : ''}>
                  {carregando ? ICONS.spin : ICONS.enter}
                </span>
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
