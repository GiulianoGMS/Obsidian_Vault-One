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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Técnico atribuído: `tu."type" = 2`. Status fechado: `6`. Pendente: `4`. Subtração de datas retorna dias — ×1440 para minutos, ×24 para horas. Colunas VARCHAR usam [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.
>
> **Ator técnico:** `tu."type" = 2` (confirme com `SELECT DISTINCT "type" FROM "glpi_tickets_users"@DBL_ORCL_TO_MYSQL`).

Visão **por técnico** de carga, chamados pendentes, fechados e tempos médios ([[MTTA]] e [[MTTR]]).

---

## Distribuição de Chamados por Técnico

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_chamados DESC;
```

---

## Chamados Pendentes por Técnico

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_pendentes
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."status" = 4
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_pendentes DESC;
```

---

## Chamados Fechados por Técnico

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_fechados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."status" = 6
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_fechados DESC;
```

---

## MTTA por Técnico

[[MTTA]] em minutos — tempo médio até o técnico tomar ciência do chamado.

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    ROUND(AVG((t."takeintoaccountdate" - t."date") * 1440), 1)    AS mtta_minutos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."takeintoaccountdate" IS NOT NULL
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY mtta_minutos;
```

---

## MTTR por Técnico

[[MTTR]] em horas — tempo médio de resolução por técnico.

```sql
SELECT
    u."id"                                                        AS tecnico_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS tecnico_nome,
    ROUND(AVG((t."solvedate" - t."date") * 24), 1)                AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 2  /* AJUSTE: ator técnico */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY mttr_horas;
```
