---
Language:
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Recebimento]]"
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
Date:
Type: "[[Procedure]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto**: No recebimento, surgiram divergências de centavos entre o valor TOTAL da nota vs o valor TOTAL DO ITEM ([[XML]]). No [[PLSQL-ERP-Consinco]], existem apenas grades de ajustes para IMPOSTOS, não para valores totais.

Mediante ao cenário, criamos internamente uma [[Procedure]] que realiza o ajuste automaticamente na importação da [[NFe]], corrigindo os valores caso estejam dentro do limite configurado no objeto, atualmente configurado até 0,05 centavos (na época não foi criado [[PD]], portanto manteve-se fixo o valor)

**Objeto**: [NAGP_ARRED_ITEM_AUXNF_AUTO](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/550a5f61045161cb59c396f03aa5e9e30b3ef989/NAGP_ARRED_ITEM_AUXNF_AUTO.prc).

Para o ajuste automático, a [[Procedure]] deve estar presente na [[Package]] PKG_MLF_IMPNFERECEBIMENTO  (oficial da TOTVS). Atualmente está na linha **2480** (Versao 25.07.022).

**Chamada da Procedure**:
```sql
      BEGIN
        NAGP_ARRED_ITEM_AUXNF_AUTO( vnSeqAuxNF );
      END;
```

Necessário reaplicar após troca de [[versão]], já que o objeto está presente em uma pkg oficial e é sobrescrita após atualiações.