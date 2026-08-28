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
  - "[[Arredondamento]]"
Date: 2026-08-28
Type:
---

> [!info] Referência
> [GiulianoGMS/DDL-Objects-Oracle — NAGTRG_BI_MAC_GERCOMPRAITEM.sql](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGTRG_BI_MAC_GERCOMPRAITEM.sql)
> [GiulianoGMS/DDL-Objects-Oracle — NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED.trg](https://github.com/GiulianoGMS/DDL-Objects-Oracle/blob/main/NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED.trg)

---

## Visão Geral

Dois comportamentos automáticos ativados no `INSERT` de `MAC_GERCOMPRAITEM`, ambos controlados pela mesma tabela de parametrização (`NAGT_COMP_FORN_SUGESTAUTO`), mas implementados em triggers distintos:

| Comportamento                     | Quando ativa                       | Trigger responsável                                          |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **Acata Sugerido Automático**     | Parametrizações **sem** `CD_AGRUP` | `NAGTRG_BI_MAC_GERCOMPRAITEM` (BEFORE INSERT)                |
| **Consolidação + Arredondamento** | Parametrizações **com** `CD_AGRUP` | `NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED` ([[COMPOUND TRIGGER]]) |

A distinção entre os dois modos é feita em runtime via `COUNT(X.CD_AGRUP)` na própria query de verificação — nunca há sobreposição.

---

## Objetos de Banco

| Objeto | Tipo | Finalidade |
|---|---|---|
| `MAC_GERCOMPRAITEM` | Tabela | Itens do lote de compra — alvo dos triggers |
| `MAC_GERCOMPRAFORN` | Tabela | Fornecedor do lote (`SEQFORNECEDOR`) |
| `MAC_GERCOMPRA` | Tabela | Cabeçalho do lote — `SEQCOMPRADOR`, `TIPOLOTE = 'C'` |
| `NAGT_COMP_FORN_SUGESTAUTO` | Tabela | Parametrização central — controla ambos os comportamentos |
| `MRL_PRODEMPRESAWM` | Tabela | Parâmetros logísticos do produto: `PALETELASTRO`, `PALETEALTURA` |
| `MRL_PRODUTOEMPRESA` | Tabela | Fallback do percentual de arredondamento: `PERCVARIACAOSUG` |
| `TBIU_MAC_GERABASTECITEM` | Trigger | Trigger padrão do [[ERP]] — `NAGTRG_BI_MAC_GERCOMPRAITEM` executa depois (`FOLLOWS`) |
| `NAGTRG_BI_MAC_GERCOMPRAITEM` | Trigger (BEFORE INSERT) | Acata Sugerido Automático — só atua quando `psCD = 0` |
| `NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED` | Trigger (COMPOUND) | Consolidação + Arredondamento — atua quando `CD_AGRUP` está configurado |

---

## Tabela de Controle — `NAGT_COMP_FORN_SUGESTAUTO`

Tabela central que parametriza ambos os comportamentos. A presença ou ausência de `CD_AGRUP` define qual trigger atua.

| Campo | Tipo | Finalidade |
|---|---|---|
| `SEQCOMPRADOR` | NUMBER | [[Comprador]] do lote |
| `SEQFORNECEDOR` | NUMBER | [[Fornecedor]] específico; `NULL` = qualquer fornecedor |
| `CD_AGRUP` | NUMBER | Empresa/[[CD]] de consolidação. `NULL` = Acata Sugerido simples. Preenchido = Consolidação |
| `IND_ARRED` | CHAR | `'S'` = habilita [[Arredondamento]] logístico (usado somente no modo Consolidação) |
| `PERC_ARRED` | NUMBER | Percentual mínimo para arredondar; `NULL` = usa `PERCVARIACAOSUG` do produto |

---

## Coordenação entre os dois modos

O `NAGTRG_BI_MAC_GERCOMPRAITEM` faz a seguinte query a cada INSERT:

```sql
SELECT COUNT(1), COUNT(X.CD_AGRUP)
  INTO psIndAcataSug, psCD
  FROM NAGT_COMP_FORN_SUGESTAUTO X
 WHERE psSeqComprador = X.SEQCOMPRADOR
   AND psSeqFornec = NVL(X.SEQFORNECEDOR, psSeqFornec);

IF psIndAcataSug > 0 AND psCD = 0 THEN
  -- Acata Sugerido Automático
END IF;
```

- `psIndAcataSug` = total de linhas na parametrização para o comprador/fornecedor
- `psCD` = quantidade de linhas com `CD_AGRUP NOT NULL`
- Condição `psCD = 0` garante que o trigger BEFORE INSERT **não atua** quando há consolidação configurada — o [[COMPOUND TRIGGER]] assume esses casos

| `psIndAcataSug` | `psCD` | Resultado |
|---|---|---|
| 0 | 0 | Nenhum comportamento — [[Lote de Compra\|lote]] não parametrizado |
| > 0 | 0 | **Acata Sugerido** — BEFORE INSERT atua |
| > 0 | > 0 | **Consolidação** — BEFORE INSERT passa; [[COMPOUND TRIGGER]] atua |

---

## Comportamento 1 — Acata Sugerido Automático (`psCD = 0`)

**Problema resolvido:** O [[Comprador]] precisava clicar manualmente em "Acata Sugerido" em cada [[Lote de Compra|lote]]. Com a [[Trigger]], o comportamento é automático para combinações parametrizadas.

**Trigger:** `NAGTRG_BI_MAC_GERCOMPRAITEM` — `BEFORE INSERT ON MAC_GERCOMPRAITEM FOR EACH ROW FOLLOWS TBIU_MAC_GERABASTECITEM`

### Fluxo

```
INSERT em MAC_GERCOMPRAITEM
        │
        ▼
Busca SEQFORNECEDOR (MAC_GERCOMPRAFORN)
Busca SEQCOMPRADOR  (MAC_GERCOMPRA, TIPOLOTE = 'C')
        │
        ▼
psIndAcataSug > 0 AND psCD = 0?
   ┌────┴────┐
  Não       Sim
   │         │
 (sem      QTDSUGERIDAFORNEC > 0?
 alteração)   ├── Sim → QTDPEDIDA = QTDSUGERIDAFORNEC
              └── Não → QTDPEDIDA = 0
              │
              ▼
         SITUACAOITEM = 'S'
```

### Campos afetados em `MAC_GERCOMPRAITEM`

| Campo | Comportamento |
|---|---|
| `QTDPEDIDA` | Recebe `QTDSUGERIDAFORNEC` se > 0; caso contrário, `0` |
| `SITUACAOITEM` | Definido como `'S'` (Acata Sugerido) |

### Parametrização

```sql
-- Comprador 289, todos os fornecedores
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO (SEQCOMPRADOR, SEQFORNECEDOR) VALUES (289, NULL);

-- Comprador 289, fornecedor específico
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO (SEQCOMPRADOR, SEQFORNECEDOR) VALUES (289, 1234);
```

---

## Comportamento 2 — Consolidação com Arredondamento (`CD_AGRUP` preenchido)

**Problema resolvido:** No [[Lote de Compra|lote]] consolidado, o [[CD]] precisa pedir a soma do que todas as [[Loja|lojas]] vão receber. No `INSERT` linha a linha a tabela ainda está em mutação, impedindo consultas à própria `MAC_GERCOMPRAITEM`. A [[COMPOUND TRIGGER]] resolve: guarda os itens do [[CD]] em memória no `AFTER EACH ROW` e faz o cálculo/UPDATE somente no `AFTER STATEMENT`.

**Trigger:** `NAGTRG_BI_MAC_GERCOMPRAITEM_CDARRED` — `COMPOUND TRIGGER FOR INSERT ON MAC_GERCOMPRAITEM`

> [!note] Por que COMPOUND TRIGGER?
> Uma [[Trigger]] `FOR EACH ROW` não pode consultar a própria `MAC_GERCOMPRAITEM` durante o `INSERT` — gera [[ORA-04091]] (table is mutating). O padrão [[COMPOUND TRIGGER]] resolve: acumula itens no `AFTER EACH ROW` e opera sobre a tabela apenas no `AFTER STATEMENT`, quando o INSERT já terminou.

### Fluxo

```
INSERT em MAC_GERCOMPRAITEM
         │
         ▼
   AFTER EACH ROW
         │
         ├─ Busca SEQFORNECEDOR   (MAC_GERCOMPRAFORN)
         ├─ Busca SEQCOMPRADOR    (MAC_GERCOMPRA, TIPOLOTE = 'C')
         ├─ Verifica NAGT_COMP_FORN_SUGESTAUTO
         │    → COUNT(1), MAX(CD_AGRUP), MAX(PERC_ARRED), MAX(IND_ARRED)
         ├─ Confirma psIndAcataSug > 0 AND v_cd_consolidacao = :NEW.NROEMPRESA
         └─ Guarda em memória: SEQGERCOMPRA, SEQPRODUTO, NROEMPRESA, PERC_ARRED, IND_ARRED
                   │
                   ▼
          AFTER STATEMENT (para cada item do CD em memória)
                   │
                   ├─ Soma QTDSUGERIDAFORNEC das lojas (NROEMPRESA <> CD_AGRUP)
                   ├─ Busca PALETELASTRO / PALETEALTURA   (MRL_PRODEMPRESAWM no CD)
                   ├─ Busca QTDEMBALAGEM do item do CD    (MAC_GERCOMPRAITEM)
                   ├─ Resolve percentual (PERC_ARRED → PERCVARIACAOSUG se NULL)
                   ├─ Converte para embalagens: total / QTDEMBALAGEM
                   ├─ Aplica arredondamento (palete → lastro → mantém)
                   ├─ Reconverte para unidades: total_emb × QTDEMBALAGEM
                   └─ UPDATE QTDPEDIDA no item do CD
```

### Regra de Arredondamento

O [[Arredondamento]] só ocorre quando `IND_ARRED = 'S'`, percentual configurado, `QTDEMBALAGEM > 0` e `v_palete > 0`. Nunca **reduz** a quantidade.

O cálculo opera em **embalagens** (caixas/fardos) — a soma das [[Loja|lojas]] é primeiro convertida dividindo por `QTDEMBALAGEM`, arredondada, e depois reconvertida multiplicando de volta.

```
── Preparação ──
v_total_emb = SUM(QTDSUGERIDAFORNEC lojas) / QTDEMBALAGEM
QTY_PALETE  = PALETELASTRO × PALETEALTURA   ← em embalagens

── Arredondamento ──
1. resto_palete = v_total_emb MOD v_palete
   se (resto_palete / v_palete) × 100 >= PERC_ARRED
       → v_total_emb = FLOOR(v_total_emb / v_palete) × v_palete + v_palete

2. senão: resto_lastro = v_total_emb MOD PALETELASTRO
   se (resto_lastro / PALETELASTRO) × 100 >= PERC_ARRED
       → v_total_emb = CEIL(v_total_emb / PALETELASTRO) × PALETELASTRO

3. senão: mantém v_total_emb original

── Resultado ──
QTDPEDIDA = v_total_emb × QTDEMBALAGEM
```

### Exemplos

Os exemplos abaixo assumem `QTDEMBALAGEM = 1` (a sugestão já está em embalagens).

| Sugestão (lojas) | Lastro | Palete | Percentual | Resultado | Motivo |
|---:|---:|---:|---:|---:|---|
| 32 | 10 | 40 | 60% | **40** | 32/40 = 80% ≥ 60% → completa palete |
| 26 | 10 | 60 | 60% | **30** | 26/60 = 43% < 60%; 6/10 = 60% ≥ 60% → completa lastro |
| 23 | 10 | 40 | 60% | **23** | 23/40 = 57,5%; 3/10 = 30% — nenhum limite atingido |
| 328 | 13 | 104 | 60% | **328** | 16/104 = 15%; 3/13 = 23% — mantém |

### Fallback de Percentual

```
NAGT_COMP_FORN_SUGESTAUTO.PERC_ARRED preenchido → usa PERC_ARRED
PERC_ARRED = NULL                               → busca MRL_PRODUTOEMPRESA.PERCVARIACAOSUG
Ambos NULL                                      → mantém quantidade sem arredondar
```

### Parametrização

```sql
-- Comprador 289, todos os fornecedores, CD 101, com arredondamento 60%
INSERT INTO NAGT_COMP_FORN_SUGESTAUTO
  (SEQCOMPRADOR, SEQFORNECEDOR, CD_AGRUP, IND_ARRED, PERC_ARRED)
VALUES (289, NULL, 101, 'S', 60);
```

---

## Manutenção

**Consultar todas as parametrizações:**

```sql
SELECT X.SEQCOMPRADOR, C.NOMECOMPRADOR,
       X.SEQFORNECEDOR, F.NOMEFORNECEDOR,
       X.CD_AGRUP,
       X.IND_ARRED, X.PERC_ARRED,
       CASE WHEN X.CD_AGRUP IS NULL THEN 'Acata Sugerido' ELSE 'Consolidação' END AS MODO
  FROM NAGT_COMP_FORN_SUGESTAUTO X
  LEFT JOIN MAX_COMPRADOR  C ON C.SEQCOMPRADOR  = X.SEQCOMPRADOR
  LEFT JOIN MAF_FORNECEDOR F ON F.SEQFORNECEDOR = X.SEQFORNECEDOR
 ORDER BY X.SEQCOMPRADOR, X.CD_AGRUP NULLS FIRST;
```

**Verificar parâmetros logísticos de um produto no CD:**

```sql
SELECT M.PALETELASTRO, M.PALETEALTURA,
       M.PALETELASTRO * M.PALETEALTURA AS QTY_PALETE
  FROM MRL_PRODEMPRESAWM M
 WHERE M.NROEMPRESA = :CD_AGRUP
   AND M.SEQPRODUTO = :SEQPRODUTO;
```

**Remover parametrização:**

```sql
DELETE FROM NAGT_COMP_FORN_SUGESTAUTO
 WHERE SEQCOMPRADOR = 289 AND SEQFORNECEDOR IS NULL;
```

---

## Pontos de Atenção

> [!warning] Parametrização logística é crítica
> A trigger usa diretamente `PALETELASTRO` e `PALETEALTURA` de `MRL_PRODEMPRESAWM`. Se esses valores estiverem incorretos, o arredondamento também estará. Verificar sempre antes de diagnosticar resultados inesperados.

> [!tip] `QTDEMBALAGEM` como fator de conversão
> A soma de `QTDSUGERIDAFORNEC` das lojas está em unidades de produto. Antes de arredondar, a trigger converte para embalagens (`÷ QTDEMBALAGEM`), aplica o arredondamento em embalagens e depois reconverte (`× QTDEMBALAGEM`). `PALETELASTRO` e `PALETEALTURA` estão expressos em embalagens. Se `QTDEMBALAGEM = 0` o arredondamento é ignorado.

> [!note] Fornecedor NULL = todos
> `SEQFORNECEDOR = NULL` em `NAGT_COMP_FORN_SUGESTAUTO` ativa o comportamento para qualquer [[Fornecedor]] do [[Comprador]] em ambos os modos.

> [!note] `TIPOLOTE = 'C'`
> O `SEQCOMPRADOR` só é buscado em [[Lote de Compra|lotes]] do tipo `'C'` (Consolidado). Lotes de outros tipos não ativam nenhum dos comportamentos.
