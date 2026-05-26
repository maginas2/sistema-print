# Calculadora de Preços — Print Gráfica

Sistema web para calcular orçamentos por metro quadrado, gerenciar catálogo de produtos e gerar PDFs profissionais.

---

## Sumário

1. [Requisitos](#1-requisitos)
2. [Como rodar localmente](#2-como-rodar-localmente)
3. [Como usar o sistema](#3-como-usar-o-sistema)
   - [Aba Calculadora](#calculadora)
   - [Aba Produtos](#produtos)
4. [Gerar PDF](#4-gerar-pdf)
5. [Estrutura de arquivos](#5-estrutura-de-arquivos)

---

## 1. Requisitos

Antes de rodar o projeto, certifique-se de ter instalado:

- **Node.js** versão 18 ou superior → [nodejs.org](https://nodejs.org)
- **npm** (vem junto com o Node.js)

Para verificar se já está instalado, abra o terminal e rode:

```bash
node -v
npm -v
```

---

## 2. Como rodar localmente

### Passo 1 — Abrir o terminal na pasta do projeto

Navegue até a pasta do projeto:

```bash
cd "C:\Users\geustachio\Desktop\calculador-react"
```

### Passo 2 — Instalar as dependências (só na primeira vez)

```bash
npm install
```

### Passo 3 — Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

### Passo 4 — Abrir no navegador

Acesse no navegador:

```
http://localhost:5175
```

> Para parar o servidor, pressione `Ctrl + C` no terminal.

---

## 3. Como usar o sistema

O sistema é dividido em duas abas, acessíveis pelo menu lateral: **Calculadora** e **Produtos**.

---

### Calculadora

É onde você cria orçamentos para clientes.

#### Passo a passo para gerar um orçamento:

**1. Informações do cliente**
- Preencha o **Nome do cliente** (ex: João Silva)
- Preencha o **Nº do orçamento** (ex: 0042)
- Esses campos valem para todos os produtos do mesmo orçamento

**2. Selecionar produto do catálogo** *(opcional)*
- Clique no menu suspenso e escolha um produto já cadastrado
- O nome e o preço por m² serão preenchidos automaticamente

**3. Preencher manualmente** *(se não usar o catálogo)*
- **Nome do produto / material** — ex: Lona Fosca, Banner, Adesivo Vinil
- **Preço por m²** — valor em R$

**4. Dimensões e quantidade**
- **Largura** e **Altura** em metros (use ponto ou vírgula como separador decimal)
- **Quantidade** — quantas unidades desse item

**5. Calcular**
- Clique em **Calcular** (ou pressione `Enter`)
- Aparecerá o resultado com: área, valor unitário e total

**6. Adicionar ao orçamento**
- Clique em **"Adicionar ao orçamento"** para incluir o item na lista
- O formulário será limpo automaticamente para você adicionar o próximo produto
- Repita os passos 2 a 6 para cada produto

**7. Visualizar e exportar**
- Os itens adicionados aparecem no card **"Itens do Orçamento"** abaixo
- O **total geral** é calculado automaticamente
- Clique em **"Gerar PDF do Orçamento"** para baixar o arquivo

> Dica: você também pode clicar em **"Gerar PDF"** logo após calcular um item, sem precisar adicionar à lista — ele exporta tudo que estiver calculado no momento.

---

### Produtos

É onde você gerencia o catálogo de produtos com preços pré-definidos.

#### Adicionar um produto:

1. Clique em **"+ Adicionar Produto"** no topo do card
2. Preencha:
   - **Nome** — ex: Lona Fosca
   - **Preço por m²** — ex: 85,00
3. Clique em **Salvar**

#### Editar um produto:

1. Clique no ícone de **lápis** ao lado do produto
2. Altere os campos desejados
3. Clique em **Salvar**

#### Excluir um produto:

1. Clique no ícone de **lixeira** ao lado do produto
2. Confirme a exclusão

#### Usar um produto direto na calculadora:

1. Clique no ícone **verde** (seta) ao lado do produto
2. O sistema abre automaticamente a aba **Calculadora** com nome e preço preenchidos

> Os produtos ficam salvos no navegador (localStorage). Não se perdem ao fechar a aba, mas são específicos do computador/navegador onde foram cadastrados.

---

## 4. Gerar PDF

O PDF gerado contém:

- **Cabeçalho** com logo e serviços da Print Gráfica
- **Nome do cliente** em destaque
- **Tabela de itens** com descrição, dimensões, quantidade, valor unitário e total
- **Valor total** do orçamento
- **Rodapé** com dados da empresa (CNPJ, telefone, e-mail, formas de pagamento)

O arquivo é salvo automaticamente com o nome:

```
orcamento-[numero]-[data].pdf
```

---

## 5. Estrutura de arquivos

```
calculador-react/
├── src/
│   ├── assets/
│   │   ├── print logo.png          ← logo exibida no topo do site
│   │   ├── parte de cima.jpg.jpeg  ← cabeçalho do PDF
│   │   └── parte de baixo.jpg.jpeg ← rodapé do PDF
│   ├── components/
│   │   ├── Calculadora.jsx         ← tela de cálculo e orçamentos
│   │   └── Produtos.jsx            ← tela de gestão do catálogo
│   ├── hooks/
│   │   └── useProdutos.js          ← lógica de cadastro de produtos (localStorage)
│   ├── utils/
│   │   ├── fmt.js                  ← formatação de valores em R$
│   │   └── pdf.js                  ← geração do PDF com jsPDF
│   ├── App.jsx                     ← estrutura principal (sidebar + navegação)
│   ├── App.css
│   ├── index.css                   ← estilos globais
│   └── main.jsx                    ← entrada da aplicação
├── public/
│   └── favicon.svg
├── vite.config.js                  ← configuração do Vite (porta 5175)
└── package.json
```

---

## Observações

- O sistema roda **apenas localmente** por enquanto — não está publicado na internet
- Os dados do catálogo ficam salvos no **navegador** (localStorage), não em um servidor
- Para usar em outro computador, será necessário recadastrar os produtos
- Para fazer o **build de produção** (versão otimizada para publicar):

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`.
