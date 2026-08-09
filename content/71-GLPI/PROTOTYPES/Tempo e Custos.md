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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Tempo de tarefas (`actiontime`) em segundos — ÷3600 para horas. Custos em `glpi_ticketcosts`. Colunas VARCHAR usam [[hs_str — Conversão UTF-16 via DBLink|hs_str()]] para corrigir encoding UTF-16 LE.

Análise de **tempo registrado e custos**: horas totais, por chamado, faturáveis, paradas e aguardando usuário.

---

## Tempo Total Gasto

```sql
SELECT ROUND(SUM(tt."actiontime") / 3600, 1) AS horas_totais_gastas
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt;
```

---

## Tempo Registrado por Chamado

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

Horas e custo por chamado a partir de `glpi_ticketcosts` — registro financeiro formal.

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

Chamados com tempo de espera (`waiting_duration`) — quanto tempo cada chamado ficou sem progresso ativo.

```sql
SELECT
    t."id",
    hs_str(t."name")                      AS nome_chamado,
    ROUND(t."waiting_duration" / 3600, 2)  AS horas_paradas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."waiting_duration" > 0
ORDER BY horas_paradas DESC;
```

---

## Tempo Aguardando Usuário

Chamados pendentes de resposta do usuário com tempo acumulado.

```sql
SELECT
    t."id",
    hs_str(t."name")                      AS nome_chamado,
    hs_str(pr."name")                     AS motivo_pendencia,
    t."begin_waiting_date",
    ROUND(t."waiting_duration" / 3600, 2)  AS horas_em_espera
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
JOIN "glpi_pendingreasons_items"@DBL_ORCL_TO_MYSQL pri
     ON pri."items_id" = t."id" AND hs_str(pri."itemtype") = 'Ticket'
JOIN "glpi_pendingreasons"@DBL_ORCL_TO_MYSQL pr ON pr."id" = pri."pendingreasons_id"
WHERE t."is_deleted" = 0
  AND hs_str(pr."name") LIKE '%usu%'
ORDER BY horas_em_espera DESC;
```
