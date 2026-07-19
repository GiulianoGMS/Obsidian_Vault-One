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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Chamados fechados: `status = 6`. Campo `close_delay_stat`: positivo = [[SLA]] perdido, zero ou negativo = cumprido. Subtração de datas Oracle retorna dias fracionários — multiplicar por 24 para horas, por 1440 para minutos.

Métricas de **[[SLA]]** — cumprimento, perda por equipe/prioridade/categoria, [[MTTA]] (tempo até primeiro atendimento) e [[MTTR]] (tempo médio de resolução).

---

## SLA Cumprido × Perdido

Visão geral do cumprimento do [[SLA]] para todos os chamados fechados.

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

Percentual de cumprimento do [[SLA]] por grupo responsável — identifica equipes com maior taxa de perda.

```sql
SELECT
    g."name"                                                                    AS grupo_nome,
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)                  AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END)                  AS perdidos,
    ROUND(100 * SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)
          / NULLIF(COUNT(t."id"), 0), 1)                                       AS pct_cumprimento
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo — confirme o código no seu ambiente */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY g."id", g."name"
ORDER BY pct_cumprimento ASC;
```

---

## SLA por Prioridade

Identifica se as prioridades mais altas têm maior taxa de perda — validação da efetividade do processo de triagem.

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

Tipos de chamado com maior perda de [[SLA]] — indica categorias que precisam de revisão nos prazos ou na capacidade de atendimento.

```sql
SELECT
    COALESCE(c."completename", 'Sem categoria')                AS categoria,
    SUM(CASE WHEN t."close_delay_stat" <= 0 THEN 1 ELSE 0 END) AS cumpridos,
    SUM(CASE WHEN t."close_delay_stat" > 0  THEN 1 ELSE 0 END) AS perdidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
  AND t."time_to_resolve" IS NOT NULL
GROUP BY COALESCE(c."completename", 'Sem categoria')
ORDER BY perdidos DESC;
```

---

## MTTA — Tempo até Primeiro Atendimento

[[MTTA]] (Mean Time to Acknowledge): tempo médio entre abertura e o primeiro "tomada em conta" (`takeintoaccountdate`). Indica agilidade no reconhecimento do chamado.

```sql
SELECT
    ROUND(AVG((t."takeintoaccountdate" - t."date") * 1440), 1) AS mtta_minutos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."takeintoaccountdate" IS NOT NULL;
```

---

## MTTR — Tempo Médio de Resolução

[[MTTR]] (Mean Time to Resolve): tempo médio entre abertura e resolução (`solvedate`). Métrica central de eficiência operacional.

```sql
SELECT
    ROUND(AVG((t."solvedate" - t."date") * 24), 1) AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL;
```

---

## Tempo Médio até Fechamento

Tempo médio entre abertura e fechamento definitivo (`closedate`). Diferente do [[MTTR]] — inclui o período de aprovação de solução pelo solicitante.

```sql
SELECT
    ROUND(AVG((t."closedate" - t."date") * 24), 1) AS tempo_medio_fechamento_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."closedate" IS NOT NULL;
```
