---
Language:
  - "[[SQL]]"
Repository:
  - "[[DUIMP-Importacao-XML-x-ERP]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
  - "[[Compras]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
  - "[[Centura Report Builder]]"
Open Tags:
  - "[[DUIMP]]"
  - "[[Importação]]"
  - "[[Confronto]]"
Date: 2026-10-05
Type:
tags:
  - Projects
---

> [!info] Referência
> [GiulianoGMS/DUIMP-Importacao-XML-x-ERP](https://github.com/GiulianoGMS/DUIMP-Importacao-XML-x-ERP) *(repositório único com todos os objetos do processo)*

> [!note] Índice da série
> Este é o MD guarda-chuva da série DUIMP. Os três abaixo detalham cada etapa — este aqui só amarra a ordem e o fluxo entre eles.
> 1. [[DUIMP - Importação de XML]]
> 2. [[DUIMP - Vinculação com Pedido de Importação]]
> 3. [[DUIMP - Relatório Comparativo XML x ERP]]

---

Exemplo: 

**DUIMP** 26BR00018737901
**Pedido** 5461 -- criar outro para exemplificar
**Fornecedor** 2653529

---
## Objetivo do processo

Pegar a declaração de importação (**DUIMP**) enviada pelo despachante em XML, estruturar os dados em tabelas Oracle próprias, ligar isso ao Pedido de Importação já existente no ERP (preenchendo câmbio/itens/despesas automaticamente) e, por fim, gerar um relatório que confronta DUIMP x ERP campo a campo — pra pegar divergência de digitação/cálculo antes de seguir pro fechamento da importação.

---

## Fluxo, em ordem

```
XML da DUIMP (PUCOMEX)
  └─ depositado em DUIMP_IMPORTAR (diretório Oracle)
        │
        ▼
[1] NAGP_IMP_DUIMP (procedure)  ────────────────────────────  MD: [[DUIMP - Importação de XML]]
  └─ lê o XML, parse via XMLTABLE, insere em:
        │
        ▼
[2] NAGT_DUIMP_CAPA  +  NAGT_DUIMP_ITENS (tabelas)
  └─ staging da DUIMP estruturada — arquivo movido p/ DUIMP_PROCESSADOS
        │
        ▼
[3] NAGP_IMP_DADOS_DUIMP (procedure)  ──────────────────────  MD: [[DUIMP - Vinculação com Pedido de Importação]]
  └─ liga a DUIMP a um Pedido de Importação já existente (SEQPEDIDOIMPORT),
     preenche câmbio, itens e despesas automaticamente em:
        │
        ▼
[4] MAD_PIPEDIDOIMPORT + MAD_PIPEDIMPORTPROD + MAD_PIPEDDESPESA (tabelas ERP)
  └─ Pedido de Importação do ERP, agora com os dados da DUIMP já aplicados
        │
        ▼
[5] Comparativo.sql + RelDuimp.QRP (view + relatório Centura)  ─────────────  MD: [[DUIMP - Relatório Comparativo XML x ERP]]
  └─ confronta DUIMP (passo 2) x ERP (passo 4) — quantidade, peso, II/IPI/PIS/COFINS,
     câmbio, despesas — aponta OK/DIVERGENTE/NAO_ENCONTRADO por item
```

---

## Objetos em ordem de processo

| # | Objeto | Tipo | Arquivo | Etapa | MD |
|---|---|---|---|---|---|
| 1 | `NAGP_IMP_DUIMP` | Procedure | `NAGP_IMP_DUIMP.prc` | Lê XML → importa pra staging | [[DUIMP - Importação de XML]] |
| 2 | `NAGT_DUIMP_CAPA` | Tabela | `DDL_Tabelas.sql` | Staging — cabeçalho da DUIMP | [[DUIMP - Importação de XML]] |
| 2 | `NAGT_DUIMP_ITENS` | Tabela | `DDL_Tabelas.sql` | Staging — itens/adições da DUIMP | [[DUIMP - Importação de XML]] |
| 3 | `NAGP_IMP_DADOS_DUIMP` | Procedure | `NAGP_IMP_DADOS_DUIMP.sql` | Vincula staging → Pedido de Importação | [[DUIMP - Vinculação com Pedido de Importação]] |
| 4 | `MAD_PIPEDIDOIMPORT` | Tabela (ERP) | — | Cabeçalho do Pedido de Importação | [[DUIMP - Vinculação com Pedido de Importação]] |
| 4 | `MAD_PIPEDIMPORTPROD` | Tabela (ERP) | — | Itens do Pedido de Importação | [[DUIMP - Vinculação com Pedido de Importação]] |
| 4 | `MAD_PIPEDDESPESA` | Tabela (ERP) | — | Despesas do Pedido de Importação | [[DUIMP - Vinculação com Pedido de Importação]] |
| 5 | `Comparativo.sql` | View/Query | `Comparativo.sql` | Confronto DUIMP x ERP | [[DUIMP - Relatório Comparativo XML x ERP]] |
| 5 | `RelDuimp.QRP` | Layout (Centura) | `RelDuimp.QRP` | Impressão/visualização do confronto | [[DUIMP - Relatório Comparativo XML x ERP]] |

---

## Pendências consolidadas (das 3 etapas)

- [x] Versionar `ALTER TABLE` das colunas de controle (`SEQPEDIDOIMPORT`, `IND_PROCESSADA`, `DTAPROCESSADA`) em `NAGT_DUIMP_CAPA` — existem no banco, não no `DDL_Tabelas.sql`
- [x] Decidir se tributos (IPI/PIS/COFINS/ICMS) entram como despesa do pedido em `NAGP_IMP_DADOS_DUIMP` (hoje comentado no código)
- [ ] Crítica de AFRMM ausente quando a importação for marítima (não vem no XML, precisa digitação manual)
- [x] Confrontar Despesas Aduaneiras (`NAGT_DUIMP_CAPA.DESPESASADUANEIRAS`) — depende de existir tipo de adiantamento correspondente no ERP
- [ ] Incluir no relatório a Conferência Interna (Capa x Itens): Total Mercadoria (USD) e Valor Aduaneiro (`VMLD` vs soma de `BASECALCULOII`) — desenhado, ainda não está no `Comparativo.sql`
- [x] Relatório de divergência campo-a-campo contra o que o comprador digitou manualmente no ERP (item original do backlog, ainda em aberto — o confronto atual é contra o que a `NAGP_IMP_DADOS_DUIMP` já preencheu automaticamente)
