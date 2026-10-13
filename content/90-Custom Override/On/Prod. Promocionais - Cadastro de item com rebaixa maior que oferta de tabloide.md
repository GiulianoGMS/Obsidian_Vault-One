---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[TI]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Meu Nagumo]]"
Date: 2026-10-09
Type: "[[Function]]"
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto**:  A inserção de [[Produtos Promocionais]] ([[Meu Nagumo]]/Leve_Pague) insere o [[preço]] vigente do produto, considerando ofertas, impossibilitando desta forma que o usuário insira uma nova oferta MAIOR que o preço atual ([[oferta tabloide]] padrão), considerando que essa nova oferta pode existir em um período diferente da oferta normal atual.

**Ajuste**: Para atender a demanda, ajustamos o objeto **FPDV_BUSCAPRECO**, na linha 27, foi alterada a function oficial **fPrecoEmbProduto** para **nagfPrecoEmbProduto**. O novo objeto não busca preços promocionais e sempre insere apenas o preço valido NORMAL do item.

```SQL
                  result := round(nagfprecoembproduto(pnseqproduto, pnqtdembalagem, pnnrosegmento, pnnroempresa,vnqtdembalagem), 2);

```

**Observação:** A **FPDV_BUSCAPRECO** é um objeto oficial da TOTVS, logo é necessário reaplicar os ajustes após as trocas de versões.