---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Backlog]]"
  - "[[SLA]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Status abertos no [[GLPI]]: `1=Novo`, `2=Em atendimento (atribuído)`, `3=Em atendimento (planejado)`, `4=Pendente`.
> 
> **Ator grupo:** `gt."type" = 2` (confirme no seu ambiente com `SELECT DISTINCT "type" FROM "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL`).

Visão do **[[Backlog]] atual** — chamados não finalizados por equipe, técnico, categoria, prioridade, idade e [[SLA]].

---

## Backlog Atual (Consolidado)

Resumo geral por status — snapshot instantâneo do volume em aberto.

```sql
SELECT
    COUNT(t."id")                                          AS backlog_total,
    SUM(CASE WHEN t."status" = 1 THEN 1 ELSE 0 END)        AS qtd_novo,
    SUM(CASE WHEN t."status" = 2 THEN 1 ELSE 0 END)        AS qtd_em_atendimento_atribuido,
    SUM(CASE WHEN t."status" = 3 THEN 1 ELSE 0 END)        AS qtd_em_atendimento_planejado,
    SUM(CASE WHEN t."status" = 4 THEN 1 ELSE 0 END)        AS qtd_pendente
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4);
```

---

## Backlog por Equipe

Chamados em aberto distribuídos por grupo responsável. Indica sobrecarga de equipe.

```sql
SELECT
    g."id"               AS grupo_id,
    g."name"              AS grupo_nome,
    COUNT(DISTINCT t."id") AS backlog_qtd
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_groups_tickets"@DBL_ORCL_TO_MYSQL gt
     ON gt."tickets_id" = t."id" AND gt."type" = 2  /* AJUSTE: ator grupo — confirme o código no seu ambiente */
JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = gt."groups_id"
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY g."id", g."name"
ORDER BY backlog_qtd DESC;
```

---

## Backlog por Técnico

Chamados em aberto por técnico atribuído — identifica desequilíbrio de distribuição.

```sql
SELECT
    u."id"                                     AS tecnico_id,
    u."firstname" || ' ' || u."realname"       AS tecnico_nome,
    COUNT(DISTINCT t."id")                     AS backlog_qtd
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico — confirme o código no seu ambiente */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY u."id", u."firstname", u."realname"
ORDER BY backlog_qtd DESC;
```

---

## Backlog por Categoria

Revela categorias/tipos de problema que mais acumulam chamados sem resolução.

```sql
SELECT
    COALESCE(c."completename", 'Sem categoria') AS categoria,
    COUNT(t."id")                                AS backlog_qtd
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY COALESCE(c."completename", 'Sem categoria')
ORDER BY backlog_qtd DESC;
```

---

## Backlog por Prioridade

Distribuição do backlog por nível de prioridade — permite priorizar triagem.

Prioridades: `1=Muito Baixa`, `2=Baixa`, `3=Média`, `4=Alta`, `5=Muito Alta`, `6=Major`.

```sql
SELECT
    t."priority",
    CASE t."priority"
        WHEN 1 THEN 'Muito Baixa' WHEN 2 THEN 'Baixa' WHEN 3 THEN 'Media'
        WHEN 4 THEN 'Alta'        WHEN 5 THEN 'Muito Alta' WHEN 6 THEN 'Major'
        ELSE 'Nao definida'
    END                       AS prioridade_label,
    COUNT(t."id")             AS backlog_qtd
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY t."priority"
ORDER BY t."priority" DESC;
```

---

## Backlog por Idade

Faixas de antigüidade dos chamados em aberto. Identifica acúmulo de chamados antigos sem resolução.

```sql
SELECT
    CASE
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 1  THEN '0-1 dia'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 3  THEN '2-3 dias'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 7  THEN '4-7 dias'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 15 THEN '8-15 dias'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 30 THEN '16-30 dias'
        ELSE 'Mais de 30 dias'
    END                    AS faixa_idade,
    COUNT(t."id")          AS qtd_chamados,
    MIN(TRUNC(SYSDATE) - TRUNC(t."date")) AS ordenacao
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
GROUP BY CASE
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 1  THEN '0-1 dia'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 3  THEN '2-3 dias'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 7  THEN '4-7 dias'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 15 THEN '8-15 dias'
        WHEN TRUNC(SYSDATE) - TRUNC(t."date") <= 30 THEN '16-30 dias'
        ELSE 'Mais de 30 dias'
    END
ORDER BY ordenacao;
```

---

## Chamados Acima do SLA

Lista de chamados em aberto que já ultrapassaram o prazo de resolução (`time_to_resolve`).

```sql
SELECT
    t."id", t."name", t."status", t."priority",
    t."time_to_resolve"                              AS prazo_sla_ttr,
    ROUND((SYSDATE - t."time_to_resolve") * 24, 1)   AS horas_de_atraso
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
  AND t."time_to_resolve" IS NOT NULL
  AND t."time_to_resolve" < SYSDATE
ORDER BY horas_de_atraso DESC;
```

---

## Chamados Aguardando Usuário

Chamados em status Pendente (`status = 4`) com motivo de pendência relacionado ao usuário.

```sql
SELECT
    t."id", t."name", t."status", pr."name" AS motivo_pendencia
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_pendingreasons_items"@DBL_ORCL_TO_MYSQL pri
     ON pri."items_id" = t."id" AND pri."itemtype" = 'Ticket'
JOIN "glpi_pendingreasons"@DBL_ORCL_TO_MYSQL pr ON pr."id" = pri."pendingreasons_id"
WHERE t."is_deleted" = 0
  AND t."status" = 4
  AND pr."name" LIKE '%usuário%'
ORDER BY t."date_mod" DESC;
```

---

## Chamados Aguardando Fornecedor

Chamados pendentes com motivo de pendência relacionado a fornecedor externo.

```sql
SELECT
    t."id", t."name", t."status", pr."name" AS motivo_pendencia
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_pendingreasons_items"@DBL_ORCL_TO_MYSQL pri
     ON pri."items_id" = t."id" AND pri."itemtype" = 'Ticket'
JOIN "glpi_pendingreasons"@DBL_ORCL_TO_MYSQL pr ON pr."id" = pri."pendingreasons_id"
WHERE t."is_deleted" = 0
  AND t."status" = 4
  AND pr."name" LIKE '%fornecedor%'
ORDER BY t."date_mod" DESC;
```
