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
> Consultas **[[Oracle SQL]]** via DBLink `@DBL_ORCL_TO_MYSQL`. `glpi_logs` é a tabela central de auditoria. Colunas `itemtype`, `itemtype_link`, `old_value`, `new_value` e `user_name` são VARCHAR — requerem [[_hs_str — Conversão UTF-16 via DBLink|hs_str()]] no SELECT **e no WHERE**. Selects de detalhe: trocar `123` pelo ID real do chamado.

> [!tip] Como usar
> Todos os selects abaixo são para análise de **um chamado específico**. Troque `items_id = 123` ou `tickets_id = 123` pelo ID do chamado desejado.

---

## Histórico Completo do Chamado

Todas as alterações em `glpi_logs` para um ticket — linha do tempo de quem alterou o quê e quando.

```sql
SELECT
    l."date_mod",
    hs_str(l."user_name")       AS usuario,
    hs_str(l."old_value")       AS valor_anterior,
    hs_str(l."new_value")       AS valor_novo,
    hs_str(l."itemtype_link")   AS tipo_campo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Alterações de Status

Filtra o log somente para transições de status.

```sql
SELECT
    l."date_mod",
    hs_str(l."user_name")  AS usuario,
    hs_str(l."old_value")  AS status_anterior,
    hs_str(l."new_value")  AS status_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND hs_str(l."itemtype_link") = 'Ticket'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Alterações de Prioridade

Filtra mudanças de prioridade usando `REGEXP_LIKE` nos valores registrados.

```sql
SELECT
    l."date_mod",
    hs_str(l."user_name")  AS usuario,
    hs_str(l."old_value")  AS prioridade_anterior,
    hs_str(l."new_value")  AS prioridade_nova
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND hs_str(l."itemtype_link") = 'Ticket'
  AND l."items_id" = 123
  AND REGEXP_LIKE(hs_str(l."old_value"), '^(Muito Baixa|Baixa|Media|Alta|Muito Alta|Major)$')
ORDER BY l."date_mod";
```

---

## Alterações de Grupo (Reatribuição de Equipe)

Mostra transferências de grupo responsável.

```sql
SELECT
    l."date_mod",
    hs_str(l."user_name")  AS usuario,
    hs_str(l."old_value")  AS grupo_anterior,
    hs_str(l."new_value")  AS grupo_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND hs_str(l."itemtype_link") = 'Group'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Alterações de Técnico

Mostra trocas de técnico responsável.

```sql
SELECT
    l."date_mod",
    hs_str(l."user_name")  AS usuario,
    hs_str(l."old_value")  AS tecnico_anterior,
    hs_str(l."new_value")  AS tecnico_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND hs_str(l."itemtype_link") = 'User'
  AND l."items_id" = 123
ORDER BY l."date_mod";
```

---

## Logs Recentes (Todos os Chamados)

Todas as alterações nos últimos 30 dias — auditoria ampla ou detecção de anomalias.

```sql
SELECT
    l."items_id"                  AS ticket_id,
    l."date_mod",
    hs_str(l."user_name")         AS usuario,
    hs_str(l."itemtype_link")     AS tipo_campo,
    hs_str(l."old_value")         AS valor_anterior,
    hs_str(l."new_value")         AS valor_novo
FROM "glpi_logs"@DBL_ORCL_TO_MYSQL l
WHERE hs_str(l."itemtype") = 'Ticket'
  AND l."date_mod" >= TRUNC(SYSDATE) - 30
ORDER BY l."date_mod" DESC;
```

---

## Soluções Aplicadas

Conteúdo e metadados das soluções — tipo, data de aprovação e autor.

```sql
SELECT
    s."items_id"                                                        AS ticket_id,
    hs_str(s."content")                                                 AS solucao,
    hs_str(st."name")                                                   AS tipo_solucao,
    s."date_creation",
    s."date_approval",
    hs_str(u."firstname") || ' ' || hs_str(u."realname")               AS autor_solucao
FROM "glpi_itilsolutions"@DBL_ORCL_TO_MYSQL s
LEFT JOIN "glpi_solutiontypes"@DBL_ORCL_TO_MYSQL st ON st."id" = s."solutiontypes_id"
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u          ON u."id" = s."users_id"
WHERE hs_str(s."itemtype") = 'Ticket'
ORDER BY s."date_creation" DESC;
```

---

## Followups (Acompanhamentos)

Interações nos followups — canal de origem, se é privado e autor.

```sql
SELECT
    f."items_id"                                                        AS ticket_id,
    f."date",
    hs_str(f."content")                                                 AS conteudo,
    f."is_private",
    hs_str(rt."name")                                                   AS canal_origem,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")               AS autor
FROM "glpi_itilfollowups"@DBL_ORCL_TO_MYSQL f
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u         ON u."id" = f."users_id"
LEFT JOIN "glpi_requesttypes"@DBL_ORCL_TO_MYSQL rt ON rt."id" = f."requesttypes_id"
WHERE hs_str(f."itemtype") = 'Ticket'
ORDER BY f."date" DESC;
```

---

## Tarefas

Tarefas registradas com tempo de início/fim, duração e técnico responsável.

```sql
SELECT
    tt."tickets_id",
    hs_str(tt."content")                                                AS descricao,
    tt."begin", tt."end", tt."actiontime",
    hs_str(tc."name")                                                   AS categoria_tarefa,
    hs_str(u."firstname") || ' ' || hs_str(u."realname")               AS tecnico_responsavel
FROM "glpi_tickettasks"@DBL_ORCL_TO_MYSQL tt
LEFT JOIN "glpi_taskcategories"@DBL_ORCL_TO_MYSQL tc ON tc."id" = tt."taskcategories_id"
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL u            ON u."id" = tt."users_id_tech"
ORDER BY tt."date" DESC;
```

---

## Custos por Chamado

Detalhamento de custos: mão de obra, fixo e material.

```sql
SELECT
    tc."tickets_id",
    hs_str(tc."name")                                                   AS descricao_custo,
    tc."cost_time", tc."cost_fixed", tc."cost_material",
    (tc."cost_time" + tc."cost_fixed" + tc."cost_material")             AS custo_total
FROM "glpi_ticketcosts"@DBL_ORCL_TO_MYSQL tc
ORDER BY custo_total DESC;
```

---

## Aprovações

Registro de validações — quem solicitou, quem aprovou e quando.

```sql
SELECT
    tv."tickets_id", tv."status", tv."submission_date", tv."validation_date",
    hs_str(sol."firstname") || ' ' || hs_str(sol."realname") AS solicitado_por,
    hs_str(apr."firstname") || ' ' || hs_str(apr."realname") AS aprovador
FROM "glpi_ticketvalidations"@DBL_ORCL_TO_MYSQL tv
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL sol ON sol."id" = tv."users_id"
LEFT JOIN "glpi_users"@DBL_ORCL_TO_MYSQL apr ON apr."id" = tv."users_id_validate"
ORDER BY tv."submission_date" DESC;
```

---

## SLA Aplicado ao Chamado

Qual [[SLA]] de TTO e TTR foi aplicado e os prazos resultantes.

```sql
SELECT
    t."id"                           AS ticket_id,
    hs_str(sla_tto."name")           AS sla_primeiro_atendimento,
    hs_str(sla_ttr."name")           AS sla_resolucao,
    t."time_to_own", t."time_to_resolve"
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
LEFT JOIN "glpi_slas"@DBL_ORCL_TO_MYSQL sla_tto ON sla_tto."id" = t."slas_id_tto"
LEFT JOIN "glpi_slas"@DBL_ORCL_TO_MYSQL sla_ttr ON sla_ttr."id" = t."slas_id_ttr"
WHERE t."is_deleted" = 0;
```

---

## SLA Vencido (Em Aberto)

Chamados em aberto com prazo de resolução expirado.

```sql
SELECT
    t."id",
    hs_str(t."name")                                 AS nome_chamado,
    t."time_to_resolve",
    ROUND((SYSDATE - t."time_to_resolve") * 24, 1)   AS horas_vencidas
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."is_deleted" = 0
  AND t."status" IN (1, 2, 3, 4)
  AND t."time_to_resolve" IS NOT NULL
  AND t."time_to_resolve" < SYSDATE
ORDER BY horas_vencidas DESC;
```

---

## Itens Relacionados (Ativos de TI)

Ativos de TI vinculados ao chamado — equipamentos, softwares ou outros itens do inventário.

```sql
SELECT
    it."tickets_id",
    hs_str(it."itemtype") AS tipo_ativo,
    it."items_id"          AS ativo_id
FROM "glpi_items_tickets"@DBL_ORCL_TO_MYSQL it
WHERE it."tickets_id" = 123;
```

---

## Documentos Anexos

Arquivos anexados via `glpi_documents_items`.

```sql
SELECT
    hs_str(doc."name")      AS nome_documento,
    hs_str(doc."filename")  AS arquivo,
    doc."filesize",
    hs_str(doc."mime")      AS tipo_mime,
    di."date_creation"
FROM "glpi_documents_items"@DBL_ORCL_TO_MYSQL di
JOIN "glpi_documents"@DBL_ORCL_TO_MYSQL doc ON doc."id" = di."documents_id"
WHERE hs_str(di."itemtype") = 'Ticket'
  AND di."items_id" = 123;
```

---

## Base de Conhecimento Relacionada

Artigos da base de conhecimento vinculados ao chamado.

```sql
SELECT
    kb."id",
    hs_str(kb."name") AS artigo,
    kb."is_faq"
FROM "glpi_knowbaseitems_items"@DBL_ORCL_TO_MYSQL ki
JOIN "glpi_knowbaseitems"@DBL_ORCL_TO_MYSQL kb ON kb."id" = ki."knowbaseitems_id"
WHERE hs_str(ki."itemtype") = 'Ticket'
  AND ki."items_id" = 123;
```

---

## Problemas, Mudanças e Projetos Relacionados

```sql
-- Problemas vinculados
SELECT p."id", hs_str(p."name") AS problema, p."status", pt."link"
FROM "glpi_problems_tickets"@DBL_ORCL_TO_MYSQL pt
JOIN "glpi_problems"@DBL_ORCL_TO_MYSQL p ON p."id" = pt."problems_id"
WHERE pt."tickets_id" = 123;

-- Mudanças vinculadas
SELECT c."id", hs_str(c."name") AS mudanca, c."status", ct."link"
FROM "glpi_changes_tickets"@DBL_ORCL_TO_MYSQL ct
JOIN "glpi_changes"@DBL_ORCL_TO_MYSQL c ON c."id" = ct."changes_id"
WHERE ct."tickets_id" = 123;

-- Projetos vinculados
SELECT pr."id", hs_str(pr."name") AS projeto, pr."percent_done"
FROM "glpi_items_projects"@DBL_ORCL_TO_MYSQL ip
JOIN "glpi_projects"@DBL_ORCL_TO_MYSQL pr ON pr."id" = ip."projects_id"
WHERE hs_str(ip."itemtype") = 'Ticket'
  AND ip."items_id" = 123;
```
