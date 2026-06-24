---
Language:
  - "[[SQL]]"
Repository:
  - "[[DQL-Oracle]]"
Squads:
  - "[[Fiscal]]"
  - "[[TI]]"
System:
  - "[[PLSQL-ERP-Consinco]]"
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[NFe]]"
  - "[[IPI]]"
Date: 2026-06-17
Type: "[[Procedure]]"
Project:
tags:
---

Ref GLPI **463190**

Necessidade de emissão do [[CST]] de [[IPI]] para determinadas operações que o [[PLSQL-ERP-Consinco]] não populava o campo.

Ajustado na [[Procedure]] **SP_EXPNFE_2g** no inicio do campo **M014_DM_ST_TRIB_IPI** adicionando o case abaixo:
```sql
 -- Giuliano 17/06/26
              -- Ticket 463190
              CASE WHEN A.CODGERALOPER IN (97,244,803,850) AND NAGF_BUSCA_CST_IPI_FAM(B.SEQFAMILIA) = '50'
                   THEN 10 ELSE
              case when fmap_familiafinalidade(b.seqfamilia, a.nroempresa) = 'S' then
                     null
              else
                  fRetornaSituacaoIpiOphos( A.SITUACAONFIPI, A.TIPDOCFISCAL )
              end 
              END  as M014_DM_ST_TRIB_IPI,
```

[[Function]] utilizada na regra do CASE: [NAGF_BUSCA_CST_IPI_FAM](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGF_BUSCA_CST_IPI_FAM.fnc).

Por ser um objeto oficial, precisa reaplicar após troca de [[versão]] do ERP