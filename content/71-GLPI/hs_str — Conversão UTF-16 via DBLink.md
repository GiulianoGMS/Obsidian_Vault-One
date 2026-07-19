---
Language:
  - "[[Oracle SQL]]"
System:
  - "[[GLPI]]"
  - "[[MySQL]]"
Open Tags:
  - "[[GLPI]]"
  - "[[DBLink]]"
  - "[[UTF-16]]"
  - "[[Oracle SQL]]"
Date: 2026-07-18
Type: Project
---

> [!info] Contexto
> Função auxiliar criada para corrigir truncamento de colunas VARCHAR que chegam via [[DBLink]] `@DBL_ORCL_TO_MYSQL` com codificação **UTF-16 LE**. Deve ser aplicada em **toda coluna VARCHAR/TEXT** lida do [[GLPI]] — tanto no SELECT quanto no WHERE e GROUP BY.

## O Problema

O driver ODBC do [[MySQL]] configurado no Oracle Heterogeneous Services envia dados VARCHAR como **UTF-16 LE** (2 bytes por caractere). O Oracle interpreta:

- Byte 1: o caractere real (ex: `'A'` = 0x41)
- Byte 2: `CHR(0)` = terminador nulo → Oracle **para de ler**

**Resultado:** `"Aplicativos e sistemas"` (22 chars) chega como `"A"`, mas `LENGTH()` retorna 44 (22 × 2 bytes).

**Diagnóstico que confirmou o problema:**

```sql
SELECT
    t."name"                              AS nome_truncado,   -- retorna 'A'
    REPLACE(t."name", CHR(0), '')          AS nome_correto,   -- retorna nome completo
    LENGTH(t."name")                      AS len_bruto,       -- 44 (22 chars × 2 bytes)
    LENGTH(REPLACE(t."name", CHR(0), '')) AS len_correto      -- 22
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE t."id" = 749862;
```

---

## DDL — Criação da Função

```sql
CREATE OR REPLACE FUNCTION hs_str(p_val IN VARCHAR2) RETURN VARCHAR2 IS
BEGIN
    RETURN REPLACE(p_val, CHR(0), '');
END hs_str;
/
```

Criar no mesmo schema que executa as queries via [[DBLink]].

---

## Onde Aplicar

| Coluna | Tabelas GLPI afetadas |
|--------|----------------------|
| `"name"` | `glpi_tickets`, `glpi_groups`, `glpi_slas`, `glpi_itilcategories`, `glpi_problems`, `glpi_changes`, `glpi_projects`, `glpi_pendingreasons`, `glpi_taskcategories`, `glpi_solutiontypes`, `glpi_requesttypes` |
| `"firstname"`, `"realname"` | `glpi_users` |
| `"completename"` | `glpi_itilcategories`, `glpi_entities`, `glpi_locations` |
| `"old_value"`, `"new_value"`, `"user_name"` | `glpi_logs` |
| `"content"` | `glpi_tickets`, `glpi_itilfollowups`, `glpi_itilsolutions` |
| `"itemtype"`, `"itemtype_link"` | `glpi_logs`, `glpi_items_tickets`, `glpi_pendingreasons_items`, `glpi_itilsolutions`, `glpi_itilfollowups`, `glpi_knowbaseitems_items`, `glpi_documents_items`, `glpi_items_projects` |
| `"filename"`, `"mime"` | `glpi_documents` |

> [!warning] WHERE e GROUP BY obrigatórios
> - **WHERE**: `hs_str(l."itemtype") = 'Ticket'` — sem a conversão, comparações com literais retornam zero linhas
> - **GROUP BY**: repetir a expressão exata do SELECT: `GROUP BY hs_str(g."name")`
> - **COALESCE**: `COALESCE(hs_str(c."completename"), 'Sem categoria')`

---

## Exemplo Antes × Depois

```sql
-- ANTES (errado): retorna 'A', 'G', 'I'...
SELECT u."firstname" || ' ' || u."realname" AS nome
FROM "glpi_users"@DBL_ORCL_TO_MYSQL u;

-- DEPOIS (correto): retorna nomes completos
SELECT hs_str(u."firstname") || ' ' || hs_str(u."realname") AS nome
FROM "glpi_users"@DBL_ORCL_TO_MYSQL u;
```

---

## Limitação

Funciona corretamente para caracteres **ASCII e Latin-1** (praticamente todo o conteúdo textual do [[GLPI]]). Para caracteres Unicode acima de U+00FF — cujo segundo byte não é nulo em UTF-16 — usar `UTL_RAW.CONVERT` como alternativa mais robusta:

```sql
UTL_RAW.CAST_TO_VARCHAR2(
    UTL_RAW.CONVERT(
        UTL_RAW.CAST_TO_RAW(col),
        'AL32UTF8',
        'AL16UTF16LE'
    )
)
```

---

## Objetos Relacionados

| Objeto | Finalidade |
|--------|-----------|
| `hs_str` (esta função) | Remove CHR(0) de colunas VARCHAR recebidas via DBLink |
| `@DBL_ORCL_TO_MYSQL` | [[DBLink]] Oracle → [[MySQL]] do [[GLPI]] |
