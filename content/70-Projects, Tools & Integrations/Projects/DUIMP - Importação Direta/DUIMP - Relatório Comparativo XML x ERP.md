---
Language:
  - "[[SQL]]"
Repository:
  - "[[DUIMP-Importacao-XML-x-ERP]]"
Squads:
  - "[[TI]]"
  - "[[Fiscal]]"
  - "[[Compras]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
  - "[[Centura Report Builder]]"
Open Tags:
  - "[[DUIMP]]"
  - "[[Confronto]]"
  - "[[Relatório]]"
Date: 2026-10-05
Type:
tags:
  - Projects
---
> [!info] Referência
> [GiulianoGMS/DUIMP-Importacao-XML-x-ERP — Comparativo.sql](https://github.com/GiulianoGMS/DUIMP-Importacao-XML-x-ERP/blob/main/Comparativo.sql)
> [GiulianoGMS/DUIMP-Importacao-XML-x-ERP — RelDuimp.QRP](https://github.com/GiulianoGMS/DUIMP-Importacao-XML-x-ERP/blob/main/RelDuimp.QRP) *(layout Centura Report Builder)*

> [!note] Relacionados
> Terceiro MD da série DUIMP. Pressupõe a DUIMP já importada ([[DUIMP - Importação de XML]]) e, opcionalmente, já vinculada a um Pedido de Importação ([[DUIMP - Vinculação com Pedido de Importação]]) — mas não depende da segunda: este relatório lê `NAGT_DUIMP_CAPA`/`NAGT_DUIMP_ITENS` e o ERP em paralelo, então funciona mesmo que o vínculo automático não tenha rodado (nesse caso, as linhas de despesa acusam `DUIMP_NAO_VINCULADA_AO_PEDIDO`).
>
> Visão geral do processo completo (fluxo e objetos em ordem): [[DUIMP - Visão Geral do Processo]].

---
## Contexto

Relatório auxiliar — **"Relatório Auxiliar - DUIMP XML vs ERP"** — que confronta, lado a lado, os dados declarados no XML da DUIMP (já importados em `NAGT_DUIMP_CAPA`/`NAGT_DUIMP_ITENS`) contra os dados do Pedido de Importação no ERP (`MAD_PIPEDIDOIMPORT`/`MAD_PIPEDIMPORTPROD`/`MAD_PIPEDDESPESA`). Roda no **Centura Report Builder**, parametrizado por dois binds:

| Bind | Significa | Origem |
|---|---|---|
| `:LT1` | `NUMERODUIMP` | `NAGT_DUIMP_CAPA.NUMERODUIMP` |
| `:NR1` | `SEQPEDIDOIMPORT` | `MAD_PIPEDIDOIMPORT.SEQPEDIDOIMPORT` |

---

## Por que o formato é "alto" em vez de "largo"

A primeira versão tinha ~51 colunas numa linha só por produto (quantidade, peso, II, IPI, PIS, COFINS — valor e alíquota de cada, mais capa/despesas). O Centura Report Builder não permite adicionar mais de um **detail block** nesse `.QRP`, então em vez de colunas largas, o `SELECT` final empilha os dados em formato longo: **cada linha representa uma métrica, não um produto inteiro**. Um mesmo produto aparece em várias linhas (uma por métrica), todas usando o mesmo layout de 7 campos de conteúdo.

O discriminador é a coluna `GRUPO` (categoria ampla) + `TRIBUTO` (métrica específica dentro do grupo) — isso também permite ao Centura usar quebra de grupo nativa (`group break`) na mudança de `GRUPO`, já que ele é a primeira coluna de conteúdo retornada.

---

## Colunas de saída (Input Items no Centura)

| # | Coluna | Descrição |
|---|---|---|
| 1 | `NUMERODUIMP` | Repetida em toda linha — número da DUIMP sendo confrontada |
| 2 | `ORD` | Ordem de exibição do bloco (ver seção "Ordenação") — **não precisa virar campo visível no relatório** |
| 3 | `GRUPO` | Categoria: `Despesas / Câmbio`, `Quantidade`, `Peso`, `Impostos - Valores`, `Impostos - Alíquotas` |
| 4 | `TRIBUTO` | Métrica específica dentro do grupo (ex: `Câmbio`, `II - Valor`, `SUBTOTAL IPI`) |
| 5 | `PLU` | `SEQPRODUTO`/`CODIGO` — vazio nas linhas de capa/despesa (não são por produto) |
| 6 | `DESCRICAO` | Descrição completa do produto — idem, vazio nas linhas de capa/despesa |
| 7 | `VALOR_DUIMP` | Valor do lado DUIMP, já formatado (`R$ 1.234,56` / `7,65%` / número puro conforme o grupo) |
| 8 | `VALOR_C5` | Valor do lado ERP, mesma formatação |
| 9 | `DIFERENCA` | `VALOR_DUIMP − VALOR_C5`, mesma formatação |
| 10 | `STATUS` | `OK` / `DIVERGENTE` / `NAO_ENCONTRADO_NA_DUIMP` / `NAO_ENCONTRADO_NO_PEDIDO` / `DUIMP_NAO_VINCULADA_AO_PEDIDO` / `VINCULADA_A_OUTRO_PEDIDO` — vazio nas linhas de branco/subtotal |
| 11 | `PED` | `SEQPEDIDOIMPORT` — repetido em toda linha, mesmo papel do `NUMERODUIMP` |

Todas tipadas como `String` no Centura — os valores numéricos já chegam formatados em texto (`TO_CHAR` com `NLS_NUMERIC_CHARACTERS` pra vírgula decimal/ponto de milhar BR), então não dá pra usar tipo `Number` nesses campos.

---

## O que cada `GRUPO` compara

| GRUPO | TRIBUTO(s) | DUIMP (lado esquerdo) | ERP (lado direito) |
|---|---|---|---|
| `Despesas / Câmbio` | `Câmbio` | `NAGT_DUIMP_CAPA.COTACAODOLAR` | `MAD_PIPEDIDOIMPORT.TXCAMBIO` |
| | `Frete`, `Seguro`, `Taxa Siscomex` | `NAGT_DUIMP_CAPA.FRETE/SEGURO/TAXASISCOMEX` | `MAD_PIPEDDESPESA.VLRDESPESA` (via `MAD_PITIPOADIANTAMENTO`, por descrição `'FRETE INTERNACIONAL'`/`'SEGURO'`/`'TAXA SISCOMEX'`) |
| | `SUBTOTAL` | soma Frete+Seguro+Taxa Siscomex (DUIMP) | idem (ERP) |
| `Quantidade` | `Quantidade` | `SUM(NAGT_DUIMP_ITENS.QUANTIDADE)` agrupado por `CODIGO` | `MAD_PIPEDIMPORTPROD.QTDSOLICITADA` |
| `Peso` | `Peso (<embalagem>)` | peso total declarado ÷ nº de caixas do pedido (peso "por caixa" implícito) | `MAP_FAMEMBALAGEM.PESOLIQUIDO` (peso cadastrado da embalagem) |
| `Impostos - Valores` | `II/IPI/PIS/COFINS - Valor` + `SUBTOTAL <tributo>` | `SUM(VALORII/IPI/PIS/COFINS)` por produto | `VLRIMPIMPORT/VLRIPI/VLRPIS/VLRCOFINS` calculados pelo ERP |
| `Impostos - Alíquotas` | `II/IPI/PIS/COFINS - Aliq` | `MAX(ALIQUOTA...)` por produto | `PERIMPOSTIMPORT`/`PERALIQIPI` (direto) e PIS/COFINS efetivos via `MAP_TRIBUTACAOUF` (`PERPISDIF + PERMAJORACAOPISIMPORT`, idem COFINS) |

> [!warning] ICMS fora do confronto
> Não existe `ALIQUOTAICMS` nem `VALORICMS` por item no XML da DUIMP — só `BASECALCULOICMS` por item e o total `ICMS` na capa. Como o ERP calcula o próprio ICMS via `MAP_TRIBUTACAOUF` sem equivalente direto no XML, não há "outro lado" pra confrontar — por isso ICMS não aparece neste relatório.

---

## Status por métrica (não um status único)

Cada `TRIBUTO` tem seu **próprio** cálculo de `STATUS` (`STATUS_QTD`, `STATUS_PESO`, `STATUS_II_VALOR`, `STATUS_II_ALIQ`, etc. dentro da CTE `RELATORIO`) — **não** é um status agregado reaproveitado em todas as linhas. Isso corrigiu um bug da primeira versão: com um status único combinando todas as métricas, uma linha de "Quantidade" podia aparecer como `DIVERGENTE` só porque o COFINS daquele produto divergia, mesmo a quantidade batendo certinho.

Padrão de cada status:
```sql
CASE WHEN D.CODIGO IS NULL THEN 'NAO_ENCONTRADO_NA_DUIMP'
     WHEN E.CODIGO IS NULL THEN 'NAO_ENCONTRADO_NO_PEDIDO'
     WHEN ABS(NVL(<campo_duimp>,0) - NVL(<campo_c5>,0)) > <tolerância> THEN 'DIVERGENTE'
     ELSE 'OK' END
```
Tolerâncias usadas: `0.001` pra quantidade, `0.01` pra valores em R$ e percentuais, `0.1` pra peso por caixa, `0.0001` pra câmbio.

Para `Despesas / Câmbio`, o status (`STATUS_CAMBIO`, `STATUS_FRETE`, etc., na CTE `CAPA_UNICA`) também carrega a checagem de vínculo — se a DUIMP não estiver ligada ao pedido (`SEQPEDIDOIMPORT` nulo ou diferente de `:NR1`), todas as 4 linhas de despesa já acusam isso antes mesmo de comparar os valores.

---

## Linha em branco + subtotal

Para os grupos com valor em R$ (`Despesas / Câmbio` e cada tributo de `Impostos - Valores`), o `UNION ALL` insere uma linha em branco seguida de uma linha `SUBTOTAL` logo após as linhas de detalhe daquele grupo/tributo — soma simples (`SUM`) dos valores brutos (não dos textos já formatados). `Quantidade`, `Peso` e `Impostos - Alíquotas` não têm subtotal (somar percentual não faz sentido; quantidade/peso não foram pedidos).

O subtotal de impostos é **por tributo** (um `SUBTOTAL II`, um `SUBTOTAL IPI`, etc. — não um total único somando os 4 juntos).

---

## Ordenação (`ORD` / `ORDEM_GRUPO` / `ORDEM_TRIB`)

`ORDER BY NUMERODUIMP, ORD, ORDEM_GRUPO, PLU, ORDEM_TRIB`. `ORD` é o controle principal de ordem de exibição — usa valores fracionários (`2.1`, `7.1`, `7.2`...) pra encaixar linha em branco/subtotal logo depois do bloco relacionado, sem precisar renumerar os blocos existentes. Ordem atual: Despesas/Câmbio (+ subtotal) → Peso → Quantidade → Impostos-Alíquotas (II→IPI→PIS→COFINS) → Impostos-Valores (II + subtotal → IPI + subtotal → PIS + subtotal → COFINS + subtotal).

---

## Pendências

- [ ] **Despesas Aduaneiras** (`NAGT_DUIMP_CAPA.DESPESASADUANEIRAS`) — ainda não confrontada; depende de existir (ou não) um tipo de adiantamento correspondente em `MAD_PITIPOADIANTAMENTO` no lado do ERP. Aguardando confirmação.
- [ ] **Conferência Interna (Capa x Itens)** — desenhado mas ainda **não incluído** no `Comparativo.sql` atual: comparar `NAGT_DUIMP_CAPA.TOTALMATERIAISDOLAR` contra `SUM(QUANTIDADE × VALORUNITARIODOLAR)` dos itens, e `NAGT_DUIMP_CAPA.VMLD` contra `SUM(BASECALCULOII)` dos itens — essa segunda comparação parte da observação (não confirmada em documentação oficial) de que `VMLD` parece corresponder ao "Valor Aduaneiro" (bateu exatamente com `BASECALCULOII` no XML de exemplo usado).

---

## Layout (Centura Report Builder)

> [!todo] Print do layout
> 

![[Pasted image 20261005102253.png]] 
