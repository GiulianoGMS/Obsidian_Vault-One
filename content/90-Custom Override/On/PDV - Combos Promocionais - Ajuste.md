---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Oracle]]"
Squads:
  - "[[30-Squad/Fiscal]]"
  - "[[Pricing]]"
System:
  - "[[PLSQL-Oracle]]"
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[Combos Promocionais]]"
Date:
Type: "[[Package]]"
Project:
tags:
  - reapply
  - custom_override
Aplicado 26..017: false
---
**Necessidade**: Reportado pelo time [[Fiscal]] que os XMLs de vendas que continham produtos em dinãmicas de [[Combos Promocionais]] (**Leve Pague/Leve xx Ganhe yy**) estavam gerando desconto no item final da compra, permitindo que o item saia à R$ 0,01 e consequentemente o imposto seja calculado com base neste valor.

**Ajuste:** Foi identificado que a mesma dinâmica quando era criada à partir do Monitor, gerava o desconto encima do combo inteiro e não apenas de um item. A diferença fazia com que a base de impostos  não fosse mais apenas R$ 0,01.

Para que o [[ERP]] desça as informações para o [[PDV]] da mesma forma do [[MonitorPDV]], foram ralizadas dois ajustes nas views: **MON_COMBO** e **MON_COMBOITEM**:

##### **MON_COMBO:**

```sql
CREATE OR REPLACE VIEW MON_COMBO AS
select seqpromocpdv seqcombo,
       descricao combo,
       dtainicio,
       dtafim,
       decode(status, 'A', 'S', 'N') ativo,
       nrobaseexportacao,
       CASE WHEN A.INDTIPOQTDCARGAPDV = 'L' THEN 2 ELSE 1 END TIPO,
       -- Se for leve pague
       CASE WHEN A.INDTIPOQTDCARGAPDV = 'L' THEN
             -- Se o percentual for menor que 90, retorna nulo, caos contrario retorna vlrdesc
             (SELECT CASE WHEN MAX(XI.PERCDESCONTO) < 90 THEN NULL ELSE
                     ROUND(MAX(PRECOVALIDNORMAL) * (MAX(XI.PERCDESCONTO)/100),2) - 0.01 END
                FROM MRL_PRODEMPSEG S INNER JOIN MFL_PROMOCPDVEMP E ON E.NROEMPRESA = S.NROEMPRESA
                                      INNER JOIN MAX_EMPRESA M ON M.NROEMPRESA = S.NROEMPRESA AND S.NROSEGMENTO = M.NROSEGMENTOPRINC
                                      INNER JOIN MFL_PROMOCPDVITEM XI ON XI.SEQPROMOCPDV = A.SEQPROMOCPDV AND XI.SEQPRODUTO = S.SEQPRODUTO
               WHERE E.SEQPROMOCPDV = A.SEQPROMOCPDV AND S.QTDEMBALAGEM = 1 AND PRECOVALIDNORMAL > 0 AND XI.PERCDESCONTO > 90) ELSE NULL END vlrdesconto,
       NULL PERCDESCONTO,
       null preco
  from mfl_promocaopdv A
 where indtipoqtdcargapdv in ('M', 'L')

```
##### **MON_COMBOITEM:**

```sql
create or replace view mon_comboitem as
select a.seqpromocpdv seqcombo,
       a.seqitempromoc seqitem,
       decode(a.promocporfamilia, 'S', a.seqfamilia, null) seqfamilia,
       decode(a.promocporfamilia, 'S', null, a.seqproduto) seqproduto,
       CASE WHEN B.INDTIPOQTDCARGAPDV = 'L' THEN 'N' ELSE a.tipoitempromoc END tipoitem,
       a.quantidade qtde,
       a.qtdembalagem,
       a.precoitem preco,
       CASE WHEN B.INDTIPOQTDCARGAPDV = 'L' THEN 0 ELSE a.percdesconto END PERDESCONTO,
       a.seqproduto seqprodutobase,
       cast(decode(a.seqgrupo, 0, null, a.seqgrupo) as number(3)) seqgrupo,
       decode(a.status, 'A', 'S', 'N') ativo,
       a.nrobaseexportacao,
       null vlrdesconto,
       null seqcategoria,
       null nrodivisao
  from mfl_promocpdvitem a INNER JOIN MFL_PROMOCAOPDV B ON B.SEQPROMOCPDV = A.SEQPROMOCPDV

```
