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
> Função auxiliar criada para corrigir truncamento de colunas VARCHAR que chegam via [[DBLink]] `@DBL_ORCL_TO_MYSQL`. Deve ser aplicada em **toda coluna VARCHAR/TEXT** lida do [[GLPI]] — tanto no SELECT quanto no WHERE e GROUP BY.

## O Problema

O banco Oracle deste ambiente usa **`NLS_CHARACTERSET = AL16UTF16`** (confirmado via `DUMP(col, 16)` — cada caractere ocupa 2 bytes em UTF-16 BE). O driver ODBC do [[MySQL]] envia cada caractere como 2 bytes UTF-16 seguidos de `00 00` (NUL em AL16UTF16), totalizando 4 bytes por caractere no buffer bruto.

**Resultado sem tratamento:** `"Aplicativos e sistemas"` (22 chars) chega com NUL intercalado e `LENGTH()` retorna 88 (22 × 4 bytes). `REPLACE(col, CHR(0), '')` remove os pares `0x0000` e restabelece o texto.

**Diagnóstico que confirmou o problema:**

```sql
-- Ver bytes brutos (confirma UTF-16 BE + NULs)
SELECT
    DUMP(t."name", 16)                          AS hex_bruto,
    DUMP(REPLACE(t."name", CHR(0), ''), 16)    AS hex_sem_null,
    REPLACE(t."name", CHR(0), '')               AS texto_correto
FROM "glpi_tickets"@DBL_ORCL_TO_MYSQL t
WHERE ROWNUM <= 5;
-- hex_bruto:    00,41,00,00,00,70,00,00,...  (4 bytes/char)
-- hex_sem_null: 00,41,00,70,00,6c,...        (2 bytes/char = UTF-16 BE)
-- texto:        "Aplicativos..."             ✓
```

---

## DDL — Criação da Função

```sql
CREATE OR REPLACE FUNCTION hs_str(p_val IN VARCHAR2) RETURN VARCHAR2 IS
    v VARCHAR2(32767);
BEGIN
    v := REPLACE(p_val, CHR(0), '');
    -- Entidades HTML que o GLPI armazena literalmente
    v := REPLACE(v, '&#62;',  '>');
    v := REPLACE(v, '&#60;',  '<');
    v := REPLACE(v, '&#38;',  '&');
    v := REPLACE(v, '&#34;',  '"');
    v := REPLACE(v, '&#39;',  '''');
    v := REPLACE(v, '&gt;',   '>');
    v := REPLACE(v, '&lt;',   '<');
    v := REPLACE(v, '&amp;',  '&');
    v := REPLACE(v, '&quot;', '"');
    RETURN v;
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

## Entidades HTML

O GLPI armazena nomes de categorias e chamados com HTML encoding literal (`&gt;`, `&#62;`, etc.). A função já decodifica automaticamente os mais comuns:

| Entidade | Resultado |
|----------|-----------|
| `&gt;` / `&#62;` | `>` |
| `&lt;` / `&#60;` | `<` |
| `&amp;` / `&#38;` | `&` |
| `&quot;` / `&#34;` | `"` |
| `&#39;` | `'` |

---

## Limitação: Caracteres Acentuados como `¿`

> [!warning] Causa raiz fora do alcance de PL/SQL
> Alguns registros do [[GLPI]] têm nomes com bytes Latin-1 armazenados numa coluna declarada como UTF-8 no [[MySQL]] (mojibake). O byte `0xED` (Latin-1 `í`) é inválido em UTF-8, então o driver ODBC **substitui pelo caractere `¿` (U+00BF)** antes de enviar ao Oracle. A informação original é perdida no driver — `hs_str()` não consegue recuperá-la.

**Exemplos de manifestação:**
- `Críticas` → `Cr¿icas`
- `Divergência` → correto (armazenado como UTF-8 válido no MySQL)

### Soluções (requerem acesso ao servidor)

**Opção A — Corrigir encoding no MySQL (definitiva):**
```sql
-- Converte mojibake Latin-1→UTF-8 nas tabelas afetadas
ALTER TABLE glpi_itilcategories CONVERT TO CHARACTER SET latin1;
ALTER TABLE glpi_itilcategories CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Repetir para glpi_tickets, glpi_users, etc.
```

**Opção B — Configurar Oracle HS gateway:**
No arquivo `$ORACLE_HOME/hs/admin/init<driver>.ora`, adicionar:
```
HS_NLS_CHARACTERSET=WE8MSWIN1252
```
O Oracle HS passa a receber bytes Latin-1 diretamente do ODBC (charset=latin1) e converte corretamente para AL16UTF16. Requer reiniciar o listener Oracle.

---

## Objetos Relacionados

| Objeto | Finalidade |
|--------|-----------|
| `hs_str` (esta função) | Remove CHR(0) e decodifica entidades HTML de colunas VARCHAR via DBLink |
| `@DBL_ORCL_TO_MYSQL` | [[DBLink]] Oracle → [[MySQL]] do [[GLPI]] |
