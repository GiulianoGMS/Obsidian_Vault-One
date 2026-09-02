---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[30-Squad/Financeiro]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Titulo]]"
  - "[[Produtor Rural]]"
  - "[[Desconto]]"
Date:
Type: "[[Procedure]]"
Project:
tags:
---
##### 📌 **Correção de FUNRURAL em Títulos Financeiros**

O objeto em [[PLSQL-Oracle]] disponível no repositório tem como objetivo realizar a correção de valores relacionados ao [[imposto]] [[Funrural]] em [[títulos financeiros]] de notas de [[Produtor Rural]], garantindo consistência entre os dados fiscais e financeiros.

 [Script no Git](https://github.com/GiulianoGMS/Useful_Tools/blob/d884a55406c3eba10b5b7eaaa3ba5b76fc449503/Corrige%20Funrural%20Tit%20Fin.sql)

---

##### 🧠 **Contexto**

O [[Funrural]] é um tributo aplicado sobre a comercialização da produção rural, podendo impactar diretamente a geração de [[títulos a pagar/receber]] no módulo financeiro. Em alguns cenários, inconsistências podem ocorrer entre o valor calculado e o valor efetivamente registrado no [[PLSQL-ERP-Consinco]].

O sisstea utiliza regras financeiras específicas para geração desses títulos, vinculando impostos a naturezas e movimentações financeiras .

---

##### ⚙️ **O que o objeto faz**

Este script atua como uma rotina de [[ajuste de dados]], normalmente aplicada em massa, com foco em:

- Recalcular ou corrigir valores de [[Funrural]]
- Atualizar registros inconsistentes em [[tabelas financeiras]]
- Garantir que os valores estejam alinhados com a [[regra fiscal]]
- Evitar divergências entre [[contábil]] e [[30-Squad/Financeiro]]