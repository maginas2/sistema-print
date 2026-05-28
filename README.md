# Sistema Print — Print Gráfica & Comunicação Visual

Sistema web completo para gestão de orçamentos, catálogo de produtos, relatórios e controle de usuários para gráficas e empresas de comunicação visual.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Tecnologias](#2-tecnologias)
3. [Configuração](#3-configuração)
4. [Como rodar localmente](#4-como-rodar-localmente)
5. [Segurança](#5-segurança)
6. [Funcionalidades](#6-funcionalidades)
7. [Perfis de acesso](#7-perfis-de-acesso)
8. [Estrutura de arquivos](#8-estrutura-de-arquivos)
9. [Observações](#9-observações)

---

## 1. Visão Geral

O sistema é dividido em **frontend React** e **backend Node.js/Express**, integrados ao banco de dados **Supabase (PostgreSQL)**. Inclui autenticação por JWT, controle de acesso por perfil, geração de PDFs e modo escuro.

| Módulo | Descrição |
|---|---|
| Visão Geral | Dashboard com estatísticas, histórico recente e atalhos |
| Calculadora | Cálculo de orçamentos por m², geração de PDF |
| Produtos | Catálogo de materiais com preços por m² |
| Orçamentos | Listagem completa com busca, filtros e controle de status |
| Relatórios | Análise por período, usuário e status, exportável em PDF |
| Usuários | Cadastro e gestão de acessos *(somente admin)* |

---

## 2. Tecnologias

**Frontend**
- React 19 + Vite
- jsPDF — geração de PDFs (orçamentos e relatórios)
- CSS puro com variáveis customizadas e suporte a modo escuro

**Backend**
- Node.js + Express
- Supabase JS Client (PostgreSQL via Supabase)
- bcryptjs — hash de senhas
- jsonwebtoken — autenticação via JWT (tokens de 8h)
- helmet — cabeçalhos HTTP de segurança
- cors, dotenv

**Banco de dados**
- Supabase (PostgreSQL hospedado)

---

## 3. Configuração

### 3.1 Variáveis de ambiente

Crie o arquivo `backend/.env` antes de subir o backend:

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key
JWT_SECRET=uma_string_longa_e_aleatoria_aqui
PORT=3001
```

> - Use a **service role key** do Supabase (não a anon key), pois ela ignora as políticas de RLS.
> - O `JWT_SECRET` deve ter pelo menos 32 caracteres. Nunca o exponha em repositórios públicos.

### 3.2 Banco de dados

Execute o script abaixo **na ordem apresentada** no SQL Editor do Supabase:

```sql
-- ─────────────────────────────────────────────
-- 1. Usuários do sistema
-- perfil: 'admin' ou 'operador'
-- email é opcional (pode ser NULL), mas único quando informado
-- ─────────────────────────────────────────────
CREATE TABLE usuarios (
  id        SERIAL       PRIMARY KEY,
  nome      VARCHAR(100) NOT NULL,
  email     VARCHAR(150) UNIQUE,
  senha     VARCHAR(255) NOT NULL,
  perfil    VARCHAR(20)  NOT NULL DEFAULT 'operador',
  criado_em TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. Catálogo de produtos (preço por m²)
-- ─────────────────────────────────────────────
CREATE TABLE produtos (
  id    SERIAL        PRIMARY KEY,
  nome  VARCHAR(100)  NOT NULL,
  preco NUMERIC(10,2) NOT NULL
);

-- ─────────────────────────────────────────────
-- 3. Orçamentos
-- status: 'pendente' (padrão) ou 'concluido'
-- ─────────────────────────────────────────────
CREATE TABLE orcamentos (
  id         SERIAL        PRIMARY KEY,
  usuario_id INTEGER       REFERENCES usuarios(id),
  cliente    VARCHAR(150),
  numero     VARCHAR(50),
  total      NUMERIC(10,2),
  status     VARCHAR(20)   NOT NULL DEFAULT 'pendente',
  criado_em  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. Itens de cada orçamento
-- Excluir um orçamento remove seus itens automaticamente (CASCADE)
-- ─────────────────────────────────────────────
CREATE TABLE itens_orcamento (
  id           SERIAL        PRIMARY KEY,
  orcamento_id INTEGER       REFERENCES orcamentos(id) ON DELETE CASCADE,
  produto_nome VARCHAR(100),
  preco_m2     NUMERIC(10,2),
  largura      NUMERIC(10,4),
  altura       NUMERIC(10,4),
  quantidade   INTEGER,
  total        NUMERIC(10,2)
);
```

### 3.3 Dados iniciais

Após criar as tabelas, rode no SQL Editor:

```sql
-- Produtos padrão do catálogo
INSERT INTO produtos (nome, preco) VALUES
  ('Metro Adesivo',             120.00),
  ('Metro Lona',                120.00),
  ('Metro PVC Adesivado',       350.00),
  ('Metro ACM Adesivado',       450.00),
  ('Metro Acrílico Adesivado', 1000.00),
  ('Adesivo Perfurado',         140.00),
  ('Metro Papel Outdoor',        60.00);

-- Primeiro usuário admin
-- Para gerar um novo hash de senha:
-- node -e "require('bcryptjs').hash('sua_senha', 10).then(console.log)"
INSERT INTO usuarios (nome, email, senha, perfil) VALUES (
  'Admin',
  'admin@sistemprint.com',
  '$2b$10$PHZXVd6/EX07.LDdFjmOSexbv2wIffz2omitlr562o7hNRAojoYJO',
  'admin'
);
```

> **Atenção:** o hash acima é apenas para desenvolvimento. Em produção, gere um novo hash com a senha desejada usando o comando acima.

---

## 4. Como rodar localmente

O projeto tem duas partes que precisam rodar ao mesmo tempo.

### Frontend

```bash
# Na pasta raiz do projeto
npm install
npm run dev
```

Acesse em: `http://localhost:5175`

### Backend

```bash
cd backend
npm install
npm run dev
```

O backend sobe em: `http://localhost:3001`

---

## 5. Segurança

### Autenticação por JWT

Após o login, o backend gera um **token JWT com validade de 8 horas** assinado com `JWT_SECRET`. O frontend armazena o token em `localStorage` (`print_token`) e o envia automaticamente em todas as requisições via `Authorization: Bearer <token>`.

Todas as rotas da API (exceto `/api/auth/login`) são protegidas pelo middleware `autenticar`, que rejeita requisições sem token válido com `401 Unauthorized`.

### Expiração de sessão

Quando o token expira ou é inválido, o frontend detecta o `401`, limpa o `localStorage` e redireciona para o login automaticamente — sem intervenção manual.

### Outras proteções

| Proteção | Detalhe |
|---|---|
| **Helmet** | Cabeçalhos HTTP de segurança aplicados globalmente |
| **Validação de entrada** | Nome limitado a 100 caracteres, senha a 128 — tipos verificados no login |
| **Limite de payload** | Requisições JSON limitadas a 1 MB |
| **Hash de senhas** | Armazenadas apenas como bcrypt — nunca em texto puro |
| **Resposta sem senha** | O campo `senha` nunca é retornado pela API |

### Cliente API centralizado (`src/lib/api.js`)

Toda comunicação frontend → backend passa por `apiFetch`, que:
- Injeta o token JWT automaticamente em cada requisição
- Intercepta respostas `401` e dispara o fluxo de sessão expirada
- Centraliza a URL base (`http://localhost:3001`) em um único lugar

---

## 6. Funcionalidades

### Login

Acesse com **nome de usuário** e **senha**. E-mail não é necessário.

### Dashboard

Exibe estatísticas gerais, os 6 orçamentos mais recentes e atalhos rápidos para as seções principais.

### Calculadora

1. O **número do orçamento** é gerado automaticamente
2. Preencha o **nome do cliente**
3. Selecione um produto do catálogo ou preencha manualmente (nome + preço/m²)
4. Informe largura, altura e quantidade
5. Clique em **Calcular** → depois em **Adicionar ao orçamento**
6. Repita para cada item
7. Clique em **Salvar no Sistema** para registrar e em **Gerar PDF** para baixar

### Produtos

- Cadastre materiais com nome e preço por m²
- Clique na seta verde para abrir o produto direto na Calculadora
- **Somente admins** podem excluir produtos

### Orçamentos

- Listagem completa dos orçamentos (admin vê todos, operador vê os próprios)
- Filtros por status: **Todos / Pendentes / Concluídos**
- Busca por nome de cliente ou número do orçamento
- Botão **Concluir / Reabrir** para alternar o status de cada orçamento
- Admin pode excluir orçamentos

### Relatórios

- Selecione o **período**: Hoje, Semana, Mês, Ano, Personalizado ou Tudo
- Filtre por **status** (todos, pendentes ou concluídos)
- Admins podem filtrar por **usuário específico**
- Cards de estatísticas: total de orçamentos, valor total, ticket médio e maior orçamento
- O botão **Relatório Resumido** busca os dados e gera o PDF em uma única ação

**Layout do PDF do relatório:**
- Cabeçalho com a **logo da empresa centralizada** sobre fundo escuro
- Informações de cabeçalho: Período, Status e data de geração
- Cards de estatísticas + tabela completa de orçamentos

### Usuários *(somente admin)*

- Cadastre novos usuários informando nome, senha e perfil (`admin` ou `operador`)
- E-mail é opcional
- Indicador de força de senha no cadastro

### Modo Escuro

O sistema possui suporte completo a modo escuro, ativado pelo botão na parte inferior da barra lateral (ícone de lua/sol).

**Como funciona:**
- O tema é salvo no `localStorage` (chave `print_tema`) e restaurado automaticamente na próxima abertura
- A troca aplica o atributo `data-theme="dark"` na tag `<html>`, ativando um conjunto de variáveis CSS alternativas definidas em `index.css`
- Todos os componentes — login, dashboard, calculadora, orçamentos, relatórios e usuários — respondem ao tema via variáveis CSS

**Variáveis alteradas no modo escuro (seleção):**

| Variável | Claro | Escuro |
|---|---|---|
| `--bg` | `#F8FAFC` | `#0F172A` |
| `--card-bg` | `#FFFFFF` | `#1E293B` |
| `--blue-light` | `#EBF1FF` | `#162044` |
| `--green-light` | `#D1FAE5` | `#052E1C` |
| `--red-light` | `#FEE2E2` | `#450A0A` |

---

## 7. Perfis de acesso

| Funcionalidade | Operador | Admin |
|---|:---:|:---:|
| Dashboard | ✓ | ✓ |
| Calculadora | ✓ | ✓ |
| Produtos (visualizar/editar) | ✓ | ✓ |
| Produtos (excluir) | — | ✓ |
| Orçamentos (próprios) | ✓ | — |
| Orçamentos (todos) | — | ✓ |
| Orçamentos (excluir) | — | ✓ |
| Relatórios (próprios) | ✓ | — |
| Relatórios (todos os usuários) | — | ✓ |
| Gestão de Usuários | — | ✓ |

---

## 8. Estrutura de arquivos

```
Sistema Print/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js       ← login (bcrypt + geração de JWT)
│   │   │   ├── usuariosController.js   ← CRUD de usuários
│   │   │   ├── orcamentosController.js ← listar, salvar, status, próximo número
│   │   │   └── relatoriosController.js ← filtros por período/usuário/status
│   │   ├── middleware/
│   │   │   └── auth.js                 ← verifica JWT em todas as rotas protegidas
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js
│   │   │   ├── orcamentos.js
│   │   │   └── relatorios.js
│   │   ├── lib/
│   │   │   └── supabase.js             ← cliente Supabase (service role)
│   │   └── index.js                    ← Express + Helmet + CORS + limite 1mb
│   ├── .env                            ← SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, PORT
│   └── package.json
│
├── src/
│   ├── assets/
│   │   ├── print logo.png              ← logo usada no cabeçalho do PDF de relatório
│   │   ├── parte de cima.jpg.jpeg      ← cabeçalho do PDF de orçamento individual
│   │   └── parte de baixo.jpg.jpeg     ← rodapé do PDF de orçamento individual
│   ├── components/
│   │   ├── Login.jsx                   ← tela de autenticação
│   │   ├── Dashboard.jsx               ← stats + histórico recente + atalhos
│   │   ├── Calculadora.jsx             ← cálculo por m² e geração de PDF
│   │   ├── Produtos.jsx                ← catálogo de materiais
│   │   ├── Orcamentos.jsx              ← listagem, filtros e controle de status
│   │   ├── Relatorios.jsx              ← relatórios com filtros + PDF integrado
│   │   └── Usuarios.jsx                ← cadastro de usuários (admin)
│   ├── hooks/
│   │   ├── useProdutos.js              ← produtos via localStorage
│   │   └── useHistorico.js             ← orçamentos via backend/banco
│   ├── lib/
│   │   └── api.js                      ← cliente HTTP centralizado (JWT + logout em 401)
│   ├── utils/
│   │   ├── fmt.js                      ← formatação de valores em R$
│   │   └── pdf.js                      ← geração de PDFs (orçamento e relatório)
│   ├── App.jsx                         ← estrutura principal, sidebar, rotas e tema
│   ├── index.css                       ← estilos globais + variáveis de tema claro/escuro
│   └── main.jsx
│
├── public/
│   └── favicon.svg                     ← ícone da aba do navegador (p dourado)
├── vite.config.js                      ← porta 5175
└── package.json
```

---

## 9. Observações

**Portas padrão:**
- Frontend: `http://localhost:5175`
- Backend: `http://localhost:3001`

**Chaves no `localStorage`:**

| Chave | Conteúdo |
|---|---|
| `print_usuario` | Dados do usuário logado (nome, perfil, id) |
| `print_token` | JWT de autenticação (expira em 8h) |
| `print_tema` | Preferência de tema: `'light'` ou `'dark'` |

**Build de produção do frontend:**

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`.
