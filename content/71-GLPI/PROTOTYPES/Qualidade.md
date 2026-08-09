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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Reaberturas via `glpi_logs` — colunas `itemtype`, `old_value` e `new_value` são VARCHAR e requerem [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] no WHERE. Duplicatas via `glpi_tickets_tickets`. Problemas recorrentes via `glpi_problems_tickets`.
>
> **Limitação:** `FULLTEXT MATCH...AGAINST` do [[MySQL]] não atravessa o [[DBLink]] — busca usa `REGEXP_LIKE` como aproximação.

Indicadores de **qualidade do atendimento**: reaberturas, reincidências, chamados duplicados, problemas recorrentes e busca por palavras-chave.

---

## Chamados Reabertos

Contagem de chamados que saíram de Resolvido/Fechado e voltaram para status ativo.

```sql
SELECT
    COUNT(DISTINCT l."items_id") AS qtd_chamados_reabertos
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND hs_str(l."itemtype_link") = 'Ticket'
  AND hs_str(l."old_value") IN ('Resolvido', 'Fechado', 'Solved', 'Closed')
  AND hs_str(l."new_value") NOT IN ('Resolvido', 'Fechado', 'Solved', 'Closed');
```

---

## Chamados Reincidentes

Solicitantes com 3 ou mais chamados na mesma categoria nos últimos 90 dias.

```sql
SELECT
    u."id"                                                        AS solicitante_id,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")          AS solicitante_nome,
    hs_str(c."completename")                                      AS categoria,
    COUNT(DISTINCT t."id")                                        AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_tickets_users"@DBL_ORCL_TO_MYSQL tu
     ON tu."tickets_id" = t."id" AND tu."type" = 1  /* AJUSTE: ator solicitante */
JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u ON u."id" = tu."users_id"
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
  AND t."date" >= TRUNC(SYSDATE) - 90
GROUP BY u."id", hs_str(u."firstname"), hs_str(u."realname"), hs_str(c."completename")
HAVING COUNT(DISTINCT t."id") >= 3
ORDER BY qtd_chamados DESC;
```

---

## Chamados Duplicados

Pares de tickets vinculados como duplicatas via `glpi_tickets_tickets`.

```sql
SELECT
    tt."id",
    tt."tickets_id_1", hs_str(t1."name") AS ticket_1_nome,
    tt."tickets_id_2", hs_str(t2."name") AS ticket_2_nome,
    tt."link"
FROM "glpi_tickets_tickets"@DBL_ORCL_TO_MYSQL tt
JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t1 ON t1."id" = tt."tickets_id_1"
JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t2 ON t2."id" = tt."tickets_id_2"
ORDER BY tt."id" DESC;
```

---

## Top Problemas Recorrentes

Problemas com maior número de chamados vinculados — candidatos à base de conhecimento.

```sql
SELECT
    p."id",
    hs_str(p."name")        AS problema_nome,
    COUNT(pt."tickets_id")  AS qtd_chamados_vinculados
FROM "glpi_problems"@DBL_ORCL_TO_MYSQL p
JOIN "glpi_problems_tickets"@DBL_ORCL_TO_MYSQL pt ON pt."problems_id" = p."id"
WHERE p."is_deleted" = 0
GROUP BY p."id", hs_str(p."name")
ORDER BY qtd_chamados_vinculados DESC
FETCH FIRST 20 ROWS ONLY;
```

---

## Busca por Palavras nos Títulos

`REGEXP_LIKE` aplicado sobre `hs_str(t."name")` após remoção dos CHR(0).

> [!warning] Limitação de DBLink
> `FULLTEXT MATCH...AGAINST` do [[MySQL]] não é suportado via [[DBLink]]. Para ranking real de frequência, extrair para [[Power Query]] ou [[Python]] e tokenizar na camada de [[BI]].

```sql
SELECT
    t."id",
    hs_str(t."name") AS nome_chamado
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND REGEXP_LIKE(hs_str(t."name"), 'erro', 'i')
  AND REGEXP_LIKE(hs_str(t."name"), 'impressora', 'i');
```

---

## Busca por Palavras nas Descrições

```sql
SELECT
    t."id",
    hs_str(t."content") AS descricao
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND REGEXP_LIKE(hs_str(t."content"), 'lentidao', 'i')
  AND REGEXP_LIKE(hs_str(t."content"), 'rede', 'i');
```
