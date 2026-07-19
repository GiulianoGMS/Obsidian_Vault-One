---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Qualidade]]"
  - "[[Reaberturas]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Reaberturas detectadas via `glpi_logs` — transições de status Resolvido/Fechado para qualquer status ativo. Duplicatas via `glpi_tickets_tickets`. Problemas recorrentes via `glpi_problems_tickets`.
>
> **Limitação:** `FULLTEXT MATCH...AGAINST` do [[MySQL]] não atravessa o [[DBLink]] de forma confiável — selects de "top palavras" usam `REGEXP_LIKE` como aproximação. Para ranking real de frequência, extrair os dados para camada de BI.

Indicadores de **qualidade do atendimento**: reaberturas, reincidências, chamados duplicados, problemas recorrentes e busca por palavras-chave nos títulos/descrições.

---

## Chamados Reabertos

Contagem de chamados distintos que saíram de Resolvido ou Fechado e voltaram para um status ativo.

```sql
SELECT
    COUNT(DISTINCT l."items_id") AS qtd_chamados_reabertos
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket'
  AND l."itemtype_link" = 'Ticket'
  AND l."old_value" IN ('Resolvido', 'Fechado', 'Solved', 'Closed')
  AND l."new_value" NOT IN ('Resolvido', 'Fechado', 'Solved', 'Closed');
```

---

## Chamados Reincidentes

Solicitantes com 3 ou mais chamados na mesma categoria nos últimos 90 dias — indica problema recorrente não resolvido na raiz.

```sql
SELECT
    u."id"                                AS solicitante_id,
    u."firstname" || ' ' || u."realname"  AS solicitante_nome,
    c."completename"                       AS categoria,
    COUNT(DISTINCT t."id")                 AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu ON tu."tickets_id" = t."id" AND tu."type" = 1
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
  AND t."date" >= TRUNC(SYSDATE) - 90
GROUP BY u."id", u."firstname", u."realname", c."completename"
HAVING COUNT(DISTINCT t."id") >= 3
ORDER BY qtd_chamados DESC;
```

---

## Chamados Duplicados

Lista de pares de tickets vinculados como duplicatas via `glpi_tickets_tickets`. Campo `link` indica o tipo de relação.

```sql
SELECT
    tt."id", tt."tickets_id_1", t1."name" AS ticket_1_nome,
    tt."tickets_id_2", t2."name" AS ticket_2_nome,
    tt."link"
FROM "glpi_tickets_tickets"@DBL_ORCL_TO_MYSQL tt
JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t1 ON t1."id" = tt."tickets_id_1"
JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t2 ON t2."id" = tt."tickets_id_2"
ORDER BY tt."id" DESC;
```

---

## Top Problemas Recorrentes

Problemas cadastrados no [[GLPI]] com maior número de chamados vinculados — candidatos à criação de base de conhecimento ou correção estrutural.

```sql
SELECT
    p."id", p."name" AS problema_nome,
    COUNT(pt."tickets_id") AS qtd_chamados_vinculados
FROM "glpi_problems"@DBL_ORCL_TO_MYSQL p
JOIN "glpi_problems_tickets"@DBL_ORCL_TO_MYSQL pt ON pt."problems_id" = p."id"
WHERE p."is_deleted" = 0
GROUP BY p."id", p."name"
ORDER BY qtd_chamados_vinculados DESC
FETCH FIRST 20 ROWS ONLY;
```

---

## Busca por Palavras nos Títulos

Aproximação via `REGEXP_LIKE` (processado no lado Oracle após trazer as linhas). Exemplo: tickets com "erro" E "impressora" no título.

> [!warning] Limitação de DBLink
> `FULLTEXT MATCH...AGAINST` do [[MySQL]] não é suportado via [[DBLink]]. Para ranking real de frequência de palavras, extrair `t."name"` para [[Power Query]] ou [[Python]] e tokenizar na camada de [[BI]].

```sql
SELECT t."id", t."name"
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND REGEXP_LIKE(t."name", 'erro', 'i')
  AND REGEXP_LIKE(t."name", 'impressora', 'i');
```

---

## Busca por Palavras nas Descrições

Similar ao anterior, mas aplicado ao campo `content` (descrição/corpo do chamado). Exemplo: tickets com "lentidão" e "rede".

```sql
SELECT t."id", t."content"
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND REGEXP_LIKE(t."content", 'lentidão', 'i')
  AND REGEXP_LIKE(t."content", 'rede', 'i');
```
