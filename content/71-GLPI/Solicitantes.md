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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Solicitante: `tu."type" = 1` em `glpi_tickets_users`. Departamento via `u."groups_id"` em `glpi_users`. Empresa/unidade via `t."entities_id"` ligado a `glpi_entities`. Localização via `t."locations_id"` ligado a `glpi_locations`.

Análise de **quem abre chamados**: top usuários, distribuição por departamento, empresa, localização e unidade organizacional.

---

## Usuários que Mais Abrem Chamados

Top 50 solicitantes por volume de chamados abertos. Base para identificar usuários com alta demanda de suporte.

```sql
SELECT
    u."id"                                AS solicitante_id,
    u."firstname" || ' ' || u."realname"  AS solicitante_nome,
    COUNT(DISTINCT t."id")                AS qtd_chamados_abertos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu ON tu."tickets_id" = t."id" AND tu."type" = 1
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
WHERE t."is_deleted" = 0
GROUP BY u."id", u."firstname", u."realname"
ORDER BY qtd_chamados_abertos DESC
FETCH FIRST 50 ROWS ONLY;
```

---

## Chamados por Departamento

Agrupa chamados pelo grupo do usuário solicitante — visão por área da empresa. Exige que os usuários estejam vinculados a grupos no [[GLPI]].

```sql
SELECT
    g."name"                AS departamento_grupo,
    COUNT(DISTINCT t."id")  AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu ON tu."tickets_id" = t."id" AND tu."type" = 1
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_groups"@DBL_ORCL_TO_MYSQL g ON g."id" = u."groups_id"
WHERE t."is_deleted" = 0
GROUP BY g."id", g."name"
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Empresa

Distribuição por entidade (`entities`) — útil em ambientes multi-empresa ou multi-filial no [[GLPI]].

```sql
SELECT
    e."completename" AS entidade_empresa,
    COUNT(t."id")     AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_entities"@DBL_ORCL_TO_MYSQL e ON e."id" = t."entities_id"
WHERE t."is_deleted" = 0
GROUP BY e."id", e."completename"
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Localização

Distribuição por localização física cadastrada no chamado — identifica locais com maior demanda de TI (filiais, andares, setores).

```sql
SELECT
    COALESCE(l."completename", 'Sem localizacao') AS localizacao,
    COUNT(t."id")                                  AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_locations"@DBL_ORCL_TO_MYSQL l ON l."id" = t."locations_id"
WHERE t."is_deleted" = 0
GROUP BY COALESCE(l."completename", 'Sem localizacao')
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Unidade

Similar ao select por empresa, mas exibe também `name` (nome curto) e `completename` (caminho hierárquico completo da entidade).

```sql
SELECT
    e."id", e."name" AS unidade_nome, e."completename" AS caminho_completo,
    COUNT(t."id")     AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_entities"@DBL_ORCL_TO_MYSQL e ON e."id" = t."entities_id"
WHERE t."is_deleted" = 0
GROUP BY e."id", e."name", e."completename"
ORDER BY qtd_chamados DESC;
```
