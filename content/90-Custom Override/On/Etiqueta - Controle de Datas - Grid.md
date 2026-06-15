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
  - "[[Controle de Datas]]"
  - "[[Etiqueta de Validade]]"
Date:
Type: "[[View]]"
Project: "[[Controle de Datas]]"
tags:
  - custom_override
  - reapply
  - Projects
Aplicado 26..017: true
---
A view **MRLV_PROMOCAOESPECIAL** traz os produtos ao grid da aplicação dentro do [[PLSQL-ERP-Consinco]]. 

Houveram alguns ajustes internos para que a emissão respeite a quantidade de etiquetas solicitadas na rebaixa, evitando que mais que o solicitado seja emitido.

A [[View]] alterada pode ser encontrada no [Github](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/MRLV_PROMOCAOESPECIAL.sql). Por ser um ajuste em um objeto oficial da TOTVS, após a troca de versão é necessário reaplicar as alterações neste objeto.

**Vinculado ao canva:** [[Pricing - Controle de Datas Form]]
