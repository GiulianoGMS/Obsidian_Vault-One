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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Técnico atribuído: `tu."type" = 2` em `glpi_tickets_users` (confirme com `SELECT DISTINCT "type" FROM "glpi_tickets_users"@DBL_ORCL_TO_MYSQL`). Tempo de tarefas em `actiontime` (segundos): dividir por 3600 para horas, por 60 para minutos.

Métricas de **produtividade individual** dos técnicos: chamados resolvidos, tempo de atendimento, satisfação e reaberturas.

---

## Chamados Resolvidos por Técnico

Contagem de chamados com `solvedate` preenchido por técnico atribuído em 2025.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    COUNT(DISTINCT t."id")                AS qtd_resolvidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
  AND t."solvedate" >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_resolvidos DESC;
```

---

## Chamados Criados por Técnico (Abertura)

Quem abriu mais chamados — identifica técnicos que também atuam como solicitantes ou centralizam o registro.

```sql
SELECT
    u."id"                                AS usuario_id,
    u."firstname" || ' ' || u."realname"  AS usuario_nome,
    COUNT(t."id")                         AS qtd_criados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = t."users_id_recipient"
WHERE t."is_deleted" = 0
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_criados DESC;
```

---

## Chamados Atribuídos por Técnico

Total de chamados já atribuídos (histórico completo, independente de status). Visão da distribuição de carga ao longo do tempo.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    COUNT(DISTINCT t."id")                AS qtd_atribuidos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_atribuidos DESC;
```

---

## Ranking de Produtividade

Combina volume de resolução, [[MTTR]] médio e satisfação em uma única visão — base para avaliação de desempenho.

```sql
SELECT
    u."id"                                              AS tecnico_id,
    u."firstname" || ' ' || u."realname"                AS tecnico_nome,
    COUNT(DISTINCT t."id")                              AS qtd_resolvidos,
    ROUND(AVG((t."solvedate" - t."date") * 24), 1)       AS tempo_medio_resolucao_horas,
    ROUND(AVG(ts."satisfaction"), 1)                     AS satisfacao_media
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_ticketsatisfactions"@DBL_ORCL_TO_MYSQL ts ON ts."tickets_id" = t."id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_resolvidos DESC;
```

---

## Tempo Médio Gasto por Técnico

Baseado em `glpi_tickettasks.actiontime` (tempo registrado em tarefas, em segundos). Diferente do [[MTTR]] — é o tempo efetivamente lançado, não o tempo de calendário.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    ROUND(SUM(tt."actiontime") / 3600, 1) AS horas_gastas_total,
    ROUND(AVG(tt."actiontime") / 60, 1)   AS minutos_medios_por_tarefa
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tt."users_id_tech"
GROUP BY u."id", u."firstname", u."realname"
ORDER BY horas_gastas_total DESC;
```

---

## Horas Trabalhadas por Dia

Soma do `actiontime` de todas as tarefas agrupado por dia — visão da carga operacional diária da equipe.

```sql
SELECT
    TRUNC(tt."date")                    AS dia,
    ROUND(SUM(tt."actiontime") / 3600, 1) AS horas_trabalhadas
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
GROUP BY TRUNC(tt."date")
ORDER BY dia;
```

---

## Reaberturas por Técnico

Chamados que saíram de Resolvido/Fechado e voltaram para status ativo, agrupados pelo técnico atribuído. Alta taxa de reabertura indica resolução incompleta.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    COUNT(DISTINCT l."items_id")          AS qtd_reaberturas
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t ON t."id" = l."items_id" AND l."itemtype" = 'Ticket'
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE l."itemtype_link" = 'Ticket'
  AND l."old_value" IN ('Resolvido', 'Fechado', 'Solved', 'Closed')
  AND l."new_value" NOT IN ('Resolvido', 'Fechado', 'Solved', 'Closed')
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_reaberturas DESC;
```
