---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[30-Squad/Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Venda Balcão]]"
Date: 2026-10-09
Type: "[[Function]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto**:  O faturamento pelo[[ Venda Balcão]] não estava respeitando a parametrização por UF de acordo com o regime configurado no [CGO], no caso VENDA [[PDV]] PJ. A Aplicação cortava a UF e procurava na MAP_TRIBUTACAOUF apenas a primeira letra da UF (Ex. UF "DF" = "D") e acabava não retornando nada. Desta forma utilizava o regime NORMAL da empresa.

**Ajuste**: Na function **fNroRegime_Faturamento** na linha 92, foi adicionado uma regra para ignorar a validação da regra de busca do regime/parametrização.

```SQL
           IF vnCount = 0 AND 1=2 THEN
```

**Observação:** A **fNroRegime_Faturamento** é um objeto oficial da [[TOTVS]], logo é necessário reaplicar os ajustes após as trocas de versões.