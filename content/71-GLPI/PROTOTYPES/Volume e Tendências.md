---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Chamados]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. O Oracle Heterogeneous Services busca as linhas remotas no [[MySQL]] do [[GLPI]]. Colunas e tabelas entre aspas duplas para preservar o case do MySQL. Datas usam funções Oracle: `SYSDATE`, `TRUNC`, `TO_CHAR`, `EXTRACT`.

Métricas de **volume e distribuição temporal** dos chamados: abertura, fechamento e evolução por dia, semana, mês, ano, dia da semana e hora.

---

## Chamados Abertos por Mês

Contagem por data de criação (`date`). Base de gráfico de linha gerencial.

```sql
SELECT
    TO_CHAR(t."date", 'YYYY-MM') AS mes_abertura,
    COUNT(t."id")                AS qtd_chamados_abertos
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."date" >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
GROUP BY TO_CHAR(t."date", 'YYYY-MM')
ORDER BY mes_abertura;
```

---

## Chamados Fechados por Mês

Agrupa pela data de fechamento (`closedate`). Compara com a abertura para identificar meses com resolução acelerada ou represada.

```sql
SELECT
    TO_CHAR(t."closedate", 'YYYY-MM') AS mes_fechamento,
    COUNT(t."id")                     AS qtd_chamados_fechados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."closedate" IS NOT NULL
  AND t."closedate" >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
GROUP BY TO_CHAR(t."closedate", 'YYYY-MM')
ORDER BY mes_fechamento;
```

---

## Abertos × Fechados por Mês

UNION dos dois selects anteriores — ideal para gráfico comparativo de linhas. Identifica meses onde o [[Backlog]] cresceu (abertos > fechados).

```sql
SELECT mes, 'Abertos' AS indicador, qtd FROM (
    SELECT TO_CHAR(t."date", 'YYYY-MM') AS mes, COUNT(t."id") AS qtd
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    WHERE t."is_deleted" = 0 AND t."date" >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
    GROUP BY TO_CHAR(t."date", 'YYYY-MM')
)
UNION ALL
SELECT mes, 'Fechados' AS indicador, qtd FROM (
    SELECT TO_CHAR(t."closedate", 'YYYY-MM') AS mes, COUNT(t."id") AS qtd
    FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
    WHERE t."is_deleted" = 0 AND t."closedate" IS NOT NULL
      AND t."closedate" >= TO_DATE('2025-01-01', 'YYYY-MM-DD')
    GROUP BY TO_CHAR(t."closedate", 'YYYY-MM')
)
ORDER BY mes, indicador;
```

---

## Evolução Diária

Granularidade diária — últimos 90 dias. Identifica picos pontuais (incidentes massivos, retornos de feriado).

```sql
SELECT
    TRUNC(t."date")  AS dia,
    COUNT(t."id")    AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."date" >= TRUNC(SYSDATE) - 90
GROUP BY TRUNC(t."date")
ORDER BY dia;
```

---

## Evolução Semanal

Semana ISO 8601 (segunda-feira como dia 1). Suaviza ruídos diários mantendo granularidade para identificar tendências.

```sql
SELECT
    TO_CHAR(t."date", 'IYYY-IW')  AS ano_semana,
    MIN(TRUNC(t."date", 'IW'))    AS inicio_semana,
    COUNT(t."id")                 AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."date" >= TRUNC(SYSDATE) - 364
GROUP BY TO_CHAR(t."date", 'IYYY-IW')
ORDER BY ano_semana;
```

---

## Evolução Anual

Visão macro para comparação entre anos — sazonalidade ou crescimento estrutural da demanda.

```sql
SELECT
    EXTRACT(YEAR FROM t."date") AS ano,
    COUNT(t."id")               AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY EXTRACT(YEAR FROM t."date")
ORDER BY ano;
```

---

## Chamados por Dia da Semana

ISO: 1=segunda…7=domingo. Fórmula `MOD(TRUNC - TRUNC('IW'), 7) + 1` é independente de `NLS_TERRITORY` — sem variação por configuração regional do Oracle.

```sql
SELECT
    MOD(TRUNC(t."date") - TRUNC(t."date", 'IW'), 7) + 1                      AS dia_semana_num,
    TO_CHAR(t."date", 'FMDAY', 'NLS_DATE_LANGUAGE=PORTUGUESE')               AS dia_semana_nome,
    COUNT(t."id")                                                             AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY MOD(TRUNC(t."date") - TRUNC(t."date", 'IW'), 7) + 1,
         TO_CHAR(t."date", 'FMDAY', 'NLS_DATE_LANGUAGE=PORTUGUESE')
ORDER BY dia_semana_num;
```

---

## Chamados por Hora do Dia

Distribuição por faixa horária — revela horários de pico e subsidia decisões de escala da equipe.

```sql
SELECT
    TO_CHAR(t."date", 'HH24') AS hora_do_dia,
    COUNT(t."id")             AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY TO_CHAR(t."date", 'HH24')
ORDER BY hora_do_dia;
```
