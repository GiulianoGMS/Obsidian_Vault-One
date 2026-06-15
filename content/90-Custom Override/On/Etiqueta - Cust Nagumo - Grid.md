---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[Pricing]]"
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Etiqueta]]"
  - "[[Grid]]"
  - "[[Preço]]"
  - "[[Preço de Venda]]"
  - "[[Ofertas]]"
Date:
Type: "[[View]]"
Project: "[[Controle de Datas]]"
tags:
  - custom_override
  - reapply
  - Projects
Aplicado 26..017: true
---
A view **MRLV_BASEETIQUETAPROD** traz os produtos ao grid da aplicação dentro do [[PLSQL-ERP-Consinco]] quando os preços normais ou de ofertas padrões são alterados no sistema.

Se fez necessário que alterações "MN" e Cartão Próprio também tragam os produtos no grid para emissão agrupada na carga dos produtos em tela para emissão, já que essas alterações não populam os itens em tela para emissão da 'carga automática de alterações de preços'

**View alterada:**
- Se o produto entrou em [[oferta]] no MN no dia atual, retorna no grid
- Se o produto entrou em oferta no [[Cartão Próprio]], retorna no grid
- Se o produto saiu de oferta no D-1, tanto [[MN]] quanto CP, retornam no grid

A view utiliza como controle de impressão a tabela **NAGT_CONTROLEIMPRESSAO**, já que o controle não é feito pelo ERP em si, fazendo um NOT EXISTS no dia atual de emissão. A mesma tabela também serve como log de impressões. 

A tabela de log é alimentada pela [[Trigger]] [NAGTR_TBI_ETIQUETAS](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/550a5f61045161cb59c396f03aa5e9e30b3ef989/NAGTR_TBI_ETIQUETAS.trg#L10), que grava as impressões após inserção na tabela padrão do ERP (MRLX_BASEETIQUETAPROD).

A [[View]] oficial alterada pode ser encontrada no [Github]([https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/MRLV_PROMOCAOESPECIAL.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/MRLV_BASEETIQUETAPROD.sql)). Por ser um ajuste em um objeto oficial da TOTVS, após a troca de versão é necessário reaplicar as alterações neste objeto. (**MRLV_BASEETIQUETAPROD**).
