---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Categorias]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Categorias em `glpi_itilcategories` com hierarquia via `itilcategories_id` (pai) e `level`. `completename` já contém o caminho completo (`Pai > Filho`). Window function `SUM() OVER ()` calcula o total global para percentuais — suportada em Oracle nativamente.

Análise de **categorias de chamados**: distribuição, hierarquia pai/filho, evolução mensal, crescimento e análise de Pareto.

---

## Chamados por Categoria

Distribuição total por categoria — base para identificar os tipos de problema mais recorrentes.

```sql
SELECT
    COALESCE(c."completename", 'Sem categoria') AS categoria,
    COUNT(t."id")                               AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
GROUP BY COALESCE(c."completename", 'Sem categoria')
ORDER BY qtd_chamados DESC;
```

---

## Chamados por Subcategoria

Detalha apenas itens com `level > 1` (subcategorias) e exibe o nome da categoria pai — útil para análise hierárquica.

```sql
SELECT
    c."name"     AS subcategoria,
    pai."name"   AS categoria_pai,
    COUNT(t."id") AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id" AND c."level" > 1
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL pai ON pai."id" = c."itilcategories_id"
WHERE t."is_deleted" = 0
GROUP BY c."id", c."name", pai."name"
ORDER BY qtd_chamados DESC;
```

---

## Evolução por Categoria

Combina mês e categoria — alimenta heatmap ou gráfico de área empilhada mostrando como cada tipo evolui ao longo do tempo.

```sql
SELECT
    TO_CHAR(t."date", 'YYYY-MM')                AS mes,
    COALESCE(c."completename", 'Sem categoria') AS categoria,
    COUNT(t."id")                                AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
GROUP BY TO_CHAR(t."date", 'YYYY-MM'), COALESCE(c."completename", 'Sem categoria')
ORDER BY mes, qtd_chamados DESC;
```

---

## Categorias que Mais Cresceram

Compara o mês atual com o anterior — identifica categorias em tendência de alta que exigem atenção imediata.

```sql
SELECT
    categoria,
    SUM(CASE WHEN mes = TO_CHAR(SYSDATE, 'YYYY-MM') THEN qtd ELSE 0 END)                            AS mes_atual,
    SUM(CASE WHEN mes = TO_CHAR(ADD_MONTHS(SYSDATE, -1), 'YYYY-MM') THEN qtd ELSE 0 END)             AS mes_anterior,
    SUM(CASE WHEN mes = TO_CHAR(SYSDATE, 'YYYY-MM') THEN qtd ELSE 0 END)
      - SUM(CASE WHEN mes = TO_CHAR(ADD_MONTHS(SYSDATE, -1), 'YYYY-MM') THEN qtd ELSE 0 END)         AS variacao_absoluta
FROM (
    SELECT
        TO_CHAR(t."date", 'YYYY-MM')                AS mes,
        COALESCE(c."completename", 'Sem categoria') AS categoria,
        COUNT(t."id")                                AS qtd
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
    WHERE t."is_deleted" = 0
      AND t."date" >= ADD_MONTHS(TRUNC(SYSDATE), -2)
    GROUP BY TO_CHAR(t."date", 'YYYY-MM'), COALESCE(c."completename", 'Sem categoria')
)
GROUP BY categoria
ORDER BY variacao_absoluta DESC;
```

---

## Pareto de Categorias

Percentual individual e acumulado por categoria — identifica quais 20% das categorias geram 80% dos chamados (Princípio de Pareto).

```sql
SELECT
    categoria,
    qtd_chamados,
    ROUND(100 * qtd_chamados / SUM(qtd_chamados) OVER (), 2)                                  AS pct_individual,
    ROUND(100 * SUM(qtd_chamados) OVER (ORDER BY qtd_chamados DESC)
          / SUM(qtd_chamados) OVER (), 2)                                                      AS pct_acumulado
FROM (
    SELECT
        COALESCE(c."completename", 'Sem categoria') AS categoria,
        COUNT(t."id")                                AS qtd_chamados
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
    WHERE t."is_deleted" = 0
    GROUP BY COALESCE(c."completename", 'Sem categoria')
)
ORDER BY qtd_chamados DESC;
```
