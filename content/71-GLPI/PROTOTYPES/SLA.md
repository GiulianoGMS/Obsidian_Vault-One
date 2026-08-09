---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[SLA]]"
  - "[[MTTA]]"
  - "[[MTTR]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Chamados fechados: `status = 6`. Campo `close_delay_stat`: positivo = [[SLA]] perdido, zero ou negativo = cumprido. Colunas VARCHAR usam [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.

Métricas de **[[SLA]]** — cumprimento, perda por equipe/prioridade/categoria, [[MTTA]] e [[MTTR]].

---

## SLA Cumprido × Perdido

```sql
SELECT
    CASE WHEN t."close_delay_stat" > 0 THEN 'SLA Perdido' ELSE 'SLA Cumprido' END AS resultado_sla,
    COUNT(t."id")                                                                 AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY CASE WHEN t."close_delay_stat" > 0 THEN 'SLA Perdido' ELSE 'SLA Cumprido' END;
```

---

## SLA por Equipe

```sql
SELECT
    hs_str(g."name")                                                                    AS grupo_nome,
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)                          AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END)                          AS perdidos,
    ROUND(100 * SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)
          / NULLIF(COUNT(t."id"), 0), 1)                                               AS pct_cumprimento
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

## SLA por Prioridade

```sql
SELECT
    t."priority",
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END) AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END) AS perdidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY t."priority"
ORDER BY t."priority" DESC;
```

---

## SLA por Categoria

```sql
SELECT
    COALESCE(hs_str(c."completename"), 'Sem categoria')        AS categoria,
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END) AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END) AS perdidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY COALESCE(hs_str(c."completename"), 'Sem categoria')
ORDER BY perdidos DESC;
```

---

## MTTA — Tempo até Primeiro Atendimento

[[MTTA]] (Mean Time to Acknowledge): tempo médio em minutos entre abertura e `takeintoaccountdate`.

```sql
SELECT
    ROUND(AVG((t."takeintoaccountdate" - t."date") * 1440), 1) AS mtta_minutos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."takeintoaccountdate" IS NOT NULL;
```

---

## MTTR — Tempo Médio de Resolução

[[MTTR]] (Mean Time to Resolve): tempo médio em horas entre abertura e `solvedate`.

```sql
SELECT
    ROUND(AVG((t."solvedate" - t."date") * 24), 1) AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL;
```

---

## Tempo Médio até Fechamento

Inclui o período de aprovação de solução pelo solicitante — diferente do [[MTTR]].

```sql
SELECT
    ROUND(AVG((t."closedate" - t."date") * 24), 1) AS tempo_medio_fechamento_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."closedate" IS NOT NULL;
```
