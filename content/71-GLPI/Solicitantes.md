---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Solicitantes]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Solicitante: `tu."type" = 1` em `glpi_tickets_users`. Departamento via `u."groups_id"` em `glpi_users`. Empresa via `t."entities_id"` → `glpi_entities`. Localização via `u."locations_id"` → `glpi_locations`. Colunas VARCHAR usam [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.

Análise de **quem abre chamados**: top solicitantes, departamento, empresa, localização e unidade.

---

## Top 50 Solicitantes

```sql
SELECT
    u."id"                                                        AS solicitante_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS solicitante_nome,
    COUNT(DISTINCT t."id")                                        AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 1  /* AJUSTE: ator solicitante */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname")
ORDER BY qtd_chamados DESC
FETCH FIRST 50 ROWS ONLY;
```

---

## Chamados por Departamento

Agrupa pelo grupo principal do usuário (`u."groups_id"`) como proxy de departamento.

```sql
SELECT
    g."id"                  AS departamento_id,
    hs_str(g."name")        AS departamento_nome,
    COUNT(DISTINCT t."id")  AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 1  /* AJUSTE: ator solicitante */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = u."groups_id"
WHERE t."is_deleted" = 0
GROUP BY g."id", hs_str(g."name")
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Empresa (Entidade)

```sql
SELECT
    e."id"                    AS empresa_id,
    hs_str(e."completename")  AS empresa_nome,
    COUNT(t."id")             AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_entities"@DBL_ORCL_TO_MYSQL e ON e."id" = t."entities_id"
WHERE t."is_deleted" = 0
GROUP BY e."id", hs_str(e."completename")
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Localização

```sql
SELECT
    COALESCE(hs_str(l."completename"), 'Sem localizacao') AS localizacao,
    COUNT(DISTINCT t."id")                                 AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 1  /* AJUSTE: ator solicitante */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_locations"@DBL_ORCL_TO_MYSQL l ON l."id" = u."locations_id"
WHERE t."is_deleted" = 0
GROUP BY COALESCE(hs_str(l."completename"), 'Sem localizacao')
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Unidade

Nome curto e caminho hierárquico completo da entidade.

```sql
SELECT
    e."id",
    hs_str(e."name")           AS unidade_nome,
    hs_str(e."completename")   AS caminho_completo,
    COUNT(t."id")              AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_entities"@DBL_ORCL_TO_MYSQL e ON e."id" = t."entities_id"
WHERE t."is_deleted" = 0
GROUP BY e."id", hs_str(e."name"), hs_str(e."completename")
ORDER BY qtd_chamados DESC;
```
