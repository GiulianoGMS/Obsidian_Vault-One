---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Status]]"
  - "[[Fluxo]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Histórico de mudanças em `glpi_logs` — filtrar por `itemtype = 'Ticket'` e `itemtype_link = 'Ticket'` para transições de status. Window function `LEAD()` calcula o tempo no status anterior. Status: `1=Novo`, `2=Em atendimento (atribuído)`, `3=Planejado`, `4=Pendente`, `5=Resolvido`, `6=Fechado`.

Análise do **ciclo de vida de status** dos chamados: distribuição atual, tempo em cada status, fluxo de transições e quantidade de mudanças.

---

## Chamados por Status

Snapshot atual da distribuição de chamados por status — visão global do pipeline de atendimento.

```sql
SELECT
    t."status",
    CASE t."status"
        WHEN 1 THEN 'Novo' WHEN 2 THEN 'Em atendimento (atribuido)'
        WHEN 3 THEN 'Em atendimento (planejado)' WHEN 4 THEN 'Pendente'
        WHEN 5 THEN 'Resolvido' WHEN 6 THEN 'Fechado'
        ELSE 'Status ' || t."status"
    END           AS status_label,
    COUNT(t."id") AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY t."status"
ORDER BY t."status";
```

---

## Tempo em Cada Status

Usa `LEAD()` para calcular quanto tempo (em minutos) cada chamado ficou em cada status antes de mudar. Base para análise de gargalos no fluxo de atendimento.

```sql
SELECT
    l."items_id"      AS ticket_id,
    l."date_mod"       AS data_mudanca,
    l."old_value"       AS status_anterior,
    l."new_value"       AS status_novo,
    LEAD(l."date_mod") OVER (PARTITION BY l."items_id" ORDER BY l."date_mod")           AS proxima_mudanca,
    ROUND((LEAD(l."date_mod") OVER (PARTITION BY l."items_id" ORDER BY l."date_mod")
           - l."date_mod") * 1440, 1)                                                   AS minutos_no_status
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket'
  AND l."itemtype_link" = 'Ticket'
ORDER BY l."items_id", l."date_mod";
```

---

## Fluxo dos Chamados

Matriz de transições de status — identifica os caminhos mais percorridos e fluxos inesperados (ex: Fechado → Novo, indicando reaberturas frequentes).

```sql
SELECT
    l."old_value" AS status_origem,
    l."new_value" AS status_destino,
    COUNT(*)      AS qtd_transicoes
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket'
  AND l."itemtype_link" = 'Ticket'
GROUP BY l."old_value", l."new_value"
ORDER BY qtd_transicoes DESC;
```

---

## Quantidade de Mudanças de Status

Por ticket — tickets com muitas mudanças indicam complexidade elevada, reaberturas ou falta de clareza no atendimento.

```sql
SELECT
    l."items_id" AS ticket_id,
    COUNT(*)     AS qtd_mudancas_status
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket'
  AND l."itemtype_link" = 'Ticket'
GROUP BY l."items_id"
ORDER BY qtd_mudancas_status DESC;
```
