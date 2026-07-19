---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Produtividade]]"
  - "[[MTTR]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Técnico atribuído: `tu."type" = 2`. `actiontime` em segundos — dividir por 3600 para horas. Colunas VARCHAR usam [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.

Métricas de **produtividade individual** dos técnicos.

---

## Chamados Resolvidos por Técnico

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_resolvidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
  AND t."solvedate" >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_resolvidos DESC;
```

---

## Chamados Criados por Técnico (Abertura)

```sql
SELECT
    u."id"                                                        AS usuario_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS usuario_nome,
    COUNT(t."id")                                                 AS qtd_criados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = t."users_id_recipient"
WHERE t."is_deleted" = 0
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_criados DESC;
```

---

## Chamados Atribuídos por Técnico

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_atribuidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_atribuidos DESC;
```

---

## Ranking de Produtividade

Volume resolvido + [[MTTR]] médio + satisfação em uma única visão.

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_resolvidos,
    ROUND(AVG((t."solvedate" - t."date") * 24), 1)                 AS tempo_medio_resolucao_horas,
    ROUND(AVG(ts."satisfaction"), 1)                               AS satisfacao_media
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_ticketsatisfactions"@DBL_ORCL_TO_MYSQL ts ON ts."tickets_id" = t."id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_resolvidos DESC;
```

---

## Tempo Médio Gasto por Técnico

Baseado em `glpi_tickettasks.actiontime` (tempo lançado em tarefas, em segundos).

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    ROUND(SUM(tt."actiontime") / 3600, 1)                         AS horas_gastas_total,
    ROUND(AVG(tt."actiontime") / 60, 1)                           AS minutos_medios_por_tarefa
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tt."users_id_tech"
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY horas_gastas_total DESC;
```

---

## Horas Trabalhadas por Dia

```sql
SELECT
    TRUNC(tt."date")                      AS dia,
    ROUND(SUM(tt."actiontime") / 3600, 1)  AS horas_trabalhadas
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
GROUP BY TRUNC(tt."date")
ORDER BY dia;
```

---

## Reaberturas por Técnico

Chamados que saíram de Resolvido/Fechado para status ativo — agrupados pelo técnico atribuído.

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT l."items_id")                                  AS qtd_reaberturas
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t ON t."id" = l."items_id"
     AND hs_str(l."itemtype") = 'Ticket'
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE hs_str(l."itemtype_link") = 'Ticket'
  AND hs_str(l."old_value") IN ('Resolvido', 'Fechado', 'Solved', 'Closed')
  AND hs_str(l."new_value") NOT IN ('Resolvido', 'Fechado', 'Solved', 'Closed')
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_reaberturas DESC;
```
