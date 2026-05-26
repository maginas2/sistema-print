import { useState, useEffect } from 'react';

const STORAGE_KEY = 'print_historico';

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useHistorico() {
  const [historico, setHistorico] = useState(carregar);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historico));
  }, [historico]);

  function salvarOrcamento({ cliente, numero, data, itens, total }) {
    setHistorico(prev =>
      [{ id: Date.now(), cliente, numero, data, itensCont: itens.length, total }, ...prev].slice(0, 50)
    );
  }

  function limparHistorico() {
    setHistorico([]);
  }

  return { historico, salvarOrcamento, limparHistorico };
}
