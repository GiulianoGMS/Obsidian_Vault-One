---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[30-Squad/Fiscal]]"
  - "[[Recebimento]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[NFe]]"
  - "[[Impostos]]"
Date:
Type: "[[Procedure]]"
Project:
tags:
---
**Contexto**: Script/Objeto criado para realizar o [[recalculo]] de [[NFe]]s de Transferência entre lojas do grupo, atualizando desta forma os impostos da nota e considerando as [[tributações]] atuais do [sistema.

**Observação**: Notas de [[Devolução]] não são recalculadas, pois devem manter os dados da Origem.

**Objeto**: [NAGP_RECALC_NFAUX](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/550a5f61045161cb59c396f03aa5e9e30b3ef989/NAGP_RECALC_NFAUX.prc#L2).

```sql
BEGIN
	NAGP_RECALC_NFAUX();
END;
```
