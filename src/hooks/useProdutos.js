import { useState, useEffect } from 'react';

const STORAGE_KEY = 'print_produtos';
const DEFAULTS = [
  { id: 1, nome: 'Metro Adesivo',            preco: 120 },
  { id: 2, nome: 'Metro Lona',               preco: 120 },
  { id: 3, nome: 'Metro PVC Adesivado',      preco: 350 },
  { id: 4, nome: 'Metro ACM Adesivado',      preco: 450 },
  { id: 5, nome: 'Metro Acrílico Adesivado', preco: 1000 },
  { id: 6, nome: 'Adesivo Perfurado',        preco: 140 },
  { id: 7, nome: 'Metro Papel Outdoor',      preco: 60  },
];

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useProdutos() {
  const [produtos, setProdutos] = useState(carregar);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
  }, [produtos]);

  function adicionar(nome, preco) {
    const nextId = produtos.length ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
    setProdutos(prev => [...prev, { id: nextId, nome, preco }]);
  }

  function atualizar(id, nome, preco) {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, nome, preco } : p));
  }

  function remover(id) {
    setProdutos(prev => prev.filter(p => p.id !== id));
  }

  return { produtos, adicionar, atualizar, remover };
}
