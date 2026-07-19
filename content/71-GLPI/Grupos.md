---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Grupos]]"
  - "[[SLA]]"
  - "[[MTTR]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Grupo responsável: `gt."type" = 2` em `glpi_groups_tickets` (confirme com `SELECT DISTINCT "type" FROM "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL`). Chamados fechados: `status = 6`. [[Backlog]]: `status IN (1,2,3,4)`.

Métricas **por grupo/equipe responsável**: distribuição de chamados, produtividade, [[SLA]] e [[Backlog]] por grupo.

---

## Chamados por Grupo Responsável

Volume total de chamados atribuídos a cada grupo — visão geral da carga por equipe.

```sql
SELECT
    g."name"                AS grupo_nome,
    COUNT(DISTINCT t."id")  AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
GROUP BY g."id", g."name"
ORDER BY qtd_chamados DESC;
```

---

## Produtividade por Grupo

Combina volume de chamados resolvidos e [[MTTR]] médio por grupo — comparativo de eficiência entre equipes.

```sql
SELECT
    g."name"                                            AS grupo_nome,
    COUNT(DISTINCT t."id")                              AS qtd_resolvidos,
    ROUND(AVG((t."solvedate" - t."date") * 24), 1)       AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY g."id", g."name"
ORDER BY qtd_resolvidos DESC;
```

---

## SLA por Grupo

Percentual de cumprimento do [[SLA]] por equipe — equivalente ao [[SLA por Equipe]] da seção [[SLA]], com cálculo de percentual incluído.

```sql
SELECT
    g."name"                                                                    AS grupo_nome,
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)                  AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END)                  AS perdidos,
    ROUND(100 * SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)
          / NULLIF(COUNT(t."id"), 0), 1)                                       AS pct_cumprimento
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY g."id", g."name"
ORDER BY pct_cumprimento ASC;
```

---

## Backlog por Grupo

Chamados em aberto por equipe — complementa a visão de [[Backlog]] global com granularidade por grupo.

```sql
SELECT
    g."name"                AS grupo_nome,
    COUNT(DISTINCT t."id")  AS backlog_qtd
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY g."id", g."name"
ORDER BY backlog_qtd DESC;
```
