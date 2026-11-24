# 🚗 Estaciona LP2 — Sistema de Gestão de Estacionamento

Aplicação web desenvolvida em **React** para controle operacional e financeiro de estacionamentos, abrangendo gestão de vagas por categoria, emissão e encerramento de tickets, cálculo tarifário automatizado, controle de fluxo de caixa e relatórios administrativos.

Projeto acadêmico desenvolvido para a disciplina de **Linguagem de Programação 2 (LP2)** do curso de **Sistemas de Informação**.

---

## 📋 Principais Funcionalidades

### 🔐 Autenticação e Controle de Acesso (RF01 – RF04)
- Login com validação de credenciais (`e-mail` e `senha`) e verificação de usuário ativo.
- Controle de permissões por perfil de acesso:
  - **Administrador (`ADMIN`):** acesso completo ao sistema, incluindo gestão de usuários, categorias, tarifas e relatórios financeiros.
  - **Operador (`OPERADOR`):** acesso às rotinas operacionais de entrada e saída de veículos, pagamentos, consulta de vagas e movimentação de caixa.

### 📊 Dashboard Operacional (RF05)
- Visão geral em tempo real da quantidade de vagas disponíveis por categoria.
- Indicadores de entradas realizadas no dia e tickets em aberto.
- Histórico das últimas operações e atalhos rápidos para as rotinas principais.

### 🏷️ Categorias, Vagas e Tarifas (RF06 – RF09, RF16 – RF18)
- Cadastro e gerenciamento de categorias de veículos (`Carro`, `Moto`, `Caminhão`, `Van`).
- Controle dinâmico de vagas totais, ocupadas e disponíveis com atualização automática nas entradas e saídas.
- Configuração de valores por **Hora**, **Diária** e **Pernoite**.

### 🎟️ Entrada, Permanência e Saída de Veículos (RF10 – RF15, RF19 – RF23)
- Registro de entrada com preenchimento automático de data e hora.
- Bloqueio automático em caso de lotação da categoria ou veículo com ticket já em aberto.
- Cálculo automático do tempo de permanência e do valor a pagar considerando:
  - **Tolerância de 15 minutos** descontados uma única vez antes do arredondamento de horas.
  - **Regra de Diária:** aplicada automaticamente quando o cálculo por hora atinge ou ultrapassa o valor da diária.
  - **Regra de Pernoite:** tarifa fixa especial para entradas entre `22:00` e `23:59` com saída até `06:00` do dia seguinte.

### 💳 Pagamentos e Finalização (RF24 – RF32)
- Suporte às formas de pagamento **PIX**, **Dinheiro** e **Cartão**.
- Cálculo automático de troco para pagamentos em dinheiro.
- Encerramento de ticket e liberação imediata da vaga após confirmação do pagamento.

### 💰 Controle de Caixa (RF33 – RF39)
- Abertura e fechamento de turno vinculados ao operador autenticado.
- Registro de **Sangrias** (retiradas com justificativa) e **Reforços** (suprimentos de troco com descrição).
- Consolidação de saldo e resumo por forma de pagamento no fechamento.

### 📈 Relatórios e Faturamento (RF40 – RF43)
- Consulta de faturamento total e discriminado por forma de pagamento (`Dinheiro`, `PIX` e `Cartão`).
- Filtro de movimentações por período (`Data Início` e `Data Fim`).
- Histórico completo de entradas, saídas e status dos tickets.

---

## 🛠️ Tecnologias Utilizadas

- **React** (Create React App)
- **React Router DOM** (roteamento e proteção de rotas por perfil)
- **Axios** (consumo da base estruturada em JSON)
- **Bootstrap / Bootswatch** & **Material UI (`@mui/material`)** (estilização e componentes de interface)
- **LocalStorage** (persistência das operações em sessão no navegador)

---

## 📁 Estrutura do Projeto

```text
├── public/
│   └── db.json
├── src/
│   ├── components/
│   │   ├── card.js
│   │   ├── form-group.js
│   │   ├── navbar.js
│   │   └── navbarItem.js
│   ├── views/
│   │   ├── login.js
│   │   ├── dashboard.js
│   │   ├── listagem-tickets.js
│   │   ├── cadastro-tickets.js
│   │   ├── listagem-pagamentos.js
│   │   ├── cadastro-pagamentos.js
│   │   ├── listagem-caixa.js
│   │   ├── cadastro-caixa.js
│   │   ├── cadastro-sangria.js
│   │   ├── cadastro-reforco.js
│   │   ├── listagem-categorias.js
│   │   ├── cadastro-categorias.js
│   │   ├── listagem-usuarios.js
│   │   ├── cadastro-usuarios.js
│   │   └── relatorios.js
│   ├── rotas.js
│   └── App.js
└── package.json
