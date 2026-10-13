# Combos Promocionais

> Contexto: **TOTVS Varejo Supermercados** — referência [TDN TOTVS](https://tdn.totvs.com/)

## O que são

Combos promocionais são regras de promoção que **incentivam o cliente a comprar um conjunto (combinação) de produtos** para ganhar vantagens — descontos, brindes ou cupons. São cadastrados na retaguarda e aplicados automaticamente no PDV quando a combinação de itens é formada no carrinho.

## Principais tipos

| Tipo | Como funciona |
|------|---------------|
| **Combo por desconto fixo no item** | Ao comprar um produto que faz parte da regra, o cliente recebe o desconto no valor fixo definido. |
| **Combo por desconto em múltiplos itens / percentual** | Incentiva a compra de vários produtos; o desconto (percentual) é aplicado sobre a combinação de itens distintos. |
| **Promoção Surpresa por Combo** | Ao formar a combinação definida, o cliente ganha **brinde ou cupom promocional**. |
| **Combo por segmento de venda** | Recurso que permite criar combos direcionados a **segmentos específicos** de venda. |

## Lado técnico (API)

- Consulta via **`GET [URLAPI]/SMPromocoesAPI/api/v1/CombosPromocionais`**
- Requer permissão no módulo **Web Security** → *API de Promoções* → *API de Combos Promocionais*

## Fontes (TDN TOTVS)

- [Consultar Combos Promocionais - GET (TVSCCLC)](https://tdn.totvs.com.br/display/public/TVSCCLC/Consultar+Combos+Promocionais+-+GET)
- [Combo por desconto fixo no item (TVSPLC)](https://tdn.totvs.com/display/public/TVSPLC/Combo+por+desconto+fixo+no+item)
- [Combo itens distintos - Desconto por percentual (TVSPLC)](https://tdn.totvs.com/display/public/TVSPLC/Combo+itens+distintos+-+Desconto+por+percentual+de+desconto)
- [Promoção Surpresa por Combo de Produtos (legado)](https://tdn.totvs.com/pages/releaseview.action?pageId=557320468)
- [DT - Seleção de segmentos de venda](https://tdn.totvs.com/pages/releaseview.action?pageId=838681740)
