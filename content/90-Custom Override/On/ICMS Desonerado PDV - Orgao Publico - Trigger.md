---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[PDV]]"
  - "[[Recebimento]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFe]]"
  - "[[ICMS Desonerado]]"
  - "[[Desonerado]]"
Date:
Type: "[[Procedure]]"
Project:
tags:
  - Paliativos
Aplicado 26..017: true
---
**Old**: [[Off ICMS Desonerado PDV - Orgao Publico - CST]]

**Contexto**
Procedimento paliativo que corrige a operação de emissão de desonerado à [[Orgao Publico]] pelo PDV, alterando o [[CST]] (Código da Situação Tributária) quando necessário refazendo o cálculo do ICMS Desonerado sem utilizar o proprio desonerado como desconto

**Regra** **Detalhada**:

![[Calculo Desonerado PDV.png]]

Adicionado na [[Trigger]] tbi_mfl_dfitem - **Linha 3618** - > **2723** (Versão 26.01.017)

```sql
-- Orgao Publico - Recalc Desonerado Orig PDV e ajuste CST
      IF vnAppOrigem = 7 AND NVL(:new.vlrDesconto,0) >= NVL(:new.vlrDescIcms,0) AND NVL(:new.vlrDesconto,0) > 0 AND :new.indmotivodesoicms = 8 AND NVL(:new.vlrdescicms,0) > 0 AND 1=1 
        THEN
        :new.vlrdescicms := ROUND((:new.vlritem - (:new.vlrDesconto - (:new.vlritem * NAGF_ALIQ_ICMSDESON(:new.SEQPRODUTO)/100))) * NAGF_ALIQ_ICMSDESON(:new.SEQPRODUTO)/100,2);
        -- Transforma o CST para 040
        IF :new.SITUACAONF IN ('020','120','220','320','420','620','720','820','000','100','200','300','400','500','600','700','800') THEN
           :new.SITUACAONF := '040';
        END IF;
      END IF;
      --
```
**Regra**: Deve Subtrair DESCONTO da base, porém o [[PDV]] envia Outros Descontos + Desconto ICMS (Deson) somado. O script faz a dedução do [[Desonerado]] para descobrir o valor de outros descontos, remontando a base e recalculando o desonerado correto, no líquido correto.