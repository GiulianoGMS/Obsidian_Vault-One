---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
  - "[[DQL-Oracle]]"
Squads:
  - "[[Pricing]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Validade]]"
  - "[[Controle de Datas]]"
  - "[[Rebaixa]]"
Project: "[[Controle de Datas]]"
tags:
  - Projects
---

Sistema de rebaixa automática de preço para produtos próximos ao vencimento. O gerente de [[Loja]] ou o sistema legado registra os itens com data de validade e quantidade a retirar — a rotina converte isso em [[Promoção]] no [[ERP]], gerando etiqueta de desconto no [[PDV]].

---

## Arquitetura — Duas Origens

O projeto integra dois sistemas distintos com fluxos separados de replicação:

```
SATELITSKY (legado)                         App Gestão de Lojas (DW)
        │                                              │
 PRODUTO_VENCIMENTO@SATELITSKY            NAGV_APP_DATAVALIDADE@CONSINCODW
        │                                              │
 NAGV_BASE_MRL_PROMOCESPECIAL2            NAGV_BASE_MRL_PROMOCESPECIAL_APP
        │                                    (exceto Frios e Laticínios)
        └──────────────┬────────────────────────┘
                       ↓
             NAGP_REP_CONTROLEDATAS              NAGP_REP_CONTROLEDATAS_APP
             (MERGE — sem duplicar)              (INSERT com NOT EXISTS)
                       │                                    │
                       └──────────────┬─────────────────────┘
                                      ↓
                          MRL_PROMOCESPECIALHIST
                          (Etiqueta Rosa — Promoção Especial)
                          
        Frios e Laticínios (App) — não aceitam etiqueta rosa:
        NAGP_REP_CONTROLEDATAS_APP_PROMOC        ← uma promoção por item (avulso)
        NAGP_REP_CONTROLEDATAS_APP_PROMOC_AGRUP  ← uma promoção por loja/dia (agrupado)
                       ↓
        MRL_PROMOCAO + MRL_PROMOCAOITEM
        (Promoção normal — grupo 10 "CDV LJ")
```

---

## Objetos

| Objeto                              | Tipo      | Origem     | Descrição                                                                                                                                             |
| ----------------------------------- | --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NAGV_BASE_MRL_PROMOCESPECIAL2`     | View      | SATELITSKY | Lê `PRODUTO_VENCIMENTO@SATELITSKY`; converte EAN → PLU via MAP_PRODCODIGO; filtra vencimento entre hoje e +100 dias, sem recusa, com preço de rebaixa |
| `NAGV_BASE_MRL_PROMOCESPECIAL_APP`  | View      | App DW     | Lê `NAGV_APP_DATAVALIDADE@CONSINCODW`; exclui Frios e Laticínios; calcula preço com desconto por categoria; apenas lojas habilitadas                  |
| `NAGV_APURACAO_SELLOUT_VALIDADE`    | View      | ERP        | Apuração de [[Sellout]] durante o período de rebaixa — cruza `MRL_PROMOCESPECIALHIST` com vendas do PDV                                               |
| `NAGP_REP_CONTROLEDATAS`            | Procedure | ERP        | MERGE da origem SATELITSKY → `MRL_PROMOCESPECIALHIST`; idempotente pela chave produto + empresa + acesso especial + preço + data fim                  |
| `NAGP_REP_CONTROLEDATAS_APP`        | Procedure | ERP        | INSERT da origem App DW → `MRL_PROMOCESPECIALHIST`; deduplicação por NOT EXISTS; gera EAN de acesso via `NAG_GERA_EAN13_AUTO`                         |
| ..._APP_PROMOC_AGRUP`               | Procedure | ERP        | Frios e Laticínios — gera `MRL_PROMOCAO` + `MRL_PROMOCAOITEM` agrupando todos os itens do dia em uma única promoção por loja (grupo 10 "CDV LJ")      |
| `NAGP_REP_CONTROLEDATAS_APP_PROMOC` | Procedure | ERP        | Frios e Laticínios — versão avulsa; gera uma promoção separada por item                                                                               |

---

## Regras de Negócio

### 1. Separação por Categoria

| Categoria | Destino | Motivo |
|-----------|---------|--------|
| Todos (exceto Frios e Laticínios) | `MRL_PROMOCESPECIALHIST` | Suporta etiqueta rosa com acesso especial (EAN) |
| Frios e Laticínios | `MRL_PROMOCAO` + `MRL_PROMOCAOITEM` | Não pode colar etiqueta rosa — gera [[Promoção]] normal no ERP |

#### 2. Cálculo do Preço Promocional (Frios e Laticínios)

O preço da [[Promoção]] para Frios e Laticínios é calculado mantendo no mínimo **10% de margem** sobre o custo líquido da empresa:

```
Preço Promocional =
  ROUND(
    TRUNC(
      CustoLíquido /
      (1 - ((PreçoNormal - CustoLíquido - (Margem% × PreçoNormal)) / PreçoNormal) - 0.10)
    , 1) + 0.08
  , 2)
```

- Margem% extraída de `MAXV_MGMBASEPRODSEG` (margem base do segmento)  
- Arredondamento: trunca na primeira casa decimal e soma 0.08 → resultado termina em x.x8  
- Se o preço calculado **superar o preço vigente**, o item é inserido com `STATUS = 'I'` (Inativo) para revisão manual

#### 3. Cálculo do Preço (App — demais categorias)

Via `NAGV_BASE_MRL_PROMOCESPECIAL_APP`:

```
Preço Rebaixa = ROUND(TRUNC(PreçoNormal - (% Desconto da Categoria × PreçoNormal), 1) + 0.09, 2)
```

- Percentual de desconto configurado por categoria em `NAGV_DESCCATEG_DATA_APP`  
- Resultado termina em x.x9 (ex.: R$ 4,99)

#### 4. Promoção para Frios e Laticínios — Avulsa vs Agrupada

Ambas as procedures geram [[Promoção]] normal no ERP para categorias que não aceitam etiqueta rosa.

**Avulsa** (`NAGP_REP_CONTROLEDATAS_APP_PROMOC`): cria uma promoção por item — nome inclui produto e data de validade (`CDV Avulsa{NN} - Ate DD/MM/YYYY - {produto}`).

**Agrupada** (`NAGP_REP_CONTROLEDATAS_APP_PROMOC_AGRUP`): cria **uma única capa de promoção por loja por dia**:

- Reutiliza `SEQPROMOCAO` já criado no dia (via `NAGV_APP_DATAVALIDADE_CONTROLE@CONSINCODW`) se existir  
- Nome da promoção: `CDV LJ{NN} De DD/MM/YY Ate DD/MM/YY`  
- Itens não são inseridos se já existe promoção do grupo 10 para o mesmo produto × loja × data fim  
- Após inserção: registra em `NAGT_CONTROLE_VALIDADE_INS@CONSINCODW` para controle de auditoria

#### 5. Filtros e Segurança

- SATELITSKY: ignora itens com `FL_RECUSADO = 1`, `PRECO_REBAIXA = 0` ou `JUSTIFICATIVA` preenchida  
- App: verifica estoque mínimo (`ESTQLOJA >= QTDE_REBAIXA`) antes de criar [[Promoção]]  
- App: controle de lojas habilitadas explicitamente na view  
- Deduplicação: `NOT EXISTS` por produto × empresa × preço × datas antes de qualquer INSERT

---

#### Etiqueta de Validade

A [[Etiqueta de Validade|etiqueta]] gerada é **dupla** — duas cópias lado a lado na mesma folha. Cada face exibe descrição, preço de rebaixa, EAN especial (gerado por `NAG_GERA_EAN13_AUTO`), PLU, data de impressão e data de validade.

A emissão é controlada pela view `MRLV_PROMOCAOESPECIAL`, que divide a quantidade solicitada por 2 (CEIL) e rastreia o que já foi impresso via `QTDEETIQEMITIDA`. O layout físico e o mapeamento dos campos são parametrizados no [[Software de Integração]].

→ [[Pricing - Controle de Validade - Layout Etiqueta]]

---

#### Relatórios e Consultas

| Arquivo                          | Finalidade                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Pre_Ext Data Validade.sql`      | Extração detalhada de itens em rebaixa — filtro por [[Fornecedor]], [[Comprador]], status, período de vencimento |
| `Pre_Ext Validade Agrupados.sql` | Agrupado por mês/[[Fornecedor]] — usado para análise de volume                                                   |
| `Pre_Sellout Data Validade.sql`  | Apuração de [[Sellout]] — cruza vendas do [[PDV]] com promoções ativas para medir resultado da rebaixa           |

---

#### Tabelas Principais

| Tabela | Banco | Uso |
|--------|-------|-----|
| `PRODUTO_VENCIMENTO` | SATELITSKY | Origem legada — produtos próximos ao vencimento cadastrados pelo operador |
| `NAGV_APP_DATAVALIDADE` | CONSINCODW (DW) | Origem App — registros do gerente de [[Loja]] via aplicativo |
| `NAGV_APP_DATAVALIDADE_CONTROLE` | CONSINCODW (DW) | View de controle — flags `PROD_INSERIDO` e `IND_INSERE_PROMO` |
| `NAGT_CONTROLE_VALIDADE_INS` | CONSINCODW (DW) | Log de inserções (tipo 'P' = [[Promoção]]) |
| `NAGT_REBAIXA_AVULSA` | CONSINCODW (DW) | Controle de processamento avulso — `IND_PROCESSADO = 'S'` após inserção |
| `MRL_PROMOCESPECIALHIST` | ERP | Destino promoções especiais — etiqueta rosa com [[EAN]] de acesso especial |
| `MRL_PROMOCAO` / `MRL_PROMOCAOITEM` | ERP | Destino promoções normais — Frios e Laticínios |
| `NAGV_DESCCATEG_DATA_APP` | ERP | Configuração de percentual de desconto por [[Família]] / categoria |

---

#### Pendências — Novas Melhorias (Controle de Datas)

> [!todo] Backlog aberto em 2026-09-01
> Melhorias solicitadas para o [[Controle de Datas]]. Itens **1** e **2** dependem de cotação da **TOTVS Consinco** (customização de sistema); os demais são ajustes de regra/tela/rotina.

**Progresso**

- [ ] **1.** Busca por período respeitando data de vencimento — *(cotação TOTVS Consinco)*
- [ ] **2.** Exibir Usuário de Inclusão (Loja) e Usuário de Liberação (Price) — *(cotação TOTVS Consinco)*
- [x] **3.** Ocultar seções não rebaixadas em "Pendentes de Aprovação"
- [ ] **4.** Incluir lojas ausentes na Promoção Especial por Códigos Específicos (Empresa)
- [ ] **5.** Relatório semanal automático de produtos baixados (e-mail)
- [ ] **6.** Destaque visual para "Nova Rebaixa" (relançamento do mesmo item)
- [ ] **7.** Liberação automática de ofertas por estoque/prazo

---

##### 1. Busca por período respeitando data de vencimento — *(cotação TOTVS Consinco)*

Solicitar à **TOTVS Consinco** a cotação para customização da funcionalidade de **busca por período**. A busca deve respeitar a **data inicial / final de vencimento** e retornar **apenas os produtos dentro do período informado**.

- **Exemplo:** ao informar data fim `30/07`, não devem aparecer produtos com vencimento posterior a essa data.
- **Status:** aguardando cotação TOTVS.

##### 2. Exibir Usuário de Inclusão e Usuário de Liberação — *(cotação TOTVS Consinco)*

Solicitar à **TOTVS Consinco** a cotação para customização exibindo:

- **Usuário Inclusão (Loja)** — quem cadastrou a rebaixa.
- **Usuário Liberou (Price)** — quem liberou a oferta.
- **Status:** aguardando cotação TOTVS.

##### 3. Ocultar seções não rebaixadas em "Pendentes de Aprovação" — ✅ Aplicado

Na tela **"Pendentes de Aprovação"**, **não** devem ser exibidos os itens das seções abaixo, pois não são rebaixados no Controle de Datas.

**Ajuste aplicado na view `NAGV_BASE_MRL_PROMOCESPECIAL_APP`** — filtro por `CATEGORIAN1` (tabela `NAGV_DESCCATEG_DATA_APP`, alias `C`):

```sql
C.CATEGORIAN1 NOT IN ('FRIOS E LATICINIOS', 'AÇOUGUE', 'ACOUGUE', 'PADARIA', 'ROTISSERIE', 'PEIXARIA')
```

Categorias filtradas (não retornadas pela view):

- Frios e Laticínios
- Açougue *(grafias `AÇOUGUE` e `ACOUGUE`)*
- Padaria
- Rotisserie
- Peixaria

##### 4. Incluir lojas ausentes na Promoção Especial por Códigos Específicos (Empresa)

Na **Promoção Especial por Códigos Específicos — Empresa**, ao buscar por loja, as seguintes lojas **não estão sendo exibidas** e devem ser incluídas:

`06`, `07`, `08`, `09`, `58`, `59`, `60`, `61`, `62`

##### 5. Relatório semanal automático de produtos baixados (e-mail)

Implementar o **envio automático** de um **relatório semanal**, por e-mail, contendo a relação dos **produtos baixados**.

- **Destinatários:** compradores.
- **Frequência:** uma vez por semana, de forma automática.

##### 6. Destaque visual para "Nova Rebaixa" (relançamento do mesmo item)

Quando a loja **relançar o mesmo item** no Controle de Datas, aplicar um **destaque visual** para as solicitações de **Nova Rebaixa** — cor diferenciada ou símbolo (ex.: asterisco `*`) — para facilitar identificação e priorização na tela.

- **Critério de identificação:** mesma **Descrição** **e** mesmo **Vencimento** de produto já rebaixado.

##### 7. Liberação automática de ofertas por estoque/prazo

Configurar o Controle de Datas para **liberar automaticamente** as ofertas quando:

- Estoque do produto **≤ 50 unidades**, **e**
- No **máximo 30 dias** antes do vencimento.

**Exceções (liberação permanece manual):** os produtos/categorias abaixo seguem o processo atual (liberação manual):

| Produto / Fórmula | Categoria |
| ----------------------------- | ---------------------------------- |
| Sustagen | Básicos e Matinais → N2.Commodities |
| Arroz | Básicos e Matinais → N2.Matinais |
| Feijão | Commodities → N2.Commodities |
| Leite em Pó | Commodities → N2.Commodities |
| Leite Longa Vida (Geral) | Básicos e Matinais → N2.Commodities |
| Azeite | Básicos e Matinais → N2.Commodities |
| Óleo | Básicos e Matinais → N2.Commodities |
| Leite Condensado (Geral) | Commodities → N2.Commodities |
| Creme de Leite | Básicos e Matinais → N2.Confeitaria |
| Café em Pó (Geral) | Básicos e Matinais → N2.Confeitaria |
| — | Básicos e Matinais → N2.Commodities |

