# Sistema Print — Print Gráfica & Comunicação Visual

Sistema web completo para gestão de orçamentos, catálogo de produtos, relatórios e controle de usuários para gráficas e empresas de comunicação visual.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Tecnologias](#2-tecnologias)
3. [Configuração](#3-configuração)
4. [Como rodar localmente](#4-como-rodar-localmente)
5. [Deploy (Vercel)](#5-deploy-vercel)
6. [Segurança](#6-segurança)
7. [Funcionalidades](#7-funcionalidades)
8. [Perfis de acesso](#8-perfis-de-acesso)
9. [Estrutura de arquivos](#9-estrutura-de-arquivos)
10. [Observações](#10-observações)

---

## 1. Visão Geral

O sistema é dividido em **frontend React** e **backend Node.js/Express**, integrados ao banco de dados **Supabase (PostgreSQL)**. Inclui autenticação por JWT, controle de acesso por perfil, geração de PDFs e modo escuro.

| Módulo | Descrição |
|---|---|
| Visão Geral | Dashboard com estatísticas, histórico recente e atalhos |
| Calculadora | Cálculo de orçamentos por m², campo de observação, geração de PDF |
| Produtos | Catálogo de materiais com preços por m² |
| Orçamentos | Listagem completa com busca, filtros e controle de status |
| Pedido de Venda | Gera PDF de pedido de venda a partir de orçamentos, com histórico de emissões |
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
-- observacao: campo livre opcional (instruções de entrega, prazo, etc.)
-- ─────────────────────────────────────────────
CREATE TABLE orcamentos (
  id         SERIAL        PRIMARY KEY,
  usuario_id INTEGER       REFERENCES usuarios(id),
  cliente    VARCHAR(150),
  numero     VARCHAR(50),
  total      NUMERIC(10,2),
  status     VARCHAR(20)   NOT NULL DEFAULT 'pendente',
  observacao TEXT,
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

-- ─────────────────────────────────────────────
-- 5. Pedidos de venda emitidos
-- Cada geração de PDF de pedido de venda grava uma linha aqui
-- ─────────────────────────────────────────────
CREATE TABLE pedidos_venda (
  id               SERIAL        PRIMARY KEY,
  orcamento_id     INTEGER       REFERENCES orcamentos(id) ON DELETE SET NULL,
  numero_orcamento VARCHAR(50)   NOT NULL,
  cliente          VARCHAR(150)  NOT NULL,
  usuario_id       INTEGER       REFERENCES usuarios(id) ON DELETE SET NULL,
  vendedor_nome    VARCHAR(100),
  total_produtos   NUMERIC(10,2) DEFAULT 0,
  desconto         NUMERIC(10,2) DEFAULT 0,
  total_final      NUMERIC(10,2) DEFAULT 0,
  situacao         VARCHAR(200),
  condicoes        VARCHAR(200),
  criado_em        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

**Relacionamentos entre tabelas:**

```
┌──────────────┐        ┌───────────────────┐      ┌──────────────────────┐
│   usuarios   │        │  itens_orcamento  │      │    pedidos_venda      │
│──────────────│        │───────────────────│      │──────────────────────│
│ id (PK)      │◄──┐    │ id (PK)           │      │ id (PK)              │
│ nome         │   │    │ orcamento_id (FK) │──┐   │ orcamento_id (FK)  ──┼──┐
│ email        │   │    │ produto_nome      │  │   │ numero_orcamento     │  │
│ senha        │   │    │ preco_m2          │  │   │ cliente              │  │
│ perfil       │   │    │ largura           │  │   │ usuario_id (FK)    ──┼──┼──► usuarios.id
│ criado_em    │   │    │ altura            │  │   │ vendedor_nome        │  │
└──────────────┘   │    │ quantidade        │  │   │ total_produtos       │  │
                   │    │ total             │  │   │ desconto             │  │
┌──────────────┐   │    └───────────────────┘  │   │ total_final          │  │
│   produtos   │   │                           │   │ situacao             │  │
│──────────────│   │    ┌───────────────────┐  │   │ condicoes            │  │
│ id (PK)      │   │    │    orcamentos     │◄─┘   │ criado_em            │  │
│ nome         │   │    │───────────────────│      └──────────────────────┘  │
│ preco        │   └────│ usuario_id (FK)   │◄─────────────────────────────┘
└──────────────┘        │ id (PK)           │
                        │ cliente           │
                        │ numero            │
                        │ total             │
                        │ status            │
                        │ observacao        │
                        │ criado_em         │
                        └───────────────────┘
```

> - `orcamentos.usuario_id` → `usuarios.id`
> - `itens_orcamento.orcamento_id` → `orcamentos.id` (CASCADE DELETE)
> - `pedidos_venda.orcamento_id` → `orcamentos.id` (SET NULL ao excluir orçamento)
> - `pedidos_venda.usuario_id` → `usuarios.id` (SET NULL ao excluir usuário)

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

> O Vite está configurado com um proxy: qualquer chamada a `/api/...` em desenvolvimento é redirecionada automaticamente para `http://localhost:3001`. Não é necessário alterar nenhuma URL no frontend.

---

## 5. Deploy (Vercel)

O projeto é deployado no Vercel com frontend e backend juntos no mesmo domínio.

### Estrutura de deploy

| Arquivo | Função |
|---|---|
| `vercel.json` | Redireciona `/api/*` para a serverless function e `/*` para o `index.html` |
| `api/index.js` | Exporta o app Express como serverless function do Vercel |
| `backend/src/app.js` | App Express puro (sem `listen`) — reutilizado localmente e no Vercel |

### Variáveis de ambiente no Vercel

Configure no painel do projeto (Settings → Environment Variables):

```
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key
JWT_SECRET=sua_chave_secreta
```

### Como fazer o deploy

1. Conecte o repositório GitHub ao Vercel
2. Configure as variáveis de ambiente acima
3. O Vercel detecta `vercel.json` e usa `npm run build` automaticamente
4. Todo push para `main` dispara um novo deploy

---

## 6. Segurança

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
- Usa URL relativa (`/api/...`) — funciona tanto em desenvolvimento (proxy Vite) quanto em produção (Vercel same-origin)

---

## 7. Funcionalidades

### Login

Acesse com **nome de usuário** e **senha**. E-mail não é necessário.

### Dashboard

Exibe estatísticas gerais, os 6 orçamentos mais recentes e atalhos rápidos para as seções principais.

### Calculadora

1. O **número do orçamento** é gerado automaticamente
2. Preencha o **nome do cliente**
3. Preencha o campo **Observação** (opcional) — instruções de entrega, prazo, detalhes extras
4. Selecione um produto do catálogo ou preencha manualmente (nome + preço/m²)
5. Informe largura, altura e quantidade (aceita vírgula como separador decimal)
6. Clique em **Calcular** → depois em **Adicionar ao orçamento**
7. Repita para cada item
8. Clique em **Salvar no Sistema** para registrar e em **Gerar PDF** para baixar

> A observação é salva junto com o orçamento no banco e exibida no Pedido de Venda quando o orçamento é selecionado.

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

### Pedido de Venda

Aba dedicada à emissão de pedidos de venda em PDF a partir de orçamentos existentes.

**Fluxo de uso:**

1. A tela exibe a lista completa de orçamentos (com busca por cliente ou número)
2. Clique em **Selecionar** no orçamento desejado
3. O sistema carrega automaticamente: cliente, vendedor, data e todos os itens do orçamento
4. Se o orçamento tiver **observação**, ela aparece em destaque antes dos itens
5. Preencha os campos opcionais:
   - **Situação Atual** — ex: "Entrega direta ao cliente"
   - **Condições de Pagamento** — ex: "50% entrada + saldo na entrega"
   - **Desconto (R$)** — abatido do total calculado
6. Clique em **Gerar Pedido de Venda (PDF)** — o PDF é baixado e a emissão é salva no banco

**Fallback para orçamentos antigos:** orçamentos criados antes da atualização (sem itens salvos individualmente) exibem uma linha "Conforme orçamento nº XXXX" com o total consolidado.

**Histórico de Pedidos Gerados** (card abaixo da lista):
- Mostra todos os pedidos emitidos com filtro de período (Todos / Este mês / Esta semana / Este ano)
- Cards de estatísticas: total de pedidos, valor total, ticket médio e maior pedido
- Tabela: Nº Orçamento · Cliente · Vendedor · Data · Total Final
- Operadores veem apenas os próprios pedidos; admin vê todos

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

- Visualize todos os usuários cadastrados com nome, e-mail, perfil e data de criação
- Cadastre novos usuários informando nome, senha e perfil (`admin` ou `operador`) — e-mail é opcional
- Edite qualquer usuário (nome, e-mail, perfil e senha) via modal
- Exclua usuários com confirmação inline — o admin não pode excluir a si mesmo
- Indicador de força de senha no cadastro e na edição

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

## 8. Perfis de acesso

| Funcionalidade | Operador | Admin |
|---|:---:|:---:|
| Dashboard | ✓ | ✓ |
| Calculadora (com observação) | ✓ | ✓ |
| Produtos (visualizar/editar) | ✓ | ✓ |
| Produtos (excluir) | — | ✓ |
| Orçamentos (próprios) | ✓ | — |
| Orçamentos (todos) | — | ✓ |
| Orçamentos (excluir) | — | ✓ |
| Pedido de Venda (próprios) | ✓ | — |
| Pedido de Venda (todos / histórico global) | — | ✓ |
| Relatórios (próprios) | ✓ | — |
| Relatórios (todos os usuários) | — | ✓ |
| Gestão de Usuários | — | ✓ |

---

## 9. Estrutura de arquivos

```
Sistema Print/
├── api/
│   └── index.js                        ← serverless function do Vercel (exporta o app Express)
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js         ← login (bcrypt + geração de JWT)
│   │   │   ├── usuariosController.js     ← CRUD completo de usuários (listar, criar, editar, excluir)
│   │   │   ├── orcamentosController.js   ← listar, salvar (+ observacao + itens), status, próximo número, buscarPorNumero
│   │   │   ├── relatoriosController.js   ← filtros por período/usuário/status
│   │   │   └── pedidosVendaController.js ← salvar emissão de PDF + listar com stats por período
│   │   ├── middleware/
│   │   │   └── auth.js                   ← verifica JWT em todas as rotas protegidas
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js               ← GET / POST / PUT /:id / DELETE /:id
│   │   │   ├── orcamentos.js             ← + GET /por-numero/:numero
│   │   │   ├── relatorios.js
│   │   │   └── pedidosVenda.js           ← POST / + GET /
│   │   ├── lib/
│   │   │   └── supabase.js             ← cliente Supabase (service role)
│   │   ├── app.js                      ← Express + Helmet + CORS + limite 1mb (sem listen)
│   │   └── index.js                    ← ponto de entrada local (chama app.listen)
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
│   │   ├── Calculadora.jsx             ← cálculo por m², campo observação, salvar no sistema e gerar PDF
│   │   ├── Produtos.jsx                ← catálogo de materiais
│   │   ├── Orcamentos.jsx              ← listagem, filtros e controle de status
│   │   ├── PedidoVenda.jsx             ← emissão de pedido de venda em PDF + histórico de emissões
│   │   ├── Relatorios.jsx              ← relatórios com filtros + PDF integrado
│   │   └── Usuarios.jsx                ← listagem, cadastro, edição e exclusão (admin)
│   ├── hooks/
│   │   ├── useProdutos.js              ← produtos via localStorage
│   │   └── useHistorico.js             ← orçamentos via backend/banco
│   ├── lib/
│   │   └── api.js                      ← cliente HTTP centralizado (URL relativa, JWT, logout em 401)
│   ├── utils/
│   │   ├── fmt.js                      ← formatação de valores em R$
│   │   └── pdf.js                      ← geração de PDFs (orçamento, relatório e pedido de venda)
│   ├── App.jsx                         ← estrutura principal, sidebar, rotas e tema
│   ├── index.css                       ← estilos globais + variáveis de tema claro/escuro
│   └── main.jsx
│
├── public/
│   └── logo.png                        ← favicon (logo da empresa)
├── vercel.json                         ← rewrites: /api/* → serverless, /* → index.html
├── vite.config.js                      ← porta 5175 + proxy /api → localhost:3001
└── package.json                        ← dependências do frontend e do backend (Vercel usa este)
```

---

## 10. Observações

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

---

## 11. Endpoints da API

Todas as rotas (exceto `/api/auth/login`) exigem o header `Authorization: Bearer <token>`.

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Login — retorna token JWT |

### Orçamentos
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/orcamentos` | Lista orçamentos (admin vê todos, operador vê os próprios) |
| POST | `/api/orcamentos` | Salva orçamento com itens e observação |
| GET | `/api/orcamentos/proximo-numero` | Retorna o próximo número sequencial |
| GET | `/api/orcamentos/por-numero/:numero` | Retorna orçamento completo (com itens) pelo número |
| PATCH | `/api/orcamentos/:id/status` | Altera status (`pendente` / `concluido`) |
| DELETE | `/api/orcamentos/:id` | Exclui orçamento e seus itens (CASCADE) |

### Pedidos de Venda
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/pedidos-venda` | Registra uma emissão de pedido de venda |
| GET | `/api/pedidos-venda` | Lista emissões com stats por período (admin vê todas) |

### Relatórios
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/relatorios` | Relatório com filtros de período, usuário e status |

### Usuários
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/usuarios` | Lista todos os usuários |
| POST | `/api/usuarios` | Cadastra novo usuário |
| PUT | `/api/usuarios/:id` | Edita usuário |
| DELETE | `/api/usuarios/:id` | Exclui usuário |
