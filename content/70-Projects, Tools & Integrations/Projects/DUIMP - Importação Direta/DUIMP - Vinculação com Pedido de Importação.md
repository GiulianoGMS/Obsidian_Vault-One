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
Open Tags:
  - "[[DUIMP]]"
  - "[[Importação]]"
  - "[[Pedido de Importação]]"
Date: 2026-10-03
Type:
tags:
  - Projects
---

> [!info] Referência
> [GiulianoGMS/DUIMP-Importacao-XML-x-ERP — NAGP_IMP_DADOS_DUIMP.sql](https://github.com/GiulianoGMS/DUIMP-Importacao-XML-x-ERP/blob/main/NAGP_IMP_DADOS_DUIMP.sql)

> [!note] Continuação de
> Este processo é o passo "Confronto ERP x Arquivo" planejado em **[[DUIMP - Importação de XML]]**. Pressupõe que a DUIMP já foi lida do XML e está em `NAGT_DUIMP_CAPA` / `NAGT_DUIMP_ITENS` via `NAGP_IMP_DUIMP`.
>
> O relatório visual de confronto (Centura Report Builder) que consome esses dados está documentado em **[[DUIMP - Relatório Comparativo XML x ERP]]**.
>
> Visão geral do processo completo (fluxo e objetos em ordem): **[[DUIMP - Visão Geral do Processo]]**.

---

## Contexto

Enquanto `NAGP_IMP_DUIMP` só importa o XML da DUIMP para as tabelas de staging (`NAGT_DUIMP_CAPA` / `NAGT_DUIMP_ITENS`), a `NAGP_IMP_DADOS_DUIMP` é o passo que **liga essa DUIMP a um Pedido de Importação já existente no ERP** (`MAD_PIPEDIDOIMPORT`) e preenche automaticamente, a partir dos dados do arquivo: câmbio, quantidade/valor dos itens e despesas do pedido (frete, seguro, taxa Siscomex).

Não é um relatório de divergência — é um **auto-preenchimento**: ela escreve direto nas tabelas do pedido de importação do ERP, substituindo digitação manual dessses campos.

> [!warning] Repositório renomeado
> O repositório `Import-XML-Duimp`, referenciado em [[DUIMP - Importação de XML]], foi renomeado para `DUIMP-Importacao-XML-x-ERP` — mesmo repositório, agora reunindo os dois procs (`NAGP_IMP_DUIMP` e `NAGP_IMP_DADOS_DUIMP`).

---

## Procedure — `NAGP_IMP_DADOS_DUIMP`

**Parâmetros:**

| Parâmetro     | Tipo       | Descrição                                                                 |
| ------------- | ---------- | ------------------------------------------------------------------------- |
| `psSeqPedido` | `NUMBER`   | Sequencial do Pedido de Importação (`MAD_PIPEDIDOIMPORT.SEQPEDIDOIMPORT`) |
| `psNumDUIMP`  | `VARCHAR2` | Número da DUIMP já importada (`NAGT_DUIMP_CAPA.NUMERODUIMP`)              |

**Fluxo:**

```
1. UPDATE MAD_PIPEDIDOIMPORT
   → TXCAMBIO = NAGT_DUIMP_CAPA.COTACAODOLAR
   → USUINCLUSAO = 'AUTO'
   → só roda se SEQPEDIDOIMPORT existir e SITUACAOPED = 'S' (Em Simulação)
   → SQL%ROWCOUNT > 0 funciona como guarda: se o pedido não está elegível, a
     procedure encerra em silêncio sem tocar nos demais passos

2. Para cada item da DUIMP (somado por CODIGO/VALORUNITARIODOLAR, cruzando
   MAP_PRODUTO / MAP_FAMFORNEC / MAP_FAMDIVISAO para achar produto, família
   e embalagem padrão de compra do fornecedor do pedido):
   MERGE INTO MAD_PIPEDIMPORTPROD
   → QTDSOLICITADA = quantidade da DUIMP
   → QTDEMBALAGEM  = PADRAOEMBCOMPRA (de MAP_FAMDIVISAO)
   → VLRITEM       = PADRAOEMBCOMPRA * VALORUNITARIODOLAR

3. MERGE INTO MAD_PIPEDDESPESA
   → mapeia FRETE, SEGURO e TAXASISCOMEX da capa da DUIMP para os tipos de
     adiantamento correspondentes (MAD_PITIPOADIANTAMENTO, por NROEMPRESA)
   → pedido novo: insere com DTAPREVPAGTO fixa em 2099-01-01 (placeholder)

4. UPDATE NAGT_DUIMP_CAPA
   → grava SEQPEDIDOIMPORT (liga a DUIMP ao pedido)
   → IND_PROCESSADA = IND_PROCESSADA + 1
   → DTAPROCESSADA  = SYSDATE

5. COMMIT
```

**Chamada:**
```sql
BEGIN
  NAGP_IMP_DADOS_DUIMP(12345, '26BR00016589107');
END;
```

---

## Tabelas envolvidas (ERP)

| Tabela | Papel neste processo |
|---|---|
| `MAD_PIPEDIDOIMPORT` | Cabeçalho do Pedido de Importação — recebe o câmbio da DUIMP |
| `MAD_PIPEDIMPORTPROD` | Itens do pedido — recebe quantidade/embalagem/valor de cada produto da DUIMP |
| `MAD_PIPEDDESPESA` | Despesas do pedido — recebe frete/seguro/taxa Siscomex |
| `MAD_PITIPOADIANTAMENTO` | Tabela de tipos de adiantamento/despesa por empresa — usada para mapear `FRETE INTERNACIONAL` / `SEGURO` / `TAXA SISCOMEX` ao `SEQTIPOADIANT` certo |
| `MAP_PRODUTO` | Cadastro de produto — cruza `NAGT_DUIMP_ITENS.CODIGO` com `SEQPRODUTO` |
| `MAP_FAMFORNEC` | Família x fornecedor — valida que o produto pertence à família vendida pelo fornecedor do pedido |
| `MAP_FAMDIVISAO` | Família x divisão — fornece `PADRAOEMBCOMPRA` (padrão de embalagem de compra) usado no cálculo de `VLRITEM` |

---

## Pontos de atenção

> [!warning] Despesas de imposto ainda não ativadas
> No `MERGE` de despesas, as linhas de `IPI`, `PIS`, `COFINS`, `ICMS` e `VMLE (FOB)` estão **comentadas** no código — só `FRETE`, `SEGURO` e `TAXA SISCOMEX` são gravados hoje. Decisão de incluir os tributos como despesa do pedido ainda está em aberto.

> [!warning] AFRMM não vem no XML da DUIMP
> Precisa ser digitado manualmente. Se a importação for marítima, a ausência desse valor deve ser pega na crítica/validação posterior do pedido (não há validação disso dentro desta procedure).

> [!warning] Colunas de controle fora do DDL versionado
> A procedure grava em `NAGT_DUIMP_CAPA.SEQPEDIDOIMPORT`, `IND_PROCESSADA` e `DTAPROCESSADA`, mas essas colunas **não aparecem** em `DDL_Tabelas.sql` no repositório — o DDL versionado está desatualizado em relação ao banco. Vale gerar um `ALTER TABLE` e commitar, para o schema documentado bater com o real.

> [!tip] Idempotência parcial
> O `MERGE` nos itens (passo 2) e nas despesas (passo 3) é idempotente — rodar a procedure de novo para o mesmo pedido/DUIMP atualiza em vez de duplicar. Já o `UPDATE` do passo 1 só executa se `SITUACAOPED = 'S'`, então **depois que o pedido sai de "Em Simulação", a procedure para de fazer efeito** (por design, não é bug).

---

## Próximos passos

- [x] Versionar o `ALTER TABLE` das colunas de controle (`SEQPEDIDOIMPORT`, `IND_PROCESSADA`, `DTAPROCESSADA`) em `NAGT_DUIMP_CAPA`
- [x] Decidir se os tributos (IPI/PIS/COFINS/ICMS) entram como despesa do pedido ou ficam só informativos na capa da DUIMP
- [ ] Crítica de AFRMM ausente quando `UFDESEMBARACO`/modal indicar transporte marítimo
