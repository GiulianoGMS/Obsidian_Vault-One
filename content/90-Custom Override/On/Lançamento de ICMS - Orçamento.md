---
Language:
  - "[[SQL]]"
Repository:
  - "[[DQL-Oracle]]"
Squads:
  - "[[Orçamento]]"
  - "[[TI]]"
System:
  - "[[PLSQL-ERP-Consinco]]"
Open Tags:
  - "[[NFe de Despesa]]"
  - "[[Orçamento]]"
  - "[[Financeiro]]"
Date:
Type:
Project:
tags:
  - custom_override
  - reapply
Aplicado 26..017: true
---
**Contexto**: Atualmente, o [[PLSQL-ERP-Consinco]] popula o campo sobre ICMS no lançamento de notas pelo [[Modulo]] [[Orçamento]] sem respeitar as configurações de despesas. O ICMS precisa ser lançado conforme a parametrização da despesa na empresa.

- **NORMAL**: ICMS na coluna normal
- **ISENTO**: ICMS na coluna isento
- **OUTROS**: ICMS na coluna outros

Para corrigir o cenário, foi ajustado a [[Package]] PKG_OR_IMPORTACAOXMLNF, oficial da TOTVS, **linhas** 860 à 893, acrescentando um CASE WHEN para definir quando será populado o campo. Código:

```sql
            --/////// Tratativas TipTributacao Giuliano 31/03/2025
         (CASE WHEN (I.ALIQICMS IS NULL AND I.VLRBASEICMS IS NULL) OR (I.ALIQICMS = 0 AND I.VLRBASEICMS = 0) THEN
                   NULL
              ELSE
                   0
         END), --VLR ISENTO ICMS
         CASE WHEN NVL(vsTipoTributacao,'X') = 'O' THEN NVL(I.VLRTOTAL, 0) + NVL(I.VLRFRETE,0) ELSE 
         (CASE WHEN (I.ALIQICMS IS NULL AND I.VLRBASEICMS IS NULL) OR (I.ALIQICMS = 0 AND I.VLRBASEICMS = 0) THEN
                   NULL
              ELSE
                   0
         END)
         END, --VLR OUTRAS ICMS
         
         CASE WHEN NVL(vsTipoTributacao,'X') = 'O' THEN NULL ELSE 
         (CASE WHEN I.VLRBASEICMS IS NULL OR I.VLRBASEICMS = 0 THEN
                     NULL
               ELSE
                    I.VLRBASEICMS
         END)
         END,
         
         CASE WHEN NVL(vsTipoTributacao,'X') = 'O' THEN NULL ELSE 
         (CASE WHEN (I.ALIQICMS IS NULL AND I.VLRBASEICMS IS NULL) OR (I.ALIQICMS = 0 AND I.VLRBASEICMS = 0) THEN
                   NULL
              ELSE
                   NVL(I.VLRICMS, 0)
         END)
         END,
         
         CASE WHEN NVL(vsTipoTributacao,'X') = 'O' THEN 0 ELSE 
         (CASE WHEN I.ALIQICMS IS NULL OR I.ALIQICMS = 0 THEN
                    NULL
               ELSE
                  I.ALIQICMS
          END)
         END,
          
         --//////// Termina ICMS
```
[[Procedure]] na versão 25.07.022 disponível no [Github](https://github.com/GiulianoGMS/Official_Ora_Obj_Changes/blob/main/PKG_OR_IMPORTACAOXMLNF.pck).