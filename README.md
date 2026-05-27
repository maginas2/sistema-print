# Sistema Print — Print Gráfica & Comunicação Visual

Sistema web completo para gestão de orçamentos, catálogo de produtos, relatórios e controle de usuários para gráficas e comunicação visual.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Tecnologias](#2-tecnologias)
3. [Requisitos](#3-requisitos)
4. [Como rodar localmente](#4-como-rodar-localmente)
5. [Configuração do banco de dados](#5-configuração-do-banco-de-dados)
6. [Como usar o sistema](#6-como-usar-o-sistema)
7. [Perfis de acesso](#7-perfis-de-acesso)
8. [Estrutura de arquivos](#8-estrutura-de-arquivos)

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
PORT=3001
```

> Use a **service role key** do Supabase (não a anon key), pois ela ignora as políticas de RLS.

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

## 6. Como usar o sistema

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
- Botão **Baixar PDF** exporta o relatório completo em PDF

---

### Usuários *(somente admin)*

- Cadastre novos usuários informando nome, senha e perfil (`admin` ou `operador`)
- E-mail é opcional

---

## 7. Perfis de acesso

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

## 8. Estrutura de arquivos

```
Sistema Print/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js       ← login por nome + senha (bcrypt)
│   │   │   ├── usuariosController.js   ← CRUD de usuários
│   │   │   ├── orcamentosController.js ← listar, salvar, status, próximo número
│   │   │   └── relatoriosController.js ← filtros por período/usuário/status
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── usuarios.js
│   │   │   ├── orcamentos.js
│   │   │   └── relatorios.js
│   │   ├── lib/
│   │   │   └── supabase.js             ← cliente Supabase (service role)
│   │   └── index.js                    ← servidor Express, CORS porta 5175
│   ├── .env                            ← variáveis de ambiente (não versionar)
│   └── package.json
│
├── src/
│   ├── assets/
│   │   ├── print logo.png
│   │   ├── parte de cima.jpg.jpeg      ← cabeçalho do PDF
│   │   └── parte de baixo.jpg.jpeg     ← rodapé do PDF
│   ├── components/
│   │   ├── Login.jsx                   ← autenticação por nome + senha
│   │   ├── Dashboard.jsx               ← stats + histórico recente (6 registros)
│   │   ├── Calculadora.jsx             ← cálculo e geração de orçamento PDF
│   │   ├── Produtos.jsx                ← catálogo de materiais
│   │   ├── Orcamentos.jsx              ← listagem e controle de status
│   │   ├── Relatorios.jsx              ← relatórios com filtros + PDF
│   │   └── Usuarios.jsx                ← cadastro de usuários (admin)
│   ├── hooks/
│   │   ├── useProdutos.js              ← produtos via localStorage
│   │   └── useHistorico.js             ← orçamentos via backend/banco
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
