---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[Auditoria]]"
  - "[[Rastreabilidade]]"
Date: 2026-07-18
Type: Project
---

> [!info] Arquitetura de Acesso
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. Selects de detalhe por ticket — substituir `123` pelo ID real. `glpi_logs` é a tabela de auditoria central: registra todas as alterações de campos, status, grupo e técnico. `glpi_itilfollowups`, `glpi_tickettasks` e `glpi_itilsolutions` guardam o conteúdo das interações.

Selects de **auditoria e rastreabilidade individual** de chamados: histórico completo, alterações por campo, soluções, followups, tarefas, custos, aprovações, [[SLA]] aplicado e vínculos com problemas/mudanças/projetos.

> [!tip] Como usar
> Todos os selects abaixo são para análise de **um chamado específico**. Troque `items_id = 123` ou `tickets_id = 123` pelo ID do chamado desejado.

---

## Histórico Completo do Chamado

Todas as alterações registradas em `glpi_logs` para um ticket — linha do tempo completa de quem alterou o quê e quando.

```sql
SELECT
    l."date_mod", l."user_name", l."old_value", l."new_value", l."itemtype_link"
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Alterações de Status

Filtra o log somente para transições de status — traça o fluxo percorrido pelo chamado.

```sql
SELECT l."date_mod", l."user_name", l."old_value" AS status_anterior, l."new_value" AS status_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket' AND l."itemtype_link" = 'Ticket'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Alterações de Prioridade

Filtra o log para mudanças de prioridade usando `REGEXP_LIKE` nos valores registrados.

```sql
SELECT l."date_mod", l."user_name", l."old_value", l."new_value"
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket' AND l."itemtype_link" = 'Ticket'
  AND l."items_id" = 123
  AND REGEXP_LIKE(l."old_value", '^(Muito Baixa|Baixa|Media|Alta|Muito Alta|Major)$')
ORDER BY l."date_mod";
```

---

## Alterações de Grupo (Reatribuição de Equipe)

Mostra transferências de grupo responsável — rastreia por qual equipe o chamado passou.

```sql
SELECT l."date_mod", l."user_name", l."old_value" AS grupo_anterior, l."new_value" AS grupo_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket' AND l."itemtype_link" = 'Group'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Alterações de Técnico

Mostra trocas de técnico responsável — rastreia por quem o chamado foi atendido ao longo do tempo.

```sql
SELECT l."date_mod", l."user_name", l."old_value" AS tecnico_anterior, l."new_value" AS tecnico_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket' AND l."itemtype_link" = 'User'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Logs Recentes (Todos os Chamados)

Visão consolidada de todas as alterações nos últimos 30 dias — útil para auditoria ampla ou detecção de anomalias.

```sql
SELECT
    l."items_id" AS ticket_id, l."date_mod", l."user_name",
    l."itemtype_link", l."old_value", l."new_value"
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE l."itemtype" = 'Ticket'
  AND l."date_mod" >= TRUNC(SYSDATE) - 30
ORDER BY l."date_mod" DESC;
```

---

## Soluções Aplicadas

Conteúdo e metadados das soluções registradas — inclui tipo de solução, data de aprovação e autor.

```sql
SELECT
    s."items_id" AS ticket_id, s."content" AS solucao,
    st."name"    AS tipo_solucao,
    s."date_creation", s."date_approval",
    u."firstname" || ' ' || u."realname" AS autor_solucao
FROM "glpi_itilsolutions"@DBL_ORCL_TO_MYSQL s
LEFT JOIN "glpi_solutiontypes"@DBL_ORCL_TO_MYSQL st ON st."id" = s."solutiontypes_id"
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u          ON u."id" = s."users_id"
WHERE s."itemtype" = 'Ticket'
ORDER BY s."date_creation" DESC;
```

---

## Followups (Acompanhamentos)

Interações registradas nos followups — inclui canal de origem, se é privado e o autor.

```sql
SELECT
    f."items_id" AS ticket_id, f."date", f."content", f."is_private",
    rt."name" AS canal_origem,
    u."firstname" || ' ' || u."realname" AS autor
FROM "glpi_itilfollowups"@DBL_ORCL_TO_MYSQL f
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u         ON u."id" = f."users_id"
LEFT JOIN "glpi_requesttypes"@DBL_ORCL_TO_MYSQL rt ON rt."id" = f."requesttypes_id"
WHERE f."itemtype" = 'Ticket'
ORDER BY f."date" DESC;
```

---

## Tarefas

Tarefas registradas no chamado com tempo de início/fim, duração e técnico responsável.

```sql
SELECT
    tt."tickets_id", tt."content", tt."begin", tt."end", tt."actiontime",
    tc."name" AS categoria_tarefa,
    u."firstname" || ' ' || u."realname" AS tecnico_responsavel
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
LEFT JOIN "glpi_taskcategories"@DBL_ORCL_TO_MYSQL tc ON tc."id" = tt."taskcategories_id"
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u            ON u."id" = tt."users_id_tech"
ORDER BY tt."date" DESC;
```

---

## Custos por Chamado

Detalhamento de custos: mão de obra (`cost_time`), fixo (`cost_fixed`) e material (`cost_material`).

```sql
SELECT
    tc."tickets_id", tc."name", tc."cost_time", tc."cost_fixed", tc."cost_material",
    (tc."cost_time" + tc."cost_fixed" + tc."cost_material") AS custo_total
FROM "glpi_ticketcosts"@DBL_ORCL_TO_MYSQL tc
ORDER BY custo_total DESC;
```

---

## Aprovações

Registro de validações/aprovações de chamado — quem solicitou, quem aprovou e quando.

```sql
SELECT
    tv."tickets_id", tv."status", tv."submission_date", tv."validation_date",
    sol."firstname" || ' ' || sol."realname" AS solicitado_por,
    apr."firstname" || ' ' || apr."realname" AS aprovador
FROM "glpi_ticketvalidations"@DBL_ORCL_TO_MYSQL tv
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL sol ON sol."id" = tv."users_id"
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL apr ON apr."id" = tv."users_id_validate"
ORDER BY tv."submission_date" DESC;
```

---

## SLA Aplicado ao Chamado

Mostra qual [[SLA]] de TTO (tempo até atendimento) e TTR (resolução) foi aplicado, e os prazos resultantes.

```sql
SELECT
    t."id" AS ticket_id,
    sla_tto."name" AS sla_primeiro_atendimento,
    sla_ttr."name" AS sla_resolucao,
    t."time_to_own", t."time_to_resolve"
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_slas"@DBL_ORCL_TO_MYSQL sla_tto ON sla_tto."id" = t."slas_id_tto"
LEFT JOIN "glpi_slas"@DBL_ORCL_TO_MYSQL sla_ttr ON sla_ttr."id" = t."slas_id_ttr"
WHERE t."is_deleted" = 0;
```

---

## SLA Vencido (Em Aberto)

Chamados em aberto com prazo de resolução expirado e quantidade de horas de atraso.

```sql
SELECT
    t."id", t."name", t."time_to_resolve",
    ROUND((SYSDATE - t."time_to_resolve") * 24, 1) AS horas_vencidas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
  AND t."time_to_resolve" IS NOT NULL
  AND t."time_to_resolve" < SYSDATE
ORDER BY horas_vencidas DESC;
```

---

## Itens Relacionados (Ativos de TI)

Ativos de TI vinculados ao chamado — equipamentos, softwares ou outros itens do inventário [[GLPI]].

```sql
SELECT
    it."tickets_id", it."itemtype" AS tipo_ativo, it."items_id" AS ativo_id
FROM "glpi_items_tickets"@DBL_ORCL_TO_MYSQL it
WHERE it."tickets_id" = 123;
```

---

## Documentos Anexos

Arquivos anexados ao chamado via `glpi_documents_items`.

```sql
SELECT
    doc."name", doc."filename", doc."filesize", doc."mime", di."date_creation"
FROM "glpi_documents_items"@DBL_ORCL_TO_MYSQL di
JOIN "glpi_documents"@DBL_ORCL_TO_MYSQL doc ON doc."id" = di."documents_id"
WHERE di."itemtype" = 'Ticket'
  AND di."items_id" = 123;
```

---

## Base de Conhecimento Relacionada

Artigos da base de conhecimento vinculados ao chamado — indica se há solução documentada disponível.

```sql
SELECT
    kb."id", kb."name", kb."is_faq"
FROM "glpi_knowbaseitems_items"@DBL_ORCL_TO_MYSQL ki
JOIN "glpi_knowbaseitems"@DBL_ORCL_TO_MYSQL kb ON kb."id" = ki."knowbaseitems_id"
WHERE ki."itemtype" = 'Ticket'
  AND ki."items_id" = 123;
```

---

## Problemas, Mudanças e Projetos Relacionados

Vínculos do chamado com problemas (`glpi_problems`), mudanças (`glpi_changes`) e projetos (`glpi_projects`).

```sql
-- Problemas vinculados
SELECT p."id", p."name", p."status", pt."link"
FROM "glpi_problems_tickets"@DBL_ORCL_TO_MYSQL pt
JOIN "glpi_problems"@DBL_ORCL_TO_MYSQL p ON p."id" = pt."problems_id"
WHERE pt."tickets_id" = 123;

-- Mudanças vinculadas
SELECT c."id", c."name", c."status", ct."link"
FROM "glpi_changes_tickets"@DBL_ORCL_TO_MYSQL ct
JOIN "glpi_changes"@DBL_ORCL_TO_MYSQL c ON c."id" = ct."changes_id"
WHERE ct."tickets_id" = 123;

-- Projetos vinculados
SELECT pr."id", pr."name", pr."percent_done"
FROM "glpi_items_projects"@DBL_ORCL_TO_MYSQL ip
JOIN "glpi_projects"@DBL_ORCL_TO_MYSQL pr ON pr."id" = ip."projects_id"
WHERE ip."itemtype" = 'Ticket'
  AND ip."items_id" = 123;
```
