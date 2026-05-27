import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';

const STORAGE_KEY = 'print_historico';

function carregarLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function formatarDoBackend(registros) {
  return registros.map(o => ({
    id:           o.id,
    cliente:      o.cliente || 'Não informado',
    numero:       o.numero  || '—',
    data:         new Date(o.criado_em).toLocaleDateString('pt-BR'),
    itensCont:    0,
    total:        parseFloat(o.total) || 0,
    status:       o.status || 'pendente',
    usuario_nome: o.usuarios?.nome || '—',
  }));
}

export function useHistorico(usuario) {
  const [historico, setHistorico] = useState(carregarLocal);
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    if (!usuario?.id) return;
    setCarregando(true);
    try {
      const params = new URLSearchParams({ usuario_id: usuario.id, perfil: usuario.perfil });
      const res = await apiFetch(`/api/orcamentos?${params}`);
      if (!res.ok) throw new Error();
      const dados = await res.json();
      const formatado = formatarDoBackend(dados);
      setHistorico(formatado);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formatado));
    } catch {
      // backend indisponível ou sessão expirada — mantém o que já está carregado
    } finally {
      setCarregando(false);
    }
  }, [usuario]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  function salvarOrcamento({ cliente, numero, data, itens, total }) {
    const novo = { id: Date.now(), cliente, numero, data, itensCont: itens.length, total };
    setHistorico(prev => [novo, ...prev].slice(0, 50));
    setTimeout(recarregar, 600);
  }

  function limparHistorico() {
    setHistorico([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return { historico, salvarOrcamento, limparHistorico, carregando, recarregar };
}
