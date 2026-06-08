# Documentação do Sistema — Cadastro e Monitoramento Geográfico de Pacientes
**InfoBio — Sistemas de Informação**

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura e Tecnologias](#2-arquitetura-e-tecnologias)
3. [Entidades de Dados e Relacionamentos](#3-entidades-de-dados-e-relacionamentos)
4. [Classificação dos Dados](#4-classificação-dos-dados)
5. [Fluxo de Dados — Entradas, Processamento e Saídas](#5-fluxo-de-dados--entradas-processamento-e-saídas)
6. [Endpoints da API](#6-endpoints-da-api)
7. [Painéis, Relatórios e Alertas Produzidos](#7-painéis-relatórios-e-alertas-produzidos)
8. [Serviços Externos](#8-serviços-externos)
9. [Mecanismos de Feedback ao Usuário](#9-mecanismos-de-feedback-ao-usuário)
10. [Diagrama Resumido do Fluxo](#10-diagrama-resumido-do-fluxo)

---

## 1. Visão Geral do Sistema

O sistema é uma aplicação web voltada para **unidades básicas de saúde (UBS)**, desenvolvida para realizar o cadastro e o monitoramento geográfico de pacientes com condições crônicas e de risco (diabetes, hipertensão e gravidez). A UBS de referência é a **Passo das Pedras I**, localizada em Porto Alegre – RS.

**Objetivos principais:**
- Manter o cadastro atualizado de pacientes e suas condições de saúde.
- Visualizar a distribuição geográfica dos pacientes em mapa interativo.
- Identificar e alertar sobre pacientes que estão há mais de 3 meses sem consulta.
- Apresentar indicadores de acompanhamento e distribuição por condição no painel de controle (dashboard).

---

## 2. Arquitetura e Tecnologias

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (Cliente)                       │
│                                                                  │
│   React 19 + Next.js 15   │   Tailwind CSS   │   React-Leaflet  │
│   Lucide React (ícones)   │   localStorage   │   OpenStreetMap  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / Next.js API Routes
┌───────────────────────────▼─────────────────────────────────────┐
│                     SERVIDOR (Next.js — Node.js)                 │
│                                                                  │
│   /api/auth      /api/patients      /api/streets                 │
│   bcryptjs (hash de senhas)         Geoapify (geocodificação)    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Supabase JS SDK
┌───────────────────────────▼─────────────────────────────────────┐
│                  BANCO DE DADOS — Supabase (PostgreSQL)          │
│                                                                  │
│   pacientes │ enderecos │ ruas │ usuarios                        │
└─────────────────────────────────────────────────────────────────┘
```

| Camada | Tecnologia | Função |
|---|---|---|
| Frontend | Next.js 15 / React 19 | Interface do usuário, abas, formulários, mapa |
| Estilização | Tailwind CSS v4 | Layout e estilos responsivos |
| Mapa | React-Leaflet + Leaflet 1.9 | Visualização geográfica dos pacientes |
| Ícones | Lucide React | Ícones de interface |
| Backend | Next.js API Routes | Endpoints REST para CRUD e autenticação |
| Banco de dados | Supabase (PostgreSQL) | Persistência de todos os dados estruturados |
| Geocodificação | Geoapify API | Conversão de endereço em coordenadas geográficas |
| Autenticação | bcryptjs | Hash e verificação de senhas |
| Sessão | localStorage | Persistência de sessão do usuário no navegador |

---

## 3. Entidades de Dados e Relacionamentos

### Modelo de Dados

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────────┐
│   usuarios   │       │     pacientes     │       │    enderecos     │
│──────────────│       │───────────────────│       │──────────────────│
│ id (PK)      │       │ id (PK)           │       │ id (PK)          │
│ usuario      │       │ nome              │  FK   │ rua_id ──────────┼──┐
│ senha_hash   │       │ condicao          │◄──────┤ endereco_id       │  │
│ nome_completo│       │ ultima_consulta   │       │ numero           │  │
│ ultimo_acesso│       │ ativo (bool)      │       │ complemento      │  │
└──────────────┘       └───────────────────┘       │ latitude         │  │
                                                   │ longitude        │  │
                                                   │ coordenadas_dms  │  │
                                                   └──────────────────┘  │
                                                                         │
                                                   ┌──────────────────┐  │
                                                   │      ruas        │  │
                                                   │──────────────────│  │
                                                   │ id (PK)          │◄─┘
                                                   │ nome             │
                                                   │ nome_normalizado │
                                                   │ tipo_logradouro  │
                                                   └──────────────────┘
```

### Descrição das Entidades

#### `pacientes`
Armazena os dados clínicos e de identificação dos pacientes.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer (PK) | Identificador único |
| `nome` | text | Nome completo do paciente |
| `condicao` | text | Condição de saúde: `diabetico`, `hipertenso` ou `gravidez` |
| `ultima_consulta` | date | Data da última consulta registrada |
| `endereco_id` | integer (FK) | Referência ao endereço do paciente |
| `ativo` | boolean | Controle de exclusão lógica (soft delete) |

#### `enderecos`
Armazena a localização física e geográfica de cada endereço cadastrado.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer (PK) | Identificador único |
| `rua_id` | integer (FK) | Referência à rua |
| `numero` | text | Número do imóvel |
| `complemento` | text (nullable) | Apartamento, bloco, etc. |
| `latitude` | float | Latitude obtida via geocodificação |
| `longitude` | float | Longitude obtida via geocodificação |
| `coordenadas_dms` | text | Formato geográfico DMS — ex: `30°01'01.0"S 51°07'30.0"W` |

#### `ruas`
Catálogo de vias disponíveis para cadastro, pertencentes à área de cobertura da UBS.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer (PK) | Identificador único |
| `nome` | text | Nome da rua como exibido |
| `nome_normalizado` | text | Nome sem acentos e em minúsculas (para busca) |
| `tipo_logradouro` | text | Tipo: Rua, Avenida, Travessa, etc. |

#### `usuarios`
Usuários com acesso ao sistema.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | integer (PK) | Identificador único |
| `usuario` | text | Login (nome de usuário) |
| `senha_hash` | text | Senha criptografada com bcrypt |
| `nome_completo` | text | Nome completo para exibição |
| `ultimo_acesso` | timestamp | Data/hora do último login bem-sucedido |

### Relacionamentos

- `pacientes` → `enderecos`: N:1 — um paciente tem um endereço; o mesmo endereço pode ser compartilhado por múltiplos pacientes.
- `enderecos` → `ruas`: N:1 — um endereço pertence a uma rua; uma rua pode ter vários números.
- `usuarios` é independente das demais entidades (somente para autenticação).

---

## 4. Classificação dos Dados

### Dados Estruturados
Todos os dados armazenados no banco PostgreSQL (Supabase) são **estruturados**, com esquema fixo, tipos definidos e relacionamentos declarados via chaves estrangeiras:

- Tabelas `pacientes`, `enderecos`, `ruas` e `usuarios`
- Datas armazenadas no formato ISO `yyyy-mm-dd`
- Coordenadas geográficas como valores numéricos (`float8`)
- Campo `condicao` com domínio controlado: `diabetico | hipertenso | gravidez | NULL`

### Dados Semiestruturados
Ocorrem nas camadas de transporte e na interface:

| Origem | Descrição |
|---|---|
| **Respostas da API REST** | JSON retornado por todos os endpoints (`/api/patients`, `/api/auth`, etc.) com campos definidos mas sem esquema rígido |
| **Sessão no localStorage** | Objeto JSON `{ id, usuario, nome_completo }` persistido no navegador — sem validação de schema em tempo de execução |
| **Resposta da Geoapify** | GeoJSON com estrutura `{ features: [{ geometry: { coordinates: [...] }, properties: { formatted: "..." } }] }` — semiestruturado pois pode vir com campos opcionais ou ausentes dependendo da qualidade do endereço |
| **Campo `coordenadas_dms`** | String formatada como `30°01'00.0"S 51°07'00.0"W` — dado geográfico em formato textual padronizado, mas não normalizado em colunas separadas |

### Dados Não Estruturados
O sistema atual **não armazena ou processa dados não estruturados** (imagens, documentos, áudio, texto livre). Caso o sistema evolua para incluir prontuários, laudos ou fotos de pacientes, essa categoria passaria a ser relevante.

---

## 5. Fluxo de Dados — Entradas, Processamento e Saídas

### 5.1 Autenticação

```
ENTRADA                  PROCESSAMENTO                      SAÍDA
────────                 ─────────────────                  ──────
usuario (texto)    →     Busca usuário no BD           →    Sessão salva no localStorage
senha (texto)            Compara senha com bcrypt hash       Redirecionamento para /pacientes
                         Atualiza ultimo_acesso              OU mensagem de erro (401)
```

**Regras de negócio:**
- Senha nunca trafega ou é armazenada em texto puro — somente o hash bcrypt.
- A sessão é mantida apenas no `localStorage` do navegador (sem cookie ou JWT).
- O sistema não possui expiração automática de sessão.

---

### 5.2 Cadastro de Paciente (POST)

```
ENTRADA                         PROCESSAMENTO                          SAÍDA
────────                        ─────────────────────────────          ──────
nome (texto)              →     1. Validação dos campos obrig.  →      Novo registro em `pacientes`
condição (select)               2. Normaliza nome da rua               Novo registro em `enderecos`
rua (dropdown/busca)            3. Busca rua_id na tabela `ruas`       (se endereço for novo)
número (texto)                  4. Verifica se endereço já existe       
complemento (opcional)          5. Se NÃO existe:                      Toast: "Paciente adicionado"
data da última consulta            → Chama Geoapify API                Mapa atualizado com novo pin
                                   → Valida coordenadas (bbox RS)      Contador de pacientes atualizado
                                   → Converte para DMS
                                   → Insere em `enderecos`
                                6. Converte data dd/mm/yyyy → ISO
                                7. Insere em `pacientes`
```

**Validações aplicadas:**
- Campos obrigatórios: nome, rua, número, data da última consulta.
- Coordenadas validadas dentro do bounding box de Porto Alegre: lat entre `-30.2` e `-29.9`, lng entre `-51.3` e `-51.0`.
- Se a geocodificação falhar ou retornar coordenadas fora da área, o cadastro é bloqueado com mensagem de erro.

---

### 5.3 Listagem de Pacientes (GET)

```
ENTRADA          PROCESSAMENTO                                   SAÍDA
────────         ─────────────────────────────────────          ──────
(nenhum)   →     JOIN: pacientes + enderecos + ruas        →    Array de pacientes formatados
                 WHERE ativo = true                              Exibição no mapa (pins coloridos)
                 ORDER BY nome ASC                               Lista para busca/filtro
                 Formata data: ISO → dd/mm/yyyy
```

**Dados retornados por paciente:**
`id`, `nomes`, `condicao`, `endereços` (nome da rua), `número`, `complemento`, `ultima_consulta` (dd/mm/yyyy), `lat`, `lng`

---

### 5.4 Edição de Paciente (PUT)

Fluxo idêntico ao cadastro (item 5.2), com a diferença de que executa `UPDATE` na tabela `pacientes` em vez de `INSERT`. Se o endereço for alterado para um não existente, o mesmo processo de geocodificação é acionado.

---

### 5.5 Exclusão de Paciente (DELETE)

```
ENTRADA              PROCESSAMENTO                   SAÍDA
────────             ─────────────────────          ──────
id do paciente  →    UPDATE ativo = false       →   Paciente removido da listagem e do mapa
                     (soft delete)                   Toast: "Paciente removido"
                                                     Dados preservados no banco
```

A exclusão é **lógica** (soft delete): o registro permanece no banco com `ativo = false` para preservar o histórico. Não há exclusão física.

---

### 5.6 Busca e Filtros (client-side)

```
ENTRADA                          PROCESSAMENTO (memória — sem chamada à API)    SAÍDA
────────                         ───────────────────────────────────────────    ──────
texto digitado na busca    →     Filtra array de pacientes já carregados    →   Lista filtrada
condições selecionadas           por nome, endereço, número                     Mapa atualizado
(diabético/hipertenso/           e/ou por condição de saúde                     com apenas os
gravidez)                                                                        pins filtrados
```

---

### 5.7 Cálculo do Dashboard (client-side)

Todos os indicadores do dashboard são calculados **no navegador**, sem nova chamada ao servidor, a partir dos dados já carregados.

```
ENTRADA                    PROCESSAMENTO                              SAÍDA (painel)
────────                   ─────────────────────────────────         ──────────────
Array de pacientes   →     daysSince(ultima_consulta) > 90    →      Lista de pacientes em alerta
(já em memória)            Ordenados por dias decrescentes           (ordenada por urgência)

                           Count por condição                →        KPI cards: totais e percentuais
                           (diabetico / hipertenso / gravidez)

                           % com consulta ≤ 90 dias          →        Taxa de acompanhamento (%)

                           Sort por data desc → slice(0,6)   →        Consultas recentes (últimos 6)
```

**Regra de urgência:**
| Dias sem consulta | Classificação | Visual |
|---|---|---|
| 91 – 180 dias (3 a 6 meses) | Atenção | Fundo âmbar, sem badge |
| > 180 dias (mais de 6 meses) | Urgente | Fundo vermelho, badge "Urgente" |

---

### 5.8 Envio de Lembrete (fake — simulado)

```
ENTRADA               PROCESSAMENTO                          SAÍDA
────────              ──────────────────────────────         ──────
Clique no botão  →    setTimeout(1.200ms)               →   Botão muda para "Enviado" (verde)
"Lembrete"            (simula chamada a API de SMS            Toast: "Lembrete enviado para [nome]"
                       ou WhatsApp — não implementada)        Estado persiste enquanto a sessão
                                                              estiver aberta
```

> **Nota:** O envio de mensagens é simulado. Uma implementação real exigiria integração com um serviço de mensageria (ex.: Twilio, Z-API para WhatsApp).

---

## 6. Endpoints da API

| Método | Rota | Entrada | Saída |
|---|---|---|---|
| `POST` | `/api/auth` | `{ usuario, senha }` | `{ success, data: { id, usuario, nome_completo } }` |
| `GET` | `/api/patients` | — | `{ success, data: Patient[] }` |
| `POST` | `/api/patients` | `{ nomes, condicao, endereços, número, complemento, ultima_consulta }` | `{ success, message, id }` |
| `PUT` | `/api/patients` | `{ id, nomes, condicao, endereços, número, complemento, ultima_consulta }` | `{ success, message }` |
| `DELETE` | `/api/patients?id=` | query param `id` | `{ success, message }` |
| `GET` | `/api/streets` | — | `{ success, data: Street[] }` |

Todos os endpoints retornam `{ success: false, message: "..." }` em caso de erro, com status HTTP correspondente (400, 401 ou 500).

---

## 7. Painéis, Relatórios e Alertas Produzidos

### 7.1 Aba — Cadastro de Pacientes

| Saída | Descrição |
|---|---|
| **Mapa interativo** | Visualização geográfica dos pacientes com pins coloridos por condição de saúde. Pin da UBS em laranja. Popup com nome, condição, endereço, data e botões de editar/excluir. |
| **Barra de busca** | Filtro em tempo real por nome, endereço ou número. |
| **Filtros por condição** | Botões toggle para exibir apenas diabéticos, hipertensos ou gestantes no mapa e na lista. |
| **Contador total** | Número de pacientes ativos cadastrados. |

**Legenda do mapa:**

| Cor do pin | Condição |
|---|---|
| Azul | Diabético |
| Vermelho | Hipertenso |
| Roxo | Gestante |
| Laranja | Unidade de Saúde (UBS) |

---

### 7.2 Aba — Dashboard

#### KPI Cards (indicadores-chave)

| Indicador | Cálculo | Alerta visual |
|---|---|---|
| **Total de pacientes** | `COUNT(pacientes WHERE ativo = true)` | Nenhum |
| **Sem consulta +3 meses** | `COUNT(pacientes WHERE daysSince(ultima_consulta) > 90)` | Âmbar quando > 0 / Verde quando = 0 |
| **Diabéticos** | Count + % sobre total | Azul |
| **Hipertensos** | Count + % sobre total | Vermelho |
| **Gestantes** | Count + % sobre total | Roxo |

#### Painel de Alertas — Pacientes sem consulta

- Lista todos os pacientes com mais de 90 dias sem consulta, ordenados do mais urgente para o menos urgente.
- Para cada paciente exibe: iniciais, nome completo, condição, data da última consulta e tempo decorrido em linguagem natural ("há 5 meses").
- Badge "Urgente" para pacientes com mais de 180 dias (6 meses).
- Botão "Lembrete" por paciente — muda para "Enviado" após acionado, com toast de confirmação.
- Quando não há alertas, exibe mensagem positiva "Todos em dia!".

#### Distribuição por Condição

- Barras de progresso horizontais mostrando a proporção de cada condição em relação ao total.
- Percentuais calculados dinamicamente.

#### Taxa de Acompanhamento

- Percentual de pacientes com consulta registrada nos últimos 3 meses.
- Barra de progresso com gradação de cor:
  - Verde: ≥ 70%
  - Âmbar: 50%–69%
  - Vermelho: < 50%

#### Consultas Recentes

- Lista das 6 consultas mais recentes registradas no sistema.
- Indicador visual de recência (ponto verde para a mais recente, azul para < 30 dias, âmbar para 30–60 dias, cinza para > 60 dias).

---

## 8. Serviços Externos

### Supabase (PostgreSQL)
- **Função:** banco de dados relacional principal e camada de acesso aos dados.
- **Autenticação:** chave anônima pública (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) para operações de leitura/escrita.
- **Dados trafegados:** todas as entidades do sistema.

### Geoapify Geocoding API
- **Função:** converte endereços textuais em coordenadas geográficas (latitude/longitude).
- **Quando é acionada:** apenas ao cadastrar ou editar um paciente com endereço ainda não geocodificado no banco.
- **Estratégia de fallback:** se a busca com número falhar, tenta busca genérica apenas com rua e bairro.
- **Validação pós-geocodificação:** coordenadas fora do bounding box de Porto Alegre são rejeitadas.
- **Configuração:** `GEOAPIFY_API_KEY` em variável de ambiente do servidor (nunca exposta ao cliente).
- **Dados trafegados:** endereço completo (rua, número, bairro "Passo das Pedras", cidade, estado, país) → retorna GeoJSON.

### OpenStreetMap (via TileLayer do Leaflet)
- **Função:** renderização dos tiles do mapa no navegador.
- **Dados trafegados:** apenas requisições de imagens de mapa (tiles), sem dados dos pacientes.

---

## 9. Mecanismos de Feedback ao Usuário

| Situação | Tipo de Feedback | Componente |
|---|---|---|
| Operação concluída com sucesso | Toast verde | `<Toast type="success">` |
| Erro de servidor ou validação | Toast vermelho | `<Toast type="error">` |
| Campo obrigatório não preenchido | Toast amarelo | `<Toast type="warning">` |
| Endereço não geocodificado | Toast vermelho com mensagem específica | `<Toast type="error">` |
| Ação destrutiva (excluir paciente) | Modal de confirmação | `<ConfirmationModal>` |
| Envio de lembrete | Spinner → botão verde "Enviado" + Toast | Estado local + `<Toast>` |
| Pacientes sem consulta urgente | Badge numérico vermelho na aba Dashboard | Tab badge |
| Nenhum alerta de atenção | Estado vazio com ícone verde "Todos em dia" | Inline state |
| Mapa carregando | Placeholder com texto "Carregando mapa..." | `next/dynamic` loading |

---

## 10. Diagrama Resumido do Fluxo

```
                        ┌─────────────────────────────────────────┐
                        │             USUÁRIO (navegador)          │
                        └────────────────┬────────────────────────┘
                                         │
              ┌──────────────────────────▼──────────────────────────┐
              │                    LOGIN                             │
              │  Entrada: usuario + senha                            │
              │  Processamento: bcrypt compare                       │
              │  Saída: sessão em localStorage ou erro               │
              └──────────────────────────┬──────────────────────────┘
                                         │ autenticado
              ┌──────────────────────────▼──────────────────────────┐
              │               PAINEL PRINCIPAL                       │
              │                                                      │
              │  ┌───────────────────┐   ┌────────────────────────┐ │
              │  │ Aba: Cadastro     │   │ Aba: Dashboard         │ │
              │  │                   │   │                        │ │
              │  │ Formulário        │   │ KPIs (5 cards)         │ │
              │  │  ↓                │   │ Lista de alertas       │ │
              │  │ API POST/PUT      │   │ Distribuição           │ │
              │  │  ↓                │   │ Taxa acompanhamento    │ │
              │  │ Geocodificação    │   │ Consultas recentes     │ │
              │  │ (Geoapify)        │   │                        │ │
              │  │  ↓                │   │ Botão "Lembrete"       │ │
              │  │ Supabase INSERT   │   │ (simulado)             │ │
              │  │                   │   │                        │ │
              │  │ Mapa (Leaflet)    │   │ [tudo calculado        │ │
              │  │ Busca + Filtros   │   │  client-side]          │ │
              │  └───────────────────┘   └────────────────────────┘ │
              └─────────────────────────────────────────────────────┘
                                         │
              ┌──────────────────────────▼──────────────────────────┐
              │               BANCO DE DADOS (Supabase)              │
              │                                                      │
              │  usuarios  ←  (autenticação)                         │
              │  ruas      ←  (catálogo de endereços)                │
              │  enderecos ←  (localização + coordenadas)            │
              │  pacientes ←  (dados clínicos + vínculo endereço)    │
              └─────────────────────────────────────────────────────┘
```

---

*Documentação gerada em junho de 2026 — Sistema desenvolvido para InfoBio Sistemas de Informação.*
