---
Language:
  - "[[SQL]]"
Repository:
  - "[[DDL-Objects-Oracle]]"
Squads:
  - "[[TI]]"
  - "[[Comercial]]"
System:
  - "[[PLSQL-Oracle]]"
Open Tags:
  - "[[Lote de Compra]]"
  - "[[Trigger]]"
  - "[[Sugestão de Compra]]"
Date: 2026-06-23
Type:
---

> [!info] Referência
> Repositório: [GiulianoGMS/DDL-Objects-Oracle — NAGTRG_BI_MAC_GERCOMPRAITEM.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGTRG_BI_MAC_GERCOMPRAITEM.sql)

---

## Visão Geral

[[Trigger]] `BEFORE INSERT` na tabela `MAC_GERCOMPRAITEM` que aplica automaticamente a quantidade [[sugerida]] pelo fornecedor (`QTDSUGERIDAFORNEC`) como quantidade pedida (`QTDPEDIDA`) ao abrir um [[Lote de Compras]]

**Problema resolvido:** O [[comprador]] precisava marcar manualmente o botão **"Acata Sugerido"** em cada lote para que a quantidade sugerida fosse considerada. Com a trigger, esse comportamento é automático para os compradores e fornecedores parametrizados na tabela `NAGT_COMP_FORN_SUGESTAUTO`.

---

## Tabela de Controle

```sql
NAGT_COMP_FORN_SUGESTAUTO (
  SEQCOMPRADOR   NUMBER,   -- Comprador habilitado
  SEQFORNECEDOR  NUMBER    -- Fornecedor específico (NULL = todos os fornecedores)
)
```

Apenas combinações cadastradas nessa tabela ativam o comportamento automático. Sem registro, a trigger não altera nada.

**Inserir comprador/fornecedor:**

```sql
-- Comprador 289, todos os fornecedores
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO VALUES (289, null);

-- Comprador 289, fornecedor específico
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO VALUES (289, 1234);
```

---

## Lógica da Trigger

```sql
BEFORE INSERT ON MAC_GERCOMPRAITEM
FOR EACH ROW
FOLLOWS TBIU_MAC_GERABASTECITEM
```

A trigger executa **após** a trigger padrão do ERP (`TBIU_MAC_GERABASTECITEM`), garantindo que os valores base já estão preenchidos.

**Fluxo:**

```
INSERT em MAC_GERCOMPRAITEM (novo item do lote)
        │
        ▼
Busca SEQFORNECEDOR do lote (MAC_GERCOMPRAFORN)
Busca SEQCOMPRADOR do lote (MAC_GERCOMPRA)
        │
        ▼
Verifica NAGT_COMP_FORN_SUGESTAUTO
(comprador + fornecedor parametrizados?)
        │
   ┌────┴────┐
  Não       Sim
   │         │
   │         ▼
   │   QTDSUGERIDAFORNEC > 0?
   │    ├── Sim → QTDPEDIDA = QTDSUGERIDAFORNEC
   │    └── Não → QTDPEDIDA = 0
   │         │
   │         ▼
   │   SITUACAOITEM = 'S'
   │
  (sem alteração)
```

> [!note] `NVL(X.SEQFORNECEDOR, psSeqFornec)`
> Se o registro na tabela tiver `SEQFORNECEDOR = NULL`, o `NVL` faz o `AND` sempre verdadeiro — ou seja, o comprador acata automaticamente para **qualquer** fornecedor.

---

## Campos afetados em `MAC_GERCOMPRAITEM`

| Campo          | Comportamento                                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| `QTDPEDIDA`    | Recebe `QTDSUGERIDAFORNEC` se > 0; caso contrário, `0` — apenas se parametrizado |
| `SITUACAOITEM` | Definido como `'S'` (Acata Sugerido) — apenas se parametrizado                   |

---

## Objetos de Banco Utilizados

| Objeto | Tipo | Finalidade |
|--------|------|-----------|
| `MAC_GERCOMPRAITEM` | Tabela | Itens do lote de compra — alvo da trigger |
| `MAC_GERCOMPRAFORN` | Tabela | Fornecedores do lote — fonte do `SEQFORNECEDOR` |
| `MAC_GERCOMPRA` | Tabela | Cabeçalho do lote — fonte do `SEQCOMPRADOR` |
| `NAGT_COMP_FORN_SUGESTAUTO` | Tabela | Parametrização comprador × fornecedor para acatamento automático |
| `TBIU_MAC_GERABASTECITEM` | Trigger | Trigger padrão do ERP — esta executa depois (`FOLLOWS`) |

---

## Manutenção

**Consultar parametrizados:**
```sql
SELECT X.SEQCOMPRADOR, C.NOMECOMPRADOR,
       X.SEQFORNECEDOR, F.NOMEFORNECEDOR
  FROM NAGT_COMP_FORN_SUGESTAUTO X
  LEFT JOIN MAX_COMPRADOR C ON C.SEQCOMPRADOR = X.SEQCOMPRADOR
  LEFT JOIN MAF_FORNECEDOR F ON F.SEQFORNECEDOR = X.SEQFORNECEDOR
 ORDER BY X.SEQCOMPRADOR;
```

**Remover parametrização:**
```sql
DELETE FROM NAGT_COMP_FORN_SUGESTAUTO
 WHERE SEQCOMPRADOR = 289 AND SEQFORNECEDOR IS NULL;
```

---

## Observações

> [!tip] Fornecedor NULL = todos
> Cadastrar com `SEQFORNECEDOR = NULL` ativa o acatamento automático para o comprador independente do fornecedor do lote. Usar com cuidado — se o comprador gerencia lotes de múltiplos fornecedores com políticas diferentes, é preferível parametrizar por fornecedor.

> [!note] SITUACAOITEM dentro do IF
> `SITUACAOITEM = 'S'` está dentro do bloco `IF psIndAcataSug > 0` — só é alterado quando a combinação comprador × fornecedor está parametrizada. Itens de compradores não cadastrados na tabela não são afetados.
