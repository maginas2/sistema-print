# Sistema Print — Print Gráfica & Comunicação Visual

Sistema web completo para gestão de orçamentos, catálogo de produtos, relatórios e controle de usuários para gráficas e comunicação visual.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Tecnologias](#2-tecnologias)
3. [Requisitos](#3-requisitos)
4. [Como rodar localmente](#4-como-rodar-localmente)
5. [Configuração do banco de dados](#5-configuração-do-banco-de-dados)
6. [Segurança](#6-segurança)
7. [Como usar o sistema](#7-como-usar-o-sistema)
8. [Perfis de acesso](#8-perfis-de-acesso)
9. [Estrutura de arquivos](#9-estrutura-de-arquivos)

---

## 1. Visão Geral

O sistema é dividido em **frontend React** e **backend Node.js/Express**, integrados ao banco de dados **Supabase (PostgreSQL)**. Inclui autenticação por nome de usuário e senha, controle de acesso por perfil, geração de PDFs e relatórios completos.

**Módulos disponíveis:**

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
- CSS puro com variáveis customizadas (sem framework)

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

## 3. Requisitos

- **Node.js** v18 ou superior → [nodejs.org](https://nodejs.org)
- Conta no **Supabase** com as tabelas criadas (ver seção 5)
- npm (incluído no Node.js)

```bash
node -v
npm -v
```

---

## 4. Como rodar localmente

O projeto tem duas partes que precisam rodar ao mesmo tempo: o **frontend** e o **backend**.

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

> Crie o arquivo `backend/.env` antes de rodar o backend (ver seção 5).

---

## 5. Configuração do banco de dados

### Arquivo `backend/.env`

Crie o arquivo `backend/.env` com as seguintes variáveis (sem espaços ao redor do `=`):

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_KEY=sua_service_role_key
JWT_SECRET=uma_string_longa_e_aleatoria_aqui
PORT=3001
```

> Use a **service role key** do Supabase (não a anon key), pois ela ignora as políticas de RLS.
> O `JWT_SECRET` pode ser qualquer string longa e aleatória — use pelo menos 32 caracteres. Nunca exponha este valor em repositórios públicos.

### Tabelas necessárias no Supabase

Execute no SQL Editor do Supabase:

```sql
-- Usuários do sistema
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(150),
  senha TEXT NOT NULL,
  perfil VARCHAR(20) DEFAULT 'operador' NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Orçamentos
CREATE TABLE orcamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(20),
  cliente VARCHAR(200),
  itens JSONB,
  total NUMERIC(12, 2),
  status VARCHAR(20) DEFAULT 'pendente' NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT now()
);
```

> Se já tiver a tabela `orcamentos` criada sem a coluna `status`, rode:
> ```sql
> ALTER TABLE orcamentos ADD COLUMN status VARCHAR(20) DEFAULT 'pendente' NOT NULL;
> ```

### Criar o primeiro usuário admin

Como o cadastro de usuários é feito dentro do sistema (somente por admins), o primeiro usuário precisa ser inserido diretamente no banco. Gere um hash bcrypt da senha e insira:

```sql
INSERT INTO usuarios (nome, senha, perfil)
VALUES ('admin', '$2b$10$SEU_HASH_AQUI', 'admin');
```

---

## 6. Segurança

### Autenticação por JWT

Após o login, o backend gera um **token JWT com validade de 8 horas** assinado com `JWT_SECRET`. O frontend armazena o token em `localStorage` (chave `print_token`) e o envia automaticamente em todas as requisições no cabeçalho `Authorization: Bearer <token>`.

Todas as rotas da API (exceto `/api/auth/login`) são protegidas pelo middleware `autenticar`, que rejeita requisições sem token válido com `401 Unauthorized`.

### Expiração de sessão

Quando o token expira ou é inválido, o frontend detecta o `401`, remove os dados do `localStorage` e redireciona o usuário para a tela de login automaticamente — sem necessidade de intervenção manual.

### Outras proteções implementadas

| Proteção | Detalhe |
|---|---|
| **Helmet** | Cabeçalhos HTTP de segurança aplicados globalmente no Express |
| **Validação de entrada no login** | Nome limitado a 100 caracteres, senha a 128 — tipos verificados |
| **Limite de payload** | Requisições JSON limitadas a 1 MB para evitar ataques de payload |
| **Hash de senhas** | Senhas armazenadas apenas como hash bcrypt (nunca em texto puro) |
| **Token sem senha** | A resposta do login nunca inclui o campo `senha` do usuário |

### Cliente API centralizado (`src/lib/api.js`)

Toda comunicação frontend → backend passa por `apiFetch`, que:
- Injeta o token JWT automaticamente em cada requisição
- Intercepta respostas `401` e dispara o fluxo de logout/sessão expirada
- Mantém a URL base em um único lugar (`http://localhost:3001`)

---

## 7. Como usar o sistema

### Login

Acesse com **nome de usuário** e **senha**. Não é necessário e-mail.

---

### Calculadora

1. O **número do orçamento** é gerado automaticamente pelo sistema
2. Preencha o **nome do cliente**
3. Selecione um produto do catálogo ou preencha manualmente (nome + preço/m²)
4. Informe largura, altura e quantidade
5. Clique em **Calcular** → depois em **Adicionar ao orçamento**
6. Repita para cada item
7. Clique em **Gerar PDF do Orçamento** para baixar o arquivo

> O orçamento é salvo automaticamente no banco ao gerar o PDF.

---

### Produtos

- Cadastre materiais com nome e preço por m²
- Clique na seta verde para abrir o produto direto na Calculadora
- **Somente admins** podem excluir produtos

---

### Orçamentos

- Listagem completa de todos os orçamentos do usuário (admin vê todos)
- Filtros por status: **Todos / Pendentes / Concluídos**
- Busca por nome de cliente ou número do orçamento
- Botão **Concluir / Reabrir** para alterar o status de cada orçamento

---

### Relatórios

- Selecione o **período**: Hoje, Semana, Mês, Ano, Personalizado ou Tudo
- Filtre por **status** (todos, pendentes ou concluídos)
- Admins podem filtrar por **usuário específico**
- Estatísticas: total de orçamentos, valor total, ticket médio e maior orçamento
- O botão **Relatório Resumido** busca os dados e gera o PDF em uma única ação

**Layout do PDF do relatório:**
- Cabeçalho com a **logo da empresa centralizada** sobre fundo escuro (sem imagens de topo/rodapé)
- Informações de cabeçalho: Período, Status e data de geração
- Cards de estatísticas + tabela completa de orçamentos

---

### Usuários *(somente admin)*

- Cadastre novos usuários informando nome, senha e perfil (`admin` ou `operador`)
- E-mail é opcional

---

## 8. Perfis de acesso

| Funcionalidade | Operador | Admin |
|---|:---:|:---:|
| Calculadora | ✓ | ✓ |
| Produtos (visualizar/editar) | ✓ | ✓ |
| Produtos (excluir) | — | ✓ |
| Orçamentos (próprios) | ✓ | — |
| Orçamentos (todos) | — | ✓ |
| Relatórios (próprios) | ✓ | — |
| Relatórios (todos os usuários) | — | ✓ |
| Gestão de Usuários | — | ✓ |

---

## 9. Estrutura de arquivos

```
Sistema Print/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js       ← login por nome + senha (bcrypt) + geração de JWT
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
│   │   ├── Login.jsx                   ← autenticação por nome + senha
│   │   ├── Dashboard.jsx               ← stats + histórico recente (6 registros)
│   │   ├── Calculadora.jsx             ← cálculo e geração de orçamento PDF
│   │   ├── Produtos.jsx                ← catálogo de materiais
│   │   ├── Orcamentos.jsx              ← listagem e controle de status
│   │   ├── Relatorios.jsx              ← relatórios com filtros + geração de PDF integrada
│   │   └── Usuarios.jsx                ← cadastro de usuários (admin)
│   ├── hooks/
│   │   ├── useProdutos.js              ← produtos via localStorage
│   │   └── useHistorico.js             ← orçamentos via backend/banco
│   ├── lib/
│   │   └── api.js                      ← cliente HTTP centralizado (JWT, logout automático em 401)
│   ├── utils/
│   │   ├── fmt.js                      ← formatação de valores em R$
│   │   └── pdf.js                      ← geração de PDFs (orçamento e relatório)
│   ├── App.jsx                         ← estrutura principal, sidebar, rotas
│   ├── index.css                       ← estilos globais
│   └── main.jsx
│
├── vite.config.js                      ← porta 5175
└── package.json
```

---

## Observações

- O sistema roda **localmente** — frontend na porta `5175`, backend na porta `3001`
- Sessão mantida via `localStorage` (chave `print_usuario`)
- Para build de produção do frontend:

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`.
