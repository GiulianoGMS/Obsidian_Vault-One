---
Language:
  - "[[SQL]]"
Repository:
  - "[[DQL-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Comercial]]"
  - "[[CD]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Arredondamento]]"
  - "[[Seleção Inversa]]"
  - "[[SI]]"
Date:
Type:
Project:
tags:
  - reapply
  - custom_override
Aplicado 26..017: true
---
**Objetivo**

Ajustar (arredondar) quantidades de Pedidos de Suprimentos de [[Centros de Distribuição]] (CDs 504 e 505), garantindo que os valores respeitem regras de [[múltiplos]] (ex: lastro, embalagem, logística) para produtos [[pesáveis]]. O Objeto oficial não contempla este ajuste, é preciso reaplicar em cada atualização de [[versão]] do [[PLSQL-ERP-Consinco]].

---
**Lógica Geral**

O script adiciona as empresa 504 e 505 como critério para arredondamento dentro dos objetos, sem considerar o parâmetro "Pesável" quando tratam-se destas duas empresas. Desta forma, os pedidos não são quebrados em kg/gramas.

---
```sql
-- Oficial Final na versão 22:

PKG_MLF_RECEBIMENTO.SP_CALCSELINVERSA
Linha 14848
        (D.PESAVEL = 'N' or vtItem.NROEMPRESA IN (504,505)))
Linha 14188
        (vsPesavelSIN = 'N' 
        -- Giuliano 04/07/2025
        -- CDs 504/505 consideram qtd faltante no rateio como quantidade fechada e nao cracionada pela variavel vsPesavelSIN
        OR vtItem.NROEMPRESA IN (504,505))
```
 
 _(!) Vide [Script no Github](🔗 [Script no Github](https://github.com/GiulianoGMS/Useful_Tools/blob/d884a55406c3eba10b5b7eaaa3ba5b76fc449503/Arred%20SI%20%7C%20CDs%20504_505.sql#L2).) (Atualizado)
 