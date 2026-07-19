---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Prioridades]]"
  - "[[MTTR]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Prioridades no [[GLPI]]: `1=Muito Baixa`, `2=Baixa`, `3=Média`, `4=Alta`, `5=Muito Alta`, `6=Major`. Urgência (`urgency`) e impacto (`impact`) seguem a mesma escala — a prioridade resultante é calculada pelo GLPI a partir dos dois.

Análise da **distribuição e comportamento por prioridade**: volume, chamados críticos/urgentes em aberto e [[MTTR]] médio por nível.

---

## Chamados por Prioridade (Todos)

Distribuição completa de chamados por nível de prioridade — identifica se a maioria está concentrada em prioridades baixas ou altas.

```sql
SELECT
    t."priority",
    CASE t."priority"
        WHEN 1 THEN 'Muito Baixa' WHEN 2 THEN 'Baixa' WHEN 3 THEN 'Media'
        WHEN 4 THEN 'Alta' WHEN 5 THEN 'Muito Alta' WHEN 6 THEN 'Major'
        ELSE 'Nao definida'
    END           AS prioridade_label,
    COUNT(t."id") AS qtd_chamados
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
GROUP BY t."priority"
ORDER BY t."priority" DESC;
```

---

## Chamados Críticos em Aberto

Lista de chamados com prioridade `Major (6)` ainda em status aberto — exige atenção imediata.

```sql
SELECT t."id", t."name", t."priority", t."status", t."date"
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."priority" = 6
  AND t."status" IN (1, 2, 3, 4)
ORDER BY t."date";
```

---

## Chamados Urgentes em Aberto

Chamados com urgência alta ou muito alta (`urgency >= 5`) ainda não resolvidos. A urgência é definida pelo solicitante — pode diferir da prioridade calculada.

```sql
SELECT t."id", t."name", t."urgency", t."impact", t."priority", t."status"
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."urgency" >= 5
  AND t."status" IN (1, 2, 3, 4)
ORDER BY t."urgency" DESC;
```

---

## Tempo Médio de Resolução por Prioridade

[[MTTR]] por nível de prioridade — valida se chamados de maior prioridade são de fato resolvidos mais rapidamente (conformidade com os SLAs definidos por prioridade).

```sql
SELECT
    t."priority",
    ROUND(AVG((t."solvedate" - t."date") * 24), 1) AS mttr_horas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."solvedate" IS NOT NULL
GROUP BY t."priority"
ORDER BY t."priority" DESC;
```
