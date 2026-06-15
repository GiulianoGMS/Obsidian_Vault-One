---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Critica]]"
  - "[[Job]]"
  - "[[CGO]]"
Date:
Type: "[[Package]]"
Project:
tags:
  - reapply
  - custom_override
Aplicado 26..017: false
---
### Visão Geral

Projeto de criação de inconsistências e validações de **Produtos**, **Famílias** e **Tributações** conforme necessidade fiscal.

Cada inconsistência é uma `PROCEDURE` criada no body da `PKG_INCONSISTENCIAS`. Para cada procedure, deve existir uma linha na tabela `MAP_CADINCONSISTENC` com o respectivo `user_procedure`, status e descrição — a PKG faz loop na tabela para executar cada uma.

**Tabelas de armazenamento:**
- `MAP_INCONS_FAMILIA`
- `MAP_INCONS_PRODUTO`
- `MAP_INCONS_TRIBUT`

---

### Inconsistências de Família

| Procedure | Descrição |
|-----------|-----------|
| `NAGP_INC_FAM_01` | Validações de CFOP + CGO + Tributação |
| `NAGP_INC_FAM_02` | Valida se foi preenchido redução de PIS ou COFINS na família — não deve existir informação |
| `NAGP_INC_FAM_03` | Valida o CST PIS/COFINS de acordo com a tabela DE/PARA `NAGT_DEPARA_CSTPISCOFINS` |
| `NAGP_INC_FAM_04` | Valida o CST 060 com CEST nulo na família |

##### NAGP_INC_FAM_01 — Validações de CFOP + CGO + Tributação
[Procedure](https://github.com/GiulianoGMS/DDL-Objects-Oracle/issues/3) | [View — NAGV_VALIDCFOPCGOTRIB_CADFAM](https://github.com/GiulianoGMS/Objects-Oracle/blob/main/NAGV_VALIDCFOPCGOTRIB_CADFAM.sql)
[Procedure no Git](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_INC_FAM_01.prc)
##### NAGP_INC_FAM_02 — Redução de PIS/COFINS na Família
[Procedure](https://github.com/GiulianoGMS/DDL-Objects-Oracle/issues/4)
[Procedure no Git](github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_INC_FAM_02.prc)
##### NAGP_INC_FAM_03 — CST PIS/COFINS via DE/PARA
[Tabela — NAGT_DEPARA_CSTPISCOFINS](https://github.com/GiulianoGMS/Objects-Oracle/blob/main/NAGT_DEPARA_CSTPISCOFINS.sql) | [Procedure](https://github.com/GiulianoGMS/DDL-Objects-Oracle/issues/5)
[Procedure no Git](github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_INC_FAM_03.prc)
##### NAGP_INC_FAM_04 — CST 060 com CEST Nulo
[View — NAGV_VALID_CEST_CST](https://github.com/GiulianoGMS/Objects-Oracle/blob/main/NAGV_VALID_CEST_CST.sql) | [Procedure](https://github.com/GiulianoGMS/DDL-Objects-Oracle/issues/6)
[Procedure no Git](github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGP_INC_FAM_04.prc)

---

##### JOB — Reprocessamento Automático

`NAGP_PROCESSAFAM` — Reprocessa inconsistências nas famílias alteradas nos últimos XX dias.

[Procedure no Git](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/28208c73b1b4f0223d9fa2403a083dd03f023b7d/NAGP_PROCESSAFAM.prc#L4)

---

[Projeto no GitHub](https://github.com/users/GiulianoGMS/projects/6)
