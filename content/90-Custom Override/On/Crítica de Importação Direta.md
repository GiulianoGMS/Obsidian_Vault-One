---
Language:
  - "[[SQL]]"
Repository:
  - "[[DQL-Oracle]]"
Squads:
  - "[[Importação Direta]]"
  - "[[Comercial]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Importação Direta]]"
  - "[[Critica]]"
  - "[[DI]]"
  - "[[Declaração de Importação]]"
Date:
Type: "[[Procedure]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
[[Critica]] [[DI]] caso existam despesas que nao geraram financeiro

Deve ser adicionado na [[Package]] PKG_MAD_DI > SP_CONSISTENFIMPORT, apos excluir [[inconsistencias]]

```sql
    NAGP_CONSIST_DESP_IMP(pnNumeroDI);
```
[[Procedure]] disponível no [Github](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/550a5f61045161cb59c396f03aa5e9e30b3ef989/NAGP_CONSIST_DESP_IMP.prc#L6).

O objeto alterado é oficial da TOTVS, as alterações são perdidas após trocas de [[versão]], logo é necessário 'reaplicar' quaisquer ajustes novamente.