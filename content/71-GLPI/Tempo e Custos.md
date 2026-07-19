---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Tempo]]"
  - "[[Custos]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Tempo de tarefas (`actiontime`) em segundos na tabela `glpi_tickettasks` — dividir por 3600 para horas. Custos em `glpi_ticketcosts`: `cost_time` (mão de obra), `cost_fixed` (fixo), `cost_material` (material). Tempo de espera (`waiting_duration`) também em segundos.

Análise de **tempo efetivamente registrado e custos** dos chamados: horas totais, faturáveis, tempo parado e tempo aguardando resposta.

---

## Tempo Total Gasto

Soma de todas as horas registradas em tarefas de todos os chamados — métrica de esforço global da equipe.

```sql
SELECT ROUND(SUM(tt."actiontime") / 3600, 1) AS horas_totais_gastas
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt;
```

---

## Tempo Registrado por Chamado

Horas lançadas por ticket — identifica chamados com alto consumo de tempo da equipe.

```sql
SELECT
    tt."tickets_id",
    ROUND(SUM(tt."actiontime") / 3600, 2) AS horas_registradas
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
GROUP BY tt."tickets_id"
ORDER BY horas_registradas DESC;
```

---

## Tempo Faturável e Custo Total

Horas e custo total por chamado a partir de `glpi_ticketcosts` — diferente do `actiontime` de tarefas, este é o registro financeiro formal.

```sql
SELECT
    tc."tickets_id",
    ROUND(SUM(tc."actiontime") / 3600, 2)                              AS horas_faturaveis,
    SUM(tc."cost_time" + tc."cost_fixed" + tc."cost_material")         AS custo_total
FROM "glpi_ticketcosts"@DBL_ORCL_TO_MYSQL tc
GROUP BY tc."tickets_id"
ORDER BY custo_total DESC;
```

---

## Tempo Parado

Chamados com tempo de espera (`waiting_duration`) registrado — indica quanto tempo cada chamado ficou aguardando sem progresso ativo.

```sql
SELECT
    t."id", t."name",
    ROUND(t."waiting_duration" / 3600, 2) AS horas_paradas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."waiting_duration" > 0
ORDER BY horas_paradas DESC;
```

---

## Tempo Aguardando Usuário

Chamados com motivo de pendência de usuário e seu tempo de espera acumulado — base para cobrar respostas pendentes.

```sql
SELECT
    t."id", t."name",
    pr."name" AS motivo_pendencia,
    t."begin_waiting_date",
    ROUND(t."waiting_duration" / 3600, 2) AS horas_em_espera
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_pendingreasons_items"@DBL_ORCL_TO_MYSQL pri
     ON pri."items_id" = t."id" AND pri."itemtype" = 'Ticket'
JOIN "glpi_pendingreasons"@DBL_ORCL_TO_MYSQL pr ON pr."id" = pri."pendingreasons_id"
WHERE t."is_deleted" = 0
  AND pr."name" LIKE '%usuário%'
ORDER BY horas_em_espera DESC;
```
