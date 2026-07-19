---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Técnicos]]"
  - "[[MTTA]]"
  - "[[MTTR]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Técnico atribuído: `tu."type" = 2` em `glpi_tickets_users`. Status fechado: `status = 6`. Pendente: `status = 4`. Subtração de datas retorna dias fracionários — multiplicar por 1440 para minutos, por 24 para horas.

Visão **por técnico** de distribuição de carga, chamados pendentes, fechados e tempos médios de atendimento e resolução.

---

## Distribuição de Chamados por Técnico

Volume total de chamados atribuídos a cada técnico (todos os status). Identificação rápida de desequilíbrio de carga.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    COUNT(DISTINCT t."id")                AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_chamados DESC;
```

---

## Chamados Pendentes por Técnico

Chamados em `status = 4` (Pendente) por técnico — indica quem tem mais chamados aguardando resposta externa.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    COUNT(DISTINCT t."id")                AS qtd_pendentes
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."status" = 4
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_pendentes DESC;
```

---

## Chamados Fechados por Técnico

Chamados com `status = 6` por técnico — mede produção finalizada com fechamento confirmado pelo solicitante.

```sql
SELECT
    u."id"                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"  AS tecnico_nome,
    COUNT(DISTINCT t."id")                AS qtd_fechados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_fechados DESC;
```

---

## MTTA por Técnico

[[MTTA]] (Mean Time to Acknowledge) individual: tempo médio em minutos até o técnico tomar ciência do chamado. Técnicos com MTTA alto podem estar sobrecarregados ou com triagem ineficiente.

```sql
SELECT
    u."id"                                                AS tecnico_id,
    u."firstname" || ' ' || u."realname"                  AS tecnico_nome,
    ROUND(AVG((t."takeintoaccountdate" - t."date") * 1440), 1) AS mtta_minutos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."takeintoaccountdate" IS NOT NULL
GROUP BY u."id", u."firstname", u."realname"
ORDER BY mtta_minutos;
```

---

## MTTR por Técnico

[[MTTR]] (Mean Time to Resolve) individual: tempo médio em horas até o técnico marcar o chamado como resolvido. Indicador de eficiência individual de resolução.

```sql
SELECT
    u."id"                                            AS tecnico_id,
    u."firstname" || ' ' || u."realname"               AS tecnico_nome,
    ROUND(AVG((t."solvedate" - t."date") * 24), 1)      AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY u."id", u."firstname", u."realname"
ORDER BY mttr_horas;
```
