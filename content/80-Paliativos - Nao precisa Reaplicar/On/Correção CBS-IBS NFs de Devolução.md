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

> [!info] Contexto
> Paliativos para correção automática de rejeições em emissões de [[NFe]] de [[Devolução]] relacionadas a tributação [[CBS]]/[[IBS]]. Todos rodam via [[Job]] **NAGJ_PALIAT_DEV_RED_CBSIBS**.

---

## Rejeições e Paliativos

### 1 — Valor CBS/IBS Divergente do Calculado

> Sistema não aplica a redução de alíquota nos itens de devolução quando esta existe.

| Campo | Valor |
|-------|-------|
| Objeto | [NAGP_PALIATIVO_CBS_IBS_DEV_RED](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CBS_IBS_DEV_RED.prc) |
| Job | NAGJ_PALIAT_DEV_RED_CBSIBS |
| Depende do PD | DEV_CGO_CORRIGE_IBSCBS |

**Função:** Recalcula `VLRIMPOSTOCBS` e `VLRIMPOSTOIBSUF` considerando a alíquota de redução do item.

**PD DEV_CGO_CORRIGE_IBSCBS:** Lista de [[CGO]]s que corrige os campos de impostos [[CBS]]/[[IBS]] nas operações de devoluções (correção para redução de alíquota).

---

### 2 — cClassTrib com Valor Incoerente (1 dígito em vez de 6)

> SEFAZ rejeita `cClassTrib = "1"` — obrigatório ter 6 dígitos.

| Campo | Valor |
|-------|-------|
| Objeto | [NAGP_PALIATIVO_CBS_IBS_DEV_RED](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CBS_IBS_DEV_RED.prc) |
| Job | NAGJ_PALIAT_DEV_RED_CBSIBS |
| Depende do PD | DEV_CGO_CORRIGE_IBSCBS |

**Função:** Aplica `LPAD(cClassTrib, 6, '0')` nos campos `CCLASSTRIBCBS`, `CCLASSTRIBIBSUF`, `CCLASSTRIBIBSMUN` e `CCLASSTRIBIS`.

---

### 3 — Valor Total CBS/IBS Divergente do Somatório dos Itens

> Campos CBS/IBS faltantes ou incorretos nos itens fazem o total da NF divergir do somatório.

| Campo | Valor |
|-------|-------|
| Objeto (v2) | [NAGP_PALIATIVO_CBS_IBS_DEV_TOT_v2](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_PALIATIVO_CBS_IBS_DEV_TOT_v2.prc) |
| Job | NAGJ_PALIAT_DEV_RED_CBSIBS |
| Prazo | Ativo até **31/08/2026** |
| Limite de tentativas | Máximo **4 por [[NFe]]** (controle via `NAGT_PALIAT_DEV`) |

**NFs elegíveis (UNION de dois critérios):**

| Status | Condição no log (`MFL_NFELOG`) |
|--------|-------------------------------|
| `5` (rejeitada) | Log contém `CBS difere da soma dos itens` |
| `99` (gap de sequência) | Log contém `Depois desta, faltou uma da` |

**Fluxo por NF:**
1. Registra a NF em `NAGT_PALIAT_DEV` com motivo `'Total CBS/IBS'`
2. Preenche campos CBS/IBS faltantes nos itens a partir de `NAGV_PDV_CCT` (alíquotas, reduções, CST, [[cClassTrib]])
3. Recalcula `VLRIMPOSTOCBS` e `VLRIMPOSTOIBSUF` aplicando a redução de alíquota
4. Aplica LPAD 6 dígitos nos `cClassTrib` (CBS, IBS-UF, IBS-MUN, IS)
5. Reexporta a [[NFe]] via `SP_EXPORTANFE`

---

## Tabela de Controle

**`NAGT_PALIAT_DEV`** — registra cada reenvio realizado pelos paliativos. Também é consultada para evitar reprocessamento indevido (limite de tentativas por NF).
