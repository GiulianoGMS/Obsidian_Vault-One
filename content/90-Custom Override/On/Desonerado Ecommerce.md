---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[PDV]]"
  - "[[TI]]"
  - "[[Fiscal]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Desonerado]]"
  - "[[ICMS Desonerado]]"
  - "[[Ecommerce]]"
Date: 2025-05-08
Type: "[[Trigger]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto:** [[NFe]] com origem do [[PDV]] / [[Ecommerce]] não estava emitindo [[ICMS Desonerado]] pelo [[PLSQL-ERP-Consinco]]. Ticket [[GLPI]] 705255


**Ajuste:** Na [[Trigger]] que é acionada ao inserir itens na mfl_dfitem (tbi_mfl_dfitem), foi acrescentado o seguinte IF nas **linhas 3618~3621** (Versão 25.07.22) - **2723** (Versão 26.01.017)

```sql
      -- Giuliano
      IF :new.VLRTOTICMSDESONOUTROS > 0 AND vnAppOrigem = 7 AND nvl(vsModeloDF, '0') = '55' AND :new.indmotivodesoicms = 9 AND NVL(:new.vlrdescicms,0) = 0 THEN
         :new.vlrdescicms := :new.VLRTOTICMSDESONOUTROS;
      END IF;
```

Desta forma, a emissão foi feita com os valores corretos.

**Observação:** O ajuste é em uma trigger oficial da TOTVS, logo se faz necessário reaplicação após cadas atualização de versão.