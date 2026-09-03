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
  - Integrations
---

> [!info] Referência
> [GiulianoGMS/Falconi_Bases](https://github.com/GiulianoGMS/Falconi_Bases)

---

## Contexto

Extração de bases para a consultoria **Falconi**, geradas via [[UTL_FILE]] em CSV. Duas bases independentes — [[Estoque]] e [[Vendas]]/Compras — consultadas a partir do banco de [[BI]] via DBLink (`@bi`).

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `NAGV_FALCONI_EXTESTOQUE_BASE01` | View | Estoque consolidado por produto/data — consulta `fato_estoque@bi` |
| `NAGP_FALCONI_EXT_EST_BASE01` | Procedure | Exporta BASE01 para CSV por período e agrupamento |
| `NAGV_FALCONI_EXTVENDA_BASE56` | View | Vendas + Compras por produto/loja/data — UNION ALL de `fatog_vendadia@bi` e `fato_compra@bi` |
| `NAGP_FALCONI_EXT_VENDAS_BASE56` | Procedure | Exporta BASE56 para CSV por período |

---

## BASE01 — Estoque

### View — `NAGV_FALCONI_EXTESTOQUE_BASE01`

Consulta `fato_estoque@bi` consolidando estoque por produto e data. Filtra apenas registros com `QTDESTOQUE <> 0`.

| Tabela BI | Dados |
|---|---|
| `fato_estoque@bi` | Quantidades e custo bruto por data |
| `dim_produto@bi` | Descrição do produto (`SEQPRODUTO`) |
| `dim_categoria@bi` | Hierarquia de categoria — 5 níveis (`SEQFAMILIA`) |

**Colunas exportadas (22):**

| Coluna | Descrição |
|---|---|
| `DATA` | Data do estoque (`DD/MM/YYYY`) |
| `SEQPRODUTO` | Código do produto |
| `PRODUTO` | Descrição do produto |
| `CATEGORIA_NVL_01` a `CATEGORIA_NVL_05` | Hierarquia de categoria |
| `QTD_ESTOQUE` | Estoque total |
| `ESTOQUE_LOJA` | Estoque em loja |
| `ESTOQUE_DEPOSITO` | Estoque em depósito |
| `ESTOQUE_TROCA` | Estoque em troca |
| `ESTOQUE_ALMOXARIFADO` | Estoque em almoxarifado |
| `ESTOQUE_OUTROS` | Outros estoques |
| `ESTOQUE_TERECEIROS` | Estoque em terceiros |
| `VLR_ESTOQUE` | Valor total (`qtd × custo bruto`) |
| `VLR_ESTOQUE_LOJA` a `ESTOQUE_TERECEIROS_VLR` | Valor por tipo de estoque |

> Valores formatados com `FM999G999G999D90` (separador `,` decimal, `.` milhar).

### Procedure — `NAGP_FALCONI_EXT_EST_BASE01`

| Item | Detalhe |
|---|---|
| Parâmetros | `vsDtaInicial DATE`, `vsDtaFinal DATE`, `vsAgrupamento VARCHAR2` |
| `vsAgrupamento` | Tipo de agrupamento (ex: `'M'` = mensal) |
| Diretório Oracle | `FALCONI` |
| Arquivo gerado | `Ext_Falconi_Estoque.csv` |
| Separador | `;` |
| Cabeçalho | Gerado dinamicamente via `ALL_TAB_COLUMNS` (exclui `DTAFILTRO`) |
| Buffer | CLOB de 32 KB — grava em chunks |

---

## BASE56 — Vendas e Compras

### View — `NAGV_FALCONI_EXTVENDA_BASE56`

UNION ALL de vendas (`fatog_vendadia@bi`) e compras (`fato_compra@bi`), consolidados por produto/loja/data.

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
| `MarkDown` | Margem bruta: `((VLR_VENDA − Custo Bruto) / VLR_VENDA) × 100` |
| `LUCRATIVIDADE` | `VLR_VENDA − custo líquido − impostos − despesas − comissão − verbas` |
| `VLR_PROMOCAO` | Valor de promoções aplicadas |

> Colunas exclusivas de cada bloco retornam `NULL` no bloco oposto — NVL aplicado na query externa.

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

## Chamada

```sql
BEGIN
  NAGP_FALCONI_EXT_EST_BASE01(DATE '2026-01-01', DATE '2026-08-31', 'M');
  NAGP_FALCONI_EXT_VENDAS_BASE56(DATE '2026-01-01', DATE '2026-08-31');
END;
```

Os arquivos são gerados no diretório Oracle `FALCONI` no servidor de banco de dados.
