---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Recebimento]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFe]]"
  - "[[Devolução]]"
Date:
Type: "[[Procedure]]"
Project:
tags:
  - Paliativos
---
**Contexto:** Paliativos para correção de rejeições em emissões de [[NFe]] de [[Devolução]]

**Situações e Paliativos:**

**1. Rejeição: Valor CBS/IBS divergente do calculado**
- Sistema não calcula a redução de aliquota, quando existe.
- Objeto: [NAGP_PALIATIVO_CBS_IBS_DEV_RED](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CBS_IBS_DEV_RED.prc)
- Função: Recalcula o imposto considerando a aliquota de redução do item
- [[Job]]: NAGJ_PALIAT_DEV_RED_CBSIBS
- Depende do [[PD]] DEV_CGO_CORRIGE_IBSCBS
- PD: Lista de [[CGO]]s que realiza a correcao dos campos de impostos [[CBS]]/[[IBS]] nas op de devolucoes (Correcao para reducao de aliq)

**2. Rejeição: Valor "1" [[cClasstrib]] incoerente com a tag. Necessário 6 dígitos.**
- Objeto: [NAGP_PALIATIVO_CBS_IBS_DEV_RED](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CBS_IBS_DEV_RED.prc)
- Função: Faz LPAD no cClasstrib considerando o valor original
- [[Job]]: NAGJ_PALIAT_DEV_RED_CBSIBS
- Depende do [[PD]] DEV_CGO_CORRIGE_IBSCBS
- PD: Lista de [[CGO]]s que realiza a correcao dos campos de impostos [[CBS]]/[[IBS]] nas op de devolucoes (Correcao para reducao de aliq)

**3. Rejeição: Valor Total CBS/IBS Divergente do Somatório dos Itens**
- Objeto: [NAGP_PALIATIVO_CBS_IBS_DEV_TOT_v2](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CBS_IBS_DEV_TOT_v2.prc)
- [[Job]]: NAGJ_PALIAT_DEV_RED_CBSIBS
- Prazo: Ativo até **31/08/2026** (`IF psData <= DATE '2026-08-31'`)
- Limite: máximo **4 tentativas** por [[NFe]] (controle via `NAGT_PALIAT_DEV`)
- Função (v2): Busca NFs rejeitadas por duas situações (UNION):
  - `STATUS = 5` com log `CBS difere da soma dos itens`
  - `STATUS = 99` com log `Depois desta, faltou uma da` (gap de sequência)
- Para cada NF: preenche os campos CBS/IBS faltantes dos itens a partir de `NAGV_PDV_CCT` (alíquotas, reduções, CST, cClassTrib), recalcula `VLRIMPOSTOCBS` e `VLRIMPOSTOIBSUF` considerando a redução, aplica LPAD 6 dígitos no `cClassTrib` e reexporta via `SP_EXPORTANFE`

**Tabela de Log e Controle**

O reenvio através dos paliativos fica registrado na [[tabela]] NAGT_PALIAT_DEV. A mesma também é validada nas procedures para evitar reprocessamento indevido das [[NFe]]s.