---
Language:
  - "[[SQL]]"
Repository:
  - "[[Falconi_Bases]]"
Squads:
  - "[[TI]]"
  - "[[Comercial]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Extração CSV]]"
  - "[[BI]]"
  - "[[Estoque]]"
  - "[[Vendas]]"
Date: 2026-09-03
Type:
tags:
  - Projects
---


> [!info] Referência
> [GiulianoGMS/Falconi_Bases](https://github.com/GiulianoGMS/Falconi_Bases)

---

## Contexto

Extração de bases de dados para a consultoria **Falconi**, geradas via [[UTL_FILE]] em CSV. Duas bases independentes — [[Estoque]] e [[Vendas]]/Compras — consultadas a partir do banco de [[BI]] via DBLink (`@bi`). Um script auxiliar atualiza a forma de arredondamento de sugestão de abastecimento (`FORMAARREDSUGABAST`) em `MRL_PRODUTOEMPRESA` com base em uma tabela de staging importada pelo time Falconi.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `NAGV_FALCONI_EXTESTOQUE_BASE01` | View | Estoque consolidado por produto/data — consulta `fato_estoque@bi` |
| `NAGP_FALCONI_EXT_EST_BASE01` | Procedure | Exporta BASE01 para CSV por período |
| `NAGV_FALCONI_EXTVENDA_BASE56` | View | Vendas + Compras por produto/loja/data — UNION ALL de `fatog_vendadia@bi` e `fato_compra@bi` |
| `NAGP_FALCONI_EXT_VENDAS_BASE56` | Procedure | Exporta BASE56 para CSV por período |
| `FL_AltFormaMedida_MRL_PRODUTOEMPRESA.sql` | Script | Atualiza `FORMAARREDSUGABAST` em `MRL_PRODUTOEMPRESA` a partir de `NAGT_FALC_ALTPRODEMPRESA` |
| `NAGT_FALC_ALTPRODEMPRESA` | Tabela staging | Recebe os dados importados via TEXT IMPORTER do PL/SQL Developer |
| `GLN_LOG_PROCESSO_LOOP` | Tabela | Log de progresso do script de atualização (MERGE a cada 1000 linhas) |

---

## BASE01 — Estoque

### View — `NAGV_FALCONI_EXTESTOQUE_BASE01`

Consulta `fato_estoque@bi` consolidando estoque por produto e data. Filtra apenas registros com `QTDESTOQUE <> 0`.

**Fontes BI:**

| Tabela | Join | Dados |
|---|---|---|
| `fato_estoque@bi` | base | Quantidades e custo bruto por data |
| `dim_produto@bi` | `SEQPRODUTO` | Descrição do produto |
| `dim_categoria@bi` | `SEQFAMILIA` | Hierarquia de categoria (5 níveis) |

**Colunas exportadas (22):**

| Coluna | Descrição |
|---|---|
| `DATA` | Data do estoque (`DD/MM/YYYY`) |
| `SEQPRODUTO` | Código do produto |
| `PRODUTO` | Descrição do produto |
| `CATEGORIA_NVL_01` a `CATEGORIA_NVL_05` | Hierarquia de categoria — 5 níveis |
| `QTD_ESTOQUE` | Estoque total |
| `ESTOQUE_LOJA` | Estoque em loja |
| `ESTOQUE_DEPOSITO` | Estoque em depósito |
| `ESTOQUE_TROCA` | Estoque em troca |
| `ESTOQUE_ALMOXARIFADO` | Estoque em almoxarifado |
| `ESTOQUE_OUTROS` | Outros estoques |
| `ESTOQUE_TERECEIROS` | Estoque em terceiros |
| `VLR_ESTOQUE` | Valor total do estoque (`qtd × custo bruto`) |
| `VLR_ESTOQUE_LOJA` a `ESTOQUE_TERECEIROS_VLR` | Valor por tipo de estoque |

> Valores formatados com `FM999G999G999D90` (separador `,` decimal, `.` milhar).

### Procedure — `NAGP_FALCONI_EXT_EST_BASE01`

| Item | Detalhe |
|---|---|
| Parâmetros | `vsDtaInicial DATE`, `vsDtaFinal DATE`, `vsAgrupamento VARCHAR2` |
| `vsAgrupamento` | Tipo de agrupamento da extração (ex: `'M'` = mensal) |
| Diretório Oracle | `FALCONI` |
| Arquivo gerado | `Ext_Falconi_Estoque.csv` |
| Separador | `;` |
| Cabeçalho | Gerado dinamicamente via `ALL_TAB_COLUMNS` (exclui `DTAFILTRO`) |
| Buffer | CLOB de 32 KB — grava em chunks para volumes grandes |

---

## BASE56 — Vendas e Compras

### View — `NAGV_FALCONI_EXTVENDA_BASE56`

UNION ALL de dois blocos do BI: vendas (`fatog_vendadia`) e compras (`fato_compra`), consolidados por produto/loja/data.

**Blocos:**

| Bloco | Tabela BI | Filtro `CODGERALOPER` |
|---|---|---|
| Vendas | `fatog_vendadia@bi` + `dim_produto@bi` | `37, 48, 123, 610, 613, 615, 810, 910, 911, 916` |
| Compras | `fato_compra@bi` + `dim_produto@bi` | `1, 121, 200, 900, 928` |

**Colunas exportadas (14):**

| Coluna | Descrição |
|---|---|
| `ANO` / `MES` | Ano e mês da operação |
| `DATA` | Data da operação (`DD/MM/YYYY`) |
| `SEGMENTO` | `E-commerce` (segmentos 5 e 8) ou `Loja` |
| `LOJA` | Número da empresa (`NROEMPRESA`) |
| `SEQPRODUTO` / `PRODUTO` | Código e descrição do produto |
| `VLR_VENDA` / `QTD_VENDA` | Valor e quantidade de vendas |
| `VLR_COMPRA` / `QTD_COMPRA` | Valor e quantidade de compras |
| `MarkDown` | Margem bruta: `((VLR_VENDA − Custo Bruto) / VLR_VENDA) × 100`, arredondado em 2 casas |
| `LUCRATIVIDADE` | `VLR_VENDA − custo líquido − impostos − despesas − comissão − verbas` |
| `VLR_PROMOCAO` | Valor de promoções aplicadas |

> Colunas do bloco Compras que não existem em Vendas (`VLR_VENDA`, `QTD_VENDA`, `CUSTO_BRUTO`, `LUCRATIVIDADE`, `VLR_PROMOCAO`) retornam `NULL` e vice-versa — NVL aplicado na query externa.

### Procedure — `NAGP_FALCONI_EXT_VENDAS_BASE56`

| Item | Detalhe |
|---|---|
| Parâmetros | `vsDtaInicial DATE`, `vsDtaFinal DATE` |
| Diretório Oracle | `FALCONI` |
| Arquivo gerado | `Ext_Falconi_Vendas.csv` |
| Separador | `;` |
| Cabeçalho | Gerado dinamicamente via `ALL_TAB_COLUMNS` (exclui `DATA_FILTRO`) |
| Buffer | CLOB de 32 KB — grava em chunks |

---

## Script Auxiliar — Atualização de Forma de Medida

**Arquivo:** `FL_AltFormaMedida_MRL_PRODUTOEMPRESA.sql`

Atualiza o campo `FORMAARREDSUGABAST` em `MRL_PRODUTOEMPRESA` com os valores enviados pela Falconi.

### Fluxo

```
Falconi envia planilha com SEQPRODUTO, NROEMPRESA, FORMA
         │
         ▼
Importar via TEXT IMPORTER (PL/SQL Developer)
→ NAGT_FALC_ALTPRODEMPRESA
         │
         ▼
Script FL_AltFormaMedida...
│  FOR cada linha onde FORMA != FORMAARREDSUGABAST atual
│    UPDATE MRL_PRODUTOEMPRESA SET FORMAARREDSUGABAST = FORMA
│    COMMIT a cada 1000 linhas
│    MERGE em GLN_LOG_PROCESSO_LOOP (log de progresso)
└  COMMIT final
```

### Consulta de progresso (durante execução)

```sql
SELECT * FROM GLN_LOG_PROCESSO_LOOP WHERE MENSAGEM = 'TOTAL_ALTERADO';
```

---

## Chamada das Extrações

```sql
-- Estoque ('M' = agrupamento mensal)
BEGIN
  NAGP_FALCONI_EXT_EST_BASE01(DATE '2026-01-01', DATE '2026-08-31', 'M');
END;

-- Vendas
BEGIN
  NAGP_FALCONI_EXT_VENDAS_BASE56(DATE '2026-01-01', DATE '2026-08-31');
END;
```

Os arquivos são gerados no diretório Oracle `FALCONI` no servidor de banco de dados.
