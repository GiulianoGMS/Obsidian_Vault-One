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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Grupo responsável: `gt."type" = 2`. Colunas VARCHAR usam [[_hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.
>
> **Ator grupo:** `gt."type" = 2` (confirme com `SELECT DISTINCT "type" FROM "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL`).

Chamados, produtividade, [[SLA]] e [[Backlog]] por **grupo responsável** (equipe técnica).

---

## Chamados por Grupo Responsável

```sql
SELECT
    g."id"                  AS grupo_id,
    hs_str(g."name")        AS grupo_nome,
    COUNT(DISTINCT t."id")  AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
GROUP BY g."id", hs_str(g."name")
ORDER BY qtd_chamados DESC;
```

---

## Produtividade por Grupo

```sql
SELECT
    g."id"                                                              AS grupo_id,
    hs_str(g."name")                                                    AS grupo_nome,
    COUNT(DISTINCT t."id")                                              AS qtd_resolvidos,
    ROUND(AVG((t."solvedate" - t."date") * 24), 1)                      AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY g."id", hs_str(g."name")
ORDER BY qtd_resolvidos DESC;
```

---

## SLA por Grupo

```sql
SELECT
    g."id"                                                                                AS grupo_id,
    hs_str(g."name")                                                                      AS grupo_nome,
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)                           AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END)                           AS perdidos,
    ROUND(100 * SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)
          / NULLIF(COUNT(t."id"), 0), 1)                                                 AS pct_cumprimento
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY g."id", hs_str(g."name")
ORDER BY pct_cumprimento ASC;
```

---

## Backlog por Grupo

```sql
SELECT
    g."id"                  AS grupo_id,
    hs_str(g."name")        AS grupo_nome,
    COUNT(DISTINCT t."id")  AS backlog_qtd
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY g."id", hs_str(g."name")
ORDER BY backlog_qtd DESC;
```

---

## Crescimento Percentual por Grupo (mês a mês)

```sql
SELECT
    grupo,
    mes,
    qtd_chamados,
    LAG(qtd_chamados) OVER (PARTITION BY grupo ORDER BY mes)                            AS qtd_mes_anterior,
    ROUND(100 * (qtd_chamados - LAG(qtd_chamados) OVER (PARTITION BY grupo ORDER BY mes))
          / NULLIF(LAG(qtd_chamados) OVER (PARTITION BY grupo ORDER BY mes), 0), 1)    AS crescimento_pct
FROM (
    SELECT
        hs_str(g."name")             AS grupo,
        TO_CHAR(t."date", 'YYYY-MM') AS mes,
        COUNT(t."id")                AS qtd_chamados
    FROM       "glpi_tickets"@DBL_ORCL_TO_MYSQL       t
    JOIN       "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt ON gt."tickets_id" = t."id"
                                                          AND gt."type"       = 2
    JOIN       "glpi_groups"@DBL_ORCL_TO_MYSQL         g  ON g."id"          = gt."groups_id"
    WHERE t."is_deleted" = 0
      AND g."name" NOT LIKE '%¿¿¿%'
    GROUP BY hs_str(g."name"), TO_CHAR(t."date", 'YYYY-MM')
)
ORDER BY grupo, mes DESC;
```

> Para grupo **requerente** (quem abriu), troque `gt."type" = 2` por `gt."type" = 1`.
