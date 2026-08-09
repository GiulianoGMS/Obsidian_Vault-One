---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Dashboard]]"
  - "[[Tendência]]"
Date: 2026-07-18
Type: Project
---
> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Window functions (`AVG OVER`, `LAG`, `SUM OVER`) têm sintaxe idêntica ao Oracle. Colunas VARCHAR usam [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.

Selects para **dashboards executivos**: top assuntos, Pareto 80/20, tendência com média móvel, crescimento mensal/anual, heatmaps e painel consolidado de KPIs.

---

## Top 20 Assuntos

Os títulos de chamados mais repetidos — revela assuntos padronizados ou problemas recorrentes não categorizados.

```sql
SELECT
    hs_str(t."name") AS assunto,
    COUNT(t."id")     AS qtd_ocorrencias
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY hs_str(t."name")
ORDER BY qtd_ocorrencias DESC
FETCH FIRST 20 ROWS ONLY;
```

---

## Pareto 80/20 (por Categoria)

Percentual acumulado de chamados por categoria — identifica as poucas categorias que concentram a maior parte da demanda.

```sql
SELECT
    categoria,
    qtd_chamados,
    ROUND(100 * SUM(qtd_chamados) OVER (ORDER BY qtd_chamados DESC)
          / SUM(qtd_chamados) OVER (), 2) AS pct_acumulado
FROM (
    SELECT
        COALESCE(hs_str(c."completename"), 'Sem categoria') AS categoria,
        COUNT(t."id")                                        AS qtd_chamados
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
    WHERE t."is_deleted" = 0
    GROUP BY COALESCE(hs_str(c."completename"), 'Sem categoria')
)
ORDER BY qtd_chamados DESC;
```

---

## Tendência Mensal com Média Móvel

Volume mensal com [[média móvel]] de 3 meses — suaviza picos e revela tendência de longo prazo.

```sql
SELECT
    mes,
    qtd_chamados,
    AVG(qtd_chamados) OVER (
        ORDER BY mes
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS media_movel_3_meses
FROM (
    SELECT TO_CHAR(t."date", 'YYYY-MM') AS mes, COUNT(t."id") AS qtd_chamados
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    WHERE t."is_deleted" = 0
    GROUP BY TO_CHAR(t."date", 'YYYY-MM')
)
ORDER BY mes;
```

---

## Crescimento Mensal (%)

Compara cada mês com o anterior via `LAG()`.

```sql
SELECT
    mes,
    qtd_chamados,
    LAG(qtd_chamados) OVER (ORDER BY mes)                                           AS qtd_mes_anterior,
    ROUND(100 * (qtd_chamados - LAG(qtd_chamados) OVER (ORDER BY mes))
          / NULLIF(LAG(qtd_chamados) OVER (ORDER BY mes), 0), 1)                    AS crescimento_pct
FROM (
    SELECT TO_CHAR(t."date", 'YYYY-MM') AS mes, COUNT(t."id") AS qtd_chamados
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    WHERE t."is_deleted" = 0
    GROUP BY TO_CHAR(t."date", 'YYYY-MM')
)
ORDER BY mes;
```

---

## Crescimento Anual (%)

```sql
SELECT
    ano,
    qtd_chamados,
    LAG(qtd_chamados) OVER (ORDER BY ano)                                    AS qtd_ano_anterior,
    ROUND(100 * (qtd_chamados - LAG(qtd_chamados) OVER (ORDER BY ano))
          / NULLIF(LAG(qtd_chamados) OVER (ORDER BY ano), 0), 1)             AS crescimento_pct
FROM (
    SELECT EXTRACT(YEAR FROM t."date") AS ano, COUNT(t."id") AS qtd_chamados
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    WHERE t."is_deleted" = 0
    GROUP BY EXTRACT(YEAR FROM t."date")
)
ORDER BY ano;
```

---

## Heatmap Dia × Hora

Volume de chamados cruzando dia da semana e hora de abertura.

```sql
SELECT
    MOD(TRUNC(t."date") - TRUNC(t."date", 'IW'), 7) + 1         AS dia_semana_num,
    TO_CHAR(t."date", 'FMDAY', 'NLS_DATE_LANGUAGE=PORTUGUESE')  AS dia_semana_nome,
    TO_CHAR(t."date", 'HH24')                                   AS hora_do_dia,
    COUNT(t."id")                                               AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY MOD(TRUNC(t."date") - TRUNC(t."date", 'IW'), 7) + 1,
         TO_CHAR(t."date", 'FMDAY', 'NLS_DATE_LANGUAGE=PORTUGUESE'),
         TO_CHAR(t."date", 'HH24')
ORDER BY dia_semana_num, hora_do_dia;
```

---

## Heatmap Mês × Categoria

Intensidade de chamados por mês e categoria — identifica sazonalidade por tipo de problema.

```sql
SELECT
    TO_CHAR(t."date", 'YYYY-MM')                        AS mes,
    COALESCE(hs_str(c."completename"), 'Sem categoria') AS categoria,
    COUNT(t."id")                                        AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_itilcategories"@DBL_ORCL_TO_MYSQL c ON c."id" = t."itilcategories_id"
WHERE t."is_deleted" = 0
GROUP BY TO_CHAR(t."date", 'YYYY-MM'), COALESCE(hs_str(c."completename"), 'Sem categoria')
ORDER BY mes, categoria;
```

---

## Dashboard Executivo (KPIs Consolidados)

```sql
SELECT
    COUNT(t."id")                                                              AS total_chamados,
    SUM(CASE WHEN t."status" IN (1,2,3,4) THEN 1 ELSE 0 END)                  AS backlog_atual,
    SUM(CASE WHEN t."status" = 6 THEN 1 ELSE 0 END)                           AS total_fechados,
    ROUND(AVG(CASE WHEN t."solvedate" IS NOT NULL
        THEN (t."solvedate" - t."date") * 24 END), 1)                         AS mttr_horas_medio,
    ROUND(100 * SUM(CASE WHEN t."status" = 6 AND t."close_delay_stat" <= 0 THEN 1 ELSE 0 END)
        / NULLIF(SUM(CASE WHEN t."status" = 6 THEN 1 ELSE 0 END), 0), 1)      AS pct_sla_cumprido,
    (SELECT ROUND(AVG(ts."satisfaction"), 1)
       FROM "glpi_ticketsatisfactions"@DBL_ORCL_TO_MYSQL ts
       JOIN "glpi_tickets"@DBL_ORCL_TO_MYSQL t2
            ON t2."id" = ts."tickets_id" AND t2."is_deleted" = 0)             AS satisfacao_media
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."date" >= TRUNC(SYSDATE) - 30;
```
