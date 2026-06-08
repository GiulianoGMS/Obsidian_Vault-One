---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[PDV]]"
  - "[[TI]]"
  - "[[Ecommerce]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Ecommerce]]"
Date: 2026-05-07
Type: "[[Function]]"
Project:
tags:
  - custom_override
  - reapply
---
**Contexto**: [[NFe]] [[Ecommerce]] (importadas pelo [[PDV]] ao [[PLSQL-ERP-Consinco]]) estavam sendo emitidas com alguns centavos no campo [[Outras Despesas Acessorias]] (**vOutros**). Ticket [[GLPI]] 658961.

**Ajuste**: Como as notas não são rejeitadas e o time [[TOTVS]] ainda não identificou o motivo do acréscimo deste valor no campo VLRTOTDESPACESSORIA, resolvi tratar este valor na montagem do XML, que é realizada pelo ERP pela [[Procedure]] **SP_EXPNFE_2g**.

Foi criado a function [NAGF_SUBTRAI_DESP_CENT_ECOMM](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/a5974ba62b7d28e42ab8a1039cfa06c7e959e061/NAGF_SUBTRAI_DESP_CENT_ECOMM.fnc#L4) para tratar os critéros de ajustes e a mesma foi aplicada nas linhas dos totais de vOutros na [[NFe]].

**SP_EXPNFE_2g** aplicado em:

- **Linha** 888 - Total vOutros do cabeçalho da [[NFe]]:
```sql
	-- Giuliano 06/05/26
	- NAGF_SUBTRAI_DESP_CENT_ECOMM(NVL(A.VLRDESPACESSORIA,0), A.APPORIGEM, A.CODGERALOPER)
	--
	) as M000_VL_OUTROS,
```
- **Linha** 2237 - Total vOutros do item:
```sql
	-- Giuliano 06/05/26
	- NAGF_SUBTRAI_DESP_CENT_ECOMM(NVL(A.VLRDESPACESSORIA,0), A.APPORIGEM, A.CODGERALOPER)
	--
	  as M014_VL_OUTRAS_DESPESAS,
```
**Regras dentro da [[Function]]:**

- vsVlrLimite = Valor Limite que fará a subtração no cálculo;
- Apenas emissões utilizando CGOs com descrição "E-COMM" serão afetadas;

**Observação:** A **SP_EXPNFE_2g** é um objeto oficial da TOTVS, logo é necessário reaplicar os ajustes após as trocas de versões.